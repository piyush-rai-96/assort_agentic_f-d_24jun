import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, Input, TextArea, EmptyState } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import SkuSwatch from "../components/SkuSwatch.jsx";
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
import { panelSx, softSx } from "../styles/panelSx.js";

const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };

const VEL_COLOR = { A: color.success, B: color.info, C: color.warning, D: color.error };
const VEL_PILL = {
  A: { bg: "#ECFDF5", fg: "#059669" },
  B: { bg: "#EFF6FF", fg: "#2563EB" },
  C: { bg: "#FFFBEB", fg: "#D97706" },
  D: { bg: "#FEF2F2", fg: "#DC2626" },
};

const REGION_OPTIONS = [{ value: "all", label: "All regions" }, ...MPI_REGIONS.map((r) => ({ value: r, label: r }))];
const DEPT_OPTIONS   = [{ value: "all", label: "All depts"   }, ...MPI_DEPTS.map((d) => ({ value: d, label: d }))];

const k$  = (n) => `$${(n / 1000).toFixed(0)}K`;
const k$1 = (n) => `$${(n / 1000).toFixed(1)}K`;

/* ── Alert banner (inside tab content) ──────────────────────────────────── */
function Banner({ tone, icon, children }) {
  const bg = { warning: "var(--color-warning-soft)", error: "var(--color-error-soft)", info: "#EFF6FF" }[tone] || "var(--color-surface-alt)";
  const bd = { warning: "var(--color-warning)", error: "var(--color-error)", info: "#BFDBFE" }[tone] || "var(--color-border)";
  return (
    <Stack direction="row" gap={2} align="flex-start" paddingX={3} paddingY={3}
      style={{ background: bg, border: `1px solid ${bd}`, borderLeft: `3px solid ${bd}`, borderRadius: "var(--r2)" }}>
      <Text variant="body-strong">{icon}</Text>
      <Text variant="caption" tone="default" style={{ lineHeight: 1.5 }}>{children}</Text>
    </Stack>
  );
}

/* ── Velocity pill ───────────────────────────────────────────────────────── */
function VelPill({ vel }) {
  const c = VEL_PILL[vel] || { bg: "#F1F5F9", fg: "#64748B" };
  return <span className="mpi-vel-pill" style={{ background: c.bg, color: c.fg }}>{vel || "—"}</span>;
}

