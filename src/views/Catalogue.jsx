/*
 * Catalogue screen — read-only reference fence of the locked FW 2025 superset.
 *
 * Per fd-assortment-v6.html this view is intentionally lean:
 *   • Active PLR Review banner (links to National Core / PLR Status)
 *   • "→ My Workspace" CTA in the header to kick off the agent run
 *   • Tier-strip: Core · Cluster · Store pick counts at a glance
 *   • Full SKU table with swatch, SKU ID, Market Intel signal badges,
 *     dept badge, tier pill, and a left-border accent coloured by tier
 *
 * The assortment plan (tier assignments) is driven by the agent that runs
 * in My Workspace and committed to agentStore.js.  Catalogue reads it on
 * every mount so it always shows the freshest plan without prop-drilling.
 */
import React, { useMemo, useState } from "react";
import { Card, Badge, Table, Button, FiltersStrip, FilterPanel } from "impact-ui";
import { Lock, Archive, MapPin, AlertTriangle, TrendingUp, Package, Layers, Star, CheckCircle } from "lucide-react";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import SkuMedia from "../components/SkuMedia.jsx";
import {
  CATALOGUE_SKUS, HARD_LOCKED_COUNT, STORE_PICK_COUNT,
  isNatLocked, isClusterAdd,
} from "../data/catalogue.js";
import { INTEL_SEED } from "../data/intel.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import { getAgentPlan } from "../data/agentStore.js";
import { panelSx, softSx } from "../styles/panelSx.js";
import "./Catalogue.css";

/* ── Constants ──────────────────────────────────────────────────────────── */
const TIER_META = {
  core:    { Icon: Lock,    label: "Core",       badge: "success", border: "var(--color-success)" },
  cluster: { Icon: Archive, label: "Cluster",    badge: "info",    border: "var(--color-teal)" },
  store:   { Icon: MapPin,  label: "Store pick", badge: "accent",  border: "transparent" },
};

const DEPT_BADGE = {
  "Wood":              "warning",
  "Tile":              "success",
  "Laminate & Vinyl":  "info",
};

const VEL_COLOR = { A: "success", B: "info", C: "warning", D: "error" };

/* Pre-compute the modal velocity for each catalogue SKU from assortment history */
const SKU_VELOCITY = (() => {
  const velMap = {};
  FD_ASSORTMENT.forEach((r) => {
    if (!velMap[r.sku]) velMap[r.sku] = {};
    velMap[r.sku][r.velocity] = (velMap[r.sku][r.velocity] || 0) + 1;
  });
  const result = {};
  Object.entries(velMap).forEach(([sku, counts]) => {
    result[sku] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  });
  return result;
})();

/* Map intel signals to the dept + subDept categories they cover */
function buildIntelMap() {
  const map = {};
  INTEL_SEED.forEach((sig) => {
    (sig.categories || []).forEach((cat) => {
      if (!map[cat]) map[cat] = [];
      map[cat].push({ title: sig.title, direction: sig.direction });
    });
  });
  return map;
}
const INTEL_BY_CAT = buildIntelMap();

function getSkuSignals(sku) {
  const key = `${sku.dept}${sku.subDept ? " \u2013 " + sku.subDept : ""}`;
  return (INTEL_BY_CAT[key] || []).slice(0, 2);
}

/* Active PLR plan mock — in production this would come from Workspace state */
const ACTIVE_PLR = {
  name: "FW 2025 — Tile (Agent Draft)",
  dept: "Tile",
  season: "FW 2025",
  updated: "Jun 10",
};

