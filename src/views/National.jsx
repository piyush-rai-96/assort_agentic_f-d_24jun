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
import { Card, Badge, Button, ProgressBar, Chips } from "impact-ui";
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
import { getNationalRec, REC_COLOR } from "../utils/skuRec.js";
import "./National.css";
import { panelSx, softSx } from "../styles/panelSx.js";

/* ── Constants ───────────────────────────────────────────────────────────── */
const REASON_LABEL = {
  "high-carry-high-sqft": "Strong — all stores",
  "high-carry":            "Wide adoption",
  "high-sqft":             "High performer",
  emerging:                "Emerging",
};
const VEL_COLOR  = { A: "#059669", B: "#2563EB", C: "#D97706", D: "#DC2626" };
const VEL_BG     = { A: "#DCFCE7", B: "#DBEAFE", C: "#FEF3C7", D: "#FEF2F2" };
const DEPT_COLOR = { Wood: "#B45309", Tile: "#0B7A6C", "Laminate & Vinyl": "#2563EB" };
const DEPT_BG    = { Wood: "#FEF3C7", Tile: "#E6F7F4", "Laminate & Vinyl": "#DBEAFE" };
const DEPT_FILTERS = ["All", "Wood", "Tile", "Laminate & Vinyl"];
const TOTAL_STORES = FD_STORES.length;

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function fmt$(n) { return `$${n.toFixed(2)}`; }

/* ── Velocity badge ──────────────────────────────────────────────────────── */
function VelBadge({ vel }) {
  if (!vel || vel === "—") return <span className="nat-td-muted">—</span>;
  return (
    <span className="nat-vel-chip" style={{ background: VEL_BG[vel], color: VEL_COLOR[vel] }}>{vel}</span>
  );
}

