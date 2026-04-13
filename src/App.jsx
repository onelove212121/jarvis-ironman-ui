import React, { useEffect, useMemo, useRef, useState } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const PARTICLE_COUNT = 70;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: randomBetween(0, Math.PI * 2),
    radius: randomBetween(70, 170),
    size: randomBetween(3, 8),
    speed: randomBetween(0.002, 0.01),
    drift: randomBetween(-0.35, 0.35),
    twinkle: randomBetween(0.4, 1),
    offset: randomBetween(0, 1000),
  }));
}

export default function App() {
  const [mode, setMode] = useState("boot");
  const [activated, setActivated] = useState(false);
  const [heardText, setHeardText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [tick, setTick] = useState(0);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastFinalTranscriptRef = useRef("");
  const animationRef = useRef(null);
  const particlesRef = useRef(createParticles());

  const particles = useMemo(() => particlesRef.current, []);

  useEffect(() => {
    let frame;
    const loop = () => {
      setTick((t) => (t + 1) % 1000000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    animationRef.current = frame;
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setMode("listening");
    };

    recognition.onresult = (event) => {
      let transcript = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript.trim();
        transcript += piece + " ";
        if (event.results[i].isFinal) {
          finalText += piece + " ";
        }
      }

      setHeardText(transcript.trim());

      const cleanFinal = finalText.trim();
      if (
        cleanFinal &&
        cleanFinal !== lastFinalTranscriptRef.current &&
        !isSpeakingRef.current
      ) {
        lastFinalTranscriptRef.current = cleanFinal;
        handleCommand(cleanFinal);
      }
    };

    recognition.onerror = () => {
      setMode("error");
    };

    recognition.onend = () => {
      if (shouldKeepListeningRef.current && !isSpeakingRef.current) {
        setTimeout(() => {
          try {
            recognition.start();
          } catch {}
        }, 400);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      shouldKeepListeningRef.current = false;
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  const premiumBeep = () => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";
      osc1.frequency.setValueAtTime(740, now);
      osc2.frequency.setValueAtTime(1110, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.05, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.02);
      osc1.stop(now + 0.4);
      osc2.stop(now + 0.36);
    } catch {}
  };

  const startJarvis = () => {
    if (!recognitionRef.current) return;
    shouldKeepListeningRef.current = true;
    setActivated(true);
    setMode("awakening");
    premiumBeep();

    setTimeout(() => {
      try {
        recognitionRef.current.start();
      } catch {}
    }, 500);
  };

  const handleCommand = (command) => {
    setMode("thinking");

    setTimeout(() => {
      const response = `Acknowledged. ${command}`;
      setReplyText(response);
      setMode("speaking");
      speak(response);
    }, 900);
  };

  const speak = (text) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setMode("listening");
      return;
    }

    synth.cancel();
    isSpeakingRef.current = true;

    try {
      recognitionRef.current?.stop();
    } catch {}

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.92;
    utterance.rate = 0.98;
    utterance.volume = 1;

    utterance.onend = () => {
      isSpeakingRef.current = false;
      lastFinalTranscriptRef.current = "";
      setMode("listening");

      if (shouldKeepListeningRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch {}
        }, 450);
      }
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setMode("error");
    };

    synth.speak(utterance);
  };

  const getModeConfig = () => {
    switch (mode) {
      case "awakening":
        return { spread: 55, glow: 1.1, jitter: 0.4, speedBoost: 1.5, opacity: 0.95 };
      case "listening":
        return { spread: 155, glow: 1, jitter: 1.2, speedBoost: 1.1, opacity: 0.9 };
      case "thinking":
        return { spread: 62, glow: 1.45, jitter: 0.25, speedBoost: 0.7, opacity: 1 };
      case "speaking":
        return { spread: 118, glow: 1.3, jitter: 0.65, speedBoost: 1.25, opacity: 1 };
      case "error":
        return { spread: 78, glow: 0.8, jitter: 2.1, speedBoost: 1.8, opacity: 0.7 };
      case "boot":
      default:
        return { spread: 135, glow: 0.85, jitter: 0.5, speedBoost: 1, opacity: 0.75 };
    }
  };

  const config = getModeConfig();
  const time = tick * 0.016;

  return (
    <div
      onClick={!activated ? startJarvis : undefined}
      style={{
        minHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
        background:
          "radial-gradient(circle at center, rgba(120,20,20,0.16) 0%, rgba(20,0,0,0.28) 28%, #020202 65%, #000 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        cursor: !activated ? "pointer" : "default",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(255,70,70,0.08), rgba(255,0,0,0.02) 18%, rgba(0,0,0,0) 40%)",
          filter: "blur(18px)",
          transform: mode === "thinking" ? "scale(0.9)" : "scale(1)",
          transition: "transform 500ms ease, opacity 500ms ease",
          opacity: activated ? 1 : 0.7,
        }}
      />

      <div
        style={{
          position: "relative",
          width: 360,
          height: 360,
        }}
      >
        {particles.map((p, i) => {
          const phase = time * (p.speed * 100) * config.speedBoost + p.offset;
          const wanderingX = Math.cos(phase * 0.7 + p.drift) * config.jitter * 18;
          const wanderingY = Math.sin(phase * 0.9 - p.drift) * config.jitter * 18;
          const radiusWave = Math.sin(phase * 0.45) * 18;
          const activeRadius = Math.max(18, (p.radius / 170) * config.spread + radiusWave);
          const x = Math.cos(p.angle + phase * 0.05) * activeRadius + wanderingX;
          const y = Math.sin(p.angle - phase * 0.04) * activeRadius + wanderingY;
          const scale =
            mode === "thinking"
              ? 0.92 + Math.sin(phase) * 0.08
              : mode === "speaking"
              ? 1 + Math.sin(phase * 1.3) * 0.25
              : 1 + Math.sin(phase) * 0.12;
          const alpha = Math.max(0.18, Math.min(1, p.twinkle * config.opacity));

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: p.size,
                height: p.size,
                borderRadius: "999px",
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                background:
                  mode === "error"
                    ? `rgba(255,90,90,${alpha})`
                    : `rgba(255,120,120,${alpha})`,
                boxShadow: `0 0 ${10 * config.glow}px rgba(255,70,70,${Math.min(0.95, alpha)})`,
                filter: "blur(0.2px)",
                transition: "background 220ms ease, box-shadow 220ms ease",
              }}
            />
          );
        })}
      </div>

      {!activated && (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "14px 20px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)",
            backdropFilter: "blur(12px)",
            color: "rgba(255,245,245,0.92)",
            fontSize: 14,
            letterSpacing: "0.03em",
            textAlign: "center",
            boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          }}
        >
          Tap once to awaken your voice assistant
        </div>
      )}
    </div>
  );
}
