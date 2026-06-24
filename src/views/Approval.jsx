import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Card, Badge, Button, Table, Chips, Input } from "impact-ui";
import {
  Cog, Package, Layers, TrendingDown, Send, Eye,
  ChevronDown, ChevronUp, ChevronRight, ArrowLeft,
  CheckCircle2, Bot, Plus, AlertTriangle, Calculator, X,
  Grid3X3, TreePine, Columns2, Mountain, Sparkles,
} from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { PLANS } from "../data/workspace.js";
import { FD_PLR_CALENDAR } from "../data/plr.js";
import { FD_CLUST_SCENARIOS, CLUSTER_ACCEPTANCE } from "../data/clustering.js";
import { FD_SKUS } from "../data/skus.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import { plrCalcOptionCount, normDept, fmtD, fmtU } from "../utils/optionCalc.js";
import { panelSx, softSx } from "../styles/panelSx.js";
import "./Approval.css";

/* ─── Active stage label helper ───────────────────────────────────────────── */
function getActiveStageLabel(plan, pipeOverrides) {
  const statuses = computeStageStatuses(plan, pipeOverrides || {});
  const idx = statuses.findIndex((s) => s === "active" || s === "blocked");
  if (idx >= 0) return STAGES[idx].label;
  if (statuses.every((s) => s === "done")) return "All stages complete";
  return null;
}

/* ─── Sim log generator ───────────────────────────────────────────────────── */
function generateSimLog(dept, optionCalc) {
  const ts  = new Date().toLocaleTimeString("en-US", { hour12: false });
  const mk  = (type, stage, msg) => ({ type, stage, ts, msg });
  const log = [
    mk("start",  0, `PLR scope submitted — ${dept} · SS 2026`),
    mk("info",   1, `Assortment period: ap-${dept.toLowerCase().replace(/[\s&]+/g, "-")}-ss26`),
    mk("info",   1, "Cluster scenario: B — Behavioral"),
    mk("info",   1, "Calculating option count recommendation"),
  ];
  if (optionCalc) {
    log.push(mk("detail", 1, `Sales U: ${Math.round(optionCalc.salesUPeriod)} sqft over ${optionCalc.weeks} weeks`));
    log.push(mk("detail", 1, `ROS: ${optionCalc.ros} sqft/SKU/wk/store across ${optionCalc.totalPositions} positions`));
    log.push(mk("result", 1, `Recommended: ${optionCalc.total} total options — National: ${optionCalc.national} · Cluster: ${optionCalc.regional} · Store: ${optionCalc.store}`));
    (optionCalc.clusters || []).forEach((cl) => {
      log.push(mk("detail", 1, `${cl.label} (${cl.stores} stores): ${cl.opts} options · ROS ${cl.ros}`));
    });
  }
  log.push(mk("done", 0, "Agent pipeline complete — all stages pre-populated"));
  return log;
}

/* ─── Stage definitions ───────────────────────────────────────────────────── */
const ALL_DEPTS  = ["Wood", "Tile", "Laminate & Vinyl", "Stone", "Decorative Accessories"];
const DEPT_ICON_CMP = { Wood: TreePine, Tile: Grid3X3, "Laminate & Vinyl": Columns2, Stone: Mountain, "Decorative Accessories": Sparkles };
const VEL_COLOR  = { A: "#059669", B: "#2563EB", C: "#D97706", D: "#DC2626" };

const STAGES = [
  {
    key: "setup", num: 1,
    label: "Hindsight & Option Planning",
    sub: "Review prior season · option count recommendation",
    Icon: Cog,
    doneFn: (p) => p.stagesCompleted.length >= 1 || p.status !== "draft",
    metrics: (p) => [
      { l: "Assort period",    v: "Defined",                                                               ok: true             },
      { l: "Cluster scenario", v: p?.clustScenario ? `Scenario ${p.clustScenario}` : "B — Behavioral",    ok: true             },
      { l: "Option count",     v: p?.optionCount ? `${p.optionCount} SKUs` : "Not set",                   ok: !!p?.optionCount },
      { l: "Options source",   v: p?.optionCalc   ? "Agent formula" : "Manual",                           ok: true             },
    ],
    agentFn: (st, p) => {
      if (st === "done") {
        if (p?.optionCount && p?.optionCalc)
          return `Agent recommends ${p.optionCount} total options — ${p.optionCalc.formula}. National: ${p.optionSplit?.national} · Cluster: ${p.optionSplit?.regional} · Store: ${p.optionSplit?.store}.`;
        return "Setup complete. Cluster B accepted, assortment period defined.";
      }
      if (st === "blocked")
        return "Assortment period or cluster scenario not yet configured — use the PLR wizard or go to Location Clustering.";
      return "Review prior season performance and run the option count recommendation below.";
    },
    actions: [
      { l: "Market Intelligence",  mod: "intel"      },
      { l: "Location Clustering",  mod: "clustering" },
    ],
  },
  {
    key: "portfolio", num: 2,
    label: "Portfolio Build & Forecast",
    sub: "New SKUs · like-item assignment · vendor forecasts",
    Icon: Package,
    doneFn: (p) => p.stagesCompleted.includes("forecast"),
    metrics: (p) => [
      { l: "New SKUs",          v: `${p.kpis.skus} in scope`,                                               ok: true },
      { l: "Approved/listed",   v: `${Math.round(p.kpis.skus * 0.7)} SKUs`,                                ok: true },
      { l: "Forecast received", v: `${Math.round(p.kpis.skus * 0.55)} / ${Math.round(p.kpis.skus * 0.7)}`, ok: true },
      { l: "Declined",          v: `${Math.round(p.kpis.skus * 0.1)} SKUs`,                                ok: true },
    ],
    agentFn: (st) => st === "done"
      ? "All new SKUs reviewed. Agent recommendations include projected performance."
      : "Review vendor submissions and assign like-item forecasts in Portfolio Build.",
    actions: [
      { l: "Portfolio Build",    mod: "portfolio" },
      { l: "Like-Item Forecast", mod: "forecast"  },
      { l: "Catalogue",          mod: "catalogue" },
    ],
  },
  {
    key: "curation", num: 3,
    label: "Assortment Curation",
    sub: "National → cluster → store three-tier cascade",
    Icon: Layers,
    doneFn: (p) => p.stagesCompleted.includes("curation"),
    metrics: (p) => [
      { l: "National decisions", v: `${p.kpis.coreCount} / ${p.kpis.skus} done`,                          ok: p.stagesCompleted.includes("national")  },
      { l: "Cluster decisions",  v: p.stagesCompleted.includes("regional") ? "All resolved" : "Pending",  ok: p.stagesCompleted.includes("regional")  },
      { l: "National OTB",       v: `$${p.kpis.coreCount * 11}k / $${Math.round(p.kpis.skus * 12)}k`,    ok: true                                    },
      { l: "Keeps",              v: `${p.kpis.coreCount} national`,                                        ok: true                                    },
    ],
    agentFn: (st, p) => st === "done"
      ? "All curation decisions finalised. Range locked for NPI planning."
      : p.stagesCompleted.includes("national")
        ? "National Core done. Complete Regional Review and Store Curation to finish this stage."
        : "Review SKU decisions in National Core, then Regional Review and Store Curation.",
    actions: [
      { l: "National Core",    mod: "national"       },
      { l: "Regional Review",  mod: "regional"       },
      { l: "Store Hub",        mod: "store-hub"      },
      { l: "Store Curation",   mod: "store-curation" },
    ],
  },
  {
    key: "mpi", num: 4,
    label: "NPI & Markdown Planning",
    sub: "Exit strategy for all dropped SKUs",
    Icon: TrendingDown,
    doneFn: (p) => p.stagesCompleted.includes("mpi"),
    metrics: (p) => [
      { l: "Dropped SKUs",      v: "3 total",                                               ok: true                              },
      { l: "Exit strategy set", v: p.stagesCompleted.includes("mpi") ? "3 / 3" : "0 / 3",  ok: p.stagesCompleted.includes("mpi") },
      { l: "On-hand value",     v: "$45k at risk",                                           ok: true                              },
      { l: "National drops",    v: "3 SKUs",                                                 ok: true                              },
    ],
    agentFn: (st) => st === "done"
      ? "All dropped SKUs have an exit strategy. Ready for final review."
      : "Set exit strategies for all dropped SKUs in NPI / Product Line Review.",
    actions: [{ l: "NPI / Product Line Review", mod: "mpi" }],
  },
  {
    key: "approval", num: 5,
    label: "Review & Publish",
    sub: "Final sign-off · lock assortment · export",
    Icon: Send,
    doneFn: (p) => p.stagesCompleted.includes("approval"),
    metrics: (p) => {
      const pub = p.stagesCompleted.includes("approval");
      return [
        { l: "Status",           v: pub ? "Published" : "Pending approval",         ok: pub  },
        { l: "Total SKUs",       v: `${p.kpis.skus} in range`,                      ok: true },
        { l: "Net range change", v: `+${Math.round(p.kpis.skus * 0.15) - 3} SKUs`,  ok: true },
        { l: "OTB committed",    v: `$${p.kpis.coreCount * 11}k`,                   ok: true },
      ];
    },
    agentFn: (st) => st === "done"
      ? "Assortment published. Decisions are now locked and committed to Oracle."
      : "All stages complete. Review the summary then publish to lock the assortment.",
    actions: [
      { l: "Publish Assortment", mod: null, onClick: "publish" },
      { l: "Oracle Export",      mod: null, onClick: "oracle"  },
    ],
  },
  {
    key: "hindsight", num: 6,
    label: "Hindsight & Feedback",
    sub: "Actuals vs plan · feed next PLR",
    Icon: Eye,
    doneFn: () => false,
    metrics: () => [
      { l: "Hindsight report", v: "Not started", ok: false },
      { l: "Variance SKUs",    v: "Pending",     ok: false },
      { l: "Feedback signals", v: "0 logged",    ok: false },
      { l: "Next PLR seed",    v: "Pending",     ok: false },
    ],
    agentFn: (st) => st === "done"
      ? "Hindsight complete. Variance signals loaded into Market Intelligence for the next cycle."
      : "Run the Hindsight report to compare actuals vs plan and flag underperformers for the next PLR.",
    actions: [
      { l: "Hindsight Report", mod: "hindsight" },
      { l: "Feedback Loop",    mod: null        },
    ],
  },
];

