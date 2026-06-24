import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, EmptyState } from "impact-ui";
import { Check } from "lucide-react";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import SkuSwatch from "../components/SkuSwatch.jsx";
import { FD_STORES } from "../data/stores.js";
import { FD_SKUS } from "../data/skus.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import "./LikeItemForecast.css";
import { panelSx, softSx } from "../styles/panelSx.js";

/* Shared Card style — token-driven, neutral (matches the other views). */
const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };

/* Status → label + Impact UI Badge color (subtle supports default/info/success/warning/error). */
const STATUS_META = {
  unassigned: { label: "Needs like-item", color: "warning" },
  assigned: { label: "Like-item assigned", color: "info" },
  submitted: { label: "Submitted — pending", color: undefined }, // neutral/default
  received: { label: "Forecast received", color: "success" },
};
const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };
const VELOCITY_BADGE = { A: "success", B: "info", C: "warning", D: "error" };
const VELOCITY_COLOR = { A: "var(--color-success)", B: "var(--color-teal)", C: "var(--color-warning)", D: "var(--color-error)" };

/* New PLR SKUs = catalogue items with no assortment history anywhere. */
const NEW_SKUS = FD_SKUS.filter((s) => {
  const inAny = new Set(FD_ASSORTMENT.map((r) => r.sku));
  return !inAny.has(s.sku);
});

/* R13 footprint for a candidate like-item (legacy national stats). */
function likeItemStats(skuId) {
  const rows = FD_ASSORTMENT.filter((r) => r.sku === skuId);
  const r13 = rows.reduce((a, r) => a + (r.r13Sqft || 0), 0);
  const stores = new Set(rows.map((r) => r.storeId)).size;
  const avg = rows.length ? Math.round(r13 / rows.length) : 0;
  return { r13: Math.round(r13), stores, avg };
}

/* Simulate the external forecast: scale the like-item's per-velocity R13 average
   down to a new-item launch curve (72–90% of proxy) across all 21 stores. */
function buildProjections(likeSkuId) {
  const likeRows = FD_ASSORTMENT.filter((r) => r.sku === likeSkuId);
  const base = { A: 0, B: 0, C: 0, D: 0 };
  const count = { A: 0, B: 0, C: 0, D: 0 };
  likeRows.forEach((r) => {
    const s = FD_STORES.find((x) => x.id === r.storeId);
    if (s && base[s.velocity] !== undefined) {
      base[s.velocity] += r.r13Sqft;
      count[s.velocity] += 1;
    }
  });
  const avgByV = {};
  ["A", "B", "C", "D"].forEach((v) => (avgByV[v] = count[v] ? Math.round(base[v] / count[v]) : 0));
  return FD_STORES.map((s) => ({
    storeId: s.id,
    storeName: s.name,
    region: s.region,
    velocity: s.velocity,
    noHistory: avgByV[s.velocity] === 0,
    projSqft: Math.round((avgByV[s.velocity] || 60) * (0.72 + Math.random() * 0.18)),
  }));
}

/* Attribute fit score: dept (50) + subDept (30) + price proximity within 20% (20) */
function attrFitScore(newSku, likeSku) {
  let score = 0;
  if (newSku.dept === likeSku.dept) score += 50;
  if (newSku.subDept && likeSku.subDept && newSku.subDept === likeSku.subDept) score += 30;
  if (newSku.price && likeSku.price) {
    const ratio = Math.min(newSku.price, likeSku.price) / Math.max(newSku.price, likeSku.price);
    if (ratio >= 0.8) score += 20;
  }
  return score;
}

/* ── Numbered workflow step card ───────────────────────────────────────────── */
function StepCard({ step, title, state, children }) {
  // state: "done" | "active" | "locked"
  const dotBg = state === "done" ? "var(--color-primary)" : state === "active" ? "var(--color-info)" : "var(--color-surface-alt)";
  const dotTone = state === "locked" ? "muted" : "inherit";
  const titleTone = state === "done" ? "primary" : state === "active" ? "info" : state === "locked" ? "muted" : "strong";
  return (
    <Card
      size="small"
      sx={{ ...panelSx, opacity: state === "locked" ? 0.55 : 1 }}
      aria-label={`Step ${step}: ${title}`}
      aria-disabled={state === "locked" ? "true" : undefined}
    >
      <Stack direction="row" gap={2} align="center" style={{ marginBottom: "var(--sp-3)" }}>
        <Stack
          className="lif-step-dot"
          align="center"
          justify="center"
          style={{ background: dotBg, color: state === "done" || state === "active" ? "var(--color-surface)" : undefined }}
        >
          <Text variant="caption" tone={state === "done" || state === "active" ? "inherit" : dotTone} style={{ fontWeight: "var(--fw-bold)" }}>
            {state === "done" ? <Check size={12} aria-hidden="true" /> : step}
          </Text>
        </Stack>
        <Text variant="body-strong" tone={titleTone}>{title}</Text>
      </Stack>
      {children}
    </Card>
  );
}

