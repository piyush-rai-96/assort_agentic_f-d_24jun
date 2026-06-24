/**
 * Option Recommendation — standalone screen
 *
 * Agent-computed option count by cluster and assortment tier.
 * Scenario tabs appear below the dark header as a proper tab bar.
 * Agent run follows the same pipeline-animation pattern as Clustering.
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Card, Badge, Button, Table, Chips, Input } from "impact-ui";
import {
  Target, Bot, Calculator, Layers, BookOpen,
  ArrowRight, CheckCircle2, TrendingUp, AlertTriangle,
  RefreshCw, Grid3X3, TreePine, Columns2, Mountain, Sparkles,
  Database, Check, Play,
} from "lucide-react";
import FdSelect        from "../components/FdSelect.jsx";
import Text            from "../components/Text.jsx";
import Stack           from "../components/Stack.jsx";
import { softSx }      from "../styles/panelSx.js";
import { plrCalcOptionCount, fmtU } from "../utils/optionCalc.js";
import { FD_CLUST_SCENARIOS, CLUSTER_ACCEPTANCE } from "../data/clustering.js";
import { FD_PLR_CALENDAR }  from "../data/plr.js";
import { PLANS }             from "../data/workspace.js";
import { panelSx }           from "../styles/panelSx.js";
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
  { key: "national", label: "National Core",      desc: "Same SKUs across all stores",  bg: "#DCFCE7", c: "#166534" },
  { key: "regional", label: "Regional / Cluster", desc: "Varies by cluster behaviour",  bg: "#DBEAFE", c: "#1E40AF" },
  { key: "store",    label: "Store Curated",       desc: "Store-level buyer picks",       bg: "#FEF3C7", c: "#92400E" },
];

/* ── Agent pipeline steps ─────────────────────────────────────────────────── */
const OPTION_PIPELINE = [
  {
    id: "data", Icon: Database, tone: "info",
    title: "Loading prior season data",
    sub: "Fetching sales units, store positions, and season calendar…",
    result: () => "Sales 53,283 sqft · 26 weeks · data validated",
  },
  {
    id: "ros", Icon: Calculator, tone: "primary",
    title: "Computing ROS by cluster",
    sub: "Historical rates-of-sale per cluster from prior season…",
    result: (ctx) => `ROS 7.51 computed · Scenario ${ctx.scenario}`,
  },
  {
    id: "positions", Icon: Layers, tone: "info",
    title: "Applying store positions",
    sub: "Mapping cluster positions to network store footprints…",
    result: (ctx) => `${ctx.positions} store positions mapped across ${ctx.clusterCount} clusters`,
  },
  {
    id: "calc", Icon: Bot, tone: "primary",
    title: "Calculating option counts",
    sub: "Options = Sales U ÷ (Weeks × Positions × ROS)…",
    result: (ctx) => `${ctx.total} total options computed`,
  },
  {
    id: "ready", Icon: CheckCircle2, tone: "success",
    title: "Results ready for review",
    sub: "Splitting into National Core, Regional, and Store tiers…",
    result: (ctx) => `Nat ${ctx.national} · Cluster ${ctx.regional} · Store ${ctx.store} — split complete`,
  },
];

const STEP_DURATION_MS = 1600; // ms per step
const TOTAL_STEPS = OPTION_PIPELINE.length;

/* ── Helper: find the active PLR for a dept ─────────────────────────────── */
function getActivePlrRef(dept) {
  const calRow = FD_PLR_CALENDAR.find((p) => p.dept === dept && p.status === "Open");
  if (!calRow) return null;
  const plan = PLANS.find((p) => p.plrCalId === calRow.id);
  return { calRow, plan };
}

