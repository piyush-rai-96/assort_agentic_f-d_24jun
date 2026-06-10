import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, EmptyState } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { color } from "../styles/tokens.js";
import { FD_STORES } from "../data/stores.js";
import { FD_SKUS } from "../data/skus.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import "./LikeItemForecast.css";

/* Shared Card style — token-driven, neutral (matches the other views). */
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
const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };
const softSx = { ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none" };

/* Status → label + Impact UI Badge color (subtle supports default/info/success/warning/error). */
const STATUS_META = {
  unassigned: { label: "Needs like-item", color: "warning" },
  assigned: { label: "Like-item assigned", color: "info" },
  submitted: { label: "Submitted — pending", color: undefined }, // neutral/default
  received: { label: "Forecast received", color: "success" },
};
const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };
const VELOCITY_BADGE = { A: "success", B: "info", C: "warning", D: "error" };
const VELOCITY_COLOR = { A: color.success, B: color.teal, C: color.warning, D: color.error };

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
    projSqft: Math.round((avgByV[s.velocity] || 60) * (0.72 + Math.random() * 0.18)),
  }));
}

/* ── Numbered workflow step card ───────────────────────────────────────────── */
function StepCard({ step, title, state, children }) {
  // state: "done" | "active" | "locked"
  const dotBg = state === "done" ? "var(--color-primary)" : state === "active" ? color.info : "var(--color-surface-alt)";
  const dotTone = state === "locked" ? "muted" : "inherit";
  const titleTone = state === "done" ? "primary" : state === "active" ? "info" : state === "locked" ? "muted" : "strong";
  return (
    <Card sx={{ ...panelSx, opacity: state === "locked" ? 0.55 : 1 }}>
      <Stack direction="row" gap={2} align="center" style={{ marginBottom: "var(--sp-3)" }}>
        <Stack
          className="lif-step-dot"
          align="center"
          justify="center"
          style={{ background: dotBg, color: state === "done" || state === "active" ? "#fff" : undefined }}
        >
          <Text variant="caption" tone={state === "done" || state === "active" ? "inherit" : dotTone} style={{ fontWeight: 700 }}>
            {state === "done" ? "✓" : step}
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
      { field: "storeName", headerName: "Store", minWidth: 200, flex: 1, filter: "agTextColumnFilter" },
      { field: "region", headerName: "Region", width: 130, filter: "agSetColumnFilter" },
      {
        field: "velocity",
        headerName: "Vel.",
        width: 90,
        filter: "agSetColumnFilter",
        cellStyle: (p) => ({ color: VELOCITY_COLOR[p.value] || color.text, fontWeight: 700 }),
      },
      {
        field: "projSqft",
        headerName: "Proj sqft",
        width: 120,
        filter: "agNumberColumnFilter",
        cellStyle: () => ({ color: color.success, fontWeight: 700, fontFamily: "var(--font-mono)" }),
      },
    ],
    []
  );

  // ── Left SKU list ─────────────────────────────────────────────────────────
  const leftPanel = (
    <Card sx={paneSx}>
      <Stack direction="column" gap={1} paddingX={3} paddingY={3} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Text variant="body-strong" tone="strong">Like-Item Forecast</Text>
        <Text variant="micro" tone="muted">Assign proxy · request external forecast · receive results</Text>
      </Stack>
      <Grid columns={2} gap={2} style={{ padding: "var(--sp-2)", borderBottom: "1px solid var(--color-border)" }}>
        {countCards.map((c) => (
          <Card key={c.key} sx={{ ...softSx, padding: "var(--sp-2)" }}>
            <Stack direction="column" gap={0} align="center">
              <Text variant="heading" tone={c.tone}>{counts[c.key]}</Text>
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
                onClick={() => setActiveSku(sku.sku)}
              >
                <Text variant="caption" tone="default">{sku.desc}</Text>
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
      <Card sx={panelSx}>
        <Stack direction="column" gap={4} align="center" justify="center" style={{ minHeight: 360, textAlign: "center" }}>
          <EmptyState
            heading="Select a new PLR SKU to assign a like-item"
            description="Assign a proxy SKU, submit the forecast request to the external system, then receive the result to unlock downstream steps."
          />
          <Grid columns={3} gap={3} style={{ width: "100%", maxWidth: 460 }}>
            {[
              { step: "1", l: "Assign like-item" },
              { step: "2", l: "Submit request" },
              { step: "3", l: "Receive forecast" },
            ].map((s) => (
              <Card key={s.step} sx={softSx}>
                <Stack direction="column" gap={1} align="center">
                  <Text variant="title" tone="muted">{s.step}</Text>
                  <Text variant="micro" tone="muted">{s.l}</Text>
                </Stack>
              </Card>
            ))}
          </Grid>
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
              <Card key={k.l} sx={{ ...softSx, padding: "var(--sp-3)" }}>
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
                <Card key={v} sx={{ ...softSx, padding: "var(--sp-3)" }}>
                  <Stack direction="column" gap={1} align="center">
                    <Badge variant="subtle" size="small" color={VELOCITY_BADGE[v]} label={`Vel ${v} · ${grp.length}`} />
                    <Text variant="heading" tone="strong">{avg}</Text>
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
            tableHeader="Projected demand by store"
            columnDefs={projColumns}
            rowData={proj}
            domLayout="autoHeight"
            hideTableSetting
            hideTableActions
            pagination={false}
          />

          <Card sx={{ ...panelSx, background: "var(--color-primary-soft)" }}>
            <Stack direction="column" gap={1}>
              <Text variant="caption" tone="primary"><strong>Forecast received — downstream steps unlocked</strong></Text>
              <Text variant="micro" tone="muted">Assortment Intelligence will now use this forecast as the primary signal for {active.desc}.</Text>
            </Stack>
          </Card>

          <Stack direction="row" gap={2} wrap>
            <Button variant="primary" size="medium" onClick={() => onNavigate?.("peer-intel")}>View in Assortment Intelligence →</Button>
            <Button variant="secondary" size="medium" onClick={() => onNavigate?.("store-curation")}>Advance to Store Curation →</Button>
          </Stack>
        </Stack>
      );
    } else if (step3Active) {
      step3Body = (
        <Stack direction="column" gap={3}>
          <Text variant="caption" tone="muted">
            Request submitted. In a real workflow the external system responds here. Simulate receipt to continue.
          </Text>
          <div>
            <Button variant="primary" size="medium" onClick={() => simReceive(active.sku)}>
              Simulate: receive forecast from external system
            </Button>
          </div>
        </Stack>
      );
    } else {
      step3Body = <Text variant="caption" tone="subtle">Complete steps 1 and 2 first.</Text>;
    }

    rightPanel = (
      <Stack direction="column" gap={4}>
        {/* SKU header */}
        <Card sx={panelSx}>
          <Stack direction="row" gap={2} align="center" wrap style={{ marginBottom: "var(--sp-2)" }}>
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
        <StepCard step="1" title="Assign like-item (proxy SKU)" state={step1Done ? "done" : "active"}>
          {step1Done ? (
            <Card sx={{ ...panelSx, background: "var(--color-teal-soft)", boxShadow: "none" }}>
              <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
                <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                  <Text variant="caption" tone="teal"><strong>{st.likeSkuDesc}</strong></Text>
                  <Text variant="micro" mono tone="muted">{st.likeSkuId} · R13: {likeStats.r13} sqft · {likeStats.stores}/21 stores</Text>
                </Stack>
                {st.status === "assigned" ? (
                  <Button variant="secondary" size="small" onClick={() => changeLike(active.sku)}>Change</Button>
                ) : null}
              </Stack>
            </Card>
          ) : (
            <Stack direction="column" gap={2}>
              <Text variant="caption" tone="muted">
                Select an existing SKU from the same department whose sales history will proxy this new item&apos;s demand.
              </Text>
              <FdSelect
                label=""
                value=""
                options={likeOptions}
                onChange={(v) => setLike(active.sku, v)}
                width="100%"
                isWithSearch
              />
            </Stack>
          )}
        </StepCard>

        {/* Step 2 — Submit request */}
        <StepCard step="2" title="Submit forecast request to external system" state={step2Done ? "done" : step2Active ? "active" : "locked"}>
          {step2Done ? (
            <Text variant="caption" tone="muted">Submitted at {st.submittedAt} · Awaiting external system response</Text>
          ) : step2Active ? (
            <Stack direction="column" gap={3}>
              <Text variant="caption" tone="muted">
                Forecast request will be sent to the external forecasting system using <strong>{st.likeSkuDesc}</strong> as the proxy SKU.
              </Text>
              <div>
                <Button variant="primary" size="medium" onClick={() => submit(active.sku)}>Submit forecast request →</Button>
              </div>
            </Stack>
          ) : (
            <Text variant="caption" tone="subtle">Complete step 1 first.</Text>
          )}
        </StepCard>

        {/* Step 3 — Receive forecast */}
        <StepCard step="3" title="Forecast received — results from external system" state={step3Done ? "done" : step3Active ? "active" : "locked"}>
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
