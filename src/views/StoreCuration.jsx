import React, { useMemo, useState } from "react";
import { Card, Button, Badge, EmptyState, Alert, Chips, Input, FiltersStrip, FilterPanel } from "impact-ui";
import { CheckCircle2, Lock, Layers, Store, TrendingUp, ChevronRight, ShoppingBag } from "lucide-react";
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
import { getStoreRec, REC_COLOR } from "../utils/skuRec.js";
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

  /* Row highlight: added=green, dropped=red, else neutral */
  const stateClass = decision === "add" ? " is-add" : decision === "drop" ? " is-drop" : "";

  /* Agent recommendation */
  const rec = getStoreRec({ r13, menuPrice, status: sku.status, tag: sku.tag, isActive });

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

      {/* Middle: dept + size + prices + r13 + agent rec */}
      <div className="sc-row-stats">
        <Badge variant="subtle" size="small" color={DEPT_BADGE[sku.dept] || "default"} label={sku.dept} />
        <span className="sc-row-size">{sku.size}</span>
        <span className="sc-row-price">${menuPrice.toFixed(2)}</span>
        <span className={`sc-row-r13 ${r13 > 100 ? "sc-row-r13--strong" : r13 > 0 ? "" : "sc-row-r13--empty"}`}>
          {r13 ? `${Math.round(r13)} sqft` : "—"}
        </span>
        {/* Agent rec chip */}
        <div
          className="sc-rec-chip"
          style={{
            background:  REC_COLOR[rec.action]?.bg,
            color:       REC_COLOR[rec.action]?.text,
            borderColor: REC_COLOR[rec.action]?.border,
          }}
          title={rec.detail}
        >
          {rec.action === "keep" ? "Keep" : rec.action === "modify" ? "Review" : "Drop"}
          <span className="sc-rec-reason">{rec.reason}</span>
        </div>
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

        {/* ── Decision controls ─────────────────────────────────────── */}
        {locked ? (
          /* Mandatory / cluster-locked — always Keep, cannot change */
          <div className="sc-decision-locked">
            <CheckCircle2 size={11} aria-hidden="true" />
            Keep
          </div>
        ) : isActive ? (
          /* Existing assortment — Keep / Drop pair */
          <div className="sc-kd-pair">
            <button
              type="button"
              className={`sc-kd-btn sc-kd-keep${!decision || decision === "keep" ? " active" : ""}`}
              onClick={() => onDecision(decision === "drop" ? null : "keep")}
              title="Keep in this store's assortment"
            >
              <CheckCircle2 size={10} aria-hidden="true" />
              Keep
            </button>
            <button
              type="button"
              className={`sc-kd-btn sc-kd-drop${decision === "drop" ? " active" : ""}`}
              onClick={() => onDecision(decision === "drop" ? null : "drop")}
              title="Drop from this store's assortment"
            >
              Drop
            </button>
          </div>
        ) : (
          /* Not carried — Add button */
          <button
            type="button"
            className={`sc-kd-btn sc-kd-add${decision === "add" ? " active" : ""}`}
            onClick={() => onDecision(decision === "add" ? null : "add")}
            title="Add to this store's assortment"
          >
            {decision === "add" ? (
              <><CheckCircle2 size={10} aria-hidden="true" /> Added</>
            ) : (
              <>+ Add</>
            )}
          </button>
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
      if (val === null || next[k] === val) delete next[k]; else next[k] = val;
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
              <Text variant="title" as="h1">Store Curation</Text>
              <Badge
                variant="subtle"
                size="small"
                color={user?.id === "store" ? "info" : "default"}
                label={user?.id === "store" ? "My Store View" : "All Stores"}
              />
            </div>
            <Text variant="caption" tone="muted">Add / Drop decisions per store · SS 2026 PLR live</Text>
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
/* ── Summary helpers ─────────────────────────────────────────────────────── */
const MANDATORY_COUNT = MANDATORY.length; /* = 5 */
const DEPT_COLORS = {
  "Wood":            { bg: "#FEF3C7", text: "#92400E", bar: "#D97706" },
  "Tile":            { bg: "#E6F7F4", text: "#0B7A6C", bar: "#0B7A6C" },
  "Laminate & Vinyl":{ bg: "#DBEAFE", text: "#1E40AF", bar: "#2563EB" },
};
const REGIONS_ORDER = ["South", "West", "East", "North", "Central", "Midwest"];

function sumStoreplan(storeId, decisions) {
  const clSet     = clusterLockedIds(storeId);
  const existing  = storeUniqueRows(storeId);
  const existIds  = new Set(existing.map((r) => r.sku));
  const existNonCore = existing.filter((r) => {
    const s = FD_SKUS.find((x) => x.sku === r.sku);
    return s && !isMandatory(s);
  });
  const clusterLocked = existNonCore.filter((r) =>  clSet.has(r.sku)).length;
  const existingFree  = existNonCore.filter((r) => !clSet.has(r.sku));

  const prefix = `${storeId}:`;
  const drops  = Object.entries(decisions).filter(([k, v]) => k.startsWith(prefix) && v === "drop").length;
  const adds   = Object.entries(decisions).filter(([k, v]) => k.startsWith(prefix) && v === "add").length;
  const priceEdits = Object.keys(decisions).filter((k) => k.startsWith(prefix) && decisions[k] === "price_edit").length;

  const keptFree = Math.max(0, existingFree.length - drops);
  const total    = MANDATORY_COUNT + clusterLocked + keptFree + adds;

  return { mandatory: MANDATORY_COUNT, clusterLocked, keptFree, adds, drops, total };
}

function SummaryRollup({ decisions, localPrices, deptFilter, viewToggle, onEdit, onOpenForm }) {
  /* ── Per-store plan computations ────────────────────────────────────────── */
  const storePlans = useMemo(() => {
    return FD_STORES.map((s) => ({ store: s, plan: sumStoreplan(s.id, decisions) }));
  }, [decisions]);

  /* ── Network-wide KPIs ───────────────────────────────────────────────────── */
  const kpi = useMemo(() => {
    const totalInPlan = storePlans.reduce((a, x) => a + x.plan.total, 0);
    const totalAdds   = storePlans.reduce((a, x) => a + x.plan.adds, 0);
    const totalDrops  = storePlans.reduce((a, x) => a + x.plan.drops, 0);
    const netChange   = totalAdds - totalDrops;
    const clusterSKUs = [...new Set(
      FD_STORES.flatMap((s) => [...clusterLockedIds(s.id)])
    )].length;
    const priceOverrides = Object.keys(localPrices).length;
    return { totalInPlan, totalAdds, totalDrops, netChange, clusterSKUs, priceOverrides };
  }, [storePlans, localPrices]);

  /* ── Dept breakdown across network ──────────────────────────────────────── */
  const deptBreakdown = useMemo(() => {
    const counts = {};
    FD_SKUS.forEach((s) => { counts[s.dept] = (counts[s.dept] || 0) + 1; });
    const max = Math.max(...Object.values(counts));
    return Object.entries(counts).map(([dept, count]) => ({ dept, count, pct: Math.round((count / max) * 100) }));
  }, []);

  /* ── Regions sorted ──────────────────────────────────────────────────────── */
  const regions = useMemo(() => {
    const rSet = [...new Set(FD_STORES.map((s) => s.region))];
    return rSet.sort((a, b) => {
      const ia = REGIONS_ORDER.indexOf(a), ib = REGIONS_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, []);

  /* ── Price-override lookup ───────────────────────────────────────────────── */
  const lpKey  = (sid, skuId) => `${sid}:${skuId}`;

  return (
    <div className="sc-sum-wrap">

      {/* ── Dark hero header ──────────────────────────────────────────────── */}
      <div className="sc-sum-hero">
        <div className="sc-sum-hero-left">
          <div className="sc-sum-hero-icon"><ShoppingBag size={20} /></div>
          <div>
            <div className="sc-sum-hero-title">Assortment Plan Summary</div>
            <div className="sc-sum-hero-sub">Built across National Core · Regional Review · Store Curation · {FD_STORES.length} stores</div>
          </div>
        </div>
        <div className="sc-sum-hero-right">
          {viewToggle}
          <button className="sc-sum-submit-btn" onClick={() => alert("Plan locked and submitted to OMS.")}>
            Validate &amp; Submit →
          </button>
        </div>
      </div>

      {/* ── KPI tiles ─────────────────────────────────────────────────────── */}
      <div className="sc-sum-kpis">
        <div className="sc-sum-kpi sc-sum-kpi--national">
          <div className="sc-sum-kpi-icon"><Lock size={15} /></div>
          <div className="sc-sum-kpi-num">16</div>
          <div className="sc-sum-kpi-label">National Core SKUs</div>
          <div className="sc-sum-kpi-sub">5 mandatory · 11 decided</div>
        </div>
        <div className="sc-sum-kpi sc-sum-kpi--cluster">
          <div className="sc-sum-kpi-icon"><Layers size={15} /></div>
          <div className="sc-sum-kpi-num">{kpi.clusterSKUs}</div>
          <div className="sc-sum-kpi-label">Cluster-Locked SKUs</div>
          <div className="sc-sum-kpi-sub">Set in Regional Review</div>
        </div>
        <div className="sc-sum-kpi sc-sum-kpi--adds">
          <div className="sc-sum-kpi-icon"><TrendingUp size={15} /></div>
          <div className="sc-sum-kpi-num">{kpi.totalAdds > 0 ? `+${kpi.totalAdds}` : "—"}</div>
          <div className="sc-sum-kpi-label">Store Adds</div>
          <div className="sc-sum-kpi-sub">New PLR picks added</div>
        </div>
        <div className={`sc-sum-kpi ${kpi.totalDrops > 0 ? "sc-sum-kpi--drops" : "sc-sum-kpi--neutral"}`}>
          <div className="sc-sum-kpi-icon"><Store size={15} /></div>
          <div className="sc-sum-kpi-num">{kpi.totalDrops > 0 ? `−${kpi.totalDrops}` : "—"}</div>
          <div className="sc-sum-kpi-label">Store Drops</div>
          <div className="sc-sum-kpi-sub">Existing items removed</div>
        </div>
        <div className="sc-sum-kpi sc-sum-kpi--overrides">
          <div className="sc-sum-kpi-num">{kpi.priceOverrides > 0 ? kpi.priceOverrides : "—"}</div>
          <div className="sc-sum-kpi-label">Price Overrides</div>
          <div className="sc-sum-kpi-sub">Local price edits</div>
        </div>
      </div>

      {/* ── Dept breakdown + Plan hierarchy ──────────────────────────────── */}
      <div className="sc-sum-mid">
        {/* Dept mix */}
        <div className="sc-sum-dept-panel">
          <div className="sc-sum-panel-head">
            <span className="sc-sum-panel-title">Department Mix</span>
            <span className="sc-sum-panel-sub">{FD_SKUS.length} total catalogue SKUs</span>
          </div>
          {deptBreakdown.map(({ dept, count, pct }) => {
            const dc = DEPT_COLORS[dept] || { bg: "#F2F2F2", text: "#444", bar: "#888" };
            return (
              <div key={dept} className="sc-sum-dept-row">
                <div className="sc-sum-dept-label" style={{ color: dc.text }}>{dept === "Laminate & Vinyl" ? "Lam & Vinyl" : dept}</div>
                <div className="sc-sum-dept-bar-track">
                  <div className="sc-sum-dept-bar-fill" style={{ width: `${pct}%`, background: dc.bar }} />
                </div>
                <div className="sc-sum-dept-count">{count}</div>
              </div>
            );
          })}
        </div>

        {/* Plan hierarchy */}
        <div className="sc-sum-hier-panel">
          <div className="sc-sum-panel-head">
            <span className="sc-sum-panel-title">Plan Hierarchy</span>
            <span className="sc-sum-panel-sub">How SKUs flow into the plan</span>
          </div>
          <div className="sc-sum-hier">
            <div className="sc-sum-hier-tier sc-sum-hier-tier--national">
              <div className="sc-sum-hier-tier-label">
                <Lock size={11} />
                <span>National Core</span>
              </div>
              <div className="sc-sum-hier-tier-count">16 SKUs</div>
              <div className="sc-sum-hier-tier-sub">All 21 stores · 5 mandatory + 11 decided</div>
            </div>
            <div className="sc-sum-hier-arrow">↓</div>
            <div className="sc-sum-hier-tier sc-sum-hier-tier--cluster">
              <div className="sc-sum-hier-tier-label">
                <Layers size={11} />
                <span>Cluster Assortment</span>
              </div>
              <div className="sc-sum-hier-tier-count">{kpi.clusterSKUs} unique SKUs</div>
              <div className="sc-sum-hier-tier-sub">Locked per cluster · set in Regional Review</div>
            </div>
            <div className="sc-sum-hier-arrow">↓</div>
            <div className="sc-sum-hier-tier sc-sum-hier-tier--store">
              <div className="sc-sum-hier-tier-label">
                <Store size={11} />
                <span>Store-Level Picks</span>
              </div>
              <div className="sc-sum-hier-tier-count">{kpi.totalAdds > 0 ? `+${kpi.totalAdds} adds` : "Existing only"}</div>
              <div className="sc-sum-hier-tier-sub">Localised per store · {kpi.totalDrops} drops applied</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Region / Store rollup table ───────────────────────────────────── */}
      {regions.map((region) => {
        const regionStores = FD_STORES.filter((s) => s.region === region);
        if (!regionStores.length) return null;
        return (
          <div key={region} className="sc-sum-region">
            <div className="sc-sum-region-head">
              <span className="sc-sum-region-name">{region}</span>
              <span className="sc-sum-region-meta">{regionStores.length} stores</span>
            </div>

            {/* Store table */}
            <div className="sc-sum-store-table">
              <div className="sc-sum-store-head">
                <div className="sc-sum-sth sc-sum-sth--store">Store</div>
                <div className="sc-sum-sth sc-sum-sth--num">Mandatory</div>
                <div className="sc-sum-sth sc-sum-sth--num">Cluster</div>
                <div className="sc-sum-sth sc-sum-sth--num">Existing</div>
                <div className="sc-sum-sth sc-sum-sth--num">+Adds</div>
                <div className="sc-sum-sth sc-sum-sth--num">−Drops</div>
                <div className="sc-sum-sth sc-sum-sth--total">Total</div>
                <div className="sc-sum-sth sc-sum-sth--action" />
              </div>

              {regionStores.map((s) => {
                const { mandatory, clusterLocked, keptFree, adds, drops, total } = sumStoreplan(s.id, decisions);
                const hasChanges = adds > 0 || drops > 0;
                return (
                  <div key={s.id} className={`sc-sum-store-row${hasChanges ? " has-changes" : ""}`}>
                    <div className="sc-sum-std sc-sum-std--store">
                      <div className="sc-sum-store-dot" />
                      <div>
                        <div className="sc-sum-store-name">{s.name}</div>
                        <div className="sc-sum-store-id">A-{s.id}</div>
                      </div>
                    </div>
                    <div className="sc-sum-std sc-sum-std--num">
                      <span className="sc-sum-pill sc-sum-pill--nat">{mandatory}</span>
                    </div>
                    <div className="sc-sum-std sc-sum-std--num">
                      <span className="sc-sum-pill sc-sum-pill--cl">{clusterLocked}</span>
                    </div>
                    <div className="sc-sum-std sc-sum-std--num">
                      <span className="sc-sum-pill sc-sum-pill--ex">{keptFree}</span>
                    </div>
                    <div className="sc-sum-std sc-sum-std--num">
                      {adds > 0
                        ? <span className="sc-sum-pill sc-sum-pill--add">+{adds}</span>
                        : <span className="sc-sum-muted">—</span>}
                    </div>
                    <div className="sc-sum-std sc-sum-std--num">
                      {drops > 0
                        ? <span className="sc-sum-pill sc-sum-pill--drop">−{drops}</span>
                        : <span className="sc-sum-muted">—</span>}
                    </div>
                    <div className="sc-sum-std sc-sum-std--total">
                      <span className="sc-sum-total-num">{total}</span>
                    </div>
                    <div className="sc-sum-std sc-sum-std--action">
                      <button className="sc-sum-edit-btn" onClick={() => onEdit(s.id)} title="Edit this store's plan">
                        Edit <ChevronRight size={11} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Region totals row */}
              <div className="sc-sum-store-row sc-sum-store-row--total">
                <div className="sc-sum-std sc-sum-std--store sc-sum-total-label">Region total</div>
                <div className="sc-sum-std sc-sum-std--num">{regionStores.reduce((a, s) => a + MANDATORY_COUNT, 0)}</div>
                <div className="sc-sum-std sc-sum-std--num">{regionStores.reduce((a, s) => a + sumStoreplan(s.id, decisions).clusterLocked, 0)}</div>
                <div className="sc-sum-std sc-sum-std--num">{regionStores.reduce((a, s) => a + sumStoreplan(s.id, decisions).keptFree, 0)}</div>
                <div className="sc-sum-std sc-sum-std--num">{regionStores.reduce((a, s) => a + sumStoreplan(s.id, decisions).adds, 0) || "—"}</div>
                <div className="sc-sum-std sc-sum-std--num">{regionStores.reduce((a, s) => a + sumStoreplan(s.id, decisions).drops, 0) || "—"}</div>
                <div className="sc-sum-std sc-sum-std--total sc-sum-total-num">{regionStores.reduce((a, s) => a + sumStoreplan(s.id, decisions).total, 0)}</div>
                <div className="sc-sum-std sc-sum-std--action" />
              </div>
            </div>
          </div>
        );
      })}

      {/* ── Submission footer ─────────────────────────────────────────────── */}
      <div className="sc-sum-footer">
        <div className="sc-sum-footer-stats">
          <span>{FD_STORES.length} stores</span>
          <span>·</span>
          <span>16 national SKUs</span>
          <span>·</span>
          <span>{kpi.totalAdds > 0 ? `${kpi.totalAdds} adds` : "No new adds"}</span>
          <span>·</span>
          <span>{kpi.totalDrops > 0 ? `${kpi.totalDrops} drops` : "No drops"}</span>
          {kpi.priceOverrides > 0 && <><span>·</span><span>{kpi.priceOverrides} price overrides</span></>}
        </div>
        <button className="sc-sum-submit-btn" onClick={() => alert("Plan locked and submitted to OMS.")}>
          Validate &amp; Submit plan →
        </button>
      </div>

    </div>
  );
}