export default function Mpi() {
  const [tab, setTab]                     = useState(0);
  const [regionFilter, setRegionFilter]   = useState("all");
  const [deptFilter, setDeptFilter]       = useState("all");
  const [pushbackComments, setPushbackComments] = useState({});
  const [markdownOverrides, setMarkdownOverrides] = useState({});
  const [expandedSku, setExpandedSku]     = useState(null);
  const [exitPricesSaved, setExitPricesSaved] = useState(false);

  /* ── Summary metrics ─────────────────────────────────────────────────── */
  const totalNPI      = MPI_STORE_STATS.reduce((s, x) => s + x.npiOH, 0);
  const totalOH       = MPI_STORE_STATS.reduce((s, x) => s + x.totalOH, 0);
  const avgNpiPct     = totalOH > 0 ? (totalNPI / totalOH) * 100 : 0;
  const flaggedStores = MPI_STORE_STATS.filter((s) => s.npiPct >= NPI_THRESHOLD).length;
  const aboveWaterline = MPI_DROPS.filter((d) => d.r13Sqft >= WATERLINE).length;
  const openPushbacks  = Object.values(pushbackComments).filter((p) => p.status !== "resolved" && p.merchantComment).length;
  const resolvedPushbacks = Object.values(pushbackComments).filter((p) => p.status === "resolved").length;

  /* ── Filtered data ───────────────────────────────────────────────────── */
  const filteredDrops = useMemo(
    () => MPI_DROPS.filter((d) =>
      (regionFilter === "all" || d.region === regionFilter) &&
      (deptFilter   === "all" || d.dept   === deptFilter)),
    [regionFilter, deptFilter]
  );
  const filteredStores = useMemo(
    () => MPI_STORE_STATS.filter((s) => regionFilter === "all" || s.region === regionFilter),
    [regionFilter]
  );

  /* ── Handlers ────────────────────────────────────────────────────────── */
  const setPushback = (key, field, value) =>
    setPushbackComments((prev) => ({
      ...prev,
      [key]: { merchantComment: "", dmmFeedback: "", status: "open", ...prev[key], [field]: value },
    }));
  const savePushback = (key) =>
    setPushbackComments((prev) => ({
      ...prev,
      [key]: { merchantComment: "", dmmFeedback: "", ...prev[key], status: "open" },
    }));
  const resolvePushback = (key) =>
    setPushbackComments((prev) => ({
      ...prev,
      [key]: { merchantComment: "", dmmFeedback: "", ...prev[key], status: "resolved" },
    }));
  const setMarkdown = (sku, field, value) =>
    setMarkdownOverrides((prev) => ({ ...prev, [sku]: { ...prev[sku], [field]: value } }));

  /* ════════════════════════════════════════════════════════════════════════
     TAB 1 — STORE NPI (Regional grouping)
  ════════════════════════════════════════════════════════════════════════ */

  /* Build region → stores map */
  const byRegion = useMemo(() => {
    const map = {};
    filteredStores.forEach((s) => {
      if (!map[s.region]) map[s.region] = { region: s.region, stores: [], totalOH: 0, npiOH: 0 };
      map[s.region].stores.push(s);
      map[s.region].totalOH += s.totalOH;
      map[s.region].npiOH   += s.npiOH;
    });
    return map;
  }, [filteredStores]);

  const storeNpiTab = (
    <Stack direction="column" gap={3}>
      <Banner tone="warning" icon="⚠️">
        <strong>NPI threshold: {NPI_THRESHOLD}%.</strong> Stores above this share have a dangerously high proportion of on-hand
        inventory that is no longer being replenished. Stores highlighted in red need immediate merchant review.
      </Banner>

      <div className="mpi-store-table">
        {/* Table header */}
        <div className="mpi-table-header">
          <div>Store</div>
          <div>Total OH $</div>
          <div>NPI $</div>
          <div>NPI %</div>
          <div>Drops</div>
          <div>Velocity</div>
        </div>

        {Object.keys(byRegion).sort().map((region) => {
          const rg = byRegion[region];
          const rNpiPct = rg.totalOH > 0 ? (rg.npiOH / rg.totalOH * 100).toFixed(1) : "0.0";
          const rFlagged = parseFloat(rNpiPct) >= NPI_THRESHOLD;
          const regionDrops = rg.stores.reduce((s, x) => s + x.drops, 0);

          return (
            <React.Fragment key={region}>
              {/* Region summary row */}
              <div className="mpi-region-row">
                <div className="mpi-region-label">📍 {region}</div>
                <div className="mpi-cell-num">{k$(rg.totalOH)}</div>
                <div className="mpi-cell-red">{k$(rg.npiOH)}</div>
                <div>
                  <span className={`mpi-pct-badge ${rFlagged ? "mpi-pct-badge--red" : "mpi-pct-badge--green"}`}>
                    {rNpiPct}%
                  </span>
                </div>
                <div className="mpi-cell-num">{regionDrops}</div>
                <div />
              </div>

              {/* Store rows — sorted by npiPct desc within region */}
              {rg.stores.slice().sort((a, b) => b.npiPct - a.npiPct).map((s) => {
                const flagged = s.npiPct >= NPI_THRESHOLD;
                return (
                  <div key={s.storeId} className={`mpi-store-row ${flagged ? "mpi-store-row--flagged" : ""}`}>
                    <div>
                      <div className="mpi-store-name">{s.storeName}</div>
                      <div className="mpi-store-id">{s.storeId}</div>
                    </div>
                    <div className="mpi-cell-num">{k$(s.totalOH)}</div>
                    <div className="mpi-cell-red">{k$(s.npiOH)}</div>
                    <div className="mpi-npi-cell-group">
                      <span className={`mpi-npi-pct ${flagged ? "mpi-npi-pct--red" : ""}`}>{s.npiPct}%</span>
                      {flagged && <span className="mpi-flag-badge">⚠ Flag</span>}
                    </div>
                    <div className="mpi-cell-num">{s.drops}</div>
                    <div><VelPill vel={s.velocity} /></div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </Stack>
  );

  /* ════════════════════════════════════════════════════════════════════════
     TAB 2 — SKU DETAIL
  ════════════════════════════════════════════════════════════════════════ */
  const skuFiltered = useMemo(
    () => MPI_SKU_STATS.filter((s) => deptFilter === "all" || s.dept === deptFilter),
    [deptFilter]
  );

  const skuDetailTab = (
    <Stack direction="column" gap={3}>
      <Banner tone="info" icon="📈">
        <strong>SKU retirement signal:</strong> if a SKU drops below 3 active stores after this PLR, consider retiring it from
        the catalogue entirely. SKUs flagged red have been dropped in 75%+ of their previous stores.
      </Banner>
      <Card sx={paneSx}>
        <div className="mpi-scroll">
          {skuFiltered.map((s) => {
            const dropPct = s.storesBefore > 0 ? s.dropsCount / s.storesBefore : 0;
            const retire  = s.storesAfter <= 2 && s.storesBefore > 5;
            const md      = markdownOverrides[s.sku];
            const open    = expandedSku === s.sku;
            return (
              <div key={s.sku}>
                <Stack className={`mpi-row${retire ? " is-retire" : dropPct > 0.5 ? " is-warn" : ""}`}
                  direction="row" align="center" gap={3} wrap paddingX={4} paddingY={2}>
                  <Stack direction="row" align="center" gap={2} flex="1 1 240px" style={{ minWidth: 0 }}>
                    <SkuSwatch sku={{ desc: s.desc, dept: s.dept, subDept: s.subDept }} size={30} />
                    <Stack direction="column" gap={1} style={{ minWidth: 0 }}>
                      <Text variant="caption" tone="strong">{s.desc}</Text>
                      <Text variant="micro" tone="subtle" mono>{s.sku} · {s.subDept}</Text>
                      {retire && <Text variant="micro" tone="error">⚑ Consider network retirement — only {s.storesAfter} stores remaining</Text>}
                    </Stack>
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
                    <Text variant="caption" tone={dropPct > 0.5 ? "error" : "warning"} style={{ fontWeight: 700 }}>
                      {s.dropsCount} ({Math.round(dropPct * 100)}%)
                    </Text>
                    <Text variant="micro" tone="subtle">drops</Text>
                  </Stack>
                  <Text variant="caption" tone="error" mono style={{ width: 70, flexShrink: 0 }}>{k$1(s.npiDollars)}</Text>
                  <Text variant="caption" tone="muted" mono style={{ width: 64, flexShrink: 0 }}>${s.menuPrice.toFixed(2)}</Text>
                  <Text variant="caption" tone="muted" style={{ width: 50, flexShrink: 0 }}>{s.gmPct}%</Text>
                  <Text variant="caption" tone={s.wos > 26 ? "error" : "muted"} style={{ width: 56, flexShrink: 0 }}>{s.wos}wk</Text>
                  <Stack direction="row" gap={2} align="center" style={{ width: 150, flexShrink: 0 }}>
                    {md?.newRetail ? <Text variant="micro" tone="teal" mono>${Number(md.newRetail).toFixed(2)}/{md.newGmPct || s.gmPct}%</Text> : null}
                    <Button variant="secondary" size="small" onClick={() => setExpandedSku(open ? null : s.sku)}>
                      {md ? "Edit" : "Set markdown"}
                    </Button>
                  </Stack>
                </Stack>
                {open && (
                  <Stack className="mpi-edit" direction="row" align="flex-end" gap={3} wrap paddingX={4} paddingY={3}>
                    <Text variant="caption" tone="warning" style={{ flex: "1 1 200px" }}>Exit pricing — {s.desc}</Text>
                    <Stack direction="column" gap={1} style={{ width: 130 }}>
                      <Text variant="micro" tone="muted">New retail $</Text>
                      <Input type="number" step="0.01" size="small" placeholder={s.menuPrice.toFixed(2)}
                        value={md?.newRetail ?? ""} onChange={(e) => setMarkdown(s.sku, "newRetail", e.target.value)} fullWidth />
                    </Stack>
                    <Stack direction="column" gap={1} style={{ width: 110 }}>
                      <Text variant="micro" tone="muted">New GM %</Text>
                      <Input type="number" step="1" size="small" placeholder={String(s.gmPct)}
                        value={md?.newGmPct ?? ""} onChange={(e) => setMarkdown(s.sku, "newGmPct", e.target.value)} fullWidth />
                    </Stack>
                    <Button variant="primary" size="small" onClick={() => setExpandedSku(null)}>Save</Button>
                  </Stack>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </Stack>
  );

  /* ════════════════════════════════════════════════════════════════════════
     TAB 3 — DROPPED SALES
  ════════════════════════════════════════════════════════════════════════ */
  const droppedAbove = useMemo(() => filteredDrops.filter((d) => d.r13Sqft >= WATERLINE).sort((a, b) => b.r13Sqft - a.r13Sqft), [filteredDrops]);
  const droppedBelow = useMemo(() => filteredDrops.filter((d) => d.r13Sqft < WATERLINE).sort((a, b) => b.r13Sqft - a.r13Sqft), [filteredDrops]);

  const dropRow = (d) => ({
    desc: d.desc, sku: String(d.sku), dept: d.dept, subDept: d.subDept,
    storeName: d.storeName, region: d.region,
    r13: d.r13Sqft, r13Rev: Math.round(d.r13Sqft * d.menuPrice),
    oh: d.npiDollars, velocity: d.velocity,
  });

  const droppedColumns = useMemo(() => [
    {
      field: "desc", headerName: "SKU", minWidth: 220, flex: 1, filter: "agTextColumnFilter",
      cellRenderer: (p) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
          <SkuSwatch sku={{ desc: p.data.desc, dept: p.data.dept, subDept: p.data.subDept }} size={22} />
          <span>{p.value}</span>
        </div>
      ),
    },
    { field: "sku",      headerName: "SKU #",      width: 120, filter: "agTextColumnFilter",    cellStyle: () => ({ fontFamily: "var(--font-mono)", color: color.textMuted }) },
    { field: "storeName",headerName: "Store",      minWidth: 150, flex: 1, filter: "agTextColumnFilter" },
    { field: "region",   headerName: "Region",     width: 130, filter: "agSetColumnFilter" },
    { field: "r13",      headerName: "R13 sqft/wk",width: 120, filter: "agNumberColumnFilter", valueFormatter: (p) => p.value.toFixed(1), cellStyle: () => ({ color: color.error, fontWeight: 600 }) },
    { field: "r13Rev",   headerName: "R13 $/wk",   width: 100, filter: "agNumberColumnFilter", valueFormatter: (p) => `$${p.value}` },
    { field: "oh",       headerName: "On-Hand $",  width: 110, filter: "agNumberColumnFilter", valueFormatter: (p) => k$1(p.value) },
    { field: "velocity", headerName: "Velocity",   width: 100, filter: "agSetColumnFilter",    cellStyle: (p) => ({ color: VEL_COLOR[p.value] || color.text, fontWeight: 700 }) },
  ], []);

  const droppedSalesTab = (
    <Stack direction="column" gap={3}>
      <Banner tone="error" icon="🚨">
        <strong>Performance waterline: {WATERLINE} sqft/wk/store.</strong> {droppedAbove.length} drops above this threshold
        are margin-leakage risks — review each before approving.
      </Banner>
      {droppedAbove.length > 0 && (
        <Stack direction="column" gap={2}>
          <Text variant="body-strong" tone="error">🚨 Above waterline — {droppedAbove.length} drops requiring review</Text>
          <Table defaultColDef={{ floatingFilter: true }} cardContainer rowHeight="compact" tableHeader="Above waterline"
            columnDefs={droppedColumns} rowData={droppedAbove.slice(0, 50).map(dropRow)} domLayout="autoHeight"
            hideTableSetting hideTableActions pagination={false} />
        </Stack>
      )}
      <Stack direction="column" gap={2}>
        <Text variant="body-strong" tone="muted">Below waterline — {droppedBelow.length} drops (acceptable)</Text>
        <Table defaultColDef={{ floatingFilter: true }} cardContainer rowHeight="compact" tableHeader="Below waterline"
          columnDefs={droppedColumns} rowData={droppedBelow.slice(0, 30).map(dropRow)} domLayout="autoHeight"
          hideTableSetting hideTableActions pagination={false} />
      </Stack>
    </Stack>
  );

  /* ════════════════════════════════════════════════════════════════════════
     TAB 4 — PUSHBACK
  ════════════════════════════════════════════════════════════════════════ */
  const pushbackCandidates = useMemo(
    () => filteredDrops.filter((d) => d.r13Sqft >= WATERLINE).sort((a, b) => b.r13Sqft - a.r13Sqft).slice(0, 30),
    [filteredDrops]
  );

  const pushbackTab = (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
        <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
          <Text variant="body-strong" tone="strong">Merchant ↔ DMM Pushback</Text>
          <Text variant="caption" tone="muted">
            Challenge bad drop decisions in-app — no spreadsheets, calls, or emails.
            Showing drops above the {WATERLINE} sqft/wk waterline.
          </Text>
        </Stack>
        <Stack direction="row" gap={2}>
          <Badge variant="subtle" size="small" color="success" label={`${resolvedPushbacks} resolved`} />
          <Badge variant="subtle" size="small" color="warning" label={`${openPushbacks} open`} />
        </Stack>
      </Stack>

      {pushbackCandidates.length === 0 ? (
        <Card sx={softSx}>
          <EmptyState heading="No drops above waterline" description="No drops above the waterline with the current filters." />
        </Card>
      ) : (
        pushbackCandidates.map((d) => {
          const key      = `${d.sku}|${d.storeId}`;
          const pb       = pushbackComments[key] || { merchantComment: "", dmmFeedback: "", status: "open" };
          const resolved = pb.status === "resolved";
          const accent   = resolved ? color.teal : pb.merchantComment ? color.warning : color.error;
          return (
            <Card key={key} sx={{ ...panelSx, borderLeft: `3px solid ${accent}`, opacity: resolved ? 0.7 : 1 }}>
              <Stack direction="column" gap={3}>
                <Stack direction="row" justify="space-between" align="flex-start" gap={3} wrap>
                  <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                    <Stack direction="row" gap={2} align="center" wrap>
                      <Text variant="body-strong" tone="strong">{d.desc}</Text>
                      <Text variant="micro" tone="subtle" mono>{d.sku}</Text>
                      <Badge variant="subtle" size="small" color="error" label={`${d.r13Sqft.toFixed(1)} sqft/wk above waterline`} />
                      {resolved && <Badge variant="subtle" size="small" color="success" label="✓ Resolved" />}
                    </Stack>
                    <Text variant="micro" tone="muted">
                      {d.storeName} · {d.region} · Velocity {d.velocity} · ${Math.round(d.r13Sqft * d.menuPrice)}/wk · On-hand {k$1(d.npiDollars)}
                    </Text>
                  </Stack>
                  {!resolved && (
                    <Button variant="secondary" size="small" onClick={() => resolvePushback(key)}>Mark resolved</Button>
                  )}
                </Stack>

                {!resolved ? (
                  <>
                    <Grid columns={2} gap={3}>
                      <Stack direction="column" gap={1}>
                        <Text variant="micro" tone="error" style={{ fontWeight: 700 }}>MERCHANT COMMENT</Text>
                        <TextArea
                          placeholder={`e.g. Store is dropping this at ${d.r13Sqft.toFixed(0)} sqft/wk — above waterline. Confirm intent and justify.`}
                          value={pb.merchantComment}
                          onChange={(e) => setPushback(key, "merchantComment", e.target.value)}
                          width="100%" height="72px"
                        />
                      </Stack>
                      <Stack direction="column" gap={1}>
                        <Text variant="micro" tone="warning" style={{ fontWeight: 700 }}>DMM FEEDBACK</Text>
                        <TextArea
                          placeholder="DMM response — accept, reverse, or explain the local context…"
                          value={pb.dmmFeedback}
                          onChange={(e) => setPushback(key, "dmmFeedback", e.target.value)}
                          width="100%" height="72px"
                        />
                      </Stack>
                    </Grid>
                    {/* Explicit Save button */}
                    <Stack direction="row" justify="flex-end">
                      <Button
                        variant="primary"
                        size="small"
                        disabled={!pb.merchantComment && !pb.dmmFeedback}
                        onClick={() => savePushback(key)}
                      >
                        Save comment
                      </Button>
                    </Stack>
                  </>
                ) : (pb.merchantComment || pb.dmmFeedback) ? (
                  <Grid columns={2} gap={3}>
                    {pb.merchantComment ? <Text variant="caption" tone="error"><strong>Merchant:</strong> {pb.merchantComment}</Text> : <span />}
                    {pb.dmmFeedback     ? <Text variant="caption" tone="warning"><strong>DMM:</strong> {pb.dmmFeedback}</Text> : <span />}
                  </Grid>
                ) : null}
              </Stack>
            </Card>
          );
        })
      )}
    </Stack>
  );

  /* ════════════════════════════════════════════════════════════════════════
     TAB 5 — EXIT PRICING
  ════════════════════════════════════════════════════════════════════════ */
  const exitSkus = useMemo(() => {
    const map = {};
    filteredDrops.forEach((d) => {
      if (!map[d.sku]) map[d.sku] = { sku: d.sku, desc: d.desc, dept: d.dept, menuPrice: d.menuPrice, totalDropStores: 0, npiDollars: 0, r13AvgSqft: 0, n: 0 };
      const m = map[d.sku];
      m.totalDropStores++;
      m.npiDollars  += d.npiDollars;
      m.r13AvgSqft  += d.r13Sqft;
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
        <Stack direction="row" align="center" gap={3} paddingX={4} paddingY={2}
          style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)" }}>
          <Text variant="micro" tone="muted" style={{ flex: "1 1 220px" }}>SKU</Text>
          <Text variant="micro" tone="muted" style={{ width: 90, flexShrink: 0 }}>Stores dropped</Text>
          <Text variant="micro" tone="muted" style={{ width: 80, flexShrink: 0 }}>On-hand $</Text>
          <Text variant="micro" tone="muted" style={{ width: 90, flexShrink: 0 }}>R13 sqft/wk</Text>
          <Text variant="micro" tone="muted" style={{ width: 80, flexShrink: 0 }}>Current</Text>
          <Text variant="micro" tone="muted" style={{ width: 130, flexShrink: 0 }}>New retail (exit)</Text>
          <Text variant="micro" tone="muted" style={{ width: 110, flexShrink: 0 }}>Target GM %</Text>
        </Stack>
        {exitSkus.map((s) => {
          const md           = markdownOverrides[s.sku] || {};
          const suggestedExit = (s.menuPrice * 0.72).toFixed(2);
          const sugGm        = Math.round((38 + (s.sku % 12)) * 0.65);
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
                <Input type="number" step="0.01" size="small" value={md.newRetail ?? suggestedExit}
                  onChange={(e) => setMarkdown(s.sku, "newRetail", e.target.value)} fullWidth />
              </div>
              <Stack direction="row" align="center" gap={1} style={{ width: 110, flexShrink: 0 }}>
                <div style={{ width: 80 }}>
                  <Input type="number" step="1" size="small" value={md.newGmPct ?? sugGm}
                    onChange={(e) => setMarkdown(s.sku, "newGmPct", e.target.value)} fullWidth />
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

  /* ════════════════════════════════════════════════════════════════════════
     TAB BAR — updated labels matching HTML v6
  ════════════════════════════════════════════════════════════════════════ */
  const TAB_LABELS = [
    "Tab 1: Store NPI",
    "Tab 2: SKU Detail",
    "Tab 3: Dropped Sales",
    `Tab 4: Pushback${openPushbacks ? ` (${openPushbacks})` : ""}`,
    "Tab 5: Exit Pricing ✦",
  ];

  const TAB_PANELS = [storeNpiTab, skuDetailTab, droppedSalesTab, pushbackTab, exitPricingTab];

  /* ── KPI metrics for dark header ─────────────────────────────────────── */
  const headerMetrics = [
    { v: MPI_DROPS.length.toLocaleString(), l: "Total drops",          sub: "this PLR cycle",        c: "#FCA5A5" },
    { v: k$(totalNPI),                       l: "NPI created",           sub: "discontinued on-hand",  c: "#FCD34D" },
    { v: `${avgNpiPct.toFixed(1)}%`,         l: "Avg NPI %",             sub: "of total on-hand",      c: avgNpiPct >= NPI_THRESHOLD ? "#FCA5A5" : "#6EEDB8" },
    { v: aboveWaterline,                     l: "Drops above waterline", sub: `>${WATERLINE} sqft/wk/st`, c: "#FCA5A5" },
    { v: openPushbacks || "—",               l: "Open pushbacks",        sub: "merchant comments",     c: openPushbacks ? "#FCD34D" : "#4A7A4A" },
  ];

  return (
    <div className="mpi-root">

      {/* ── Dark navy page header ─────────────────────────────────────────── */}
      <div className="mpi-page-header">
        <div className="mpi-page-header-top">
          <div>
            <div className="mpi-page-title">NPI Reconciliation</div>
            <div className="mpi-page-subtitle">
              WOOD APRIL - 2026 &nbsp;·&nbsp; Drop window closes Apr 23 &nbsp;·&nbsp; Review and push back before final submission
            </div>
          </div>
          <div className="mpi-alert-pills">
            {aboveWaterline > 0 && (
              <span className="mpi-alert-pill mpi-alert-pill--red">⚠ {aboveWaterline} drops above waterline</span>
            )}
            {flaggedStores > 0 && (
              <span className="mpi-alert-pill mpi-alert-pill--amber">{flaggedStores} stores &gt;{NPI_THRESHOLD}% NPI</span>
            )}
          </div>
        </div>

        {/* Core / BG exclusion note */}
        <div className="mpi-core-banner">
          🔒 <strong>Core &amp; BG items excluded</strong> from all drop analysis — mandatory in all stores · cannot be dropped
        </div>

        {/* 5 KPI tiles */}
        <div className="mpi-kpi-strip">
          {headerMetrics.map((m) => (
            <div key={m.l} className="mpi-kpi-tile">
              <div className="mpi-kpi-value" style={{ color: m.c }}>{m.v}</div>
              <div className="mpi-kpi-label">{m.l}</div>
              <div className="mpi-kpi-sub">{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter + Tab bar ─────────────────────────────────────────────── */}
      <div className="mpi-filter-tab-bar">
        <div className="mpi-filters">
          <span className="mpi-filter-label">Region</span>
          <FdSelect value={regionFilter} options={REGION_OPTIONS} onChange={setRegionFilter} width={160} />
          <span className="mpi-filter-label">Dept</span>
          <FdSelect value={deptFilter} options={DEPT_OPTIONS} onChange={setDeptFilter} width={180} />
        </div>
        <div className="mpi-tab-bar">
          {TAB_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              className={`mpi-tab-btn ${tab === i ? "mpi-tab-btn--active" : ""}`}
              onClick={() => setTab(i)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable tab content ────────────────────────────────────────── */}
      <div className="mpi-content">
        {TAB_PANELS[tab]}
      </div>

    </div>
  );
}
