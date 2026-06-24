/**
 * National Core — agent-first assortment decision screen.
 *
 * Sections:
 *   1. Dark header — title + agent status + dept filter chips
 *   2. KPI strip   — Hard locked | Keep | Drop | Pending | Overridden
 *   3. OTB bar     — budget by dept (collapsed progress bars)
 *   4. Metrics tabs — Full range / Kept only / Dropped + aggregate mini-strip
 *   5. SKU table   — Impact Table with Agent Rec + Override per row
 *   6. Footer      — lock status + navigate to Regional
 */
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Card, Badge, Button, Table, ProgressBar, Chips } from "impact-ui";
import {
  Lock, Bot, CheckCircle2, AlertTriangle, ChevronRight,
  RefreshCw, TrendingUp, TrendingDown, Layers,
} from "lucide-react";
import Text        from "../components/Text.jsx";
import Stack       from "../components/Stack.jsx";
import Grid        from "../components/Grid.jsx";
import SkuMedia    from "../components/SkuMedia.jsx";
import { color }   from "../styles/tokens.js";
import { FD_STORES }   from "../data/stores.js";
import { FD_SKUS }     from "../data/skus.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import { nationalStats, runCatalogueAgent, apIntelModifier, CATALOGUE_SKUS } from "../data/catalogue.js";
import { INTEL_SEED }  from "../data/intel.js";
import { FD_OTB_DEPTS, otbNationalConsumed, otbPct, fmtCurrency } from "../data/otb.js";
import "./National.css";
import { panelSx, softSx } from "../styles/panelSx.js";

/* ── Constants ───────────────────────────────────────────────────────────── */
const REASON_BADGE = {
  "high-carry-high-sqft": { label: "Strong — all stores", color: "success" },
  "high-carry":            { label: "Wide adoption",       color: "info"    },
  "high-sqft":             { label: "High performer",      color: "warning" },
  emerging:                { label: "Emerging",            color: "default" },
};
const VEL_COLOR  = { A: "#059669", B: "#2563EB", C: "#D97706", D: "#DC2626" };
const VEL_BG     = { A: "#ECFDF5", B: "#EFF6FF", C: "#FFFBEB", D: "#FEF2F2" };
const DEPT_COLOR = { Wood: "#B45309", Tile: "#0B7A6C", "Laminate & Vinyl": "#2563EB" };
const DEPT_BG    = { Wood: "#FEF3C7", Tile: "#E6F7F4", "Laminate & Vinyl": "#DBEAFE" };
const DEPT_FILTERS = ["All", "Wood", "Tile", "Laminate & Vinyl"];

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmt$(n) { return `$${n.toFixed(2)}`; }

/* ── Velocity badge cell ─────────────────────────────────────────────────── */
function VelBadge({ vel }) {
  if (!vel || vel === "—") return <span style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-micro)" }}>—</span>;
  return (
    <span style={{ background: VEL_BG[vel], color: VEL_COLOR[vel], borderRadius: 10, padding: "1px 7px", fontSize: "var(--fs-micro)", fontWeight: 700 }}>
      {vel}
    </span>
  );
}