/* ── Context panel ───────────────────────────────────────────────────────── */
function ContextPanel({ dept, clustScenario, optionCalc }) {
  const ref = getActivePlrRef(dept);
  const sc  = FD_CLUST_SCENARIOS[clustScenario];
  const accKey = CLUSTER_ACCEPTANCE.acceptedScenario;
  const DeptIconCmp = DEPT_ICON_CMP[dept] || Target;

  return (
    <div className="or-context-panel">
      <Card sx={{ ...softSx, padding: "var(--sp-4)" }}>
        <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)" }}>
          <BookOpen size={13} style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-hidden="true" />
          <Text variant="micro" tone="primary" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Active PLR</Text>
        </Stack>
        {ref ? (
          <>
            <Text variant="caption" tone="strong" style={{ fontWeight: 700, display: "block", marginBottom: 3 }}>{ref.calRow.name}</Text>
            <Text variant="micro" tone="muted" style={{ display: "block" }}>Pres: {ref.calRow.presDate} · Due: {ref.calRow.dueDate}</Text>
            <div style={{ marginTop: "var(--sp-2)" }}>
              <Badge variant="subtle" size="small"
                color={ref.plan?.status === "in-progress" ? "info" : ref.plan?.status === "approved" ? "success" : "neutral"}
                label={ref.plan?.status === "in-progress" ? "In progress" : ref.plan?.status === "approved" ? "Approved" : "No plan version"} />
            </div>
          </>
        ) : (
          <Text variant="micro" tone="muted">No open PLR for {dept}</Text>
        )}
      </Card>

      <Card sx={{ ...softSx, padding: "var(--sp-4)" }}>
        <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)" }}>
          <Layers size={13} style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-hidden="true" />
          <Text variant="micro" tone="primary" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Cluster Scenario</Text>
        </Stack>
        {sc ? (
          <>
            <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)", flexWrap: "wrap" }}>
              <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>Scenario {clustScenario}</Text>
              {clustScenario === accKey && <Badge variant="subtle" size="small" color="success" label="★ Accepted" />}
            </Stack>
            <Text variant="micro" tone="muted" style={{ display: "block", marginBottom: "var(--sp-2)" }}>
              {sc.clusters.length} clusters · composite {sc.composite}
            </Text>
            <div className="or-cluster-pills">
              {sc.clusters.map((cl) => (
                <span key={cl.id} className="or-cluster-pill" style={{ borderLeftColor: cl.color }}>{cl.label}</span>
              ))}
            </div>
          </>
        ) : (
          <Text variant="micro" tone="muted">No scenario selected</Text>
        )}
      </Card>

      <Card sx={{ ...softSx, padding: "var(--sp-4)", background: "var(--color-primary-soft)", border: "1px solid var(--color-primary-border, rgba(59,130,246,.2))" }}>
        <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)" }}>
          <Calculator size={13} style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-hidden="true" />
          <Text variant="micro" tone="primary" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Formula</Text>
        </Stack>
        <div className="or-formula-ref">Options = Sales U / (Weeks × Positions × ROS)</div>
        <Text variant="micro" tone="muted" style={{ marginTop: "var(--sp-2)", display: "block", lineHeight: 1.6 }}>
          26 weeks · {optionCalc ? `${optionCalc.totalPositions} store positions` : "positions from cluster scenario"} · prior season ROS
        </Text>
      </Card>

      <Card sx={{ ...softSx, padding: "var(--sp-4)" }}>
        <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-1)" }}>
          <DeptIconCmp size={13} style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-hidden="true" />
          <Text variant="micro" tone="primary" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em" }}>Department</Text>
        </Stack>
        <Text variant="caption" tone="strong" style={{ fontWeight: 700, display: "block" }}>{dept}</Text>
        <Text variant="micro" tone="muted" style={{ display: "block", marginTop: 2 }}>Selected for this recommendation</Text>
      </Card>
    </div>
  );
}

