import React, { useState } from "react";

export default function App() {
  const [state, setState] = useState("READY");

  const trigger = () => {
    setState("LISTENING");

    setTimeout(() => setState("PROCESSING"), 2000);
    setTimeout(() => setState("RESPONDING"), 4000);
    setTimeout(() => setState("READY"), 7000);
  };

  return (
    <div style={{
      background: "black",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      color: "red",
      fontFamily: "monospace"
    }}>
      <div
        onClick={trigger}
        style={{
          width: 150,
          height: 150,
          borderRadius: "50%",
          background: "red",
          boxShadow: "0 0 40px red",
          cursor: "pointer"
        }}
      />
      <h2 style={{ marginTop: 20 }}>{state}</h2>
    </div>
  );
}