export default function National({ onNavigate }) {
  const [agentRun, setAgentRun] = useState(false);
  const [plan,     setPlan]     = useState({ natDecisions: {}, agentNatRecs: [], agentRunAt: null });
  const [deptFilter, setDeptFilter] = useState("All");
  const [metricsTab, setMetricsTab] = useState("full");

  /* ── Auto-run agent on mount ─────────────────────────────────────────── */
  useEffect(() => {
    if (!agentRun) {
      const p = runCatalogueAgent();
      setPlan({ natDecisions: p.natDecisions, agentNatRecs: p.agentNatRecs, agentRunAt: p.agentRunAt });
      setAgentRun(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const reRun = useCallback(() => {
    const p = runCatalogueAgent();
    setPlan({ natDecisions: p.natDecisions, agentNatRecs: p.agentNatRecs, agentRunAt: p.agentRunAt });
    setAgentRun(true);
  }, []);

  const handleDecide = useCallback((skuId, val) =>
    setPlan((prev) => {
      const nd = { ...prev.natDecisions };
      if (nd[skuId] === val) delete nd[skuId]; // toggle off
      else nd[skuId] = val;
      return { ...prev, natDecisions: nd };
    }), []);

  /* ── Enriched SKU list ─────────────────────────────────────────────────── */
  const enrichedSkus = useMemo(() => {
    const agentRecs = plan.agentNatRecs;
    return FD_SKUS.map((s) => {
      const isHard  = s.tag === "Core" || s.tag === "BG";
      const rows    = FD_ASSORTMENT.filter((r) => r.sku === s.sku);
      const stores  = new Set(rows.map((r) => r.storeId));
      const sqftSum = rows.reduce((a, r) => a + (r.r13Sqft || 0), 0);
      const avgR13  = stores.size ? sqftSum / stores.size : 0;
      const carryPct = (stores.size / FD_STORES.length) * 100;

      /* Dominant velocity */
      const vCounts = {};
      rows.forEach((r) => { vCounts[r.velocity] = (vCounts[r.velocity] || 0) + 1; });
      const vel = Object.entries(vCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

      const agentRec = agentRecs.find((r) => r.sku.sku === s.sku) || null;
      const dec      = plan.natDecisions[s.sku] ?? null;
      /* Effective decision */
      const effDec = isHard ? "core" : dec ?? (agentRec ? "core" : null);

      /* Intel modifier */
      const intel = apIntelModifier(s.sku, INTEL_SEED);

      return {
        sku:       s.sku,
        desc:      s.desc,
        dept:      s.dept,
        price:     s.price,
        tag:       s.tag,
        status:    s.status,
        isHard,
        avgR13:    Math.round(avgR13),
        carryPct:  Math.round(carryPct),
        storeCount: stores.size,
        velocity:  vel,
        agentRec:  agentRec ? "core" : null,
        agentRecReason: agentRec?.reason ?? null,
        dec,
        effDec,
        intel,
      };
    });
  }, [plan]);

  /* ── Filtered + sorted for table ─────────────────────────────────────── */
  const deptSkus = useMemo(() =>
    deptFilter === "All" ? enrichedSkus : enrichedSkus.filter((s) => s.dept === deptFilter),
    [enrichedSkus, deptFilter]);

  const sortedSkus = useMemo(() => [...deptSkus].sort((a, b) => {
    /* Pending review (has agent rec but no user decision) first */
    const aP = !a.isHard && a.agentRec && !a.dec ? 0 : 1;
    const bP = !b.isHard && b.agentRec && !b.dec ? 0 : 1;
    if (aP !== bP) return aP - bP;
    return b.avgR13 - a.avgR13;
  }), [deptSkus]);

  const tabSkus = useMemo(() => {
    if (metricsTab === "full") return sortedSkus;
    if (metricsTab === "keep") return sortedSkus.filter((s) => s.effDec === "core" || s.isHard);
    return sortedSkus.filter((s) => s.dec === "rejected");
  }, [sortedSkus, metricsTab]);

  /* ── KPI counts ──────────────────────────────────────────────────────── */
  const kpis = useMemo(() => {
    const hardLocked  = deptSkus.filter((s) => s.isHard).length;
    const keepCount   = deptSkus.filter((s) => s.effDec === "core").length;
    const dropCount   = deptSkus.filter((s) => s.dec === "rejected").length;
    const pending     = deptSkus.filter((s) => !s.isHard && !s.dec && s.agentRec).length;
    const overridden  = deptSkus.filter((s) => !s.isHard && s.dec && s.agentRec && s.dec !== "core").length;
    return [
      { l: "Hard locked",   v: hardLocked,  c: "#6EEDB8", sub: "Core / BG — mandatory" },
      { l: "Keep (Nat.)",   v: keepCount,   c: "#A3DDD6", sub: "In national assortment"  },
      { l: "Drop → NPI",    v: dropCount,   c: "#FCA5A5", sub: "Removed this cycle"       },
      { l: "Pending review",v: pending,     c: "#FCD34D", sub: "Agent rec, needs confirm" },
      { l: "Overridden",    v: overridden,  c: "#C4B5FD", sub: "Differs from agent rec"  },
    ];
  }, [deptSkus]);

  /* ── Metrics strip aggregates ────────────────────────────────────────── */
  const metricsStrip = useMemo(() => {
    const rows = FD_ASSORTMENT.filter((r) => tabSkus.some((s) => s.sku === r.sku));
    const totalSqft = rows.reduce((a, r) => a + (r.r13Sqft || 0), 0);
    const avgCarry  = tabSkus.length ? tabSkus.reduce((a, s) => a + s.carryPct, 0) / tabSkus.length : 0;
    const avgR13    = tabSkus.length ? tabSkus.reduce((a, s) => a + s.avgR13, 0) / tabSkus.length : 0;
    return [
      { l: "SKUs",          v: tabSkus.length,               c: "var(--color-text-strong)" },
      { l: "R13 sqft",      v: `${Math.round(totalSqft / 1000)}k`, c: "#2563EB" },
      { l: "Avg R13/store", v: `${Math.round(avgR13)}`,     c: avgR13 > 100 ? "#059669" : "#D97706" },
      { l: "Avg carry",     v: `${Math.round(avgCarry)}%`,  c: avgCarry > 70 ? "#059669" : "#D97706" },
    ];
  }, [tabSkus]);

  /* ── Table column defs ───────────────────────────────────────────────── */
  const columnDefs = useMemo(() => [
    {
      field: "desc", headerName: "SKU / Description", minWidth: 220, flex: 2,
      cellRenderer: (p) => {
        const skuObj = FD_SKUS.find((s) => s.sku === p.data.sku);
        const intel  = p.data.intel;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
            <SkuMedia sku={skuObj || { desc: p.data.desc }} size={32} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "var(--fs-caption)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {p.value}
              </div>
              <div style={{ display: "flex", gap: 3, marginTop: 2, flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--font-mono,monospace)", fontSize: 9, color: "var(--color-text-muted)" }}>{p.data.sku}</span>
                {p.data.tag && <Badge variant="subtle" size="small" color="success" label={p.data.tag} />}
                {p.data.status === "Discontinued" && <Badge variant="subtle" size="small" color="error" label="Disc." />}
                {p.data.dec && p.data.agentRec && p.data.dec !== p.data.agentRec && <Badge variant="subtle" size="small" color="warning" label="Overridden" />}
                {intel?.delta !== 0 && <Badge variant="subtle" size="small" color={intel.delta > 0 ? "success" : "error"} label={`Intel ${intel.delta > 0 ? "+" : ""}${intel.delta}pts`} />}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      field: "dept", headerName: "Dept", width: 90,
      cellRenderer: (p) => (
        <span style={{ background: DEPT_BG[p.value] || "#F2F6EE", color: DEPT_COLOR[p.value] || "#456845", borderRadius: 4, padding: "2px 6px", fontSize: "var(--fs-micro)", fontWeight: 700 }}>
          {p.value}
        </span>
      ),
    },
    {
      field: "price", headerName: "Price", width: 72,
      cellStyle: { fontFamily: "var(--font-mono,monospace)", fontSize: "var(--fs-micro)", display: "flex", alignItems: "center" },
      valueFormatter: (p) => fmt$(p.value),
    },
    {
      field: "velocity", headerName: "Vel.", width: 60,
      cellRenderer: (p) => <VelBadge vel={p.value} />,
    },
    {
      field: "avgR13", headerName: "Avg R13", width: 80,
      cellStyle: (p) => ({
        fontFamily: "var(--font-mono,monospace)", fontSize: "var(--fs-micro)", display: "flex", alignItems: "center", justifyContent: "flex-end",
        color: p.value >= 100 ? "#059669" : p.value >= 50 ? "var(--color-text)" : "#DC2626",
        fontWeight: p.value >= 100 ? 700 : 400,
      }),
    },
    {
      field: "storeCount", headerName: "Stores", width: 72,
      cellStyle: { fontSize: "var(--fs-micro)", color: "var(--color-text-muted)", display: "flex", alignItems: "center", justifyContent: "flex-end" },
      valueFormatter: (p) => `${p.value}/${FD_STORES.length}`,
    },
    {
      field: "agentRec", headerName: "Agent Rec", width: 170,
      cellRenderer: (p) => {
        if (p.data.isHard) {
          return (
            <Stack direction="row" align="center" gap={1} style={{ height: "100%" }}>
              <Lock size={11} style={{ color: "var(--color-success)", flexShrink: 0 }} />
              <span style={{ fontSize: "var(--fs-micro)", color: "var(--color-success)", fontWeight: 700 }}>Core / BG — mandatory</span>
            </Stack>
          );
        }
        if (p.data.agentRec) {
          const rb = REASON_BADGE[p.data.agentRecReason] || REASON_BADGE.emerging;
          return (
            <Stack direction="row" align="center" gap={1} style={{ height: "100%" }}>
              <Bot size={11} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
              <Badge variant="subtle" size="small" color={rb.color} label={`Keep · ${rb.label}`} />
            </Stack>
          );
        }
        return <span style={{ color: "var(--color-text-muted)", fontSize: "var(--fs-micro)" }}>—</span>;
      },
    },
    {
      field: "dec", headerName: "Override", width: 155, sortable: false,
      cellRenderer: (p) => {
        if (p.data.isHard) {
          return <Badge variant="subtle" size="small" color="success" label="Mandatory" />;
        }
        const dec = p.data.dec;
        return (
          <div style={{ display: "flex", gap: 4, height: "100%", alignItems: "center" }}>
            <Button
              variant={dec === "core" ? "primary" : "ghost"} size="small"
              onClick={() => handleDecide(p.data.sku, "core")}
              sx={{ fontSize: "var(--fs-micro)", padding: "2px 8px", minWidth: 0, ...(dec === "core" ? { background: "var(--color-success)", color: "#fff", border: "none" } : { color: "var(--color-success)", border: "1px solid var(--color-success)" }) }}
            >
              <CheckCircle2 size={10} style={{ marginRight: 3 }} />Keep
            </Button>
            <Button
              variant={dec === "rejected" ? "secondary" : "ghost"} size="small" type={dec === "rejected" ? "destructive" : "default"}
              onClick={() => handleDecide(p.data.sku, "rejected")}
              sx={{ fontSize: "var(--fs-micro)", padding: "2px 8px", minWidth: 0, ...(dec === "rejected" ? { background: "var(--color-error)", color: "#fff", border: "none" } : { color: "var(--color-text-muted)" }) }}
            >
              Drop
            </Button>
          </div>
        );
      },
    },
  ], [handleDecide]);

  /* ── OTB summary ─────────────────────────────────────────────────────── */
  const otbRows = useMemo(() => {
    const consumed = otbNationalConsumed(plan.natDecisions, CATALOGUE_SKUS);
    return Object.entries(FD_OTB_DEPTS).map(([dept, budget]) => {
      const used = consumed[dept] || 0;
      const pct  = otbPct(used, budget);
      const over = used > budget;
      return { dept, budget, used, pct, over };
    });
  }, [plan.natDecisions]);

  /* ── Decisions summary ───────────────────────────────────────────────── */
  const decideCount = deptSkus.filter((s) => s.isHard || s.dec).length;
  const totalCore   = deptSkus.filter((s) => s.effDec === "core").length;

  return (
    <Stack direction="column" gap={0}>
      {/* ── Dark header ─────────────────────────────────────────────────── */}
      <div className="nat-header">
        <div className="nat-header-top">
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Stack direction="row" align="center" gap={3}>
              <div className="nat-header-icon">
                <Lock size={18} style={{ color: "#6EEDB8" }} />
              </div>
              <div>
                <Text variant="title" style={{ color: "#fff", fontWeight: 800, display: "block", lineHeight: 1.2 }}>National Core</Text>
                <Text variant="micro" style={{ color: "#4A7A4A", display: "block", marginTop: 2 }}>
                  Agent recommends Keep / Drop per SKU · override only where needed · decisions cascade to cluster &amp; store
                </Text>
              </div>
            </Stack>
          </Stack>
          <Stack direction="row" gap={2} align="center" style={{ flexShrink: 0 }}>
            {agentRun && (
              <Badge variant="subtle" size="small" color="success" label={`Agent run · ${plan.agentRunAt}`} />
            )}
            <Button variant="ghost" size="small" onClick={reRun}
              sx={{ fontSize: "var(--fs-micro)", color: "rgba(110,237,184,.8)", border: "1px solid rgba(110,237,184,.25)", background: "rgba(110,237,184,.08)" }}>
              <RefreshCw size={11} style={{ marginRight: 5 }} />Re-run
            </Button>
          </Stack>
        </div>
        {/* Dept filter */}
        <div className="nat-dept-filter">
          <Text variant="micro" style={{ color: "rgba(255,255,255,.35)", marginRight: "var(--sp-2)", alignSelf: "center", whiteSpace: "nowrap" }}>
            Department:
          </Text>
          {DEPT_FILTERS.map((d) => (
            <Chips key={d} label={d} isActive={deptFilter === d} onClick={() => setDeptFilter(d)} size="small" />
          ))}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <Stack direction="column" gap={4} style={{ padding: "var(--sp-5) var(--sp-6)" }}>

        {/* ── KPI strip ─────────────────────────────────────────────────── */}
        <div className="nat-kpi-strip">
          {kpis.map((k) => (
            <Card key={k.l} sx={{ ...softSx, padding: "var(--sp-4) var(--sp-5)", flex: 1 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: k.c, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: "var(--fs-micro)", fontWeight: 700, color: "var(--color-text-strong)", marginTop: 4 }}>{k.l}</div>
              <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 2 }}>{k.sub}</div>
            </Card>
          ))}
        </div>

        {/* ── OTB by dept ───────────────────────────────────────────────── */}
        <Card sx={panelSx}>
          <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-3)" }}>
            <TrendingUp size={14} style={{ color: "var(--color-primary)" }} />
            <Text variant="body-strong" tone="strong">OTB Budget — National Core</Text>
            <Badge variant="subtle" size="small" color="info" label="By department" />
          </Stack>
          <div className="nat-otb-grid nat-otb-grid--row">
            {otbRows.map((o) => (
              <div key={o.dept} className="nat-otb-dept" style={{ flex: 1 }}>
                <div className="nat-otb-dept-header">
                  <span className="nat-otb-dept-name">{o.dept}</span>
                  <span className={`nat-otb-dept-val${o.over ? " over" : ""}`}>
                    {fmtCurrency(o.used)} / {fmtCurrency(o.budget)}
                  </span>
                </div>
                <ProgressBar value={o.pct} max={100} color={o.over ? "error" : o.pct > 80 ? "warning" : "success"} size="small" sx={{ marginTop: "var(--sp-1)" }} />
                <div className="nat-otb-dept-pct">
                  {o.over
                    ? <span className="nat-otb-over"><AlertTriangle size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />Over by {fmtCurrency(o.used - o.budget)}</span>
                    : <span>{o.pct}% consumed</span>
                  }
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Metrics tabs + strip ───────────────────────────────────────── */}
        <Card sx={panelSx}>
          <Stack direction="row" align="center" gap={3} wrap style={{ marginBottom: "var(--sp-3)" }}>
            <Stack direction="row" gap={1}>
              {[
                { id: "full", l: "Full range" },
                { id: "keep", l: "Kept only"  },
                { id: "drop", l: "Dropped"    },
              ].map((t) => (
                <Chips key={t.id} label={t.l} isActive={metricsTab === t.id} onClick={() => setMetricsTab(t.id)} size="small" />
              ))}
            </Stack>
            <Badge variant="subtle" size="small" color="neutral" label={`${tabSkus.length} SKUs`} />
          </Stack>
          <div className="nat-metrics-strip">
            {metricsStrip.map((m) => (
              <div key={m.l} className="nat-metrics-cell">
                <div style={{ fontSize: 20, fontWeight: 800, color: m.c, lineHeight: 1 }}>{m.v}</div>
                <div style={{ fontSize: "var(--fs-micro)", color: "var(--color-text-muted)", marginTop: 3 }}>{m.l}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* ── SKU table ─────────────────────────────────────────────────── */}
        <Stack direction="column" gap={2}>
          <Stack direction="row" align="center" gap={2} wrap>
            <Layers size={14} style={{ color: "var(--color-primary)" }} />
            <Text variant="body-strong" tone="strong">SKU decisions</Text>
            <Badge variant="subtle" size="small" color="neutral" label={`${tabSkus.length} SKUs · ${decideCount} decided`} />
            {metricsTab === "full" && (
              <Text variant="caption" tone="muted">Pending agent review items appear first · sorted by R13 performance</Text>
            )}
          </Stack>
          <Table
            cardContainer
            rowHeight="default"
            tableHeader=""
            columnDefs={columnDefs}
            rowData={tabSkus}
            domLayout="autoHeight"
            defaultColDef={{ floatingFilter: false, resizable: true, sortable: true }}
            hideTableSetting
            hideTableActions
            pagination={false}
            getRowStyle={(p) => {
              if (p.data.isHard) return { borderLeft: "3px solid var(--color-success)", background: "rgba(5,150,105,.03)" };
              if (p.data.effDec === "core") return { borderLeft: "3px solid var(--color-success)", background: "rgba(5,150,105,.02)" };
              if (p.data.dec === "rejected") return { borderLeft: "3px solid var(--color-error)", background: "rgba(220,38,38,.03)" };
              if (p.data.agentRec) return { borderLeft: "3px solid var(--color-primary)", background: "rgba(37,99,235,.02)" };
              return { borderLeft: "3px solid transparent" };
            }}
          />
        </Stack>

        {/* ── Lock status footer ─────────────────────────────────────────── */}
        <Card sx={{ ...panelSx, background: "var(--color-success-soft)", border: "1.5px solid var(--color-success)" }}>
          <Stack direction="row" align="center" gap={3} wrap>
            <Lock size={18} color="var(--color-success)" strokeWidth={1.75} style={{ flexShrink: 0 }} />
            <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="body-strong" tone="success">{totalCore} SKUs will be locked as National Core</Text>
              <Text variant="caption" tone="muted">
                These appear pre-filled and locked in Regional Review and Store Curation. They cannot be removed by
                regional managers or store teams.
              </Text>
            </Stack>
            <Button variant="primary" size="medium" onClick={() => onNavigate && onNavigate("regional")} style={{ flexShrink: 0 }}>
              Advance to Regional Review <ChevronRight size={14} style={{ marginLeft: 4 }} />
            </Button>
          </Stack>
        </Card>
      </Stack>
    </Stack>
  );
}
