/*
 * SkuMedia — the product imagery experience for a SKU row.
 *
 * Replaces the old static swatch with a richer, interactive media cell:
 *   • A compact thumbnail that lives in the table's "Images" column.
 *   • On hover the thumbnail smoothly enlarges into a high-quality preview
 *     popover (rendered through a portal so it escapes AG-Grid cell clipping).
 *   • Inside the preview the user can switch between two modes:
 *       1. Gallery — swipe / scroll / arrow through alternate "photographs"
 *          of the same product (top view, in-room scene, macro texture).
 *       2. 3D      — a draggable, auto-rotating 3D sample chip of the material.
 *
 * There are no real product photos in this prototype, so every view is a
 * deterministic vector render derived from the SKU's material attributes via
 * getSkuVisual() — the same source SkuSwatch uses, so thumbnail and preview
 * always agree.
 *
 * State (all local to a cell instance):
 *   open     — is the preview visible (hover or pinned)
 *   pinned   — clicked-open, survives mouse-leave until dismissed
 *   mode     — "gallery" | "3d"
 *   index    — active gallery slide
 *   rot      — { x, y } 3D rotation in degrees
 *   pos      — fixed viewport coords for the portal popover
 */
import React, { useState, useRef, useEffect, useCallback, useId } from "react";
import { createPortal } from "react-dom";
import { Badge, Button } from "impact-ui";
import SkuSwatch, { getSkuVisual, Pattern } from "./SkuSwatch.jsx";
import { SKU_IMAGE_MAP } from "../data/skuImageMap";
import "./SkuMedia.css";

const POP_W = 384;
const POP_H = 340;
const MARGIN = 12;

/* The three "photographs" we synthesise for the gallery. */
const GALLERY_VIEWS = [
  { id: "top", label: "Top view" },
  { id: "room", label: "In-room" },
  { id: "macro", label: "Texture" },
];

/* ── Synthetic scene renderer ─────────────────────────────────────────────
 * One SVG per gallery view. "top" view uses the real product image when
 * available; "room" and "macro" always use the SVG material synthesis so
 * they add contextual value beyond just the product photo. */