/* ── Agent run pipeline panel ─────────────────────────────────────────────── */
function AgentRunPanel({ runState, runStep, runProgress, optionCalc, clustScenario }) {
  const ctx = optionCalc ? {
    scenario:     clustScenario,
    positions:    optionCalc.totalPositions,
    clusterCount: optionCalc.clusters?.length ?? 0,
    total:        optionCalc.total,
    national:     optionCalc.national,
    regional:     optionCalc.regional,
    store:        optionCalc.store,
  } : { scenario: clustScenario, positions: "—", clusterCount: "—", total: "—", national: "—", regional: "—", store: "—" };

  const CONSOLE_LINES_RUNNING = [
    `[agent] Initialising option-count model v2.4`,
    `[data]  Loading prior season sales → 53,283 sqft`,
    `[data]  Season calendar: 26 weeks confirmed`,
    `[ros]   Computing ROS per cluster using Scenario ${clustScenario}…`,
    `[pos]   Store positions lookup → network map`,
    `[calc]  Running formula: Sales U ÷ (Wks × Pos × ROS)`,
  ];
  const CONSOLE_LINES_DONE = [
    ...CONSOLE_LINES_RUNNING,
    `[calc]  Total options = ${ctx.total}`,
    `[split] National ${ctx.national} · Cluster ${ctx.regional} · Store ${ctx.store}`,
    `[done]  Exit 0 — results ready`,
  ];

  const lines = runState === "done" ? CONSOLE_LINES_DONE : CONSOLE_LINES_RUNNING.slice(0, Math.min(runStep + 2, CONSOLE_LINES_RUNNING.length));

  return (
    <div className={`or-agent-run${runState === "done" ? " is-complete" : ""}`}>
      {/* Header */}
      <div className="or-agent-run-head">
        <div className={`or-agent-bot${runState === "done" ? " is-done" : ""}`}>
          {runState === "done"
            ? <CheckCircle2 size={20} strokeWidth={2} />
            : <Bot size={20} strokeWidth={1.5} />}
        </div>
        <div className="or-agent-run-head-txt">
          <Text variant="subheading" tone={runState === "done" ? "success" : "primary"}>
            {runState === "done"
              ? `Option recommendation ready · ${ctx.total} options for Scenario ${clustScenario}`
              : "Agent is computing option recommendation…"}
          </Text>
          <Text variant="caption" tone="muted">
            {runState === "done"
              ? `All ${TOTAL_STEPS} stages complete · ${ctx.national} National · ${ctx.regional} Cluster · ${ctx.store} Store`
              : `Step ${Math.min(runStep + 1, TOTAL_STEPS)} of ${TOTAL_STEPS} · ${OPTION_PIPELINE[runStep]?.title ?? ""}`}
          </Text>
        </div>
        <Text variant="kpi" tone={runState === "done" ? "success" : "primary"}>{runProgress}%</Text>
      </div>

      {/* Progress bar */}
      <div className="or-agent-run-bar">
        <div className={`or-agent-run-bar-fill${runState === "done" ? " is-complete" : ""}`} style={{ width: `${runProgress}%` }} />
      </div>

      {/* Steps + console */}
      <div className="or-agent-run-grid">
        <ol className="or-agent-steps">
          {OPTION_PIPELINE.map((s, i) => {
            const state = runState === "done" ? "done" : i < runStep ? "done" : i === runStep ? "active" : "queued";
            const { Icon: SIcon } = s;
            return (
              <li key={s.id} className={`or-agent-step is-${state}`}>
                <span className={`or-agent-step-ico tone-${s.tone}`}>
                  {state === "done"
                    ? <Check size={12} strokeWidth={2.5} />
                    : state === "active"
                      ? <span className="or-agent-spin" />
                      : <SIcon size={12} strokeWidth={1.75} />}
                </span>
                <div className="or-agent-step-body">
                  <span className="or-agent-step-title">{s.title}</span>
                  <span className="or-agent-step-sub">
                    {state === "active"
                      ? <>{s.sub}<span className="or-agent-dots" /></>
                      : state === "done"
                        ? s.result(ctx)
                        : "Waiting…"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>

        <div className={`or-agent-console${runState === "done" ? " is-complete" : ""}`}>
          <div className="or-agent-console-bar">
            <span className="or-agent-dot or-dot-r" />
            <span className="or-agent-dot or-dot-y" />
            <span className={`or-agent-dot or-dot-g${runState === "done" ? " is-pulse" : ""}`} />
            <span className="or-agent-console-title">option-agent · trace{runState === "done" ? " · complete" : ""}</span>
            {runState === "done" && <span className="or-agent-console-badge">exit 0</span>}
          </div>
          <div className="or-agent-console-body">
            {lines.map((ln, i) => (
              <div key={i} className={`or-agent-log${ln.startsWith("[done]") || ln.startsWith("[calc]  Total") ? " or-agent-log-success" : ln.startsWith("[agent]") ? " or-agent-log-muted" : ""}`}>
                <span className="or-agent-log-prompt">$</span>
                <span>{ln}</span>
              </div>
            ))}
            {runState !== "done" && (
              <div className="or-agent-log or-agent-log-muted">
                <span className="or-agent-log-prompt">$</span>
                <span className="or-agent-cursor" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Hero result card ─────────────────────────────────────────────────────── */
function HeroCard({ optionCalc, onRerun }) {
  const { total, formula, ros, weeks, totalPositions } = optionCalc;
  return (
    <div className="or-hero-card">
      <div className="or-hero-left">
        <div className="or-hero-num">{total}</div>
        <div className="or-hero-sublbl">total options</div>
      </div>
      <div className="or-hero-right">
        <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)" }}>
          <Bot size={13} style={{ color: "#059669", flexShrink: 0 }} aria-hidden="true" />
          <Text variant="micro" style={{ fontWeight: 700, color: "#166534" }}>Agent recommendation</Text>
        </Stack>
        <div className="or-hero-formula">{formula}</div>
        <Stack direction="row" gap={3} style={{ marginTop: "var(--sp-2)", flexWrap: "wrap" }}>
          <Text variant="micro" style={{ color: "#166534" }}>ROS: {ros}</Text>
          <Text variant="micro" style={{ color: "#166534" }}>{weeks} weeks</Text>
          <Text variant="micro" style={{ color: "#166534" }}>{totalPositions} store positions</Text>
        </Stack>
        <div style={{ marginTop: "var(--sp-3)" }}>
          <Button variant="ghost" size="small" onClick={onRerun}
            sx={{ fontSize: "var(--fs-micro)", color: "#166534", border: "1px solid #86EFAC", background: "rgba(5,150,105,.08)" }}>
            <RefreshCw size={11} style={{ marginRight: 5 }} aria-hidden="true" /> Re-run
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── 3-tile split ─────────────────────────────────────────────────────────── */
function SplitTiles({ optionCalc }) {
  const { total, national, regional, store } = optionCalc;
  return (
    <div className="or-split-grid">
      {SPLIT_META.map(({ key, label, desc, bg, c }) => {
        const n   = key === "national" ? national : key === "regional" ? regional : store;
        const pct = Math.round((n / total) * 100);
        return (
          <div key={key} className="or-split-tile" style={{ background: bg }}>
            <div className="or-split-tile-label" style={{ color: c }}>{label}</div>
            <div className="or-split-tile-num" style={{ color: c }}>{n}</div>
            <div className="or-split-tile-pct" style={{ color: c, opacity: .75 }}>{pct}% of total</div>
            <div className="or-split-tile-desc" style={{ color: c, opacity: .6 }}>{desc}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Cluster breakdown table ──────────────────────────────────────────────── */
function ClusterTable({ optionCalc }) {
  const cols = useMemo(() => [
    {
      field: "label", headerName: "Cluster", minWidth: 170, flex: 1,
      cellRenderer: (p) => (
        <Stack direction="row" align="center" gap={2} style={{ height: "100%" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: p.data.color, flexShrink: 0, display: "inline-block" }} />
          <span style={{ fontWeight: "var(--fw-semibold)", fontSize: "var(--fs-micro)" }}>{p.value}</span>
        </Stack>
      ),
    },
    { field: "stores",   headerName: "Stores",     width: 76,  cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "var(--fs-micro)", color: "var(--color-text-muted)" } },
    { field: "ros",      headerName: "ROS",         width: 70,  cellStyle: { textAlign: "right", fontFamily: "var(--font-mono,monospace)", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "var(--fs-micro)" } },
    { field: "opts",     headerName: "Total opts",  width: 90,  cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", fontWeight: "var(--fw-bold)", fontSize: "var(--fs-micro)" },
      cellRenderer: (p) => <span style={{ color: p.data.color, fontWeight: 800 }}>{p.value}</span> },
    { field: "national", headerName: "National",    width: 82,  cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#059669", fontWeight: "var(--fw-semibold)", fontSize: "var(--fs-micro)" } },
    { field: "regional", headerName: "Cluster",     width: 76,  cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#2563EB", fontWeight: "var(--fw-semibold)", fontSize: "var(--fs-micro)" } },
    { field: "store",    headerName: "Store",       width: 68,  cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#D97706", fontWeight: "var(--fw-semibold)", fontSize: "var(--fs-micro)" } },
  ], []);

  const { clusters, total, totalPositions, ros, national, regional, store } = optionCalc;
  const totalsRow = { id: "__total__", label: "Total", color: "transparent", stores: totalPositions, ros, opts: total, national, regional, store };
  const rows = [...clusters, totalsRow];

  return (
    <Table
      cardContainer rowHeight="compact" tableHeader=""
      columnDefs={cols} rowData={rows} domLayout="autoHeight"
      defaultColDef={{ floatingFilter: false, resizable: true, sortable: true }}
      hideTableSetting hideTableActions pagination={false}
      getRowStyle={(p) => p.data.id === "__total__" ? { background: "var(--color-surface-alt)", fontWeight: 700 } : undefined}
    />
  );
}

/* ── Working Plan two-col ─────────────────────────────────────────────────── */
function WorkingPlan({ optionCalc, wpCount, onWpChange }) {
  const { total, national: agNat, regional: agReg, store: agSto, formula } = optionCalc;
  const wpVal      = parseInt(wpCount) || total;
  const isOverride = parseInt(wpCount) > 0 && parseInt(wpCount) !== total;
  const nat = Math.round(wpVal * 0.4);
  const reg = Math.round(wpVal * 0.3);
  const sto = wpVal - nat - reg;

  return (
    <div className="or-wp-section">
      <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-4)" }}>
        <TrendingUp size={15} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
        <Text variant="subheading" tone="strong" style={{ fontWeight: 700 }}>Working Plan</Text>
      </Stack>
      <div className="or-wp-grid">
        <div className="or-wp-agent">
          <div className="or-wp-agent-badge">Agent recommendation</div>
          <div className="or-wp-big">{total}</div>
          <div className="or-wp-agent-formula">{formula}</div>
          <div className="or-wp-split-row">
            {[{ l: "Nat", n: agNat, c: "#6EEDB8" }, { l: "Cluster", n: agReg, c: "#93C5FD" }, { l: "Store", n: agSto, c: "#FCD34D" }].map((t) => (
              <div key={t.l} className="or-wp-split-cell or-wp-split-cell--dark">
                <span className="or-wp-split-lbl" style={{ color: t.c }}>{t.l}</span>
                <span className="or-wp-split-val" style={{ color: t.c }}>{t.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="or-wp-merchant">
          <div className="or-wp-merchant-badge">Working plan</div>
          <div className="or-wp-input-row">
            <Input type="number" min={1} max={999} value={wpCount || ""} placeholder={String(total)}
              onChange={(e) => onWpChange(e.target.value)} fullWidth
              sx={{ fontSize: "var(--fs-heading)", fontWeight: "var(--fw-bold)" }} />
          </div>
          <div className="or-wp-hint">Edit to override agent recommendation</div>
          <div className="or-wp-split-row" style={{ marginTop: "var(--sp-3)" }}>
            {[{ l: "Nat", n: nat, c: "#059669" }, { l: "Cluster", n: reg, c: "#2563EB" }, { l: "Store", n: sto, c: "#D97706" }].map((t) => (
              <div key={t.l} className="or-wp-split-cell or-wp-split-cell--light" style={{ background: "var(--color-surface-alt)" }}>
                <span className="or-wp-split-lbl" style={{ color: t.c }}>{t.l}</span>
                <span className="or-wp-split-val" style={{ color: t.c }}>{t.n}</span>
              </div>
            ))}
          </div>
          {isOverride ? (
            <Stack direction="row" align="center" gap={1} style={{ marginTop: "var(--sp-2)" }}>
              <AlertTriangle size={11} style={{ color: "#D97706", flexShrink: 0 }} aria-hidden="true" />
              <Text variant="micro" style={{ color: "#D97706" }}>Overridden — agent rec: {total}</Text>
            </Stack>
          ) : (
            <Stack direction="row" align="center" gap={1} style={{ marginTop: "var(--sp-2)" }}>
              <CheckCircle2 size={11} style={{ color: "#059669", flexShrink: 0 }} aria-hidden="true" />
              <Text variant="micro" style={{ color: "#059669" }}>Using agent recommendation</Text>
            </Stack>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function OptionRec({ onNavigate }) {
  const acceptedScenario = CLUSTER_ACCEPTANCE.acceptedScenario || "B";

  const [dept,          setDept]          = useState("Tile");
  const [clustScenario, setClustScenario] = useState(acceptedScenario);
  const [runState,      setRunState]      = useState("idle");   // "idle" | "running" | "done"
  const [runStep,       setRunStep]       = useState(0);
  const [runProgress,   setRunProgress]   = useState(0);
  const [wpCount,       setWpCount]       = useState("");
  const timerRef = useRef(null);

  const optionCalc = useMemo(
    () => runState === "done" ? plrCalcOptionCount(dept, null, clustScenario) : null,
    [dept, clustScenario, runState],
  );

  /* Start the animated pipeline */
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
  const handleDept  = useCallback((d) => { clearTimeout(timerRef.current); setDept(d); setRunState("idle"); setWpCount(""); }, []);
  const handleScen  = useCallback((k) => { clearTimeout(timerRef.current); setClustScenario(k); setRunState("idle"); setWpCount(""); }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const scenarioKeys = Object.keys(FD_CLUST_SCENARIOS);

  return (
    <div className="or-root">
      {/* ── Dark header (title + dept selector only) ── */}
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

      {/* ── Scenario tab bar — below header, above body ── */}
      <div className="or-scen-tab-bar">
        <span className="or-scen-tab-label">Cluster scenario</span>
        <div className="or-scen-tabs">
          {scenarioKeys.map((key) => {
            const sc      = FD_CLUST_SCENARIOS[key];
            const isAcc   = key === acceptedScenario;
            const isSel   = key === clustScenario;
            const name    = sc.name.replace(/^Scenario [A-Z] — /, "");
            return (
              <button
                key={key}
                className={`or-scen-tab${isSel ? " or-scen-tab--active" : ""}`}
                onClick={() => handleScen(key)}
                type="button"
              >
                <span className="or-scen-tab-key">Scenario {key}{isAcc ? " ★" : ""}</span>
                <span className="or-scen-tab-name">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="or-body">
        {/* ── Idle: empty state ── */}
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
                  <Text variant="body" tone="muted" style={{ display: "block", maxWidth: 420, lineHeight: 1.7, marginBottom: "var(--sp-5)" }}>
                    Based on prior season sales, ROS and your selected cluster scenario, the agent will
                    calculate how many options <strong>{dept}</strong> should carry this season.
                  </Text>
                  <div className="or-formula-hero">
                    <BookOpen size={13} style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-hidden="true" />
                    <span>Options = Sales U / (Weeks × Positions × ROS)</span>
                  </div>
                  <Button variant="primary" size="large" onClick={handleRun}
                    sx={{ marginTop: "var(--sp-6)", background: "linear-gradient(135deg,#2D6A2D,#059669)", border: "none" }}>
                    <Play size={16} style={{ marginRight: 8 }} aria-hidden="true" />
                    Run agent recommendation
                  </Button>
                </div>
              </Card>
            </div>
            <ContextPanel dept={dept} clustScenario={clustScenario} optionCalc={null} />
          </div>
        )}

        {/* ── Running / Done: pipeline panel always visible ── */}
        {(runState === "running" || runState === "done") && (
          <>
            <AgentRunPanel
              runState={runState} runStep={runStep} runProgress={runProgress}
              optionCalc={optionCalc} clustScenario={clustScenario}
            />

            {/* Results appear once done */}
            {runState === "done" && optionCalc && (
              <>
                <div className="or-top-row">
                  <div className="or-main-col">
                    <HeroCard optionCalc={optionCalc} onRerun={handleRerun} />
                    <SplitTiles optionCalc={optionCalc} />
                  </div>
                  <ContextPanel dept={dept} clustScenario={clustScenario} optionCalc={optionCalc} />
                </div>

                <div className="or-section">
                  <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-3)" }}>
                    <Layers size={15} style={{ color: "var(--color-primary)" }} aria-hidden="true" />
                    <Text variant="subheading" tone="strong" style={{ fontWeight: 700 }}>Option count by cluster</Text>
                    <Badge variant="subtle" color="neutral" size="small"
                      label={`${optionCalc.clusters.length} clusters · Scenario ${clustScenario}`} />
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
                      {optionCalc.total} options recommended for <strong>{dept}</strong> · Scenario {clustScenario}
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
