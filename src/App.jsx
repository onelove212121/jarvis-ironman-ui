import React, { useEffect, useRef, useState } from "react";

const STATES = {
  READY: "idle",
  LISTENING: "listen",
  PROCESSING: "scan",
  RESPONDING: "speak",
  SUCCESS: "success",
  ERROR: "error",
};

function getParticleStyle(i, mode) {
  const angle = (i / 18) * Math.PI * 2;
  const baseRadius =
    mode === "listen" ? 70 :
    mode === "scan" ? 105 :
    mode === "speak" ? 90 :
    mode === "success" ? 95 :
    mode === "error" ? 85 : 120;

  const x = Math.cos(angle) * baseRadius;
  const y = Math.sin(angle) * baseRadius;

  let animation = "float 4s ease-in-out infinite";
  if (mode === "listen") animation = "listenPull 1.6s ease-in-out infinite";
  if (mode === "scan") animation = "orbit 2.5s linear infinite";
  if (mode === "speak") animation = "speakPulse 1.2s ease-in-out infinite";
  if (mode === "success") animation = "successBloom 1.8s ease-in-out infinite";
  if (mode === "error") animation = "errorShake 0.5s linear infinite";

  return {
    position: "absolute",
    width: 8 + (i % 3) * 4,
    height: 8 + (i % 3) * 4,
    borderRadius: "50%",
    background: "rgba(255,40,40,0.95)",
    boxShadow: "0 0 10px rgba(255,0,0,0.9)",
    transform: `translate(${x}px, ${y}px)`,
    animation,
    animationDelay: `${i * 0.08}s`,
  };
}

export default function App() {
  const [state, setState] = useState("READY");
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const triggerDemo = () => {
    clearTimers();
    setState("LISTENING");
    timers.current.push(setTimeout(() => setState("PROCESSING"), 2000));
    timers.current.push(setTimeout(() => setState("RESPONDING"), 4500));
    timers.current.push(setTimeout(() => setState("SUCCESS"), 7000));
    timers.current.push(setTimeout(() => setState("READY"), 9500));
  };

  const mode = STATES[state];

  return (
    <>
      <style>{`
        body {
          margin: 0;
          background: #000;
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

        @keyframes corePulse {
          0% { transform: scale(1); box-shadow: 0 0 30px red; }
          50% { transform: scale(1.08); box-shadow: 0 0 80px red; }
          100% { transform: scale(1); box-shadow: 0 0 30px red; }
        }

        @keyframes coreScan {
          0% { transform: scale(1); box-shadow: 0 0 25px red; }
          50% { transform: scale(1.15); box-shadow: 0 0 100px rgba(255,0,0,1); }
          100% { transform: scale(1); box-shadow: 0 0 25px red; }
        }

        @keyframes coreSpeak {
          0% { transform: scale(1); }
          25% { transform: scale(1.06); }
          50% { transform: scale(1.12); }
          75% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }

        @keyframes float {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }

        @keyframes orbit {
          from { transform: rotate(0deg) translateX(110px) rotate(0deg); }
          to { transform: rotate(360deg) translateX(110px) rotate(-360deg); }
        }

        @keyframes listenPull {
          0% { transform: scale(1) translateY(0px); opacity: 0.5; }
          50% { transform: scale(1.2) translateY(-6px); opacity: 1; }
          100% { transform: scale(1) translateY(0px); opacity: 0.5; }
        }

        @keyframes speakPulse {
          0% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 1; }
          100% { transform: scale(1); opacity: 0.5; }
        }

        @keyframes successBloom {
          0% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.4); opacity: 1; }
          100% { transform: scale(1); opacity: 0.6; }
        }

        @keyframes errorShake {
          0% { transform: translate(0, 0); opacity: 0.7; }
          25% { transform: translate(-3px, 2px); opacity: 1; }
          50% { transform: translate(3px, -2px); opacity: 0.6; }
          75% { transform: translate(-2px, -1px); opacity: 1; }
          100% { transform: translate(0, 0); opacity: 0.7; }
        }

        @keyframes waveOut {
          0% { transform: scale(0.7); opacity: 0.7; }
          100% { transform: scale(1.5); opacity: 0; }
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
          onClick={triggerDemo}
          style={{
            position: "relative",
            width: 360,
            height: 360,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 300,
              height: 300,
              borderRadius: "50%",
              border: "2px solid rgba(255,0,0,0.25)",
              animation: "spin 10s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 250,
              height: 250,
              borderRadius: "50%",
              border: "2px solid rgba(255,0,0,0.18)",
              animation: "spinReverse 7s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 210,
              height: 210,
              borderRadius: "50%",
              border: "2px solid rgba(255,0,0,0.14)",
              animation: "spin 5s linear infinite",
            }}
          />

          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} style={getParticleStyle(i, mode)} />
          ))}

          {(mode === "speak" || mode === "success") && (
            <>
              <div
                style={{
                  position: "absolute",
                  width: 150,
                  height: 150,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,60,60,0.5)",
                  animation: "waveOut 1.4s ease-out infinite",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  width: 150,
                  height: 150,
                  borderRadius: "50%",
                  border: "2px solid rgba(255,60,60,0.35)",
                  animation: "waveOut 1.4s ease-out infinite",
                  animationDelay: "0.5s",
                }}
              />
            </>
          )}

          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "red",
              boxShadow: "0 0 35px red",
              animation:
                mode === "scan"
                  ? "coreScan 1.2s ease-in-out infinite"
                  : mode === "speak"
                  ? "coreSpeak 0.8s ease-in-out infinite"
                  : "corePulse 1.8s ease-in-out infinite",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 24,
            fontSize: 22,
            letterSpacing: 4,
            color: "#ff4a4a",
          }}
        >
          {state}
        </div>

        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "rgba(255,90,90,0.72)",
          }}
        >
          TAP THE CORE
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", maxWidth: 360 }}>
          {["READY", "LISTENING", "PROCESSING", "RESPONDING", "SUCCESS", "ERROR"].map((label) => (
            <button
              key={label}
              onClick={() => setState(label)}
              style={{
                background: "transparent",
                color: "#ff5c5c",
                border: "1px solid rgba(255,0,0,0.4)",
                padding: "8px 12px",
                borderRadius: 999,
                fontFamily: "monospace",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
