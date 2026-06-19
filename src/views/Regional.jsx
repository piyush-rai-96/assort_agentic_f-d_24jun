import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, EmptyState, FiltersStrip, FilterPanel } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import FdSelect from "../components/FdSelect.jsx";
import { color } from "../styles/tokens.js";
import SkuSwatch from "../components/SkuSwatch.jsx";
import SkuMedia from "../components/SkuMedia.jsx";
import { FD_STORES } from "../data/stores.js";
import { FD_SKUS } from "../data/skus.js";
import { FD_CLUST_SCENARIOS } from "../data/clusters.js";
import {
  CORE_IDS,
  clusterSkus,
  storeOnlySkus,
  r13forStore,
  clusterAvgR13,
  nationalR13,
  storeUniqueRows,
} from "../data/regional.js";
import { CLUSTER_SLOTS, otbClusterConsumed, fmtCurrency, otbPct } from "../data/otb.js";
import { CATALOGUE_SKUS } from "../data/catalogue.js";
import "./Regional.css";
import { panelSx, softSx } from "../styles/panelSx.js";

/* Shared ASSORTMENT_PLAN state — written by Regional, read by StoreCuration */
export const ASSORTMENT_PLAN = {
  clusterDecisions: {},
};


const DEPT_OPTIONS = ["All", "Wood", "Tile", "Laminate & Vinyl"];
const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };
const VEL_BADGE = { A: "success", B: "info", C: "warning", D: "error" };

/* 3-tier legend → token color (functional tier indicator). */
const TIERS = [
  { icon: "🔒", label: "National Core", sub: "All stores · locked", tone: "success", barColor: color.success },
  { icon: "🗂", label: "Cluster Level", sub: "50%+ of cluster", tone: "teal", barColor: color.teal },
  { icon: "📍", label: "Store Picks", sub: "Store-specific", tone: "accent", barColor: color.accent },
];

const SC = FD_CLUST_SCENARIOS.B;

/* Reusable read-only SKU table. */
function SkuTable({ rows, carryHeader, label }) {
  const columns = useMemo(
    () => [
      { headerName: "Image", colId: "image", width: 72, minWidth: 72, maxWidth: 72,
        suppressSizeToFit: true, sortable: false, filter: false,
        cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
        cellRenderer: (p) => <SkuMedia sku={p.data} size={40} />,
      },
      { field: "desc", headerName: "Description", minWidth: 240, flex: 1, filter: "agTextColumnFilter",
        cellRenderer: (p) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
            <span>{p.value}</span>
          </div>
        ),
      },
      { field: "sku", headerName: "SKU", width: 120, filter: "agTextColumnFilter", cellStyle: () => ({ fontFamily: "var(--font-mono)", color: color.textMuted }) },
      { field: "dept", headerName: "Dept", width: 140, filter: "agSetColumnFilter" },
      { field: "size", headerName: "Size", width: 90, filter: "agSetColumnFilter" },
      { field: "price", headerName: "Price", width: 90, filter: "agNumberColumnFilter", valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      { field: "r13", headerName: "R13 Sqft", width: 110, filter: "agNumberColumnFilter", valueFormatter: (p) => (p.value ? `${Math.round(p.value)} sqft` : "—") },
      { field: "carry", headerName: carryHeader || "Carry", minWidth: 130, flex: 1 },
    ],
    [carryHeader]
  );
  return (
    <Table
      defaultColDef={{ floatingFilter: true }}
      cardContainer
      rowHeight="compact"
      tableHeader={label || `${rows.length} SKUs`}
      columnDefs={columns}
      rowData={rows}
      domLayout="autoHeight"
      hideTableSetting
      hideTableActions
      pagination={false}
    />
  );
}

/* Section title row shared across tiers. */
function SectionHeader({ icon, title, count, tone, sub }) {
  return (
    <Stack direction="row" align="center" gap={2} wrap>
      <Text variant="body-strong" tone={tone}>{icon} {title}</Text>
      <Badge variant="subtle" size="small" color={tone === "success" ? "success" : tone === "teal" ? "info" : "default"} label={`${count}`} />
      {sub ? <Text variant="caption" tone="muted">{sub}</Text> : null}
    </Stack>
  );
}

