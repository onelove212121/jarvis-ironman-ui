import React, { useEffect, useMemo, useRef, useState } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const PARTICLE_COUNT = 88;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: randomBetween(0, Math.PI * 2),
    radius: randomBetween(80, 175),
    size: randomBetween(2.5, 7),
    speed: randomBetween(0.0015, 0.0065),
    drift: randomBetween(-0.22, 0.22),
    twinkle: randomBetween(0.35, 1),
    offset: randomBetween(0, 1000),
  }));
}

export default function App() {
  const [mode, setMode] = useState("boot");
  const [activated, setActivated] = useState(false);
  const [tick, setTick] = useState(0);
  const [audioEnergy, setAudioEnergy] = useState(0.12);

  const particles = useMemo(() => createParticles(), []);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastFinalTranscriptRef = useRef("");
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const speechPulseRef = useRef(0);
  const restartTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let frame;
    const animate = () => {
      setTick((t) => (t + 1) % 1000000);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(frame);
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      window.speechSynthesis?.cancel();
      try {
        recognitionRef.current?.stop();
      } catch {}
      try {
        mediaSourceRef.current?.disconnect();
      } catch {}
      try {
        analyserRef.current?.disconnect();
      } catch {}
      try {
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      } catch {}
      try {
        audioContextRef.current?.close();
      } catch {}
    };
  }, []);

  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass || !SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      if (!mountedRef.current) return;
      if (!isSpeakingRef.current) setMode("listening");
    };

    recognition.onresult = (event) => {
      if (isSpeakingRef.current) return;

      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          finalText += piece + " ";
        }
      }

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
      if (!mountedRef.current) return;
      setMode("error");
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (shouldKeepListeningRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start();
          } catch {}
        }, 1200);
      }
    };

    recognitionRef.current = recognition;
  }, []);

  useEffect(() => {
    let frame;
    const sampleAudio = () => {
      const analyser = analyserRef.current;
      let micLevel = 0;

      if (analyser) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);

        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const normalized = (data[i] - 128) / 128;
          sum += normalized * normalized;
        }
        micLevel = Math.min(1, Math.sqrt(sum / data.length) * 3.8);
      }

      speechPulseRef.current *= 0.88;
      const combined = Math.max(micLevel, speechPulseRef.current);

      setAudioEnergy((prev) => prev * 0.82 + combined * 0.18);
      frame = requestAnimationFrame(sampleAudio);
    };

    frame = requestAnimationFrame(sampleAudio);
    return () => cancelAnimationFrame(frame);
  }, []);

  const setupMicEnergy = async () => {
    if (mediaStreamRef.current) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.88;

      const source = context.createMediaStreamSource(stream);
      source.connect(analyser);

      mediaStreamRef.current = stream;
      audioContextRef.current = context;
      analyserRef.current = analyser;
      mediaSourceRef.current = source;

      return true;
    } catch {
      setMode("error");
      return false;
    }
  };

  const startJarvis = async () => {
    if (!recognitionRef.current) return;

    const micReady = await setupMicEnergy();
    if (!micReady) return;

    shouldKeepListeningRef.current = true;
    setActivated(true);
    setMode("awakening");

    if (audioContextRef.current?.state === "suspended") {
      try {
        await audioContextRef.current.resume();
      } catch {}
    }

    setTimeout(() => {
      try {
        recognitionRef.current.start();
      } catch {}
    }, 900);
  };

  const handleCommand = (command) => {
    setMode("thinking");

    const thinkingDelay = 700 + Math.min(800, command.length * 8);
    setTimeout(() => {
      const response = `Acknowledged. ${command}`;
      setMode("speaking");
      speak(response);
    }, thinkingDelay);
  };

  const speak = (text) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setMode("listening");
      return;
    }

    synth.cancel();
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.94;
    utterance.rate = 0.96;
    utterance.volume = 1;

    utterance.onstart = () => {
      setMode("speaking");
      speechPulseRef.current = 0.55;
    };

    utterance.onboundary = () => {
      speechPulseRef.current = 0.95;
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      speechPulseRef.current = 0.15;
      lastFinalTranscriptRef.current = "";
      if (shouldKeepListeningRef.current) {
        setMode("listening");
      } else {
        setMode("boot");
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
        return {
          spread: 72,
          glow: 0.95,
          jitter: 0.2,
          speedBoost: 1.12,
          opacity: 0.9,
          waveA: 0.35,
          waveB: 0.22,
          rotationA: 0.018,
          rotationB: 0.015,
          scalePulse: 0.08,
        };
      case "listening":
        return {
          spread: 162,
          glow: 1,
          jitter: 0.32,
          speedBoost: 1.15,
          opacity: 0.95,
          waveA: 0.65,
          waveB: 0.42,
          rotationA: 0.026,
          rotationB: 0.018,
          scalePulse: 0.12,
        };
      case "thinking":
        return {
          spread: 58,
          glow: 1.18,
          jitter: 0.08,
          speedBoost: 0.72,
          opacity: 1,
          waveA: 0.18,
          waveB: 0.08,
          rotationA: 0.01,
          rotationB: 0.008,
          scalePulse: 0.05,
        };
      case "speaking":
        return {
          spread: 120,
          glow: 1.28,
          jitter: 0.18,
          speedBoost: 1.08,
          opacity: 1,
          waveA: 0.78,
          waveB: 0.55,
          rotationA: 0.02,
          rotationB: 0.014,
          scalePulse: 0.22,
        };
      case "error":
        return {
          spread: 86,
          glow: 0.72,
          jitter: 0.55,
          speedBoost: 1.35,
          opacity: 0.72,
          waveA: 0.4,
          waveB: 0.18,
          rotationA: 0.034,
          rotationB: 0.026,
          scalePulse: 0.1,
        };
      case "boot":
      default:
        return {
          spread: 138,
          glow: 0.78,
          jitter: 0.14,
          speedBoost: 0.95,
          opacity: 0.78,
          waveA: 0.24,
          waveB: 0.12,
          rotationA: 0.014,
          rotationB: 0.011,
          scalePulse: 0.06,
        };
    }
  };

  const config = getModeConfig();
  const time = tick * 0.016;
  const energyBoost = 1 + audioEnergy * (mode === "thinking" ? 0.35 : 1.3);

  return (
    <div
      onClick={!activated ? startJarvis : undefined}
      style={{
        minHeight: "100vh",
        width: "100vw",
        overflow: "hidden",
        background:
          "radial-gradient(circle at center, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.025) 18%, rgba(12,12,14,0.98) 58%, #050505 100%)",
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
            "radial-gradient(circle at center, rgba(255,255,255,0.09), rgba(255,255,255,0.025) 18%, rgba(0,0,0,0) 42%)",
          filter: `blur(${18 + audioEnergy * 12}px)`,
          transform:
            mode === "thinking"
              ? `scale(${0.88 + audioEnergy * 0.08})`
              : `scale(${1 + audioEnergy * 0.05})`,
          transition: "transform 240ms ease, opacity 240ms ease, filter 240ms ease",
          opacity: activated ? 1 : 0.7,
        }}
      />

      <div
        style={{
          position: "relative",
          width: 380,
          height: 380,
        }}
      >
        {particles.map((p) => {
          const phase = time * (p.speed * 100) * config.speedBoost + p.offset;
          const wanderingX =
            Math.cos(phase * (0.45 + config.waveA) + p.drift) * config.jitter * 22 +
            Math.sin(phase * 0.18 + p.offset) * config.jitter * 10;
          const wanderingY =
            Math.sin(phase * (0.5 + config.waveB) - p.drift) * config.jitter * 22 +
            Math.cos(phase * 0.16 + p.offset) * config.jitter * 10;
          const radiusWave =
            Math.sin(phase * (0.16 + config.waveA * 0.15)) * 16 +
            Math.cos(phase * (0.11 + config.waveB * 0.1)) * 10;
          const activeRadius = Math.max(
            16,
            ((p.radius / 175) * config.spread + radiusWave) * energyBoost
          );
          const x =
            Math.cos(p.angle + phase * config.rotationA) * activeRadius + wanderingX;
          const y =
            Math.sin(p.angle - phase * config.rotationB) * activeRadius + wanderingY;
          const scale =
            1 +
            Math.sin(phase * (0.7 + config.waveA * 0.2)) * config.scalePulse +
            audioEnergy * 0.6;
          const alpha = Math.max(0.14, Math.min(1, p.twinkle * config.opacity + audioEnergy * 0.25));

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: p.size + audioEnergy * 2.4,
                height: p.size + audioEnergy * 2.4,
                borderRadius: "999px",
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                background: `rgba(255,255,255,${alpha})`,
                boxShadow: `0 0 ${14 * config.glow + audioEnergy * 18}px rgba(255,255,255,${Math.min(0.96, alpha)})`,
                filter: "blur(0.2px)",
                transition: "background 120ms linear, box-shadow 120ms linear, width 120ms linear, height 120ms linear",
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
            border: "1px solid rgba(255,255,255,0.09)",
            background: "rgba(255,255,255,0.045)",
            backdropFilter: "blur(12px)",
            color: "rgba(255,255,255,0.9)",
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
