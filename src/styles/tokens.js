/*
 * JS token mirror — for places that can't read CSS variables
 * (Highcharts SVG fills, canvas, AG Grid cell styles, etc.).
 * Values MUST stay in sync with global.css semantic roles.
 * Import these instead of writing raw hex.
 */
export const color = {
  primary:       "#2563eb",
  primaryStrong: "#1d4ed8",
  primarySoft:   "#eff6ff",

  surface:        "#ffffff",
  surfaceAlt:     "#eef2ff",
  surfaceSunken:  "#e2e8ff",
  bg:             "#f0f4ff",

  text:        "#0d1422",
  textStrong:  "#0a1640",
  textMuted:   "#475569",
  textSubtle:  "#94a3b8",

  border:       "#cbd5e1",
  borderStrong: "#94a3b8",

  error:         "#dc2626",
  errorSoft:     "#fef2f2",
  errorBorder:   "#fca5a5",
  success:       "#059669",
  successSoft:   "#ecfdf5",
  successBorder: "#6ee7b7",
  warning:       "#d97706",
  warningSoft:   "#fffbeb",
  warningBorder: "#fcd34d",
  info:          "#2563eb",
  infoSoft:      "#eff6ff",
  infoBorder:    "#bfdbfe",
  accent:        "#6d28d9",
  accentSoft:    "#f5f3ff",
  accentDark:    "#4c1d95",
  teal:          "#0b7a6c",
  tealSoft:      "#e6f7f4",
  wood:          "#b45309",
  woodSoft:      "#fef3c7",
  neutral:       "#9ca3af",

  // Chart track / neutral bar background
  track: "#e2e8ff",
};

/* Department → semantic color, shared by Hindsight + merch views. */
export const deptColor = {
  Wood:               color.wood,
  Tile:               color.teal,
  "Laminate & Vinyl": color.info,
};
