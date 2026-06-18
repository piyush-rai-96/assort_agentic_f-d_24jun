import React, { useState, useMemo } from "react";
import { Card, Badge, Button, Chips } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import { AgGridReact } from "ag-grid-react";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { CATALOGUE_SKUS, nationalStats, runCatalogueAgent } from "../data/catalogue.js";
import { color } from "../styles/tokens.js";
import { panelSx } from "../styles/panelSx.js";
import { INTEL_SEED } from "../data/intel.js";
import { FD_SKUS } from "../data/skus.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import { FD_STORES } from "../data/stores.js";
import SkuSwatch from "../components/SkuSwatch.jsx";
import "./AssortmentIntelligence.css";

/* ── Score builder ───────────────────────────────────────────────────────── */
const INTEL_DELTAS = { competitive: -15, supply: -20, product: -12, market: +10, trend: +8, customer: +5 };

function buildAIScore(skuId) {
  const sku = FD_SKUS.find((s) => String(s.sku) === skuId);
  if (!sku) return null;
  const stats = nationalStats(sku);
  const r13Base = Math.min(100, Math.round(stats.carryPct + stats.avgSqft / 3));
  const forecastScore = sku.tag === "Core" ? 85 : sku.tag === "BG" ? 78 : 55 + Math.round(Math.random() * 20);
  const actioned = INTEL_SEED.filter(
    (i) => i.feedsModel && (i.status === "actioned" || i.status === "reviewed") && i.skus?.includes(String(sku.sku))
  );
  let intelDelta = 0;
  const flags = [];
  actioned.forEach((sig) => {
    intelDelta += INTEL_DELTAS[sig.type] || 0;
    if (sig.type === "supply") flags.push("supply-constrained");
    if (sig.type === "product") flags.push("quality-hold");
  });
  intelDelta = Math.max(-30, Math.min(30, intelDelta));
  const composite = Math.max(0, Math.min(100, Math.round(r13Base * 0.45 + forecastScore * 0.35 + (50 + intelDelta) * 0.2)));
  return { skuId, desc: sku.desc, dept: sku.dept, subDept: sku.subDept, price: sku.price, tag: sku.tag,
    r13Score: r13Base, forecastScore, intelDelta, composite, flags, signals: actioned,
    carryPct: Math.round(stats.carryPct), avgSqft: Math.round(stats.avgSqft) };
}

function scoreColor(v) {
  if (v >= 75) return { bg: color.successSoft, fg: color.success };
  if (v >= 55) return { bg: color.infoSoft,    fg: color.info };
  if (v >= 35) return { bg: color.warningSoft,  fg: color.warning };
  return        { bg: color.errorSoft,           fg: color.error };
}

function storeR13(skuId) {
  return FD_STORES.map((st) => {
    const row = FD_ASSORTMENT.find((r) => r.storeId === st.id && String(r.sku) === skuId);
    return { store: st.name, velocity: st.velocity, r13: row?.r13Sqft || 0 };
  }).sort((a, b) => b.r13 - a.r13).slice(0, 10);
}

/* ── Score bar ───────────────────────────────────────────────────────────── */
function ScoreBar({ label, value, fg }) {
  return (
    <div className="ai-score-bar">
      <div className="ai-score-bar-head">
        <span className="ai-score-bar-label">{label}</span>
        <span className="ai-score-bar-val" style={{ color: fg }}>{value}</span>
      </div>
      <div className="ai-score-bar-track">
        <div className="ai-score-bar-fill" style={{ width: `${value}%`, background: fg }} />
      </div>
    </div>
  );
}

