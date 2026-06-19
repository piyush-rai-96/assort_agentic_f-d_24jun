import React, { useMemo, useState } from "react";
import { Card, Badge, Table, Tabs, EmptyState } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import SkuSwatch from "../components/SkuSwatch.jsx";
import SkuMedia from "../components/SkuMedia.jsx";
import { color } from "../styles/tokens.js";
import { FD_STORES } from "../data/stores.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import { FD_CLUST_SCENARIOS } from "../data/clusters.js";
import "./StoreHub.css";
import { panelSx } from "../styles/panelSx.js";

/* Card style — neutralizes Impact UI's default minHeight/maxWidth so panels
   size to content with consistent token-driven padding (matches Today/Hindsight). */
/* Comparison pane: no inner padding (rows own their padding), clip to radius. */
const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };

const STORE_OPTIONS = FD_STORES.map((s) => ({ value: s.id, label: `${s.name} · ${s.region}` }));
const DEPT_OPTIONS = ["All", "Wood", "Tile", "Laminate & Vinyl"].map((d) => ({ value: d, label: d }));

const VELOCITY_BADGE = { A: "success", B: "info", C: "warning", D: "error" };
const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };

const TABS = [
  { value: 0, label: "SKU Comparison" },
  { value: 1, label: "Opportunities" },
  { value: 2, label: "Cluster Benchmarks" },
];

/* Unique-by-SKU rows for a given store (legacy storeSKUs()). */
function storeSKUs(sid) {
  const seen = {};
  return FD_ASSORTMENT.filter(
    (r) => r.storeId === sid && (seen[r.sku] ? false : (seen[r.sku] = true))
  );
}

