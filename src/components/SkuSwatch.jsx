import React from "react";
import { SKU_IMAGE_MAP } from "../data/skuImageMap";

/*
 * SkuSwatch — a small product thumbnail for a SKU.
 *
 * When a real product image is available in SKU_IMAGE_MAP it is rendered as an
 * <img> tag (object-fit: cover). Otherwise the component falls back to a
 * deterministic SVG that represents the material visually.
 *
 * Accepts either a structured `sku` object (dept/color/finish/cls/subDept/desc)
 * or loose props (`desc`, `dept`, `color`) for views that only have a name string.
 */

const FINISH_PATTERNS = {
  "Wire-Brushed": { lines: true, lineColor: "rgba(0,0,0,.12)" },
  Smooth: { lines: false, lineColor: null },
  Scraped: { lines: true, lineColor: "rgba(0,0,0,.18)" },
  "Hand-Scraped": { lines: true, lineColor: "rgba(0,0,0,.15)" },
  Matte: { lines: false, lineColor: "rgba(0,0,0,.06)" },
  Polished: { lines: false, lineColor: "rgba(255,255,255,.25)" },
  Honed: { lines: false, lineColor: "rgba(0,0,0,.07)" },
  Textured: { lines: true, lineColor: "rgba(0,0,0,.12)" },
};

const BASE_COLORS = {
  // Wood tones
  Blonde: "#e8d5a3", Natural: "#d4b483", Brown: "#8b6914",
  Gray: "#9a9590", Grey: "#9a9590", White: "#f0ede8",
  Charcoal: "#4a4540", Dark: "#5c4a32", Light: "#e5d5b8",
  Warm: "#c4955a", Cool: "#a8b0b8", Beige: "#d4c4a0",
  Ivory: "#efe7d6", Greige: "#bcae98", Mocha: "#6f4e37",
  Chestnut: "#7a4a2b", Acacia: "#a9622f", Hickory: "#b6824b",
  Maple: "#dcc196",
  // Tile / stone colors
  Sage: "#8fab8a", Green: "#6a8c6a", Blue: "#6a7fb4",
  Coastal: "#7baabb", Sand: "#d4c29a", Lava: "#2a2a2a",
  Black: "#2c2c2c", "White Oak": "#e0c990", Mojave: "#c8a87a",
  Barnwood: "#8b7355", Driftwood: "#a09070", Pebble: "#b4a090",
  Travertine: "#d4c4a0", Slate: "#7a8090", Carrara: "#eceae6",
  Calacatta: "#f1efea", Statuario: "#f3f1ec", Crema: "#e4d8be",
  Urban: "#9a9a96", Zellige: "#8fab8a", Red: "#b4654a",
};

function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h);
}

export function skuSwatchColor(colorStr, dept) {
  if (!colorStr) {
    if (dept === "Tile") return "#b4c8d4";
    if (dept === "Wood") return "#d4b870";
    return "#a8c090";
  }
  for (const [key, val] of Object.entries(BASE_COLORS)) {
    if (colorStr.toLowerCase().includes(key.toLowerCase())) return val;
  }
  const hue = strHash(colorStr) % 360;
  const sat = 20 + (strHash(colorStr + "s") % 25);
  const lit = 60 + (strHash(colorStr + "l") % 20);
  return `hsl(${hue}, ${sat}%, ${lit}%)`;
}

export function deriveDept(text, fallback) {
  if (fallback) return fallback;
  const t = text.toLowerCase();
  if (/lvp|vinyl|nucore|laminate|\bspc\b|\bwpc\b|duralux|aquaguard|optimax|hydroshield/.test(t)) return "Laminate & Vinyl";
  if (/tile|porcelain|ceramic|marble|mosaic|subway|hex|travertine|zellige|glass|carrara|calacatta|statuario|picket|penny/.test(t)) return "Tile";
  if (/wood|oak|hickory|maple|acacia|bamboo|\beng\b|\bsol\b|plank/.test(t)) return "Wood";
  return "Tile";
}

