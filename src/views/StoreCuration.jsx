import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Input, EmptyState, Alert } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { color } from "../styles/tokens.js";
import { FD_STORES } from "../data/stores.js";
import { FD_SKUS } from "../data/skus.js";
import { isMandatory, clusterLockedIds, newPlrSkus, storeUniqueRows } from "../data/curation.js";
import "./StoreCuration.css";

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

const DEPT_FILTERS = ["All", "Wood", "Tile", "Laminate & Vinyl"];
const DEPT_OPTIONS = DEPT_FILTERS.map((d) => ({ value: d, label: d }));
const STORE_OPTIONS = FD_STORES.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.region}` }));
const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };
const VEL_BADGE = { A: "success", B: "info", C: "warning", D: "error" };

const NEW_PLR = newPlrSkus();
const NEW_PLR_IDS = new Set(NEW_PLR.map((s) => s.sku));
const MANDATORY = FD_SKUS.filter(isMandatory);

/* ── One curation row: identity · stats · local-price · add/drop control ──── */
function CurationRow({ sku, assocRow, locked, decision, localPrice, onDecision, onPrice }) {
  const isActive = !!assocRow;
  const menuPrice = assocRow ? assocRow.menuPrice : sku.price;
  const r13 = assocRow ? assocRow.r13Sqft : 0;
  const lp = localPrice != null ? localPrice : menuPrice;
  const lpEdited = localPrice != null && localPrice !== menuPrice;
  const cls = `sc-row${decision === "add" ? " is-add" : ""}${decision === "drop" ? " is-drop" : ""}`;

  return (
    <Stack className={cls} direction="row" align="center" gap={3} wrap paddingX={4} paddingY={2}>
      {/* Identity */}
      <Stack direction="column" gap={1} flex="1 1 240px" style={{ minWidth: 0 }}>
        <Text variant="caption" tone="strong">{sku.desc}</Text>
        <Stack direction="row" gap={1} wrap align="center">
          <Text variant="micro" tone="subtle" mono>{sku.sku}</Text>
          {sku.tag ? <Badge variant="subtle" size="small" color="success" label={sku.tag} /> : null}
          {sku.status === "Discontinued" ? <Badge variant="subtle" size="small" color="error" label="Disc." /> : null}
          {!isActive && !locked ? <Badge variant="subtle" size="small" color="info" label="Not carried" /> : null}
        </Stack>
      </Stack>

      <Badge variant="subtle" size="small" color={DEPT_BADGE[sku.dept] || "default"} label={sku.dept} />
      <Text variant="micro" tone="muted" style={{ width: 110, flexShrink: 0 }}>{sku.subDept}</Text>
      <Text variant="micro" tone="muted" mono style={{ width: 60, flexShrink: 0 }}>{sku.size}</Text>
      <Text variant="caption" tone="strong" mono style={{ width: 60, flexShrink: 0 }}>${menuPrice.toFixed(2)}</Text>
      <Text
        variant="caption"
        mono
        tone={r13 > 100 ? "success" : r13 > 50 ? "default" : "subtle"}
        style={{ width: 70, flexShrink: 0, fontWeight: r13 > 100 ? 700 : 400 }}
      >
        {r13 ? `${Math.round(r13)} sqft` : "—"}
      </Text>

      {/* Local price override */}
      <Stack direction="row" align="center" gap={1} style={{ width: 110, flexShrink: 0 }}>
        <Text variant="micro" tone={lpEdited ? "info" : "subtle"}>$</Text>
        <div style={{ width: 84 }}>
          <Input
            type="number"
            step="0.01"
            size="small"
            value={lp.toFixed(2)}
            onChange={(e) => onPrice(parseFloat(e.target.value))}
            fullWidth
          />
        </div>
      </Stack>

      {/* Decision control */}
      <Stack align="center" justify="center" style={{ width: 110, flexShrink: 0 }}>
        {locked ? (
          <Text variant="caption" tone="muted" title="Mandatory — cannot change">🔒</Text>
        ) : isActive ? (
          <Button
            variant={decision === "drop" ? "primary" : "secondary"}
            type="destructive"
            size="small"
            onClick={() => onDecision("drop")}
            title="Drop from assortment"
          >
            {decision === "drop" ? "− Dropped" : "− Drop"}
          </Button>
        ) : (
          <Button
            variant={decision === "add" ? "primary" : "secondary"}
            size="small"
            onClick={() => onDecision("add")}
            title="Add to assortment"
          >
            {decision === "add" ? "+ Added" : "+ Add"}
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

/* ── Section header + row container ───────────────────────────────────────── */
function SCSection({ icon, title, count, sub, tone, badgeColor, scroll, children }) {
  return (
    <Stack direction="column" gap={2}>
      <Stack direction="row" align="center" gap={2} wrap>
        <Text variant="body-strong" tone={tone}>{icon} {title}</Text>
        <Badge variant="subtle" size="small" color={badgeColor} label={`${count}`} />
        {sub ? <Text variant="caption" tone="muted">{sub}</Text> : null}
      </Stack>
      <Card sx={paneSx}>
        <div className={scroll ? "sc-scroll" : undefined}>{children}</div>
      </Card>
    </Stack>
  );
}

export default function StoreCuration({ onNavigate }) {
  const [storeId, setStoreId] = useState(101);
  const [view, setView] = useState("form");
  const [deptFilter, setDeptFilter] = useState("All");
  const [decisions, setDecisions] = useState({});
  const [localPrices, setLocalPrices] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const key = (sid, skuId) => `${sid}:${skuId}`;
  const setDecision = (skuId, val) =>
    setDecisions((prev) => {
      const k = key(storeId, skuId);
      const next = { ...prev };
      if (next[k] === val) delete next[k];
      else next[k] = val;
      return next;
    });
  const setPrice = (skuId, val) =>
    setLocalPrices((prev) => ({ ...prev, [key(storeId, skuId)]: Number.isNaN(val) ? undefined : val }));

  const store = FD_STORES.find((s) => s.id === storeId) || FD_STORES[0];
  const byDeptSkus = (arr) => (deptFilter === "All" ? arr : arr.filter((s) => s.dept === deptFilter));

  /* Per-store tiered SKU lists. */
  const lists = useMemo(() => {
    const existing = storeUniqueRows(storeId);
    const existIds = new Set(existing.map((r) => r.sku));
    const clusterLocked = clusterLockedIds(storeId);
    const inactive = FD_SKUS.filter((s) => !existIds.has(s.sku) && !NEW_PLR_IDS.has(s.sku));

    const existingNonCore = existing.filter((r) => {
      const s = FD_SKUS.find((x) => x.sku === r.sku);
      return s && !isMandatory(s);
    });

    return {
      existing,
      mandatory: MANDATORY.map((sku) => ({ sku, assocRow: existing.find((r) => r.sku === sku.sku) || null, locked: true })),
      newPlr: NEW_PLR.map((sku) => ({ sku, assocRow: null, locked: false })),
      clusterLocked: existingNonCore
        .filter((r) => clusterLocked.has(r.sku))
        .map((r) => ({ sku: FD_SKUS.find((s) => s.sku === r.sku), assocRow: r, locked: true }))
        .filter((x) => x.sku),
      existingFree: existingNonCore
        .filter((r) => !clusterLocked.has(r.sku))
        .map((r) => ({ sku: FD_SKUS.find((s) => s.sku === r.sku), assocRow: r, locked: false }))
        .filter((x) => x.sku),
      available: inactive.filter((s) => !isMandatory(s)).map((sku) => ({ sku, assocRow: null, locked: false })),
    };
  }, [storeId]);

  const filterRows = (rows) => (deptFilter === "All" ? rows : rows.filter((r) => r.sku.dept === deptFilter));

  const totalAdds = Object.entries(decisions).filter(([k, v]) => k.startsWith(`${storeId}:`) && v === "add").length;
  const totalDrops = Object.entries(decisions).filter(([k, v]) => k.startsWith(`${storeId}:`) && v === "drop").length;

  const renderRow = (r) => (
    <CurationRow
      key={r.sku.sku}
      sku={r.sku}
      assocRow={r.assocRow}
      locked={r.locked}
      decision={decisions[key(storeId, r.sku.sku)]}
      localPrice={localPrices[key(storeId, r.sku.sku)]}
      onDecision={(val) => setDecision(r.sku.sku, val)}
      onPrice={(val) => setPrice(r.sku.sku, val)}
    />
  );

  /* Shared header (title + view toggle). */
  const ViewToggle = (
    <Stack direction="row" gap={2} wrap>
      <Button variant={view === "form" ? "primary" : "secondary"} size="small" onClick={() => setView("form")}>Store Form</Button>
      <Button variant={view === "summary" ? "primary" : "secondary"} size="small" onClick={() => setView("summary")}>Summary Roll-up</Button>
    </Stack>
  );

  const DeptFilterButtons = (
    <Stack direction="row" gap={2} wrap align="center" style={{ paddingTop: "var(--sp-3)", borderTop: "1px solid var(--color-border)" }}>
      <Text variant="micro" tone="subtle">Department</Text>
      {DEPT_FILTERS.map((d) => (
        <Button key={d} variant={deptFilter === d ? "primary" : "secondary"} size="small" onClick={() => setDeptFilter(d)}>{d}</Button>
      ))}
    </Stack>
  );

  if (view === "summary") {
    return (
      <SummaryRollup
        decisions={decisions}
        localPrices={localPrices}
        deptFilter={deptFilter}
        viewToggle={ViewToggle}
        deptButtons={DeptFilterButtons}
        onEdit={(sid) => { setStoreId(sid); setView("form"); }}
        onOpenForm={() => setView("form")}
      />
    );
  }

  const mandatory = filterRows(lists.mandatory);
  const newPlr = filterRows(lists.newPlr);
  const clusterLocked = filterRows(lists.clusterLocked);
  const existingFree = filterRows(lists.existingFree);
  const available = filterRows(lists.available);

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="column" gap={3}>
          <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
            <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="title">Store Curation</Text>
              <Text variant="caption" tone="muted">Add / Drop decisions per store · PLR live</Text>
            </Stack>
            {ViewToggle}
          </Stack>
          <Stack direction="row" gap={4} align="flex-end" wrap justify="space-between">
            <Stack direction="row" gap={3} align="flex-end" wrap>
              <FdSelect label="Store" value={String(storeId)} options={STORE_OPTIONS} onChange={(v) => setStoreId(parseInt(v, 10))} width={260} isWithSearch />
              <Stack direction="column" gap={1}>
                <Text variant="micro" tone="subtle">Status</Text>
                <Stack direction="row" gap={2} align="center">
                  <Badge variant="subtle" size="small" color={VEL_BADGE[store.velocity] || "default"} label={`Vel ${store.velocity}`} />
                  <Text variant="caption" tone="muted">{store.region} · DC{store.dc}</Text>
                </Stack>
              </Stack>
            </Stack>
            <Stack direction="row" gap={2} align="center">
              <Stack direction="column" align="center" paddingX={3} paddingY={2} style={{ background: "var(--color-error-soft)", borderRadius: "var(--r2)" }}>
                <Text variant="body-strong" tone="error">{totalDrops}</Text>
                <Text variant="micro" tone="muted">Drops</Text>
              </Stack>
              <Stack direction="column" align="center" paddingX={3} paddingY={2} style={{ background: "var(--color-success-soft)", borderRadius: "var(--r2)" }}>
                <Text variant="body-strong" tone="success">{totalAdds}</Text>
                <Text variant="micro" tone="muted">Adds</Text>
              </Stack>
            </Stack>
          </Stack>
          {DeptFilterButtons}
        </Stack>
      </Card>

      {/* ── Tiered sections ────────────────────────────────────────────────── */}
      {mandatory.length ? (
        <SCSection icon="🔒" title="Mandatory — Core / BG" count={mandatory.length} tone="success" badgeColor="success" sub="Cannot be added or removed from any store">
          {mandatory.map(renderRow)}
        </SCSection>
      ) : null}

      {newPlr.length ? (
        <SCSection icon="✨" title="New PLR Items" count={newPlr.length} tone="info" badgeColor="info" sub="Not yet in any store — add to carry this season">
          {newPlr.map(renderRow)}
        </SCSection>
      ) : null}

      {clusterLocked.length ? (
        <SCSection icon="🗂" title="Cluster Assortment" count={clusterLocked.length} tone="teal" badgeColor="info" sub="Set in Regional Review — locked for this cluster · cannot drop">
          {clusterLocked.map(renderRow)}
        </SCSection>
      ) : null}

      {existingFree.length ? (
        <SCSection icon="📦" title="Existing Assortment" count={existingFree.length} tone="warning" badgeColor="warning" sub="Currently carried — drop to remove this season" scroll>
          {existingFree.map(renderRow)}
        </SCSection>
      ) : null}

      {available.length ? (
        <SCSection icon="➕" title="Available to Add" count={available.length} tone="accent" badgeColor="default" sub="Not in your store — add to carry" scroll>
          {available.map(renderRow)}
        </SCSection>
      ) : null}

      {/* ── Submit bar ─────────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        {submitted && (
          <div style={{ marginBottom: "var(--sp-3)" }}>
            <Alert severity="success" title="Decisions submitted successfully" subtleBackground onClose={() => setSubmitted(false)} />
          </div>
        )}
        <Stack direction="row" align="center" justify="space-between" gap={3} wrap>
          <Text variant="caption" tone="muted">{totalAdds} adds · {totalDrops} drops · review in Summary Roll-up before submitting</Text>
          <Stack direction="row" gap={2}>
            <Button variant="secondary" size="medium" onClick={() => setView("summary")}>View Summary →</Button>
            <Button variant="primary" size="medium" onClick={() => setSubmitted(true)}>Submit decisions</Button>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  );
}

/* ════════════ SUMMARY ROLL-UP VIEW ════════════ */
function SummaryRollup({ decisions, localPrices, deptFilter, viewToggle, deptButtons, onEdit, onOpenForm }) {
  const relevantIds = useMemo(
    () => new Set((deptFilter === "All" ? FD_SKUS : FD_SKUS.filter((s) => s.dept === deptFilter)).map((s) => s.sku)),
    [deptFilter]
  );

  const decKeys = Object.keys(decisions).filter((k) => relevantIds.has(parseInt(k.split(":")[1], 10)));
  const regions = [...new Set(FD_STORES.map((s) => s.region))].sort();
  const totalAdds = decKeys.filter((k) => decisions[k] === "add").length;
  const totalDrops = decKeys.filter((k) => decisions[k] === "drop").length;
  const storeCount = new Set(decKeys.map((k) => k.split(":")[0])).size;

  return (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Stack direction="column" gap={3}>
          <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
            <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="title">Add / Drop Summary</Text>
              <Text variant="caption" tone="muted">Roll-up by region and store · validate before submission</Text>
            </Stack>
            {viewToggle}
          </Stack>
          {deptButtons}
        </Stack>
      </Card>

      {!decKeys.length ? (
        <Card sx={softSx}>
          <Stack direction="column" gap={3} align="center" paddingY={5}>
            <EmptyState
              heading="No decisions yet"
              description="Go to the Store Form and use + / − to make add/drop decisions per store."
            />
            <Button variant="primary" size="medium" onClick={onOpenForm}>Open Store Form →</Button>
          </Stack>
        </Card>
      ) : (
        <>
          {regions.map((region) => {
            const regionStores = FD_STORES.filter((s) => s.region === region);
            const storesWithDecs = regionStores.filter((s) => decKeys.some((k) => k.startsWith(`${s.id}:`)));
            if (!storesWithDecs.length) return null;

            return (
              <Stack key={region} direction="column" gap={2}>
                <Text variant="overline" tone="muted">{region}</Text>
                {storesWithDecs.map((s) => {
                  const storeDecKeys = decKeys.filter((k) => k.startsWith(`${s.id}:`));
                  const adds = storeDecKeys.filter((k) => decisions[k] === "add").length;
                  const drops = storeDecKeys.filter((k) => decisions[k] === "drop").length;
                  return (
                    <Card key={s.id} sx={paneSx}>
                      <Stack direction="row" align="center" gap={3} wrap paddingX={4} paddingY={2} style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)" }}>
                        <Text variant="body-strong" tone="strong" style={{ flex: "1 1 auto", minWidth: 0 }}>{s.name}</Text>
                        <Badge variant="subtle" size="small" color="success" label={`+${adds} adds`} />
                        <Badge variant="subtle" size="small" color="error" label={`−${drops} drops`} />
                        <Button variant="tertiary" size="small" onClick={() => onEdit(s.id)}>Edit →</Button>
                      </Stack>
                      {storeDecKeys.map((k) => {
                        const skuId = parseInt(k.split(":")[1], 10);
                        const sku = FD_SKUS.find((x) => x.sku === skuId);
                        if (!sku) return null;
                        const dec = decisions[k];
                        const lpOverride = localPrices[k];
                        const lp = lpOverride != null ? lpOverride : sku.price;
                        const lpEdited = lpOverride != null && lpOverride !== sku.price;
                        return (
                          <Stack key={k} className={`sc-row ${dec === "drop" ? "is-drop" : "is-add"}`} direction="row" align="center" gap={3} wrap paddingX={4} paddingY={2}>
                            <Text variant="body-strong" tone={dec === "drop" ? "error" : "success"} style={{ width: 20, flexShrink: 0 }}>{dec === "drop" ? "−" : "+"}</Text>
                            <Stack direction="column" gap={1} flex="1 1 220px" style={{ minWidth: 0 }}>
                              <Text variant="caption" tone="strong">{sku.desc}</Text>
                              <Text variant="micro" tone="subtle" mono>{sku.sku} · {sku.vsn}</Text>
                            </Stack>
                            <Badge variant="subtle" size="small" color={DEPT_BADGE[sku.dept] || "default"} label={sku.dept} />
                            <Text variant="micro" tone="muted" style={{ width: 110, flexShrink: 0 }}>{sku.subDept}</Text>
                            <Text variant="caption" tone="strong" mono style={{ width: 60, flexShrink: 0 }}>${sku.price.toFixed(2)}</Text>
                            <Text variant="caption" mono tone={lpEdited ? "info" : "muted"} style={{ width: 90, flexShrink: 0 }}>${lp.toFixed(2)}{lpEdited ? " ✎" : ""}</Text>
                          </Stack>
                        );
                      })}
                    </Card>
                  );
                })}
              </Stack>
            );
          })}

          <Card sx={{ ...panelSx, background: "var(--color-success-soft)", border: "1.5px solid var(--color-success)" }}>
            <Stack direction="row" align="center" justify="space-between" gap={3} wrap>
              <Text variant="caption" tone="strong">
                {totalAdds} adds · {totalDrops} drops across {storeCount} {storeCount === 1 ? "store" : "stores"}
              </Text>
              <Button variant="primary" size="medium" onClick={() => alert("Assortment submitted to OMS. Feedback capture begins at publish (Oct 1).")}>Validate &amp; Submit all →</Button>
            </Stack>
          </Card>
        </>
      )}
    </Stack>
  );
}
