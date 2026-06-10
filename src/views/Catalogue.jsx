import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { color } from "../styles/tokens.js";
import { FD_STORES } from "../data/stores.js";
import { FD_CLUST_SCENARIOS } from "../data/clusters.js";
import {
  CATALOGUE_SKUS,
  HARD_LOCKED_COUNT,
  STORE_PICK_COUNT,
  isNatLocked,
  isClusterAdd,
  runCatalogueAgent,
} from "../data/catalogue.js";

const panelSx = {
  maxWidth: "none",
  minHeight: "auto",
  width: "100%",
  padding: "var(--sp-4)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--r)",
  boxShadow: "var(--sh)",
  background: "var(--color-surface)",
};
const softSx = { ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none" };

const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };

/* Tier → label + token color (functional tier indicator). */
const TIER_META = {
  core: { label: "🔒 Core", color: color.success },
  cluster: { label: "🗂 Cluster", color: color.teal },
  store: { label: "📍 Store pick", color: color.accent },
};

const AGENT_TIERS = [
  { icon: "🔒", tier: "National Core", desc: "SKUs with ≥80% carry + high avg sqft → mandatory all stores", tone: "success" },
  { icon: "🗂", tier: "Cluster Level", desc: "SKUs with ≥70% carry within a cluster → mandatory for that cluster", tone: "teal" },
  { icon: "📍", tier: "Store Picks", desc: "Remaining catalogue SKUs available for individual store selection", tone: "accent" },
];

