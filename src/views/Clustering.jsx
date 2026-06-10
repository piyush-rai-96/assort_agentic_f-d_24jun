import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Badge, Table } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { color } from "../styles/tokens.js";
import {
  /* scenario explorer */
  FD_CLUST_SCENARIOS, FD_OUTLIER_STORES, OUTLIER_OPTIONS,
  STORE_COUNT, TIER_BADGE, VEL_COLOR, BAND_PCT,
  clusterStores, scenarioTagline,
  /* run management */
  ACTIVE_CLUSTER_SET, CLUSTER_RUNS, CLUSTER_ATTRIBUTES,
  WIZARD_DEFAULTS, SCOPE_OPTIONS, METHOD_OPTIONS, RUN_STATUS_PHASES,
  previewClusters,
  /* analytics */
  PREVIEW_CLUSTER_STORES, NETWORK_AVERAGES, VEL_SCORE_LABEL,
} from "../data/clustering.js";
import "./Clustering.css";

/* ── Shared panel style ─────────────────────────────────────────────────── */
const panelSx = {
  maxWidth: "none", minHeight: "auto", width: "100%",
  padding: "var(--sp-4)",
  border: "1px solid var(--color-border)", borderRadius: "var(--r)",
  boxShadow: "var(--sh)", background: "var(--color-surface)",
};
const sidebarSx = { ...panelSx, padding: 0, width: 264, minWidth: 264, overflow: "hidden" };
const PREVIEW_COLS = "56px 1fr 92px 46px 50px 48px 60px";
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

/* ══════════════════════════════════════════════════════════════════════════
   SHARED ATOMS
   ══════════════════════════════════════════════════════════════════════════ */
function SignalChips({ signals, size = "small" }) {
  if (!signals?.length) return null;
  return (
    <Stack direction="row" gap={1} wrap>
      {signals.map((s) => <Badge key={s} variant="subtle" size={size} color="success" label={s} />)}
    </Stack>
  );
}

function CohesionBar({ value }) {
  const c = value >= 0.8 ? color.success : value >= 0.7 ? color.warning : color.error;
  return (
    <div className="cr-cohesion-wrap">
      <div className="cr-cohesion-track">
        <div className="cr-cohesion-fill" style={{ width: `${value * 100}%`, background: c }} />
      </div>
      <span className="cr-cohesion-val" style={{ color: c }}>{value.toFixed(2)}</span>
    </div>
  );
}

function CatPills({ cats }) {
  return (
    <Stack direction="row" gap={1} wrap>
      {cats.map((c) => <span key={c} className="cr-cat-pill">{c}</span>)}
    </Stack>
  );
}

function NetworkDistBar({ clusters }) {
  const total = clusters.reduce((s, c) => s + c.stores, 0);
  return (
    <div className="cr-dist-bar">
      {clusters.map((c) => (
        <div key={c.id} className="cr-dist-seg"
          style={{ flex: c.stores / total, background: c.color }}
          title={`${c.name}: ${c.stores} stores`}
        />
      ))}
    </div>
  );
}

function StatusPill({ status }) {
  return status === "live"
    ? <span className="cr-status-live">Live</span>
    : <span className="cr-status-archived">Archived</span>;
}

/* ══════════════════════════════════════════════════════════════════════════
   ANALYTICS COMPONENTS
   ══════════════════════════════════════════════════════════════════════════ */

/* ── SVG Radar Chart ────────────────────────────────────────────────────── */
function RadarChart({ clusterValues, networkValues, clusterColor: clColor, size = 220 }) {
  const cx = size / 2, cy = size / 2;
  const radius = size * 0.34;
  const n = clusterValues.length;
  const angles = clusterValues.map((_, i) => (i * 2 * Math.PI) / n - Math.PI / 2);
  const toXY = (angle, r) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  const toPath = (pts) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ") + " Z";

  const netPts  = networkValues.map((v, i)  => toXY(angles[i], v  * radius));
  const clustPts = clusterValues.map((v, i) => toXY(angles[i], v  * radius));
  const gridLevels = [0.25, 0.5, 0.75, 1];
  const labels = ["Pro %", "Cohesion", "Size", "Velocity", "Cat Mix"];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {/* Grid circles */}
      {gridLevels.map((l) => (
        <circle key={l} cx={cx} cy={cy} r={radius * l}
          fill="none" stroke="var(--border)" strokeWidth={1} />
      ))}
      {/* Axis lines */}
      {clusterValues.map((_, i) => {
        const [x2, y2] = toXY(angles[i], radius);
        return <line key={i} x1={cx} y1={cy} x2={x2} y2={y2} stroke="var(--border)" strokeWidth={1} />;
      })}
      {/* Network average polygon */}
      <path d={toPath(netPts)} fill="var(--ice2)" fillOpacity={0.7}
        stroke="var(--border2)" strokeWidth={1.5} strokeDasharray="4 2" />
      {/* Cluster polygon */}
      <path d={toPath(clustPts)} fill={clColor} fillOpacity={0.18}
        stroke={clColor} strokeWidth={2.5} />
      {/* Data points */}
      {clustPts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill={clColor} stroke="white" strokeWidth={1.5} />
      ))}
      {/* Axis labels */}
      {labels.map((lbl, i) => {
        const [x, y] = toXY(angles[i], radius * 1.28);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize="9.5" fill="var(--text3)" fontWeight="700"
            fontFamily="var(--font-sans)">
            {lbl}
          </text>
        );
      })}
    </svg>
  );
}

/* ── Normalise store / cluster attributes for radar (0–1) ──────────────── */
function normaliseForRadar(proSplit, cohesion, sqftK, velScore, catTile) {
  return [
    proSplit / 100,
    cohesion,
    Math.min(sqftK / 100, 1),
    (5 - velScore) / 4,       // 1(A)=1.0, 4(D)=0.25
    catTile / 100,
  ];
}

/* ── Deviation bar: store value vs cluster average ──────────────────────── */
function DeviationBar({ storeVal, avgVal, maxVal, unit = "", positive = "above" }) {
  const pct = maxVal > 0 ? storeVal / maxVal : 0;
  const avgPct = maxVal > 0 ? avgVal / maxVal : 0;
  const diff = storeVal - avgVal;
  const isAbove = diff >= 0;
  const diffColor = (positive === "above" ? isAbove : !isAbove) ? color.success : color.error;
  const sign = isAbove ? "+" : "";
  return (
    <div className="cr-attr-deviation">
      <div className="cr-deviation-track">
        <div className="cr-deviation-fill"
          style={{ left: 0, width: `${pct * 100}%`, background: color.info + "50" }} />
        <div className="cr-deviation-midline" style={{ left: `${avgPct * 100}%` }} />
      </div>
      <span className="cr-deviation-label" style={{ color: diffColor }}>
        {sign}{typeof diff === "number" && Number.isFinite(diff)
          ? (Math.abs(diff) < 1 ? diff.toFixed(2) : Math.round(diff))
          : "—"}{unit}
      </span>
    </div>
  );
}

/* ── Compute cluster-level stats from its store list ──────────────────────*/
function calcClusterStats(stores) {
  if (!stores.length) return { proSplit: 0, sqftK: 0, velScore: 0, catTile: 0, cohesion: 0 };
  const avg = (key) => stores.reduce((s, r) => s + (r[key] || 0), 0) / stores.length;
  return {
    proSplit:  +avg("proSplit").toFixed(1),
    sqftK:     +avg("sqftK").toFixed(1),
    velScore:  +avg("velScore").toFixed(2),
    catTile:   +avg("catTile").toFixed(1),
    cohesion:  +(stores.reduce((s, r) => s + (r.cohesionContrib || 0.75), 0) / stores.length).toFixed(2),
  };
}