/* ─── Stage status computation ────────────────────────────────────────────── */
function computeStageStatuses(plan, pipeOverrides) {
  const ov = pipeOverrides[plan.id] || {};
  const statuses = [];
  STAGES.forEach((stage, idx) => {
    const prevDone = idx === 0 ? true : statuses[idx - 1] === "done";
    if (ov[stage.key] === true)  { statuses.push("done");   return; }
    if (ov[stage.key] === false) { statuses.push(prevDone ? "active" : "locked"); return; }
    if (stage.doneFn(plan))      { statuses.push("done");   return; }
    if (!prevDone)               { statuses.push("locked"); return; }
    if (idx === 0 && !plan.optionCount) { statuses.push("blocked"); return; }
    statuses.push("active");
  });
  return statuses;
}

/* ─── PLR helpers ─────────────────────────────────────────────────────────── */
const DEPT_STRIPE = {
  "Tile": "var(--color-teal)", "Wood": "var(--color-wood)",
  "Laminate & Vinyl": "var(--color-info)", "Stone": "var(--color-accent)",
  "Decorative Accessories": "var(--color-warning)",
};

function getVersions(calId, plans) { return plans.filter((p) => p.plrCalId === calId); }

function plrComputeStatus(calId, plans) {
  const vers = getVersions(calId, plans);
  if (!vers.length) return "not-started";
  if (vers.some((v) => v.status === "approved"))    return "approved";
  if (vers.some((v) => v.status === "review"))      return "review";
  if (vers.some((v) => v.status === "in-progress")) return "in-progress";
  return "draft";
}

function plrDaysUntil(presDate) {
  return Math.round((new Date(presDate) - new Date("2026-06-19")) / 86400000);
}

const STATUS_CFG = {
  "not-started": { label: "Not started", color: "neutral" },
  draft:         { label: "Draft",       color: "neutral" },
  "in-progress": { label: "In progress", color: "info"    },
  review:        { label: "Under review",color: "warning" },
  approved:      { label: "Approved",    color: "success" },
  closed:        { label: "Closed",      color: "neutral" },
};
const STAGE_BADGE = {
  done:    { color: "success", label: "Complete"    },
  active:  { color: "info",    label: "In progress" },
  blocked: { color: "error",   label: "Blocked"     },
  locked:  { color: "neutral", label: "Locked"      },
};

