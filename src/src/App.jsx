import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Mic, MicOff } from "lucide-react";

const STATES = {
  idle: { label: "READY" },
  listening: { label: "LISTENING" },
  thinking: { label: "PROCESSING" },
  speaking: { label: "RESPONDING" },
  muted: { label: "MIC OFF" },
};

function HudRing({ delay = 0, size = 260 }) {
  return (
    <motion.div
      className="absolute rounded-full border border-red-500/40"
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8 + delay, repeat: Infinity, ease: "linear" }}
    />
  );
}

function PulseCore({ active }) {
  return (
    <motion.div
      className="w-40 h-40 rounded-full bg-red-600"
      animate={
        active
          ? { scale: [1, 1.2, 1], boxShadow: ["0 0 20px red", "0 0 80px red", "0 0 20px red"] }
          : { scale: 1, boxShadow: "0 0 20px red" }
      }
      transition={{ duration: 1, repeat: Infinity }}
    />
  );
}

function WaveBars({ active }) {
  const bars = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  return (
    <div className="flex items-end justify-center gap-1 mt-6">
      {bars.map((b) => (
        <motion.div
          key={b}
          className="w-1 bg-red-400"
          animate={
            active
              ? { height: [10, 40 + (b % 10) * 4, 12, 50, 10] }
              : { height: 10 }
          }
          transition={{ duration: 1, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState("idle");
  const [muted, setMuted] = useState(false);
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  useEffect(() => () => clearTimers(), []);

  const trigger = () => {
    if (muted) {
      setMode("muted");
      return;
    }

    clearTimers();
    setMode("listening");
    timers.current.push(setTimeout(() => setMode("thinking"), 2000));
    timers.current.push(setTimeout(() => setMode("speaking"), 4000));
    timers.current.push(setTimeout(() => setMode("idle"), 7000));
  };

  return (
    <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-red-400 font-mono overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full bg-[radial-gradient(circle,red,black)]" />
      </div>

      <div className="relative flex items-center justify-center cursor-pointer" onClick={trigger}>
        <HudRing size={300} />
        <HudRing size={260} delay={2} />
        <HudRing size={220} delay={4} />
        <PulseCore active={mode === "listening" || mode === "speaking"} />
      </div>

      <div className="mt-6 text-xl tracking-widest">
        {STATES[mode].label}
      </div>

      <WaveBars active={mode === "listening"} />

      <div className="absolute bottom-10 flex gap-6">
        <button
          onClick={() => setMuted(!muted)}
          className="p-3 border border-red-500 rounded-full"
        >
          {muted ? <MicOff /> : <Mic />}
        </button>
      </div>
    </div>
  );
}
