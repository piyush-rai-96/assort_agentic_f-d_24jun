import React, { useState, useMemo } from "react";
import { Card, Button, Badge, Input, Chips, EmptyState } from "impact-ui";
import {
  Plus, Trash2, ChevronLeft, CheckCircle2, Pencil, CalendarRange,
  Clock, CheckCheck, FolderOpen, Layers, CalendarDays, Tag,
} from "lucide-react";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import {
  ADMIN_WEEKS, ADMIN_DEPT_OPTS, ADMIN_SEASON_OPTS,
  PHASE_COLORS, DEPT_COLORS, INITIAL_ASSORT_PERIODS,
} from "../data/admin.js";
import { panelSx } from "../styles/panelSx.js";
import "./AssortmentPeriods.css";

/* ─── Constants ──────────────────────────────────────────────────────────── */
const AP_STATUS = {
  active: { label: "Active", color: "success"  },
  draft:  { label: "Draft",  color: "warning"  },
  closed: { label: "Closed", color: "default"  },
};

function wkNum(wk) { return parseInt((wk || "W01").replace("W", ""), 10); }
function totalWks(s, e) { return Math.max(1, wkNum(e) - wkNum(s) + 1); }

/* ── Phase bar ─────────────────────────────────────────────────────────────  */
function PhaseBar({ phases = [], totalWeeks = 26, size = "sm" }) {
  if (!phases.length) return null;
  const h = size === "lg" ? 20 : 10;
  return (
    <div className={`ap-phase-bar ap-phase-bar--${size}`} style={{ height: h }}>
      {phases.map((ph) => {
        const sw  = wkNum(ph.startWeek) - 1;
        const ew  = wkNum(ph.endWeek);
        const pct = Math.max(3, Math.round(((ew - sw) / totalWeeks) * 100));
        return (
          <div key={ph.id} className="ap-phase-seg"
            style={{ width: `${pct}%`, background: ph.color }}
            title={`${ph.name} · ${ph.startWeek}–${ph.endWeek}`}
          >
            {size === "lg" && pct > 10 && <span className="ap-phase-seg-lbl">{ph.name}</span>}
            {size === "sm" && pct > 14 && <span className="ap-phase-seg-lbl">{ph.name}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Week ruler (shows W01, quarter marks, end) ─────────────────────────── */
function WeekRuler({ startWeek, endWeek, totalWeeks }) {
  const sw   = wkNum(startWeek);
  const ew   = wkNum(endWeek);
  const step = totalWeeks <= 13 ? 4 : totalWeeks <= 26 ? 8 : 13;
  const marks = [];
  for (let n = sw; n <= ew; n += step) marks.push(n);
  if (marks[marks.length - 1] !== ew) marks.push(ew);

  return (
    <div className="ap-week-ruler">
      {marks.map((n) => {
        const pct = Math.round(((n - sw) / Math.max(1, ew - sw)) * 100);
        return (
          <span key={n} className="ap-week-ruler-lbl" style={{ left: `${pct}%` }}>
            W{String(n).padStart(2, "0")}
          </span>
        );
      })}
    </div>
  );
}

/* ── Field label ─────────────────────────────────────────────────────────── */
function FL({ children }) {
  return <div className="ap-field-label">{children}</div>;
}

/* ── KPI tile (inside dark header) ──────────────────────────────────────── */
function KpiTile({ value, label, color, icon: Icon, sep }) {
  return (
    <div className="ap-kpi-tile" style={{ borderRight: sep ? "1px solid rgba(255,255,255,0.08)" : "none" }}>
      <Stack direction="row" align="flex-end" gap={2} style={{ marginBottom: 4 }}>
        <div className="ap-kpi-num" style={{ color }}>{value}</div>
        {Icon && <span className="ap-kpi-icon" style={{ color, marginBottom: 3 }}><Icon size={16} /></span>}
      </Stack>
      <div className="ap-kpi-label">{label}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
export default function AssortmentPeriods() {
  const [periods, setPeriods]           = useState(INITIAL_ASSORT_PERIODS);
  const [view, setView]                 = useState("list");
  const [draft, setDraft]               = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDept, setFilterDept]     = useState("all");

  /* ── Derived metrics ──────────────────────────────────────────────────── */
  const activePds = useMemo(() => periods.filter((p) => p.status === "active").length, [periods]);
  const draftPds  = useMemo(() => periods.filter((p) => p.status === "draft").length,  [periods]);
  const closedPds = useMemo(() => periods.filter((p) => p.status === "closed").length, [periods]);
  const seasonCnt = useMemo(() => new Set(periods.map((p) => p.season)).size,           [periods]);

  const visiblePeriods = useMemo(() => periods.filter((p) => {
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterDept   !== "all" && p.dept   !== filterDept)   return false;
    return true;
  }), [periods, filterStatus, filterDept]);

  /* ── CRUD ─────────────────────────────────────────────────────────────── */
  const startCreate = () => {
    setDraft({
      id: null, dept: "Wood", season: "SS 2026",
      startWeek: "W01", endWeek: "W26",
      presDate: "", dueDate: "", status: "draft",
      phases: [
        { id: "ph1", name: "Pre-Season", startWeek: "W01", endWeek: "W04", color: "#2563EB" },
        { id: "ph2", name: "Core",       startWeek: "W05", endWeek: "W16", color: "#059669" },
        { id: "ph3", name: "Transition", startWeek: "W17", endWeek: "W20", color: "#D97706" },
        { id: "ph4", name: "Clearance",  startWeek: "W21", endWeek: "W26", color: "#DC2626" },
      ],
    });
    setView("create");
  };

  const startEdit     = (ap) => { setDraft(JSON.parse(JSON.stringify(ap))); setView("edit"); };
  const cancelForm    = () => { setView("list"); setDraft(null); };
  const deletePeriod  = (id) => setPeriods((p) => p.filter((x) => x.id !== id));

  const saveDraft = () => {
    if (!draft?.dept || !draft?.season) return;
    const toSave = { ...draft, id: draft.id || `ap-${Date.now()}` };
    setPeriods((prev) => {
      const idx = prev.findIndex((p) => p.id === toSave.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = toSave; return n; }
      return [...prev, toSave];
    });
    setView("list");
    setDraft(null);
  };

  /* ── Draft patches ────────────────────────────────────────────────────── */
  const patch = (fields) => setDraft((d) => ({ ...d, ...fields }));

  const draftTotal = draft ? totalWks(draft.startWeek, draft.endWeek) : 26;
  const weekOpts   = ADMIN_WEEKS.map((w) => ({ value: w, label: w }));

  const addPhase = () => {
    const phases = draft.phases || [];
    const col    = PHASE_COLORS[phases.length % PHASE_COLORS.length];
    patch({ phases: [...phases, { id: `ph-${Date.now()}`, name: "New Phase", startWeek: draft.startWeek || "W01", endWeek: draft.endWeek || "W26", color: col }] });
  };

  const updatePhase = (pi, field, val) => {
    const phases = [...(draft.phases || [])]; phases[pi] = { ...phases[pi], [field]: val }; patch({ phases });
  };
  const cycleColor = (pi) => {
    const phases = [...(draft.phases || [])];
    const ci = PHASE_COLORS.indexOf(phases[pi].color);
    phases[pi] = { ...phases[pi], color: PHASE_COLORS[(ci + 1) % PHASE_COLORS.length] };
    patch({ phases });
  };
  const removePhase = (pi) => {
    const phases = [...(draft.phases || [])]; phases.splice(pi, 1); patch({ phases });
  };

  /* ══════════════════════════════════════════════════════════════════════════
     LIST VIEW
  ══════════════════════════════════════════════════════════════════════════ */
  if (view === "list") {
    return (
      <Stack direction="column" gap={4}>

        {/* ── Hero header ─────────────────────────────────────────────── */}
        <div className="ap-hero">
          {/* Top row: icon + title + CTA */}
          <Stack direction="row" justify="space-between" align="center" gap={4} wrap style={{ marginBottom: "var(--sp-5)" }}>
            <Stack direction="row" align="center" gap={3}>
              <div className="ap-hero-icon"><CalendarRange size={22} /></div>
              <Stack direction="column" gap={0}>
                <div className="ap-hero-title">Assortment Periods</div>
                <div className="ap-hero-sub">Manage planning periods by department · Set week ranges and sub-season phases</div>
              </Stack>
            </Stack>
            <Button variant="primary" size="medium" onClick={startCreate}>
              <Plus size={14} style={{ marginRight: 6 }} />New Period
            </Button>
          </Stack>

          {/* KPI strip */}
          <div className="ap-kpi-strip">
            <KpiTile value={periods.length} label="Total"    color="#fff"                           icon={Layers}       sep />
            <KpiTile value={activePds}      label="Active"   color="var(--color-success)"           icon={CheckCheck}   sep />
            <KpiTile value={draftPds}       label="Draft"    color="var(--color-warning)"           icon={Clock}        sep />
            <KpiTile value={closedPds}      label="Closed"   color="rgba(255,255,255,0.45)"         icon={FolderOpen}   sep />
            <KpiTile value={seasonCnt}      label="Seasons"  color="var(--color-primary-200,#93c5fd)" icon={CalendarDays} />
          </div>
        </div>

        {/* ── Filter bar ──────────────────────────────────────────────── */}
        <div className="ap-filter-bar">
          <Stack direction="row" align="center" gap={2} wrap style={{ flex: 1 }}>
            <Text variant="micro" tone="muted" style={{ fontWeight: "var(--fw-semibold)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>Status</Text>
            {[
              { id: "all",    label: "All" },
              { id: "active", label: `Active${activePds ? ` (${activePds})` : ""}` },
              { id: "draft",  label: `Draft${draftPds  ? ` (${draftPds})`  : ""}` },
              { id: "closed", label: `Closed${closedPds? ` (${closedPds})` : ""}` },
            ].map((opt) => (
              <Chips
                key={opt.id}
                label={opt.label}
                isActive={filterStatus === opt.id}
                onClick={() => setFilterStatus(opt.id)}
              />
            ))}
            <div className="ap-filter-sep" />
            <Tag size={13} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
            <div style={{ minWidth: 190 }}>
              <FdSelect
                value={filterDept}
                options={[{ value: "all", label: "All departments" }, ...ADMIN_DEPT_OPTS.map((d) => ({ value: d, label: d }))]}
                onChange={(v) => setFilterDept(v)}
              />
            </div>
          </Stack>
          <Text variant="micro" tone="muted" style={{ whiteSpace: "nowrap", marginLeft: "auto", paddingLeft: "var(--sp-4)" }}>
            {visiblePeriods.length} of {periods.length} period{periods.length !== 1 ? "s" : ""}
          </Text>
        </div>

        {/* ── Period cards ────────────────────────────────────────────── */}
        {visiblePeriods.length === 0 ? (
          <Card sx={panelSx}>
            <div style={{ padding: "var(--sp-8) var(--sp-4)" }}>
              <EmptyState
                heading={periods.length === 0 ? "No assortment periods defined" : "No periods match your filters"}
                description={periods.length === 0
                  ? 'Click "New Period" to create your first assortment period with week ranges and sub-season phases.'
                  : "Try adjusting your department or status filters."}
                actionText={periods.length === 0 ? "New Period" : undefined}
                onActionClick={periods.length === 0 ? startCreate : undefined}
              />
            </div>
          </Card>
        ) : (
          <Stack direction="column" gap={3}>
            {visiblePeriods.map((ap) => {
              const dc = DEPT_COLORS[ap.dept] || { color: "#475569", bg: "#eef2ff" };
              const sc = AP_STATUS[ap.status] || AP_STATUS.draft;
              const tw = totalWks(ap.startWeek, ap.endWeek);
              return (
                <div key={ap.id} className="ap-card" style={{ "--dept-color": dc.color, "--dept-bg": dc.bg }}>
                  {/* Card header */}
                  <div className="ap-card-hd">
                    <div className="ap-card-hd-left">
                      <Stack direction="row" align="center" gap={2} wrap>
                        <span className="ap-dept-badge" style={{ background: dc.bg, color: dc.color }}>{ap.dept}</span>
                        <Text variant="body-strong" tone="strong" style={{ fontSize: 15 }}>{ap.season}</Text>
                        <Badge variant="subtle" size="small" color={sc.color} label={sc.label} />
                      </Stack>
                      <div className="ap-card-meta">
                        <span className="ap-meta-chip">
                          <Clock size={11} />{ap.startWeek} → {ap.endWeek}
                          <strong style={{ color: "var(--color-text-secondary)" }}> · {tw}w</strong>
                        </span>
                        {ap.presDate && <span className="ap-meta-chip"><CalendarDays size={11} />PLR <strong>{ap.presDate}</strong></span>}
                        {ap.dueDate  && <span className="ap-meta-chip">Due <strong>{ap.dueDate}</strong></span>}
                        <span className="ap-meta-chip">
                          <Layers size={11} />{(ap.phases || []).length} phase{(ap.phases || []).length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="ap-card-actions">
                      <Button variant="secondary" size="small" onClick={() => startEdit(ap)}>
                        <Pencil size={12} style={{ marginRight: 4 }} />Edit
                      </Button>
                      <button className="ap-del-btn" onClick={() => deletePeriod(ap.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Phase visualization */}
                  <div className="ap-card-body" style={{ background: `${dc.color}06` }}>
                    <div className="ap-timeline-wrap">
                      <PhaseBar phases={ap.phases || []} totalWeeks={tw} size="lg" />
                      <WeekRuler startWeek={ap.startWeek} endWeek={ap.endWeek} totalWeeks={tw} />
                    </div>
                    <div className="ap-phase-pills">
                      {(ap.phases || []).map((ph) => (
                        <span key={ph.id} className="ap-phase-pill" style={{ "--ph-color": ph.color }}>
                          <span className="ap-phase-pill-dot" style={{ background: ph.color }} />
                          {ph.name}
                          <span className="ap-phase-pill-range">{ph.startWeek}–{ph.endWeek}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </Stack>
        )}
      </Stack>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CREATE / EDIT FORM
  ══════════════════════════════════════════════════════════════════════════ */
  const isNew = view === "create";

  return (
    <Stack direction="column" gap={4}>
      {/* ── Form header ───────────────────────────────────────────────── */}
      <div className="ap-form-hd">
        <Stack direction="row" align="center" gap={3}>
          <button className="ap-back-btn" onClick={cancelForm}>
            <ChevronLeft size={15} />Back
          </button>
          <div className="ap-form-hd-divider" />
          <Stack direction="column" gap={0}>
            <div className="ap-form-hd-title">{isNew ? "New Assortment Period" : "Edit Assortment Period"}</div>
            <div className="ap-form-hd-sub">Define department, week range, PLR dates, and sub-season phases</div>
          </Stack>
        </Stack>

        {/* Inline dept preview pill */}
        {draft?.dept && DEPT_COLORS[draft.dept] && (
          <div className="ap-form-hd-preview">
            <span className="ap-form-hd-preview-dot" style={{ background: DEPT_COLORS[draft.dept].color }} />
            <span>{draft.dept} · {draft.season || "—"}</span>
            <Badge variant="subtle" size="small" color={(AP_STATUS[draft.status] || AP_STATUS.draft).color}
              label={(AP_STATUS[draft.status] || AP_STATUS.draft).label} />
          </div>
        )}
      </div>

      {/* ── Step 1: Period definition ──────────────────────────────────── */}
      <Card sx={{ ...panelSx, overflow: "visible" }}>
        <Stack direction="column" gap={4}>
          <div className="ap-step-hd">
            <div className="ap-step-num">1</div>
            <Stack direction="column" gap={0}>
              <Text variant="body-strong" tone="strong">Period definition</Text>
              <Text variant="micro" tone="subtle">Set the department, season, and lifecycle status</Text>
            </Stack>
          </div>
          <div className="ap-form-grid ap-form-grid--3">
            <div>
              <FL>Department</FL>
              <FdSelect value={draft?.dept || "Wood"} options={ADMIN_DEPT_OPTS.map((d) => ({ value: d, label: d }))} onChange={(v) => patch({ dept: v })} width="100%" />
            </div>
            <div>
              <FL>Season</FL>
              <FdSelect value={draft?.season || "SS 2026"} options={ADMIN_SEASON_OPTS.map((s) => ({ value: s, label: s }))} onChange={(v) => patch({ season: v })} width="100%" />
            </div>
            <div>
              <FL>Status</FL>
              <FdSelect
                value={draft?.status || "draft"}
                options={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "closed", label: "Closed" }]}
                onChange={(v) => patch({ status: v })} width="100%"
              />
            </div>
          </div>
        </Stack>
      </Card>

      {/* ── Step 2: Week range & PLR dates ────────────────────────────── */}
      <Card sx={{ ...panelSx, overflow: "visible" }}>
        <Stack direction="column" gap={4}>
          <div className="ap-step-hd">
            <div className="ap-step-num">2</div>
            <Stack direction="column" gap={0}>
              <Text variant="body-strong" tone="strong">Week range &amp; PLR dates</Text>
              <Text variant="micro" tone="subtle">Define the start and end weeks for this assortment period</Text>
            </Stack>
          </div>
          <div className="ap-form-grid ap-form-grid--4">
            <div>
              <FL>Start Week</FL>
              <FdSelect value={draft?.startWeek || "W01"} options={weekOpts} onChange={(v) => patch({ startWeek: v })} width="100%" />
            </div>
            <div>
              <FL>End Week</FL>
              <FdSelect value={draft?.endWeek || "W26"} options={weekOpts} onChange={(v) => patch({ endWeek: v })} width="100%" />
            </div>
            <div>
              <FL>PLR Pres Date</FL>
              <Input type="date" value={draft?.presDate || ""} onChange={(e) => patch({ presDate: e.target.value })} fullWidth />
            </div>
            <div>
              <FL>PLR Due Date</FL>
              <Input type="date" value={draft?.dueDate || ""} onChange={(e) => patch({ dueDate: e.target.value })} fullWidth />
            </div>
          </div>

          {/* Year range bar */}
          <div className="ap-year-bar-wrap">
            <div className="ap-year-bar-track">
              <div className="ap-year-bar-active" style={{
                left:  `${Math.round((wkNum(draft?.startWeek || "W01") - 1) / 52 * 100)}%`,
                width: `${Math.max(3, Math.round(draftTotal / 52 * 100))}%`,
              }} />
              {/* Quarter markers */}
              {[1, 13, 26, 39, 52].map((n) => (
                <span key={n} className="ap-year-bar-tick" style={{ left: `${Math.round((n - 1) / 52 * 100)}%` }} />
              ))}
            </div>
            <div className="ap-year-bar-labels">
              {[1, 13, 26, 39, 52].map((n) => (
                <span key={n} style={{ position: "absolute", left: `${Math.round((n - 1) / 52 * 100)}%`, transform: "translateX(-50%)" }}>
                  W{String(n).padStart(2, "0")}
                </span>
              ))}
            </div>
            <div className="ap-year-bar-stat">
              {draft?.startWeek || "W01"} → {draft?.endWeek || "W26"} ·{" "}
              <strong style={{ color: "var(--color-primary)" }}>{draftTotal} weeks</strong>
              {draft?.presDate ? ` · PLR Pres: ${draft.presDate}` : ""}
              {draft?.dueDate  ? ` · Due: ${draft.dueDate}`       : ""}
            </div>
          </div>
        </Stack>
      </Card>

      {/* ── Step 3: Sub-season phases ──────────────────────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="column" gap={4}>
          <Stack direction="row" justify="space-between" align="flex-start">
            <div className="ap-step-hd" style={{ flex: 1 }}>
              <div className="ap-step-num">3</div>
              <Stack direction="column" gap={0}>
                <Text variant="body-strong" tone="strong">Sub-season phases</Text>
                <Text variant="micro" tone="subtle">Divide the period into named phases — Pre-Season, Core, Clearance, etc.</Text>
              </Stack>
            </div>
            <Button variant="secondary" size="small" onClick={addPhase} style={{ marginTop: 2 }}>
              <Plus size={12} style={{ marginRight: 4 }} />Add Phase
            </Button>
          </Stack>

          {/* Live preview */}
          {(draft?.phases || []).length > 0 && (
            <div className="ap-phase-preview-wrap">
              <Text variant="micro" tone="muted" style={{ marginBottom: "var(--sp-2)", fontWeight: "var(--fw-semibold)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Preview
              </Text>
              <PhaseBar phases={draft?.phases || []} totalWeeks={draftTotal} size="lg" />
              <WeekRuler startWeek={draft?.startWeek || "W01"} endWeek={draft?.endWeek || "W26"} totalWeeks={draftTotal} />
            </div>
          )}

          {/* Phase rows */}
          {(draft?.phases || []).length === 0 ? (
            <div className="ap-phases-empty">
              <CalendarDays size={28} style={{ color: "var(--color-text-subtle)", marginBottom: 8 }} />
              <Text variant="caption" tone="subtle">Click "+ Add Phase" to divide this period into sub-seasons</Text>
            </div>
          ) : (
            <div>
              <div className="ap-phase-cols-hd">
                <span>Phase name</span><span>Start week</span><span>End week</span><span>Color</span><span />
              </div>
              {(draft?.phases || []).map((ph, pi) => (
                <div key={ph.id} className="ap-phase-row" style={{ borderLeftColor: ph.color }}>
                  <input
                    className="ap-phase-inp"
                    value={ph.name}
                    placeholder="Phase name"
                    onChange={(e) => updatePhase(pi, "name", e.target.value)}
                  />
                  <select className="ap-phase-sel" value={ph.startWeek} onChange={(e) => updatePhase(pi, "startWeek", e.target.value)}>
                    {ADMIN_WEEKS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <select className="ap-phase-sel" value={ph.endWeek} onChange={(e) => updatePhase(pi, "endWeek", e.target.value)}>
                    {ADMIN_WEEKS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <button className="ap-color-swatch" style={{ background: ph.color }} onClick={() => cycleColor(pi)} title="Click to cycle colour" />
                  <button className="ap-phase-del" onClick={() => removePhase(pi)} title="Remove"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </Stack>
      </Card>

      {/* ── Save / Cancel ─────────────────────────────────────────────── */}
      <Card sx={{ ...panelSx, background: "var(--color-surface-alt)" }}>
        <Stack direction="row" justify="space-between" align="center">
          <Button variant="secondary" size="medium" onClick={cancelForm}>Cancel</Button>
          <Stack direction="row" gap={2} align="center">
            {draft?.dept && DEPT_COLORS[draft.dept] && (
              <Text variant="micro" tone="muted">
                Saving: <strong style={{ color: DEPT_COLORS[draft.dept].color }}>{draft.dept}</strong> · {draft.season}
              </Text>
            )}
            <Button variant="primary" size="medium" onClick={saveDraft}>
              <CheckCircle2 size={14} style={{ marginRight: 6 }} />
              {isNew ? "Create Period" : "Save Changes"}
            </Button>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}
