import React, { useState } from "react";
import "./GlossaryPopover.css";

const GLOSSARY = {
  "semi-major axis": {
    label: "Semi-major Axis",
    definition: "The longest radius of an ellipse, representing half the longest diameter of an orbit.",
    img: "/glossary/semimajor.svg"
  },
  "eccentricity": {
    label: "Eccentricity",
    definition: "A measure of how much an orbit deviates from a perfect circle (0 = circle, 1 = parabola).",
    img: "/glossary/eccentricity.svg"
  },
  "megatons TNT": {
    label: "Megatons TNT",
    definition: "A unit of energy equal to one million tons of TNT. Used to describe impact energy.",
    img: "/glossary/megatons.svg"
  },
  "diameter": {
    label: "Diameter",
    definition: "The width of the asteroid at its widest point, typically measured in kilometers.",
  },
  // Add more terms as needed
};

export default function GlossaryPopover({ term }) {
  const [open, setOpen] = useState(false);
  const entry = GLOSSARY[term];
  if (!entry) return null;
  return (
    <span className="glossary-popover-wrapper">
      <span
        className="glossary-icon"
        tabIndex={0}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label={`What is ${entry.label}?`}
      >
        ?
      </span>
      {open && (
        <span className="glossary-popover glass-panel">
          <strong>{entry.label}</strong>
          <div className="glossary-def">{entry.definition}</div>
          {entry.img && <img src={entry.img} alt={entry.label} className="glossary-img" />}
        </span>
      )}
    </span>
  );
}
