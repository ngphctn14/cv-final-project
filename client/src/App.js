import React, { useState, useRef, useEffect } from "react";
import Webcam from "react-webcam";

const App = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [squatCount, setSquatCount] = useState(0);
  const [processedImage, setProcessedImage] = useState(null);
  const [mode, setMode] = useState("beginner");
  const [history, setHistory] = useState([]);

  const webcamRef = useRef(null);
  const wsRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("squatHistory");
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  const startSession = () => {
    if (isRecording) return;
    setIsRecording(true);
    setSquatCount(0);

    wsRef.current = new WebSocket(`ws://localhost:8000/ws?mode=${mode}`);

    wsRef.current.onopen = () => {
      startSendingLoop();
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProcessedImage(data.image);
        setSquatCount(data.count);
      } catch (err) {
        console.error(err);
      }
    };
  };

  const startSendingLoop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (
        webcamRef.current &&
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) wsRef.current.send(imageSrc);
      }
    }, 150);
  };

  const stopSession = () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (wsRef.current) wsRef.current.close();
    setProcessedImage(null);

    if (squatCount > 0) {
      const newSession = {
        id: Date.now(),
        date: new Date().toLocaleString(),
        count: squatCount,
        mode: mode,
      };
      const updatedHistory = [newSession, ...history];
      setHistory(updatedHistory);
      localStorage.setItem("squatHistory", JSON.stringify(updatedHistory));
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem("squatHistory");
  };

  const styles = {
    container: {
      fontFamily: "system-ui, sans-serif",
      maxWidth: "800px",
      margin: "0 auto",
      padding: "40px 20px",
      color: "#333",
    },
    header: { textAlign: "center", marginBottom: "40px" },
    title: { fontSize: "2.5rem", margin: "0", color: "#111" },
    videoContainer: {
      position: "relative",
      width: "640px",
      height: "480px",
      background: "#f0f0f0",
      borderRadius: "12px",
      overflow: "hidden",
      margin: "0 auto",
      boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    statsBar: {
      display: "flex",
      gap: "20px",
      width: "640px",
      margin: "20px auto",
      justifyContent: "space-between",
      alignItems: "center",
    },
    countBox: {
      background: "#fff",
      padding: "15px 25px",
      borderRadius: "8px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      fontSize: "1.5rem",
      fontWeight: "bold",
    },
    button: {
      padding: "16px 40px",
      fontSize: "1rem",
      fontWeight: "600",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      textTransform: "uppercase",
    },
    startBtn: { backgroundColor: "#111", color: "#fff" },
    stopBtn: { backgroundColor: "#e74c3c", color: "#fff" },

    modeContainer: {
      display: "flex",
      gap: "10px",
      background: "#eee",
      padding: "5px",
      borderRadius: "8px",
    },
    modeBtn: (isActive) => ({
      padding: "10px 20px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "600",
      backgroundColor: isActive ? "#fff" : "transparent",
      color: isActive ? "#111" : "#777",
      boxShadow: isActive ? "0 2px 5px rgba(0,0,0,0.1)" : "none",
      transition: "all 0.2s",
    }),

    historyTable: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "left",
      marginTop: "20px",
    },
    th: {
      borderBottom: "2px solid #eee",
      padding: "12px 0",
      color: "#999",
      fontSize: "0.9rem",
      textTransform: "uppercase",
    },
    td: { borderBottom: "1px solid #eee", padding: "16px 0" },
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Squat Tracker</h1>
        <p>AI-Powered Form Analysis</p>
      </header>

      <div
        style={{
          position: "absolute",
          top: 0,
          opacity: 0,
          pointerEvents: "none",
        }}
      >
        <Webcam
          ref={webcamRef}
          audio={false}
          width={640}
          height={480}
          videoConstraints={{ facingMode: "user" }}
        />
      </div>

      <div style={styles.videoContainer}>
        {isRecording && processedImage ? (
          <img
            src={processedImage}
            alt="Stream"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ color: "#999" }}>Ready to Start</div>
        )}
      </div>

      <div style={styles.statsBar}>
        <div style={styles.countBox}>Count: {squatCount}</div>

        <div style={styles.modeContainer}>
          <button
            style={styles.modeBtn(mode === "beginner")}
            onClick={() => !isRecording && setMode("beginner")}
            disabled={isRecording}
          >
            Beginner
          </button>
          <button
            style={styles.modeBtn(mode === "pro")}
            onClick={() => !isRecording && setMode("pro")}
            disabled={isRecording}
          >
            Pro
          </button>
        </div>

        {!isRecording ? (
          <button
            onClick={startSession}
            style={{ ...styles.button, ...styles.startBtn }}
          >
            Start
          </button>
        ) : (
          <button
            onClick={stopSession}
            style={{ ...styles.button, ...styles.stopBtn }}
          >
            Stop & Save
          </button>
        )}
      </div>

      <div
        style={{
          marginTop: "60px",
          borderTop: "1px solid #eaeaea",
          paddingTop: "40px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>History</h2>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              style={{
                background: "none",
                border: "none",
                color: "#999",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p style={{ color: "#999" }}>No sessions yet.</p>
        ) : (
          <table style={styles.historyTable}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Mode</th>
                <th style={styles.th}>Squats</th>
              </tr>
            </thead>
            <tbody>
              {history.map((s) => {
                const [date, time] = s.date.split(", ");
                return (
                  <tr key={s.id}>
                    <td style={styles.td}>{date}</td>
                    <td style={styles.td}>{time}</td>
                    <td
                      style={{
                        ...styles.td,
                        textTransform: "capitalize",
                        color: s.mode === "pro" ? "#e67e22" : "#27ae60",
                        fontWeight: "bold",
                      }}
                    >
                      {s.mode || "Beginner"}
                    </td>
                    <td style={{ ...styles.td, fontWeight: "bold" }}>
                      {s.count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default App;