/* ── Cross-cluster metric comparison ────────────────────────────────────── */
function CrossClusterComparison({ managedClusters }) {
  const METRICS = [
    { key: "proSplit", label: "Pro / DIY mix",    unit: "%",   max: 100,  goodHigh: true  },
    { key: "cohesion", label: "Avg cohesion",     unit: "",    max: 1,    goodHigh: true  },
    { key: "sqftK",    label: "Avg store size",   unit: "k",   max: 100,  goodHigh: false },
    { key: "catTile",  label: "Tile sales share", unit: "%",   max: 100,  goodHigh: false },
    { key: "velScore", label: "Velocity (1=A)",   unit: "",    max: 4,    goodHigh: false },
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <div className="cr-compare-grid" style={{ gridTemplateColumns: `160px repeat(${managedClusters.length}, 1fr)` }}>
        {/* Header row */}
        <div className="cr-compare-cell" style={{ background: "var(--color-surface-alt)" }}>
          <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Metric</Text>
        </div>
        {managedClusters.map((cl) => (
          <div key={cl.id} className="cr-compare-cell"
            style={{ background: "var(--color-surface-alt)", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
            <Stack direction="row" align="center" gap={1}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: cl.color, flexShrink: 0 }} />
              <Text variant="micro" tone="strong" style={{ fontWeight: 700 }}>{cl.name}</Text>
            </Stack>
            <Text variant="micro" tone="subtle">{cl.storeList?.length ?? cl.stores} stores</Text>
          </div>
        ))}

        {/* Metric rows */}
        {METRICS.map((m) => (
          <div key={m.key} style={{ display: "contents" }}>
            <div className="cr-compare-cell" style={{ background: "var(--color-surface-alt)" }}>
              <Text variant="micro" tone="muted" style={{ fontWeight: 600 }}>{m.label}</Text>
            </div>
            {managedClusters.map((cl) => {
              const stats = cl.stats || cl;
              const raw = stats[m.key] ?? (m.key === "proSplit" ? cl.proAvg : m.key === "cohesion" ? cl.cohesion : 0);
              const pct = m.max > 0 ? (raw / m.max) * 100 : 0;
              const barColor = m.goodHigh ? (pct > 60 ? color.success : pct > 35 ? color.warning : color.error)
                : (pct < 40 ? color.success : pct < 65 ? color.warning : color.error);
              return (
                <div key={cl.id} className="cr-compare-cell">
                  <div className="cr-metric-bar-wrap">
                    <Stack direction="row" justify="space-between" align="center">
                      <Text variant="micro" tone="strong" style={{ fontWeight: 700 }}>
                        {m.key === "cohesion" ? raw.toFixed ? raw.toFixed(2) : raw : Math.round(raw)}{m.unit}
                      </Text>
                    </Stack>
                    <div className="cr-metric-bar-track">
                      <div className="cr-metric-bar-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Cluster Fingerprint (radar + attribute breakdown) ──────────────────── */
function ClusterFingerprint({ cluster, allClusters }) {
  const stores = cluster.storeList || [];
  const stats = stores.length ? calcClusterStats(stores) : {
    proSplit: cluster.proAvg ?? 50, sqftK: 72, velScore: 2, catTile: 45, cohesion: cluster.cohesion,
  };

  const netVals  = normaliseForRadar(NETWORK_AVERAGES.proSplit, NETWORK_AVERAGES.cohesion, NETWORK_AVERAGES.sqftK, NETWORK_AVERAGES.velScore, NETWORK_AVERAGES.catTile);
  const clustVals = normaliseForRadar(stats.proSplit, stats.cohesion, stats.sqftK, stats.velScore, stats.catTile);

  const attrRows = [
    { label: "Pro / DIY mix",   storeVal: stats.proSplit, avg: NETWORK_AVERAGES.proSplit, max: 100,  unit: "%",  positive: "above" },
    { label: "Avg store size",  storeVal: stats.sqftK,    avg: NETWORK_AVERAGES.sqftK,   max: 100,  unit: "k",  positive: "above" },
    { label: "Sales velocity",  storeVal: stats.velScore, avg: NETWORK_AVERAGES.velScore, max: 4,   unit: "",   positive: "below" },
    { label: "Tile share",      storeVal: stats.catTile,  avg: NETWORK_AVERAGES.catTile,  max: 100, unit: "%",  positive: "above" },
    { label: "Cohesion",        storeVal: stats.cohesion, avg: NETWORK_AVERAGES.cohesion, max: 1,   unit: "",   positive: "above" },
  ];

  return (
    <div className="cr-analytics-two-col">
      {/* Left: radar */}
      <div className="cr-form-section">
        <div className="cr-form-section-header">
          <Stack direction="row" align="center" gap={2}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: cluster.color, flexShrink: 0 }} />
            <Text variant="body-strong" tone="strong">{cluster.name} — attribute fingerprint</Text>
          </Stack>
        </div>
        <div className="cr-form-section-body">
          <div className="cr-radar-wrap">
            <RadarChart
              clusterValues={clustVals}
              networkValues={netVals}
              clusterColor={cluster.color}
              size={230}
            />
            <Stack direction="column" gap={4}>
              <div className="cr-radar-legend">
                <div className="cr-radar-legend-item">
                  <div className="cr-radar-legend-dot" style={{ background: cluster.color }} />
                  <Text variant="micro" tone="strong" style={{ fontWeight: 600 }}>{cluster.name}</Text>
                </div>
                <div className="cr-radar-legend-item">
                  <div className="cr-radar-legend-dot" style={{ background: "var(--ice2)", border: "1px dashed var(--border2)" }} />
                  <Text variant="micro" tone="subtle">Network average</Text>
                </div>
              </div>
              <Stack direction="column" gap={2}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>vs Network avg</Text>
                {attrRows.map((r) => (
                  <Stack key={r.label} direction="column" gap={0.5}>
                    <Text variant="micro" tone="muted" style={{ fontWeight: 600 }}>{r.label}</Text>
                    <DeviationBar storeVal={r.storeVal} avgVal={r.avg} maxVal={r.max} unit={r.unit} positive={r.positive} />
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </div>
        </div>
      </div>

      {/* Right: cluster insights */}
      <Stack direction="column" gap={3}>
        <div className="cr-info-box">
          <Stack direction="column" gap={3}>
            <Text variant="body-strong" tone="strong">Cluster insights</Text>
            <Stack direction="column" gap={2}>
              {[
                { icon: "🎯", text: `${stats.proSplit}% Pro mix — ${stats.proSplit > NETWORK_AVERAGES.proSplit ? "above" : "below"} network avg by ${Math.abs(Math.round(stats.proSplit - NETWORK_AVERAGES.proSplit))}pp` },
                { icon: "📐", text: `Avg store size ${stats.sqftK}k sqft — ${stats.sqftK > NETWORK_AVERAGES.sqftK ? "larger" : "smaller"} than typical network store` },
                { icon: "⚡", text: `Velocity ${VEL_SCORE_LABEL[Math.round(stats.velScore)] || "B"} — ${stats.velScore < NETWORK_AVERAGES.velScore ? "faster" : "slower"} than network median` },
                { icon: "🔷", text: `${stats.catTile}% tile sales share — ${stats.catTile > NETWORK_AVERAGES.catTile ? "tile-heavy" : "LVP-heavy"} assortment profile` },
              ].map((r, i) => (
                <Stack key={i} direction="row" align="flex-start" gap={2}>
                  <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>{r.icon}</span>
                  <Text variant="micro" tone="muted">{r.text}</Text>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </div>

        <div className="cr-info-box">
          <Stack direction="column" gap={2}>
            <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>Key drivers of inclusion</Text>
            <Text variant="micro" tone="subtle">Stores are assigned to this cluster primarily based on:</Text>
            {["Pro / DIY revenue split", "Sales velocity tier", "Category mix index", "Climate zone"].slice(0, 3).map((d, i) => (
              <Stack key={i} direction="row" align="center" gap={2}>
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: cluster.color, flexShrink: 0 }} />
                <Text variant="micro" tone="muted" style={{ fontWeight: 600 }}>{d}</Text>
                <div style={{ flex: 1, height: 4, background: "var(--ice2)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${[78, 65, 52][i]}%`, height: "100%", background: cluster.color, borderRadius: 3 }} />
                </div>
                <Text variant="micro" tone="subtle">{[78, 65, 52][i]}%</Text>
              </Stack>
            ))}
          </Stack>
        </div>
      </Stack>
    </div>
  );
}

/* ── Fit score for a store vs a cluster ──────────────────────────────────── */
function computeFitScore(store, clusterStats) {
  const diffs = [
    Math.abs(store.proSplit - clusterStats.proSplit) / 100,
    Math.abs(store.sqftK    - clusterStats.sqftK)    / 100,
    Math.abs(store.velScore - clusterStats.velScore)  / 4,
    Math.abs(store.catTile  - clusterStats.catTile)   / 100,
  ];
  const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.max(0, Math.round((1 - avgDiff * 2) * 100));
}

/* ── Store Manager Panel ─────────────────────────────────────────────────── */
function StoreManagerPanel({ managedClusters, setManagedClusters, availableStores, setAvailableStores }) {
  const [selectedId,   setSelectedId]   = useState(managedClusters[0]?.id ?? "C1");
  const [expandedId,   setExpandedId]   = useState(null);
  const [addSearch,    setAddSearch]     = useState("");
  const [changeLog,    setChangeLog]     = useState([]);

  const cluster = managedClusters.find((c) => c.id === selectedId) || managedClusters[0];
  if (!cluster) return null;

  const clusterStats = useMemo(() => calcClusterStats(cluster.storeList), [cluster.storeList]);

  /* Remove a store from cluster → send to available pool */
  const removeStore = (store) => {
    setManagedClusters((prev) =>
      prev.map((c) =>
        c.id === cluster.id
          ? { ...c, storeList: c.storeList.filter((s) => s.id !== store.id), stores: c.storeList.length - 1 }
          : c
      )
    );
    setAvailableStores((prev) => [...prev, { ...store, clusterId: null, cohesionContrib: null }]);
    setChangeLog((prev) => [`Removed ${store.name} from ${cluster.name}`, ...prev.slice(0, 4)]);
  };

  /* Add a store from available pool → cluster */
  const addStore = (store) => {
    const newCohesion = +(0.72 + Math.random() * 0.1).toFixed(2);
    setAvailableStores((prev) => prev.filter((s) => s.id !== store.id));
    setManagedClusters((prev) =>
      prev.map((c) =>
        c.id === cluster.id
          ? { ...c, storeList: [...c.storeList, { ...store, clusterId: c.id, cohesionContrib: newCohesion }], stores: c.storeList.length + 1 }
          : c
      )
    );
    setChangeLog((prev) => [`Added ${store.name} to ${cluster.name}`, ...prev.slice(0, 4)]);
    setAddSearch("");
  };

  const filteredAvailable = availableStores.filter((s) =>
    s.name.toLowerCase().includes(addSearch.toLowerCase()) ||
    s.state.toLowerCase().includes(addSearch.toLowerCase()) ||
    s.region.toLowerCase().includes(addSearch.toLowerCase())
  );

  /* Impact: compare current stats vs original */
  const originalStats = useMemo(() => {
    const orig = PREVIEW_CLUSTER_STORES.filter((s) => s.clusterId === cluster.id);
    return calcClusterStats(orig);
  }, [cluster.id]);

  const impactMetrics = [
    { label: "Pro / DIY mix",  before: originalStats.proSplit, after: clusterStats.proSplit, unit: "%" },
    { label: "Cohesion",       before: originalStats.cohesion, after: clusterStats.cohesion, unit: "" },
    { label: "Store count",    before: PREVIEW_CLUSTER_STORES.filter((s) => s.clusterId === cluster.id).length, after: cluster.storeList.length, unit: "" },
    { label: "Avg size",       before: originalStats.sqftK, after: clusterStats.sqftK, unit: "k sqft" },
  ];
  const hasChanges = changeLog.length > 0;

  /* Fit score best match from available pool */
  const bestFit = useMemo(() => {
    if (!availableStores.length) return null;
    return availableStores.reduce((best, s) => {
      const score = computeFitScore(s, clusterStats);
      return score > (best?.score ?? 0) ? { ...s, score } : best;
    }, null);
  }, [availableStores, clusterStats]);

  return (
    <div className="cr-manager-layout">
      {/* Left: store table for selected cluster */}
      <Stack direction="column" gap={4}>
        {/* Cluster tabs */}
        <div className="cr-cluster-tabs">
          {managedClusters.map((c) => (
            <button key={c.id} className={`cr-cluster-tab${c.id === selectedId ? " is-active" : ""}`}
              onClick={() => { setSelectedId(c.id); setExpandedId(null); }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
              {c.name}
              <span style={{ marginLeft: 2, fontSize: 10, fontWeight: 600, color: "inherit", opacity: 0.7 }}>({c.storeList?.length ?? c.stores})</span>
            </button>
          ))}
        </div>

        {/* Change log banner */}
        {hasChanges && (
          <div className="cr-change-banner">
            <span style={{ fontSize: 14 }}>🔄</span>
            <Stack direction="column" gap={0.5} flex="1 1 auto">
              <Text variant="caption" style={{ color: color.info, fontWeight: 700 }}>Unsaved changes</Text>
              <Text variant="micro" style={{ color: color.info }}>{changeLog[0]}</Text>
            </Stack>
            <Button variant="secondary" size="small" onClick={() => setChangeLog([])}>Dismiss</Button>
          </div>
        )}

        {/* Store table */}
        <div className="cr-active-set">
          <div className="cr-active-set-header">
            <Stack direction="row" align="center" gap={2} flex="1 1 auto">
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: cluster.color, flexShrink: 0 }} />
              <Text variant="body-strong" tone="strong">{cluster.name}</Text>
              <Badge variant="subtle" size="small" color="info" label={`${cluster.storeList.length} stores`} />
            </Stack>
            <Text variant="micro" tone="subtle">Click a store to expand · Pro avg: {clusterStats.proSplit}% · Cohesion: {clusterStats.cohesion}</Text>
          </div>

          {/* Table header */}
          <div style={{ padding: "6px 12px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", display: "grid", gridTemplateColumns: "1fr 72px 64px 60px 80px 80px 36px", gap: "8px", alignItems: "center" }}>
            {["Store", "Pro %", "Size", "Vel.", "Cohesion", "Fit", ""].map((h) => (
              <Text key={h} variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</Text>
            ))}
          </div>

          {cluster.storeList.map((store) => {
            const expanded = expandedId === store.id;
            const fitScore = computeFitScore(store, clusterStats);
            const fitClass = fitScore >= 75 ? "cr-fit-high" : fitScore >= 50 ? "cr-fit-medium" : "cr-fit-low";
            const storeAttrRows = [
              { label: "Pro split",   val: store.proSplit,  avg: clusterStats.proSplit, max: 100, unit: "%" },
              { label: "Store size",  val: store.sqftK,     avg: clusterStats.sqftK,    max: 100, unit: "k" },
              { label: "Velocity",    val: store.velScore,  avg: clusterStats.velScore, max: 4,   unit: "" },
              { label: "Tile share",  val: store.catTile,   avg: clusterStats.catTile,  max: 100, unit: "%" },
            ];
            return (
              <div key={store.id} className="cr-store-row">
                <div className="cr-store-row-main" onClick={() => setExpandedId(expanded ? null : store.id)}>
                  <Stack direction="column" gap={0.5}>
                    <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{store.name}</Text>
                    <Text variant="micro" tone="subtle">{store.state} · {store.region}</Text>
                  </Stack>
                  <Text variant="caption" mono style={{ fontWeight: 700 }}>{store.proSplit}%</Text>
                  <Text variant="caption" mono style={{ color: color.teal }}>{store.sqftK}k</Text>
                  <Text variant="caption" mono style={{ fontWeight: 700, color: VEL_COLOR[VEL_SCORE_LABEL[store.velScore]] || color.text }}>
                    {VEL_SCORE_LABEL[store.velScore] || "B"}
                  </Text>
                  <Text variant="micro" mono style={{ color: store.cohesionContrib >= 0.8 ? color.success : color.warning }}>
                    {store.cohesionContrib?.toFixed(2) ?? "—"}
                  </Text>
                  <span className={`cr-fit-badge ${fitClass}`}>{fitScore}%</span>
                  <Button variant="secondary" size="small"
                    onClick={(e) => { e.stopPropagation(); removeStore(store); }}
                    style={{ padding: "2px 6px", fontSize: 11 }}>
                    ✕
                  </Button>
                </div>

                {/* Expanded store detail */}
                {expanded && (
                  <div className="cr-store-row-detail">
                    <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>
                      {store.name} — attribute comparison vs cluster average
                    </Text>
                    <Stack direction="column" gap={2}>
                      {storeAttrRows.map((r) => (
                        <Stack key={r.label} direction="row" align="center" gap={3}>
                          <Text variant="micro" tone="muted" style={{ fontWeight: 600, minWidth: 80 }}>{r.label}</Text>
                          <Text variant="micro" mono style={{ fontWeight: 700, minWidth: 36, textAlign: "right" }}>
                            {r.unit === "" && r.val < 5 ? r.val.toFixed(1) : Math.round(r.val)}{r.unit}
                          </Text>
                          <div style={{ flex: 1 }}>
                            <DeviationBar storeVal={r.val} avgVal={r.avg} maxVal={r.max} unit={r.unit} positive="above" />
                          </div>
                          <Text variant="micro" tone="subtle" style={{ minWidth: 60 }}>avg: {Math.round(r.avg)}{r.unit}</Text>
                        </Stack>
                      ))}
                    </Stack>

                    {/* Why this store belongs here */}
                    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--r2)", padding: "var(--sp-3) var(--sp-4)" }}>
                      <Stack direction="row" align="flex-start" gap={2}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                        <Stack direction="column" gap={0.5}>
                          <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>Why this store is in {cluster.name}</Text>
                          <Text variant="micro" tone="muted">
                            Primary drivers: Pro / DIY mix ({store.proSplit}% — {Math.abs(store.proSplit - clusterStats.proSplit) < 8 ? "close to" : store.proSplit > clusterStats.proSplit ? "above" : "below"} cluster avg), sales velocity ({VEL_SCORE_LABEL[store.velScore]}), and tile category share ({store.catTile}%).
                            Overall fit score of {fitScore}% — {fitScore >= 75 ? "strong match" : fitScore >= 50 ? "acceptable match" : "consider reassignment"}.
                          </Text>
                        </Stack>
                      </Stack>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add store section */}
        <div className="cr-add-store-panel">
          <div className="cr-active-set-header">
            <Text variant="body-strong" tone="strong" style={{ flex: 1 }}>Add store to {cluster.name}</Text>
            {bestFit && (
              <Text variant="micro" tone="success" style={{ fontWeight: 600 }}>
                Best match: {bestFit.name} ({bestFit.score}% fit)
              </Text>
            )}
          </div>
          <div style={{ padding: "var(--sp-3) var(--sp-4)", borderBottom: "1px solid var(--color-border)" }}>
            <input className="cr-input" placeholder="Search by name, state, or region…"
              value={addSearch} onChange={(e) => setAddSearch(e.target.value)} />
          </div>
          {filteredAvailable.length === 0 ? (
            <div style={{ padding: "var(--sp-5)", textAlign: "center" }}>
              <Text variant="caption" tone="subtle">{addSearch ? "No stores match your search." : "No unassigned stores available."}</Text>
            </div>
          ) : (
            <>
              {/* Available store header */}
              <div style={{ padding: "6px 12px", background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", display: "grid", gridTemplateColumns: "1fr 64px 56px 60px auto", gap: 8, alignItems: "center" }}>
                {["Store", "Pro %", "Size", "Vel.", ""].map((h) => (
                  <Text key={h} variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</Text>
                ))}
              </div>
              {filteredAvailable.map((s) => {
                const fitScore = computeFitScore(s, clusterStats);
                const fitClass = fitScore >= 75 ? "cr-fit-high" : fitScore >= 50 ? "cr-fit-medium" : "cr-fit-low";
                return (
                  <div key={s.id} className="cr-available-store-row">
                    <Stack direction="column" gap={0.5}>
                      <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{s.name}</Text>
                      <Text variant="micro" tone="subtle">{s.state} · {s.region}</Text>
                    </Stack>
                    <Text variant="caption" mono style={{ fontWeight: 700 }}>{s.proSplit}%</Text>
                    <Text variant="caption" mono style={{ color: color.teal }}>{s.sqftK}k</Text>
                    <Text variant="caption" mono style={{ fontWeight: 700 }}>{VEL_SCORE_LABEL[s.velScore] || "B"}</Text>
                    <Stack direction="row" align="center" gap={2}>
                      <span className={`cr-fit-badge ${fitClass}`}>{fitScore}% fit</span>
                      <Button variant="primary" size="small" onClick={() => addStore(s)}>+ Add</Button>
                    </Stack>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </Stack>

      {/* Right: impact panel */}
      <Stack direction="column" gap={4}>
        <div className="cr-impact-panel">
          <Stack direction="column" gap={3}>
            <Stack direction="row" align="center" gap={2}>
              <Text variant="body-strong" tone="strong">Impact summary</Text>
              {hasChanges && <Badge variant="subtle" size="small" color="warning" label="Changed" />}
            </Stack>
            <Text variant="micro" tone="subtle">{cluster.name} — current vs original composition</Text>
            {impactMetrics.map((m) => {
              const diff = m.after - m.before;
              const isChanged = Math.abs(diff) > 0.005;
              const isImprovement = (m.label === "Cohesion" || m.label === "Store count") ? diff > 0 : null;
              return (
                <div key={m.label} className="cr-impact-metric">
                  <Stack direction="column" gap={0.5} flex="1 1 auto">
                    <Text variant="micro" tone="subtle" style={{ fontWeight: 600 }}>{m.label}</Text>
                    <Stack direction="row" align="center" gap={2}>
                      <Text variant="caption" mono style={{ fontWeight: 700, color: color.teal }}>
                        {typeof m.after === "number" && m.after < 5 ? m.after.toFixed(2) : Math.round(m.after)}{m.unit}
                      </Text>
                      {isChanged && (
                        <span className="cr-impact-arrow" style={{ color: isImprovement === null ? color.info : isImprovement ? color.success : color.error }}>
                          {diff > 0 ? "↑" : "↓"}
                        </span>
                      )}
                      {isChanged && (
                        <Text variant="micro" tone="subtle" mono>
                          was {typeof m.before === "number" && m.before < 5 ? m.before.toFixed(2) : Math.round(m.before)}{m.unit}
                        </Text>
                      )}
                      {!isChanged && <Text variant="micro" tone="subtle">no change</Text>}
                    </Stack>
                  </Stack>
                </div>
              );
            })}
          </Stack>
        </div>

        {/* Network-wide store distribution after changes */}
        <div className="cr-info-box">
          <Stack direction="column" gap={2}>
            <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>Network distribution</Text>
            <NetworkDistBar clusters={managedClusters.map((c) => ({ ...c, stores: c.storeList?.length ?? c.stores }))} />
            {managedClusters.map((c) => (
              <Stack key={c.id} direction="row" align="center" justify="space-between" gap={2}>
                <Stack direction="row" align="center" gap={1}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <Text variant="micro" tone="subtle">{c.name}</Text>
                </Stack>
                <Text variant="micro" mono tone="strong" style={{ fontWeight: 700 }}>
                  {c.storeList?.length ?? c.stores}
                </Text>
              </Stack>
            ))}
          </Stack>
        </div>

        <div className="cr-info-box" style={{ background: "var(--teal-pale)", borderColor: "var(--color-teal)" }}>
          <Stack direction="column" gap={1}>
            <Text variant="caption" style={{ color: color.teal, fontWeight: 700 }}>💡 Store reassignment</Text>
            <Text variant="micro" style={{ color: color.teal }}>
              Adding or removing stores re-calculates cluster cohesion at promote time. Changes here are preview only — they take effect when you promote to live.
            </Text>
          </Stack>
        </div>
      </Stack>
    </div>
  );
}

/* ── Outer analytics panel with tab switcher ─────────────────────────────── */
function ClusterAnalyticsPanel({ managedClusters, setManagedClusters, availableStores, setAvailableStores }) {
  const [tab,        setTab]        = useState("overview");
  const [fpClusterId, setFpClusterId] = useState(managedClusters[0]?.id ?? "C1");
  const fpCluster = managedClusters.find((c) => c.id === fpClusterId) || managedClusters[0];

  const TABS = [
    { id: "overview",     label: "Cross-cluster comparison" },
    { id: "fingerprint",  label: "Cluster fingerprint"      },
    { id: "manage",       label: "Manage stores"            },
  ];

  return (
    <div className="cr-analytics-outer">
      <Stack direction="row" align="center" justify="space-between" gap={4} wrap style={{ marginBottom: "var(--sp-4)" }}>
        <Stack direction="column" gap={0.5}>
          <Text variant="heading" tone="strong">Cluster analytics</Text>
          <Text variant="caption" tone="muted">Post-run analysis and store management for CR-019</Text>
        </Stack>
      </Stack>

      <div className="cr-analytics-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`cr-analytics-tab${tab === t.id ? " is-active" : ""}`}
            onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <Stack direction="column" gap={4}>
          <Text variant="caption" tone="muted">
            Compare how key metrics vary across all clusters. Bars show cluster value relative to its own maximum.
          </Text>
          <CrossClusterComparison managedClusters={managedClusters} />
        </Stack>
      )}

      {/* Fingerprint */}
      {tab === "fingerprint" && (
        <Stack direction="column" gap={4}>
          {/* Cluster selector */}
          <div className="cr-cluster-tabs">
            {managedClusters.map((c) => (
              <button key={c.id}
                className={`cr-cluster-tab${c.id === fpClusterId ? " is-active" : ""}`}
                onClick={() => setFpClusterId(c.id)}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                {c.name}
              </button>
            ))}
          </div>
          {fpCluster && (
            <ClusterFingerprint cluster={fpCluster} allClusters={managedClusters} />
          )}
        </Stack>
      )}

      {/* Manage stores */}
      {tab === "manage" && (
        <StoreManagerPanel
          managedClusters={managedClusters}
          setManagedClusters={setManagedClusters}
          availableStores={availableStores}
          setAvailableStores={setAvailableStores}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   WIZARD SUB-SCREENS
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Step 0 — Input ─────────────────────────────────────────────────────── */
function StepInput({ draft, setDraft }) {
  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const showK = draft.method === "kmeans";
  const kHint = draft.k <= 3 ? "Too few — clusters may be too coarse"
              : draft.k >= 8 ? "Too many — clusters become too thin"
              : "Balanced cluster count for this network";

  return (
    <div className="cr-step-grid">
      <Stack direction="column" gap={4}>
        {/* Run details */}
        <div className="cr-form-section">
          <div className="cr-form-section-header">
            <Text variant="body-strong" tone="strong">Run details</Text>
          </div>
          <div className="cr-form-section-body">
            <Stack direction="column" gap={3}>
              <Stack direction="column" gap={1}>
                <Text variant="caption" tone="muted" style={{ fontWeight: 600 }}>
                  Run name <span style={{ color: color.error }}>*</span>
                </Text>
                <input className="cr-input" value={draft.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Network 5-cluster (k-means)" />
              </Stack>
              <Stack direction="column" gap={1}>
                <Text variant="caption" tone="muted" style={{ fontWeight: 600 }}>Notes (optional)</Text>
                <textarea className="cr-input" rows={2} value={draft.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder="e.g. Quarterly refresh — same attributes as CR-018"
                  style={{ resize: "vertical" }} />
              </Stack>
            </Stack>
          </div>
        </div>

        {/* Scope */}
        <div className="cr-form-section">
          <div className="cr-form-section-header">
            <Stack direction="row" align="center" gap={2}>
              <Text variant="body-strong" tone="strong">Scope</Text>
              <Text variant="micro" tone="subtle">Choose which stores to cluster</Text>
            </Stack>
          </div>
          <div className="cr-form-section-body">
            <Stack direction="column" gap={2}>
              {SCOPE_OPTIONS.map((opt) => (
                <div key={opt.id} className={`cr-radio-card${draft.scope === opt.id ? " is-selected" : ""}`}
                  onClick={() => update("scope", opt.id)}>
                  <div className="cr-radio-dot" />
                  <Stack direction="column" gap={0.5}>
                    <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{opt.label}</Text>
                    <Text variant="micro" tone="subtle">{opt.desc}</Text>
                  </Stack>
                </div>
              ))}
            </Stack>
          </div>
        </div>

        {/* Method */}
        <div className="cr-form-section">
          <div className="cr-form-section-header">
            <Text variant="body-strong" tone="strong">Clustering method</Text>
          </div>
          <div className="cr-form-section-body">
            <Stack direction="column" gap={2}>
              {METHOD_OPTIONS.map((opt) => (
                <div key={opt.id}
                  className={`cr-radio-card${draft.method === opt.id ? " is-selected" : ""}${opt.disabled ? " is-disabled" : ""}`}
                  onClick={() => !opt.disabled && update("method", opt.id)}>
                  <div className="cr-radio-dot" />
                  <Stack direction="column" gap={0.5} flex="1 1 auto" style={{ minWidth: 0 }}>
                    <Stack direction="row" align="center" gap={2}>
                      <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{opt.label}</Text>
                      {opt.badge && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 6,
                          background: opt.id === "kmeans" ? color.primarySoft : "#f3f4f6",
                          color: opt.id === "kmeans" ? color.primary : "#6b7280" }}>
                          {opt.badge}
                        </span>
                      )}
                    </Stack>
                    <Text variant="micro" tone="subtle">{opt.desc}</Text>
                  </Stack>
                </div>
              ))}

              {showK && (
                <Stack direction="column" gap={2} style={{ marginTop: 4, padding: "var(--sp-4)", background: "var(--color-surface-alt)", borderRadius: "var(--r2)", border: "1px solid var(--color-border)" }}>
                  <Stack direction="row" justify="space-between" align="center">
                    <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>Number of clusters</Text>
                    <Text variant="title" tone="primary" style={{ fontWeight: 800, lineHeight: 1 }}>k = {draft.k}</Text>
                  </Stack>
                  <input type="range" min={3} max={9} value={draft.k} className="cr-k-slider"
                    onChange={(e) => update("k", Number(e.target.value))} />
                  <Stack direction="row" justify="space-between">
                    <Text variant="micro" tone="subtle">3</Text>
                    <Text variant="micro" tone={draft.k <= 3 || draft.k >= 8 ? "warning" : "success"} style={{ fontWeight: 600 }}>{kHint}</Text>
                    <Text variant="micro" tone="subtle">9</Text>
                  </Stack>
                </Stack>
              )}
            </Stack>
          </div>
        </div>
      </Stack>

      {/* Right info rail */}
      <div className="cr-info-rail">
        <div className="cr-info-box">
          <Stack direction="column" gap={3}>
            <Text variant="body-strong" tone="strong">What happens next</Text>
            {["Pick the attributes that drive cluster similarity", "Preview cluster shapes and cohesion scores", "Promote the approved set to live"].map((step, i) => (
              <div key={i} className="cr-info-step">
                <div className="cr-info-step-num">{i + 1}</div>
                <Text variant="caption" tone="muted">{step}</Text>
              </div>
            ))}
            <Text variant="micro" tone="subtle" style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
              Quarterly cadence — mid-quarter re-runs require Category Manager approval.
            </Text>
          </Stack>
        </div>
        <div className="cr-last-run-box">
          <Stack direction="column" gap={1}>
            <Text variant="micro" tone="subtle" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>Last live run</Text>
            <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>CR-018 · k-means · k=5</Text>
            <Text variant="micro" tone="muted">Cohesion 0.80 · Jan 12, 2026</Text>
            <Text variant="micro" tone="subtle" style={{ marginTop: 2 }}>Author: D. Rivera</Text>
          </Stack>
        </div>
        <div className="cr-info-box" style={{ background: "var(--teal-pale)", borderColor: "var(--color-teal)" }}>
          <Stack direction="column" gap={1}>
            <Text variant="caption" style={{ fontWeight: 600, color: color.teal }}>💡 Tip</Text>
            <Text variant="micro" style={{ color: color.teal }}>
              Running with the same attributes as CR-018 gives the most comparable cohesion benchmark.
            </Text>
          </Stack>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1 — Attributes ─────────────────────────────────────────────────── */
function StepAttributes({ draft, setDraft }) {
  const toggleAttr = (id) =>
    setDraft((d) => ({ ...d, attrs: d.attrs.includes(id) ? d.attrs.filter((a) => a !== id) : [...d.attrs, id] }));

  const groups = useMemo(() => {
    const map = {};
    CLUSTER_ATTRIBUTES.forEach((a) => { (map[a.group] ??= []).push(a); });
    return Object.entries(map);
  }, []);

  const preview = useMemo(
    () => previewClusters(draft.k, draft.attrs.length, draft.method),
    [draft.k, draft.attrs.length, draft.method]
  );

  const selCount = draft.attrs.length;
  const selHealth = selCount === 0 ? "error" : selCount < 3 ? "warning" : selCount <= 6 ? "success" : "warning";

  return (
    <div className="cr-step-grid">
      <Stack direction="column" gap={4}>
        <Stack direction="row" align="center" gap={3}>
          <Text variant="body-strong" tone="strong">Choose clustering attributes</Text>
          <Badge variant="subtle" size="small" color={selHealth}
            label={`${selCount} selected${selCount >= 3 && selCount <= 6 ? " — good" : selCount === 0 ? " — required" : selCount < 3 ? " — add more" : " — consider trimming"}`} />
        </Stack>
        {groups.map(([group, attrs]) => (
          <div key={group} className="cr-form-section">
            <div className="cr-form-section-header">
              <Text variant="caption" tone="muted" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{group}</Text>
            </div>
            <div className="cr-form-section-body">
              <Stack direction="column" gap={1}>
                {attrs.map((attr) => {
                  const selected = draft.attrs.includes(attr.id);
                  return (
                    <div key={attr.id} className={`cr-attr-check${selected ? " is-selected" : ""}`}
                      onClick={() => toggleAttr(attr.id)}>
                      <div className="cr-attr-checkbox" />
                      <Stack direction="column" gap={0.5} flex="1 1 auto" style={{ minWidth: 0 }}>
                        <Stack direction="row" align="center" gap={1}>
                          <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{attr.name}</Text>
                          {attr.recommended && <span className="cr-recommended-badge">★ Recommended</span>}
                        </Stack>
                        <Text variant="micro" tone="subtle">{attr.desc}</Text>
                      </Stack>
                    </div>
                  );
                })}
              </Stack>
            </div>
          </div>
        ))}
      </Stack>

      {/* Right: live preview */}
      <Stack direction="column" gap={4}>
        <div className="cr-preview-panel">
          <div className="cr-form-section-header" style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", padding: "var(--sp-3) var(--sp-4)" }}>
            <Stack direction="row" align="center" justify="space-between">
              <Text variant="body-strong" tone="strong">Live preview</Text>
              <Text variant="micro" tone="muted">{draft.method === "kmeans" ? `k-means · k=${draft.k}` : draft.method} · {selCount} attrs</Text>
            </Stack>
          </div>
          <div style={{ padding: "var(--sp-3) var(--sp-4)", borderBottom: "1px solid var(--color-border)" }}>
            <NetworkDistBar clusters={preview} />
            <Stack direction="row" justify="space-between" style={{ marginTop: 6 }}>
              {preview.map((c) => (
                <Stack key={c.id} direction="row" align="center" gap={1}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <Text variant="micro" tone="subtle">{c.stores}</Text>
                </Stack>
              ))}
            </Stack>
          </div>
          {preview.map((c) => (
            <div key={c.id} className="cr-preview-cluster">
              <div className="cr-preview-cluster-header">
                <Stack direction="row" align="center" gap={2}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{c.name}</Text>
                </Stack>
                <Text variant="micro" tone="subtle">{c.stores} stores</Text>
              </div>
              <CohesionBar value={c.cohesion} />
            </div>
          ))}
          <div style={{ padding: "var(--sp-3) var(--sp-4)", background: "var(--color-surface-sunken)", borderTop: "1px solid var(--color-border)" }}>
            <Text variant="micro" tone="subtle">Cohesion above 0.75 is healthy. Recommended: 3–6 attributes.</Text>
          </div>
        </div>

        <div className="cr-info-box">
          <Stack direction="column" gap={1}>
            <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>Attribute guidance</Text>
            <Text variant="micro" tone="subtle">
              Start with the ★ recommended set — these produced the best cohesion in CR-018.
            </Text>
            <Text variant="micro" tone="subtle" style={{ marginTop: 4 }}>
              Adding Format or Geography reduces statistical purity but improves operational interpretability.
            </Text>
          </Stack>
        </div>
      </Stack>
    </div>
  );
}

/* ── Step 2 — Finalize ───────────────────────────────────────────────────── */
function StepFinalize({ draft, runState, runProgress, runPhase, onRun, nextRunId, onPromote }) {
  const preview = useMemo(
    () => previewClusters(draft.k, draft.attrs.length, draft.method),
    [draft.k, draft.attrs.length, draft.method]
  );

  const attrNames = useMemo(
    () => draft.attrs.map((id) => CLUSTER_ATTRIBUTES.find((a) => a.id === id)?.name ?? id),
    [draft.attrs]
  );

  /* Managed clusters/stores state — initialised once run completes */
  const [managedClusters,   setManagedClusters]   = useState(null);
  const [availableStores,   setAvailableStores]   = useState(null);

  useEffect(() => {
    if (runState === "done" && !managedClusters) {
      setManagedClusters(
        preview.map((c) => ({
          ...c,
          storeList: PREVIEW_CLUSTER_STORES.filter((s) => s.clusterId === c.id),
        }))
      );
      setAvailableStores(PREVIEW_CLUSTER_STORES.filter((s) => s.clusterId === null));
    }
  }, [runState, managedClusters, preview]);

  const scopeLabel  = SCOPE_OPTIONS.find((s) => s.id === draft.scope)?.label  ?? draft.scope;
  const methodLabel = METHOD_OPTIONS.find((m) => m.id === draft.method)?.label ?? draft.method;
  const overallCohesion = preview.length
    ? (preview.reduce((s, c) => s + c.cohesion, 0) / preview.length).toFixed(2)
    : "—";
  const deltaMap = { C1: +2, C2: -1, C3: 0, C4: +3, C5: -2 };

  return (
    <Stack direction="column" gap={5}>
      {/* ── Main 2-col summary ── */}
      <div className="cr-step-grid">
        {/* Left */}
        <Stack direction="column" gap={4}>
          {/* Run summary */}
          <div className="cr-form-section">
            <div className="cr-form-section-header">
              <Text variant="body-strong" tone="strong">Run summary</Text>
            </div>
            <div className="cr-form-section-body">
              <Stack direction="column" gap={3}>
                {[
                  ["Name",       draft.name || "(untitled)"],
                  ["Scope",      `${scopeLabel} · ${STORE_COUNT} stores`],
                  ["Method",     draft.method === "kmeans" ? `k-means · k=${draft.k}` : methodLabel],
                  ["Attributes", `${draft.attrs.length} selected`],
                ].map(([k, v]) => (
                  <Stack key={k} direction="row" gap={3} align="flex-start">
                    <Text variant="caption" tone="muted" style={{ fontWeight: 600, minWidth: 100 }}>{k}</Text>
                    <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{v}</Text>
                  </Stack>
                ))}
                <Stack direction="row" gap={2} wrap style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                  {attrNames.map((n) => <span key={n} className="cr-cat-pill">{n}</span>)}
                </Stack>
              </Stack>
            </div>
          </div>

          {/* Warning */}
          {runState !== "done" && (
            <div className="cr-warning-banner">
              <span style={{ fontSize: 16 }}>⚠️</span>
              <Stack direction="column" gap={0.5}>
                <Text variant="caption" tone="strong" style={{ fontWeight: 700, color: color.warning }}>Preview only</Text>
                <Text variant="micro" tone="muted">This run produces a preview cluster set. Live recommendations remain unchanged until you promote it.</Text>
              </Stack>
            </div>
          )}

          {/* Idle */}
          {runState === "idle" && (
            <div style={{ textAlign: "center", padding: "var(--sp-8) var(--sp-6)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
              <Stack direction="column" gap={4} align="center">
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--color-primary-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 24 }}>⚙️</span>
                </div>
                <Stack direction="column" gap={1} align="center">
                  <Text variant="body-strong" tone="strong">Ready to run</Text>
                  <Text variant="caption" tone="muted">Estimated runtime: ~12 seconds</Text>
                </Stack>
                <Button variant="primary" size="large" onClick={onRun}>Run clustering</Button>
              </Stack>
            </div>
          )}

          {/* Running */}
          {runState === "running" && (
            <div style={{ padding: "var(--sp-6)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
              <Stack direction="column" gap={3}>
                <Stack direction="row" justify="space-between" align="center">
                  <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>Running…</Text>
                  <Text variant="caption" tone="primary" style={{ fontWeight: 700 }}>{Math.round(runProgress)}%</Text>
                </Stack>
                <div className="cr-progress-track">
                  <div className="cr-progress-fill" style={{ width: `${runProgress}%` }} />
                </div>
                <Text variant="micro" tone="muted" style={{ fontStyle: "italic" }}>{runPhase}</Text>
              </Stack>
            </div>
          )}

          {/* Done: results table */}
          {runState === "done" && (
            <Stack direction="column" gap={3}>
              <Stack direction="row" align="center" gap={3}>
                <Stack direction="column" gap={0}>
                  <Text variant="body-strong" tone="strong">Preview — {nextRunId}</Text>
                  <Text variant="micro" tone="muted">k-means · k={draft.k} · {draft.attrs.length} attributes · {STORE_COUNT} stores</Text>
                </Stack>
                <Badge variant="subtle" size="small" color="info" label="Preview" />
              </Stack>

              <NetworkDistBar clusters={preview} />

              <div className="cr-active-set" style={{ overflow: "hidden" }}>
                <table className="cr-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>Cluster</th>
                      <th>Stores</th>
                      <th>Cohesion</th>
                      <th>Δ vs live</th>
                      <th>Dominant categories</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((c, i) => {
                      const delta = deltaMap[c.id] ?? 0;
                      return (
                        <tr key={c.id}>
                          <td>
                            <Stack direction="row" align="center" gap={2}>
                              <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                              <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{c.name}</Text>
                            </Stack>
                          </td>
                          <td><Text variant="caption" mono style={{ fontWeight: 700 }}>{c.stores}</Text></td>
                          <td style={{ minWidth: 120 }}><CohesionBar value={c.cohesion} /></td>
                          <td>
                            {delta > 0 ? <span className="cr-delta-pos">+{delta} stores</span>
                              : delta < 0 ? <span className="cr-delta-neg">{delta} stores</span>
                              : <span className="cr-delta-neutral">· no change</span>}
                          </td>
                          <td><CatPills cats={ACTIVE_CLUSTER_SET.clusters[i]?.dominantCats ?? []} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="cr-promote-success">
                <Stack direction="column" gap={1}>
                  <Text variant="caption" tone="success" style={{ fontWeight: 700 }}>
                    Cohesion: {overallCohesion} · {Number(overallCohesion) >= 0.75 ? "✓ Healthy — ready to promote" : "⚠ Below threshold — review before promoting"}
                  </Text>
                </Stack>
              </div>
            </Stack>
          )}
        </Stack>

        {/* Right: configuration */}
        <div className="cr-info-rail">
          <div className="cr-info-box">
            <Stack direction="column" gap={3}>
              <Text variant="body-strong" tone="strong">Configuration</Text>
              {[
                ["Method",        draft.method === "kmeans" ? `k-means · k=${draft.k}` : methodLabel],
                ["Scope",         scopeLabel],
                ["Attributes",    `${draft.attrs.length} selected`],
                ["Est. runtime",  "~12 seconds"],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" justify="space-between" align="flex-start">
                  <Text variant="micro" tone="subtle" style={{ fontWeight: 600 }}>{k}</Text>
                  <Text variant="micro" tone="strong" style={{ fontWeight: 700, textAlign: "right" }}>{v}</Text>
                </Stack>
              ))}
              <Stack direction="row" gap={1} wrap style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                {attrNames.map((n) => <span key={n} className="cr-cat-pill">{n}</span>)}
              </Stack>
            </Stack>
          </div>

          {runState === "done" && (
            <div className="cr-info-box" style={{ background: "var(--color-success-soft)", borderColor: color.success }}>
              <Stack direction="column" gap={2}>
                <Stack direction="row" align="center" gap={2}>
                  <span style={{ fontSize: 16 }}>✅</span>
                  <Text variant="caption" style={{ fontWeight: 700, color: color.success }}>Run complete</Text>
                </Stack>
                <Text variant="micro" style={{ color: color.teal }}>
                  Explore analytics below, adjust store assignments, then promote when satisfied. CR-018 will be archived.
                </Text>
              </Stack>
            </div>
          )}
        </div>
      </div>

      {/* ── Analytics section — only when run is done ── */}
      {runState === "done" && managedClusters && (
        <ClusterAnalyticsPanel
          managedClusters={managedClusters}
          setManagedClusters={setManagedClusters}
          availableStores={availableStores ?? []}
          setAvailableStores={setAvailableStores}
        />
      )}
    </Stack>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   CLUSTER RUNS DASHBOARD
   ════════════════════════════════════════════════════════════════════════════ */
function ClusterRunsDashboard({ onNewRun }) {
  const { clusters } = ACTIVE_CLUSTER_SET;
  const totalStores  = clusters.reduce((s, c) => s + c.stores, 0);
  const avgCohesion  = (clusters.reduce((s, c) => s + c.cohesion, 0) / clusters.length).toFixed(2);

  const kpis = [
    { label: "Active clusters",  value: clusters.length,  sub: `k=${clusters.length} · live`,          accent: color.primary },
    { label: "Stores assigned",  value: totalStores,       sub: `${totalStores} / ${STORE_COUNT} covered`, accent: color.teal    },
    { label: "Avg cohesion",     value: avgCohesion,       sub: "good · >0.75 healthy",                  accent: Number(avgCohesion) >= 0.8 ? color.success : color.warning },
    { label: "Next re-run",      value: "Apr 12",          sub: "quarterly cycle",                        accent: color.info    },
  ];

  return (
    <Stack direction="column" gap={5}>
      <Stack direction="row" gap={3} wrap>
        {kpis.map((k) => (
          <div key={k.label} className="cr-kpi-card">
            <div className="cr-kpi-label">{k.label}</div>
            <div className="cr-kpi-value" style={{ color: k.accent }}>{k.value}</div>
            <div className="cr-kpi-sub">{k.sub}</div>
          </div>
        ))}
      </Stack>

      {/* Active cluster set */}
      <div className="cr-active-set">
        <div className="cr-active-set-header">
          <Stack direction="column" gap={0.5} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Stack direction="row" align="center" gap={2}>
              <Text variant="body-strong" tone="strong">Active cluster set</Text>
              <span className="cr-run-id">{ACTIVE_CLUSTER_SET.runId}</span>
              <span className="cr-status-live">Live</span>
            </Stack>
            <Text variant="micro" tone="subtle">
              {ACTIVE_CLUSTER_SET.method} · {ACTIVE_CLUSTER_SET.attrNames.length} attributes · run {ACTIVE_CLUSTER_SET.date} by {ACTIVE_CLUSTER_SET.author}
            </Text>
          </Stack>
          <Button variant="secondary" size="small">Re-run latest</Button>
        </div>

        <div style={{ padding: "var(--sp-4) var(--sp-5)", borderBottom: "1px solid var(--color-border)" }}>
          <Stack direction="column" gap={2}>
            <Text variant="micro" tone="subtle" style={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>Store distribution across clusters</Text>
            <NetworkDistBar clusters={clusters} />
            <Stack direction="row" gap={4} wrap>
              {clusters.map((c) => (
                <Stack key={c.id} direction="row" align="center" gap={1}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                  <Text variant="micro" tone="subtle">{c.name} ({c.stores})</Text>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="cr-table" style={{ width: "100%", minWidth: 700 }}>
            <thead>
              <tr>
                <th>Cluster</th><th>Stores</th><th>Pro avg</th>
                <th style={{ minWidth: 140 }}>Cohesion</th><th>Dominant categories</th><th>SKU set</th>
              </tr>
            </thead>
            <tbody>
              {clusters.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Stack direction="row" align="center" gap={2}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
                      <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{c.name}</Text>
                    </Stack>
                  </td>
                  <td><Text variant="caption" mono style={{ fontWeight: 700 }}>{c.stores}</Text></td>
                  <td><Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{c.proAvg}%</Text></td>
                  <td><CohesionBar value={c.cohesion} /></td>
                  <td><CatPills cats={c.dominantCats} /></td>
                  <td><Text variant="caption" mono tone="muted">{c.skus.toLocaleString()} SKUs</Text></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Run history */}
      <div className="cr-active-set">
        <div className="cr-active-set-header">
          <Text variant="body-strong" tone="strong" style={{ flex: 1 }}>Run history</Text>
          <Button variant="secondary" size="small">Export</Button>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="cr-table" style={{ width: "100%", minWidth: 640 }}>
            <thead>
              <tr>
                <th>Run</th><th>Method</th><th>Attrs</th>
                <th style={{ minWidth: 120 }}>Cohesion</th><th>Date</th><th>Author</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {CLUSTER_RUNS.map((run) => (
                <tr key={run.id}>
                  <td>
                    <Stack direction="column" gap={0.5}>
                      <span className="cr-run-id">{run.id}</span>
                      <Text variant="micro" tone="muted" style={{ maxWidth: 200 }} truncate>{run.name}</Text>
                    </Stack>
                  </td>
                  <td><Text variant="caption" tone="muted">{run.method}</Text></td>
                  <td><Text variant="caption" mono tone="muted">{run.attrs}</Text></td>
                  <td><CohesionBar value={run.cohesion} /></td>
                  <td><Text variant="caption" tone="muted">{run.date}</Text></td>
                  <td><Text variant="caption" tone="muted">{run.author}</Text></td>
                  <td><StatusPill status={run.status} /></td>
                  <td><Button variant="secondary" size="small">Open</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Stack>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   MAIN EXPORT
   ════════════════════════════════════════════════════════════════════════════ */
export default function Clustering({ onNavigate }) {
  const [tab, setTab] = useState("runs");

  /* Scenario explorer state */
  const [scenarioId,        setScenarioId]        = useState("B");
  const [activeClId,        setActiveClId]         = useState(null);
  const [outlierDecisions,  setOutlierDecisions]   = useState({});
  const sc       = FD_CLUST_SCENARIOS[scenarioId] || FD_CLUST_SCENARIOS.B;
  const activeCl = sc.clusters.find((c) => c.id === activeClId) || null;
  const selectScenario = (id) => { setScenarioId(id); setActiveClId(null); };
  const toggleCluster  = (id) => setActiveClId((prev) => (prev === id ? null : id));
  const setOutlier     = (id, dec) => setOutlierDecisions((p) => ({ ...p, [id]: dec }));
  const scoreChips = [
    { l: "Composite",   v: `${sc.composite}%`,  tone: "primary" },
    { l: "Statistical", v: `${sc.statScore}%`,  tone: "info"    },
    { l: "Business",    v: `${sc.bizScore}%`,   tone: "accent"  },
  ];
  const detailRows = useMemo(
    () => activeCl ? clusterStores(activeCl).map((s) => ({ ...s, bandPct: BAND_PCT[s.velocity] || "—" })) : [],
    [activeCl]
  );
  const detailColumns = useMemo(() => [
    { field: "id",       headerName: "Store #",    width: 96,  filter: "agTextColumnFilter", cellStyle: { fontFamily: "var(--font-mono)", color: color.teal, fontWeight: 700 } },
    { field: "name",     headerName: "Store Name", minWidth: 160, flex: 1, filter: "agTextColumnFilter" },
    { field: "region",   headerName: "Region",     width: 130, filter: "agSetColumnFilter" },
    { field: "market",   headerName: "Market",     width: 120, filter: "agSetColumnFilter" },
    { field: "state",    headerName: "State",      width: 78,  filter: "agSetColumnFilter" },
    { field: "dc",       headerName: "DC",         width: 78,  filter: "agSetColumnFilter" },
    { field: "velocity", headerName: "Vel.",       width: 78,  filter: "agSetColumnFilter", cellStyle: (p) => ({ color: VEL_COLOR[p.value] || color.text, fontWeight: 700 }) },
    { field: "bandPct",  headerName: "Band %",     width: 90 },
    { field: "action",   headerName: "Action",     width: 120, sortable: false,
      cellRenderer: () => "Curate →",
      cellStyle: { color: "var(--color-primary)", fontWeight: 600, cursor: "pointer" },
      onCellClicked: () => onNavigate?.("store-curation") },
  ], [onNavigate]);

  /* Wizard state */
  const [wizardOpen,  setWizardOpen]  = useState(false);
  const [wizardStep,  setWizardStep]  = useState(0);
  const [draft,       setDraft]       = useState({ ...WIZARD_DEFAULTS });
  const [runState,    setRunState]    = useState("idle");
  const [runProgress, setRunProgress] = useState(0);
  const [runPhase,    setRunPhase]    = useState("");
  const [promoted,    setPromoted]    = useState(false);
  const intervalRef = useRef(null);
  const STEPS = ["Input", "Attributes", "Finalize"];

  const openWizard = useCallback(() => {
    setWizardOpen(true); setWizardStep(0);
    setDraft({ ...WIZARD_DEFAULTS });
    setRunState("idle"); setRunProgress(0); setRunPhase(""); setPromoted(false);
  }, []);

  const closeWizard = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setWizardOpen(false);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const startRun = () => {
    setRunState("running"); setRunProgress(0);
    let p = 0;
    intervalRef.current = setInterval(() => {
      p += Math.random() * 12 + 4;
      if (p >= 100) { p = 100; clearInterval(intervalRef.current); setRunState("done"); }
      setRunProgress(p);
      setRunPhase(RUN_STATUS_PHASES[Math.min(Math.floor((p / 100) * (RUN_STATUS_PHASES.length - 1)), RUN_STATUS_PHASES.length - 1)]);
    }, 250);
  };

  const promoteToLive = () => {
    setPromoted(true);
    setTimeout(() => closeWizard(), 2000);
  };

  const canContinue =
    wizardStep === 0 ? draft.name.trim().length > 0 :
    wizardStep === 1 ? draft.attrs.length > 0 : true;

  /* ── Wizard overlay ─────────────────────────────────────────────────────── */
  if (wizardOpen) {
    return (
      <div className="cr-wizard-overlay">
        {/* Header */}
        <div className="cr-wizard-header">
          <Stack direction="column" gap={0.5} style={{ minWidth: 0 }}>
            <Text variant="heading" tone="strong">New cluster run</Text>
            <Text variant="micro" tone="muted">
              {draft.method === "kmeans" ? `k-means · k=${draft.k}` : METHOD_OPTIONS.find((m) => m.id === draft.method)?.label} · {STORE_COUNT} stores
            </Text>
          </Stack>

          <div className="cr-steps">
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div className={`cr-step-item${i === wizardStep ? " is-active" : i < wizardStep ? " is-done" : ""}`}>
                  <div className="cr-step-circle">{i < wizardStep ? "✓" : i + 1}</div>
                  <div className="cr-step-label">{s}</div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`cr-step-connector${i < wizardStep ? " is-done" : ""}`} />
                )}
              </div>
            ))}
          </div>

          <Button variant="secondary" size="small" onClick={closeWizard}>Cancel</Button>
        </div>

        {/* Body */}
        <div className="cr-wizard-body">
          {promoted ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div className="cr-promote-success" style={{ maxWidth: 480 }}>
                <span style={{ fontSize: 28 }}>🎉</span>
                <Stack direction="column" gap={1}>
                  <Text variant="heading" style={{ color: color.success }}>CR-019 promoted to live!</Text>
                  <Text variant="caption" tone="muted">Previous set CR-018 has been archived. Returning to dashboard…</Text>
                </Stack>
              </div>
            </div>
          ) : (
            <>
              {wizardStep === 0 && <StepInput  draft={draft} setDraft={setDraft} />}
              {wizardStep === 1 && <StepAttributes draft={draft} setDraft={setDraft} />}
              {wizardStep === 2 && (
                <StepFinalize
                  draft={draft} runState={runState} runProgress={runProgress}
                  runPhase={runPhase} onRun={startRun} nextRunId="CR-019" onPromote={promoteToLive}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!promoted && (
          <div className="cr-wizard-footer">
            <Button variant="secondary" size="medium" onClick={closeWizard}>Cancel</Button>
            <div style={{ flex: 1 }} />
            {wizardStep > 0 && (
              <Button variant="secondary" size="medium" onClick={() => setWizardStep((s) => s - 1)}
                disabled={runState === "running"}>← Back</Button>
            )}
            {wizardStep < 2 && (
              <Button variant="primary" size="medium" onClick={() => setWizardStep((s) => s + 1)}
                disabled={!canContinue}>Continue →</Button>
            )}
            {wizardStep === 2 && runState === "idle"    && <Button variant="primary" size="medium" onClick={startRun}>Run clustering</Button>}
            {wizardStep === 2 && runState === "running" && <Button variant="primary" size="medium" disabled>Running…</Button>}
            {wizardStep === 2 && runState === "done"    && <Button variant="primary" size="medium" onClick={promoteToLive}>Promote to live →</Button>}
          </div>
        )}
      </div>
    );
  }

  /* ── Normal view ─────────────────────────────────────────────────────────── */
  return (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Location Clustering</Text>
            <Text variant="caption" tone="muted">
              {tab === "runs"
                ? `${STORE_COUNT} stores · ${ACTIVE_CLUSTER_SET.clusters.length} active clusters · ${ACTIVE_CLUSTER_SET.runId}`
                : `${STORE_COUNT} stores · ${sc.clusters.length} clusters · ${sc.name}`}
            </Text>
          </Stack>
          <Stack direction="row" gap={3} align="center" wrap>
            {tab === "scenarios" && scoreChips.map((m) => (
              <div key={m.l} className="cl-score">
                <Text variant="body-strong" tone={m.tone}>{m.v}</Text>
                <Text variant="micro" tone="subtle">{m.l}</Text>
              </div>
            ))}
            <div className="cr-tabs">
              <button className={`cr-tab${tab === "runs"      ? " is-active" : ""}`} onClick={() => setTab("runs")}>Cluster Runs</button>
              <button className={`cr-tab${tab === "scenarios" ? " is-active" : ""}`} onClick={() => setTab("scenarios")}>Scenario Explorer</button>
            </div>
            {tab === "runs" && <Button variant="primary" size="medium" onClick={openWizard}>+ New cluster run</Button>}
          </Stack>
        </Stack>
      </Card>

      {tab === "runs"      && <ClusterRunsDashboard onNewRun={openWizard} />}

      {tab === "scenarios" && (
        <>
          <Card sx={panelSx}>
            <Grid columns="1fr 1fr 1fr" gap={2}>
              {["A", "B", "C"].map((sid) => {
                const s2 = FD_CLUST_SCENARIOS[sid];
                const on = scenarioId === sid;
                return (
                  <Stack key={sid} className={`cl-scenario${on ? " is-active" : ""}`} direction="column" gap={1}
                    onClick={() => selectScenario(sid)}>
                    <Text variant="caption" tone={on ? "primary" : "default"} style={{ fontWeight: 700 }}>{sid}. {s2.badge}{on ? " ✓" : ""}</Text>
                    <Text variant="micro" tone={on ? "default" : "subtle"}>{scenarioTagline(s2.name)}</Text>
                  </Stack>
                );
              })}
            </Grid>
          </Card>

          <Stack className="cl-body" direction="row" gap={4} wrap>
            <Card sx={sidebarSx}>
              <Stack className="cl-sidebar" direction="column" gap={0}>
                <Stack className="cl-section-label" direction="row">
                  <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{sc.clusters.length} clusters — click to drill in</Text>
                </Stack>
                {sc.clusters.map((cl) => {
                  const on = activeClId === cl.id;
                  return (
                    <Stack key={cl.id} className={`cl-clusterrow${on ? " is-active" : ""}`} direction="column" gap={1}
                      onClick={() => toggleCluster(cl.id)} style={{ borderLeftColor: on ? cl.color : "transparent" }}>
                      <Stack direction="row" align="center" gap={2}>
                        <span className="cl-dot" style={{ background: cl.color }} />
                        <Text variant="caption" tone="strong" style={{ flex: 1, minWidth: 0 }} truncate>{cl.label}</Text>
                        <Badge variant="subtle" size="small" color={TIER_BADGE[cl.tier] || "info"} label={cap(cl.tier)} />
                      </Stack>
                      <Text variant="micro" tone="subtle" style={{ marginLeft: 18 }}>{cl.stores.length} stores · ${cl.revSqft}/sqft · {cl.st}% ST</Text>
                    </Stack>
                  );
                })}
                {FD_OUTLIER_STORES.length > 0 && (
                  <>
                    <Stack className="cl-section-label" direction="row">
                      <Text variant="micro" tone="warning" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>⚠ Outliers</Text>
                    </Stack>
                    {FD_OUTLIER_STORES.map((o) => {
                      const dec = outlierDecisions[o.id];
                      return (
                        <Stack key={o.id} direction="column" gap={2} paddingX={3} paddingY={2} style={{ borderBottom: "1px solid var(--color-border)" }}>
                          <Text variant="caption" tone="error" style={{ fontWeight: 600 }}>{o.name}</Text>
                          <Text variant="micro" tone="subtle">{o.reason}</Text>
                          {dec ? <Badge variant="subtle" size="small" color="success" label={dec} />
                            : (
                              <Stack direction="row" gap={2} wrap>
                                {OUTLIER_OPTIONS.map((opt) => (
                                  <Button key={opt} variant="secondary" size="small" onClick={() => setOutlier(o.id, opt)}>{opt}</Button>
                                ))}
                              </Stack>
                            )}
                        </Stack>
                      );
                    })}
                  </>
                )}
              </Stack>
            </Card>

            <Stack direction="column" gap={3} flex="1 1 420px" style={{ minWidth: 0 }}>
              <Card sx={{ ...panelSx, padding: "var(--sp-3) var(--sp-4)", background: "var(--color-surface-alt)", borderColor: "var(--color-teal)" }}>
                <Text variant="caption" tone="default">{sc.note}</Text>
              </Card>

              {!activeCl ? (
                <Stack direction="column" gap={3}>
                  <Text variant="body-strong" tone="strong">{sc.name} — all clusters</Text>
                  {sc.clusters.map((cl) => {
                    const stores = clusterStores(cl);
                    return (
                      <div key={cl.id} style={{ borderRadius: "var(--r)", border: "1px solid var(--color-border)", overflow: "hidden", background: "var(--color-surface)", boxShadow: "var(--sh)" }}>
                        <Stack direction="row" align="center" gap={3} paddingX={4} paddingY={3}
                          style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)" }} wrap>
                          <span className="cl-dot" style={{ width: 12, height: 12, background: cl.color }} />
                          <Stack direction="column" gap={0} flex="1 1 auto" style={{ minWidth: 0 }}>
                            <Text variant="caption" tone="strong">{cl.label}</Text>
                            <Text variant="micro" tone="subtle">{stores.length} stores · ${cl.revSqft}/sqft avg · {cl.st}% sell-through</Text>
                          </Stack>
                          <SignalChips signals={cl.signals} />
                        </Stack>
                        <Grid className="cl-storehead" columns={PREVIEW_COLS} gap={0}>
                          {["Store #", "Name", "Market", "State", "DC", "Vel.", "Band %"].map((c) => (
                            <Text key={c} variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase" }}>{c}</Text>
                          ))}
                        </Grid>
                        {stores.map((s, i) => (
                          <Grid key={s.id} className={`cl-storerow${i % 2 ? "" : " alt"}`} columns={PREVIEW_COLS} gap={0}>
                            <Text variant="micro" mono style={{ fontWeight: 700, color: color.teal }}>{s.id}</Text>
                            <Text variant="micro" truncate>{s.name}</Text>
                            <Text variant="micro" tone="muted">{s.market}</Text>
                            <Text variant="micro" tone="subtle" mono>{s.state}</Text>
                            <Text variant="micro" tone="subtle" mono>{s.dc}</Text>
                            <Text variant="micro" mono style={{ color: VEL_COLOR[s.velocity] || color.text, fontWeight: 700 }}>{s.velocity}</Text>
                            <Text variant="micro" tone="muted" mono>{BAND_PCT[s.velocity] || "—"}</Text>
                          </Grid>
                        ))}
                      </div>
                    );
                  })}
                </Stack>
              ) : (
                <Stack direction="column" gap={3}>
                  <Stack direction="row" align="center" gap={2} wrap>
                    <span className="cl-dot" style={{ width: 14, height: 14, background: activeCl.color }} />
                    <Text variant="heading" tone="strong">{activeCl.label}</Text>
                    <Button variant="secondary" size="small" onClick={() => setActiveClId(null)} style={{ marginLeft: "auto" }}>← All clusters</Button>
                  </Stack>
                  <Text variant="caption" tone="subtle">{clusterStores(activeCl).length} stores · ${activeCl.revSqft}/sqft · {activeCl.st}% ST</Text>
                  <SignalChips signals={activeCl.signals} size="medium" />
                  <Table defaultColDef={{ floatingFilter: true }} cardContainer rowHeight="compact"
                    tableHeader={activeCl.label} columnDefs={detailColumns} rowData={detailRows}
                    domLayout="autoHeight" hideTableSetting hideTableActions pagination={false} />
                  <div>
                    <Button variant="primary" size="medium" onClick={() => onNavigate?.("store-curation")}>Open store curation →</Button>
                  </div>
                </Stack>
              )}
            </Stack>
          </Stack>
        </>
      )}
    </Stack>
  );
}
