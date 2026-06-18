import React, { useMemo, useState } from "react";
import { Card, Button, Badge, EmptyState, Alert, Chips, Input, FiltersStrip, FilterPanel } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import SkuSwatch from "../components/SkuSwatch.jsx";
import { color } from "../styles/tokens.js";
import { FD_STORES } from "../data/stores.js";
import { FD_SKUS } from "../data/skus.js";
import { isMandatory, clusterLockedIds, newPlrSkus, storeUniqueRows } from "../data/curation.js";
import { storeLocationBudget, otbStoreConsumed, fmtCurrency } from "../data/otb.js";
import "./StoreCuration.css";
import { panelSx, softSx } from "../styles/panelSx.js";

const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };

const DEPT_FILTERS = ["All", "Wood", "Tile", "Laminate & Vinyl"];
const STORE_OPTIONS = FD_STORES.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.region}` }));
const DEPT_BADGE = { Wood: "warning", Tile: "success", "Laminate & Vinyl": "info" };
const VEL_BADGE  = { A: "success", B: "info", C: "warning", D: "error" };

const NEW_PLR     = newPlrSkus();
const NEW_PLR_IDS = new Set(NEW_PLR.map((s) => s.sku));
const MANDATORY   = FD_SKUS.filter(isMandatory);

/* ── Curation row ────────────────────────────────────────────────────────── */
function CurationRow({ sku, assocRow, locked, decision, localPrice, onDecision, onPrice }) {
  const isActive  = !!assocRow;
  const menuPrice = assocRow ? assocRow.menuPrice : sku.price;
  const r13       = assocRow ? assocRow.r13Sqft   : 0;
  const lp        = localPrice != null ? localPrice : menuPrice;
  const lpEdited  = localPrice != null && localPrice !== menuPrice;

  const stateClass = decision === "add" ? " is-add" : decision === "drop" ? " is-drop" : "";

  return (
    <div className={`sc-row${stateClass}`}>
      {/* Left: swatch + identity */}
      <div className="sc-row-identity">
        <SkuSwatch sku={sku} size={28} />
        <div className="sc-row-meta">
          <span className="sc-row-desc">{sku.desc}</span>
          <div className="sc-row-sub">
            <span className="sc-row-skuid">{sku.sku}</span>
            <span className="sc-row-subdept">{sku.subDept}</span>
            {sku.tag && <Badge variant="subtle" size="small" color="success" label={sku.tag} />}
            {sku.status === "Discontinued" && <Badge variant="subtle" size="small" color="error" label="Disc." />}
            {!isActive && !locked && <Badge variant="subtle" size="small" color="neutral" label="Not carried" />}
          </div>
        </div>
      </div>

      {/* Middle: dept + size + prices + r13 */}
      <div className="sc-row-stats">
        <Badge variant="subtle" size="small" color={DEPT_BADGE[sku.dept] || "default"} label={sku.dept} />
        <span className="sc-row-size">{sku.size}</span>
        <span className="sc-row-price">${menuPrice.toFixed(2)}</span>
        <span className={`sc-row-r13 ${r13 > 100 ? "sc-row-r13--strong" : r13 > 0 ? "" : "sc-row-r13--empty"}`}>
          {r13 ? `${Math.round(r13)} sqft` : "—"}
        </span>
      </div>

      {/* Right: local price override + decision */}
      <div className="sc-row-actions">
        <div className={`sc-price-field${lpEdited ? " sc-price-field--edited" : ""}`}>
          <Input
            id={`sc-price-${sku.sku}`}
            type="number"
            size="small"
            prefix="$"
            step="0.01"
            value={lp.toFixed(2)}
            aria-label={`Local price for ${sku.sku}`}
            onChange={(e) => onPrice(parseFloat(e.target.value))}
          />
          {lpEdited && <span className="sc-price-edited-dot" title="Price overridden" />}
        </div>

        {locked ? (
          <Badge variant="subtle" color="neutral" label="Locked" />
        ) : isActive ? (
          <Button
            variant={decision === "drop" ? "danger" : "ghost"}
            size="small"
            onClick={() => onDecision("drop")}
          >
            {decision === "drop" ? "Dropped" : "Drop"}
          </Button>
        ) : (
          <Button
            variant={decision === "add" ? "primary" : "ghost"}
            size="small"
            onClick={() => onDecision("add")}
          >
            {decision === "add" ? "Added" : "+ Add"}
          </Button>
        )}
      </div>
    </div>
  );
}

/* ── Section ─────────────────────────────────────────────────────────────── */
const SECTION_META = {
  mandatory:    { label: "Mandatory — Core / BG",   indicator: "locked",  sub: "Cannot be added or removed from any store" },
  newPlr:       { label: "New PLR Items",            indicator: "new",     sub: "Not yet in any store — add to carry this season" },
  clusterLocked:{ label: "Cluster Assortment",       indicator: "cluster", sub: "Set in Regional Review — locked for this cluster" },
  existingFree: { label: "Existing Assortment",      indicator: "existing",sub: "Currently carried — drop to remove this season" },
  available:    { label: "Available to Add",         indicator: "add",     sub: "Not in your store — add to carry this season" },
};

function SCSection({ sectionKey, count, scroll, children }) {
  const meta = SECTION_META[sectionKey] || {};
  return (
    <div className="sc-section">
      <div className="sc-section-header">
        <span className={`sc-section-indicator sc-section-indicator--${meta.indicator}`} aria-hidden="true" />
        <span className="sc-section-title">{meta.label}</span>
        <span className="sc-section-count">{count}</span>
        {meta.sub && <span className="sc-section-sub">{meta.sub}</span>}
      </div>
      <Card sx={paneSx}>
        <div className={scroll ? "sc-scroll" : undefined}>{children}</div>
      </Card>
    </div>
  );
}

/* ── OTB Banner ──────────────────────────────────────────────────────────── */
function OtbBanner({ storeId, store, decisions, lists }) {
  const allRows = [...(lists.existingFree || []), ...(lists.available || [])];
  const storeDecisions = {};
  Object.entries(decisions).forEach(([k, v]) => {
    const [sid, skuId] = k.split(":");
    if (parseInt(sid, 10) === storeId) storeDecisions[skuId] = v;
  });
  const otb  = otbStoreConsumed(storeId, storeDecisions, allRows.map((r) => ({ sku: r.sku.sku, price: r.sku.price })));
  const over = otb.net < 0;
  const pct  = Math.min(100, Math.round(otb.pct));

  return (
    <div className={`sc-otb${over ? " sc-otb--over" : ""}`}>
      <div className="sc-otb-left">
        <span className="sc-otb-title">Location OTB Budget</span>
        <span className="sc-otb-band">({store.velocity}-band)</span>
      </div>
      <div className="sc-otb-bar-wrap">
        <div className="sc-otb-bar-track">
          <div className="sc-otb-bar-fill" style={{ width: `${pct}%`, background: over ? "var(--color-error)" : "var(--color-success)" }} />
        </div>
        <div className="sc-otb-bar-labels">
          <span>$0</span>
          <span>{fmtCurrency(otb.budget)}</span>
        </div>
      </div>
      <div className="sc-otb-right">
        {over
          ? <span className="sc-otb-stat sc-otb-stat--over">{fmtCurrency(Math.abs(otb.net))} over budget</span>
          : <span className="sc-otb-stat">{fmtCurrency(otb.adds)} adds · <strong>{fmtCurrency(otb.budget - otb.adds + otb.drops)} remaining</strong></span>
        }
        <span className="sc-otb-budget-label">Budget: {fmtCurrency(otb.budget)}</span>
      </div>
    </div>
  );
}

/* ── Main view ───────────────────────────────────────────────────────────── */
export default function StoreCuration({ onNavigate, user }) {
  const defaultStore = user?.storeId || 101;
  const [storeId, setStoreId]     = useState(defaultStore);
  const [view, setView]           = useState("form");
  const [deptFilter, setDeptFilter] = useState("All");
  const [decisions, setDecisions] = useState({});
  const [localPrices, setLocalPrices] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("store");

  const key = (sid, skuId) => `${sid}:${skuId}`;
  const setDecision = (skuId, val) =>
    setDecisions((prev) => {
      const k = key(storeId, skuId);
      const next = { ...prev };
      if (next[k] === val) delete next[k]; else next[k] = val;
      return next;
    });
  const setPrice = (skuId, val) =>
    setLocalPrices((prev) => ({ ...prev, [key(storeId, skuId)]: Number.isNaN(val) ? undefined : val }));

  const store = FD_STORES.find((s) => s.id === storeId) || FD_STORES[0];

  const lists = useMemo(() => {
    const existing  = storeUniqueRows(storeId);
    const existIds  = new Set(existing.map((r) => r.sku));
    const clusterLocked = clusterLockedIds(storeId);
    const inactive  = FD_SKUS.filter((s) => !existIds.has(s.sku) && !NEW_PLR_IDS.has(s.sku));
    const existingNonCore = existing.filter((r) => { const s = FD_SKUS.find((x) => x.sku === r.sku); return s && !isMandatory(s); });
    return {
      existing,
      mandatory:     MANDATORY.map((sku) => ({ sku, assocRow: existing.find((r) => r.sku === sku.sku) || null, locked: true })),
      newPlr:        NEW_PLR.map((sku) => ({ sku, assocRow: null, locked: false })),
      clusterLocked: existingNonCore.filter((r) => clusterLocked.has(r.sku)).map((r) => ({ sku: FD_SKUS.find((s) => s.sku === r.sku), assocRow: r, locked: true })).filter((x) => x.sku),
      existingFree:  existingNonCore.filter((r) => !clusterLocked.has(r.sku)).map((r) => ({ sku: FD_SKUS.find((s) => s.sku === r.sku), assocRow: r, locked: false })).filter((x) => x.sku),
      available:     inactive.filter((s) => !isMandatory(s)).map((sku) => ({ sku, assocRow: null, locked: false })),
    };
  }, [storeId]);

  const filterRows = (rows) => deptFilter === "All" ? rows : rows.filter((r) => r.sku.dept === deptFilter);

  const totalAdds  = Object.entries(decisions).filter(([k, v]) => k.startsWith(`${storeId}:`) && v === "add").length;
  const totalDrops = Object.entries(decisions).filter(([k, v]) => k.startsWith(`${storeId}:`) && v === "drop").length;

  /* ── Filter strip tags ────────────────────────────────────────────────── */
  const scFilterTags = React.useMemo(() => {
    const tags = [];
    const storeName = STORE_OPTIONS.find((o) => o.value === String(storeId))?.label || String(storeId);
    tags.push({ id: "store", label: "Store", values: [{ id: 1, label: storeName }] });
    if (deptFilter !== "All") tags.push({ id: "dept", label: "Dept", values: [{ id: 1, label: deptFilter }] });
    return tags;
  }, [storeId, deptFilter]);

  const DEPT_FD_OPTIONS = DEPT_FILTERS.map((d) => ({ value: d, label: d }));
  const scFilterPanelTabs = [
    {
      value: "store",
      title: "Store",
      numberOfFilter: 1,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect label="Store" value={String(storeId)} options={STORE_OPTIONS} onChange={(v) => setStoreId(parseInt(v, 10))} width={320} isWithSearch />
        </Stack>
      ),
    },
    {
      value: "dept",
      title: "Department",
      numberOfFilter: deptFilter !== "All" ? 1 : 0,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect label="Department" value={deptFilter} options={DEPT_FD_OPTIONS} onChange={setDeptFilter} width={320} />
        </Stack>
      ),
    },
  ];

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

  const ViewToggle = (
    <Stack direction="row" gap={2}>
      <Chips label="Store Form" isActive={view === "form"} onClick={() => setView("form")} />
      <Chips label="Summary Roll-up" isActive={view === "summary"} onClick={() => setView("summary")} />
    </Stack>
  );

  if (view === "summary") {
    return (
      <SummaryRollup
        decisions={decisions} localPrices={localPrices} deptFilter={deptFilter}
        viewToggle={ViewToggle}
        onEdit={(sid) => { setStoreId(sid); setView("form"); }}
        onOpenForm={() => setView("form")}
      />
    );
  }

  const mandatory     = filterRows(lists.mandatory);
  const newPlr        = filterRows(lists.newPlr);
  const clusterLocked = filterRows(lists.clusterLocked);
  const existingFree  = filterRows(lists.existingFree);
  const available     = filterRows(lists.available);

  return (
    <Stack direction="column" gap={4}>

      {/* ── Header card ─────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        {/* Top row */}
        <div className="sc-header-top">
          <div className="sc-header-title-block">
            <div className="sc-header-title-row">
              <h1 className="sc-title">Store Curation</h1>
              <span className={`sc-persona-badge ${user?.id === "store" ? "sc-persona-badge--store" : "sc-persona-badge--corp"}`}>
                {user?.id === "store" ? "My Store View" : "All Stores"}
              </span>
            </div>
            <p className="sc-subtitle">Add / Drop decisions per store · SS 2026 PLR live</p>
          </div>
          <div className="sc-header-controls">
            {ViewToggle}
          </div>
        </div>

        {/* Store status — contextual info for selected store */}
        <div className="sc-header-middle">
          <div className="sc-store-status">
            <Badge variant="subtle" size="small" color={VEL_BADGE[store.velocity] || "default"} label={`Vel ${store.velocity}`} />
          </div>
          <div className="sc-decision-counters">
            <div className="sc-counter sc-counter--drop">
              <span className="sc-counter-num">{totalDrops}</span>
              <span className="sc-counter-lbl">Drops</span>
            </div>
            <div className="sc-counter sc-counter--add">
              <span className="sc-counter-num">{totalAdds}</span>
              <span className="sc-counter-lbl">Adds</span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Filters strip ──────────────────────────────────────────────────── */}
      <FiltersStrip
        filterTags={scFilterTags}
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
        title="Store Curation Filters"
        size="medium"
        anchor="right"
        isOpen={filterPanelOpen}
        setIsOpen={setFilterPanelOpen}
        active={activeFilterTab}
        setActive={setActiveFilterTab}
        filters={scFilterPanelTabs}
        primaryButtonLabel="Apply"
        onPrimaryButtonClick={() => setFilterPanelOpen(false)}
        secondaryButtonLabel="Clear dept"
        onSecondaryButtonClick={() => setDeptFilter("All")}
      />

      {/* ── OTB Budget bar ──────────────────────────────────────────────── */}
      <OtbBanner storeId={storeId} store={store} decisions={decisions} lists={lists} />

      {/* ── Column header row ───────────────────────────────────────────── */}
      <div className="sc-col-header">
        <span className="sc-col-identity">SKU / Description</span>
        <span className="sc-col-stats">Dept · Sub-dept · Size · Price · R13</span>
        <span className="sc-col-actions">Local Price · Decision</span>
      </div>

      {/* ── Tiered sections ─────────────────────────────────────────────── */}
      {mandatory.length     ? <SCSection sectionKey="mandatory"     count={mandatory.length}>    {mandatory.map(renderRow)}</SCSection>     : null}
      {newPlr.length        ? <SCSection sectionKey="newPlr"        count={newPlr.length}>       {newPlr.map(renderRow)}</SCSection>        : null}
      {clusterLocked.length ? <SCSection sectionKey="clusterLocked" count={clusterLocked.length}>{clusterLocked.map(renderRow)}</SCSection> : null}
      {existingFree.length  ? <SCSection sectionKey="existingFree"  count={existingFree.length} scroll>{existingFree.map(renderRow)}</SCSection>  : null}
      {available.length     ? <SCSection sectionKey="available"     count={available.length}    scroll>{available.map(renderRow)}</SCSection>     : null}

      {/* ── Submit bar ──────────────────────────────────────────────────── */}
      {submitted && (
        <Alert severity="success" title="Decisions submitted successfully" subtleBackground onClose={() => setSubmitted(false)} />
      )}
      <Card sx={panelSx}>
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

/* ════════════ SUMMARY ROLL-UP VIEW ════════════════════════════════════════ */
function SummaryRollup({ decisions, localPrices, deptFilter, viewToggle, onEdit, onOpenForm }) {
  const relevantIds = useMemo(
    () => new Set((deptFilter === "All" ? FD_SKUS : FD_SKUS.filter((s) => s.dept === deptFilter)).map((s) => s.sku)),
    [deptFilter]
  );
  const decKeys   = Object.keys(decisions).filter((k) => relevantIds.has(parseInt(k.split(":")[1], 10)));
  const regions   = [...new Set(FD_STORES.map((s) => s.region))].sort();
  const totalAdds = decKeys.filter((k) => decisions[k] === "add").length;
  const totalDrops= decKeys.filter((k) => decisions[k] === "drop").length;
  const storeCount= new Set(decKeys.map((k) => k.split(":")[0])).size;

  return (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Add / Drop Summary</Text>
            <Text variant="caption" tone="muted">Roll-up by region and store · validate before submission</Text>
          </Stack>
          {viewToggle}
        </Stack>
      </Card>

      {!decKeys.length ? (
        <Card sx={softSx}>
          <Stack direction="column" gap={3} align="center" paddingY={5}>
            <EmptyState heading="No decisions yet" description="Go to the Store Form and use + / − to make add/drop decisions per store." />
            <Button variant="primary" size="medium" onClick={onOpenForm}>Open Store Form →</Button>
          </Stack>
        </Card>
      ) : (
        <>
          {regions.map((region) => {
            const regionStores   = FD_STORES.filter((s) => s.region === region);
            const storesWithDecs = regionStores.filter((s) => decKeys.some((k) => k.startsWith(`${s.id}:`)));
            if (!storesWithDecs.length) return null;
            return (
              <Stack key={region} direction="column" gap={2}>
                <Text variant="overline" tone="muted">{region}</Text>
                {storesWithDecs.map((s) => {
                  const storeDecKeys = decKeys.filter((k) => k.startsWith(`${s.id}:`));
                  const adds  = storeDecKeys.filter((k) => decisions[k] === "add").length;
                  const drops = storeDecKeys.filter((k) => decisions[k] === "drop").length;
                  return (
                    <Card key={s.id} sx={paneSx}>
                      <Stack direction="row" align="center" gap={3} wrap paddingX={4} paddingY={2} style={{ background: "var(--color-surface-alt)", borderBottom: "1px solid var(--color-border)" }}>
                        <Text variant="body-strong" tone="strong" style={{ flex: "1 1 auto", minWidth: 0 }}>{s.name}</Text>
                        <Badge variant="subtle" size="small" color="success" label={`+${adds} adds`} />
                        <Badge variant="subtle" size="small" color="error"   label={`−${drops} drops`} />
                        <Button variant="tertiary" size="small" onClick={() => onEdit(s.id)}>Edit →</Button>
                      </Stack>
                      {storeDecKeys.map((k) => {
                        const skuId = parseInt(k.split(":")[1], 10);
                        const sku   = FD_SKUS.find((x) => x.sku === skuId);
                        if (!sku) return null;
                        const dec      = decisions[k];
                        const lpOverride = localPrices[k];
                        const lp       = lpOverride != null ? lpOverride : sku.price;
                        const lpEdited = lpOverride != null && lpOverride !== sku.price;
                        return (
                          <div key={k} className={`sc-row ${dec === "drop" ? "is-drop" : "is-add"}`} style={{ padding: "var(--sp-2) var(--sp-4)", display: "flex", alignItems: "center", gap: "var(--sp-3)", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 800, fontSize: "var(--fs-heading)", color: dec === "drop" ? color.error : color.success, width: 20, flexShrink: 0 }}>{dec === "drop" ? "−" : "+"}</span>
                            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                              <Text variant="caption" tone="strong">{sku.desc}</Text>
                              <Text variant="micro" tone="subtle" mono>{sku.sku} · {sku.vsn}</Text>
                            </div>
                            <Badge variant="subtle" size="small" color={DEPT_BADGE[sku.dept] || "default"} label={sku.dept} />
                            <Text variant="micro" tone="muted" style={{ width: 110, flexShrink: 0 }}>{sku.subDept}</Text>
                            <Text variant="caption" tone="strong" mono style={{ width: 60, flexShrink: 0 }}>${sku.price.toFixed(2)}</Text>
                            <Text variant="caption" mono tone={lpEdited ? "info" : "muted"} style={{ width: 90, flexShrink: 0 }}>${lp.toFixed(2)}{lpEdited ? " ✎" : ""}</Text>
                          </div>
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
              <Button variant="primary" size="medium" onClick={() => alert("Assortment submitted to OMS.")}>Validate &amp; Submit all →</Button>
            </Stack>
          </Card>
        </>
      )}
    </Stack>
  );
}
