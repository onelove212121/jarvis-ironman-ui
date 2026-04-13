import React, { useEffect, useRef, useState } from "react";

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

export default function App() {
  const [state, setState] = useState("READY");
  const [text, setText] = useState("Tap once to activate Jarvis");

  const recognitionRef = useRef(null);
  const listeningRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognition) {
      alert("Speech Recognition not supported on this device");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      listeningRef.current = true;
      setState("LISTENING");
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }

      setText(transcript);

      if (event.results[event.results.length - 1].isFinal) {
        handleCommand(transcript);
      }
    };

    recognition.onerror = () => {
      recognition.stop();
    };

    recognition.onend = () => {
      // 🔥 AUTO RESTART = CONTINUOUS LISTENING
      if (listeningRef.current) {
        recognition.start();
      }
    };

    recognitionRef.current = recognition;
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;

    recognitionRef.current.start();
  };

  const handleCommand = (command) => {
    setState("PROCESSING");

    // 🔥 HERE YOU CONNECT TO NAKS LATER
    setTimeout(() => {
      setState("RESPONDING");
      speak(`You said ${command}`);

      setTimeout(() => {
        setState("LISTENING");
      }, 2000);
    }, 1000);
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    speechSynthesis.speak(utterance);
  };

  return (
    <div
      onClick={startListening}
      style={{
        height: "100vh",
        background: "black",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "red",
        textAlign: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "red",
          boxShadow: "0 0 60px red",
          marginBottom: 20,
        }}
      />

      <h2>{state}</h2>
      <p style={{ maxWidth: 300 }}>{text}</p>

      <small>Tap once to activate continuous listening</small>
    </div>
  );
}