/* ── Detail panel ────────────────────────────────────────────────────────── */
function DetailPanel({ score, onNavigate, onClose }) {
  if (!score) return null;

  const sc = scoreColor(score.composite);
  const stores = storeR13(score.skuId);
  const maxR13 = Math.max(...stores.map((s) => s.r13), 1);
  const velColor = (v) => v === "A" ? color.success : v === "B" ? color.info : v === "C" ? color.warning : color.neutral;

  return (
    <div className="ai-detail">
      {/* Header */}
      <div className="ai-detail-header">
        <button type="button" className="ai-detail-close" onClick={onClose} aria-label="Close detail panel">✕</button>
        <div className="ai-detail-sku-id">{score.skuId}</div>
        <div className="ai-detail-sku-name">{score.desc}</div>
        <div className="ai-detail-tags">
          <span className="ai-tag ai-tag--dept">{score.dept}</span>
          {score.tag && <span className="ai-tag ai-tag--label">{score.tag}</span>}
          {score.flags.map((f) => (
            <span key={f} className={`ai-tag ai-tag--flag-${f}`}>{f.replace("-", " ")}</span>
          ))}
        </div>
      </div>

      {/* Composite score */}
      <div className="ai-composite" style={{ background: sc.bg }}>
        <span className="ai-composite-val" style={{ color: sc.fg }}>{score.composite}</span>
        <div className="ai-composite-info">
          <span className="ai-composite-lbl">Composite Score</span>
          <span className="ai-composite-sub" style={{ color: sc.fg }}>
            {score.composite >= 75 ? "Strong performer" : score.composite >= 55 ? "Moderate" : "Needs attention"}
          </span>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="ai-section">
        <div className="ai-section-label">Score breakdown</div>
        <div className="ai-score-breakdown">
          <ScoreBar label="R13 performance" value={score.r13Score} fg={color.success} />
          <ScoreBar label="Like-item forecast" value={score.forecastScore} fg={color.info} />
          <div className="ai-score-bar">
            <div className="ai-score-bar-head">
              <span className="ai-score-bar-label">Intel modifier</span>
              <span className="ai-score-bar-val" style={{ color: score.intelDelta >= 0 ? color.success : color.error }}>
                {score.intelDelta >= 0 ? "+" : ""}{score.intelDelta} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contributing signals */}
      {score.signals.length > 0 && (
        <div className="ai-section">
          <div className="ai-section-label">Contributing signals</div>
          {score.signals.map((sig) => (
            <div key={sig.id} className="ai-signal-row">
              <span className="ai-signal-type">{sig.type}</span>
              <span className="ai-signal-title">{sig.title}</span>
              <span className={`ai-signal-delta ${sig.direction === "threat" ? "neg" : "pos"}`}>
                {sig.direction === "threat" ? "↓" : "↑"} {Math.abs(INTEL_DELTAS[sig.type] || 0)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* R13 by store */}
      <div className="ai-section">
        <div className="ai-section-label">R13 by store (top 10)</div>
        <div className="ai-store-bars">
          {stores.map((s) => (
            <div key={s.store} className="ai-store-bar-row">
              <span className="ai-store-bar-name">{s.store.replace("Floor & Decor ", "")}</span>
              <div className="ai-store-bar-track">
                <div className="ai-store-bar-fill" style={{ width: `${(s.r13 / maxR13) * 100}%`, background: velColor(s.velocity) }} />
              </div>
              <span className="ai-store-bar-val">{s.r13 > 0 ? `$${s.r13}` : "—"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="ai-detail-actions">
        <Button variant="primary" size="small" onClick={() => onNavigate("catalogue")}>Open in Catalogue →</Button>
        <Button variant="ghost" size="small" onClick={() => onNavigate("forecast")}>View Forecast →</Button>
      </div>
    </div>
  );
}

/* ── Main view ───────────────────────────────────────────────────────────── */
const DEPT_OPTS = ["All", "Wood", "Tile", "Laminate & Vinyl"];
const SIGNAL_TABS = ["All", "Forecast signals", "Intel signals", "R13 only"];

export default function AssortmentIntelligence({ onNavigate }) {
  const [deptFilter, setDeptFilter]       = useState("All");
  const [signalTab, setSignalTab]         = useState("All");
  const [selectedSkuId, setSelectedSkuId] = useState(null);

  const scores = useMemo(() => CATALOGUE_SKUS.map((c) => buildAIScore(c.id)).filter(Boolean), []);

  const filtered = useMemo(() => scores.filter((s) => {
    const deptOk = deptFilter === "All" || s.dept === deptFilter;
    const sigOk =
      signalTab === "All" ||
      (signalTab === "Intel signals"    && s.signals.length > 0) ||
      (signalTab === "Forecast signals" && s.forecastScore > 65) ||
      (signalTab === "R13 only"         && s.signals.length === 0);
    return deptOk && sigOk;
  }), [scores, deptFilter, signalTab]);

  const selectedScore = scores.find((s) => s.skuId === selectedSkuId) || null;
  const intelCount    = scores.filter((s) => s.signals.length > 0).length;
  const panelOpen     = !!selectedScore;

  const colDefs = useMemo(() => [
    {
      field: "skuId", headerName: "SKU", width: 120, pinned: "left",
      cellRenderer: ({ value, data }) => (
        <div className="ai-sku-cell">
          <SkuSwatch sku={{ desc: data.desc, dept: data.dept, cls: data.cls, subDept: data.subDept }} size={22} />
          <span className="ai-sku-id">{value}</span>
        </div>
      ),
    },
    { field: "desc",  headerName: "Description", flex: 1, minWidth: 180,
      cellStyle: { fontWeight: 500 } },
    { field: "dept",  headerName: "Dept", width: 130,
      cellRenderer: ({ value }) => <span className="ai-dept-chip">{value}</span> },
    { field: "r13Score", headerName: "R13",      width: 72,
      cellStyle: { fontWeight: 800, color: color.success, textAlign: "right" },
      headerClass: "ag-right-aligned-header" },
    { field: "forecastScore", headerName: "Forecast", width: 90,
      cellStyle: { fontWeight: 700, color: color.info, textAlign: "right" },
      headerClass: "ag-right-aligned-header" },
    { field: "intelDelta", headerName: "Intel Δ", width: 85,
      cellRenderer: ({ value }) => (
        <span style={{ fontWeight: 700, color: value >= 0 ? color.success : color.error }}>
          {value >= 0 ? "+" : ""}{value}
        </span>
      ),
      cellStyle: { textAlign: "right" },
      headerClass: "ag-right-aligned-header" },
    { field: "composite", headerName: "Score", width: 80,
      sort: "desc",
      cellRenderer: ({ value }) => {
        const sc = scoreColor(value);
        return <span className="ai-comp-pill" style={{ background: sc.bg, color: sc.fg }}>{value}</span>;
      },
      cellStyle: { textAlign: "center" },
      headerClass: "ag-center-aligned-header" },
  ], []);

  return (
    <div className="ai-root">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <Text variant="title" as="h1" className="ai-title">Assortment Intelligence</Text>
          <Badge variant="subtle" label={`SS 2026 · ${scores.length} SKUs`} className="ai-season-badge" />
        </div>
        <div className="ai-header-right">
          {intelCount > 0 && (
            <span className="ai-intel-count">
              <span className="ai-intel-dot" />
              {intelCount} SKUs with intel signals
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="ai-filters">
        <Stack direction="row" align="center" gap={2} wrap>
          {DEPT_OPTS.map((d) => (
            <Chips key={d} label={d} isActive={deptFilter === d} onClick={() => setDeptFilter(d)} />
          ))}
          <div className="ai-filter-divider" />
          {SIGNAL_TABS.map((t) => (
            <Chips key={t} label={t} isActive={signalTab === t} onClick={() => setSignalTab(t)} />
          ))}
          <Text variant="micro" tone="subtle" style={{ marginLeft: "auto" }}>{filtered.length} SKUs</Text>
        </Stack>
      </div>

      {/* Two-panel layout — detail panel only renders when a row is selected */}
      <div className={`ai-layout ${panelOpen ? "ai-layout--panel-open" : ""}`}>
        <Card className="ai-table-panel" padding="none">
          <div className="ag-theme-alpine ai-grid-wrap">
            <AgGridReact
              rowData={filtered}
              columnDefs={colDefs}
              defaultColDef={{ sortable: true, resizable: true, suppressMovable: false }}
              rowSelection="single"
              onRowClicked={({ data }) => setSelectedSkuId(data.skuId)}
              getRowStyle={({ data }) => ({
                background: data.skuId === selectedSkuId ? color.primarySoft : undefined,
                cursor: "pointer",
              })}
              animateRows
              suppressCellFocus
            />
          </div>
          {!panelOpen && (
            <div className="ai-click-hint">
              Click any row to view the score breakdown and store-level performance
            </div>
          )}
        </Card>

        {panelOpen && (
          <Card className="ai-detail-panel" padding="none">
            <DetailPanel
              score={selectedScore}
              onNavigate={onNavigate}
              onClose={() => setSelectedSkuId(null)}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