function SkuScene({ view, vis, realImgSrc }) {
  const uid = useId().replace(/[:]/g, "");
  const { baseColor, look, finishMeta, gloss } = vis;
  const pid = `mat-${uid}-${view}`;

  /* Top / flat-lay: prefer real photo */
  if (view === "top" && realImgSrc) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f3f0" }}>
        <img
          src={realImgSrc}
          alt="Product"
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
        />
      </div>
    );
  }

  const matPattern = (transform) => (
    <pattern
      id={pid}
      width="40"
      height="40"
      patternUnits="userSpaceOnUse"
      patternTransform={transform}
    >
      <rect width="40" height="40" fill={baseColor} />
      <Pattern look={look} finishMeta={finishMeta} />
    </pattern>
  );

  if (view === "room") {
    const wallTop = `${pid}-wall`;
    const beam = `${pid}-beam`;
    const floorLite = `${pid}-fl`;
    return (
      <svg viewBox="0 0 360 240" className="media-scene-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          {matPattern("scale(1.15)")}
          <linearGradient id={wallTop} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f3f0ea" />
            <stop offset="100%" stopColor="#e4ded3" />
          </linearGradient>
          <linearGradient id={beam} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={floorLite} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#000" stopOpacity="0.22" />
            <stop offset="45%" stopColor="#000" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#fff" stopOpacity={String(gloss * 0.5)} />
          </linearGradient>
        </defs>

        {/* Wall */}
        <rect x="0" y="0" width="360" height="150" fill={`url(#${wallTop})`} />
        {/* Window + light */}
        <rect x="232" y="26" width="96" height="78" rx="3" fill="#dfeaf2" stroke="#c7d2da" strokeWidth="2" />
        <line x1="280" y1="26" x2="280" y2="104" stroke="#c7d2da" strokeWidth="2" />
        <line x1="232" y1="65" x2="328" y2="65" stroke="#c7d2da" strokeWidth="2" />
        <polygon points="232,104 328,104 300,150 150,150" fill={`url(#${beam})`} />
        {/* Framed art */}
        <rect x="48" y="40" width="64" height="48" rx="2" fill="#fff" stroke="#cfc8bb" strokeWidth="3" />
        <rect x="56" y="48" width="48" height="32" fill={baseColor} opacity="0.5" />
        {/* Floor */}
        <polygon points="0,150 360,150 360,240 0,240" fill={`url(#${pid})`} />
        <polygon points="0,150 360,150 360,240 0,240" fill={`url(#${floorLite})`} />
        {/* Baseboard */}
        <rect x="0" y="146" width="360" height="6" fill="#efeae0" />
        {/* Sofa silhouette */}
        <g fill="#6f6a60" opacity="0.92">
          <rect x="40" y="120" width="150" height="34" rx="10" />
          <rect x="34" y="108" width="26" height="40" rx="9" />
          <rect x="170" y="108" width="26" height="40" rx="9" />
          <rect x="58" y="104" width="112" height="22" rx="8" fill="#7c776c" />
        </g>
        {/* Plant */}
        <g>
          <rect x="300" y="120" width="26" height="30" rx="3" fill="#9a8c74" />
          <path d="M313 120 C300 96 300 80 308 70" fill="none" stroke="#4f7a45" strokeWidth="5" strokeLinecap="round" />
          <path d="M313 120 C326 98 330 84 322 72" fill="none" stroke="#5e8a52" strokeWidth="5" strokeLinecap="round" />
          <path d="M313 122 C312 100 314 86 313 74" fill="none" stroke="#6f9b62" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (view === "macro") {
    const sheen = `${pid}-sheen`;
    const vig = `${pid}-vig`;
    return (
      <svg viewBox="0 0 360 240" className="media-scene-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          {matPattern("scale(2.9) rotate(8)")}
          <radialGradient id={sheen} cx="34%" cy="26%" r="80%">
            <stop offset="0%" stopColor="#fff" stopOpacity={String(0.18 + gloss * 0.6)} />
            <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={vig} cx="50%" cy="50%" r="72%">
            <stop offset="62%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.34" />
          </radialGradient>
        </defs>
        <rect width="360" height="240" fill={`url(#${pid})`} />
        <rect width="360" height="240" fill={`url(#${sheen})`} />
        <rect width="360" height="240" fill={`url(#${vig})`} />
      </svg>
    );
  }

  /* Default: top / flat lay view */
  const sheen = `${pid}-sheen`;
  return (
    <svg viewBox="0 0 360 240" className="media-scene-svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        {matPattern("scale(1)")}
        <radialGradient id={sheen} cx="36%" cy="24%" r="85%">
          <stop offset="0%" stopColor="#fff" stopOpacity={String(0.12 + gloss * 0.7)} />
          <stop offset="58%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height="240" fill={`url(#${pid})`} />
      <rect width="360" height="240" fill={`url(#${sheen})`} />
      <rect x="1" y="1" width="358" height="238" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2" />
    </svg>
  );
}

/* ── Interactive 3D material chip ─────────────────────────────────────────
 * A real CSS-3D box (preserve-3d) the user can drag to spin. Front/back faces
 * carry the material swatch; the four edges are shaded extrusions of the base
 * colour to read as a physical sample tile. */
const BOX = { w: 176, h: 176, d: 22 };

function Sku3D({ sku, vis, rot, dragging, onPointerDown }) {
  const { baseColor } = vis;
  const { w, h, d } = BOX;
  const half = (a) => a / 2;

  const faceBase = {
    position: "absolute",
    left: "50%",
    top: "50%",
    boxSizing: "border-box",
  };
  const edge = (extra) => ({
    ...faceBase,
    backgroundColor: baseColor,
    backgroundImage:
      "linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.18))",
    border: "1px solid rgba(0,0,0,0.25)",
    ...extra,
  });
  const swatchFace = (extra) => ({
    ...faceBase,
    background: "#fff",
    boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
    overflow: "hidden",
    ...extra,
  });

  return (
    <div
      className={`media-3d-stage${dragging ? " is-dragging" : ""}`}
      onPointerDown={onPointerDown}
    >
      <div
        className="media-3d-cube"
        style={{
          width: w,
          height: h,
          transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg)`,
          transition: dragging ? "none" : "transform 0.08s linear",
        }}
      >
        {/* Front */}
        <div
          style={swatchFace({
            width: w,
            height: h,
            marginLeft: -half(w),
            marginTop: -half(h),
            transform: `translateZ(${half(d)}px)`,
          })}
        >
          <SkuSwatch sku={sku} size={w} />
        </div>
        {/* Back */}
        <div
          style={swatchFace({
            width: w,
            height: h,
            marginLeft: -half(w),
            marginTop: -half(h),
            transform: `rotateY(180deg) translateZ(${half(d)}px)`,
          })}
        >
          <SkuSwatch sku={sku} size={w} />
        </div>
        {/* Right */}
        <div
          style={edge({
            width: d,
            height: h,
            marginLeft: -half(d),
            marginTop: -half(h),
            transform: `rotateY(90deg) translateZ(${half(w)}px)`,
          })}
        />
        {/* Left */}
        <div
          style={edge({
            width: d,
            height: h,
            marginLeft: -half(d),
            marginTop: -half(h),
            transform: `rotateY(-90deg) translateZ(${half(w)}px)`,
          })}
        />
        {/* Top */}
        <div
          style={edge({
            width: w,
            height: d,
            marginLeft: -half(w),
            marginTop: -half(d),
            transform: `rotateX(90deg) translateZ(${half(h)}px)`,
          })}
        />
        {/* Bottom */}
        <div
          style={edge({
            width: w,
            height: d,
            marginLeft: -half(w),
            marginTop: -half(d),
            transform: `rotateX(-90deg) translateZ(${half(h)}px)`,
          })}
        />
      </div>
    </div>
  );
}

/* ── SkuMedia ─────────────────────────────────────────────────────────────*/
export default function SkuMedia({ sku, size = 40 }) {
  const vis = getSkuVisual({ sku });
  const realImgSrc = sku?.sku ? SKU_IMAGE_MAP[sku.sku] : null;

  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [mode, setMode] = useState("gallery");
  const [index, setIndex] = useState(0);
  const [pos, setPos] = useState({ left: 0, top: 0, side: "right" });
  const [rot, setRot] = useState({ x: -16, y: 28 });
  const [dragging, setDragging] = useState(false);

  const anchorRef = useRef(null);
  const popRef = useRef(null);
  const galleryRef = useRef(null);
  const closeTimer = useRef(null);
  const wheelLock = useRef(false);
  const pinnedRef = useRef(false);
  const dragRef = useRef(null);
  const galleryDrag = useRef(null);

  const view = GALLERY_VIEWS[index];

  /* ----- positioning ----- */
  const computePos = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let side = "right";
    let left = r.right + MARGIN;
    if (left + POP_W > window.innerWidth - MARGIN) {
      left = r.left - POP_W - MARGIN;
      side = "left";
    }
    if (left < MARGIN) {
      left = Math.max(MARGIN, (window.innerWidth - POP_W) / 2);
      side = "center";
    }
    let top = r.top + r.height / 2 - POP_H / 2;
    top = Math.min(Math.max(MARGIN, top), window.innerHeight - POP_H - MARGIN);
    setPos({ left, top, side });
  }, []);

  /* ----- open / close with hover-intent ----- */
  const openPreview = useCallback(() => {
    clearTimeout(closeTimer.current);
    computePos();
    setOpen(true);
  }, [computePos]);

  const scheduleClose = useCallback(() => {
    if (pinnedRef.current) return;
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 140);
  }, []);

  const cancelClose = useCallback(() => clearTimeout(closeTimer.current), []);

  const togglePin = useCallback(() => {
    const next = !pinnedRef.current;
    pinnedRef.current = next;
    setPinned(next);
    if (next) openPreview();
  }, [openPreview]);

  const dismiss = useCallback(() => {
    pinnedRef.current = false;
    setPinned(false);
    setOpen(false);
  }, []);

  /* Close pinned popover on outside click / Escape. */
  useEffect(() => {
    if (!open || !pinned) return undefined;
    const onDocDown = (e) => {
      if (
        popRef.current?.contains(e.target) ||
        anchorRef.current?.contains(e.target)
      )
        return;
      dismiss();
    };
    const onKey = (e) => e.key === "Escape" && dismiss();
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, pinned, dismiss]);

  /* Reposition / dismiss on scroll + resize while open. */
  useEffect(() => {
    if (!open) return undefined;
    const onScroll = () => (pinnedRef.current ? computePos() : setOpen(false));
    const onResize = () => computePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, computePos]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  /* ----- 3D idle auto-rotation (paused while dragging) ----- */
  useEffect(() => {
    if (!open || mode !== "3d" || dragging) return undefined;
    let raf;
    const tick = () => {
      setRot((r) => ({ ...r, y: r.y + 0.32 }));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, mode, dragging]);

  /* ----- 3D drag-to-rotate ----- */
  const on3DPointerDown = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(true);
      dragRef.current = { x: e.clientX, y: e.clientY, rx: rot.x, ry: rot.y };
      const move = (ev) => {
        const dx = ev.clientX - dragRef.current.x;
        const dy = ev.clientY - dragRef.current.y;
        setRot({
          x: Math.max(-80, Math.min(80, dragRef.current.rx - dy * 0.5)),
          y: dragRef.current.ry + dx * 0.5,
        });
      };
      const up = () => {
        setDragging(false);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [rot]
  );

  /* ----- gallery navigation ----- */
  const go = useCallback(
    (dir) =>
      setIndex((i) => (i + dir + GALLERY_VIEWS.length) % GALLERY_VIEWS.length),
    []
  );

  /* Native non-passive wheel listener so we can preventDefault page scroll
   * and turn vertical/horizontal wheel deltas into one slide per "notch". */
  useEffect(() => {
    if (!open || mode !== "gallery") return undefined;
    const el = galleryRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 4) return;
      e.preventDefault();
      if (wheelLock.current) return;
      wheelLock.current = true;
      go(delta > 0 ? 1 : -1);
      setTimeout(() => (wheelLock.current = false), 280);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [open, mode, go]);

  const onGalleryPointerDown = useCallback(
    (e) => {
      galleryDrag.current = { x: e.clientX, fired: false };
      const move = (ev) => {
        if (!galleryDrag.current || galleryDrag.current.fired) return;
        const dx = ev.clientX - galleryDrag.current.x;
        if (Math.abs(dx) > 40) {
          galleryDrag.current.fired = true;
          go(dx < 0 ? 1 : -1);
        }
      };
      const up = () => {
        galleryDrag.current = null;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [go]
  );

  if (!sku) return null;

  const skuId = sku.sku ?? sku.id;

  const preview =
    open &&
    createPortal(
      <div
        ref={popRef}
        className={`media-pop media-pop--${pos.side}${pinned ? " is-pinned" : ""}`}
        style={{ left: pos.left, top: pos.top, width: POP_W }}
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        role="dialog"
        aria-label={`${vis.label} preview`}
      >
        <div className="media-pop-head">
          <div className="media-pop-title">
            <SkuSwatch sku={sku} size={22} />
            <div className="media-pop-titletext">
              <span className="media-pop-name">{vis.label}</span>
              {skuId != null && <span className="media-pop-sku">SKU {skuId}</span>}
            </div>
          </div>
          <div className="media-pop-modes">
            <Button
              size="small"
              variant={mode === "gallery" ? "primary" : "secondary"}
              onClick={() => setMode("gallery")}
            >
              Gallery
            </Button>
            <Button
              size="small"
              variant={mode === "3d" ? "primary" : "secondary"}
              onClick={() => setMode("3d")}
            >
              3D
            </Button>
            {pinned && (
              <button className="media-pop-close" onClick={dismiss} aria-label="Close preview">
                ×
              </button>
            )}
          </div>
        </div>

        <div className="media-pop-stage">
          {mode === "gallery" ? (
            <div
              className="media-gallery"
              ref={galleryRef}
              onPointerDown={onGalleryPointerDown}
            >
              <div
                className="media-gallery-track"
                style={{ transform: `translateX(-${index * 100}%)` }}
              >
                {GALLERY_VIEWS.map((v) => (
                  <div className="media-gallery-slide" key={v.id}>
                    <SkuScene view={v.id} vis={vis} realImgSrc={realImgSrc} />
                  </div>
                ))}
              </div>
              <button
                className="media-gallery-arrow media-gallery-arrow--prev"
                onClick={() => go(-1)}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                className="media-gallery-arrow media-gallery-arrow--next"
                onClick={() => go(1)}
                aria-label="Next image"
              >
                ›
              </button>
              <span className="media-gallery-tag">{view.label}</span>
            </div>
          ) : (
            <Sku3D
              sku={sku}
              vis={vis}
              rot={rot}
              dragging={dragging}
              onPointerDown={on3DPointerDown}
            />
          )}
        </div>

        <div className="media-pop-foot">
          {mode === "gallery" ? (
            <>
              <div className="media-dots">
                {GALLERY_VIEWS.map((v, i) => (
                  <button
                    key={v.id}
                    className={`media-dot${i === index ? " is-active" : ""}`}
                    onClick={() => setIndex(i)}
                    aria-label={`Show ${v.label}`}
                  />
                ))}
              </div>
              <span className="media-foot-hint">
                {index + 1}/{GALLERY_VIEWS.length} · swipe or scroll
              </span>
            </>
          ) : (
            <>
              <Badge variant="subtle" size="small" color="info" label="Drag to rotate" />
              <button
                className="media-foot-reset"
                onClick={() => setRot({ x: -16, y: 28 })}
              >
                Reset view
              </button>
            </>
          )}
        </div>
      </div>,
      document.body
    );

  return (
    <div className="media-cell-inner">
      <button
        ref={anchorRef}
        type="button"
        className={`media-thumb${open ? " is-active" : ""}`}
        onMouseEnter={openPreview}
        onMouseLeave={scheduleClose}
        onClick={togglePin}
        aria-label={`${vis.label} — open product imagery`}
        aria-expanded={open}
      >
        <SkuSwatch sku={sku} size={size} />
        <span className="media-thumb-hint" aria-hidden="true">
          {pinned ? "×" : "⤢"}
        </span>
      </button>
      {preview}
    </div>
  );
}