export default function Catalogue({ onNavigate }) {
  const [agentRun, setAgentRun] = useState(false);
  const [plan, setPlan] = useState({ natDecisions: {}, clusterDecisions: {}, agentRunAt: null });

  const scClusters = FD_CLUST_SCENARIOS.B.clusters;

  const runAgent = () => {
    setPlan(runCatalogueAgent());
    setAgentRun(true);
  };
  const reRun = () => {
    setPlan({ natDecisions: {}, clusterDecisions: {}, agentRunAt: null });
    setAgentRun(false);
  };

  const natCount = HARD_LOCKED_COUNT + Object.values(plan.natDecisions).filter((v) => v === "core").length;
  const clCount = Object.values(plan.clusterDecisions).filter((v) => v === "add").length;

  // ── Catalogue rows with live tier (recomputed from plan decisions) ─────────
  const rows = useMemo(
    () =>
      CATALOGUE_SKUS.map((sku) => {
        const id = parseInt(sku.id, 10);
        const tier = isNatLocked(id, plan.natDecisions) ? "core" : isClusterAdd(sku.id, plan.clusterDecisions) ? "cluster" : "store";
        return {
          name: sku.name,
          sku: sku.id,
          dept: sku.dept,
          subDept: sku.subDept || "—",
          price: sku.price,
          status: sku.status,
          tier,
        };
      }),
    [plan]
  );

  const columns = useMemo(
    () => [
      { field: "name", headerName: "Description", minWidth: 240, flex: 1, filter: "agTextColumnFilter" },
      { field: "sku", headerName: "SKU", width: 130, filter: "agTextColumnFilter", cellStyle: () => ({ fontFamily: "var(--font-mono)", color: color.textMuted }) },
      { field: "dept", headerName: "Dept", width: 150, filter: "agSetColumnFilter" },
      { field: "subDept", headerName: "Sub-Dept", minWidth: 160, flex: 1, filter: "agSetColumnFilter" },
      { field: "price", headerName: "Price", width: 100, filter: "agNumberColumnFilter", valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      { field: "status", headerName: "Status", width: 110, filter: "agSetColumnFilter" },
      {
        field: "tier",
        headerName: "Tier",
        width: 130,
        valueFormatter: (p) => (TIER_META[p.value] ?? TIER_META.store).label,
        cellStyle: (p) => ({ color: (TIER_META[p.value] ?? TIER_META.store).color, fontWeight: 700 }),
      },
    ],
    []
  );

  // ── Tier-cascade segment widths ────────────────────────────────────────────
  const total = CATALOGUE_SKUS.length;
  const t1w = Math.round((natCount / total) * 100);
  const t2w = Math.round((clCount / total) * 100);
  const t3w = Math.max(0, 100 - t1w - t2w);
  const cascade = [
    { tone: "success", barColor: color.success, w: t1w, label: "🔒 National Core", n: natCount, note: "Locked · all stores" },
    { tone: "teal", barColor: color.teal, w: t2w, label: "🗂 Cluster Adds", n: clCount, note: "Locked per cluster" },
    { tone: "accent", barColor: color.accent, w: t3w, label: "📍 Store Picks", n: STORE_PICK_COUNT, note: "Store-level choice" },
  ];

  const summaryCards = [
    { l: "National Core", v: natCount, sub: `Locked in all ${FD_STORES.length} stores`, tone: "success", mod: "national" },
    { l: "Cluster Adds", v: clCount, sub: `Across ${scClusters.length} behavioral clusters`, tone: "teal", mod: "regional" },
    { l: "Store Picks", v: STORE_PICK_COUNT, sub: "Available for store curation", tone: "accent", mod: "store-curation" },
  ];

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Catalogue</Text>
            <Text variant="caption" tone="muted">
              FW 2025 locked · {CATALOGUE_SKUS.length} SKUs · 3-tier assortment plan driven by agent recommendations
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

      {/* ── Agent CTA (pre-run) OR tier summary (post-run) ─────────────────── */}
      {!agentRun ? (
        <Card sx={panelSx}>
          <Stack direction="row" gap={3} align="flex-start" wrap>
            <Stack className="cat-agent-dot" align="center" justify="center" style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--color-primary-soft)", flexShrink: 0 }}>
              <Text variant="subheading">🤖</Text>
            </Stack>
            <Stack direction="column" gap={3} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Stack direction="column" gap={1}>
                <Text variant="subheading" tone="primary">Agent Assortment Recommendation</Text>
                <Text variant="caption" tone="muted">
                  The agent analyses R13 sell-through, carry rates, cluster performance, and any received forecasts across all
                  {" "}{FD_STORES.length} stores to recommend a 3-tier assortment plan — National Core, Cluster-level adds, and
                  Store picks. You review and adjust in each downstream step.
                </Text>
              </Stack>
              <Grid min={200} gap={3}>
                {AGENT_TIERS.map((t) => (
                  <Card key={t.tier} sx={softSx}>
                    <Stack direction="column" gap={1}>
                      <Text variant="subheading">{t.icon}</Text>
                      <Text variant="body-strong" tone={t.tone}>{t.tier}</Text>
                      <Text variant="micro" tone="muted">{t.desc}</Text>
                    </Stack>
                  </Card>
                ))}
              </Grid>
              <Stack direction="row" gap={3} align="center" wrap>
                <Button variant="primary" size="medium" onClick={runAgent}>🤖 Run agent recommendation</Button>
                <Text variant="micro" tone="subtle">
                  Recommendations are applied as defaults. You review and override in National Core → Regional Review → Store Curation.
                </Text>
              </Stack>
            </Stack>
          </Stack>
        </Card>
      ) : (
        <Stack direction="column" gap={4}>
          {/* Tier summary cards */}
          <Grid min={200} gap={3}>
            {summaryCards.map((m) => (
              <Card
                key={m.l}
                sx={{ ...panelSx, cursor: onNavigate ? "pointer" : "default" }}
                onClick={onNavigate ? () => onNavigate(m.mod) : undefined}
              >
                <Stack direction="column" gap={1}>
                  <Text variant="overline" tone="muted">{m.l}</Text>
                  <Text variant="kpi" tone={m.tone}>{m.v}</Text>
                  <Text variant="caption" tone="subtle">{m.sub}</Text>
                  <Text variant="caption" tone={m.tone}>Review &amp; adjust →</Text>
                </Stack>
              </Card>
            ))}
          </Grid>

          {/* Tier cascade */}
          <Card sx={panelSx}>
            <Text variant="body-strong" tone="strong" style={{ marginBottom: "var(--sp-3)" }}>Assortment Tier Cascade</Text>
            <Stack direction="row" gap={3} align="stretch" wrap>
              {cascade.map((t) => (
                <Stack
                  key={t.label}
                  direction="column"
                  gap={1}
                  flex={`${Math.max(t.w, 8)} 1 0`}
                  paddingX={3}
                  paddingY={3}
                  style={{ background: "var(--color-surface-alt)", borderTop: `3px solid ${t.barColor}`, borderRadius: "var(--r2)", minWidth: 0 }}
                >
                  <Text variant="caption" tone={t.tone}>{t.label}</Text>
                  <Text variant="title" tone={t.tone}>{t.n}</Text>
                  <Text variant="micro" tone="muted">{t.note}</Text>
                </Stack>
              ))}
            </Stack>
          </Card>
        </Stack>
      )}

      {/* ── Catalogue SKU table (always shown) ─────────────────────────────── */}
      <Stack direction="column" gap={3}>
        <Text variant="body-strong" tone="strong">All {CATALOGUE_SKUS.length} Catalogue SKUs</Text>
        <Table
      defaultColDef={{ floatingFilter: true }}
          cardContainer
          rowHeight="compact"
          tableHeader="FW 2025 catalogue"
          columnDefs={columns}
          rowData={rows}
          domLayout="autoHeight"
          hideTableSetting
          hideTableActions
          pagination={false}
        />
      </Stack>
    </Stack>
  );
}