/* ── Custom SKU table ────────────────────────────────────────────────────── */
function SkuTable({ rows, onDecide, maxR13 }) {
  return (
    <div className="nat-sku-table">
      {/* Header */}
      <div className="nat-sku-head">
        <div className="nat-th nat-th-sku">SKU / Description</div>
        <div className="nat-th nat-th-dept">Dept</div>
        <div className="nat-th nat-th-num">Price</div>
        <div className="nat-th nat-th-num">Vel.</div>
        <div className="nat-th nat-th-num">Avg R13</div>
        <div className="nat-th nat-th-num">Stores</div>
        <div className="nat-th nat-th-rec">Agent Rec</div>
        <div className="nat-th nat-th-override">Override</div>
      </div>

      {/* Rows */}
      {rows.map((s) => {
        const rowClass = [
          "nat-sku-row",
          s.isHard             ? "is-mandatory" :
          s.effDec === "core"  ? "is-keep" :
          s.dec === "modify"   ? "is-modify" :
          s.dec === "rejected" ? "is-drop" : "is-pending",
        ].filter(Boolean).join(" ");

        const r13Pct = maxR13 > 0 ? Math.round((s.avgR13 / maxR13) * 100) : 0;
        const r13Color = s.avgR13 >= 100 ? "#059669" : s.avgR13 >= 50 ? "#2563EB" : "#DC2626";
        const storePct = Math.round((s.storeCount / TOTAL_STORES) * 100);
        const skuObj = FD_SKUS.find((sk) => sk.sku === s.sku);

        return (
          <div key={s.sku} className={rowClass}>
            {/* SKU / Description */}
            <div className="nat-td nat-td-sku">
              <SkuMedia sku={skuObj || { desc: s.desc }} size={36} />
              <div className="nat-td-sku-info">
                <div className="nat-td-sku-name">{s.desc}</div>
                <div className="nat-td-sku-meta">
                  <span className="nat-td-sku-code">{s.sku}</span>
                  {s.tag && <span className="nat-tag-chip nat-tag-chip--core">{s.tag}</span>}
                  {s.status === "Discontinued" && <span className="nat-tag-chip nat-tag-chip--disc">Disc.</span>}
                  {s.dec && s.agentRec && s.dec !== s.agentRec && <span className="nat-tag-chip nat-tag-chip--override">Overridden</span>}
                  {s.intel?.delta !== 0 && (
                    <span className={`nat-tag-chip ${s.intel.delta > 0 ? "nat-tag-chip--intel-pos" : "nat-tag-chip--intel-neg"}`}>
                      Intel {s.intel.delta > 0 ? "+" : ""}{s.intel.delta}pts
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Dept */}
            <div className="nat-td nat-td-dept">
              <span className="nat-dept-chip" style={{ background: DEPT_BG[s.dept] || "#F2F6EE", color: DEPT_COLOR[s.dept] || "#456845" }}>
                {s.dept === "Laminate & Vinyl" ? "Lam." : s.dept}
              </span>
            </div>

            {/* Price */}
            <div className="nat-td nat-td-num nat-td-mono">{fmt$(s.price)}</div>

            {/* Velocity */}
            <div className="nat-td nat-td-num"><VelBadge vel={s.velocity} /></div>

            {/* Avg R13 */}
            <div className="nat-td nat-td-num">
              <div className="nat-r13-wrap">
                <span className="nat-r13-val" style={{ color: r13Color }}>{s.avgR13}</span>
                <div className="nat-r13-bar-track">
                  <div className="nat-r13-bar-fill" style={{ width: `${r13Pct}%`, background: r13Color }} />
                </div>
              </div>
            </div>

            {/* Stores */}
            <div className="nat-td nat-td-num">
              <div className="nat-stores-wrap">
                <span className="nat-stores-val">{s.storeCount}<span className="nat-stores-total">/{TOTAL_STORES}</span></span>
                <div className="nat-r13-bar-track">
                  <div className="nat-r13-bar-fill" style={{ width: `${storePct}%`, background: storePct >= 80 ? "#059669" : storePct >= 50 ? "#2563EB" : "#D97706" }} />
                </div>
              </div>
            </div>

            {/* Agent Rec — 3-way */}
            <div className="nat-td nat-td-rec">
              {s.isHard ? (
                <div className="nat-rec-chip" style={{ background: REC_COLOR.keep.bg, color: REC_COLOR.keep.text, borderColor: REC_COLOR.keep.border }}>
                  <Lock size={10} aria-hidden="true" />
                  <span>Keep · Mandatory</span>
                </div>
              ) : s.rec ? (
                <div
                  className="nat-rec-chip nat-rec-chip--action"
                  style={{ background: REC_COLOR[s.rec.action]?.bg, color: REC_COLOR[s.rec.action]?.text, borderColor: REC_COLOR[s.rec.action]?.border }}
                  title={s.rec.detail}
                >
                  <Bot size={10} aria-hidden="true" />
                  <span>{s.rec.action === "keep" ? "Keep" : s.rec.action === "modify" ? "Modify" : "Drop"}</span>
                  <span className="nat-rec-reason-lbl">{s.rec.reason}</span>
                </div>
              ) : (
                <span className="nat-td-muted">—</span>
              )}
            </div>

            {/* Override / Decision — Keep / Modify / Drop */}
            <div className="nat-td nat-td-override">
              {s.isHard ? (
                <div className="nat-override-mandatory">
                  <button className="nat-btn-keep nat-btn-keep--locked" disabled type="button">
                    <Lock size={10} aria-hidden="true" />
                    Keep
                  </button>
                  <span className="nat-mandatory-lbl">Mandatory</span>
                </div>
              ) : (
                <div className="nat-override-btns">
                  <button
                    type="button"
                    className={`nat-btn-keep${s.dec === "core" ? " nat-btn-keep--active" : ""}`}
                    onClick={() => onDecide(s.sku, "core")}
                    title="Keep in National Core"
                  >
                    <CheckCircle2 size={10} aria-hidden="true" />
                    Keep
                  </button>
                  <button
                    type="button"
                    className={`nat-btn-modify${s.dec === "modify" ? " nat-btn-modify--active" : ""}`}
                    onClick={() => onDecide(s.sku, "modify")}
                    title="Flag for price / range modification"
                  >
                    Modify
                  </button>
                  <button
                    type="button"
                    className={`nat-btn-drop${s.dec === "rejected" ? " nat-btn-drop--active" : ""}`}
                    onClick={() => onDecide(s.sku, "rejected")}
                    title="Drop from National Core"
                  >
                    Drop
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
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

      /* Full 3-way agent recommendation */
      const rec = getNationalRec({
        avgR13:   Math.round(avgR13),
        velocity: vel,
        carryPct: Math.round(carryPct),
        status:   s.status,
        tag:      s.tag,
      });

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
        rec,       /* full 3-way rec: { action, confidence, reason, detail } */
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
    const modifyCount = deptSkus.filter((s) => s.dec === "modify").length;
    const dropCount   = deptSkus.filter((s) => s.dec === "rejected").length;
    const pending     = deptSkus.filter((s) => !s.isHard && !s.dec).length;
    return [
      { l: "Hard locked",   v: hardLocked,  c: "#6EEDB8", sub: "Core / BG — mandatory" },
      { l: "Keep",          v: keepCount,   c: "#A3DDD6", sub: "In national assortment"  },
      { l: "Modify",        v: modifyCount, c: "#FCD34D", sub: "Flagged for review"      },
      { l: "Drop",          v: dropCount,   c: "#FCA5A5", sub: "Removed this cycle"      },
      { l: "Pending",       v: pending,     c: "#C4B5FD", sub: "Awaiting decision"       },
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
          <SkuTable
            rows={tabSkus}
            onDecide={handleDecide}
            maxR13={Math.max(...tabSkus.map((s) => s.avgR13), 1)}
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
