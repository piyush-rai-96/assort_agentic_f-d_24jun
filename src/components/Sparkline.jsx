import React from "react";

/*
 * Sparkline — tiny inline trend chart (SVG). Ported from the StoreHub
 * primitives. `color` must be a concrete value (SVG can't read CSS vars
 * reliably for stroke), so pass a token value from styles/tokens.js.
 */
export default function Sparkline({ data, width = 72, height = 22, color = "#2563eb", fill, strokeWidth = 1.5 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }} aria-hidden>
      {fill ? <polygon points={`0,${height} ${points} ${width},${height}`} fill={fill} opacity="0.18" /> : null}
      <polyline points={points} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
