import cv2
import numpy as np
import base64
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Import your modules
from utils import get_mediapipe_pose
from process_frame import ProcessFrame
from thresholds import get_thresholds_beginner, get_thresholds_pro

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("LOADING AI MODEL ON STARTUP...")
try:
    GLOBAL_POSE = get_mediapipe_pose(model_complexity=0)
    print("AI MODEL LOADED AND READY!")
except Exception as e:
    print(f"AI LOAD FAILED: {e}")
    GLOBAL_POSE = None

def base64_to_image(base64_string):
    if "base64," in base64_string:
        base64_string = base64_string.split("base64,")[1]
    try:
        image_bytes = base64.b64decode(base64_string)
        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return image
    except:
        return None

def image_to_base64(image):
    _, buffer = cv2.imencode('.jpg', image)
    return f"data:image/jpeg;base64,{base64.b64encode(buffer).decode('utf-8')}"

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, mode: str = "beginner"):
    await websocket.accept()
    print(f"CLIENT CONNECTED - MODE: {mode.upper()}")
    
    if mode == "pro":
        thresholds = get_thresholds_pro()
    else:
        thresholds = get_thresholds_beginner()
        
    processor = ProcessFrame(thresholds=thresholds, flip_frame=True)
    
    try:
        while True:
            data = await websocket.receive_text()
            
            frame = base64_to_image(data)
            if frame is None:
                continue

            output_image = frame
            
            if GLOBAL_POSE:
                try:
                    processed_frame, _ = processor.process(frame, GLOBAL_POSE)
                    output_image = processed_frame
                except Exception:
                    pass 

            current_count = processor.state_tracker.get('SQUAT_COUNT', 0)
            
            await websocket.send_json({
                "image": image_to_base64(output_image),
                "count": current_count
            })

    except WebSocketDisconnect:
        print("CLIENT DISCONNECTED")
    except Exception as e:
        print(f"ERROR: {e}")