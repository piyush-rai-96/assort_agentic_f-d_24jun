import { useMemo, useState } from "react";
import { Card, Badge, Table, Tabs, FiltersStrip, FilterPanel } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { color } from "../styles/tokens.js";
import SkuSwatch from "../components/SkuSwatch.jsx";
import { FD_STORES } from "../data/stores.js";
import { FD_SKUS } from "../data/skus.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import "./Hindsight.css";
import { panelSx } from "../styles/panelSx.js";

/* Card style — neutralizes Impact UI's default minHeight/maxWidth so panels
   size to content with consistent token-driven padding. */

const DEPT_OPTIONS = ["All", "Wood", "Tile", "Laminate & Vinyl"].map((d) => ({ value: d, label: d }));
const STORE_OPTIONS = FD_STORES.map((s) => ({ value: s.id, label: s.name }));

const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };

const fmtK = (n) => (n >= 1000 ? `$${Math.round(n / 1000)}K` : `$${Math.round(n)}`);

const SKU_BY_ID = FD_SKUS.reduce((m, s) => {
  m[s.sku] = s;
  return m;
}, {});

export default function Hindsight({ user }) {
  const [storeId, setStoreId] = useState(user?.storeId || 101);
  const [dept, setDept] = useState("All");
  const [tab, setTab] = useState(0);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("store");

  const hindsightFilterTags = useMemo(() => {
    const storeName = STORE_OPTIONS.find((o) => o.value === storeId)?.label || String(storeId);
    const tags = [{ id: "store", label: "Store", values: [{ id: 1, label: storeName }] }];
    if (dept !== "All") tags.push({ id: "dept", label: "Dept", values: [{ id: 1, label: dept }] });
    return tags;
  }, [storeId, dept]);

  const store = useMemo(
    () => FD_STORES.find((s) => s.id === storeId) || FD_STORES[0],
    [storeId]
  );

  const model = useMemo(() => {
    const rows = FD_ASSORTMENT.filter((r) => r.storeId === storeId);
    const seen = {};
    const uniqueRows = rows.filter((r) => (seen[r.sku] ? false : (seen[r.sku] = true)));

    const deptFilter = (arr) => {
      if (dept === "All") return arr;
      return arr.filter((r) => SKU_BY_ID[r.sku]?.dept === dept);
    };
    const filtRows = deptFilter(rows);
    const filtUnique = deptFilter(uniqueRows);
    const natRows = deptFilter(FD_ASSORTMENT);

    const totalSqft = filtRows.reduce((a, r) => a + r.r13Sqft, 0);
    const totalSales = filtRows.reduce((a, r) => a + r.r13Sqft * r.menuPrice, 0);
    const natSqft = natRows.reduce((a, r) => a + r.r13Sqft, 0);
    const natSales = natRows.reduce((a, r) => a + r.r13Sqft * r.menuPrice, 0);
    const storeShare = natSales > 0 ? (totalSales / natSales * 100).toFixed(1) : 0;
    const wklySku = filtUnique.length > 0 ? Math.round(totalSales / 52 / filtUnique.length) : 0;

    const bySD = {};
    filtRows.forEach((r) => {
      const sku = SKU_BY_ID[r.sku];
      if (!sku) return;
      const k = `${sku.dept}|||${sku.subDept}`;
      if (!bySD[k]) bySD[k] = { dept: sku.dept, sub: sku.subDept, skus: new Set(), sqft: 0, sales: 0 };
      bySD[k].skus.add(r.sku);
      bySD[k].sqft += r.r13Sqft;
      bySD[k].sales += r.r13Sqft * r.menuPrice;
    });
    const sdList = Object.values(bySD).sort((a, b) => b.sales - a.sales);

    const natBySD = {};
    natRows.forEach((r) => {
      const sku = SKU_BY_ID[r.sku];
      if (!sku) return;
      const k = `${sku.dept}|||${sku.subDept}`;
      if (!natBySD[k]) natBySD[k] = { sqft: 0, sales: 0 };
      natBySD[k].sqft += r.r13Sqft;
      natBySD[k].sales += r.r13Sqft * r.menuPrice;
    });

    const skuSqft = {};
    filtRows.forEach((r) => {
      skuSqft[r.sku] = (skuSqft[r.sku] || 0) + r.r13Sqft;
    });
    const top5 = Object.entries(skuSqft)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([sku, sqft]) => ({ sku: SKU_BY_ID[parseInt(sku, 10)], sqft }))
      .filter((e) => e.sku);
    const maxTop = top5.length ? top5[0].sqft : 1;

    const attrDist = (attr, src, metric) => {
      const dist = {};
      src.forEach((r) => {
        const sku = SKU_BY_ID[r.sku];
        if (!sku) return;
        const val = sku[attr] || "Other";
        if (!dist[val]) dist[val] = { sqft: 0, count: 0 };
        dist[val].sqft += r.r13Sqft;
        dist[val].count++;
      });
      const total = metric === "count" ? src.length : totalSqft;
      return Object.entries(dist)
        .map(([val, o], i) => {
          const pct = total > 0 ? Math.round((metric === "count" ? o.count : o.sqft) / total * 100) : 0;
          const seed = (val.charCodeAt(0) || 5) * (i + 1);
          return { val, pct, delta: ((seed * 7) % 15) - 5 };
        })
        .sort((a, b) => b.pct - a.pct);
    };
    const colorDist = attrDist("color", filtRows, "sqft");
    const finishDist = attrDist("finish", filtRows, "sqft");
    const sizeDist = attrDist("size", filtUnique, "count");
    const priceTiers = [
      { l: "<$2", min: 0, max: 2 },
      { l: "$2–4", min: 2, max: 4 },
      { l: "$4–6", min: 4, max: 6 },
      { l: "$6–8", min: 6, max: 8 },
      { l: "$8+", min: 8, max: 999 },
    ];
    const priceDist = priceTiers
      .map((t, i) => {
        const cnt = filtUnique.filter((r) => {
          const sku = SKU_BY_ID[r.sku];
          return sku && sku.price >= t.min && sku.price < t.max;
        }).length;
        return {
          val: t.l,
          pct: filtUnique.length > 0 ? Math.round((cnt / filtUnique.length) * 100) : 0,
          delta: (((i + 1) * 7) % 9) - 3,
        };
      })
      .filter((d) => d.pct > 0 || d.val);

    const benchmark = sdList.map((sd) => {
      const natSD = natBySD[`${sd.dept}|||${sd.sub}`];
      const storePct = totalSqft > 0 ? Math.round((sd.sqft / totalSqft) * 100) : 0;
      const natPct = natSD && natSqft > 0 ? Math.round((natSD.sqft / natSqft) * 100) : 0;
      const carry = new Set(
        FD_ASSORTMENT.filter((r) => SKU_BY_ID[r.sku]?.subDept === sd.sub).map((r) => r.storeId)
      ).size;
      return {
        subDept: sd.sub,
        storePct,
        natPct,
        gap: storePct - natPct,
        carry: `${carry}/${FD_STORES.length}`,
      };
    });

    const insights = [];
    if (colorDist[0] && Math.abs(colorDist[0].delta) > 4)
      insights.push({
        icon: colorDist[0].delta > 0 ? "▲" : "▼",
        tone: colorDist[0].delta > 0 ? "success" : "error",
        txt: `${colorDist[0].val} ${colorDist[0].delta > 0 ? "up" : "down"} ${colorDist[0].delta > 0 ? "+" : ""}${colorDist[0].delta}pts · ${colorDist[0].pct}% of sqft`,
      });
    if (sdList[0]) {
      const sd = sdList[0];
      const natSD = natBySD[`${sd.dept}|||${sd.sub}`];
      const storePct = totalSqft > 0 ? Math.round((sd.sqft / totalSqft) * 100) : 0;
      const natPct = natSD && natSqft > 0 ? Math.round((natSD.sqft / natSqft) * 100) : 0;
      const gap = storePct - natPct;
      if (Math.abs(gap) > 5)
        insights.push({
          icon: gap > 0 ? "⬆" : "⬇",
          tone: gap > 0 ? "success" : "error",
          txt: `${sd.sub} ${gap > 0 ? "over" : "under"}-indexes ${gap > 0 ? "+" : ""}${gap}pts vs national (${storePct}% vs ${natPct}%)`,
        });
    }
    const slowSkus = filtUnique.filter((r) => (skuSqft[r.sku] || 0) < 50);
    if (slowSkus.length > 1)
      insights.push({
        icon: "⚠",
        tone: "warning",
        txt: `${slowSkus.length} SKUs under 50 sqft R13 — drop candidates for next PLR`,
      });
    if (finishDist[0] && finishDist[0].delta > 4)
      insights.push({
        icon: "▲",
        tone: "accent",
        txt: `${finishDist[0].val} finish up +${finishDist[0].delta}pts — align PLR adds`,
      });

    // Cluster peer comparison (mock: same velocity band stores)
    const clusterStores = FD_STORES.filter((s) => s.velocity === store.velocity && s.id !== storeId);
    const clusterRows = deptFilter(FD_ASSORTMENT.filter((r) => clusterStores.some((s) => s.id === r.storeId)));
    const clusterSales = clusterRows.reduce((a, r) => a + r.r13Sqft * r.menuPrice, 0);
    const clusterSqft = clusterRows.reduce((a, r) => a + r.r13Sqft, 0);
    const clusterAvgSales = clusterStores.length > 0 ? clusterSales / clusterStores.length : 0;
    const clusterAvgSqft = clusterStores.length > 0 ? clusterSqft / clusterStores.length : 0;
    const vsClusterSales = clusterAvgSales > 0 ? Math.round(((totalSales - clusterAvgSales) / clusterAvgSales) * 100) : 0;
    const vsClusterSqft = clusterAvgSqft > 0 ? Math.round(((totalSqft - clusterAvgSqft) / clusterAvgSqft) * 100) : 0;

    // Nat avg per store
    const natAvgSales = natSales > 0 ? natSales / FD_STORES.length : 0;
    const vsNetworkSales = natAvgSales > 0 ? Math.round(((totalSales - natAvgSales) / natAvgSales) * 100) : 0;

    const kpis = [
      { label: "R13 Sales",         value: fmtK(totalSales),                        sub: `${filtUnique.length} SKUs` },
      { label: "R13 Sqft",          value: Math.round(totalSqft).toLocaleString(),   sub: "sqft" },
      { label: "Nat'l Share",       value: `${storeShare}%`,                         sub: "of network" },
      { label: "Wkly $/SKU",        value: `$${wklySku}`,                            sub: "avg" },
      {
        label: "vs Cluster avg",
        value: `${vsClusterSales > 0 ? "+" : ""}${vsClusterSales}%`,
        sub: `Vel ${store.velocity} peers`,
        delta: vsClusterSales,
      },
      {
        label: "vs Network avg",
        value: `${vsNetworkSales > 0 ? "+" : ""}${vsNetworkSales}%`,
        sub: "all stores",
        delta: vsNetworkSales,
      },
    ];

    const deptGroups = [
      { label: "Wood", list: sdList.filter((d) => d.dept === "Wood") },
      { label: "Tile", list: sdList.filter((d) => d.dept === "Tile") },
      { label: "Laminate & Vinyl", list: sdList.filter((d) => d.dept === "Laminate & Vinyl") },
    ].filter((g) => g.list.length);

    return {
      kpis,
      deptGroups,
      top5,
      maxTop,
      totalSqft,
      attrCards: [
        { title: "Color Mix", dist: colorDist },
        { title: "Finish Mix", dist: finishDist },
        { title: "Size Mix", dist: sizeDist },
        { title: "Price Tiers", dist: priceDist },
      ],
      benchmark,
      insights,
      // V3 Benchmarks tab: dept-level bars (store vs cluster vs network)
      deptBenchmarks: (() => {
        const DEPTS = ["Wood", "Tile", "Laminate & Vinyl"];
        return DEPTS.map((d) => {
          const storeR = deptFilter(rows.filter((r) => SKU_BY_ID[r.sku]?.dept === d));
          const clR = clusterRows.filter((r) => SKU_BY_ID[r.sku]?.dept === d);
          const natR = natRows.filter((r) => SKU_BY_ID[r.sku]?.dept === d);
          const sSales = storeR.reduce((a, r) => a + r.r13Sqft * r.menuPrice, 0);
          const cAvgSales = clusterStores.length > 0 ? clR.reduce((a, r) => a + r.r13Sqft * r.menuPrice, 0) / clusterStores.length : 0;
          const nAvgSales = natR.reduce((a, r) => a + r.r13Sqft * r.menuPrice, 0) / FD_STORES.length;
          return { dept: d, store: Math.round(sSales), cluster: Math.round(cAvgSales), network: Math.round(nAvgSales) };
        });
      })(),
    };
  }, [storeId, dept]);

  const benchmarkColumns = useMemo(
    () => [
      {
        field: "subDept",
        headerName: "Sub-Dept",
        minWidth: 200,
        flex: 2,
        filter: "agTextColumnFilter",
        floatingFilter: true,
        cellStyle: { fontWeight: 500 },
      },
      {
        field: "storePct",
        headerName: "Store %",
        minWidth: 100,
        flex: 1,
        filter: false,
        valueFormatter: (p) => `${p.value}%`,
        cellStyle: { textAlign: "right" },
        headerClass: "ag-right-aligned-header",
      },
      {
        field: "natPct",
        headerName: "Nat %",
        minWidth: 100,
        flex: 1,
        filter: false,
        valueFormatter: (p) => `${p.value}%`,
        cellStyle: { textAlign: "right" },
        headerClass: "ag-right-aligned-header",
      },
      {
        field: "gap",
        headerName: "Gap",
        minWidth: 90,
        flex: 1,
        filter: false,
        cellRenderer: (p) => {
          const v = p.value;
          const c = v > 3 ? color.success : v < -3 ? color.error : color.textSubtle;
          const bg = v > 3 ? color.successSoft : v < -3 ? color.errorSoft : color.surfaceAlt;
          return (
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: "2px 10px", borderRadius: "var(--r2)",
              background: bg, color: c, fontWeight: 700, fontSize: "var(--fs-caption)",
            }}>
              {v > 0 ? "+" : ""}{v}
            </span>
          );
        },
        cellStyle: { textAlign: "center" },
        headerClass: "ag-center-aligned-header",
      },
      {
        field: "carry",
        headerName: "Carry",
        minWidth: 90,
        flex: 1,
        filter: false,
        cellStyle: { textAlign: "right", color: "var(--color-text-muted)" },
        headerClass: "ag-right-aligned-header",
      },
    ],
    []
  );

  // KPI delta coloring
  const deltaColor = (d) => d > 0 ? color.success : d < 0 ? color.error : color.textSubtle;

  const benchmarksTab = (
    <Stack direction="column" gap={4}>
      <Text variant="body-strong" tone="strong">Department R13 — This Store vs Cluster Avg vs Network Avg</Text>
      {model.deptBenchmarks.map((db) => {
        const max = Math.max(db.store, db.cluster, db.network, 1);
        return (
          <Card key={db.dept} sx={panelSx}>
            <Text variant="body-strong" tone="strong" style={{ marginBottom: 12 }}>{db.dept}</Text>
            {[
              { label: "This store", value: db.store, color: color.primary },
              { label: "Cluster avg",   value: db.cluster, color: color.teal },
              { label: "Network avg",  value: db.network, color: "var(--color-text-subtle)" },
            ].map((row) => (
              <Stack key={row.label} direction="row" align="center" gap={2} style={{ marginBottom: 8 }}>
                <Text variant="micro" tone="muted" style={{ width: 90, flexShrink: 0 }}>{row.label}</Text>
                <div style={{ flex: 1, height: 8, background: "var(--color-border)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(row.value / max) * 100}%`, background: row.color, borderRadius: 4 }} />
                </div>
                <Text variant="micro" mono tone="strong" style={{ width: 68, flexShrink: 0, textAlign: "right" }}>{fmtK(row.value)}</Text>
              </Stack>
            ))}
          </Card>
        );
      })}
    </Stack>
  );

  const overviewTab = (
    <Stack direction="column" gap={4}>
      {/* ── Row 1: KPI strip (6 cols) ──────────────────────────────────────── */}
      <Grid min={150} gap={3}>
        {model.kpis.map((k) => (
          <Card key={k.label} sx={{ ...panelSx, padding: "var(--sp-3)" }}>
            <Stack direction="column" gap={1}>
              <Text variant="overline" tone="muted">{k.label}</Text>
              <Text variant="kpi" style={{ color: k.delta != null ? deltaColor(k.delta) : undefined }}>{k.value}</Text>
              <Text variant="caption" tone="subtle">{k.sub}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      {/* ── Row 2: sub-dept performance ────────────────────────────────────── */}
      <Grid min={280} gap={4}>
        {model.deptGroups.map((dg) => {
          const tot = dg.list.reduce((a, d) => a + d.sales, 0);
          return (
            <Card key={dg.label} sx={panelSx}>
              <Stack direction="row" justify="space-between" align="center" gap={2} style={{ marginBottom: "var(--sp-3)" }}>
                <Text variant="subheading" tone="strong">{dg.label}</Text>
                <Text variant="caption" tone="subtle">{fmtK(tot)} · {dg.list.length} sub-depts</Text>
              </Stack>
              <Stack direction="column" gap={3}>
                {dg.list.map((sd, i) => {
                  const salesPct = tot > 0 ? Math.round((sd.sales / tot) * 100) : 0;
                  const wkly = sd.skus.size > 0 ? Math.round(sd.sales / 52 / sd.skus.size) : 0;
                  return (
                    <Stack key={sd.sub} direction="column" gap={1}>
                      <Stack direction="row" justify="space-between" align="center" gap={2}>
                        <Text variant={i === 0 ? "body-strong" : "caption"} tone={i === 0 ? "strong" : "muted"}>{sd.sub}</Text>
                        <Text variant="caption" mono tone={i === 0 ? "strong" : "muted"}>{salesPct}%</Text>
                      </Stack>
                      <div className="hs-bar">
                        <span style={{ width: `${salesPct}%`, opacity: i === 0 ? 1 : 0.55 }} />
                      </div>
                      <Stack direction="row" gap={3}>
                        <Text variant="micro" tone="subtle">{sd.skus.size} SKUs</Text>
                        <Text variant="micro" tone="subtle">{fmtK(sd.sales)}</Text>
                        <Text variant="micro" tone="subtle">${wkly}/SKU/wk</Text>
                      </Stack>
                    </Stack>
                  );
                })}
              </Stack>
            </Card>
          );
        })}
      </Grid>

      {/* ── Row 3: top 5 SKUs + attribute mix ──────────────────────────────── */}
      <Grid min={340} gap={4} align="start">
        <Card sx={panelSx}>
          <Text variant="subheading" tone="strong" style={{ marginBottom: "var(--sp-3)" }}>Top 5 SKUs by R13</Text>
          <Stack direction="column" gap={3}>
            {model.top5.map((e, i) => {
              const barW = Math.round((e.sqft / model.maxTop) * 100);
              const pct = model.totalSqft > 0 ? Math.round((e.sqft / model.totalSqft) * 100) : 0;
              return (
                <Stack key={e.sku.sku} direction="column" gap={2}>
                  <Stack direction="row" justify="space-between" align="center" gap={3}>
                    <Stack direction="row" align="center" gap={2} style={{ minWidth: 0 }}>
                      <SkuSwatch sku={e.sku} size={i === 0 ? 28 : 22} />
                      <Text variant={i === 0 ? "body-strong" : "caption"} tone={i === 0 ? "strong" : "default"} truncate>{e.sku.desc}</Text>
                    </Stack>
                    <Text variant="caption" mono tone="strong" style={{ whiteSpace: "nowrap" }}>{Math.round(e.sqft)} sqft</Text>
                  </Stack>
                  <Stack direction="row" align="center" gap={3}>
                    <div className="hs-bar" style={{ flex: 1 }}>
                      <span style={{ width: `${barW}%` }} />
                    </div>
                    <Text variant="micro" tone="subtle" style={{ minWidth: 30, textAlign: "right" }}>{pct}%</Text>
                    <Badge variant="subtle" size="small" color={DEPT_BADGE[e.sku.dept] || "info"} label={e.sku.dept.split(" ")[0]} />
                  </Stack>
                </Stack>
              );
            })}
          </Stack>
        </Card>

        <Grid columns={2} gap={4}>
          {model.attrCards.map((ac) => (
            <Card key={ac.title} sx={panelSx}>
              <Text variant="overline" tone="muted" style={{ marginBottom: "var(--sp-3)", display: "block" }}>{ac.title}</Text>
              <Stack direction="column" gap={3}>
                {ac.dist.slice(0, 5).map((d) => (
                  <Stack key={d.val} direction="column" gap={1}>
                    <Stack direction="row" align="center" gap={2}>
                      <Text variant="caption" tone="muted" truncate style={{ flex: 1 }}>{d.val}</Text>
                      <Text variant="caption" mono tone="strong">{d.pct}%</Text>
                      <Badge variant="subtle" size="small" color={d.delta > 0 ? "success" : d.delta < 0 ? "error" : "neutral"} label={`${d.delta > 0 ? "+" : ""}${d.delta}`} />
                    </Stack>
                    <div className="hs-bar">
                      <span style={{ width: `${Math.min(d.pct * 2.5, 100)}%` }} />
                    </div>
                  </Stack>
                ))}
              </Stack>
            </Card>
          ))}
        </Grid>
      </Grid>

      {/* ── Row 4: Signals banner + full-width vs National table ──────────────── */}
      <Stack direction="column" gap={4}>
        {/* Signals — horizontal strip above the table */}
        <Card sx={panelSx} style={{ padding: "var(--sp-3) var(--sp-4)" }}>
          <Stack direction="row" align="flex-start" gap={4} style={{ flexWrap: "wrap" }}>
            <Text variant="overline" tone="subtle" style={{ whiteSpace: "nowrap", minWidth: 56, paddingTop: 2 }}>Signals</Text>
            {model.insights.length ? (
              model.insights.map((ins, i) => (
                <Stack key={i} direction="row" align="flex-start" gap={2} className="hs-signal" style={{ flex: "1 1 220px" }}>
                  <Text variant="body-strong" tone={ins.tone} as="span">{ins.icon}</Text>
                  <Text variant="caption" tone="default">{ins.txt}</Text>
                </Stack>
              ))
            ) : (
              <Text variant="caption" tone="subtle" className="hs-signal-empty" style={{ flex: 1 }}>
                No signals — apply a department filter for targeted analysis.
              </Text>
            )}
          </Stack>
        </Card>

        {/* Full-width benchmark table */}
        <div className="hs-benchmark-table">
          <Table
            defaultColDef={{ resizable: true, sortable: true }}
            tableHeader="vs National"
            cardContainer
            columnDefs={benchmarkColumns}
            rowData={model.benchmark}
            domLayout="autoHeight"
            hideTableSetting
            hideTableActions
            suppressPaginationPanel
            pagination={false}
          />
        </div>
      </Stack>
    </Stack>
  );

  const TAB_NAMES = [
    { value: 0, label: "Overview" },
    { value: 1, label: "Benchmarks" },
  ];

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header: store / dept filters ──────────────────────────────────── */}
      <Card sx={{ ...panelSx, padding: "var(--sp-3) var(--sp-4)" }}>
        <Stack direction="column" gap={0.5}>
          <Text variant="overline" tone="primary">Hindsight</Text>
          <Stack direction="row" align="baseline" gap={2} wrap>
            <Text variant="title">{store.name}</Text>
            <Text variant="caption" tone="subtle">Business Review · R13 · SS 2026</Text>
          </Stack>
        </Stack>
      </Card>

      <FiltersStrip
        filterTags={hindsightFilterTags}
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
        title="Hindsight Filters"
        size="medium"
        anchor="right"
        isOpen={filterPanelOpen}
        setIsOpen={setFilterPanelOpen}
        active={activeFilterTab}
        setActive={setActiveFilterTab}
        filters={[
          {
            value: "store",
            title: "Store",
            numberOfFilter: 1,
            children: (
              <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
                <FdSelect label="Store" value={storeId} options={STORE_OPTIONS} onChange={(v) => setStoreId(Number(v))} width={320} isWithSearch />
              </Stack>
            ),
          },
          {
            value: "dept",
            title: "Department",
            numberOfFilter: dept !== "All" ? 1 : 0,
            children: (
              <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
                <FdSelect label="Department" value={dept} options={DEPT_OPTIONS} onChange={setDept} width={320} />
              </Stack>
            ),
          },
        ]}
        primaryButtonLabel="Apply"
        onPrimaryButtonClick={() => setFilterPanelOpen(false)}
        secondaryButtonLabel="Clear dept"
        onSecondaryButtonClick={() => setDept("All")}
      />

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} tabNames={TAB_NAMES} tabPanels={[overviewTab, benchmarksTab]} />
    </Stack>
  );
}
