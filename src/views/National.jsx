import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, ProgressBar, EmptyState } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import SkuSwatch from "../components/SkuSwatch.jsx";
import { color } from "../styles/tokens.js";
import { FD_STORES } from "../data/stores.js";
import { FD_SKUS } from "../data/skus.js";
import { nationalStats, runCatalogueAgent, apIntelModifier } from "../data/catalogue.js";
import { INTEL_SEED } from "../data/intel.js";
import { FD_OTB_DEPTS, otbNationalConsumed, otbPct, fmtCurrency } from "../data/otb.js";
import { CATALOGUE_SKUS } from "../data/catalogue.js";
import "./National.css";
import { panelSx, softSx } from "../styles/panelSx.js";


/* Agent reason tag → label + Impact UI Badge color (functional signal). */
const REASON_BADGE = {
  "high-carry-high-sqft": { label: "Strong — all stores", color: "success" },
  "high-carry": { label: "Wide adoption", color: "info" },
  "high-sqft": { label: "High performer", color: "warning" },
  emerging: { label: "Emerging", color: "default" },
};

/* Core/BG SKUs are mandatory in every store and can never be removed. */
const HARD_LOCKED = FD_SKUS.filter((s) => s.tag === "Core" || s.tag === "BG");

export default function National({ onNavigate }) {
  const [agentRun, setAgentRun] = useState(false);
  const [plan, setPlan] = useState({ natDecisions: {}, agentNatRecs: [], agentRunAt: null });

  const runAgent = () => {
    const p = runCatalogueAgent();
    setPlan({ natDecisions: p.natDecisions, agentNatRecs: p.agentNatRecs, agentRunAt: p.agentRunAt });
    setAgentRun(true);
  };
  const reRun = () => {
    setPlan({ natDecisions: {}, agentNatRecs: [], agentRunAt: null });
    setAgentRun(false);
  };

  /* Toggle a recommendation's decision; clicking the active decision clears it. */
  const decide = (skuId, value) =>
    setPlan((prev) => {
      const nd = { ...prev.natDecisions };
      if (nd[skuId] === value) delete nd[skuId];
      else nd[skuId] = value;
      return { ...prev, natDecisions: nd };
    });

  const agentRecs = plan.agentNatRecs;
  const approvedRecs = agentRecs.filter((r) => plan.natDecisions[r.sku.sku] === "core").length;
  const totalCore = HARD_LOCKED.length + approvedRecs;

  /* Hard-locked table rows enriched with real national R13 footprint. */
  const lockedRows = useMemo(
    () =>
      HARD_LOCKED.map((s) => {
        const stat = nationalStats(s);
        return {
          name: s.desc,
          sku: String(s.sku),
          dept: s.dept,
          subDept: s.subDept || "—",
          price: s.price,
          carry: stat.carryPct,
          avg: stat.avgSqft,
        };
      }),
    []
  );

  const lockedColumns = useMemo(
    () => [
      {
        field: "name", headerName: "SKU", minWidth: 280, flex: 1, filter: "agTextColumnFilter",
        cellRenderer: ({ data }) => {
          const skuObj = FD_SKUS.find((s) => String(s.sku) === data.sku);
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {skuObj && <SkuSwatch sku={skuObj} size={26} />}
              <span>{data.name}</span>
            </div>
          );
        },
      },
      { field: "sku", headerName: "SKU", width: 120, filter: "agTextColumnFilter", cellStyle: () => ({ fontFamily: "var(--font-mono)", color: color.textMuted }) },
      { field: "dept", headerName: "Dept", width: 150, filter: "agSetColumnFilter" },
      { field: "subDept", headerName: "Sub-Dept", minWidth: 150, flex: 1, filter: "agSetColumnFilter" },
      { field: "price", headerName: "Price", width: 100, filter: "agNumberColumnFilter", valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      { field: "carry", headerName: "Carry", width: 100, filter: "agNumberColumnFilter", valueFormatter: (p) => `${p.value}%` },
      {
        field: "avg",
        headerName: "Avg R13/Store",
        width: 140,
        valueFormatter: (p) => `${p.value} sqft`,
        cellStyle: (p) => ({ fontWeight: p.value >= 100 ? 700 : 400, color: p.value >= 100 ? color.success : color.text }),
      },
    ],
    []
  );

  const kpis = [
    { l: "Total National Core", v: totalCore, sub: "Will be locked in all stores", tone: "success" },
    { l: "Hard locked (Core/BG)", v: HARD_LOCKED.length, sub: "Cannot be changed", tone: "strong" },
    { l: "Agent recommendations", v: agentRecs.length, sub: "Review and approve below", tone: "teal" },
  ];

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">National Core</Text>
            <Text variant="caption" tone="muted">
              Review agent recommendations · approve or reject · decisions here lock all {FD_STORES.length} stores
            </Text>
          </Stack>
          {agentRun ? (
            <Stack direction="row" gap={2} align="center" wrap justify="flex-end">
              <Badge variant="subtle" size="small" color="success" label={`Agent applied · ${plan.agentRunAt}`} />
              <Button variant="secondary" size="small" onClick={reRun}>Re-run</Button>
            </Stack>
          ) : null}
        </Stack>
      </Card>

      {/* ── Gate: agent must run first ─────────────────────────────────────── */}
      {!agentRun ? (
        <Card sx={panelSx}>
          <Stack direction="row" gap={3} align="flex-start" wrap>
            <Stack align="center" justify="center" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-warning-soft)", flexShrink: 0 }}>
              <Text variant="subheading">⚠️</Text>
            </Stack>
            <Stack direction="column" gap={3} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Stack direction="column" gap={1}>
                <Text variant="subheading" tone="warning">Agent hasn't run yet</Text>
                <Text variant="caption" tone="muted">
                  Run the assortment agent to score every Active SKU on R13 carry rate and average sqft, then recommend
                  promotions to National Core. Recommendations apply as defaults — you approve or reject each below.
                </Text>
              </Stack>
              <Stack direction="row" gap={3} align="center" wrap>
                <Button variant="primary" size="medium" onClick={runAgent}>🤖 Run agent recommendation</Button>
                {onNavigate ? (
                  <Button variant="tertiary" size="medium" onClick={() => onNavigate("catalogue")}>Open Catalogue step →</Button>
                ) : null}
              </Stack>
            </Stack>
          </Stack>
        </Card>
      ) : null}

      {/* ── KPI strip ──────────────────────────────────────────────────────── */}
      <Grid columns={3} gap={3}>
        {kpis.map((k) => (
          <Card key={k.l} sx={panelSx}>
            <Stack direction="column" gap={1}>
              <Text variant="overline" tone="muted">{k.l}</Text>
              <Text variant="kpi" tone={k.tone}>{k.v}</Text>
              <Text variant="caption" tone="subtle">{k.sub}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      {/* ── Section 1: Hard-locked Core / BG ───────────────────────────────── */}
      <Stack direction="column" gap={3}>
        <Stack direction="row" align="center" gap={2} wrap>
          <Text variant="body-strong" tone="success">🔒 Always Mandatory — Core / BG</Text>
          <Badge variant="subtle" size="small" color="success" label={`${HARD_LOCKED.length}`} />
          <Text variant="caption" tone="muted">From the product catalogue — cannot be removed under any circumstance</Text>
        </Stack>
        <Table
      defaultColDef={{ floatingFilter: true }}
          cardContainer
          rowHeight="compact"
          tableHeader="Locked national core"
          columnDefs={lockedColumns}
          rowData={lockedRows}
          domLayout="autoHeight"
          hideTableSetting
          hideTableActions
          pagination={false}
        />
      </Stack>

      {/* ── OTB Budget by Department ────────────────────────────────────────── */}
      {agentRun && (
        <Card sx={panelSx}>
          <Stack direction="column" gap={3}>
            <Stack direction="row" align="center" gap={2}>
              <Text variant="body-strong" tone="strong">OTB Budget — National Core (SS 2026)</Text>
              <Badge variant="subtle" size="small" color="info" label="By department" />
            </Stack>
            <div className="nat-otb-grid">
              {Object.entries(FD_OTB_DEPTS).map(([dept, budget]) => {
                const consumed = otbNationalConsumed(plan.natDecisions, CATALOGUE_SKUS)[dept] || 0;
                const pct = otbPct(consumed, budget);
                const over = consumed > budget;
                return (
                  <div key={dept} className="nat-otb-dept">
                    <div className="nat-otb-dept-header">
                      <span className="nat-otb-dept-name">{dept}</span>
                      <span className={`nat-otb-dept-val ${over ? "over" : ""}`}>
                        {fmtCurrency(consumed)} / {fmtCurrency(budget)}
                      </span>
                    </div>
                    <div className="nat-otb-bar-track">
                      <div className="nat-otb-bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: over ? color.error : color.success }} />
                    </div>
                    <div className="nat-otb-dept-pct">
                      {over
                        ? <span className="nat-otb-over">⚠️ Over budget by {fmtCurrency(consumed - budget)}</span>
                        : <span>{pct}% of budget consumed</span>
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          </Stack>
        </Card>
      )}

      {/* ── Section 2: Agent recommendations (post-run) ────────────────────── */}
      {agentRun ? (
        <Stack direction="column" gap={3}>
          <Stack direction="row" align="center" gap={2} wrap>
            <Text variant="body-strong" tone="teal">🤖 Agent Recommended for National Core</Text>
            <Badge variant="subtle" size="small" color="info" label={`${agentRecs.length}`} />
            <Text variant="caption" tone="muted">Review each recommendation · approve or reject · approved items lock all stores</Text>
          </Stack>

          {agentRecs.length ? (
            <Card sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
              {agentRecs.map((rec) => {
                    const id = rec.sku.sku;
                const dec = plan.natDecisions[id];
                const approved = dec === "core";
                const rejected = dec === "rejected";
                const reason = REASON_BADGE[rec.reason] || REASON_BADGE.emerging;
                const intelMod = apIntelModifier(id, INTEL_SEED);
                return (
                  <Stack
                    key={id}
                    className={`nat-rec-row${approved ? " is-approved" : ""}${rejected ? " is-rejected" : ""}`}
                    direction="row"
                    align="center"
                    gap={4}
                    wrap
                    paddingX={4}
                    paddingY={3}
                  >
                    {/* Identity */}
                    <Stack direction="column" gap={1} flex="1 1 260px" style={{ minWidth: 0 }}>
                      <Stack direction="row" align="center" gap={2} wrap>
                        <Text variant="body-strong" tone="strong">{rec.sku.desc}</Text>
                        <Badge variant="subtle" size="small" color={reason.color} label={reason.label} />
                        {intelMod.delta !== 0 && (
                          <Badge variant="subtle" size="small" color={intelMod.delta > 0 ? "success" : "error"}
                            label={`Intel ${intelMod.delta > 0 ? "+" : ""}${intelMod.delta}pts`} />
                        )}
                        {intelMod.flags.includes("supply-constrained") && (
                          <Badge variant="subtle" size="small" color="warning" label="Supply risk" />
                        )}
                        {intelMod.flags.includes("quality-hold") && (
                          <Badge variant="subtle" size="small" color="error" label="Quality hold" />
                        )}
                      </Stack>
                      <Stack direction="row" align="center" gap={2} wrap>
                        <Text variant="micro" tone="subtle" mono>{id}</Text>
                        <Badge variant="subtle" size="small" color="default" label={rec.sku.dept} />
                        <Text variant="micro" tone="muted">{rec.sku.subDept}</Text>
                      </Stack>
                    </Stack>

                    {/* Carry */}
                    <Stack direction="column" gap={1} style={{ width: 140, flexShrink: 0 }}>
                      <Text variant="micro" tone="muted">Carry rate</Text>
                      <Text variant="body-strong" tone="strong">{rec.carryPct}%</Text>
                      <ProgressBar value={rec.carryPct} status="completed" showTime={false} customLabel=" " />
                    </Stack>

                    {/* Avg R13 */}
                    <Stack direction="column" gap={1} style={{ width: 110, flexShrink: 0 }}>
                      <Text variant="micro" tone="muted">Avg R13/Store</Text>
                      <Text variant="body-strong" tone={rec.avgSqft >= 100 ? "success" : "strong"}>{rec.avgSqft} sqft</Text>
                    </Stack>

                    {/* Price */}
                    <Stack direction="column" gap={1} style={{ width: 80, flexShrink: 0 }}>
                      <Text variant="micro" tone="muted">Price</Text>
                      <Text variant="body-strong" tone="strong" mono>${rec.sku.price.toFixed(2)}</Text>
                    </Stack>

                    {/* Decision */}
                    <Stack direction="row" gap={2} align="center" style={{ flexShrink: 0 }}>
                      <Button variant={approved ? "primary" : "secondary"} size="small" onClick={() => decide(id, "core")}>
                        {approved ? "✓ Approved" : "Approve"}
                      </Button>
                      <Button variant="secondary" size="small" type="destructive" onClick={() => decide(id, "rejected")}>
                        {rejected ? "✕ Rejected" : "Reject"}
                      </Button>
                    </Stack>
                  </Stack>
                );
              })}
            </Card>
          ) : (
            <Card sx={softSx}>
              <EmptyState
                heading="No additional promotions"
                description="The agent found no non-core SKUs meeting the ≥80% carry and high-sqft national threshold. Only the hard-locked Core / BG items will be national."
              />
            </Card>
          )}
        </Stack>
      ) : null}

      {/* ── Lock-status footer ─────────────────────────────────────────────── */}
      <Card sx={{ ...panelSx, background: "var(--color-success-soft)", border: "1.5px solid var(--color-success)" }}>
        <Stack direction="row" align="center" gap={3} wrap>
          <Text variant="subheading">🔒</Text>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="body-strong" tone="success">{totalCore} SKUs will be locked as National Core</Text>
            <Text variant="caption" tone="muted">
              These appear pre-filled and locked in Regional Review and Store Curation. They cannot be removed by regional
              managers or store teams.
            </Text>
          </Stack>
          <Button variant="primary" size="medium" onClick={() => onNavigate && onNavigate("regional")} style={{ flexShrink: 0 }}>
            Advance to Regional Review →
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}