/* ── Catalogue ──────────────────────────────────────────────────────────── */
export default function Catalogue({ onNavigate }) {
  const plan = getAgentPlan(); // read latest plan from shared store
  const hasAgentRun = !!plan.agentRunAt;

  /* ── Filter state ─────────────────────────────────────────────────────── */
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("product");
  const [deptFilter, setDeptFilter] = useState([]);
  const [tierFilter, setTierFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);

  const DEPT_OPTIONS = ["Wood", "Tile", "Laminate & Vinyl"].map((d) => ({ value: d, label: d }));
  const TIER_OPTIONS = [
    { value: "core", label: "Core" },
    { value: "cluster", label: "Cluster Adds" },
    { value: "store", label: "Store Picks" },
  ];
  const STATUS_OPTIONS = [
    { value: "Active", label: "Active" },
    { value: "Dropped", label: "Dropped" },
  ];

  const clearFilters = () => { setDeptFilter([]); setTierFilter([]); setStatusFilter([]); };

  /* ── Applied filter tags for FiltersStrip ─────────────────────────────── */
  const filterTags = useMemo(() => {
    const tags = [];
    if (deptFilter.length)
      tags.push({ id: "dept", label: "Dept", values: deptFilter.map((d, i) => ({ id: i, label: d })) });
    if (tierFilter.length)
      tags.push({ id: "tier", label: "Tier", values: tierFilter.map((t, i) => ({ id: i, label: TIER_OPTIONS.find((o) => o.value === t)?.label || t })) });
    if (statusFilter.length)
      tags.push({ id: "status", label: "Status", values: statusFilter.map((s, i) => ({ id: i, label: s })) });
    return tags;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deptFilter, tierFilter, statusFilter]);

  /* Augment every SKU row with live tier + intel signals, then apply page-level filters */
  const allRows = useMemo(
    () =>
      CATALOGUE_SKUS.map((sku) => {
        const id = parseInt(sku.id, 10);
        const tier = isNatLocked(id, plan.natDecisions)
          ? "core"
          : isClusterAdd(sku.id, plan.clusterDecisions)
          ? "cluster"
          : sku.tier || "store";
        const velocity = SKU_VELOCITY[parseInt(sku.id, 10)] ?? null;
        return { ...sku, tier, intel: getSkuSignals(sku), velocity };
      }),
    // plan is a module-level object; re-compute only on mount (plan ref stable per session)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const rows = useMemo(() => {
    return allRows.filter((r) => {
      if (deptFilter.length && !deptFilter.includes(r.dept)) return false;
      if (tierFilter.length && !tierFilter.includes(r.tier)) return false;
      if (statusFilter.length && !statusFilter.includes(r.status)) return false;
      return true;
    });
  }, [allRows, deptFilter, tierFilter, statusFilter]);

  const coreCount    = rows.filter((r) => r.tier === "core").length;
  const clusterCount = rows.filter((r) => r.tier === "cluster").length;
  const storeCount   = rows.filter((r) => r.tier === "store").length;

  /* vs-last-season delta counts — derived from assortment history */
  const assortedSkuIds = useMemo(() => new Set(FD_ASSORTMENT.map((r) => r.sku)), []);
  const newCount     = useMemo(() => allRows.filter((r) => !assortedSkuIds.has(parseInt(r.id, 10))).length, [allRows, assortedSkuIds]);
  const carriedCount = useMemo(() => allRows.filter((r) =>  assortedSkuIds.has(parseInt(r.id, 10))).length, [allRows, assortedSkuIds]);
  const droppedCount = 4; // stub for demo

  /* Column definitions */
  const columns = useMemo(() => [
    {
      headerName: "Images",
      colId: "images",
      width: 92,
      minWidth: 92,
      maxWidth: 92,
      sortable: false,
      filter: false,
      resizable: false,
      suppressMenu: true,
      cellClass: "media-cell",
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
      cellRenderer: (p) => (
        <SkuMedia
          sku={{
            sku: p.data.id,
            desc: p.data.name,
            dept: p.data.dept,
            subDept: p.data.subDept,
            cls: p.data.cls,
            subCls: p.data.subCls,
            color: p.data.color,
            finish: p.data.finish,
            size: p.data.sizeSpec,
          }}
          size={40}
        />
      ),
    },
    {
      headerName: "SKU / Description",
      minWidth: 280,
      flex: 2,
      filter: "agTextColumnFilter",
      valueGetter: (p) => p.data.name,
      autoHeight: true,
      cellRenderer: (p) => {
        const signals = p.data.intel || [];
        return (
          <div className="cat-sku-cell">
            <div className="cat-sku-info">
              <span className="cat-sku-name">{p.data.name}</span>
              <span className="cat-sku-id">{p.data.id}</span>
              {signals.length > 0 && (
                <div className="cat-sku-signals">
                  {signals.map((sig, i) => (
                    <Badge
                      key={i}
                      variant="subtle"
                      size="small"
                      color={sig.direction === "opportunity" ? "success" : "error"}
                      isIcon
                      icon={sig.direction === "opportunity"
                        ? <TrendingUp size={10} aria-hidden="true" />
                        : <AlertTriangle size={10} aria-hidden="true" />}
                      label={sig.title.length > 32 ? sig.title.slice(0, 32) + "…" : sig.title}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      field: "dept",
      headerName: "Dept",
      width: 140,
      filter: "agSetColumnFilter",
      cellRenderer: (p) => (
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Badge variant="subtle" size="small" color={DEPT_BADGE[p.value] || "neutral"} label={p.value} />
        </div>
      ),
    },
    {
      field: "subDept",
      headerName: "Sub-Dept",
      minWidth: 150,
      flex: 1,
      filter: "agSetColumnFilter",
      cellStyle: () => ({
        fontSize: "var(--fs-micro)",
        color: "var(--color-text-muted)",
        display: "flex",
        alignItems: "center",
      }),
    },
    {
      field: "price",
      headerName: "Price",
      width: 90,
      filter: "agNumberColumnFilter",
      cellRenderer: (p) => (
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          <span style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: "var(--fs-micro)",
            fontWeight: "var(--fw-semibold)",
            color: "var(--color-text)",
          }}>
            ${Number(p.value).toFixed(2)}
          </span>
        </div>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      filter: "agSetColumnFilter",
      cellStyle: (p) => ({
        fontSize: "var(--fs-micro)",
        fontWeight: "var(--fw-semibold)",
        color: p.value === "Active" ? "var(--color-success)" : "var(--color-text-subtle)",
        display: "flex",
        alignItems: "center",
      }),
    },
    {
      field: "tier",
      headerName: "Tier",
      width: 130,
      filter: "agSetColumnFilter",
      cellRenderer: (p) => {
        const meta = TIER_META[p.value] || TIER_META.store;
        return (
          <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Badge variant="subtle" size="small" color={meta.badge} isIcon icon={<meta.Icon size={11} />} label={meta.label} />
          </div>
        );
      },
    },
    {
      field: "velocity",
      headerName: "Vel.",
      width: 80,
      filter: "agSetColumnFilter",
      cellRenderer: (p) => (
        <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
          {p.value
            ? <Badge variant="subtle" size="small" color={VEL_COLOR[p.value]} label={p.value} />
            : <span style={{ fontSize: "var(--fs-micro)", color: "var(--color-text-subtle)" }}>New</span>
          }
        </div>
      ),
    },
  ], []);

  /* Left-border per tier, matching HTML v6 row accent */
  const getRowStyle = (p) => {
    const border = TIER_META[p.data?.tier]?.border;
    return border && border !== "transparent"
      ? { borderLeft: `3px solid ${border}` }
      : { borderLeft: "3px solid transparent" };
  };

  /* ── FilterPanel tab config ───────────────────────────────────────────── */
  const filterPanelTabs = [
    {
      value: "product",
      title: "Product",
      icon: <Layers size={16} />,
      numberOfFilter: deptFilter.length,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect
            label="Department"
            isMulti
            isWithSearch
            value={deptFilter}
            options={DEPT_OPTIONS}
            onChange={setDeptFilter}
            width={320}
          />
        </Stack>
      ),
    },
    {
      value: "tier",
      title: "Tier",
      icon: <Star size={16} />,
      numberOfFilter: tierFilter.length,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect
            label="Tier"
            isMulti
            value={tierFilter}
            options={TIER_OPTIONS}
            onChange={setTierFilter}
            width={320}
          />
        </Stack>
      ),
    },
    {
      value: "status",
      title: "Status",
      icon: <CheckCircle size={16} />,
      numberOfFilter: statusFilter.length,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect
            label="Status"
            isMulti
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
            width={320}
          />
        </Stack>
      ),
    },
  ];

  return (
    <Stack direction="column" gap={4}>
      <Card size="small" sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Catalogue</Text>
            <Text variant="caption" tone="muted">FW 2025 · {CATALOGUE_SKUS.length} SKUs</Text>
          </Stack>
          <Stack direction="row" gap={2} align="center" wrap justify="flex-end">
            {hasAgentRun && (
              <Badge
                variant="subtle" color="success" size="small"
                label={`Agent applied · ${plan.agentRunAt?.includes(":") ? "Jun 10" : plan.agentRunAt}`}
              />
            )}
            <Button variant="primary" size="small" onClick={() => onNavigate?.("workspace")}>
              → Run Agent
            </Button>
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
        title="Catalogue Filters"
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
        onSecondaryButtonClick={() => { clearFilters(); }}
      />

      {/* ── Active PLR Review banner ────────────────────────────────────────── */}
      <Card size="small" sx={{ ...panelSx, borderLeft: "3px solid var(--color-success)" }}>
        <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="body-strong" tone="strong">{ACTIVE_PLR.name}</Text>
            <Text variant="micro" tone="muted">{ACTIVE_PLR.dept} · {ACTIVE_PLR.season} · {ACTIVE_PLR.updated}</Text>
          </Stack>
          <Stack direction="row" gap={2} align="center" wrap justify="flex-end">
            <Button variant="primary" size="small" onClick={() => onNavigate?.("national")}>
              National Core →
            </Button>
            <Button variant="secondary" size="small" onClick={() => onNavigate?.("approval")}>
              PLR Status →
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* ── Tier strip ─────────────────────────────────────────────────────── */}
      <Grid columns={4} gap={3}>
        {[
          { label: "National Core", n: coreCount,             Icon: Lock,    color: "var(--color-success)",   tone: "success" },
          { label: "Cluster Adds",  n: clusterCount,          Icon: Archive, color: "var(--color-teal)",      tone: "info" },
          { label: "Store Picks",   n: storeCount,            Icon: MapPin,  color: "var(--color-accent)",    tone: "default" },
          { label: "Total SKUs",    n: CATALOGUE_SKUS.length, Icon: Package, color: "var(--color-text-muted)", tone: "muted" },
        ].map((t) => (
          <Card size="small" key={t.label} sx={{ ...softSx, borderTop: `3px solid ${t.color}`, padding: "var(--sp-3) var(--sp-4)" }}>
            <Stack direction="column" gap={1}>
              <t.Icon size={18} aria-hidden="true" style={{ color: t.color }} />
              <Text variant="kpi" tone={t.tone}>{t.n}</Text>
              <Text variant="micro" tone="muted">{t.label}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      {/* ── vs last-season delta strip ─────────────────────────────────────── */}
      <Card size="small" sx={{ ...softSx, padding: "var(--sp-2) var(--sp-4)" }}>
        <Stack direction="row" gap={1} align="center" style={{ marginBottom: "var(--sp-1)" }}>
          <Star size={13} aria-hidden="true" style={{ color: "var(--color-text-subtle)" }} />
          <Text variant="overline" tone="subtle">vs last season</Text>
        </Stack>
        <Stack direction="row" gap={4} wrap>
          <Stack direction="row" gap={1} align="center">
            <CheckCircle size={13} aria-hidden="true" style={{ color: "var(--color-success)" }} />
            <Text variant="micro" tone="success" style={{ fontWeight: "var(--fw-semibold)" }}>+{newCount} new this season</Text>
          </Stack>
          <Text variant="micro" tone="muted">{carriedCount} carried over</Text>
          <Stack direction="row" gap={1} align="center">
            <Archive size={13} aria-hidden="true" style={{ color: "var(--color-error)" }} />
            <Text variant="micro" tone="error">−{droppedCount} dropped</Text>
          </Stack>
        </Stack>
      </Card>

      {/* ── SKU Table ──────────────────────────────────────────────────────── */}
      <Table
        cardContainer
        rowHeight={56}
        tableHeader=""
        columnDefs={columns}
        rowData={rows}
        domLayout="autoHeight"
        defaultColDef={{ floatingFilter: true }}
        hideTableSetting
        hideTableActions
        pagination={false}
        getRowStyle={getRowStyle}
      />
    </Stack>
  );
}