/* Pick the visual look from the richest text we have. */
export function deriveLook(text, dept) {
  const t = text.toLowerCase();
  if (/hex/.test(t)) return "hex";
  if (/penny/.test(t)) return "penny";
  if (/subway/.test(t)) return "subway";
  if (/mosaic/.test(t)) return "mosaic";
  if (/picket|chevron|herringbone|pattern|decorative/.test(t)) return "picket";
  if (/marble|carrara|calacatta|statuario|crema/.test(t)) return "marble";
  if (/concrete|cement|urban/.test(t)) return "concrete";
  if (/travertine|slate|stone|pebble/.test(t)) return "stone";
  if (dept === "Wood" || dept === "Laminate & Vinyl") return "plank";
  if (/wood/.test(t)) return "plank";
  return "tile";
}

const SEAM = "rgba(0,0,0,.20)";
const SEAM_SOFT = "rgba(0,0,0,.12)";
const GRAIN = "rgba(0,0,0,.10)";

export function Pattern({ look, finishMeta }) {
  switch (look) {
    case "plank":
      return (
        <>
          <line x1="0" y1="13.3" x2="40" y2="13.3" stroke={SEAM} strokeWidth="1" />
          <line x1="0" y1="26.6" x2="40" y2="26.6" stroke={SEAM} strokeWidth="1" />
          <line x1="4" y1="6.5" x2="30" y2="6.5" stroke={GRAIN} strokeWidth="0.7" />
          <line x1="10" y1="20" x2="36" y2="20" stroke={GRAIN} strokeWidth="0.7" />
          <line x1="6" y1="33.5" x2="28" y2="33.5" stroke={GRAIN} strokeWidth="0.7" />
          {finishMeta.lines && <line x1="0" y1="9.5" x2="40" y2="9.5" stroke={finishMeta.lineColor} strokeWidth="0.5" />}
        </>
      );
    case "tile":
      return (
        <>
          <line x1="20" y1="0" x2="20" y2="40" stroke={SEAM} strokeWidth="1.4" />
          <line x1="0" y1="20" x2="40" y2="20" stroke={SEAM} strokeWidth="1.4" />
        </>
      );
    case "subway":
      return (
        <>
          <line x1="0" y1="13.3" x2="40" y2="13.3" stroke={SEAM} strokeWidth="1.2" />
          <line x1="0" y1="26.6" x2="40" y2="26.6" stroke={SEAM} strokeWidth="1.2" />
          <line x1="13" y1="0" x2="13" y2="13.3" stroke={SEAM} strokeWidth="1.2" />
          <line x1="27" y1="0" x2="27" y2="13.3" stroke={SEAM} strokeWidth="1.2" />
          <line x1="6" y1="13.3" x2="6" y2="26.6" stroke={SEAM} strokeWidth="1.2" />
          <line x1="20" y1="13.3" x2="20" y2="26.6" stroke={SEAM} strokeWidth="1.2" />
          <line x1="34" y1="13.3" x2="34" y2="26.6" stroke={SEAM} strokeWidth="1.2" />
          <line x1="13" y1="26.6" x2="13" y2="40" stroke={SEAM} strokeWidth="1.2" />
          <line x1="27" y1="26.6" x2="27" y2="40" stroke={SEAM} strokeWidth="1.2" />
        </>
      );
    case "mosaic":
      return (
        <>
          {[10, 20, 30].map((p) => (
            <React.Fragment key={p}>
              <line x1={p} y1="0" x2={p} y2="40" stroke={SEAM_SOFT} strokeWidth="1" />
              <line x1="0" y1={p} x2="40" y2={p} stroke={SEAM_SOFT} strokeWidth="1" />
            </React.Fragment>
          ))}
        </>
      );
    case "hex":
      return (
        <>
          {[
            "10,6 16,9.5 16,16.5 10,20 4,16.5 4,9.5",
            "30,6 36,9.5 36,16.5 30,20 24,16.5 24,9.5",
            "20,22 26,25.5 26,32.5 20,36 14,32.5 14,25.5",
          ].map((pts) => (
            <polygon key={pts} points={pts} fill="none" stroke={SEAM} strokeWidth="1.1" />
          ))}
        </>
      );
    case "penny":
      return (
        <>
          {[8, 20, 32].map((cy) =>
            [8, 20, 32].map((cx) => (
              <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4.4" fill="none" stroke={SEAM} strokeWidth="1" />
            ))
          )}
        </>
      );
    case "picket":
      return (
        <>
          {[10, 30].map((cx) =>
            [10, 30].map((cy) => (
              <rect key={`${cx}-${cy}`} x={cx - 5} y={cy - 5} width="10" height="10" transform={`rotate(45 ${cx} ${cy})`} fill="none" stroke={SEAM} strokeWidth="1" />
            ))
          )}
        </>
      );
    case "marble":
      return (
        <>
          <path d="M0 12 C 12 18, 20 6, 40 14" fill="none" stroke="rgba(120,120,130,.45)" strokeWidth="1.1" />
          <path d="M2 30 C 16 22, 26 34, 40 26" fill="none" stroke="rgba(120,120,130,.30)" strokeWidth="0.9" />
          <path d="M8 0 C 12 8, 6 14, 14 22" fill="none" stroke="rgba(120,120,130,.25)" strokeWidth="0.7" />
        </>
      );
    case "stone":
      return (
        <>
          <ellipse cx="13" cy="14" rx="9" ry="7" fill="rgba(0,0,0,.07)" />
          <ellipse cx="29" cy="27" rx="8" ry="6" fill="rgba(0,0,0,.06)" />
          <ellipse cx="28" cy="11" rx="5" ry="4" fill="rgba(255,255,255,.10)" />
        </>
      );
    case "concrete":
      return (
        <>
          <ellipse cx="14" cy="16" rx="12" ry="9" fill="rgba(0,0,0,.05)" />
          {[ [8,30],[18,8],[30,22],[33,33],[24,30] ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="rgba(0,0,0,.12)" />
          ))}
        </>
      );
    default:
      return null;
  }
}