export default function LikeItemForecast({ onNavigate }) {
  const [skuState, setSkuState] = useState({});
  const [activeSku, setActiveSku] = useState(null);

  const getState = (sku) => skuState[sku] || { status: "unassigned" };

  const setLike = (sku, likeId) => {
    if (!likeId) return;
    const like = FD_SKUS.find((s) => s.sku === Number(likeId));
    setSkuState((prev) => ({
      ...prev,
      [sku]: { ...getState(sku), likeSkuId: like.sku, likeSkuDesc: like.desc, status: "assigned" },
    }));
  };
  const changeLike = (sku) => {
    setSkuState((prev) => ({ ...prev, [sku]: { ...getState(sku), status: "unassigned" } }));
  };
  const submit = (sku) => {
    setSkuState((prev) => ({
      ...prev,
      [sku]: { ...getState(sku), status: "submitted", submittedAt: new Date().toLocaleTimeString() },
    }));
  };
  const simReceive = (sku) => {
    const st = getState(sku);
    setSkuState((prev) => ({
      ...prev,
      [sku]: { ...st, status: "received", receivedAt: new Date().toLocaleTimeString(), projections: buildProjections(st.likeSkuId) },
    }));
  };

  // ── Left-rail status counts ─────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { unassigned: 0, assigned: 0, submitted: 0, received: 0 };
    NEW_SKUS.forEach((s) => (c[getState(s.sku).status] += 1));
    return c;
  }, [skuState]);

  const countCards = [
    { key: "received", label: "Received", tone: "success" },
    { key: "submitted", label: "Pending", tone: "muted" },
    { key: "assigned", label: "Assigned", tone: "info" },
    { key: "unassigned", label: "Unassigned", tone: "warning" },
  ];

  const active = activeSku ? FD_SKUS.find((s) => s.sku === activeSku) : null;
  const st = active ? getState(active.sku) : null;

  // ── Like-item candidate options (same dept, Active) ─────────────────────────
  const likeOptions = useMemo(() => {
    if (!active) return [];
    const cands = FD_SKUS.filter((s) => s.dept === active.dept && s.status === "Active" && s.sku !== active.sku);
    return [
      { value: "", label: `— Choose a like-item from ${active.dept} —` },
      ...cands.map((s) => {
        const stats = likeItemStats(s.sku);
        return { value: String(s.sku), label: `${s.desc} · $${s.price.toFixed(2)} · ${stats.r13} sqft · ${stats.stores}/21 stores` };
      }),
    ];
  }, [active]);

  // ── Step 3 results table ────────────────────────────────────────────────────
  const projColumns = useMemo(
    () => [
      {
        field: "storeName", headerName: "Store", minWidth: 200, flex: 1, filter: "agTextColumnFilter",
        cellRenderer: (p) => (
          <Stack direction="row" align="center" gap={2}>
            <span>{p.value}</span>
            {p.data?.noHistory && (
              <Badge variant="subtle" size="small" color="warning" label="No history" />
            )}
          </Stack>
        ),
      },
      { field: "region", headerName: "Region", width: 130, filter: "agSetColumnFilter" },
      {
        field: "velocity",
        headerName: "Vel.",
        width: 90,
        filter: "agSetColumnFilter",
        cellStyle: (p) => ({ color: VELOCITY_COLOR[p.value] || "var(--color-text)", fontWeight: "var(--fw-bold)" }),
      },
      {
        field: "projSqft",
        headerName: "Proj sqft",
        width: 120,
        filter: "agNumberColumnFilter",
        cellStyle: () => ({ color: "var(--color-success)", fontWeight: "var(--fw-bold)", fontFamily: "var(--font-mono)" }),
      },
    ],
    []
  );

  // ── Left SKU list ─────────────────────────────────────────────────────────
  const leftPanel = (
    <Card size="small" sx={paneSx}>
      <Stack direction="column" gap={1} paddingX={3} paddingY={3} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Text variant="body-strong" tone="strong">Like-Item Forecast</Text>
      </Stack>
      <Grid columns={2} gap={2} style={{ padding: "var(--sp-2)", borderBottom: "1px solid var(--color-border)" }}>
        {countCards.map((c) => (
          <Card size="small" key={c.key} sx={{ ...softSx, padding: "var(--sp-2)" }}>
            <Stack direction="column" gap={0} align="center">
              <Text variant="kpi" tone={c.tone}>{counts[c.key]}</Text>
              <Text variant="micro" tone="muted">{c.label}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>
      <div className="lif-list" style={{ padding: "var(--sp-2)" }}>
        <Stack direction="column" gap={2}>
          {NEW_SKUS.map((sku) => {
            const meta = STATUS_META[getState(sku.sku).status];
            const isActive = activeSku === sku.sku;
            return (
              <Stack
                key={sku.sku}
                className={`lif-card${isActive ? " is-active" : ""}`}
                direction="column"
                gap={2}
                paddingX={3}
                paddingY={2}
                role="button"
                tabIndex={0}
                onClick={() => setActiveSku(sku.sku)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveSku(sku.sku); } }}
              >
                <Stack direction="row" align="center" gap={2}>
                  <SkuSwatch sku={sku} size={26} aria-hidden="true" />
                  <Text variant="caption" tone="default" style={{ minWidth: 0 }}>{sku.desc}</Text>
                </Stack>
                <Stack direction="row" justify="space-between" align="center" gap={2} wrap>
                  <Badge variant="subtle" size="small" color={DEPT_BADGE[sku.dept]} label={sku.dept} />
                  <Badge variant="subtle" size="small" color={meta.color} label={meta.label} />
                </Stack>
              </Stack>
            );
          })}
        </Stack>
      </div>
    </Card>
  );

  // ── Right panel ──────────────────────────────────────────────────────────
  let rightPanel;
  if (!active) {
    rightPanel = (
      <Card size="small" sx={panelSx}>
        <Stack direction="column" gap={4} align="center" justify="center" style={{ minHeight: 360, textAlign: "center" }}>
          <EmptyState heading="Select a new PLR SKU to assign a like-item" />
        </Stack>
      </Card>
    );
  } else {
    const meta = STATUS_META[st.status];
    const step1Done = st.status !== "unassigned";
    const step2Done = st.status === "submitted" || st.status === "received";
    const step2Active = st.status === "assigned";
    const step3Done = st.status === "received";
    const step3Active = st.status === "submitted";

    const likeStats = step1Done ? likeItemStats(st.likeSkuId) : null;
    const likeSku = step1Done ? FD_SKUS.find((s) => s.sku === st.likeSkuId) : null;
    const fitPct = (likeSku && active) ? attrFitScore(active, likeSku) : null;

    let step3Body;
    if (step3Done && st.projections) {
      const proj = st.projections;
      const totalProj = proj.reduce((a, r) => a + r.projSqft, 0);
      const avgProj = Math.round(totalProj / proj.length);
      const likeAvg = likeItemStats(st.likeSkuId).avg;
      const vg = { A: [], B: [], C: [], D: [] };
      proj.forEach((r) => vg[r.velocity] && vg[r.velocity].push(r.projSqft));

      const kpis = [
        { v: totalProj, l: "Total proj sqft", tone: "success" },
        { v: avgProj, l: "Avg / store", tone: "strong" },
        { v: proj.length, l: "Stores covered", tone: "strong" },
        { v: likeAvg, l: "Like-item avg", tone: "info" },
      ];

      step3Body = (
        <Stack direction="column" gap={4}>
          <Grid columns={4} gap={3}>
            {kpis.map((k) => (
              <Card size="small" key={k.l} sx={{ ...softSx, padding: "var(--sp-3)" }}>
                <Stack direction="column" gap={1} align="center">
                  <Text variant="kpi" tone={k.tone}>{k.v}</Text>
                  <Text variant="micro" tone="muted">{k.l}</Text>
                </Stack>
              </Card>
            ))}
          </Grid>

          <Grid columns={4} gap={3}>
            {["A", "B", "C", "D"].map((v) => {
              const grp = vg[v];
              const avg = grp.length ? Math.round(grp.reduce((a, b) => a + b, 0) / grp.length) : 0;
              return (
                <Card size="small" key={v} sx={{ ...softSx, padding: "var(--sp-3)" }}>
                  <Stack direction="column" gap={1} align="center">
                    <Badge variant="subtle" size="small" color={VELOCITY_BADGE[v]} label={`Vel ${v} · ${grp.length}`} />
                    <Text variant="kpi" tone="strong">{avg}</Text>
                    <Text variant="micro" tone="muted">sqft avg</Text>
                  </Stack>
                </Card>
              );
            })}
          </Grid>

          <Table
      defaultColDef={{ floatingFilter: true }}
            cardContainer
            rowHeight="compact"
            tableHeader=""
            columnDefs={projColumns}
            rowData={proj}
            domLayout="autoHeight"
            hideTableSetting
            hideTableActions
            pagination={false}
          />

          <Card size="small" sx={{ ...panelSx, background: "var(--color-primary-soft)" }}>
            <Text variant="body-strong" tone="primary">Forecast received</Text>
          </Card>

          <Stack direction="row" gap={2} wrap>
            <Button variant="primary" size="medium" onClick={() => onNavigate?.("peer-intel")}>View in Assortment Intelligence →</Button>
            <Button variant="secondary" size="medium" onClick={() => onNavigate?.("store-curation")}>Advance to Store Curation →</Button>
          </Stack>
        </Stack>
      );
    } else if (step3Active) {
      step3Body = (
        <div>
          <Button variant="primary" size="medium" onClick={() => simReceive(active.sku)}>
            Receive forecast
          </Button>
        </div>
      );
    } else {
      step3Body = null;
    }

    rightPanel = (
      <Stack direction="column" gap={4}>
        {/* SKU header */}
        <Card size="small" sx={panelSx}>
          <Stack direction="row" gap={2} align="center" wrap style={{ marginBottom: "var(--sp-2)" }}>
            <SkuSwatch sku={active} size={32} />
            <Text variant="subheading" tone="strong">{active.desc}</Text>
            <Badge variant="subtle" size="small" color={meta.color} label={meta.label} />
          </Stack>
          <Stack direction="row" gap={3} align="center" wrap>
            <Badge variant="subtle" size="small" color={DEPT_BADGE[active.dept]} label={active.dept} />
            <Text variant="caption" tone="muted">{active.subDept} · {active.cls}</Text>
            <Text variant="caption" mono tone="muted">${active.price.toFixed(2)}/sqft</Text>
          </Stack>
        </Card>

        {/* Step 1 — Assign like-item */}
        <StepCard step="1" title="Assign like-item" state={step1Done ? "done" : "active"}>
          {step1Done ? (
            <Card size="small" sx={{ ...panelSx, background: "var(--color-teal-soft)", boxShadow: "none" }}>
              <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
                <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                  <Stack direction="row" gap={2} align="center" wrap>
                    <Text variant="body-strong" tone="teal">{st.likeSkuDesc}</Text>
                    {fitPct !== null && (
                      <Badge variant="subtle" size="small" color={fitPct >= 80 ? "success" : fitPct >= 50 ? "info" : "warning"} label={`Attribute match: ${fitPct}%`} />
                    )}
                  </Stack>
                  <Text variant="micro" mono tone="muted">{st.likeSkuId} · R13: {likeStats.r13} sqft · in assortment at {likeStats.stores} of 21 stores</Text>
                </Stack>
                {st.status === "assigned" ? (
                  <Button variant="secondary" size="small" onClick={() => changeLike(active.sku)}>Change</Button>
                ) : null}
              </Stack>
            </Card>
          ) : (
            <Stack direction="column" gap={2}>
              <FdSelect
                label="Proxy SKU"
                options={likeOptions}
                onChange={(v) => setLike(active.sku, v)}
              />
            </Stack>
          )}
        </StepCard>

        {/* Step 2 — Submit request */}
        <StepCard step="2" title="Submit forecast request" state={step2Done ? "done" : step2Active ? "active" : "locked"}>
          {step2Done ? (
            <Text variant="caption" tone="muted">Submitted {st.submittedAt}</Text>
          ) : step2Active ? (
            <div>
              <Button variant="primary" size="medium" onClick={() => submit(active.sku)}>Submit →</Button>
            </div>
          ) : null}
        </StepCard>

        {/* Step 3 — Receive forecast */}
        <StepCard step="3" title="Receive forecast" state={step3Done ? "done" : step3Active ? "active" : "locked"}>
          {step3Body}
        </StepCard>
      </Stack>
    );
  }

  return (
    <Grid columns="260px minmax(0, 1fr)" gap={4} align="start" style={{ flexWrap: "wrap" }}>
      {leftPanel}
      {rightPanel}
    </Grid>
  );
}
