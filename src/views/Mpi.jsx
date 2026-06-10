import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, Tabs, Input, TextArea, EmptyState } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { color } from "../styles/tokens.js";
import {
  MPI_DROPS,
  MPI_STORE_STATS,
  MPI_SKU_STATS,
  MPI_REGIONS,
  MPI_DEPTS,
  NPI_THRESHOLD,
  WATERLINE,
} from "../data/mpi.js";
import "./Mpi.css";

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
const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };

const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };
const VEL_COLOR = { A: color.success, B: color.info, C: color.warning, D: color.error };
const VEL_BADGE = { A: "success", B: "info", C: "warning", D: "error" };

const REGION_OPTIONS = [{ value: "all", label: "All regions" }, ...MPI_REGIONS.map((r) => ({ value: r, label: r }))];
const DEPT_OPTIONS = [{ value: "all", label: "All departments" }, ...MPI_DEPTS.map((d) => ({ value: d, label: d }))];

const k$ = (n) => `$${(n / 1000).toFixed(0)}K`;
const k$1 = (n) => `$${(n / 1000).toFixed(1)}K`;

/* ── Callout banner (functional alert) ───────────────────────────────────── */
function Banner({ tone, icon, children }) {
  const bg = { warning: "var(--color-warning-soft)", error: "var(--color-error-soft)", info: "var(--color-surface-alt)" }[tone] || "var(--color-surface-alt)";
  const bd = { warning: "var(--color-warning)", error: "var(--color-error)", info: "var(--color-border-strong)" }[tone] || "var(--color-border)";
  return (
    <Stack direction="row" gap={2} align="flex-start" paddingX={3} paddingY={3} style={{ background: bg, border: `1px solid ${bd}`, borderLeft: `3px solid ${bd}`, borderRadius: "var(--r2)" }}>
      <Text variant="body-strong">{icon}</Text>
      <Text variant="caption" tone="default" style={{ lineHeight: 1.5 }}>{children}</Text>
    </Stack>
  );
}

