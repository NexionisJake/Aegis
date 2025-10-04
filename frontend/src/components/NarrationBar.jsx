import React from "react";
import "./NarrationBar.css";

export default function NarrationBar({ text }) {
  if (!text) return null;
  return (
    <div className="narration-bar glass-panel">
      <span className="narration-text">{text}</span>
    </div>
  );
}
