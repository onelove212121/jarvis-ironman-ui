import React, { useEffect, useRef, useState } from "react";

const ringStyle = (size, duration, reverse = false) => ({
  position: "absolute",
  width: size,
  height: size,
  border: "2px solid rgba(255,0,0,0.35)",
  borderRadius: "50%",
  animation: `${reverse ? "spinReverse" : "spin"} ${duration}s linear infinite`,
});

export default function App() {
  const [state, setState] = useState("READY");
  const [active, setActive] = useState(false);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const trigger = () => {
    clearTimers();
    setActive(true);
    setState("LISTENING");

    timers.current.push(setTimeout(() => setState("PROCESSING"), 2000));
    timers.current.push(setTimeout(() => setState("RESPONDING"), 4000));
    timers.current.push(
      setTimeout(() => {
        setState("READY");
        setActive(false);
      }, 7000)
    );
  };

  return (
    <>
      <style>{`
        body {
          margin: 0;
          background: black;
          overflow: hidden;
          font-family: monospace;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spinReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 30px red; }
          50% { transform: scale(1.08); box-shadow: 0 0 70px red; }
          100% { transform: scale(1); box-shadow: 0 0 30px red; }
        }

        .core-active {
          animation: pulse 1s ease-in-out infinite;
        }
      `}</style>

      <div
        style={{
          height: "100vh",
          width: "100vw",
          background: "radial-gradient(circle at center, rgba(80,0,0,0.18), black 60%)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          color: "red",
        }}
      >
        <div
          onClick={trigger}
          style={{
            position: "relative",
            width: 320,
            height: 320,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div style={ringStyle(300, 10)} />
          <div style={ringStyle(250, 7, true)} />
          <div style={ringStyle(210, 5)} />

          <div
            className={active ? "core-active" : ""}
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "red",
              boxShadow: "0 0 30px red",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            letterSpacing: 2,
            color: "#ff3b3b",
          }}
        >
          {state}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "rgba(255,80,80,0.7)",
          }}
        >
          TAP THE CORE
        </div>
      </div>
    </>
  );
}