/*
 * getSkuVisual — single source of truth for a SKU's derived appearance.
 * Returns the resolved department, material "look", base color, finish meta,
 * a department accent color, a gloss factor (0–1), and a human label.
 * Shared by SkuSwatch (thumbnail) and SkuMedia (enlarged gallery / 3D preview)
 * so both always render the exact same material for a given SKU.
 */
const GLOSS_FINISHES = /polished|glossy|gloss|lacquer/i;

export function getSkuVisual({ sku, desc, dept, color } = {}) {
  const text = [
    sku?.cls, sku?.subCls, sku?.subDept, sku?.desc, sku?.look,
    desc, color,
  ]
    .filter(Boolean)
    .join(" ");

  const dpt = deriveDept(text, sku?.dept || dept);
  const look = deriveLook(text, dpt);
  const baseColor = skuSwatchColor(sku?.color || color || text, dpt);
  const finishMeta = FINISH_PATTERNS[sku?.finish] || FINISH_PATTERNS.Smooth;
  const deptDot = dpt === "Wood" ? "#c8a82a" : dpt === "Tile" ? "#2a7ab4" : "#6aaa6a";
  const gloss = GLOSS_FINISHES.test(sku?.finish || text) ? 0.5 : 0.16;
  const label = sku?.desc || desc || "product";
  return { dpt, look, baseColor, finishMeta, deptDot, gloss, label, text };
}

export default function SkuSwatch({ sku, desc, dept, color, size = 32 }) {
  const hasInput = !!(sku || desc || dept || color);
  if (!hasInput) return null;

  /* Use real product image when available */
  const imgSrc = sku?.sku ? SKU_IMAGE_MAP[sku.sku] : null;
  if (imgSrc) {
    const borderRadius = 4;
    return (
      <img
        src={imgSrc}
        alt={sku.desc || "SKU"}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius,
          objectFit: "cover",
          flexShrink: 0,
          display: "block",
          border: "1px solid rgba(0,0,0,.10)",
        }}
        loading="lazy"
      />
    );
  }

  /* SVG fallback for SKUs without a real image */
  const { look, baseColor, finishMeta, deptDot, label } = getSkuVisual({ sku, desc, dept, color });

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      style={{ borderRadius: 4, flexShrink: 0, display: "block" }}
      role="img"
      aria-label={`${label} swatch`}
    >
      <rect width="40" height="40" rx="4" fill={baseColor} />
      <Pattern look={look} finishMeta={finishMeta} />
      {sku?.finish === "Polished" && <ellipse cx="14" cy="12" rx="8" ry="5" fill="rgba(255,255,255,.18)" />}
      <circle cx="33" cy="33" r="3.6" fill={deptDot} opacity="0.9" stroke="rgba(255,255,255,.7)" strokeWidth="0.6" />
      <rect x="0.5" y="0.5" width="39" height="39" rx="3.5" fill="none" stroke="rgba(0,0,0,.12)" strokeWidth="1" />
    </svg>
  );
}