/* ─── Agent pipeline log panel ────────────────────────────────────────────── */
function SimLogPanel({ log, onDismiss }) {
  const typeColor = { start: "#6EEDB8", info: "#93C5FD", result: "#FCD34D", detail: "rgba(255,255,255,.45)", warn: "#FCA5A5", done: "#6EEDB8" };
  const typeIcon  = { start: "▶", info: "·", result: "✓", detail: "  ·", warn: "⚠", done: "✓✓" };
  return (
    <div className="plr-simlog-panel">
      <div className="plr-simlog-header">
        <Stack direction="row" align="center" gap={2}>
          <span className="plr-simlog-dot" />
          <Text variant="micro" style={{ fontWeight: 700, color: "#6EEDB8" }}>Agent pipeline log</Text>
        </Stack>
        <Button variant="ghost" size="small" onClick={onDismiss} aria-label="Dismiss log"
          sx={{ padding: "2px 4px", minWidth: 0, color: "rgba(255,255,255,.5)" }}>
          <X size={12} />
        </Button>
      </div>
      <div className="plr-simlog-body">
        {log.map((e, i) => (
          <div key={i} className="plr-simlog-line" style={{ color: typeColor[e.type] || "#93C5FD" }}>
            <span className="plr-simlog-ts">[{e.ts}]</span>
            {e.stage > 0 && <span className="plr-simlog-stage">S{e.stage}</span>}
            {typeIcon[e.type] || "·"} {e.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Stage 1 · Hindsight sub-tab ─────────────────────────────────────────── */
function HindsightContent({ plan, onGoToOptions }) {
  const dept = normDept(plan.dept);

  const { kpis, velData, skuRows } = useMemo(() => {
    const deptSkuSet = new Set(FD_SKUS.filter((s) => s.dept === dept).map((s) => s.sku));
    const rows = FD_ASSORTMENT.filter((r) => deptSkuSet.has(r.sku));
    const salesU = rows.reduce((a, r) => a + (r.r13Sqft || 0), 0);
    const salesD = rows.reduce((a, r) => a + (r.r13Sqft || 0) * (r.menuPrice || 0), 0);
    const onH    = rows.reduce((a, r) => a + (r.onHand || 0), 0);
    const gmD    = rows.reduce((a, r) => {
      const lc = (r.menuPrice || 0) * 0.55;
      return a + (r.r13Sqft || 0) * ((r.menuPrice || 0) - lc);
    }, 0);
    const gmPct    = salesD > 0 ? Math.round(gmD / salesD * 100 * 10) / 10 : 0;
    const sellThru = salesU > 0 ? Math.round(salesU / (salesU + onH) * 100 * 10) / 10 : 0;
    const uSku     = new Set(rows.map((r) => r.sku)).size;
    const uSto     = new Set(rows.map((r) => r.storeId)).size;
    const ros      = uSku > 0 && uSto > 0 ? salesU / (13 * uSku * uSto) : 0;

    const velT = { A: 0, B: 0, C: 0, D: 0 };
    rows.forEach((r) => { if (velT[r.velocity] !== undefined) velT[r.velocity] += (r.r13Sqft || 0); });
    const velSum = Object.values(velT).reduce((a, v) => a + v, 0) || 1;

    const bySkuMap = {};
    rows.forEach((r) => {
      if (!bySkuMap[r.sku]) bySkuMap[r.sku] = { su: 0, sd: 0, gmD: 0, oh: 0, stores: new Set() };
      const b = bySkuMap[r.sku];
      b.su += (r.r13Sqft || 0);
      b.sd += (r.r13Sqft || 0) * (r.menuPrice || 0);
      b.gmD += (r.r13Sqft || 0) * ((r.menuPrice || 0) - (r.menuPrice || 0) * 0.55);
      b.oh += (r.onHand || 0);
      b.stores.add(r.storeId);
    });
    const sr = FD_SKUS.filter((s) => deptSkuSet.has(s.sku)).map((s) => {
      const b = bySkuMap[s.sku] || { su: 0, sd: 0, gmD: 0, oh: 0, stores: new Set() };
      const gmP = b.sd > 0 ? Math.round(b.gmD / b.sd * 100) : 0;
      const st  = b.su + b.oh > 0 ? Math.round(b.su / (b.su + b.oh) * 100 * 10) / 10 : 0;
      const stC = b.stores.size;
      return { id: s.sku, sku: String(s.sku), desc: s.desc, subDept: s.subDept, su: Math.round(b.su), sd: Math.round(b.sd), gmP, st, ros: stC > 0 ? parseFloat((b.su / (13 * stC)).toFixed(2)) : 0, stores: stC };
    }).sort((a, b) => b.su - a.su);

    return {
      kpis: [
        { l: "SALES U",    v: fmtU(salesU),           c: "var(--color-text-strong)",                                sub: "Sqft R13" },
        { l: "SALES $",    v: fmtD(salesD),            c: "var(--color-text-strong)",                                sub: "Revenue R13" },
        { l: "GM %",       v: `${gmPct}%`,              c: gmPct > 42 ? "var(--color-success)" : "var(--color-warning)", sub: "Gross margin" },
        { l: "SELL THRU",  v: `${sellThru}%`,           c: sellThru < 10 ? "var(--color-warning)" : sellThru < 20 ? "var(--color-info)" : "var(--color-success)", sub: "Sold/(sold+OH)" },
        { l: "ROS",        v: ros.toFixed(2),           c: "var(--color-text-strong)",                                sub: "Sqft/SKU/wk/store" },
      ],
      velData: { pcts: Object.fromEntries(["A","B","C","D"].map((v) => [v, Math.round(velT[v] / velSum * 100)])) },
      skuRows: sr,
    };
  }, [dept]);

  const skuCols = useMemo(() => [
    { field: "sku",     headerName: "SKU",       width: 100, filter: "agTextColumnFilter", cellStyle: { fontFamily: "var(--font-mono,monospace)", fontSize: "var(--fs-micro)", color: "var(--color-text-muted)", display: "flex", alignItems: "center" } },
    { field: "desc",    headerName: "Description", minWidth: 180, flex: 2, filter: "agTextColumnFilter", cellStyle: { fontWeight: "var(--fw-semibold)", display: "flex", alignItems: "center" } },
    { field: "subDept", headerName: "Sub-dept",   width: 120, filter: "agSetColumnFilter",  cellStyle: { fontSize: "var(--fs-micro)", color: "var(--color-text-muted)", display: "flex", alignItems: "center" } },
    { field: "su",      headerName: "Sales U",    width: 100, filter: "agNumberColumnFilter", cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }, valueFormatter: (p) => fmtU(p.value) },
    { field: "sd",      headerName: "Sales $",    width: 90,  filter: "agNumberColumnFilter", cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end" }, valueFormatter: (p) => fmtD(p.value) },
    { field: "gmP",     headerName: "GM%",        width: 70,  filter: "agNumberColumnFilter",
      cellStyle: (p) => ({ textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", color: p.value > 42 ? "var(--color-success)" : "var(--color-warning)", fontWeight: "var(--fw-semibold)" }),
      valueFormatter: (p) => `${p.value}%` },
    { field: "st",      headerName: "Sell thru",  width: 90,  filter: "agNumberColumnFilter",
      cellStyle: (p) => ({ textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", color: p.value < 10 ? "var(--color-warning)" : "var(--color-text)" }),
      valueFormatter: (p) => `${p.value}%` },
    { field: "ros",     headerName: "ROS",         width: 70,  filter: "agNumberColumnFilter", cellStyle: { textAlign: "right", fontFamily: "var(--font-mono,monospace)", display: "flex", alignItems: "center", justifyContent: "flex-end" } },
    { field: "stores",  headerName: "Stores",      width: 70,  filter: "agNumberColumnFilter", cellStyle: { textAlign: "right", color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "flex-end" } },
  ], []);

  return (
    <div className="plr-s1-content">
      {/* 5-up KPI tiles */}
      <div className="plr-hs-kpi-grid">
        {kpis.map((k) => (
          <div key={k.l} className="plr-hs-kpi-tile">
            <div className="plr-hs-kpi-lbl">{k.l}</div>
            <div className="plr-hs-kpi-val" style={{ color: k.c }}>{k.v}</div>
            <div className="plr-hs-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Velocity contribution bar */}
      <div className="plr-vel-section">
        <Text variant="micro" tone="muted" style={{ fontWeight: 600, marginBottom: "var(--sp-2)", display: "block" }}>
          Sales contribution by store velocity
        </Text>
        <div className="plr-vel-bar">
          {["A","B","C","D"].map((v) => {
            const pct = velData.pcts[v] || 0;
            if (!pct) return null;
            return (
              <div key={v} className="plr-vel-seg" style={{ flex: pct, background: VEL_COLOR[v] }}>
                {pct > 8 && <span className="plr-vel-seg-pct">{pct}%</span>}
              </div>
            );
          })}
        </div>
        <div className="plr-vel-legend">
          {["A","B","C","D"].map((v) => (
            <span key={v} className="plr-vel-leg-item">
              <span className="plr-vel-dot" style={{ background: VEL_COLOR[v] }} />
              Vel {v} {velData.pcts[v]}%
            </span>
          ))}
        </div>
      </div>

      {/* SKU performance table */}
      <Text variant="micro" tone="muted" style={{ fontWeight: 600, marginBottom: "var(--sp-2)", display: "block" }}>
        SKU performance
      </Text>
      <Table
        cardContainer
        rowHeight="compact"
        tableHeader=""
        columnDefs={skuCols}
        rowData={skuRows}
        domLayout="autoHeight"
        defaultColDef={{ floatingFilter: false, resizable: true, sortable: true }}
        hideTableSetting
        hideTableActions
        pagination={false}
      />

      {/* Next step CTA */}
      <div style={{ marginTop: "var(--sp-4)", textAlign: "right" }}>
        <Button variant="primary" size="small" onClick={onGoToOptions}>
          Option Planning →
        </Button>
      </div>
    </div>
  );
}

/* ─── Stage 1 · Option Planning sub-tab ───────────────────────────────────── */
function OptionPlanningContent({ plan, onRunOptionRec, onSetWP, onGoToHindsight }) {
  const { optionCalc, optionCount, optionSplit } = plan;
  const [wpCount, setWpCount] = useState(plan.wpOptionCount || optionCount || "");

  const wpSplit = useMemo(() => {
    const n = parseInt(wpCount) || 0;
    if (!n) return null;
    const nat = Math.round(n * 0.4), reg = Math.round(n * 0.3);
    return { national: nat, regional: reg, store: n - nat - reg };
  }, [wpCount]);

  const isOverride = wpCount && parseInt(wpCount) !== optionCount;

  const clusterCols = useMemo(() => [
    {
      field: "label", headerName: "Cluster", minWidth: 160, flex: 1, filter: "agTextColumnFilter",
      cellRenderer: (p) => (
        <Stack direction="row" align="center" gap={2} style={{ height: "100%" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: p.data.color, flexShrink: 0, display: "inline-block" }} />
          <span style={{ fontWeight: "var(--fw-semibold)", fontSize: "var(--fs-micro)" }}>{p.value}</span>
        </Stack>
      ),
    },
    { field: "stores",   headerName: "Stores", width: 70,  cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "var(--fs-micro)", color: "var(--color-text-muted)" } },
    { field: "ros",      headerName: "ROS",    width: 70,  cellStyle: { textAlign: "right", fontFamily: "var(--font-mono,monospace)", display: "flex", alignItems: "center", justifyContent: "flex-end", fontSize: "var(--fs-micro)" } },
    { field: "opts",     headerName: "Agent total", width: 90, cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", fontWeight: "var(--fw-bold)" } },
    { field: "national", headerName: "National", width: 80, cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#059669", fontWeight: "var(--fw-semibold)" } },
    { field: "regional", headerName: "Cluster",  width: 80, cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#2563EB", fontWeight: "var(--fw-semibold)" } },
    { field: "store",    headerName: "Store",    width: 70, cellStyle: { textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", color: "#D97706", fontWeight: "var(--fw-semibold)" } },
  ], []);

  if (!optionCalc) {
    return (
      <div className="plr-s1-content">
        <div className="plr-opt-empty">
          <div className="plr-opt-empty-icon">🤖</div>
          <Text variant="heading" tone="strong" style={{ marginBottom: "var(--sp-2)", display: "block" }}>
            Agent option count recommendation
          </Text>
          <Text variant="caption" tone="muted" style={{ maxWidth: 400, display: "block", lineHeight: 1.6, marginBottom: "var(--sp-4)" }}>
            Based on prior season sales, ROS and your cluster scenario, the agent will calculate
            how many options the department should carry this season.
          </Text>
          <div className="plr-opt-formula-box">
            Options = Sales U / (Weeks × Positions × ROS)
          </div>
          <Button variant="primary" size="medium" onClick={onRunOptionRec} style={{ marginTop: "var(--sp-5)" }}>
            <Calculator size={14} style={{ marginRight: 6 }} aria-hidden="true" />
            Run option recommendation
          </Button>
        </div>
        <div style={{ marginTop: "var(--sp-4)" }}>
          <Button variant="ghost" size="small" onClick={onGoToHindsight}>← Back to Hindsight</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="plr-s1-content">
      {/* ── Two-col: Agent rec (dark) + Working Plan (light) ── */}
      <div className="plr-wp-grid">
        {/* Agent recommendation panel */}
        <div className="plr-wp-agent">
          <div className="plr-wp-agent-label">Agent recommendation</div>
          <div className="plr-wp-big-num">{optionCount}</div>
          <div className="plr-wp-formula">{optionCalc.formula}</div>
          <div className="plr-wp-split">
            {[
              { l: "Nat",     n: optionSplit?.national, c: "#6EEDB8" },
              { l: "Cluster", n: optionSplit?.regional, c: "#93C5FD" },
              { l: "Store",   n: optionSplit?.store,    c: "#FCD34D" },
            ].map((t) => (
              <div key={t.l} className="plr-wp-split-tile" style={{ borderColor: "rgba(255,255,255,.08)" }}>
                <span className="plr-wp-split-lbl" style={{ color: t.c }}>{t.l}</span>
                <span className="plr-wp-split-val" style={{ color: t.c }}>{t.n ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Working Plan editable panel */}
        <div className="plr-wp-merchant">
          <div className="plr-wp-merchant-label">Working plan</div>
          <div className="plr-wp-edit-row">
            <Input
              type="number"
              min={1} max={500}
              value={wpCount}
              onChange={(e) => {
                setWpCount(e.target.value);
                onSetWP(plan.id, parseInt(e.target.value) || null);
              }}
              fullWidth
              sx={{ fontSize: "var(--fs-heading)", fontWeight: "var(--fw-bold)" }}
            />
          </div>
          <div className="plr-wp-edit-hint">Edit to override agent recommendation</div>
          <div className="plr-wp-split" style={{ marginTop: "var(--sp-3)" }}>
            {[
              { l: "Nat",     n: wpSplit?.national ?? optionSplit?.national, c: "#059669" },
              { l: "Cluster", n: wpSplit?.regional ?? optionSplit?.regional, c: "#2563EB" },
              { l: "Store",   n: wpSplit?.store    ?? optionSplit?.store,    c: "#D97706" },
            ].map((t) => (
              <div key={t.l} className="plr-wp-split-tile" style={{ background: "var(--color-surface-alt)" }}>
                <span className="plr-wp-split-lbl" style={{ color: t.c }}>{t.l}</span>
                <span className="plr-wp-split-val" style={{ color: t.c }}>{t.n ?? "—"}</span>
              </div>
            ))}
          </div>
          {isOverride
            ? <Text variant="micro" style={{ color: "#D97706", marginTop: "var(--sp-2)", display: "block" }}>
                ⚠ Overridden — agent rec: {optionCount}
              </Text>
            : <Text variant="micro" style={{ color: "#059669", marginTop: "var(--sp-2)", display: "block" }}>
                ✓ Using agent recommendation
              </Text>
          }
        </div>
      </div>

      {/* ── Per-cluster option breakdown table ── */}
      {optionCalc.clusters?.length > 0 && (
        <>
          <Text variant="caption" tone="strong" style={{ fontWeight: 700, display: "block", marginBottom: "var(--sp-2)" }}>
            Option count by cluster
          </Text>
          <Table
            cardContainer
            rowHeight="compact"
            tableHeader=""
            columnDefs={clusterCols}
            rowData={optionCalc.clusters}
            domLayout="autoHeight"
            defaultColDef={{ floatingFilter: false, resizable: true, sortable: true }}
            hideTableSetting
            hideTableActions
            pagination={false}
          />
        </>
      )}

      <div style={{ marginTop: "var(--sp-4)" }}>
        <Button variant="ghost" size="small" onClick={onGoToHindsight}>← Back to Hindsight</Button>
      </div>
    </div>
  );
}

/* ─── Stage Card ──────────────────────────────────────────────────────────── */
function StageCard({ stage, plan, st, isExpanded, onToggle, onNavigate, onMarkDone, onReopen, onPublish, s1SubTab, onS1SubTabChange, onRunOptionRec, onSetWP }) {
  const isDone    = st === "done";
  const isBlocked = st === "blocked";
  const isLocked  = st === "locked";
  const isActive  = st === "active";
  const badge     = STAGE_BADGE[st] || STAGE_BADGE.locked;
  const metrics   = stage.metrics(plan, st);
  const agentText = stage.agentFn(st, plan);

  const actSx = {
    fontSize: "var(--fs-xs)",
    background: isDone ? "var(--color-success-soft)" : isActive ? "var(--color-primary-soft)" : isBlocked ? "#fef2f2" : "var(--color-surface-alt)",
    border: `1px solid ${isDone ? "var(--color-success-border, #86efac)" : isActive ? "var(--color-primary-border, #93c5fd)" : isBlocked ? "#fca5a5" : "var(--color-border)"}`,
    color: isDone ? "var(--color-success)" : isActive ? "var(--color-primary)" : isBlocked ? "var(--color-error)" : "var(--color-text-muted)",
    opacity: isLocked ? 0.5 : 1,
  };

  return (
    <div className={`plr-stage-card plr-stage-card--${st}`}>
      {/* Header */}
      <div className={`plr-stage-header plr-stage-header--${st}`}
        onClick={onToggle} role="button" tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onToggle()}
        aria-expanded={isExpanded}>
        <div className="plr-stage-num">
          {isDone ? <CheckCircle2 size={11} strokeWidth={2.5} style={{ color: "#6ee7b7" }} /> : <span>{stage.num}</span>}
        </div>
        <div className="plr-stage-hd-body">
          <span className="plr-stage-label">{stage.label}</span>
          <span className="plr-stage-sub">{stage.sub}</span>
        </div>
        <Badge variant="subtle" color={badge.color} label={badge.label} size="small" />
        {isExpanded ? <ChevronUp size={13} style={{ color: "rgba(255,255,255,.4)", flexShrink: 0 }} /> : <ChevronDown size={13} style={{ color: "rgba(255,255,255,.4)", flexShrink: 0 }} />}
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="plr-stage-body">
          {/* Agent narration */}
          <div className={`plr-agent-narr plr-agent-narr--${st}`}>
            <Bot size={13} className={`plr-bot plr-bot--${st}`} />
            <Text variant="caption" style={{ lineHeight: 1.6 }}>{agentText}</Text>
          </div>

          {/* Blocker hint */}
          {isBlocked && (
            <Stack direction="row" gap={2} align="center"
              style={{ padding: "var(--sp-2) var(--sp-3)", background: "#fef2f2", borderRadius: "var(--r2)", border: "1px solid #fca5a5" }}>
              <AlertTriangle size={13} style={{ color: "var(--color-error)", flexShrink: 0 }} aria-hidden="true" />
              <Text variant="micro" tone="error">Option count not set — run the option recommendation in the tab below.</Text>
            </Stack>
          )}

          {/* Stage 1: two sub-tabs — Impact Chips */}
          {stage.num === 1 && (
            <>
              <div className="plr-s1-tab-bar">
                {[
                  { id: "hindsight", label: "1 · Hindsight" },
                  { id: "options",   label: "2 · Option Planning" },
                ].map((tab) => (
                  <Chips
                    key={tab.id}
                    label={tab.label}
                    isActive={s1SubTab === tab.id}
                    onClick={() => onS1SubTabChange(tab.id)}
                    size="small"
                  />
                ))}
              </div>

              {s1SubTab === "hindsight" && (
                <HindsightContent plan={plan} onGoToOptions={() => onS1SubTabChange("options")} />
              )}
              {s1SubTab === "options" && (
                <OptionPlanningContent
                  plan={plan}
                  onRunOptionRec={() => onRunOptionRec(plan.id)}
                  onSetWP={onSetWP}
                  onGoToHindsight={() => onS1SubTabChange("hindsight")}
                />
              )}
            </>
          )}

          {/* Stages 2–6: normal metrics grid */}
          {stage.num !== 1 && (
            <div className="plr-metric-grid">
              {metrics.map((m) => (
                <Card key={m.l} sx={{ ...softSx, padding: "var(--sp-3) var(--sp-4)", textAlign: "center" }}>
                  <div className="plr-metric-lbl">{m.l}</div>
                  <div className={`plr-metric-val${m.ok ? "" : " plr-metric-val--bad"}`}>{m.v}</div>
                </Card>
              ))}
            </div>
          )}

          {/* Actions row */}
          <div className="plr-stage-actions">
            {stage.actions.map((act) => {
              const canClick = !isLocked && (act.mod || act.onClick);
              return (
                <Button key={act.l} variant="ghost" size="small" disabled={!canClick} sx={actSx}
                  onClick={canClick ? act.onClick === "publish" ? onPublish : act.onClick === "oracle" ? () => {} : () => onNavigate?.(act.mod) : undefined}>
                  {act.l}
                </Button>
              );
            })}
            {!isLocked && (
              isDone
                ? <Button variant="ghost" size="small" onClick={onReopen}
                    sx={{ marginLeft: "auto", fontSize: "var(--fs-xs)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)", background: "transparent" }}>
                    ↩ Reopen
                  </Button>
                : (isActive || isBlocked) && (
                    <Button variant="primary" size="small" onClick={onMarkDone} sx={{ marginLeft: "auto", fontSize: "var(--fs-xs)" }}>
                      ✓ Mark complete
                    </Button>
                  )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Wizard step-bar ──────────────────────────────────────────────────────── */
function StepBar({ step, steps }) {
  return (
    <div className="plr-create-step-bar">
      {steps.map((lbl, i) => {
        const n = i + 1; const done = step > n; const active = step === n;
        return (
          <React.Fragment key={lbl}>
            {i > 0 && <div className={`plr-step-connector${step > i ? " plr-step-connector--done" : ""}`} />}
            <div className="plr-step-item">
              <div className={`plr-step-dot${done ? " done" : active ? " active" : ""}`}>
                {done ? <CheckCircle2 size={10} strokeWidth={3} /> : <span>{n}</span>}
              </div>
              <span className={`plr-step-lbl${active ? " active" : ""}`}>{lbl}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── PLR Create wizard ────────────────────────────────────────────────────── */
function PLRCreate({ plans, onBack, onConfirm }) {
  const [step,          setStep]          = useState(1);
  const [dept,          setDept]          = useState(null);
  const [selectedPlrId, setSelectedPlrId] = useState(null);
  const [clustScenario, setClustScenario] = useState(CLUSTER_ACCEPTANCE.acceptedScenario || "B");

  const deptPlrs = useMemo(() => FD_PLR_CALENDAR.filter((p) => p.dept === dept && p.status === "Open"), [dept]);
  const optionCalc = useMemo(() => {
    if (!dept || !selectedPlrId || !clustScenario) return null;
    return plrCalcOptionCount(dept, selectedPlrId, clustScenario);
  }, [dept, selectedPlrId, clustScenario]);

  const handleDeptSelect = (d) => {
    setDept(d); setSelectedPlrId(null);
    const open = FD_PLR_CALENDAR.filter((p) => p.dept === d && p.status === "Open");
    if (open.length === 1) { setSelectedPlrId(open[0].id); setStep(3); } else setStep(2);
  };

  const selectedPlr  = FD_PLR_CALENDAR.find((p) => p.id === selectedPlrId) || null;
  const scenarioKeys = Object.keys(FD_CLUST_SCENARIOS);
  const acceptedKey  = CLUSTER_ACCEPTANCE.acceptedScenario;

  return (
    <div className="plr-list-outer">
      <div className="plr-list-header">
        <Stack direction="row" align="center" gap={3}>
          <Button variant="ghost" size="small" onClick={onBack}
            sx={{ color: "rgba(255,255,255,.75)", fontSize: "var(--fs-xs)" }}>
            <ArrowLeft size={12} style={{ marginRight: 3 }} /> Back
          </Button>
          <Text variant="heading" style={{ color: "#fff", fontWeight: 700 }}>Create new PLR</Text>
        </Stack>
      </div>

      <StepBar step={step} steps={["Department", "Assortment Period", "Cluster Scenario"]} />

      <div className="plr-create-body">
        {/* Step 1 */}
        {step === 1 && (
          <div className="plr-create-section">
            <Text variant="subheading" tone="strong" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Select department</Text>
            <Text variant="caption" tone="muted" style={{ display: "block", marginBottom: "var(--sp-5)" }}>Choose the department for this PLR review cycle</Text>
            <div className="plr-create-dept-grid">
              {ALL_DEPTS.map((d) => {
                const openCount = FD_PLR_CALENDAR.filter((p) => p.dept === d && p.status === "Open").length;
                const IconCmp   = DEPT_ICON_CMP[d] || Package;
                const isSel     = dept === d;
                return (
                  <Card key={d} onClick={() => handleDeptSelect(d)}
                    sx={{ ...softSx, cursor: "pointer", padding: "var(--sp-5) var(--sp-4)", textAlign: "center",
                      border: isSel ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                      background: isSel ? "var(--color-primary-soft)" : undefined,
                      transition: "border-color .15s, box-shadow .15s",
                      ":hover": { borderColor: "var(--color-primary)", boxShadow: "0 4px 12px rgba(0,0,0,.08)" },
                    }}
                    className={`plr-dept-card${isSel ? " plr-dept-card--selected" : ""}`}
                  >
                    <div className="plr-dept-icon"><IconCmp size={28} strokeWidth={1.5} style={{ color: isSel ? "var(--color-primary)" : "var(--color-text-muted)" }} /></div>
                    <div className="plr-dept-name">{d}</div>
                    <div className="plr-dept-meta">{openCount} open PLR{openCount !== 1 ? "s" : ""}</div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="plr-create-section">
            <Text variant="subheading" tone="strong" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Select assortment period</Text>
            <Text variant="caption" tone="muted" style={{ display: "block", marginBottom: "var(--sp-5)" }}>Open PLRs for <strong>{dept}</strong></Text>
            {deptPlrs.length === 0 ? (
              <Card size="small" sx={{ ...panelSx, padding: "var(--sp-6)", textAlign: "center" }}>
                <Text variant="caption" tone="strong" style={{ display: "block", marginBottom: "var(--sp-2)" }}>No open PLRs for {dept}</Text>
                <Text variant="micro" tone="muted">All {dept} PLRs are closed or not yet scheduled.</Text>
              </Card>
            ) : (
              <div className="plr-create-period-list">
                {deptPlrs.map((plr) => {
                  const sel = selectedPlrId === plr.id;
                  const existing = getVersions(plr.id, plans).length;
                  return (
                    <Card key={plr.id} onClick={() => setSelectedPlrId(plr.id)}
                      sx={{ ...softSx, cursor: "pointer", padding: "var(--sp-4) var(--sp-5)",
                        display: "flex", flexDirection: "row", alignItems: "center", gap: "var(--sp-3)",
                        border: sel ? "2px solid var(--color-primary)" : "1.5px solid var(--color-border)",
                        background: sel ? "var(--color-primary-soft)" : undefined,
                        transition: "border-color .15s, box-shadow .15s",
                        ":hover": { borderColor: "var(--color-primary)", boxShadow: "0 4px 12px rgba(0,0,0,.08)" },
                      }}
                      className={`plr-period-card${sel ? " plr-period-card--selected" : ""}`}
                    >
                      <div style={{ flex: 1 }}>
                        <div className="plr-period-name">{plr.name}</div>
                        <div className="plr-period-meta">Pres: {plr.presDate} · Due: {plr.dueDate}{existing > 0 && ` · ${existing} version${existing > 1 ? "s" : ""} exist`}</div>
                      </div>
                      {sel && <Badge variant="subtle" size="small" color="success" label="Selected" />}
                    </Card>
                  );
                })}
              </div>
            )}
            <div className="plr-create-footer">
              <Button variant="secondary" size="small" onClick={() => setStep(1)}>← Back</Button>
              {selectedPlrId && <Button variant="primary" size="small" onClick={() => setStep(3)}>Continue →</Button>}
            </div>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && (
          <div className="plr-create-section">
            <Text variant="subheading" tone="strong" style={{ display: "block", marginBottom: "var(--sp-1)" }}>Select cluster scenario</Text>
            <Text variant="caption" tone="muted" style={{ display: "block", marginBottom: "var(--sp-5)" }}>
              Store segmentation for <strong>{dept}</strong>{selectedPlr && <> · <strong>{selectedPlr.name}</strong></>}
            </Text>
            <div className="plr-scenario-list">
              {scenarioKeys.map((key) => {
                const scen = FD_CLUST_SCENARIOS[key];
                const sel  = clustScenario === key;
                const isRec = key === acceptedKey;
                const cleanName = scen.name.replace(/^Scenario [A-Z] — /, "").replace(/^Scenario [A-Z]$/, scen.name).trim();
                return (
                  <button key={key} className={`plr-scenario-card${sel ? " plr-scenario-card--selected" : ""}`} onClick={() => setClustScenario(key)}>
                    <div className={`plr-scenario-check${sel ? " visible" : ""}`}>{sel && <CheckCircle2 size={14} strokeWidth={2.5} />}</div>
                    <div className="plr-scenario-body">
                      <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-1)", flexWrap: "wrap" }}>
                        <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>{cleanName}</Text>
                        {isRec && <Badge variant="subtle" size="small" color="success" label="★ Agent recommended" />}
                        {!isRec && scen.badge && <Badge variant="subtle" size="small" color="neutral" label={scen.badge} />}
                      </Stack>
                      <Text variant="micro" tone="muted" style={{ display: "block", marginBottom: "var(--sp-2)" }}>{scen.clusters.length} clusters · composite score: {scen.composite}</Text>
                      <div className="plr-scenario-clusters">
                        {scen.clusters.map((cl) => <span key={cl.id} className="plr-cluster-pill">{cl.label}</span>)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Agent option count box */}
            {optionCalc && (
              <div className="plr-option-box">
                <Stack direction="row" align="flex-start" gap={3}>
                  <Calculator size={15} style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text variant="caption" tone="primary" style={{ fontWeight: 700, display: "block", marginBottom: "var(--sp-1)" }}>
                      Agent recommends {optionCalc.total} total options
                    </Text>
                    <Text variant="micro" tone="muted" style={{ display: "block", marginBottom: "var(--sp-3)" }}>{optionCalc.formula}</Text>
                    <div className="plr-option-tiles">
                      {[{ l: "National", v: optionCalc.national }, { l: "Cluster", v: optionCalc.regional }, { l: "Store", v: optionCalc.store }].map((t) => (
                        <div key={t.l} className="plr-option-tile">
                          <span className="plr-option-tile-val">{t.v}</span>
                          <span className="plr-option-tile-lbl">{t.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Stack>
              </div>
            )}

            <div className="plr-create-footer">
              <Button variant="secondary" size="small" onClick={() => { if (deptPlrs.length === 1) setStep(1); else setStep(2); }}>← Back</Button>
              <Button variant="primary" size="medium" onClick={() => { if (!selectedPlrId) return; onConfirm({ plrId: selectedPlrId, clustScenario, optionCalc }); }}>
                ✓ Create PLR
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── PLR List ──────────────────────────────────────────────────────────────  */
function PLRList({ plans, pipeOverrides, onSelectPlr, onCreatePlr }) {
  const openCount = FD_PLR_CALENDAR.filter((p) => p.status === "Open").length;
  return (
    <div className="plr-list-outer">
      <div className="plr-list-header">
        <Stack direction="column" gap={0.5}>
          <Text variant="title" style={{ fontWeight: 800, color: "#fff" }}>Product Line Reviews</Text>
          <Text variant="caption" style={{ color: "rgba(255,255,255,.5)" }}>{openCount} open PLRs · Select one to begin or continue curation</Text>
        </Stack>
        <Button variant="primary" size="small" onClick={onCreatePlr}>
          <Plus size={13} style={{ marginRight: 5 }} /> Create new PLR
        </Button>
      </div>
      <div className="plr-list-body">
        {FD_PLR_CALENDAR.map((plr) => {
          const versions   = getVersions(plr.id, plans);
          const st         = plr.status === "Closed" ? "closed" : plrComputeStatus(plr.id, plans);
          const cfg        = STATUS_CFG[st] || STATUS_CFG["not-started"];
          const isClosed   = plr.status === "Closed";
          const days       = plrDaysUntil(plr.presDate);
          const overdue    = !isClosed && days < 0;
          const urgent     = !isClosed && days >= 0 && days <= 14;
          const deptColor  = DEPT_STRIPE[plr.dept] || "var(--color-border)";
          const activeVer  = versions.find((v) => v.status === "in-progress" || v.status === "review") || versions[0] || null;
          const stageLabel = activeVer ? getActiveStageLabel(activeVer, pipeOverrides) : null;
          return (
            <div key={plr.id}
              className={`plr-list-row${isClosed ? " plr-list-row--closed" : ""}`}
              onClick={isClosed ? undefined : () => onSelectPlr(plr.id)}
              role={isClosed ? undefined : "button"} tabIndex={isClosed ? undefined : 0}
              onKeyDown={isClosed ? undefined : (e) => e.key === "Enter" && onSelectPlr(plr.id)}>
              <div className="plr-dept-stripe" style={{ background: deptColor, height: 42, opacity: isClosed ? 0.3 : 1 }} />
              <div className="plr-list-main">
                <Text variant="body-strong" style={{ color: isClosed ? "var(--color-text-muted)" : "var(--color-text-strong)", textTransform: "uppercase", letterSpacing: ".3px", lineHeight: 1.3 }}>
                  {plr.name}
                </Text>
                <Stack direction="row" gap={2} align="center" style={{ marginTop: 3, flexWrap: "wrap" }}>
                  <Text variant="caption" tone="muted">{plr.dept}</Text>
                  {!isClosed && <><span className="plr-bullet">·</span><Text variant="caption" tone="muted">Pres: {plr.presDate}</Text></>}
                  {stageLabel && <><span className="plr-bullet">·</span><Text variant="micro" tone="primary" style={{ fontWeight: 600 }}>{stageLabel}</Text></>}
                </Stack>
              </div>
              {versions.length > 0 && (
                <div className="plr-list-stat">
                  <Text variant="body-strong" tone="strong">{versions.length}</Text>
                  <Text variant="micro" tone="muted">version{versions.length > 1 ? "s" : ""}</Text>
                </div>
              )}
              {!isClosed && (
                <div className="plr-list-stat">
                  {overdue ? (
                    <><Text variant="caption" style={{ fontWeight: 700, color: "var(--color-error)" }}>Overdue</Text><Text variant="micro" style={{ color: "var(--color-error)" }}>{Math.abs(days)}d ago</Text></>
                  ) : (
                    <><Text variant="body-strong" style={{ color: urgent ? "var(--color-warning)" : "var(--color-text-strong)" }}>{days}</Text><Text variant="micro" tone="muted">days left</Text></>
                  )}
                </div>
              )}
              <Badge variant="subtle" color={cfg.color} label={cfg.label} />
              {!isClosed && <ChevronRight size={15} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── PLR Detail ────────────────────────────────────────────────────────────  */
function PLRDetail({ plrId, plans, pipeOverrides, onBack, onNavigate, onMarkDone, onReopen, onNewVersion, onPublish, onRunOptionRec, onSetWP }) {
  const plrRow   = FD_PLR_CALENDAR.find((p) => p.id === plrId);
  const versions = getVersions(plrId, plans);
  const [versionId,     setVersionId]     = useState(() => versions[0]?.id ?? null);
  const [expandedStage, setExpandedStage] = useState(-99);
  const [s1SubTab,      setS1SubTab]      = useState("hindsight");
  const [showSimLog,    setShowSimLog]    = useState(true);

  /* Reset showSimLog whenever the active version changes so the log re-appears. */
  useEffect(() => { setShowSimLog(true); }, [versionId]);

  const activeVersion = (versionId ? versions.find((v) => v.id === versionId) : null) || versions[0] || null;
  const stageStatuses = useMemo(
    () => activeVersion ? computeStageStatuses(activeVersion, pipeOverrides) : STAGES.map(() => "locked"),
    [activeVersion, pipeOverrides],
  );
  const effectiveExpanded = expandedStage === -99
    ? (() => { const idx = stageStatuses.findIndex((s) => s === "active" || s === "blocked"); return idx >= 0 ? idx + 1 : 1; })()
    : expandedStage;

  const doneCount = stageStatuses.filter((s) => s === "done").length;
  const pct       = Math.round((doneCount / STAGES.length) * 100);

  /* Auto-derive a sim-log for existing plans that don't have one stored. */
  const derivedSimLog = useMemo(() => {
    if (activeVersion?.simLog?.length > 0) return activeVersion.simLog;
    if (!plrRow) return null;
    return generateSimLog(plrRow.dept, activeVersion?.optionCalc ?? null);
  }, [activeVersion, plrRow]);

  if (!plrRow) return null;

  return (
    <div className="plr-detail-outer">
      <div className="plr-detail-hd">
        <div className="plr-detail-hd-top">
          <Button variant="ghost" size="small" onClick={onBack}
            sx={{ color: "rgba(255,255,255,.7)", fontSize: "var(--fs-xs)", flexShrink: 0 }}>
            <ArrowLeft size={12} style={{ marginRight: 3 }} /> All PLRs
          </Button>
          <div className="plr-detail-hd-info">
            <Text variant="heading" style={{ color: "#fff", fontWeight: 700 }}>{plrRow.name}</Text>
            <Text variant="micro" style={{ color: "rgba(255,255,255,.45)", marginTop: 2 }}>
              {plrRow.dept} · Pres: {plrRow.presDate} · Due: {plrRow.dueDate}
            </Text>
          </div>
          <div className="plr-version-area">
            {versions.map((v) => {
              const on = activeVersion?.id === v.id;
              const vCfg = STATUS_CFG[v.status] || STATUS_CFG.draft;
              return (
                <div key={v.id} className={`plr-ver-tab${on ? " plr-ver-tab--on" : ""}`}
                  onClick={() => { setVersionId(v.id); setExpandedStage(-99); setS1SubTab("hindsight"); }}
                  role="button" tabIndex={0}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (() => { setVersionId(v.id); setExpandedStage(-99); setS1SubTab("hindsight"); })()}>
                  <span className="plr-ver-name">{v.name.includes("—") ? v.name.split("—").pop().trim() : v.name}</span>
                  <Badge variant="subtle" color={vCfg.color} label={vCfg.label} size="small" />
                </div>
              );
            })}
            <Button variant="ghost" size="small" onClick={() => onNewVersion(plrId)}
              sx={{ fontSize: "var(--fs-micro)", padding: "var(--sp-1) var(--sp-3)", background: "rgba(30,90,200,.18)", border: "1px solid rgba(93,160,255,.3)", color: "rgba(147,197,253,.9)" }}>
              + Version
            </Button>
          </div>
        </div>
        <div className="plr-detail-prog-row">
          <Text variant="micro" style={{ color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: ".5px", fontWeight: 700, whiteSpace: "nowrap" }}>
            Stage {doneCount} of {STAGES.length}
          </Text>
          <div className="plr-prog-track"><div className="plr-prog-fill" style={{ width: `${pct}%` }} /></div>
          <Text variant="micro" style={{ color: "rgba(255,255,255,.35)", whiteSpace: "nowrap", fontWeight: 600 }}>{pct}%</Text>
        </div>
      </div>

      {/* Agent pipeline log — shown for all PLRs (derived if not stored) */}
      {showSimLog && derivedSimLog?.length > 0 && (
        <SimLogPanel log={derivedSimLog} onDismiss={() => setShowSimLog(false)} />
      )}

      {/* Stage accordion */}
      {activeVersion ? (
        <div className="plr-stage-list">
          {STAGES.map((stage, idx) => (
            <StageCard key={stage.key} stage={stage} plan={activeVersion} st={stageStatuses[idx]}
              isExpanded={effectiveExpanded === stage.num}
              onToggle={() => setExpandedStage(effectiveExpanded === stage.num ? -1 : stage.num)}
              onNavigate={onNavigate}
              onMarkDone={() => onMarkDone(activeVersion.id, stage.key)}
              onReopen={()  => onReopen(activeVersion.id, stage.key)}
              onPublish={()  => onPublish(activeVersion.id)}
              s1SubTab={s1SubTab}
              onS1SubTabChange={setS1SubTab}
              onRunOptionRec={onRunOptionRec}
              onSetWP={onSetWP}
            />
          ))}
        </div>
      ) : (
        <div className="plr-empty-ver">
          <Stack direction="column" gap={3} align="center">
            <Text variant="body-strong" tone="muted">No plan versions yet</Text>
            <Button variant="primary" size="small" onClick={() => onNewVersion(plrId)}>+ Start plan</Button>
          </Stack>
        </div>
      )}
    </div>
  );
}

/* ─── Main export ───────────────────────────────────────────────────────────  */
export default function Approval({ onNavigate }) {
  const [view,          setView]          = useState("list");
  const [activePlrId,   setActivePlrId]   = useState(null);
  const [localPlans,    setLocalPlans]    = useState(PLANS);
  const [pipeOverrides, setPipeOverrides] = useState({});

  const handleSelectPlr = useCallback((id) => { setActivePlrId(id); setView("detail"); }, []);
  const handleBack      = useCallback(() => { setView("list"); setActivePlrId(null); }, []);
  const handleMarkDone  = useCallback((planId, key) =>
    setPipeOverrides((prev) => ({ ...prev, [planId]: { ...(prev[planId] || {}), [key]: true  } })), []);
  const handleReopen    = useCallback((planId, key) =>
    setPipeOverrides((prev) => ({ ...prev, [planId]: { ...(prev[planId] || {}), [key]: false } })), []);

  const handleRunOptionRec = useCallback((planId) => {
    setLocalPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p;
      const calc = plrCalcOptionCount(p.dept, null, p.clustScenario || CLUSTER_ACCEPTANCE.acceptedScenario);
      if (!calc) return p;
      const nat = Math.round(calc.total * 0.4), reg = Math.round(calc.total * 0.3);
      return { ...p, optionCount: calc.total, optionSplit: { national: nat, regional: reg, store: calc.total - nat - reg }, optionCalc: calc };
    }));
  }, []);

  const handleSetWP = useCallback((planId, count) => {
    setLocalPlans((prev) => prev.map((p) => {
      if (p.id !== planId) return p;
      if (!count) return { ...p, wpOptionCount: null, wpOptionSplit: null };
      const nat = Math.round(count * 0.4), reg = Math.round(count * 0.3);
      return { ...p, wpOptionCount: count, wpOptionSplit: { national: nat, regional: reg, store: count - nat - reg } };
    }));
  }, []);

  const handleCreateFromWizard = useCallback(({ plrId, clustScenario, optionCalc }) => {
    const plrRow  = FD_PLR_CALENDAR.find((p) => p.id === plrId);
    if (!plrRow) return;
    const existing = localPlans.filter((p) => p.plrCalId === plrId);
    const newId    = `p-new-${Date.now()}`;
    const optCount = optionCalc?.total ?? null;
    const optSplit = optCount ? { national: Math.round(optCount * 0.4), regional: Math.round(optCount * 0.3), store: optCount - Math.round(optCount * 0.4) - Math.round(optCount * 0.3) } : null;
    const simLog   = generateSimLog(plrRow.dept, optionCalc);
    setLocalPlans((prev) => [...prev, {
      id: newId, plrCalId: plrId,
      name: `${plrRow.dept} ${plrRow.presDate} — V${existing.length + 1}`,
      dept: plrRow.dept, season: "SS 2026", status: "draft", mode: "gated",
      confidenceThreshold: 75, activeStage: "setup", stagesCompleted: [],
      clustIds: ["B1","B2","B3","B4"], clustScenario,
      kpis: { stores: 21, skus: 18, coreCount: 6, submittedPct: 0 },
      optionCount: optCount, optionSplit: optSplit, optionCalc: optionCalc ?? null,
      wpOptionCount: null, wpOptionSplit: null,
      simLog,
      notes: "", createdBy: "You",
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      updatedAt: "just now",
    }]);
    setActivePlrId(plrId);
    setView("detail");
  }, [localPlans]);

  const handleNewVersion = useCallback((calId) => {
    const plrRow  = FD_PLR_CALENDAR.find((p) => p.id === calId);
    if (!plrRow) return;
    const existing = localPlans.filter((p) => p.plrCalId === calId);
    const newId    = `p-new-${Date.now()}`;
    setLocalPlans((prev) => [...prev, {
      id: newId, plrCalId: calId,
      name: `${plrRow.dept} ${plrRow.presDate} — V${existing.length + 1}`,
      dept: plrRow.dept, season: "SS 2026", status: "draft", mode: "gated",
      confidenceThreshold: 75, activeStage: "setup", stagesCompleted: [],
      clustIds: ["B1","B2","B3","B4"], clustScenario: CLUSTER_ACCEPTANCE.acceptedScenario,
      kpis: { stores: 21, skus: 18, coreCount: 6, submittedPct: 0 },
      optionCount: null, optionSplit: null, optionCalc: null,
      wpOptionCount: null, wpOptionSplit: null,
      simLog: generateSimLog(plrRow.dept, null),
      notes: "", createdBy: "You",
      createdAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      updatedAt: "just now",
    }]);
    setActivePlrId(calId);
    setView("detail");
  }, [localPlans]);

  const handlePublish = useCallback((planId) => {
    setLocalPlans((prev) => prev.map((p) =>
      p.id === planId ? { ...p, status: "approved", stagesCompleted: [...new Set([...p.stagesCompleted, "approval"])] } : p
    ));
    setPipeOverrides((prev) => ({ ...prev, [planId]: { ...(prev[planId] || {}), approval: true } }));
  }, []);

  if (view === "create") {
    return <PLRCreate plans={localPlans} onBack={handleBack} onConfirm={handleCreateFromWizard} />;
  }
  if (view === "detail") {
    return (
      <PLRDetail
        plrId={activePlrId} plans={localPlans} pipeOverrides={pipeOverrides}
        onBack={handleBack} onNavigate={onNavigate}
        onMarkDone={handleMarkDone} onReopen={handleReopen}
        onNewVersion={handleNewVersion} onPublish={handlePublish}
        onRunOptionRec={handleRunOptionRec} onSetWP={handleSetWP}
      />
    );
  }
  return (
    <PLRList
      plans={localPlans} pipeOverrides={pipeOverrides}
      onSelectPlr={handleSelectPlr}
      onCreatePlr={() => setView("create")}
    />
  );
}
