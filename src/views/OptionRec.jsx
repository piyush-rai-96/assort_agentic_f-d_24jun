/**
 * Option Recommendation — standalone screen
 * Agent-computed option count by cluster and assortment tier.
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, Badge, Button, Input } from "impact-ui";
import {
  Target, Bot, Calculator, Layers, BookOpen,
  ArrowRight, CheckCircle2, TrendingUp, AlertTriangle,
  RefreshCw, Grid3X3, TreePine, Columns2, Mountain, Sparkles,
  Database, Check, Play, Store, BarChart3, Users,
} from "lucide-react";
import FdSelect  from "../components/FdSelect.jsx";
import Text      from "../components/Text.jsx";
import Stack     from "../components/Stack.jsx";
import { softSx, panelSx } from "../styles/panelSx.js";
import { plrCalcOptionCount } from "../utils/optionCalc.js";
import { FD_CLUST_SCENARIOS, CLUSTER_ACCEPTANCE } from "../data/clustering.js";
import { FD_PLR_CALENDAR }  from "../data/plr.js";
import { PLANS }             from "../data/workspace.js";
import "./OptionRec.css";

/* ── Constants ───────────────────────────────────────────────────────────── */
const ALL_DEPTS = ["Tile", "Wood", "Laminate & Vinyl", "Stone", "Decorative Accessories"];

const DEPT_ICON_CMP = {
  "Tile":                   Grid3X3,
  "Wood":                   TreePine,
  "Laminate & Vinyl":       Columns2,
  "Stone":                  Mountain,
  "Decorative Accessories": Sparkles,
};