export default function Regional({ onNavigate }) {
  const [deptFilter, setDeptFilter] = useState("All");
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("dept");
  const [activeCluster, setActiveCluster] = useState(null);
  const [activeStore, setActiveStore] = useState(null);
  const [clusterAdds, setClusterAdds] = useState({});

  /* Derived filter tag for the strip */
  const filterTags = useMemo(() => {
    if (deptFilter === "All") return [];
    return [{ id: "dept", label: "Department", values: [{ id: 1, label: deptFilter }] }];
  }, [deptFilter]);

  /* FilterPanel tab config */
  const DEPT_FD_OPTIONS = DEPT_OPTIONS.map((d) => ({ value: d, label: d }));

  const filterPanelTabs = [
    {
      value: "dept",
      title: "Department",
      numberOfFilter: deptFilter !== "All" ? 1 : 0,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect
            label="Department"
            value={deptFilter}
            options={DEPT_FD_OPTIONS}
            onChange={(v) => setDeptFilter(v)}
            width={320}
          />
        </Stack>
      ),
    },
  ];

  const byDept = (skus) => (deptFilter === "All" ? skus : skus.filter((s) => s.dept === deptFilter));

  const openCluster = (id) => { setActiveCluster(id); setActiveStore(null); };
  const openStore = (clusterId, storeId) => { setActiveCluster(clusterId); setActiveStore(storeId); };
  const back = () => { if (activeStore) setActiveStore(null); else setActiveCluster(null); };
  const toggleAdd = (clusterId, skuId) => {
    setClusterAdds((prev) => {
      const cl = { ...(prev[clusterId] || {}) };
      if (cl[skuId]) delete cl[skuId];
      else cl[skuId] = true;
      const next = { ...prev, [clusterId]: cl };
      // V3: sync to shared ASSORTMENT_PLAN so StoreCuration can read cluster decisions
      const flatDecisions = {};
      Object.entries(next).forEach(([cid, adds]) => {
        Object.keys(adds).forEach((sid) => {
          flatDecisions[`${cid}:${sid}`] = "add";
        });
      });
      ASSORTMENT_PLAN.clusterDecisions = flatDecisions;
      return next;
    });
  };

  const coreSidebar = useMemo(
    () => byDept(FD_SKUS.filter((s) => s.tag === "Core" || s.tag === "BG")),
    [deptFilter]
  );

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header + legend + dept filter ──────────────────────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="column" gap={3}>
          <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
            <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="title">Regional Review</Text>
              <Text variant="caption" tone="muted">
                3-tier assortment · National Core → Cluster → Store picks · {SC.name}
              </Text>
            </Stack>
            {activeCluster ? (
              <Button variant="secondary" size="small" onClick={back}>
                ← {activeStore ? "Cluster view" : "All clusters"}
              </Button>
            ) : null}
          </Stack>

            <Stack direction="column" gap={3}>
            <Stack direction="row" gap={2} wrap>
              {TIERS.map((t) => (
                <Stack
                  key={t.label}
                  direction="row"
                  align="center"
                  gap={2}
                  paddingX={3}
                  paddingY={2}
                  style={{ background: "var(--color-surface-alt)", borderLeft: `3px solid ${t.barColor}`, borderRadius: "var(--r2)" }}
                >
                  <Text variant="caption">{t.icon}</Text>
                  <Stack direction="column">
                    <Text variant="caption" tone={t.tone} style={{ fontWeight: 700 }}>{t.label}</Text>
                    <Text variant="micro" tone="muted">{t.sub}</Text>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          </Stack>
        </Stack>
      </Card>

      {/* ── Filters strip ──────────────────────────────────────────────────── */}
      <FiltersStrip
        filterTags={filterTags}
        filterButtonLabel="All Filters"
        filterButtonClick={() => setFilterPanelOpen(true)}
        hideSelectedFilterBadge
        recentFilters={[]}
        savedFiltersBadge={[]}
        savedFilterLists={[]}
        selectedFilter={null}
        setSelectedFilter={() => {}}
        handleBadgeChange={() => {}}
        handleSavedRecentFilterDropdown={() => {}}
      />
      <FilterPanel
        title="Regional Filters"
        size="medium"
        anchor="right"
        isOpen={filterPanelOpen}
        setIsOpen={setFilterPanelOpen}
        active={activeFilterTab}
        setActive={setActiveFilterTab}
        filters={filterPanelTabs}
        primaryButtonLabel="Apply"
        onPrimaryButtonClick={() => setFilterPanelOpen(false)}
        secondaryButtonLabel="Clear all"
        onSecondaryButtonClick={() => setDeptFilter("All")}
      />

      {/* ── Body: National Core sidebar + main panel ───────────────────────── */}
      <Stack direction="row" gap={4} align="flex-start" wrap>
        <Card sx={{ ...panelSx, width: 240, flexShrink: 0, padding: 0, overflow: "hidden" }}>
          <Stack direction="column" gap={1} paddingX={3} paddingY={3} style={{ background: "var(--color-success-soft)", borderBottom: "1px solid var(--color-border)" }}>
            <Text variant="overline" tone="success">🔒 National Core</Text>
            <Text variant="micro" tone="muted">{coreSidebar.length} SKUs · all {FD_STORES.length} stores</Text>
          </Stack>
          <Stack direction="column" className="rr-core-list">
            {coreSidebar.map((sku) => (
              <Stack key={sku.sku} direction="row" align="flex-start" gap={2} paddingX={3} paddingY={2} className="rr-core-row">
                <SkuSwatch sku={sku} size={28} />
                <Stack direction="column" gap={1} style={{ minWidth: 0 }}>
                  <Text variant="caption" tone="strong">{sku.desc}</Text>
                  <Stack direction="row" gap={1} wrap align="center">
                    <Badge variant="subtle" size="small" color={DEPT_BADGE[sku.dept] || "default"} label={sku.dept} />
                    <Badge variant="subtle" size="small" color="success" label={sku.tag} />
                  </Stack>
                  <Text variant="micro" tone="muted" mono>${sku.price.toFixed(2)} · {Math.round(nationalR13(sku.sku))} sqft nat'l</Text>
                </Stack>
              </Stack>
            ))}
          </Stack>
        </Card>

        <Stack direction="column" gap={4} flex="1 1 460px" style={{ minWidth: 0 }}>
          {!activeCluster ? (
            <ClusterOverview byDept={byDept} clusterAdds={clusterAdds} onReview={openCluster} onStore={openStore} />
          ) : (
            <ClusterDetail
              clusterId={activeCluster}
              activeStore={activeStore}
              deptFilter={deptFilter}
              byDept={byDept}
              clusterAdds={clusterAdds}
              onStore={openStore}
              onToggleAdd={toggleAdd}
            />
          )}
        </Stack>
      </Stack>

      {/* ── Advance footer ─────────────────────────────────────────────────── */}
      <Card sx={{ ...panelSx, background: "var(--color-success-soft)", border: "1.5px solid var(--color-success)" }}>
        <Stack direction="row" align="center" gap={3} wrap>
          <Text variant="subheading">🗂</Text>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="body-strong" tone="success">Cluster decisions feed Store Curation</Text>
            <Text variant="caption" tone="muted">
              Cluster-level adds lock those SKUs for every store in the cluster. Store teams can still add their own store picks on top.
            </Text>
          </Stack>
          <Button variant="primary" size="medium" onClick={() => onNavigate && onNavigate("store-curation")} style={{ flexShrink: 0 }}>
            Advance to Store Curation →
          </Button>
        </Stack>
      </Card>
    </Stack>
  );
}

/* ════════════ ALL-CLUSTERS OVERVIEW ════════════ */
function ClusterOverview({ byDept, clusterAdds, onReview, onStore }) {
  return (
    <Stack direction="column" gap={3}>
      <Text variant="body-strong" tone="strong">Cluster assortment overview — open a cluster or store to drill in</Text>
      {SC.clusters.map((cl) => {
        const clSkus = byDept(clusterSkus(cl));
        const stores = cl.stores.map((id) => FD_STORES.find((s) => s.id === id)).filter(Boolean);
        const addCount = Object.keys(clusterAdds[cl.id] || {}).length;
        const storePickTotal = stores.reduce((a, s) => a + storeOnlySkus(s.id, cl).length, 0);

        return (
          <Card key={cl.id} sx={panelSx}>
            <Stack direction="column" gap={3}>
              {/* Cluster header */}
              <Stack direction="row" align="center" gap={3} wrap>
                <span className="rr-dot" style={{ background: cl.color }} />
                <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                  <Text variant="body-strong" tone="strong">{cl.label}</Text>
                  <Stack direction="row" gap={2} align="center" wrap>
                    <Text variant="caption" tone="muted">{stores.length} stores · {clSkus.length} cluster SKUs</Text>
                    {addCount ? <Badge variant="subtle" size="small" color="info" label={`+${addCount} regional adds`} /> : null}
                  </Stack>
                </Stack>
                <Stack direction="row" gap={3} align="center" wrap>
                  <Stack direction="column" align="center" paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)" }}>
                    <Text variant="body-strong" tone="teal">{clSkus.length}</Text>
                    <Text variant="micro" tone="muted">Cluster SKUs</Text>
                  </Stack>
                  <Stack direction="column" align="center" paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)" }}>
                    <Text variant="body-strong" tone="accent">{storePickTotal}</Text>
                    <Text variant="micro" tone="muted">Store picks</Text>
                  </Stack>
                </Stack>
                <Button variant="primary" size="small" onClick={() => onReview(cl.id)}>Review →</Button>
              </Stack>

              {/* Store pills */}
              <Stack direction="row" gap={2} wrap>
                {stores.map((s) => (
                  <Button key={s.id} variant="tertiary" size="small" onClick={() => onStore(cl.id, s.id)}>
                    {s.velocity} · {s.name}
                  </Button>
                ))}
              </Stack>

              {/* OTB slot indicator */}
              <div className="rr-otb-slot">
                <span className="rr-otb-slot-label">Cluster slots</span>
                <span className={`rr-otb-slot-count ${addCount > (CLUSTER_SLOTS[cl.id] || 10) ? "over" : ""}`}>
                  {addCount} / {CLUSTER_SLOTS[cl.id] || 10} used
                </span>
                <div className="rr-otb-slot-bar">
                  <div
                    className="rr-otb-slot-fill"
                    style={{
                      width: `${Math.min(100, (addCount / (CLUSTER_SLOTS[cl.id] || 10)) * 100)}%`,
                      background: addCount > (CLUSTER_SLOTS[cl.id] || 10) ? "var(--color-error)" : "var(--color-success)",
                    }}
                  />
                </div>
              </div>

              {/* Top SKU chips */}
              {clSkus.length ? (
                <Stack direction="row" gap={2} wrap align="center">
                  {clSkus.slice(0, 5).map((s) => (
                    <Stack key={s.sku} direction="column" paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)" }}>
                      <Text variant="caption" tone="strong">{s.vsn}</Text>
                      <Text variant="micro" tone="muted">{s.storeCount}/{s.totalStores} stores</Text>
                    </Stack>
                  ))}
                  {clSkus.length > 5 ? <Text variant="caption" tone="subtle">+{clSkus.length - 5} more</Text> : null}
                </Stack>
              ) : null}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}

/* ════════════ CLUSTER DETAIL / STORE DRILL-IN ════════════ */
function ClusterDetail({ clusterId, activeStore, deptFilter, byDept, clusterAdds, onStore, onToggleAdd }) {
  const cl = SC.clusters.find((c) => c.id === clusterId);
  if (!cl) return <Card sx={panelSx}><Text tone="muted">Cluster not found.</Text></Card>;

  const clStores = cl.stores.map((id) => FD_STORES.find((s) => s.id === id)).filter(Boolean);
  const clSkusFull = clusterSkus(cl);
  const clSkus = byDept(clSkusFull);
  const adds = clusterAdds[cl.id] || {};

  /* ── STORE DRILL-IN ─────────────────────────────────────────────────────── */
  if (activeStore) {
    const store = FD_STORES.find((s) => s.id === activeStore);
    if (!store) return <Card sx={panelSx}><Text tone="muted">Store not found.</Text></Card>;

    const rows = storeUniqueRows(store.id).filter((r) => {
      if (deptFilter === "All") return true;
      const s = FD_SKUS.find((x) => x.sku === r.sku);
      return s && s.dept === deptFilter;
    });

    const toRow = (r) => {
      const s = FD_SKUS.find((x) => x.sku === r.sku) || {};
      const inCore = CORE_IDS.has(r.sku);
      const clMatch = clSkusFull.find((cs) => cs.sku === r.sku);
      const carry = inCore ? "🔒 All stores" : clMatch ? `${clMatch.storeCount}/${cl.stores.length} in cluster` : "Store only";
      return { desc: r.desc, sku: String(r.sku), dept: r.dept, size: s.size || "—", price: s.price ?? r.menuPrice ?? 0, r13: r13forStore(store.id, r.sku), carry };
    };

    const coreRows = rows.filter((r) => CORE_IDS.has(r.sku)).map(toRow);
    const clustRows = rows.filter((r) => !CORE_IDS.has(r.sku) && clSkusFull.find((cs) => cs.sku === r.sku)).map(toRow);
    const storeRows = rows.filter((r) => !CORE_IDS.has(r.sku) && !clSkusFull.find((cs) => cs.sku === r.sku)).map(toRow);

    const kpis = [
      { l: "National Core", v: coreRows.length, tone: "success", note: "Locked · all stores" },
      { l: "Cluster Level", v: clustRows.length, tone: "teal", note: cl.label },
      { l: "Store Picks", v: storeRows.length, tone: "accent", note: "This store only" },
    ];

    return (
      <Stack direction="column" gap={4}>
        <Stack direction="row" align="center" gap={2} wrap>
          <span className="rr-dot" style={{ background: cl.color, width: 10, height: 10 }} />
          <Text variant="subheading" tone="strong">{store.name}</Text>
          <Badge variant="subtle" size="small" color={VEL_BADGE[store.velocity] || "default"} label={`Vel ${store.velocity}`} />
          <Text variant="caption" tone="muted">{store.region} · DC{store.dc}</Text>
        </Stack>

        <Grid columns={3} gap={3}>
          {kpis.map((m) => (
            <Card key={m.l} sx={softSx}>
              <Stack direction="column" gap={1} align="center">
                <Text variant="kpi" tone={m.tone}>{m.v}</Text>
                <Text variant="caption" tone={m.tone} style={{ fontWeight: 700 }}>{m.l}</Text>
                <Text variant="micro" tone="muted">{m.note}</Text>
              </Stack>
            </Card>
          ))}
        </Grid>

        {coreRows.length ? (
          <Stack direction="column" gap={2}>
            <SectionHeader icon="🔒" title="National Core" count={coreRows.length} tone="success" sub="Locked · cannot change" />
            <SkuTable rows={coreRows} carryHeader="Carry" label="National Core SKUs" />
          </Stack>
        ) : null}
        {clustRows.length ? (
          <Stack direction="column" gap={2}>
            <SectionHeader icon="🗂" title="Cluster Level" count={clustRows.length} tone="teal" sub={cl.label} />
            <SkuTable rows={clustRows} carryHeader="Carry" label="Cluster-level SKUs" />
          </Stack>
        ) : null}
        {storeRows.length ? (
          <Stack direction="column" gap={2}>
            <SectionHeader icon="📍" title="Store Picks" count={storeRows.length} tone="accent" sub="This store only" />
            <SkuTable rows={storeRows} carryHeader="Status" label="Store pick SKUs" />
          </Stack>
        ) : null}
      </Stack>
    );
  }

  /* ── CLUSTER DETAIL (no store) ──────────────────────────────────────────── */
  return (
    <Stack direction="column" gap={4}>
      <Stack direction="row" align="center" gap={2} wrap>
        <span className="rr-dot" style={{ background: cl.color }} />
        <Text variant="subheading" tone="strong">{cl.label}</Text>
        <Text variant="caption" tone="muted">{clStores.length} stores · {clSkus.length} cluster-level SKUs</Text>
      </Stack>

      {/* Store pills */}
      <Stack direction="row" gap={2} wrap>
        {clStores.map((s) => (
          <Button key={s.id} variant="secondary" size="small" onClick={() => onStore(cl.id, s.id)}>
            {s.velocity} · {s.name} →
          </Button>
        ))}
      </Stack>

      {/* Cluster-level assortment — interactive add toggle */}
      <Stack direction="column" gap={2}>
        <SectionHeader icon="🗂" title="Cluster-Level Assortment" count={clSkus.length} tone="teal" sub="Carried by ≥50% of cluster stores · not Core/BG" />
        {clSkus.length ? (
          <Card sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
            {clSkus.map((s) => {
              const added = !!adds[s.sku];
              return (
                <Stack key={s.sku} className={`rr-add-row${added ? " is-added" : ""}`} direction="row" align="center" gap={4} wrap paddingX={4} paddingY={3}>
                  <Stack direction="row" align="center" gap={2} flex="1 1 240px" style={{ minWidth: 0 }}>
                    <SkuSwatch sku={s} size={30} />
                    <Stack direction="column" gap={1} style={{ minWidth: 0 }}>
                      <Text variant="body-strong" tone="strong">{s.desc}</Text>
                    <Stack direction="row" gap={2} align="center" wrap>
                      <Text variant="micro" tone="subtle" mono>{s.sku}</Text>
                      <Badge variant="subtle" size="small" color={DEPT_BADGE[s.dept] || "default"} label={s.dept} />
                      <Text variant="micro" tone="muted">{s.subDept}</Text>
                      </Stack>
                    </Stack>
                  </Stack>
                  <Stack direction="column" gap={1} style={{ width: 90, flexShrink: 0 }}>
                    <Text variant="micro" tone="muted">Avg R13</Text>
                    <Text variant="body-strong" tone="strong">{clusterAvgR13(cl, s.sku)} sqft</Text>
                  </Stack>
                  <Stack direction="column" gap={1} style={{ width: 110, flexShrink: 0 }}>
                    <Text variant="micro" tone="muted">Carry</Text>
                    <Text variant="body-strong" tone="strong">{s.storeCount}/{s.totalStores} stores</Text>
                  </Stack>
                  <Stack direction="column" gap={1} style={{ width: 70, flexShrink: 0 }}>
                    <Text variant="micro" tone="muted">Price</Text>
                    <Text variant="body-strong" tone="strong" mono>${s.price.toFixed(2)}</Text>
                  </Stack>
                  <Button variant={added ? "primary" : "secondary"} size="small" onClick={() => onToggleAdd(cl.id, s.sku)} style={{ flexShrink: 0 }}>
                    {added ? "Added ✓" : "Add"}
                  </Button>
                </Stack>
              );
            })}
          </Card>
        ) : (
          <Card sx={softSx}>
            <EmptyState heading="No cluster-level SKUs" description="No non-core SKUs reach the 50% cluster-carry threshold for this department filter." />
          </Card>
        )}
      </Stack>

      {/* Store picks by store */}
      <Stack direction="column" gap={2}>
        <SectionHeader icon="📍" title="Store Picks by Store" count={`${clStores.length} stores`} tone="accent" sub="SKUs unique to each store within this cluster" />
        {clStores.map((s) => {
          const picks = byDept(storeOnlySkus(s.id, cl));
          const pickRows = picks.map((sku) => ({
            desc: sku.desc, sku: String(sku.sku), dept: sku.dept, size: sku.size || "—", price: sku.price, r13: r13forStore(s.id, sku.sku), carry: "Store only",
          }));
          return (
            <Card key={s.id} sx={{ ...softSx, padding: 0, overflow: "hidden" }}>
              <Stack direction="row" align="center" justify="space-between" gap={3} wrap paddingX={3} paddingY={2} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Stack direction="row" align="center" gap={2}>
                  <Badge variant="subtle" size="small" color={VEL_BADGE[s.velocity] || "default"} label={s.velocity} />
                  <Text variant="body-strong" tone="strong">{s.name}</Text>
                </Stack>
                <Stack direction="row" align="center" gap={2}>
                  <Badge variant="subtle" size="small" color="default" label={`${picks.length} picks`} />
                  <Button variant="tertiary" size="small" onClick={() => onStore(cl.id, s.id)}>Full view →</Button>
                </Stack>
              </Stack>
              {pickRows.length ? (
                <Stack paddingX={2} paddingY={2}>
                  <SkuTable rows={pickRows} carryHeader="Status" label="Store pick SKUs" />
                </Stack>
              ) : (
                <Stack paddingX={3} paddingY={3}>
                  <Text variant="micro" tone="subtle">No unique store picks in this department filter.</Text>
                </Stack>
              )}
            </Card>
          );
        })}
      </Stack>
    </Stack>
  );
}