export default function StoreHub() {
  const [storeId, setStoreId] = useState(104);
  const [compStoreId, setCompStoreId] = useState(107);
  const [dept, setDept] = useState("All");
  const [view, setView] = useState(0);

  const store = useMemo(() => FD_STORES.find((s) => s.id === storeId) || FD_STORES[0], [storeId]);

  // Comp store must differ from the primary store.
  const compOptions = useMemo(() => STORE_OPTIONS.filter((o) => o.value !== storeId), [storeId]);
  const effCompId = compStoreId !== storeId ? compStoreId : compOptions[0]?.value;
  const compStore = useMemo(
    () => FD_STORES.find((s) => s.id === effCompId) || FD_STORES.find((s) => s.id !== storeId),
    [effCompId, storeId]
  );

  const model = useMemo(() => {
    const filterDept = (rows) => (dept === "All" ? rows : rows.filter((r) => r.dept === dept));

    const myRows = storeSKUs(store.id);
    const compRows = storeSKUs(compStore.id);
    const mySkuIds = new Set(myRows.map((r) => r.sku));
    const compSkuIds = new Set(compRows.map((r) => r.sku));

    const myFiltered = filterDept(myRows);
    const compFiltered = filterDept(compRows);

    const compOnly = filterDept(compRows.filter((r) => !mySkuIds.has(r.sku)));
    const myOnly = filterDept(myRows.filter((r) => !compSkuIds.has(r.sku)));
    const diff = myFiltered.length - compFiltered.length;

    const kpis = [
      { label: "My SKUs", value: myFiltered.length, sub: store.name },
      { label: "Comp SKUs", value: compFiltered.length, sub: compStore.name },
      { label: "SKU gap", value: `${diff > 0 ? "+" : ""}${diff}`, sub: "vs comp", sign: diff },
      { label: "Comp-only", value: compOnly.length, sub: "opportunities" },
      { label: "My-only", value: myOnly.length, sub: "unique to me" },
    ];

    // ── SKU comparison rows (carry flags) ──────────────────────────────────
    const myList = myFiltered.map((r) => ({ ...r, inOther: compSkuIds.has(r.sku) }));
    const compList = compFiltered.map((r) => ({ ...r, inOther: mySkuIds.has(r.sku) }));

    // ── Opportunities (comp-only) ──────────────────────────────────────────
    const oppRows = compOnly.map((r) => ({
      desc: r.desc,
      sku: r.sku,
      dept: r.dept,
      price: r.menuPrice,
      compR13: Math.round(r.r13Sqft || 0),
    }));

    // ── Cluster benchmark (scenario B) ─────────────────────────────────────
    const myCluster = FD_CLUST_SCENARIOS.B.clusters.find((c) => c.stores.includes(store.id));
    const clusterStores = myCluster
      ? myCluster.stores.map((id) => FD_STORES.find((s) => s.id === id)).filter(Boolean)
      : [store];

    const statFor = (s) => {
      const rows = filterDept(storeSKUs(s.id));
      const r13 = rows.reduce((acc, r) => acc + (r.r13Sqft || 0), 0);
      return { store: s, skuCount: rows.length, r13, avgR13: rows.length ? r13 / rows.length : 0 };
    };
    const clusterStats = clusterStores.map(statFor).sort((a, b) => b.skuCount - a.skuCount);
    const clAvg = clusterStats.reduce((a, b) => a + b.skuCount, 0) / Math.max(clusterStats.length, 1);

    const clusterRows = clusterStats.map((ss) => ({
      store: `${ss.store.name}${ss.store.id === store.id ? "  ← You" : ""}`,
      isMe: ss.store.id === store.id,
      velocity: ss.store.velocity,
      skuCount: ss.skuCount,
      vsCluster: Math.round(ss.skuCount - clAvg),
      r13: Math.round(ss.r13),
      avgR13: Math.round(ss.avgR13),
    }));

    const natCounts = FD_STORES.map((s) => filterDept(storeSKUs(s.id)).length);
    const natAvg = natCounts.reduce((a, b) => a + b, 0) / natCounts.length;
    const myCount = filterDept(storeSKUs(store.id)).length;
    const benchMini = [
      { label: "My store", value: myCount, above: myCount >= natAvg },
      { label: "Nat'l avg", value: Math.round(natAvg) },
      { label: "Range", value: `${Math.min(...natCounts)}–${Math.max(...natCounts)}` },
    ];

    return {
      kpis,
      myList,
      compList,
      oppRows,
      clusterLabel: myCluster ? myCluster.label : "No cluster",
      clusterCount: clusterStores.length,
      clusterRows,
      benchMini,
    };
  }, [store, compStore, dept]);

  // ── Table column definitions ─────────────────────────────────────────────
  const oppColumns = useMemo(
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
      { field: "sku", headerName: "SKU", width: 130, filter: "agTextColumnFilter" },
      { field: "dept", headerName: "Dept", width: 150, filter: "agSetColumnFilter" },
      { field: "price", headerName: "Price", width: 100, filter: "agNumberColumnFilter", valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      {
        field: "compR13",
        headerName: "Comp R13",
        width: 120,
        filter: "agNumberColumnFilter",
        valueFormatter: (p) => `${p.value} sqft`,
        cellStyle: (p) => ({ color: p.value > 100 ? color.success : color.text, fontWeight: 600 }),
      },
    ],
    []
  );

  const clusterColumns = useMemo(
    () => [
      {
        field: "store",
        headerName: "Store",
        minWidth: 170,
        flex: 1,
        filter: "agTextColumnFilter",
        cellStyle: (p) => ({
          fontWeight: p.data.isMe ? 700 : 500,
          color: p.data.isMe ? color.primary : color.text,
        }),
      },
      { field: "velocity", headerName: "Vel.", width: 80, filter: "agSetColumnFilter" },
      { field: "skuCount", headerName: "SKUs", width: 90, filter: "agNumberColumnFilter" },
      {
        field: "vsCluster",
        headerName: "vs Cluster",
        width: 110,
        filter: "agNumberColumnFilter",
        valueFormatter: (p) => `${p.value > 0 ? "+" : ""}${p.value}`,
        cellStyle: (p) => ({
          color: p.value >= 0 ? color.success : color.error,
          fontWeight: 700,
        }),
      },
      { field: "r13", headerName: "R13 sqft", width: 110, filter: "agNumberColumnFilter" },
      { field: "avgR13", headerName: "Avg R13/SKU", width: 130, filter: "agNumberColumnFilter" },
    ],
    []
  );

  // ── Reusable dense SKU row for the comparison panes ───────────────────────
  const SkuRow = ({ r, kind }) => {
    const both = r.inOther;
    const glyph = both ? "●" : kind === "my" ? "○" : "⊕";
    const glyphTone = both ? "success" : kind === "my" ? "subtle" : "warning";
    return (
      <Stack direction="row" align="center" gap={3} paddingX={3} paddingY={2} className="sh-row">
        <SkuSwatch sku={{ desc: r.desc, dept: r.dept }} size={26} />
        <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
          <Text variant="caption" tone="default" truncate>{r.desc}</Text>
          <Stack direction="row" gap={2} align="center" wrap>
            {kind === "comp" && !both && (
              <Badge variant="subtle" size="small" color="warning" label="Not in my store" />
            )}
          </Stack>
        </Stack>
        <Text variant="caption" mono tone="muted" style={{ width: 58, textAlign: "right", flexShrink: 0 }}>
          ${r.menuPrice.toFixed(2)}
        </Text>
        <Text variant="caption" mono tone="subtle" style={{ width: 62, textAlign: "right", flexShrink: 0 }}>
          {Math.round(r.r13Sqft || 0)} sqft
        </Text>
        <Text variant="body" tone={glyphTone} className="sh-dot" style={{ width: 18, textAlign: "center", flexShrink: 0 }}>
          {glyph}
        </Text>
      </Stack>
    );
  };

  const ComparePane = ({ title, count, countColor, rows, kind }) => (
    <Card sx={paneSx}>
      <Stack
        direction="row"
        justify="space-between"
        align="center"
        gap={2}
        paddingX={4}
        paddingY={3}
        style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-surface-alt)" }}
      >
        <Text variant="body-strong" tone="strong" truncate>{title}</Text>
        <Badge variant="subtle" size="small" color={countColor} label={`${count} SKUs`} />
      </Stack>
      <Stack direction="column" className="sh-scroll">
        {rows.length ? (
          rows.map((r) => <SkuRow key={`${kind}-${r.sku}`} r={r} kind={kind} />)
        ) : (
          <Text variant="caption" tone="subtle" style={{ padding: "var(--sp-5)", textAlign: "center" }}>
            No SKUs for this department.
          </Text>
        )}
      </Stack>
    </Card>
  );

  // ── Panels ────────────────────────────────────────────────────────────────
  const panelSkus = (
    <Stack direction="column" gap={4}>
      <Grid min={340} gap={4} align="start">
        <ComparePane title={store.name} count={model.myList.length} countColor="success" rows={model.myList} kind="my" />
        <ComparePane title={compStore.name} count={model.compList.length} countColor="info" rows={model.compList} kind="comp" />
      </Grid>
      <Stack direction="row" gap={5} wrap>
        <Text variant="caption" tone="success">● Both stores carry</Text>
        <Text variant="caption" tone="subtle">○ My store only</Text>
        <Text variant="caption" tone="warning">⊕ Comp store only (opportunity)</Text>
      </Stack>
    </Stack>
  );

  const panelGaps = (
    <Stack direction="column" gap={4}>
      <Card sx={{ ...panelSx, padding: "var(--sp-3) var(--sp-4)", background: "var(--color-surface-alt)" }}>
        <Text variant="caption" tone="default">
          <strong>{model.oppRows.length} SKUs</strong> carried by <strong>{compStore.name}</strong> not in your assortment.
        </Text>
      </Card>
      {model.oppRows.length ? (
        <Table
      defaultColDef={{ floatingFilter: true }}
          tableHeader={`Opportunities · ${compStore.name}`}
          cardContainer
          rowHeight="compact"
          columnDefs={oppColumns}
          rowData={model.oppRows}
          domLayout="autoHeight"
          hideTableSetting
          hideTableActions
          suppressPaginationPanel
          pagination={false}
        />
      ) : (
        <Card sx={panelSx}>
          <EmptyState
            heading="No gaps"
            description={`You carry everything ${compStore.name} carries for this department.`}
          />
        </Card>
      )}
    </Stack>
  );

  const panelCluster = (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Text variant="subheading" tone="strong" style={{ marginBottom: "var(--sp-3)" }}>National benchmark</Text>
        <Grid columns={3} gap={3}>
          {model.benchMini.map((m) => (
            <Card key={m.label} sx={{ ...panelSx, padding: "var(--sp-3)", background: "var(--color-surface-alt)", boxShadow: "none" }}>
              <Stack direction="column" gap={1} align="center">
                <Text variant="kpi" tone="strong">{m.value}</Text>
                <Text variant="caption" tone="muted">{m.label}</Text>
                {m.above !== undefined && (
                  <Badge
                    variant="subtle"
                    size="small"
                    color={m.above ? "success" : "error"}
                    label={m.above ? "At / above avg" : "Below avg"}
                  />
                )}
              </Stack>
            </Card>
          ))}
        </Grid>
      </Card>

      <Stack direction="column" gap={3}>
        <Text variant="subheading" tone="strong">
          {model.clusterLabel} · {model.clusterCount} stores
        </Text>
        <Table
      defaultColDef={{ floatingFilter: true }}
          tableHeader="Cluster peers"
          cardContainer
          rowHeight="compact"
          columnDefs={clusterColumns}
          rowData={model.clusterRows}
          domLayout="autoHeight"
          hideTableSetting
          hideTableActions
          suppressPaginationPanel
          pagination={false}
        />
      </Stack>
    </Stack>
  );

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header: title + store / comp / dept selectors ─────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Store Hub</Text>
            <Text variant="caption" tone="muted">
              Compare SKU assortment, sister-store performance &amp; cluster benchmarks
            </Text>
          </Stack>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--sp-3)", flex: "0 0 auto", width: "clamp(300px, 46vw, 620px)" }}>
            <FdSelect label="My store" value={storeId} options={STORE_OPTIONS} onChange={(v) => setStoreId(Number(v))} width={210} isWithSearch />
            <FdSelect label="Sister / comp store" value={effCompId} options={compOptions} onChange={(v) => setCompStoreId(Number(v))} width={210} isWithSearch />
            <FdSelect label="Department" value={dept} options={DEPT_OPTIONS} onChange={setDept} width={160} />
          </div>
        </Stack>
      </Card>

      {/* ── KPI strip — neutral cards; emphasis via typography only ────────── */}
      <Grid min={150} gap={3}>
        {model.kpis.map((k) => (
          <Card key={k.label} sx={{ ...panelSx, padding: "var(--sp-3)" }}>
            <Stack direction="column" gap={1}>
              <Text variant="overline" tone="muted">{k.label}</Text>
              <Text variant="kpi" tone="strong">{k.value}</Text>
              <Text variant="caption" tone="subtle">{k.sub}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      {/* ── Tabbed content (Impact UI Tabs) ───────────────────────────────── */}
      <Tabs
        value={view}
        onChange={(_e, v) => setView(v)}
        tabNames={TABS}
        tabPanels={[panelSkus, panelGaps, panelCluster]}
      />
    </Stack>
  );
}