export default function Mpi() {
  const [tab, setTab] = useState(0);
  const [regionFilter, setRegionFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [pushbackComments, setPushbackComments] = useState({});
  const [markdownOverrides, setMarkdownOverrides] = useState({});
  const [expandedSku, setExpandedSku] = useState(null);
  const [exitPricesSaved, setExitPricesSaved] = useState(false);

  /* ── Summary metrics ──────────────────────────────────────────────────── */
  const totalNPI = MPI_STORE_STATS.reduce((s, x) => s + x.npiOH, 0);
  const totalOH = MPI_STORE_STATS.reduce((s, x) => s + x.totalOH, 0);
  const avgNpiPct = totalOH > 0 ? (totalNPI / totalOH) * 100 : 0;
  const flaggedStores = MPI_STORE_STATS.filter((s) => s.npiPct >= NPI_THRESHOLD).length;
  const aboveWaterline = MPI_DROPS.filter((d) => d.r13Sqft >= WATERLINE).length;
  const openPushbacks = Object.values(pushbackComments).filter((p) => p.status !== "resolved" && p.merchantComment).length;
  const resolvedPushbacks = Object.values(pushbackComments).filter((p) => p.status === "resolved").length;

  /* ── Filtered data ────────────────────────────────────────────────────── */
  const filteredDrops = useMemo(
    () => MPI_DROPS.filter((d) => (regionFilter === "all" || d.region === regionFilter) && (deptFilter === "all" || d.dept === deptFilter)),
    [regionFilter, deptFilter]
  );
  const filteredStores = useMemo(
    () => MPI_STORE_STATS.filter((s) => regionFilter === "all" || s.region === regionFilter).slice().sort((a, b) => b.npiPct - a.npiPct),
    [regionFilter]
  );

  /* ── Pushback / markdown handlers ─────────────────────────────────────── */
  const setPushback = (key, field, value) =>
    setPushbackComments((prev) => ({ ...prev, [key]: { merchantComment: "", dmmFeedback: "", status: "open", ...prev[key], [field]: value } }));
  const resolvePushback = (key) =>
    setPushbackComments((prev) => ({ ...prev, [key]: { merchantComment: "", dmmFeedback: "", ...prev[key], status: "resolved" } }));
  const setMarkdown = (sku, field, value) =>
    setMarkdownOverrides((prev) => ({ ...prev, [sku]: { ...prev[sku], [field]: value } }));

  /* ════════════ TAB 1 — STORE NPI ════════════ */
  const storeColumns = useMemo(
    () => [
      { field: "storeName", headerName: "Store", minWidth: 180, flex: 1, filter: "agTextColumnFilter" },
      { field: "region", headerName: "Region", minWidth: 140, flex: 1, filter: "agSetColumnFilter" },
      { field: "totalOH", headerName: "Total OH $", width: 120, filter: "agNumberColumnFilter", valueFormatter: (p) => k$(p.value) },
      { field: "npiOH", headerName: "NPI $", width: 110, filter: "agNumberColumnFilter", valueFormatter: (p) => k$(p.value), cellStyle: () => ({ color: color.error }) },
      {
        field: "npiPct",
        headerName: "NPI %",
        width: 110,
        filter: "agNumberColumnFilter",
        valueFormatter: (p) => `${p.value}%`,
        cellStyle: (p) => ({ color: p.value >= NPI_THRESHOLD ? color.error : color.text, fontWeight: p.value >= NPI_THRESHOLD ? 700 : 400 }),
      },
      { field: "drops", headerName: "Drops", width: 90, filter: "agNumberColumnFilter" },
      { field: "velocity", headerName: "Velocity", width: 100, filter: "agSetColumnFilter", cellStyle: (p) => ({ color: VEL_COLOR[p.value] || color.text, fontWeight: 700 }) },
    ],
    []
  );

  const storeNpiTab = (
    <Stack direction="column" gap={3}>
      <Banner tone="warning" icon="⚠️">
        <strong>NPI threshold: {NPI_THRESHOLD}%.</strong> Stores above this share have a dangerously high proportion of on-hand inventory
        that is no longer being replenished. Stores flagged in red need immediate merchant review.
      </Banner>
      <Table
      defaultColDef={{ floatingFilter: true }}
        cardContainer
        rowHeight="compact"
        tableHeader={`Store NPI · ${filteredStores.length} stores`}
        columnDefs={storeColumns}
        rowData={filteredStores}
        domLayout="autoHeight"
        hideTableSetting
        hideTableActions
        pagination={false}
      />
    </Stack>
  );

  /* ════════════ TAB 2 — SKU DETAIL ════════════ */
  const skuFiltered = useMemo(
    () => MPI_SKU_STATS.filter((s) => deptFilter === "all" || s.dept === deptFilter),
    [deptFilter]
  );

  const skuDetailTab = (
    <Stack direction="column" gap={3}>
      <Banner tone="info" icon="📈">
        <strong>SKU retirement signal:</strong> if a SKU drops below 3 active stores after this PLR, consider retiring it from the
        catalogue entirely. SKUs flagged red have been dropped in 75%+ of their previous stores.
      </Banner>
      <Card sx={paneSx}>
        <div className="mpi-scroll">
          {skuFiltered.map((s) => {
            const dropPct = s.storesBefore > 0 ? s.dropsCount / s.storesBefore : 0;
            const retire = s.storesAfter <= 2 && s.storesBefore > 5;
            const md = markdownOverrides[s.sku];
            const open = expandedSku === s.sku;
            return (
              <div key={s.sku}>
                <Stack className={`mpi-row${retire ? " is-retire" : dropPct > 0.5 ? " is-warn" : ""}`} direction="row" align="center" gap={3} wrap paddingX={4} paddingY={2}>
                  <Stack direction="column" gap={1} flex="1 1 240px" style={{ minWidth: 0 }}>
                    <Text variant="caption" tone="strong">{s.desc}</Text>
                    <Text variant="micro" tone="subtle" mono>{s.sku} · {s.subDept}</Text>
                    {retire ? <Text variant="micro" tone="error">⚑ Consider network retirement — only {s.storesAfter} stores remaining</Text> : null}
                  </Stack>
                  <Badge variant="subtle" size="small" color={s.status === "Discontinued" ? "error" : "success"} label={s.status} />
                  <Stack direction="column" align="center" style={{ width: 64, flexShrink: 0 }}>
                    <Text variant="caption" tone="muted">{s.storesBefore}</Text>
                    <Text variant="micro" tone="subtle">before</Text>
                  </Stack>
                  <Stack direction="column" align="center" style={{ width: 64, flexShrink: 0 }}>
                    <Text variant="caption" tone={s.storesAfter <= 2 ? "error" : "strong"} style={{ fontWeight: 700 }}>{s.storesAfter}</Text>
                    <Text variant="micro" tone="subtle">after</Text>
                  </Stack>
                  <Stack direction="column" align="center" style={{ width: 80, flexShrink: 0 }}>
                    <Text variant="caption" tone={dropPct > 0.5 ? "error" : "warning"} style={{ fontWeight: 700 }}>{s.dropsCount} ({Math.round(dropPct * 100)}%)</Text>
                    <Text variant="micro" tone="subtle">drops</Text>
                  </Stack>
                  <Text variant="caption" tone="error" mono style={{ width: 70, flexShrink: 0 }}>{k$1(s.npiDollars)}</Text>
                  <Text variant="caption" tone="muted" mono style={{ width: 64, flexShrink: 0 }}>${s.menuPrice.toFixed(2)}</Text>
                  <Text variant="caption" tone="muted" style={{ width: 50, flexShrink: 0 }}>{s.gmPct}%</Text>
                  <Text variant="caption" tone={s.wos > 26 ? "error" : "muted"} style={{ width: 56, flexShrink: 0 }}>{s.wos}wk</Text>
                  <Stack direction="row" gap={2} align="center" style={{ width: 150, flexShrink: 0 }}>
                    {md && md.newRetail ? <Text variant="micro" tone="teal" mono>${Number(md.newRetail).toFixed(2)}/{md.newGmPct || s.gmPct}%</Text> : null}
                    <Button variant="secondary" size="small" onClick={() => setExpandedSku(open ? null : s.sku)}>{md ? "Edit" : "Set markdown"}</Button>
                  </Stack>
                </Stack>
                {open ? (
                  <Stack className="mpi-edit" direction="row" align="flex-end" gap={3} wrap paddingX={4} paddingY={3}>
                    <Text variant="caption" tone="warning" style={{ flex: "1 1 200px" }}>Exit pricing — {s.desc}</Text>
                    <Stack direction="column" gap={1} style={{ width: 130 }}>
                      <Text variant="micro" tone="muted">New retail $</Text>
                      <Input type="number" step="0.01" size="small" placeholder={s.menuPrice.toFixed(2)} value={md?.newRetail ?? ""} onChange={(e) => setMarkdown(s.sku, "newRetail", e.target.value)} fullWidth />
                    </Stack>
                    <Stack direction="column" gap={1} style={{ width: 110 }}>
                      <Text variant="micro" tone="muted">New GM %</Text>
                      <Input type="number" step="1" size="small" placeholder={String(s.gmPct)} value={md?.newGmPct ?? ""} onChange={(e) => setMarkdown(s.sku, "newGmPct", e.target.value)} fullWidth />
                    </Stack>
                    <Button variant="primary" size="small" onClick={() => setExpandedSku(null)}>Save</Button>
                  </Stack>
                ) : null}
              </div>
            );
          })}
        </div>
      </Card>
    </Stack>
  );

  /* ════════════ TAB 3 — DROPPED SALES ════════════ */
  const droppedAbove = useMemo(() => filteredDrops.filter((d) => d.r13Sqft >= WATERLINE).sort((a, b) => b.r13Sqft - a.r13Sqft), [filteredDrops]);
  const droppedBelow = useMemo(() => filteredDrops.filter((d) => d.r13Sqft < WATERLINE).sort((a, b) => b.r13Sqft - a.r13Sqft), [filteredDrops]);

  const dropRow = (d) => ({
    desc: d.desc,
    sku: String(d.sku),
    storeName: d.storeName,
    region: d.region,
    r13: d.r13Sqft,
    r13Rev: Math.round(d.r13Sqft * d.menuPrice),
    oh: d.npiDollars,
    velocity: d.velocity,
  });
  const droppedColumns = useMemo(
    () => [
      { field: "desc", headerName: "SKU", minWidth: 200, flex: 1, filter: "agTextColumnFilter" },
      { field: "sku", headerName: "SKU #", width: 120, filter: "agTextColumnFilter", cellStyle: () => ({ fontFamily: "var(--font-mono)", color: color.textMuted }) },
      { field: "storeName", headerName: "Store", minWidth: 150, flex: 1, filter: "agTextColumnFilter" },
      { field: "region", headerName: "Region", width: 130, filter: "agSetColumnFilter" },
      { field: "r13", headerName: "R13 sqft/wk", width: 120, filter: "agNumberColumnFilter", valueFormatter: (p) => p.value.toFixed(1), cellStyle: () => ({ color: color.error, fontWeight: 600 }) },
      { field: "r13Rev", headerName: "R13 $/wk", width: 100, filter: "agNumberColumnFilter", valueFormatter: (p) => `$${p.value}` },
      { field: "oh", headerName: "On-Hand $", width: 110, filter: "agNumberColumnFilter", valueFormatter: (p) => k$1(p.value) },
      { field: "velocity", headerName: "Velocity", width: 100, filter: "agSetColumnFilter", cellStyle: (p) => ({ color: VEL_COLOR[p.value] || color.text, fontWeight: 700 }) },
    ],
    []
  );

  const droppedSalesTab = (
    <Stack direction="column" gap={3}>
      <Banner tone="error" icon="🚨">
        <strong>Performance waterline: {WATERLINE} sqft/wk/store.</strong> {droppedAbove.length} stores are dropping a SKU performing
        above this threshold. These are margin-leakage risks — review each before approving the drop.
      </Banner>
      {droppedAbove.length ? (
        <Stack direction="column" gap={2}>
          <Text variant="body-strong" tone="error">🚨 Above waterline — {droppedAbove.length} drops requiring review</Text>
          <Table defaultColDef={{ floatingFilter: true }} cardContainer rowHeight="compact" tableHeader="Above waterline" columnDefs={droppedColumns} rowData={droppedAbove.slice(0, 50).map(dropRow)} domLayout="autoHeight" hideTableSetting hideTableActions pagination={false} />
        </Stack>
      ) : null}
      <Stack direction="column" gap={2}>
        <Text variant="body-strong" tone="muted">Below waterline — {droppedBelow.length} drops (acceptable)</Text>
        <Table defaultColDef={{ floatingFilter: true }} cardContainer rowHeight="compact" tableHeader="Below waterline" columnDefs={droppedColumns} rowData={droppedBelow.slice(0, 40).map(dropRow)} domLayout="autoHeight" hideTableSetting hideTableActions pagination={false} />
      </Stack>
    </Stack>
  );

  /* ════════════ TAB 4 — PUSHBACK ════════════ */
  const pushbackCandidates = useMemo(() => filteredDrops.filter((d) => d.r13Sqft >= WATERLINE).sort((a, b) => b.r13Sqft - a.r13Sqft).slice(0, 30), [filteredDrops]);

  const pushbackTab = (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
        <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
          <Text variant="body-strong" tone="strong">Merchant ↔ DMM Pushback</Text>
          <Text variant="caption" tone="muted">Challenge bad drop decisions in-app — no spreadsheets, calls, or emails. Showing drops above the {WATERLINE} sqft/wk waterline.</Text>
        </Stack>
        <Stack direction="row" gap={2}>
          <Badge variant="subtle" size="small" color="success" label={`${resolvedPushbacks} resolved`} />
          <Badge variant="subtle" size="small" color="warning" label={`${openPushbacks} open`} />
        </Stack>
      </Stack>
      {pushbackCandidates.length === 0 ? (
        <Card sx={softSx}><EmptyState heading="No drops above waterline" description="No drops above the waterline with the current filters." /></Card>
      ) : (
        pushbackCandidates.map((d) => {
          const key = `${d.sku}|${d.storeId}`;
          const pb = pushbackComments[key] || { merchantComment: "", dmmFeedback: "", status: "open" };
          const resolved = pb.status === "resolved";
          const accent = resolved ? color.teal : pb.merchantComment ? color.warning : color.error;
          return (
            <Card key={key} sx={{ ...panelSx, borderLeft: `3px solid ${accent}`, opacity: resolved ? 0.7 : 1 }}>
              <Stack direction="column" gap={3}>
                <Stack direction="row" justify="space-between" align="flex-start" gap={3} wrap>
                  <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                    <Stack direction="row" gap={2} align="center" wrap>
                      <Text variant="body-strong" tone="strong">{d.desc}</Text>
                      <Text variant="micro" tone="subtle" mono>{d.sku}</Text>
                      <Badge variant="subtle" size="small" color="error" label={`${d.r13Sqft.toFixed(1)} sqft/wk above waterline`} />
                      {resolved ? <Badge variant="subtle" size="small" color="success" label="✓ Resolved" /> : null}
                    </Stack>
                    <Text variant="micro" tone="muted">{d.storeName} · {d.region} · Velocity {d.velocity} · ${Math.round(d.r13Sqft * d.menuPrice)}/wk · On-hand {k$1(d.npiDollars)}</Text>
                  </Stack>
                  {!resolved ? <Button variant="secondary" size="small" onClick={() => resolvePushback(key)}>Mark resolved</Button> : null}
                </Stack>
                {!resolved ? (
                  <>
                    <Grid columns={2} gap={3}>
                      <Stack direction="column" gap={1}>
                        <Text variant="micro" tone="error" style={{ fontWeight: 700 }}>MERCHANT COMMENT</Text>
                        <TextArea placeholder={`e.g. Store is dropping this at ${d.r13Sqft.toFixed(0)} sqft/wk — above waterline. Confirm intent and justify.`} value={pb.merchantComment} onChange={(e) => setPushback(key, "merchantComment", e.target.value)} width="100%" height="72px" />
                      </Stack>
                      <Stack direction="column" gap={1}>
                        <Text variant="micro" tone="warning" style={{ fontWeight: 700 }}>DMM FEEDBACK</Text>
                        <TextArea placeholder="DMM response — accept, reverse, or explain the local context…" value={pb.dmmFeedback} onChange={(e) => setPushback(key, "dmmFeedback", e.target.value)} width="100%" height="72px" />
                      </Stack>
                    </Grid>
                  </>
                ) : pb.merchantComment || pb.dmmFeedback ? (
                  <Grid columns={2} gap={3}>
                    {pb.merchantComment ? <Text variant="caption" tone="error"><strong>Merchant:</strong> {pb.merchantComment}</Text> : <span />}
                    {pb.dmmFeedback ? <Text variant="caption" tone="warning"><strong>DMM:</strong> {pb.dmmFeedback}</Text> : <span />}
                  </Grid>
                ) : null}
              </Stack>
            </Card>
          );
        })
      )}
    </Stack>
  );

  /* ════════════ TAB 5 — EXIT PRICING ════════════ */
  const exitSkus = useMemo(() => {
    const map = {};
    filteredDrops.forEach((d) => {
      if (!map[d.sku]) map[d.sku] = { sku: d.sku, desc: d.desc, dept: d.dept, menuPrice: d.menuPrice, totalDropStores: 0, npiDollars: 0, r13AvgSqft: 0, n: 0 };
      const m = map[d.sku];
      m.totalDropStores++;
      m.npiDollars += d.npiDollars;
      m.r13AvgSqft += d.r13Sqft;
      m.n++;
    });
    return Object.values(map)
      .map((s) => ({ ...s, r13AvgSqft: Math.round(s.r13AvgSqft / s.n) }))
      .filter((s) => s.totalDropStores >= 3)
      .sort((a, b) => b.npiDollars - a.npiDollars)
      .slice(0, 20);
  }, [filteredDrops]);

  const exitPricingTab = (
    <Stack direction="column" gap={3}>
      <Banner tone="warning" icon="✎">
        <strong>Exit pricing.</strong> Set new retail and target GM% for discontinued inventory. The specialist merchant office
        currently sets these manually — complete it here.
      </Banner>
      <Card sx={paneSx}>
        <Stack direction="row" align="center" gap={3} paddingX={4} paddingY={2} style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)" }}>
          <Text variant="micro" tone="muted" style={{ flex: "1 1 220px" }}>SKU</Text>
          <Text variant="micro" tone="muted" style={{ width: 90, flexShrink: 0 }}>Stores dropped</Text>
          <Text variant="micro" tone="muted" style={{ width: 80, flexShrink: 0 }}>On-hand $</Text>
          <Text variant="micro" tone="muted" style={{ width: 90, flexShrink: 0 }}>R13 sqft/wk</Text>
          <Text variant="micro" tone="muted" style={{ width: 80, flexShrink: 0 }}>Current</Text>
          <Text variant="micro" tone="muted" style={{ width: 130, flexShrink: 0 }}>New retail (exit)</Text>
          <Text variant="micro" tone="muted" style={{ width: 110, flexShrink: 0 }}>Target GM %</Text>
        </Stack>
        {exitSkus.map((s) => {
          const md = markdownOverrides[s.sku] || {};
          const suggestedExit = (s.menuPrice * 0.72).toFixed(2);
          const sugGm = Math.round((38 + (s.sku % 12)) * 0.65);
          return (
            <Stack key={s.sku} className="mpi-row" direction="row" align="center" gap={3} wrap paddingX={4} paddingY={2}>
              <Stack direction="column" gap={1} flex="1 1 220px" style={{ minWidth: 0 }}>
                <Text variant="caption" tone="strong">{s.desc}</Text>
                <Text variant="micro" tone="subtle" mono>{s.sku} · {s.dept}</Text>
              </Stack>
              <Text variant="caption" tone="error" style={{ width: 90, flexShrink: 0, textAlign: "center" }}>{s.totalDropStores}</Text>
              <Text variant="caption" tone="warning" mono style={{ width: 80, flexShrink: 0 }}>{k$1(s.npiDollars)}</Text>
              <Text variant="caption" tone="muted" mono style={{ width: 90, flexShrink: 0 }}>{s.r13AvgSqft}</Text>
              <Text variant="caption" tone="muted" mono style={{ width: 80, flexShrink: 0 }}>${s.menuPrice.toFixed(2)}</Text>
              <div style={{ width: 130, flexShrink: 0 }}>
                <Input type="number" step="0.01" size="small" value={md.newRetail ?? suggestedExit} onChange={(e) => setMarkdown(s.sku, "newRetail", e.target.value)} fullWidth />
              </div>
              <Stack direction="row" align="center" gap={1} style={{ width: 110, flexShrink: 0 }}>
                <div style={{ width: 80 }}>
                  <Input type="number" step="1" size="small" value={md.newGmPct ?? sugGm} onChange={(e) => setMarkdown(s.sku, "newGmPct", e.target.value)} fullWidth />
                </div>
                <Text variant="caption" tone="muted">%</Text>
              </Stack>
            </Stack>
          );
        })}
      </Card>
      <Stack direction="row" justify="flex-end">
        <Button variant="primary" size="medium" onClick={() => { setExitPricesSaved(true); setTimeout(() => setExitPricesSaved(false), 2500); }}>
          {exitPricesSaved ? "✓ Prices saved" : "Save exit prices →"}
        </Button>
      </Stack>
    </Stack>
  );

  const TAB_NAMES = [
    { value: 0, label: "Store NPI" },
    { value: 1, label: "SKU Detail" },
    { value: 2, label: "Dropped Sales" },
    { value: 3, label: `Pushback${openPushbacks ? ` (${openPushbacks})` : ""}` },
    { value: 4, label: "Exit Pricing ✦" },
  ];

  const metrics = [
    { v: MPI_DROPS.length.toLocaleString(), l: "Total drops", sub: "this PLR cycle", tone: "error" },
    { v: k$(totalNPI), l: "NPI created", sub: "discontinued on-hand", tone: "warning" },
    { v: `${avgNpiPct.toFixed(1)}%`, l: "Avg NPI %", sub: "of total on-hand", tone: avgNpiPct >= NPI_THRESHOLD ? "error" : "success" },
    { v: aboveWaterline, l: "Drops above waterline", sub: `>${WATERLINE} sqft/wk/st`, tone: "error" },
    { v: openPushbacks || "—", l: "Open pushbacks", sub: "merchant comments", tone: openPushbacks ? "warning" : "muted" },
  ];

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="column" gap={3}>
          <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
            <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="title">MPI / NPI Reconciliation</Text>
              <Text variant="caption" tone="muted">Wood · April 2026 · drop window closes Apr 23 · review and push back before final submission</Text>
            </Stack>
            <Stack direction="row" gap={2} wrap justify="flex-end">
              {aboveWaterline > 0 ? <Badge variant="subtle" size="small" color="error" label={`⚠ ${aboveWaterline} drops above waterline`} /> : null}
              {flaggedStores > 0 ? <Badge variant="subtle" size="small" color="warning" label={`${flaggedStores} stores >${NPI_THRESHOLD}% NPI`} /> : null}
            </Stack>
          </Stack>

          <Stack direction="row" gap={2} align="center" paddingX={3} paddingY={2} style={{ background: "var(--color-success-soft)", border: "1px solid var(--color-success)", borderRadius: "var(--r2)" }}>
            <Text variant="caption" tone="success">🔒 <strong>Core &amp; BG items excluded</strong> from all drop analysis — mandatory in all stores, cannot be dropped.</Text>
          </Stack>

          <Grid min={140} gap={3}>
            {metrics.map((m) => (
              <Card key={m.l} sx={softSx}>
                <Stack direction="column" gap={1} align="center">
                  <Text variant="kpi" tone={m.tone}>{m.v}</Text>
                  <Text variant="micro" tone="muted" style={{ textAlign: "center" }}>{m.l}</Text>
                  <Text variant="micro" tone="subtle" style={{ textAlign: "center" }}>{m.sub}</Text>
                </Stack>
              </Card>
            ))}
          </Grid>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)", width: "clamp(260px, 34vw, 460px)" }}>
            <FdSelect label="Region" value={regionFilter} options={REGION_OPTIONS} onChange={setRegionFilter} width={220} />
            <FdSelect label="Department" value={deptFilter} options={DEPT_OPTIONS} onChange={setDeptFilter} width={220} />
          </div>
        </Stack>
      </Card>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={(_e, v) => setTab(v)}
        tabNames={TAB_NAMES}
        tabPanels={[storeNpiTab, skuDetailTab, droppedSalesTab, pushbackTab, exitPricingTab]}
      />
    </Stack>
  );
}