const SPLIT_META = [
  { key: "national", label: "National Core",      desc: "Same SKUs across all stores",  bg: "linear-gradient(135deg,#F0FDF4,#DCFCE7)", border: "#86EFAC", num: "#166534", label_c: "#166534", pct_c: "#15803d" },
  { key: "regional", label: "Regional / Cluster", desc: "Varies by cluster behaviour",  bg: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", border: "#93C5FD", num: "#1E3A8A", label_c: "#1D4ED8", pct_c: "#2563EB" },
  { key: "store",    label: "Store Curated",       desc: "Store-level buyer picks",       bg: "linear-gradient(135deg,#FFFBEB,#FEF3C7)", border: "#FCD34D", num: "#78350F", label_c: "#B45309", pct_c: "#D97706" },
];

const TIER_COLOR = { high: "#059669", mid: "#2563EB", low: "#D97706" };
const TIER_BG    = { high: "#DCFCE7", mid: "#DBEAFE", low: "#FEF3C7" };

/* ── Agent pipeline ──────────────────────────────────────────────────────── */
const OPTION_PIPELINE = [
  { id: "data",      Icon: Database,      tone: "info",    title: "Loading prior season data",      sub: "Fetching sales units, store positions and season calendar…",    result: (c) => `Sales ${c.salesU?.toLocaleString() ?? "—"} sqft · 26 weeks · data validated` },
  { id: "ros",       Icon: Calculator,    tone: "primary", title: "Computing ROS by cluster",        sub: "Historical rates-of-sale per cluster from prior season…",         result: (c) => `ROS ${c.ros} computed · Scenario ${c.scenario}` },
  { id: "positions", Icon: Store,         tone: "info",    title: "Applying store positions",        sub: "Mapping cluster positions to network store footprints…",           result: (c) => `${c.positions} store positions across ${c.clusterCount} clusters` },
  { id: "calc",      Icon: Bot,           tone: "primary", title: "Calculating option counts",       sub: "Options = Sales U ÷ (Weeks × Positions × ROS)…",                  result: (c) => `${c.total} total options · split into 3 tiers` },
  { id: "ready",     Icon: CheckCircle2,  tone: "success", title: "Results ready for review",        sub: "Distributing options to National, Regional and Store tiers…",     result: (c) => `Nat ${c.national} · Cluster ${c.regional} · Store ${c.store}` },
];

const STEP_DURATION_MS = 1500;
const TOTAL_STEPS = OPTION_PIPELINE.length;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function getActivePlrRef(dept) {
  const calRow = FD_PLR_CALENDAR.find((p) => p.dept === dept && p.status === "Open");
  if (!calRow) return null;
  const plan = PLANS.find((p) => p.plrCalId === calRow.id);
  return { calRow, plan };
}

/* ── Context panel (no formula card) ─────────────────────────────────────── */
function ContextPanel({ dept, clustScenario, optionCalc }) {
  const ref = getActivePlrRef(dept);
  const sc  = FD_CLUST_SCENARIOS[clustScenario];
  const accKey = CLUSTER_ACCEPTANCE.acceptedScenario;
  const DeptIconCmp = DEPT_ICON_CMP[dept] || Target;

  return (
    <div className="or-context-panel">

      {/* Active PLR */}
      <Card sx={{ ...softSx, padding: "var(--sp-4)" }}>
        <div className="or-ctx-header">
          <BookOpen size={12} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
          <Text variant="micro" tone="primary" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Active PLR</Text>
        </div>
        {ref ? (
          <>
            <Text variant="caption" tone="strong" style={{ fontWeight: 700, display: "block", marginBottom: 4 }}>{ref.calRow.name}</Text>
            <Text variant="micro" tone="muted" style={{ display: "block", marginBottom: "var(--sp-2)" }}>
              Pres: {ref.calRow.presDate} · Due: {ref.calRow.dueDate}
            </Text>
            <Badge variant="subtle" size="small"
              color={ref.plan?.status === "in-progress" ? "info" : ref.plan?.status === "approved" ? "success" : "neutral"}
              label={ref.plan?.status === "in-progress" ? "In progress" : ref.plan?.status === "approved" ? "Approved" : "No plan"} />
          </>
        ) : (
          <Text variant="micro" tone="muted">No open PLR for {dept}</Text>
        )}
      </Card>

      {/* Cluster Scenario */}
      <Card sx={{ ...softSx, padding: "var(--sp-4)" }}>
        <div className="or-ctx-header">
          <Layers size={12} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
          <Text variant="micro" tone="primary" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Cluster Scenario</Text>
        </div>
        {sc ? (
          <>
            <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)", flexWrap: "wrap" }}>
              <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>Scenario {clustScenario}</Text>
              {clustScenario === accKey && <Badge variant="subtle" size="small" color="success" label="★ Accepted" />}
            </Stack>
            <Text variant="micro" tone="muted" style={{ display: "block", marginBottom: "var(--sp-3)" }}>
              {sc.clusters.length} clusters · composite {sc.composite}
            </Text>
            <div className="or-cluster-pills">
              {sc.clusters.map((cl) => (
                <div key={cl.id} className="or-cluster-pill-row">
                  <span className="or-cluster-dot" style={{ background: cl.color }} />
                  <Text variant="micro" tone="muted">{cl.label}</Text>
                  <Badge variant="subtle" size="small"
                    color={cl.tier === "high" ? "success" : cl.tier === "mid" ? "info" : "warning"}
                    label={cl.tier} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <Text variant="micro" tone="muted">No scenario selected</Text>
        )}
      </Card>

      {/* Department */}
      <Card sx={{ ...softSx, padding: "var(--sp-4)" }}>
        <div className="or-ctx-header">
          <DeptIconCmp size={12} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
          <Text variant="micro" tone="primary" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Department</Text>
        </div>
        <Text variant="caption" tone="strong" style={{ fontWeight: 700, display: "block", marginBottom: 2 }}>{dept}</Text>
        {optionCalc && (
          <Stack direction="row" gap={2} style={{ marginTop: "var(--sp-2)", flexWrap: "wrap" }}>
            <div className="or-ctx-stat">
              <span className="or-ctx-stat-val">{optionCalc.ros}</span>
              <span className="or-ctx-stat-lbl">ROS</span>
            </div>
            <div className="or-ctx-stat">
              <span className="or-ctx-stat-val">{optionCalc.weeks}w</span>
              <span className="or-ctx-stat-lbl">Season</span>
            </div>
            <div className="or-ctx-stat">
              <span className="or-ctx-stat-val">{optionCalc.totalPositions}</span>
              <span className="or-ctx-stat-lbl">Stores</span>
            </div>
          </Stack>
        )}
        {!optionCalc && (
          <Text variant="micro" tone="muted" style={{ marginTop: 2 }}>Selected for this recommendation</Text>
        )}
      </Card>
    </div>
  );
}

/* ── Agent run pipeline panel ─────────────────────────────────────────────── */
function AgentRunPanel({ runState, runStep, runProgress, optionCalc, clustScenario }) {
  const ctx = {
    scenario:     clustScenario,
    positions:    optionCalc?.totalPositions ?? "—",
    clusterCount: optionCalc?.clusters?.length ?? "—",
    total:        optionCalc?.total ?? "—",
    national:     optionCalc?.national ?? "—",
    regional:     optionCalc?.regional ?? "—",
    store:        optionCalc?.store ?? "—",
    ros:          optionCalc?.ros ?? "—",
    salesU:       optionCalc?.salesUPeriod,
  };

  const CONSOLE_LINES = [
    `[agent] Initialising option-count model v2.4`,
    `[data]  Loading prior season sales → ${ctx.salesU?.toLocaleString() ?? "..."} sqft`,
    `[data]  Season calendar: 26 weeks confirmed`,
    `[ros]   Computing ROS per cluster · Scenario ${clustScenario}`,
    `[pos]   Store positions lookup → ${ctx.positions} stores mapped`,
    `[calc]  Running: Sales U ÷ (Wks × Positions × ROS)`,
    `[calc]  Total options = ${ctx.total}`,
    `[split] National ${ctx.national} · Cluster ${ctx.regional} · Store ${ctx.store}`,
    `[done]  Exit 0 — results ready for review`,
  ];

  const visibleLines = runState === "done"
    ? CONSOLE_LINES
    : CONSOLE_LINES.slice(0, Math.min(runStep + 2, CONSOLE_LINES.length - 2));

  return (
    <div className={`or-agent-run${runState === "done" ? " is-complete" : ""}`}>
      <div className="or-agent-run-head">
        <div className={`or-agent-bot${runState === "done" ? " is-done" : ""}`}>
          {runState === "done" ? <CheckCircle2 size={20} strokeWidth={2} /> : <Bot size={20} strokeWidth={1.5} />}
        </div>
        <div className="or-agent-run-head-txt">
          <Text variant="subheading" tone={runState === "done" ? "success" : "primary"} style={{ fontWeight: 700 }}>
            {runState === "done"
              ? `Option recommendation ready · ${ctx.total} options for Scenario ${clustScenario}`
              : "Agent is computing option recommendation…"}
          </Text>
          <Text variant="caption" tone="muted">
            {runState === "done"
              ? `${TOTAL_STEPS}/${TOTAL_STEPS} stages complete · Nat ${ctx.national} · Cluster ${ctx.regional} · Store ${ctx.store}`
              : `Step ${Math.min(runStep + 1, TOTAL_STEPS)} of ${TOTAL_STEPS} · ${OPTION_PIPELINE[runStep]?.title ?? ""}`}
          </Text>
        </div>
        <div className="or-agent-run-pct" style={{ color: runState === "done" ? "var(--color-success,#059669)" : "var(--color-primary)" }}>
          {runProgress}%
        </div>
      </div>

      <div className="or-agent-run-bar">
        <div className={`or-agent-run-bar-fill${runState === "done" ? " is-complete" : ""}`} style={{ width: `${runProgress}%` }} />
      </div>

      <div className="or-agent-run-grid">
        <ol className="or-agent-steps">
          {OPTION_PIPELINE.map((s, i) => {
            const state = runState === "done" ? "done" : i < runStep ? "done" : i === runStep ? "active" : "queued";
            const { Icon: SIcon } = s;
            return (
              <li key={s.id} className={`or-agent-step is-${state}`}>
                <span className={`or-agent-step-ico tone-${s.tone}`}>
                  {state === "done" ? <Check size={12} strokeWidth={2.5} />
                    : state === "active" ? <span className="or-agent-spin" />
                    : <SIcon size={12} strokeWidth={1.75} />}
                </span>
                <div className="or-agent-step-body">
                  <span className="or-agent-step-title">{s.title}</span>
                  <span className="or-agent-step-sub">
                    {state === "active" ? <>{s.sub}<span className="or-agent-dots" /></>
                      : state === "done" ? s.result(ctx)
                      : "Waiting…"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className={`or-agent-console${runState === "done" ? " is-complete" : ""}`}>
          <div className="or-agent-console-bar">
            <span className="or-agent-dot or-dot-r" /><span className="or-agent-dot or-dot-y" />
            <span className={`or-agent-dot or-dot-g${runState === "done" ? " is-pulse" : ""}`} />
            <span className="or-agent-console-title">option-agent · trace{runState === "done" ? " · complete" : ""}</span>
            {runState === "done" && <span className="or-agent-console-badge">exit 0</span>}
          </div>
          <div className="or-agent-console-body">
            {visibleLines.map((ln, i) => (
              <div key={i} className={`or-agent-log${ln.startsWith("[done]") || ln.includes("Exit 0") ? " or-agent-log-success" : ln.startsWith("[agent]") ? " or-agent-log-muted" : ""}`}>
                <span className="or-agent-log-prompt">$</span><span>{ln}</span>
              </div>
            ))}
            {runState !== "done" && (
              <div className="or-agent-log or-agent-log-muted">
                <span className="or-agent-log-prompt">$</span><span className="or-agent-cursor" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hero card ────────────────────────────────────────────────────────────── */
function HeroCard({ optionCalc, dept, clustScenario, onRerun }) {
  const { total, national, regional, store, ros, weeks, totalPositions, salesUPeriod } = optionCalc;
  const natPct = Math.round((national / total) * 100);
  const regPct = Math.round((regional / total) * 100);
  const stoPct = 100 - natPct - regPct;

  return (
    <div className="or-hero-card">
      {/* Left: big number */}
      <div className="or-hero-main">
        <div className="or-hero-kpi-row">
          <div className="or-hero-kpi-block">
            <div className="or-hero-num">{total}</div>
            <div className="or-hero-lbl">Total Options</div>
          </div>
          <div className="or-hero-divider" />
          <div className="or-hero-meta-grid">
            <div className="or-hero-meta-item">
              <span className="or-hero-meta-val">{ros}</span>
              <span className="or-hero-meta-lbl">ROS</span>
            </div>
            <div className="or-hero-meta-item">
              <span className="or-hero-meta-val">{weeks}w</span>
              <span className="or-hero-meta-lbl">Season</span>
            </div>
            <div className="or-hero-meta-item">
              <span className="or-hero-meta-val">{totalPositions}</span>
              <span className="or-hero-meta-lbl">Stores</span>
            </div>
            <div className="or-hero-meta-item">
              <span className="or-hero-meta-val">{(salesUPeriod / 1000).toFixed(0)}k</span>
              <span className="or-hero-meta-lbl">sqft sales</span>
            </div>
          </div>
        </div>

        {/* Proportional bar */}
        <div className="or-hero-bar-wrap">
          <div className="or-hero-bar">
            <div className="or-hero-bar-seg or-bar-nat" style={{ flex: natPct }} title={`National ${natPct}%`} />
            <div className="or-hero-bar-seg or-bar-reg" style={{ flex: regPct }} title={`Regional ${regPct}%`} />
            <div className="or-hero-bar-seg or-bar-sto" style={{ flex: stoPct }} title={`Store ${stoPct}%`} />
          </div>
          <div className="or-hero-bar-legend">
            <span className="or-legend-dot or-dot-nat" /><Text variant="micro" tone="muted">National {natPct}%</Text>
            <span className="or-legend-dot or-dot-reg" style={{ marginLeft: "var(--sp-3)" }} /><Text variant="micro" tone="muted">Regional {regPct}%</Text>
            <span className="or-legend-dot or-dot-sto" style={{ marginLeft: "var(--sp-3)" }} /><Text variant="micro" tone="muted">Store {stoPct}%</Text>
          </div>
        </div>
      </div>

      {/* Right: agent badge + actions */}
      <div className="or-hero-side">
        <div className="or-hero-agent-badge">
          <Bot size={13} style={{ color: "#059669" }} aria-hidden="true" />
          <span>Agent recommendation</span>
        </div>
        <Text variant="micro" style={{ color: "rgba(22,101,52,.7)", display: "block", lineHeight: 1.6, marginBottom: "var(--sp-3)" }}>
          {dept} · Scenario {clustScenario}
        </Text>
        <Button variant="ghost" size="small" onClick={onRerun}
          sx={{ fontSize: "var(--fs-micro)", color: "#166534", border: "1px solid #86EFAC", background: "rgba(5,150,105,.08)", gap: 4 }}>
          <RefreshCw size={11} aria-hidden="true" /> Re-run
        </Button>
      </div>
    </div>
  );
}

/* ── Split tiles ─────────────────────────────────────────────────────────── */
function SplitTiles({ optionCalc }) {
  const { total, national, regional, store } = optionCalc;
  return (
    <div className="or-split-grid">
      {SPLIT_META.map(({ key, label, desc, bg, border, num, label_c, pct_c }) => {
        const n   = key === "national" ? national : key === "regional" ? regional : store;
        const pct = Math.round((n / total) * 100);
        return (
          <div key={key} className="or-split-tile" style={{ background: bg, border: `1.5px solid ${border}` }}>
            <div className="or-split-tile-label" style={{ color: label_c }}>{label}</div>
            <div className="or-split-tile-num" style={{ color: num }}>{n}</div>
            <div className="or-split-tile-pct" style={{ color: pct_c }}>{pct}% of total</div>
            <div className="or-split-tile-bar-track">
              <div className="or-split-tile-bar-fill" style={{ width: `${pct}%`, background: label_c }} />
            </div>
            <div className="or-split-tile-desc" style={{ color: label_c, opacity: .65 }}>{desc}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Cluster breakdown table ──────────────────────────────────────────────── */
const TIER_META = {
  high: { label: "High",   bg: "#DCFCE7", c: "#166534", border: "#86EFAC" },
  mid:  { label: "Mid",    bg: "#DBEAFE", c: "#1E40AF", border: "#93C5FD" },
  low:  { label: "Low",    bg: "#FEF3C7", c: "#92400E", border: "#FCD34D" },
};

function ClusterTable({ optionCalc }) {
  const { clusters, total, totalPositions, ros, national, regional, store } = optionCalc;

  const maxOpts = Math.max(...clusters.map((c) => c.opts), 1);

  return (
    <div className="or-table-card">
      {/* Column header */}
      <div className="or-table-head">
        <div className="or-th or-th-cluster">Cluster</div>
        <div className="or-th or-th-tier">Tier</div>
        <div className="or-th or-th-num">Stores</div>
        <div className="or-th or-th-num">ROS</div>
        <div className="or-th or-th-num">Total opts</div>
        <div className="or-th or-th-nat">
          National Core
          <span className="or-th-mandatory">Mandatory</span>
        </div>
        <div className="or-th or-th-num" style={{ color: "#2563EB" }}>Cluster</div>
        <div className="or-th or-th-num" style={{ color: "#D97706" }}>Store</div>
      </div>

      {/* Cluster rows */}
      {clusters.map((cl, i) => {
        const tier = TIER_META[cl.tier] || TIER_META.mid;
        const barW = Math.round((cl.opts / maxOpts) * 100);
        return (
          <div key={cl.id} className={`or-table-row${i % 2 === 1 ? " or-row-alt" : ""}`}>
            {/* Cluster name */}
            <div className="or-td or-td-cluster">
              <span className="or-td-cluster-bar" style={{ background: cl.color }} />
              <span className="or-td-cluster-dot" style={{ background: cl.color }} />
              <span className="or-td-cluster-name">{cl.label}</span>
            </div>
            {/* Tier badge */}
            <div className="or-td or-td-tier">
              <span className="or-tier-chip" style={{ background: tier.bg, color: tier.c, border: `1px solid ${tier.border}` }}>
                {tier.label}
              </span>
            </div>
            {/* Stores */}
            <div className="or-td or-td-num or-td-muted">{cl.stores}</div>
            {/* ROS */}
            <div className="or-td or-td-num or-td-mono">{cl.ros}</div>
            {/* Total opts + bar */}
            <div className="or-td or-td-num">
              <div className="or-td-opts-wrap">
                <span className="or-td-opts-num" style={{ color: cl.color }}>{cl.opts}</span>
                <div className="or-td-opts-bar-track">
                  <div className="or-td-opts-bar-fill" style={{ width: `${barW}%`, background: cl.color }} />
                </div>
              </div>
            </div>
            {/* National Core — Mandatory */}
            <div className="or-td or-td-national">
              <span className="or-td-nat-num">{cl.national}</span>
              <span className="or-td-nat-pill">Mandatory</span>
            </div>
            {/* Cluster-specific */}
            <div className="or-td or-td-num" style={{ color: "#2563EB", fontWeight: 700 }}>{cl.regional}</div>
            {/* Store picks */}
            <div className="or-td or-td-num" style={{ color: "#D97706", fontWeight: 700 }}>{cl.store}</div>
          </div>
        );
      })}

      {/* Totals row */}
      <div className="or-table-row or-row-total">
        <div className="or-td or-td-cluster">
          <span className="or-td-cluster-bar" style={{ background: "transparent" }} />
          <span className="or-td-total-label">Network Total</span>
        </div>
        <div className="or-td or-td-tier" />
        <div className="or-td or-td-num or-td-muted">{totalPositions}</div>
        <div className="or-td or-td-num or-td-mono">{ros}</div>
        <div className="or-td or-td-num">
          <span className="or-td-opts-num" style={{ color: "var(--color-text-strong)", fontSize: "var(--fs-subheading)" }}>{total}</span>
        </div>
        <div className="or-td or-td-national">
          <span className="or-td-nat-num">{national}</span>
          <span className="or-td-nat-pill">Mandatory</span>
        </div>
        <div className="or-td or-td-num" style={{ color: "#2563EB", fontWeight: 800 }}>{regional}</div>
        <div className="or-td or-td-num" style={{ color: "#D97706", fontWeight: 800 }}>{store}</div>
      </div>
    </div>
  );
}

/* ── Working Plan two-col ─────────────────────────────────────────────────── */
function WorkingPlan({ optionCalc, wpCount, onWpChange }) {
  const { total, national: agNat, regional: agReg, store: agSto, formula } = optionCalc;
  const wpVal      = parseInt(wpCount) || total;
  const isOverride = parseInt(wpCount) > 0 && parseInt(wpCount) !== total;
  const nat = Math.round(wpVal * 0.40);
  const reg = Math.round(wpVal * 0.30);
  const sto = wpVal - nat - reg;

  return (
    <div className="or-wp-section">
      <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-4)" }}>
        <TrendingUp size={15} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
        <Text variant="subheading" tone="strong" style={{ fontWeight: 700 }}>Working Plan</Text>
        {isOverride && <Badge variant="subtle" size="small" color="warning" label="Override active" />}
      </Stack>
      <div className="or-wp-grid">
        {/* Agent panel */}
        <div className="or-wp-agent">
          <div className="or-wp-agent-badge">
            <Bot size={11} style={{ marginRight: 4 }} aria-hidden="true" />
            Agent recommendation
          </div>
          <div className="or-wp-big">{total}</div>
          <div className="or-wp-agent-formula">{formula}</div>
          <div className="or-wp-split-row">
            {[{ l: "National", n: agNat, c: "#6EEDB8" }, { l: "Cluster", n: agReg, c: "#93C5FD" }, { l: "Store", n: agSto, c: "#FCD34D" }].map((t) => (
              <div key={t.l} className="or-wp-split-cell or-wp-split-cell--dark">
                <span className="or-wp-split-val" style={{ color: t.c }}>{t.n}</span>
                <span className="or-wp-split-lbl" style={{ color: t.c }}>{t.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Merchant override */}
        <div className="or-wp-merchant">
          <div className="or-wp-merchant-badge">Working plan</div>
          <div className="or-wp-input-row">
            <Input type="number" min={1} max={999} value={wpCount || ""} placeholder={String(total)}
              onChange={(e) => onWpChange(e.target.value)} fullWidth
              sx={{ fontSize: "var(--fs-heading)", fontWeight: "var(--fw-bold)" }} />
          </div>
          <div className="or-wp-hint">Enter a number to override the agent recommendation</div>
          <div className="or-wp-split-row" style={{ marginTop: "var(--sp-3)" }}>
            {[{ l: "National", n: nat, c: "#059669" }, { l: "Cluster", n: reg, c: "#2563EB" }, { l: "Store", n: sto, c: "#D97706" }].map((t) => (
              <div key={t.l} className="or-wp-split-cell or-wp-split-cell--light" style={{ background: "var(--color-surface-alt)" }}>
                <span className="or-wp-split-val" style={{ color: t.c }}>{t.n}</span>
                <span className="or-wp-split-lbl" style={{ color: t.c }}>{t.l}</span>
              </div>
            ))}
          </div>
          <Stack direction="row" align="center" gap={1} style={{ marginTop: "var(--sp-2)" }}>
            {isOverride
              ? <><AlertTriangle size={11} style={{ color: "#D97706", flexShrink: 0 }} aria-hidden="true" /><Text variant="micro" style={{ color: "#D97706" }}>Override active — agent rec was {total}</Text></>
              : <><CheckCircle2 size={11} style={{ color: "#059669", flexShrink: 0 }} aria-hidden="true" /><Text variant="micro" style={{ color: "#059669" }}>Aligned with agent recommendation</Text></>}
          </Stack>
        </div>
      </div>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function OptionRec({ onNavigate }) {
  const acceptedScenario = CLUSTER_ACCEPTANCE.acceptedScenario || "B";

  const [dept,        setDept]        = useState("Tile");
  const [clustScen,   setClustScen]   = useState(acceptedScenario);
  const [runState,    setRunState]    = useState("idle");
  const [runStep,     setRunStep]     = useState(0);
  const [runProgress, setRunProgress] = useState(0);
  const [wpCount,     setWpCount]     = useState("");
  const timerRef = useRef(null);

  const optionCalc = useMemo(
    () => runState === "done" ? plrCalcOptionCount(dept, null, clustScen) : null,
    [dept, clustScen, runState],
  );

  const startRun = useCallback(() => {
    setRunState("running");
    setRunStep(0);
    setRunProgress(0);
    setWpCount("");
    let step = 0;
    const tick = () => {
      step += 1;
      const pct = Math.round((step / TOTAL_STEPS) * 100);
      if (step < TOTAL_STEPS) {
        setRunStep(step);
        setRunProgress(pct);
        timerRef.current = setTimeout(tick, STEP_DURATION_MS);
      } else {
        setRunStep(TOTAL_STEPS - 1);
        setRunProgress(100);
        setTimeout(() => setRunState("done"), 400);
      }
    };
    timerRef.current = setTimeout(tick, STEP_DURATION_MS);
  }, []);

  const handleRun   = useCallback(() => { clearTimeout(timerRef.current); startRun(); }, [startRun]);
  const handleRerun = useCallback(() => { clearTimeout(timerRef.current); setWpCount(""); startRun(); }, [startRun]);
  const handleDept  = useCallback((d) => { clearTimeout(timerRef.current); setDept(d);     setRunState("idle"); setWpCount(""); }, []);
  const handleScen  = useCallback((k) => { clearTimeout(timerRef.current); setClustScen(k); setRunState("idle"); setWpCount(""); }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const scenarioKeys = Object.keys(FD_CLUST_SCENARIOS);

  return (
    <div className="or-root">

      {/* ── Dark header ── */}
      <div className="or-header">
        <div className="or-header-top">
          <Stack direction="row" align="center" gap={3} style={{ flex: 1, minWidth: 0 }}>
            <div className="or-header-icon-wrap">
              <Target size={20} style={{ color: "#6EEDB8" }} aria-hidden="true" />
            </div>
            <div>
              <Text variant="title" style={{ color: "#fff", fontWeight: 800, display: "block", lineHeight: 1.2 }}>
                Option Recommendation
              </Text>
              <Text variant="micro" style={{ color: "rgba(255,255,255,.45)", marginTop: 2, display: "block" }}>
                Agent-computed option count by cluster and assortment tier
              </Text>
            </div>
          </Stack>
          <div className="or-dept-select-wrap">
            <FdSelect
              options={ALL_DEPTS.map((d) => ({ value: d, label: d }))}
              value={dept} onChange={handleDept} size="small"
            />
          </div>
        </div>
      </div>

      {/* ── Scenario tab bar ── */}
      <div className="or-scen-tab-bar">
        <span className="or-scen-tab-label">Cluster scenario</span>
        <div className="or-scen-tabs">
          {scenarioKeys.map((key) => {
            const sc    = FD_CLUST_SCENARIOS[key];
            const isAcc = key === acceptedScenario;
            const isSel = key === clustScen;
            const name  = sc.name.replace(/^Scenario [A-Z] — /, "");
            return (
              <button key={key} type="button"
                className={`or-scen-tab${isSel ? " or-scen-tab--active" : ""}`}
                onClick={() => handleScen(key)}>
                <span className="or-scen-tab-key">Scenario {key}{isAcc ? " ★" : ""}</span>
                <span className="or-scen-tab-name">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="or-body">

        {/* IDLE */}
        {runState === "idle" && (
          <div className="or-top-row">
            <div className="or-main-col">
              <Card sx={{ ...panelSx, flex: 1 }}>
                <div className="or-empty-state">
                  <div className="or-empty-icon">
                    <Bot size={40} strokeWidth={1.5} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
                  </div>
                  <Text variant="heading" tone="strong" style={{ display: "block", marginBottom: "var(--sp-2)" }}>
                    Agent option count recommendation
                  </Text>
                  <Text variant="body" tone="muted" style={{ display: "block", maxWidth: 440, lineHeight: 1.7, marginBottom: "var(--sp-5)" }}>
                    Based on prior season sales, rates of sale and your selected cluster scenario, the
                    agent will calculate how many options <strong>{dept}</strong> should carry this season.
                  </Text>
                  <div className="or-empty-stats">
                    {[
                      { icon: BarChart3, label: "Cluster scenario", val: `Scenario ${clustScen}` },
                      { icon: Users,     label: "Store positions",  val: `${FD_CLUST_SCENARIOS[clustScen]?.clusters?.reduce((a, c) => a + (c.stores?.length || 0), 0) ?? "—"} stores` },
                      { icon: Target,    label: "Department",       val: dept },
                    ].map(({ icon: Icon, label, val }) => (
                      <div key={label} className="or-empty-stat">
                        <Icon size={13} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
                        <div>
                          <div className="or-empty-stat-lbl">{label}</div>
                          <div className="or-empty-stat-val">{val}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button variant="primary" size="large" onClick={handleRun}
                    sx={{ marginTop: "var(--sp-6)", background: "linear-gradient(135deg,#2D6A2D,#059669)", border: "none", gap: 8 }}>
                    <Play size={16} aria-hidden="true" />
                    Run agent recommendation
                  </Button>
                </div>
              </Card>
            </div>
            <ContextPanel dept={dept} clustScenario={clustScen} optionCalc={null} />
          </div>
        )}

        {/* RUNNING / DONE */}
        {(runState === "running" || runState === "done") && (
          <>
            <AgentRunPanel
              runState={runState} runStep={runStep} runProgress={runProgress}
              optionCalc={optionCalc} clustScenario={clustScen}
            />

            {runState === "done" && optionCalc && (
              <>
                <div className="or-top-row">
                  <div className="or-main-col">
                    <HeroCard optionCalc={optionCalc} dept={dept} clustScenario={clustScen} onRerun={handleRerun} />
                    <SplitTiles optionCalc={optionCalc} />
                  </div>
                  <ContextPanel dept={dept} clustScenario={clustScen} optionCalc={optionCalc} />
                </div>

                <div className="or-section">
                  <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-3)" }}>
                    <Layers size={15} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
                    <Text variant="subheading" tone="strong" style={{ fontWeight: 700 }}>Option count by cluster</Text>
                    <Badge variant="subtle" color="neutral" size="small"
                      label={`${optionCalc.clusters.length} clusters · Scenario ${clustScen}`} />
                  </Stack>
                  <ClusterTable optionCalc={optionCalc} />
                </div>

                <div className="or-section">
                  <WorkingPlan optionCalc={optionCalc} wpCount={wpCount} onWpChange={setWpCount} />
                </div>

                <div className="or-action-bar">
                  <Stack direction="row" align="center" gap={2}>
                    <CheckCircle2 size={14} style={{ color: "var(--color-success)" }} aria-hidden="true" />
                    <Text variant="caption" tone="muted">
                      {optionCalc.total} options recommended for <strong>{dept}</strong> · Scenario {clustScen}
                    </Text>
                  </Stack>
                  <Stack direction="row" gap={3} align="center">
                    <Button variant="secondary" size="medium" onClick={() => onNavigate?.("approval")}>
                      Apply to active PLR
                    </Button>
                    <Button variant="primary" size="medium" onClick={() => onNavigate?.("national")}>
                      Continue to National Core
                      <ArrowRight size={14} style={{ marginLeft: 6 }} aria-hidden="true" />
                    </Button>
                  </Stack>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
