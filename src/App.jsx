import React, { useEffect, useMemo, useRef, useState } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

const PARTICLE_COUNT = 96;

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createParticles() {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: randomBetween(0, Math.PI * 2),
    radius: randomBetween(70, 180),
    size: randomBetween(2, 6.5),
    speed: randomBetween(0.003, 0.009),
    drift: randomBetween(-0.25, 0.25),
    twinkle: randomBetween(0.45, 1),
    offset: randomBetween(0, 1000),
  }));
}

export default function App() {
  const [mode, setMode] = useState("boot");
  const [activated, setActivated] = useState(false);
  const [tick, setTick] = useState(0);
  const [audioEnergy, setAudioEnergy] = useState(0.16);

  const particles = useMemo(() => createParticles(), []);

  const recognitionRef = useRef(null);
  const shouldKeepListeningRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const lastFinalTranscriptRef = useRef("");
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const restartTimeoutRef = useRef(null);
  const speechPulseRef = useRef(0.12);

  useEffect(() => {
    let frameId;
    const loop = () => {
      setTick((t) => (t + 1) % 1000000);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    let frameId;
    const sample = () => {
      let micLevel = 0;
      const analyser = analyserRef.current;

      if (analyser) {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        micLevel = Math.min(1, Math.sqrt(sum / data.length) * 4.2);
      }

      speechPulseRef.current *= 0.9;
      const combined = Math.max(micLevel, speechPulseRef.current, 0.08);
      setAudioEnergy((prev) => prev * 0.82 + combined * 0.18);
      frameId = requestAnimationFrame(sample);
    };

    frameId = requestAnimationFrame(sample);
    return () => cancelAnimationFrame(frameId);
  }, []);

  useEffect(() => {
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      if (!isSpeakingRef.current) setMode("listening");
    };

    recognition.onresult = (event) => {
      if (isSpeakingRef.current) return;

      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) finalText += piece + " ";
      }

      const cleanFinal = finalText.trim();
      if (cleanFinal && cleanFinal !== lastFinalTranscriptRef.current) {
        lastFinalTranscriptRef.current = cleanFinal;
        handleCommand(cleanFinal);
      }
    };

    recognition.onerror = () => {
      setMode("error");
    };

    recognition.onend = () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      if (shouldKeepListeningRef.current && !isSpeakingRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            recognition.start();
          } catch {}
        }, 900);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
      try {
        recognition.stop();
      } catch {}
    };
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
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
      if (!AudioContextClass) return false;
      const context = new AudioContextClass();
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;

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
    const ok = await setupMicEnergy();
    if (!ok || !recognitionRef.current) return;

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
    }, 850);
  };

  const handleCommand = (command) => {
    setMode("thinking");
    setTimeout(() => {
      speak(`Acknowledged. ${command}`);
    }, 700);
  };

  const speak = (text) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setMode("listening");
      return;
    }

    const loadVoices = () => synth.getVoices?.() || [];
    let voices = loadVoices();
    if (!voices.length) {
      try {
        synth.cancel();
      } catch {}
      voices = loadVoices();
    }

    synth.cancel();
    isSpeakingRef.current = true;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.96;
    utterance.rate = 0.97;
    utterance.volume = 1;
    utterance.lang = "en-US";

    const preferred =
      voices.find((v) => /en(-|_)US/i.test(v.lang) && /Google|Samantha|Microsoft|English/i.test(v.name)) ||
      voices.find((v) => /en/i.test(v.lang));

    if (preferred) {
      utterance.voice = preferred;
      utterance.lang = preferred.lang || "en-US";
    }

    utterance.onstart = () => {
      setMode("speaking");
      speechPulseRef.current = 0.65;
    };

    utterance.onboundary = () => {
      speechPulseRef.current = 1;
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      speechPulseRef.current = 0.14;
      lastFinalTranscriptRef.current = "";
      if (shouldKeepListeningRef.current) setMode("listening");
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setMode("error");
    };

    setTimeout(() => {
      try {
        synth.speak(utterance);
      } catch {
        isSpeakingRef.current = false;
        setMode("error");
      }
    }, 80);
  };

  const getModeConfig = () => {
    switch (mode) {
      case "awakening":
        return { spread: 80, jitter: 0.18, glow: 0.95, rotateA: 0.01, rotateB: 0.012, pulse: 0.06 };
      case "listening":
        return { spread: 170, jitter: 0.42, glow: 1.05, rotateA: 0.024, rotateB: 0.02, pulse: 0.12 };
      case "thinking":
        return { spread: 62, jitter: 0.08, glow: 1.18, rotateA: 0.006, rotateB: 0.007, pulse: 0.05 };
      case "speaking":
        return { spread: 125, jitter: 0.18, glow: 1.28, rotateA: 0.016, rotateB: 0.014, pulse: 0.22 };
      case "error":
        return { spread: 95, jitter: 0.6, glow: 0.7, rotateA: 0.04, rotateB: 0.03, pulse: 0.08 };
      case "boot":
      default:
        return { spread: 145, jitter: 0.16, glow: 0.82, rotateA: 0.012, rotateB: 0.011, pulse: 0.05 };
    }
  };

  const config = getModeConfig();
  const time = tick * 0.016;
  const energyBoost = 1 + audioEnergy * (mode === "thinking" ? 0.24 : 0.95);

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
            "radial-gradient(circle at center, rgba(255,255,255,0.09), rgba(255,255,255,0.02) 20%, rgba(0,0,0,0) 44%)",
          filter: `blur(${18 + audioEnergy * 10}px)`,
          transform: mode === "thinking" ? `scale(${0.9 + audioEnergy * 0.04})` : `scale(${1 + audioEnergy * 0.03})`,
          transition: "transform 180ms linear, filter 180ms linear",
          opacity: activated ? 1 : 0.72,
        }}
      />

      <div style={{ position: "relative", width: 390, height: 390 }}>
        {particles.map((p) => {
          const phase = time * (p.speed * 100) + p.offset;
          const noiseX =
            Math.cos(phase * (0.6 + p.drift) + p.offset) * config.jitter * 34 +
            Math.sin(phase * 0.21 + p.offset) * 10 * config.jitter;
          const noiseY =
            Math.sin(phase * (0.55 - p.drift) + p.offset) * config.jitter * 34 +
            Math.cos(phase * 0.18 + p.offset) * 10 * config.jitter;

          const localRadius =
            ((p.radius / 180) * config.spread + Math.sin(phase * 0.2) * 10 + Math.cos(phase * 0.14) * 8) * energyBoost;

          const x = Math.cos(p.angle + phase * config.rotateA) * localRadius + noiseX;
          const y = Math.sin(p.angle - phase * config.rotateB) * localRadius + noiseY;
          const scale = 1 + Math.sin(phase * 0.7) * config.pulse + audioEnergy * 0.55;
          const alpha = Math.max(0.16, Math.min(1, p.twinkle * 0.82 + audioEnergy * 0.22));
          const size = p.size + audioEnergy * 1.8;

          return (
            <div
              key={p.id}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: size,
                height: size,
                borderRadius: 999,
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                background: `rgba(255,255,255,${alpha})`,
                boxShadow: `0 0 ${12 * config.glow + audioEnergy * 14}px rgba(255,255,255,${Math.min(0.96, alpha)})`,
                transition: "width 80ms linear, height 80ms linear, box-shadow 80ms linear",
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
<button
  onClick={() => {
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance("Voice test successful.");
    u.lang = "en-US";
    u.volume = 1;
    u.rate = 1;
    u.pitch = 1;
    synth.cancel();
    synth.speak(u);
  }}
>
  Test Voice
</button>
