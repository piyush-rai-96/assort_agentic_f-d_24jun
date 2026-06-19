import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card, Button, Badge, Table, Chips, Input, Checkbox } from "impact-ui";
import { BarChart2, Users, Tag, Cpu, AlertTriangle, CheckCircle2, MapPin, TrendingUp, Building2, ChevronLeft, ChevronRight, Play, Bot, Database, Layers, Check, ScanLine, RefreshCw } from "lucide-react";
import Text from "../components/Text.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
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
  WIZARD_DEFAULTS, SCOPE_OPTIONS, METHOD_OPTIONS,
  previewClusters,
  /* analytics */
  PREVIEW_CLUSTER_STORES, NETWORK_AVERAGES, VEL_SCORE_LABEL,
} from "../data/clustering.js";
import "./Clustering.css";
import { panelSx } from "../styles/panelSx.js";

/* ── Shared panel style ─────────────────────────────────────────────────── */
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
      {/* Left: radar + deviation bars */}
      <div className="cr-form-section">
        {/* Colored accent bar at top */}
        <div className="cr-fingerprint-accent" style={{ background: cluster.color }} />
        <div className="cr-form-section-header">
          <Stack direction="row" align="center" gap={2}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: cluster.color, flexShrink: 0, boxShadow: `0 0 0 3px ${cluster.color}22` }} />
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
            <Stack direction="column" gap={4} style={{ flex: 1, minWidth: 0 }}>
              {/* Legend */}
              <Stack direction="column" gap={2}>
                <div className="cr-radar-legend-item-v2">
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: cluster.color, flexShrink: 0 }} />
                  <Text variant="micro" tone="strong" style={{ fontWeight: 700 }}>{cluster.name}</Text>
                </div>
                <div className="cr-radar-legend-item-v2">
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: "var(--ice2)", border: "1.5px dashed var(--color-border-strong)", flexShrink: 0 }} />
                  <Text variant="micro" tone="subtle">Network average</Text>
                </div>
              </Stack>
              {/* Deviation bars */}
              <Stack direction="column" gap={3}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".07em" }}>vs Network avg</Text>
                {attrRows.map((r) => (
                  <Stack key={r.label} direction="column" gap={1}>
                    <Text variant="micro" tone="muted" style={{ fontWeight: 600 }}>{r.label}</Text>
                    <DeviationBar storeVal={r.storeVal} avgVal={r.avg} maxVal={r.max} unit={r.unit} positive={r.positive} />
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </div>
        </div>
      </div>

      {/* Right: cluster insights + key drivers */}
      <Stack direction="column" gap={3}>

        {/* Cluster insights card */}
        <div className="cr-insight-card">
          <div className="cr-insight-card-header">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: cluster.color, boxShadow: `0 0 0 3px ${cluster.color}22` }} />
            <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>Cluster insights</Text>
          </div>
          <div className="cr-insight-card-body">
            {[
              {
                bg: "var(--color-success-soft)", color: "var(--color-success)",
                icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" fill="var(--color-success)" opacity=".18"/><path d="M4 7.5l2 2 4-4" stroke="var(--color-success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                text: `${stats.proSplit}% Pro mix — ${stats.proSplit > NETWORK_AVERAGES.proSplit ? "above" : "below"} network avg by ${Math.abs(Math.round(stats.proSplit - NETWORK_AVERAGES.proSplit))}pp`,
              },
              {
                bg: "var(--color-info-soft)", color: "var(--color-info)",
                icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="2" y="2" width="10" height="10" rx="3" fill="var(--color-info)" opacity=".18"/><rect x="4" y="6" width="6" height="1.5" rx=".75" fill="var(--color-info)"/><rect x="4" y="8.5" width="4" height="1.5" rx=".75" fill="var(--color-info)"/></svg>,
                text: `Avg store size ${stats.sqftK}k sqft — ${stats.sqftK > NETWORK_AVERAGES.sqftK ? "larger" : "smaller"} than typical network store`,
              },
              {
                bg: "var(--color-warning-soft)", color: "var(--color-warning)",
                icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><polygon points="7,2 9,6 13,6.5 10,9.5 10.5,13 7,11 3.5,13 4,9.5 1,6.5 5,6" fill="var(--color-warning)" opacity=".25"/><polygon points="7,3.5 8.5,6.5 12,7 9.5,9.5 10,12.5 7,11 4,12.5 4.5,9.5 2,7 5.5,6.5" fill="var(--color-warning)"/></svg>,
                text: `Velocity ${VEL_SCORE_LABEL[Math.round(stats.velScore)] || "B"} — ${stats.velScore < NETWORK_AVERAGES.velScore ? "faster" : "slower"} than network median`,
              },
              {
                bg: "var(--color-accent-soft)", color: "var(--color-accent)",
                icon: <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M7 2l1.5 3.5H12l-2.8 2 1 3.5L7 9.5 3.8 11l1-3.5L2 5.5h3.5L7 2z" fill="var(--color-accent)" opacity=".25"/><path d="M7 3.5l1.1 2.6H11l-2.2 1.6.8 2.6L7 8.5l-2.6 1.8.8-2.6L3 6.1h2.9L7 3.5z" fill="var(--color-accent)"/></svg>,
                text: `${stats.catTile}% tile sales share — ${stats.catTile > NETWORK_AVERAGES.catTile ? "tile-heavy" : "LVP-heavy"} assortment profile`,
              },
            ].map((r, i) => (
              <div key={i} className="cr-insight-item">
                <div className="cr-insight-icon" style={{ background: r.bg }}>
                  {r.icon}
                </div>
                <Text variant="micro" tone="muted" style={{ lineHeight: 1.5 }}>{r.text}</Text>
              </div>
            ))}
          </div>
        </div>

        {/* Key drivers card */}
        <div className="cr-insight-card">
          <div className="cr-insight-card-header">
            <div style={{ width: 8, height: 8, borderRadius: 2, background: cluster.color }} />
            <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>Key drivers of inclusion</Text>
          </div>
          <div className="cr-insight-card-body">
            <Text variant="micro" tone="subtle" style={{ marginTop: -4, marginBottom: 4 }}>Stores are assigned to this cluster primarily based on:</Text>
            {["Pro / DIY revenue split", "Sales velocity tier", "Category mix index"].map((d, i) => {
              const pct = [78, 65, 52][i];
              return (
                <div key={i} className="cr-driver-row">
                  <div className="cr-driver-label-row">
                    <Stack direction="row" align="center" gap={2}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: cluster.color, flexShrink: 0 }} />
                      <Text variant="micro" tone="muted" style={{ fontWeight: 600 }}>{d}</Text>
                    </Stack>
                    <span className="cr-driver-pct" style={{ color: cluster.color }}>{pct}%</span>
                  </div>
                  <div className="cr-driver-bar-track">
                    <div className="cr-driver-bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${cluster.color}aa, ${cluster.color})` }} />
                  </div>
                </div>
              );
            })}
          </div>
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
        {/* Cluster selector chips */}
        <Stack direction="row" gap={2} wrap>
          {managedClusters.map((c) => (
            <Chips
              key={c.id}
              label={`${c.name} (${c.storeList?.length ?? c.stores})`}
              isActive={c.id === selectedId}
              onClick={() => { setSelectedId(c.id); setExpandedId(null); }}
            />
          ))}
        </Stack>

        {/* Change log banner */}
        {hasChanges && (
          <div className="cr-change-banner">
            <RefreshCw size={15} style={{ color: color.info, flexShrink: 0 }} />
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
                    style={{ padding: "2px 6px", fontSize: "var(--fs-micro)" }}>
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
                        <span className="cr-insight-icon" aria-hidden="true">↗</span>
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
            <Input
              id="cr-store-search"
              placeholder="Search by name, state, or region…"
              value={addSearch}
              onChange={(e) => setAddSearch(e.target.value)}
              size="medium"
            />
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
            <Text variant="caption" style={{ color: color.teal, fontWeight: 700 }}>Insight: Store reassignment</Text>
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
      {/* Premium header banner */}
      <div className="cr-analytics-header">
        <Stack direction="column" gap={1}>
          <Stack direction="row" align="center" gap={2}>
            <Text variant="heading" tone="strong">Cluster analytics</Text>
            <span className="cr-analytics-header-badge">CR-019 · Live</span>
          </Stack>
          <Text variant="caption" tone="muted">Post-run analysis and store management</Text>
        </Stack>
        <Stack direction="row" gap={2} align="center" wrap>
          <Stack direction="column" gap={0.5} style={{ textAlign: "center" }}>
            <Text variant="caption" tone="strong" style={{ fontWeight: 800 }}>{managedClusters.length}</Text>
            <Text variant="micro" tone="subtle" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>clusters</Text>
          </Stack>
          <div style={{ width: 1, height: 28, background: "var(--color-border)" }} />
          <Stack direction="column" gap={0.5} style={{ textAlign: "center" }}>
            <Text variant="caption" tone="strong" style={{ fontWeight: 800 }}>
              {managedClusters.reduce((s, c) => s + (c.storeList?.length ?? c.stores ?? 0), 0)}
            </Text>
            <Text variant="micro" tone="subtle" style={{ textTransform: "uppercase", letterSpacing: ".06em", fontWeight: 700 }}>stores</Text>
          </Stack>
          <div style={{ width: 1, height: 28, background: "var(--color-border)" }} />
          <NetworkDistBar clusters={managedClusters} />
        </Stack>
      </div>

      <Stack direction="row" gap={2} wrap style={{ marginTop: "var(--sp-4)", marginBottom: "var(--sp-3)" }}>
        {TABS.map((t) => (
          <Chips key={t.id} label={t.label} isActive={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </Stack>

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
          {/* Cluster selector chips — color-aware */}
          <Stack direction="row" gap={2} wrap>
            {managedClusters.map((c) => (
              <Chips
                key={c.id}
                label={c.name}
                isActive={c.id === fpClusterId}
                onClick={() => setFpClusterId(c.id)}
              />
            ))}
          </Stack>
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

/* ══════════════════════════════════════════════════════════════════════════
   WIZARD SUB-SCREENS
   ════════════════════════════════════════════════════════════════════════════ */

/* ── Agentic pipeline definition ─────────────────────────────────────────── */
const CLUSTER_PIPELINE = [
  {
    id: "load",     Icon: Database,    tone: "primary",
    title: "Loading store profiles",
    sub:   "Reading store-level attributes, velocity bands, and category mix…",
    result: (draft) => `${STORE_COUNT} stores loaded · ${draft.dept !== "All" ? draft.dept : "All depts"} · ${draft.channel}`,
  },
  {
    id: "norm",     Icon: Layers,      tone: "info",
    title: "Normalising features",
    sub:   "Standardising pro-split, velocity, sqft, and category indexes…",
    result: () => "Features scaled to [0,1] · 4 dimensions · outliers flagged",
  },
  {
    id: "matrix",   Icon: ScanLine,    tone: "info",
    title: "Computing similarity matrix",
    sub:   "Pairwise cosine distances across all store pairs…",
    result: () => `${STORE_COUNT}×${STORE_COUNT} matrix · cosine similarity`,
  },
  {
    id: "cluster",  Icon: Cpu,         tone: "primary",
    title: "Running clustering algorithm",
    sub:   "Generating Behavioral, Geographic, and DC-based scenarios…",
    result: (draft) => `3 scenarios computed for ${draft.season} · converged in 18 iterations`,
  },
  {
    id: "cohesion", Icon: BarChart2,   tone: "success",
    title: "Scoring cohesion & business fit",
    sub:   "Intra-cluster variance · silhouette index · business actionability…",
    result: () => "Avg cohesion 0.80 · Behavioral scores highest at 0.91 composite",
  },
  {
    id: "ready",    Icon: CheckCircle2, tone: "success",
    title: "Scenarios ready for review",
    sub:   "Generating comparison cards and store assignments…",
    result: () => "A=Geographic · B=Behavioral ★ · C=DC-based — pick one to accept",
  },
];

/* ── Step 0 — Define Scope ──────────────────────────────────────────────── */
const DEPT_OPTS    = ["All", "Wood", "Tile", "Laminate & Vinyl"];
const CHANNEL_OPTS = ["All Stores", "Brick & Mortar", "Online"];
const SEASON_OPTS  = ["SS25", "FW25", "SS26", "FW26", "SS27"];

function RadioList({ options, value, name, onChange }) {
  return (
    <Stack direction="column" gap={1}>
      {options.map((opt) => {
        const on = value === opt;
        return (
          <label key={opt} className={`cr-radio-card${on ? " is-selected" : ""}`}
            style={{ cursor: "pointer" }} onClick={() => onChange(opt)}>
            <input type="radio" name={name} value={opt} checked={on}
              onChange={() => onChange(opt)}
              style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
            <div className="cr-radio-dot" />
            <Text variant="caption" tone={on ? "primary" : "muted"}
              style={{ fontWeight: on ? 600 : 400 }}>{opt}</Text>
          </label>
        );
      })}
    </Stack>
  );
}

function StepScope({ draft, setDraft }) {
  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div className="cr-step-grid">
      <Stack direction="column" gap={4}>
        {/* Run details */}
        <div className="cr-form-section">
          <div className="cr-form-section-header">
            <Text variant="body-strong" tone="strong">Run details</Text>
          </div>
          <div className="cr-form-section-body">
            <Input
              id="cr-run-name"
              label="Run name"
              isRequired
              value={draft.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. SS26 Behavioral network run"
            />
          </div>
        </div>

        {/* Scope */}
        <div className="cr-form-section">
          <div className="cr-form-section-header">
            <Stack direction="row" align="center" gap={2}>
              <Text variant="body-strong" tone="strong">Clustering scope</Text>
              <Text variant="micro" tone="subtle">Department · Channel · Season</Text>
            </Stack>
          </div>
          <div className="cr-form-section-body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--sp-5)" }}>
              <Stack direction="column" gap={2}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Department</Text>
                <RadioList options={DEPT_OPTS} value={draft.dept} name="scope-dept" onChange={(v) => update("dept", v)} />
              </Stack>
              <Stack direction="column" gap={2}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Channel</Text>
                <RadioList options={CHANNEL_OPTS} value={draft.channel} name="scope-channel" onChange={(v) => update("channel", v)} />
              </Stack>
              <Stack direction="column" gap={2}>
                <Text variant="micro" tone="subtle" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Season</Text>
                <RadioList options={SEASON_OPTS} value={draft.season} name="scope-season" onChange={(v) => update("season", v)} />
              </Stack>
            </div>
          </div>
        </div>
      </Stack>

      {/* Right info rail */}
      <div className="cr-info-rail">
        <div className="cr-info-box">
          <Stack direction="column" gap={3}>
            <Text variant="body-strong" tone="strong">What happens next</Text>
            {[
              "Select the signals that drive cluster similarity",
              "Agent generates 3 scenarios to compare",
              "Review, pick, and accept the best fit",
            ].map((step, i) => (
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
            <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>CR-018 · Behavioral · {STORE_COUNT} stores</Text>
            <Text variant="micro" tone="muted">Cohesion 0.80 · Jan 12, 2026</Text>
            <Text variant="micro" tone="subtle" style={{ marginTop: 2 }}>Author: D. Rivera</Text>
          </Stack>
        </div>
        <div className="cr-info-box" style={{ background: "var(--color-primary-soft)", borderColor: "var(--color-primary)" }}>
          <Stack direction="column" gap={1}>
            <Text variant="caption" style={{ fontWeight: 600, color: "var(--color-primary)" }}>Tip</Text>
            <Text variant="micro" style={{ color: "var(--color-primary)" }}>
              Running with the same scope as CR-018 gives the most comparable cohesion benchmark.
            </Text>
          </Stack>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1 — Select Signals ─────────────────────────────────────────────── */
const SIGNAL_OPTS = [
  {
    key: "performance",
    Icon: BarChart2,
    label: "Performance",
    desc: "R13 sqft/wk · Sell-through · Velocity band · On-hand turnover",
  },
  {
    key: "demographics",
    Icon: Users,
    label: "Demographics",
    desc: "Market population · Median income · Housing starts · Store maturity",
  },
  {
    key: "attributes",
    Icon: Tag,
    label: "Product attributes",
    desc: "Top sub-depts · Price tier mix · Format penetration · Category spread",
  },
];

const SCENARIO_INFO = [
  { letter: "A", Icon: MapPin,    name: "Geographic",        desc: "Familiar region-based groupings — fast to explain, limited behavioral depth." },
  { letter: "B", Icon: TrendingUp, name: "Behavioral",       desc: "Groups stores by how they actually sell — velocity, basket, DIY vs Pro mix.", recommended: true },
  { letter: "C", Icon: Building2, name: "DC-based Operational", desc: "Logistics-optimised groupings aligned to distribution centre networks." },
];

function StepSignals({ draft, setDraft }) {
  const toggleParam = (key) =>
    setDraft((d) => ({ ...d, params: { ...d.params, [key]: !d.params[key] } }));
  const selCount = Object.values(draft.params).filter(Boolean).length;

  return (
    <div className="cr-step-grid">
      <Stack direction="column" gap={4}>
        <Stack direction="row" align="center" gap={3}>
          <Text variant="body-strong" tone="strong">Select clustering signals</Text>
          <Badge
            variant="subtle" size="small"
            color={selCount === 0 ? "error" : selCount === 1 ? "warning" : "success"}
            label={selCount === 0 ? "Select at least one" : `${selCount} selected — ${selCount >= 2 ? "strong signal mix" : "add more for richer results"}`}
          />
        </Stack>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--sp-3)" }}>
          {SIGNAL_OPTS.map((opt) => {
            const on = draft.params[opt.key];
            const { Icon } = opt;
            return (
              <div
                key={opt.key}
                className="cr-form-section"
                style={{
                  cursor: "pointer",
                  borderColor: on ? "var(--color-primary)" : "var(--color-border)",
                  background: on ? "var(--color-primary-soft)" : "var(--color-surface)",
                  transition: "all 0.15s",
                }}
                onClick={() => toggleParam(opt.key)}
              >
                <div className="cr-form-section-body">
                  <Stack direction="column" gap={3}>
                    <Stack direction="row" justify="space-between" align="flex-start">
                      <div style={{
                        width: 36, height: 36, borderRadius: "var(--r2)",
                        background: on ? "var(--color-primary)" : "var(--color-surface-alt)",
                        border: `1px solid ${on ? "var(--color-primary)" : "var(--color-border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <Icon size={18} color={on ? "white" : "var(--color-text-muted)"} strokeWidth={1.75} />
                      </div>
                      <Checkbox checked={on} onChange={() => toggleParam(opt.key)} />
                    </Stack>
                    <Stack direction="column" gap={1}>
                      <Text variant="caption" tone={on ? "primary" : "strong"} style={{ fontWeight: 700 }}>{opt.label}</Text>
                      <Text variant="micro" tone="subtle" style={{ lineHeight: 1.5 }}>{opt.desc}</Text>
                    </Stack>
                  </Stack>
                </div>
              </div>
            );
          })}
        </div>
      </Stack>

      {/* Right: which scenarios will be generated */}
      <Stack direction="column" gap={4}>
        <div className="cr-preview-panel">
          <div className="cr-form-section-header" style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)", padding: "var(--sp-3) var(--sp-4)" }}>
            <Stack direction="row" align="center" justify="space-between">
              <Text variant="body-strong" tone="strong">Agent will generate</Text>
              <Badge variant="subtle" size="small" color="info" label="3 scenarios" />
            </Stack>
          </div>
          {SCENARIO_INFO.map((s) => {
            const { Icon: SIcon } = s;
            return (
              <div key={s.letter} className="cr-preview-cluster">
                <div className="cr-preview-cluster-header" style={{ alignItems: "flex-start" }}>
                  <Stack direction="row" align="flex-start" gap={3} style={{ flex: 1 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "var(--r2)",
                      background: "var(--color-surface-alt)", border: "1px solid var(--color-border)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <SIcon size={14} color="var(--color-text-muted)" strokeWidth={1.75} />
                    </div>
                    <Stack direction="column" gap={0.5} style={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" align="center" gap={2} wrap>
                        <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>{s.letter}. {s.name}</Text>
                        {s.recommended && <Badge variant="subtle" size="small" color="success" label="Recommended" />}
                      </Stack>
                      <Text variant="micro" tone="subtle" style={{ lineHeight: 1.4 }}>{s.desc}</Text>
                    </Stack>
                  </Stack>
                </div>
              </div>
            );
          })}
          <div style={{ padding: "var(--sp-3) var(--sp-4)", background: "var(--color-surface-sunken)", borderTop: "1px solid var(--color-border)" }}>
            <Text variant="micro" tone="subtle">Each scenario is scored on composite quality, statistical fit, and business actionability.</Text>
          </div>
        </div>

        <div className="cr-info-box">
          <Stack direction="column" gap={1}>
            <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>Signal guidance</Text>
            <Text variant="micro" tone="subtle">
              Performance alone produces the sharpest behavioral clusters. Add Demographics to identify growth markets. Product Attributes adds assortment-level nuance.
            </Text>
          </Stack>
        </div>
      </Stack>
    </div>
  );
}

/* ── Step 2 — Review & Accept ────────────────────────────────────────────── */
function StepReview({ draft, runState, runProgress, runStep, onRun, nextRunId, onPromote }) {
  const preview = useMemo(
    () => previewClusters(draft.k, draft.attrs.length, draft.method),
    [draft.k, draft.attrs.length, draft.method]
  );

  const [selectedScenario, setSelectedScenario] = useState(null);
  const [managedClusters, setManagedClusters]   = useState(null);
  const [availableStores, setAvailableStores]   = useState(null);

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

  const signalNames = useMemo(
    () => SIGNAL_OPTS.filter((s) => draft.params[s.key]).map((s) => s.label),
    [draft.params]
  );

  const REVIEW_SCENARIOS = [
    {
      key: "A",
      Icon: MapPin,
      name: "Geographic",
      subtitle: "Clustered by region and location",
      ...FD_CLUST_SCENARIOS.A,
    },
    {
      key: "B",
      Icon: TrendingUp,
      name: "Behavioral",
      subtitle: "Groups stores by how they actually sell",
      recommended: true,
      ...FD_CLUST_SCENARIOS.B,
    },
    {
      key: "C",
      Icon: Building2,
      name: "DC-based Operational",
      subtitle: "Optimised for logistics & replenishment",
      ...FD_CLUST_SCENARIOS.C,
    },
  ];

  const scopeSummary = [
    draft.dept !== "All" ? draft.dept : "All depts",
    draft.channel,
    draft.season,
  ].join(" · ");

  return (
    <Stack direction="column" gap={5}>
      {/* ── Run summary + controls ── */}
      <div className="cr-step-grid">
        <Stack direction="column" gap={4}>
          {/* Summary card */}
          <div className="cr-form-section">
            <div className="cr-form-section-header">
              <Text variant="body-strong" tone="strong">Run summary</Text>
            </div>
            <div className="cr-form-section-body">
              <Stack direction="column" gap={3}>
                {[
                  ["Name",    draft.name || "(untitled)"],
                  ["Scope",   scopeSummary],
                  ["Signals", `${signalNames.join(", ") || "—"}`],
                  ["Stores",  `${STORE_COUNT} in scope`],
                ].map(([k, v]) => (
                  <Stack key={k} direction="row" gap={3} align="flex-start">
                    <Text variant="caption" tone="muted" style={{ fontWeight: 600, minWidth: 80 }}>{k}</Text>
                    <Text variant="caption" tone="strong" style={{ fontWeight: 600 }}>{v}</Text>
                  </Stack>
                ))}
              </Stack>
            </div>
          </div>

          {/* Warning */}
          {runState !== "done" && (
            <div className="cr-warning-banner">
              <AlertTriangle size={16} color={color.warning} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
              <Stack direction="column" gap={0.5}>
                <Text variant="caption" tone="strong" style={{ fontWeight: 700, color: color.warning }}>Preview only</Text>
                <Text variant="micro" tone="muted">This run produces a preview cluster set. Live recommendations remain unchanged until you accept and promote a scenario.</Text>
              </Stack>
            </div>
          )}

          {/* Idle */}
          {runState === "idle" && (
            <div style={{ textAlign: "center", padding: "var(--sp-8) var(--sp-6)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
              <Stack direction="column" gap={4} align="center">
                <div style={{
                  width: 52, height: 52, borderRadius: "var(--r)",
                  background: "var(--color-primary-soft)", border: "1px solid var(--color-border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Cpu size={24} color="var(--color-primary)" strokeWidth={1.5} />
                </div>
                <Stack direction="column" gap={1} align="center">
                  <Text variant="body-strong" tone="strong">Ready to run</Text>
                  <Text variant="caption" tone="muted">Agent will generate 3 scenarios — est. ~12 seconds</Text>
                </Stack>
                <Button variant="primary" size="large" onClick={onRun}>
                  <Play size={14} style={{ marginRight: 6 }} />
                  Run clustering
                </Button>
              </Stack>
            </div>
          )}

          {/* Running — agentic pipeline panel */}
          {runState === "running" && (
            <div className="cr-agent-run">
              {/* Header */}
              <div className="cr-agent-run-head">
                <div className="cr-agent-bot">
                  <Bot size={20} strokeWidth={1.5} />
                </div>
                <div className="cr-agent-run-head-txt">
                  <Text variant="subheading" tone="primary">
                    Agent is generating cluster scenarios…
                  </Text>
                  <Text variant="caption" tone="muted">
                    Step {Math.min(runStep + 1, CLUSTER_PIPELINE.length)} of {CLUSTER_PIPELINE.length} · {CLUSTER_PIPELINE[runStep]?.title ?? ""}
                  </Text>
                </div>
                <Text variant="kpi" tone="primary">{runProgress}%</Text>
              </div>

              {/* Progress bar */}
              <div className="cr-agent-run-bar">
                <div className="cr-agent-run-bar-fill" style={{ width: `${runProgress}%` }} />
              </div>

              {/* Step list + console */}
              <div className="cr-agent-run-grid">
                {/* Pipeline steps */}
                <ol className="cr-agent-steps">
                  {CLUSTER_PIPELINE.map((s, i) => {
                    const state = i < runStep ? "done" : i === runStep ? "active" : "queued";
                    const { Icon: SIcon } = s;
                    return (
                      <li key={s.id} className={`cr-agent-step is-${state}`}>
                        <span className={`cr-agent-step-ico tone-${s.tone}`}>
                          {state === "done"
                            ? <Check size={12} strokeWidth={2.5} />
                            : state === "active"
                              ? <span className="cr-agent-spin" />
                              : <SIcon size={12} strokeWidth={1.75} />}
                        </span>
                        <div className="cr-agent-step-body">
                          <span className="cr-agent-step-title">{s.title}</span>
                          <span className="cr-agent-step-sub">
                            {state === "active"
                              ? <>{s.sub}<span className="cr-agent-dots" /></>
                              : state === "done"
                                ? s.result(draft)
                                : "Waiting…"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>

                {/* Terminal console */}
                <div className="cr-agent-console">
                  <div className="cr-agent-console-bar">
                    <span className="cr-agent-dot cr-dot-r" />
                    <span className="cr-agent-dot cr-dot-y" />
                    <span className="cr-agent-dot cr-dot-g" />
                    <span className="cr-agent-console-title">cluster-agent · trace</span>
                  </div>
                  <div className="cr-agent-console-body">
                    <div className="cr-agent-log cr-agent-log-muted">
                      $ cluster-agent run --dept {draft.dept} --season {draft.season} --stores {STORE_COUNT}
                    </div>
                    {CLUSTER_PIPELINE.slice(0, runStep).map((s) => (
                      <div key={s.id} className="cr-agent-log">
                        <span className="cr-agent-log-ok">✓</span> {s.title}{" "}
                        <span className="cr-agent-log-muted">— {s.result(draft)}</span>
                      </div>
                    ))}
                    {runStep < CLUSTER_PIPELINE.length && (
                      <div className="cr-agent-log cr-agent-log-run">
                        <span className="cr-agent-log-arrow">▸</span>{" "}
                        {CLUSTER_PIPELINE[runStep]?.title}
                        <span className="cr-agent-cursor" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Stack>

        {/* Right: config recap */}
        <div className="cr-info-rail">
          <div className="cr-info-box">
            <Stack direction="column" gap={3}>
              <Text variant="body-strong" tone="strong">Configuration</Text>
              {[
                ["Dept",    draft.dept],
                ["Channel", draft.channel],
                ["Season",  draft.season],
                ["Est. runtime", "~12 seconds"],
              ].map(([k, v]) => (
                <Stack key={k} direction="row" justify="space-between" align="flex-start">
                  <Text variant="micro" tone="subtle" style={{ fontWeight: 600 }}>{k}</Text>
                  <Text variant="micro" tone="strong" style={{ fontWeight: 700, textAlign: "right" }}>{v}</Text>
                </Stack>
              ))}
              {signalNames.length > 0 && (
                <Stack direction="row" gap={1} wrap style={{ borderTop: "1px solid var(--color-border)", paddingTop: 8 }}>
                  {signalNames.map((n) => <span key={n} className="cr-cat-pill">{n}</span>)}
                </Stack>
              )}
            </Stack>
          </div>

          {runState === "done" && (
            <div className="cr-info-box" style={{ background: "var(--color-success-soft)", borderColor: color.success }}>
              <Stack direction="column" gap={2}>
                <Stack direction="row" align="center" gap={2}>
                  <CheckCircle2 size={16} color={color.success} strokeWidth={2} />
                  <Text variant="caption" style={{ fontWeight: 700, color: color.success }}>3 scenarios ready</Text>
                </Stack>
                <Text variant="micro" style={{ color: color.success }}>
                  Compare below, pick the best fit, and accept to use it as the active model. CR-018 will be archived.
                </Text>
              </Stack>
            </div>
          )}
        </div>
      </div>

      {/* ── Scenario cards — only when run is done ── */}
      {runState === "done" && (
        <Stack direction="column" gap={4}>
          <Stack direction="row" align="center" gap={3}>
            <Text variant="heading" tone="strong">Choose a scenario</Text>
            <Badge variant="subtle" size="small" color="info" label={nextRunId} />
            {selectedScenario && (
              <Text variant="caption" tone="muted" style={{ marginLeft: "auto" }}>
                Selected: <strong>{REVIEW_SCENARIOS.find((s) => s.key === selectedScenario)?.name}</strong>
              </Text>
            )}
          </Stack>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-4)" }}>
            {REVIEW_SCENARIOS.map((sc) => {
              const isSelected = selectedScenario === sc.key;
              const avgCohesion = sc.clusters.length
                ? (sc.clusters.reduce((s, c) => s + (c.cohesion ?? 0.72), 0) / sc.clusters.length).toFixed(2)
                : "—";
              return (
                <div
                  key={sc.key}
                  className={`cr-scenario-card${isSelected ? " is-selected" : ""}`}
                  onClick={() => setSelectedScenario(sc.key)}
                >
                  {/* Card header */}
                  <div className="cr-scenario-card-header">
                    <Stack direction="row" align="center" gap={3} style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "var(--r2)",
                        background: isSelected ? "var(--color-primary)" : "var(--color-surface-alt)",
                        border: `1px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        transition: "all 0.15s",
                      }}>
                        <sc.Icon size={16} color={isSelected ? "white" : "var(--color-text-muted)"} strokeWidth={1.75} />
                      </div>
                      <Stack direction="column" gap={0.5} style={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" align="center" gap={2} wrap>
                          <Text variant="caption" tone="strong" style={{ fontWeight: 700 }}>{sc.key}. {sc.name}</Text>
                          {sc.recommended && <Badge variant="subtle" size="small" color="success" label="Agent recommended" />}
                        </Stack>
                        <Text variant="micro" tone="subtle">{sc.subtitle}</Text>
                      </Stack>
                    </Stack>
                    <div className={`cr-scenario-radio${isSelected ? " is-on" : ""}`} />
                  </div>

                  {/* Score row */}
                  <div className="cr-scenario-scores">
                    {[
                      { label: "Composite", value: `${sc.composite}%`, color: sc.composite >= 85 ? color.success : sc.composite >= 75 ? color.info : color.warning },
                      { label: "Statistical", value: `${sc.statScore}%`, color: color.info },
                      { label: "Business", value: `${sc.bizScore}%`, color: color.primary },
                    ].map((m) => (
                      <Stack key={m.label} direction="column" gap={0.5} align="center">
                        <Text variant="body-strong" style={{ fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</Text>
                        <Text variant="micro" tone="subtle" style={{ textTransform: "uppercase", letterSpacing: ".05em", fontWeight: 600 }}>{m.label}</Text>
                      </Stack>
                    ))}
                  </div>

                  {/* Clusters */}
                  <div className="cr-scenario-clusters">
                    {sc.clusters.slice(0, 4).map((cl) => (
                      <Stack key={cl.id} direction="row" align="center" gap={2} style={{ padding: "4px 0" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cl.color, flexShrink: 0 }} />
                        <Text variant="micro" tone="muted" truncate style={{ flex: 1, minWidth: 0 }}>{cl.label}</Text>
                        <Text variant="micro" tone="subtle" mono>{cl.stores?.length ?? cl.stores} stores</Text>
                      </Stack>
                    ))}
                    {sc.clusters.length > 4 && (
                      <Text variant="micro" tone="subtle" style={{ paddingTop: 2 }}>+{sc.clusters.length - 4} more clusters</Text>
                    )}
                    {sc.clusters.length === 0 && (
                      <Text variant="micro" tone="subtle">—</Text>
                    )}
                  </div>

                  {/* Note */}
                  <div className="cr-scenario-note">
                    <Text variant="micro" tone="subtle" style={{ lineHeight: 1.5 }}>{sc.note}</Text>
                  </div>

                  {/* Network distribution */}
                  {sc.clusters.length > 0 && (
                    <div style={{ padding: "var(--sp-3) var(--sp-4)", borderTop: "1px solid var(--color-border)" }}>
                      <NetworkDistBar clusters={sc.clusters.map((c) => ({ ...c, stores: c.stores?.length ?? c.stores ?? 0 }))} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Accept action bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-4)", padding: "var(--sp-4) var(--sp-5)", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--r)", boxShadow: "var(--sh)" }}>
            <Stack direction="column" gap={0.5} flex="1 1 auto">
              <Text variant="caption" tone="muted">
                {selectedScenario
                  ? `Accepting scenario ${selectedScenario} (${REVIEW_SCENARIOS.find((s) => s.key === selectedScenario)?.name}) will set it as the active cluster model for assortment curation.`
                  : "Select a scenario above to continue."}
              </Text>
            </Stack>
            <Button
              variant="primary"
              size="medium"
              disabled={!selectedScenario}
              onClick={onPromote}
            >
              Accept scenario
              <ChevronRight size={14} style={{ marginLeft: 4 }} />
            </Button>
          </div>

          {/* Analytics panel after selecting */}
          {managedClusters && (
            <ClusterAnalyticsPanel
              managedClusters={managedClusters}
              setManagedClusters={setManagedClusters}
              availableStores={availableStores ?? []}
              setAvailableStores={setAvailableStores}
            />
          )}
        </Stack>
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
  const [runStep,     setRunStep]     = useState(0);
  const [promoted,    setPromoted]    = useState(false);
  const intervalRef = useRef(null);
  const STEPS = ["Define Scope", "Select Signals", "Review & Accept"];

  const openWizard = useCallback(() => {
    setWizardOpen(true); setWizardStep(0);
    setDraft({ ...WIZARD_DEFAULTS });
    setRunState("idle"); setRunProgress(0); setRunPhase(""); setRunStep(0); setPromoted(false);
  }, []);

  const closeWizard = useCallback(() => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
    setWizardOpen(false);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearTimeout(intervalRef.current); }, []);

  const startRun = () => {
    setRunState("running"); setRunProgress(0); setRunStep(0);
    const total = CLUSTER_PIPELINE.length;
    let step = 0;

    const advance = () => {
      step += 1;
      setRunStep(step);
      setRunProgress(Math.round((step / total) * 100));
      if (step >= total) {
        setRunState("done");
      } else {
        intervalRef.current = setTimeout(advance, 1500 + Math.random() * 700);
      }
    };
    intervalRef.current = setTimeout(advance, 1400 + Math.random() * 600);
  };

  const promoteToLive = () => {
    setPromoted(true);
    setTimeout(() => closeWizard(), 2000);
  };

  const canContinue =
    wizardStep === 0 ? draft.name.trim().length > 0 :
    wizardStep === 1 ? Object.values(draft.params).some(Boolean) : true;

  /* ── Wizard overlay ─────────────────────────────────────────────────────── */
  if (wizardOpen) {
    return (
      <div className="cr-wizard-overlay">
        {/* Header */}
        <div className="cr-wizard-header">
          <Stack direction="column" gap={0.5} style={{ minWidth: 0 }}>
            <Text variant="heading" tone="strong">New cluster run</Text>
            <Text variant="micro" tone="muted">
              {[draft.dept !== "All" ? draft.dept : "All depts", draft.channel, draft.season].filter(Boolean).join(" · ")} · {STORE_COUNT} stores
            </Text>
          </Stack>

          <StepIndicator step={wizardStep} labels={STEPS} className="cr-steps" />

          <Button variant="secondary" size="small" onClick={closeWizard}>Cancel</Button>
        </div>

        {/* Body */}
        <div className="cr-wizard-body">
          {promoted ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
              <div className="cr-promote-success" style={{ maxWidth: 480 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: "var(--r)",
                  background: "var(--color-success-soft)", border: "1px solid " + color.success,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <CheckCircle2 size={24} color={color.success} strokeWidth={1.75} />
                </div>
                <Stack direction="column" gap={1}>
                  <Text variant="heading" style={{ color: color.success }}>CR-019 accepted and live</Text>
                  <Text variant="caption" tone="muted">Previous set CR-018 has been archived. Returning to dashboard…</Text>
                </Stack>
              </div>
            </div>
          ) : (
            <>
              {wizardStep === 0 && <StepScope   draft={draft} setDraft={setDraft} />}
              {wizardStep === 1 && <StepSignals  draft={draft} setDraft={setDraft} />}
              {wizardStep === 2 && (
                <StepReview
                  draft={draft} runState={runState} runProgress={runProgress}
                  runStep={runStep} onRun={startRun} nextRunId="CR-019" onPromote={promoteToLive}
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
                disabled={runState === "running"}>
                <ChevronLeft size={14} style={{ marginRight: 4 }} />
                Back
              </Button>
            )}
            {wizardStep < 2 && (
              <Button variant="primary" size="medium" onClick={() => setWizardStep((s) => s + 1)}
                disabled={!canContinue}>
                Continue
                <ChevronRight size={14} style={{ marginLeft: 4 }} />
              </Button>
            )}
            {wizardStep === 2 && runState === "idle"    && (
              <Button variant="primary" size="medium" onClick={startRun}>
                <Play size={14} style={{ marginRight: 4 }} />
                Run clustering
              </Button>
            )}
            {wizardStep === 2 && runState === "running" && <Button variant="primary" size="medium" disabled>Generating…</Button>}
            {wizardStep === 2 && runState === "done"    && <Button variant="secondary" size="medium" onClick={closeWizard}>Close</Button>}
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
            <Stack direction="row" gap={2} align="center">
              <Chips label="Cluster Runs" isActive={tab === "runs"} onClick={() => setTab("runs")} />
              <Chips label="Scenario Explorer" isActive={tab === "scenarios"} onClick={() => setTab("scenarios")} />
            </Stack>
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
                    <Stack className="cl-section-label" direction="row" align="center" gap={0.5}>
                      <AlertTriangle size={12} style={{ color: color.warning }} />
                      <Text variant="micro" tone="warning" style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Outliers</Text>
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
