import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, Tabs, Checkbox, Input } from "impact-ui";
import {
  LayoutDashboard, CalendarRange, SlidersHorizontal, Users,
  Plus, Trash2, ChevronLeft, Lock, Pencil, CheckCircle2, Tag, Package
} from "lucide-react";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import Stack from "../components/Stack.jsx";
import SkuSwatch from "../components/SkuSwatch.jsx";
import SkuMedia from "../components/SkuMedia.jsx";
import { color, deptColor } from "../styles/tokens.js";
import {
  PRODUCTS, LOCATIONS, LOC_ATTRS, CORE_BG_OPTS, STATUS_OPTS, BAND_PCT,
  ATTR_GROUPS, PRODUCTS_BY_DEPT,
  ADMIN_WEEKS, ADMIN_DEPT_OPTS, ADMIN_SEASON_OPTS, PHASE_COLORS, DEPT_COLORS,
  INITIAL_ASSORT_PERIODS, PLANNING_RULES, ADMIN_USERS,
} from "../data/admin.js";
import "./PlanningAdmin.css";
import { panelSx } from "../styles/panelSx.js";

const STATUS_COLOR = { Active: color.success, Discontinued: color.error, Pending: color.warning };
const VEL_COLOR = { A: color.success, B: color.info, C: color.warning, D: color.error, E: color.error };
const isLocked = (v) => v === "Core" || v === "BG";

const AP_STATUS = {
  active: { label: "Active", color: "success" },
  draft:  { label: "Draft",  color: "warning" },
  closed: { label: "Closed", color: "default" },
};

/* ── Helper: Banner callout ───────────────────────────────────────────────── */
function Banner({ tone, children }) {
  const bg = { error: "var(--color-error-soft)", accent: "var(--color-primary-soft)", teal: "var(--color-surface-alt)" }[tone] || "var(--color-surface-alt)";
  const bd = { error: "var(--color-error)", accent: "var(--color-primary)", teal: "var(--color-teal)" }[tone] || "var(--color-border)";
  return (
    <Stack direction="row" gap={2} align="flex-start" paddingX={3} paddingY={2}
      style={{ background: bg, border: `1px solid ${bd}`, borderLeft: `3px solid ${bd}`, borderRadius: "var(--r2)" }}
    >
      <Text variant="caption" tone="default" style={{ lineHeight: 1.5 }}>{children}</Text>
    </Stack>
  );
}

/* ── Helper: Phase timeline bar ───────────────────────────────────────────── */
function PhaseBar({ phases = [], totalWeeks = 26 }) {
  if (!phases.length) return null;
  return (
    <div className="pa-phase-bar">
      {phases.map((ph) => {
        const sw = parseInt(ph.startWeek.replace("W", ""), 10) - 1;
        const ew = parseInt(ph.endWeek.replace("W", ""), 10);
        const pct = Math.max(2, Math.round(((ew - sw) / totalWeeks) * 100));
        return (
          <div key={ph.id} className="pa-phase-bar-seg"
            style={{ width: `${pct}%`, background: ph.color }}
            title={`${ph.name} (${ph.startWeek}–${ph.endWeek})`}
          >
            {pct > 14 && <span>{ph.name}</span>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Helper: Small form label ─────────────────────────────────────────────── */
function FieldLabel({ children }) {
  return (
    <div style={{
      fontSize: "var(--fs-micro)", fontWeight: "var(--fw-semibold)",
      textTransform: "uppercase", letterSpacing: "var(--tracking-wide)",
      color: "var(--color-text-muted)", marginBottom: "var(--sp-2)"
    }}>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
export default function PlanningAdmin() {
  /* ── Section / view state ─────────────────────────────────────────────── */
  const [section, setSection] = useState("planning");

  /* ── Planning Admin sub-tab ───────────────────────────────────────────── */
  const [tab, setTab] = useState(0);
  const [prodAttrs, setProdAttrs] = useState({});
  const [locAttrs, setLocAttrs] = useState({});
  const [exSearch, setExSearch] = useState("");
  const [exView, setExView] = useState("attr-store");
  const [attrStore, setAttrStore] = useState({});
  const [itemStore, setItemStore] = useState({});
  const [collapsed, setCollapsed] = useState(() => {
    const c = {};
    ATTR_GROUPS.forEach((g, i) => { c[`ag_${g.key}`] = i !== 0; });
    Object.keys(PRODUCTS_BY_DEPT).forEach((d, i) => { c[`dept_${d}`] = i !== 0; });
    return c;
  });

  /* ── Assortment Periods state ─────────────────────────────────────────── */
  const [assortPeriods, setAssortPeriods] = useState(INITIAL_ASSORT_PERIODS);
  const [apView, setApView] = useState("list");
  const [apDraft, setApDraft] = useState(null);

  /* ── Scope wizard ─────────────────────────────────────────────────────── */
  const [scopeConfirmed, setScopeConfirmed] = useState(() => {
    try { return localStorage.getItem("pa_scope_confirmed") === "1"; } catch { return false; }
  });
  const [scopeStep, setScopeStep] = useState(0);
  const [scopeDepts, setScopeDepts] = useState(["Wood", "Tile", "Laminate & Vinyl"]);
  const [scopeChannels, setScopeChannels] = useState(["All Stores"]);
  const SCOPE_DEPT_OPTS = ["Wood", "Tile", "Laminate & Vinyl", "Natural Stone", "Accessories"];
  const SCOPE_CHANNEL_OPTS = ["All Stores", "Domestic Only", "High-volume only", "Southeast cluster"];
  const SCOPE_STEPS = ["Departments", "Channels", "Calendar"];
  const confirmScope = () => {
    try { localStorage.setItem("pa_scope_confirmed", "1"); } catch {}
    setScopeConfirmed(true);
  };

  /* ─────────────── PRODUCTS panel ─────────────────────────────────────── */
  const productRows = useMemo(
    () => PRODUCTS.map((p) => {
      const ov = prodAttrs[p.sku] || {};
      const coreBG = ov.coreBG !== undefined ? ov.coreBG : p.defCoreBG;
      const status = ov.status !== undefined ? ov.status : p.defStatus;
      const _ov = (ov.coreBG !== undefined && ov.coreBG !== p.defCoreBG) || (ov.status !== undefined && ov.status !== p.defStatus);
      return { ...p, coreBG, status, _ov };
    }),
    [prodAttrs]
  );
  const prodOvCount = productRows.filter((r) => r._ov).length;

  const onProdCellChanged = (e) => {
    const field = e.colDef.field;
    if (field !== "coreBG" && field !== "status") return;
    setProdAttrs((prev) => ({ ...prev, [e.data.sku]: { ...prev[e.data.sku], [field]: e.newValue } }));
  };

  const productColumns = useMemo(() => [
    { headerName: "Image", colId: "image", width: 72, minWidth: 72, maxWidth: 72,
      suppressSizeToFit: true, sortable: false, filter: false, pinned: "left",
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
      cellRenderer: (p) => <SkuMedia sku={p.data} size={40} />,
    },
    { field: "sku", headerName: "SKU", width: 156, pinned: "left", filter: "agTextColumnFilter",
      cellStyle: (p) => ({ fontFamily: "var(--font-mono)", color: color.teal, fontWeight: 700, borderLeft: `3px solid ${p.data._ov ? color.teal : "transparent"}` }),
      cellRenderer: (p) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
          <span>{p.value}</span>
        </div>
      ),
    },
    { field: "vsn", headerName: "VSN", width: 120, filter: "agTextColumnFilter" },
    { field: "dept", headerName: "Department", width: 140, filter: "agSetColumnFilter", cellStyle: (p) => ({ color: deptColor[p.value] || color.accent, fontWeight: 600 }) },
    { field: "subDept", headerName: "Sub-Dept", width: 170, filter: "agSetColumnFilter" },
    { field: "cls", headerName: "Class", width: 130, filter: "agSetColumnFilter" },
    { field: "desc", headerName: "Description", minWidth: 220, flex: 1, filter: "agTextColumnFilter" },
    { field: "color", headerName: "Color", width: 110 },
    { field: "finish", headerName: "Finish", width: 120 },
    { field: "size", headerName: "Size", width: 110 },
    { field: "price", headerName: "$/sqft", width: 90, valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
    { field: "coreBG", headerName: "Core / BG", width: 130,
      editable: (p) => !isLocked(p.value),
      cellEditor: "agSelectCellEditor", cellEditorParams: { values: CORE_BG_OPTS },
      valueFormatter: (p) => (isLocked(p.value) ? `${p.value} (locked)` : p.value || "—"),
      cellStyle: (p) => ({ color: isLocked(p.value) ? color.success : color.text, fontWeight: isLocked(p.value) ? 700 : 400 }),
    },
    { field: "status", headerName: "Status", width: 130,
      editable: true, cellEditor: "agSelectCellEditor", cellEditorParams: { values: STATUS_OPTS },
      cellStyle: (p) => ({ color: STATUS_COLOR[p.value] || color.text, fontWeight: 700 }),
    },
    { field: "attrs", headerName: "Key Attributes", minWidth: 200, flex: 1 },
  ], []);

  const productsPanel = (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
        <Stack direction="column" gap={0}>
          <Text variant="body-strong" tone="strong">Product Attributes</Text>
          <Text variant="micro" tone="subtle">{PRODUCTS.length} SKUs · Core/BG Tag and Status are editable</Text>
        </Stack>
        <Stack direction="row" gap={2} align="center">
          {prodOvCount ? <Badge variant="subtle" size="small" color="success" label={`${prodOvCount} overridden`} /> : null}
          {prodOvCount ? <Button variant="secondary" size="small" onClick={() => setProdAttrs({})}>Reset</Button> : null}
        </Stack>
      </Stack>
      <Table defaultColDef={{ floatingFilter: true }} cardContainer rowHeight="compact" tableHeader="Product master" columnDefs={productColumns} rowData={productRows} domLayout="autoHeight" hideTableSetting hideTableActions pagination={false} onCellValueChanged={onProdCellChanged} stopEditingWhenCellsLoseFocus />
      <Text variant="micro" tone="subtle">{PRODUCTS.length} SKUs · {prodOvCount} attributes overridden · source: FD_SKUS catalogue data</Text>
    </Stack>
  );

  /* ─────────────── LOCATIONS panel ────────────────────────────────────── */
  const locationRows = useMemo(
    () => LOCATIONS.map((l) => {
      const ov = locAttrs[l.id] || {};
      const eff = {};
      let changed = false;
      LOC_ATTRS.forEach((a) => {
        eff[a.key] = ov[a.key] !== undefined ? ov[a.key] : l.defaults[a.key];
        if (ov[a.key] !== undefined && ov[a.key] !== l.defaults[a.key]) changed = true;
      });
      return { id: l.id, name: l.name, region: l.region, market: l.market, state: l.state, dc: l.dc, velocity: l.velocity, bandPct: BAND_PCT[l.velocity] || "—", ...eff, _ov: changed };
    }),
    [locAttrs]
  );
  const locOvCount = locationRows.filter((r) => r._ov).length;

  const onLocCellChanged = (e) => {
    const field = e.colDef.field;
    if (!LOC_ATTRS.some((a) => a.key === field)) return;
    setLocAttrs((prev) => ({ ...prev, [e.data.id]: { ...prev[e.data.id], [field]: e.newValue } }));
  };

  const locationColumns = useMemo(() => [
    { field: "id", headerName: "Store #", width: 110, pinned: "left", filter: "agTextColumnFilter",
      cellStyle: (p) => ({ fontFamily: "var(--font-mono)", color: color.teal, fontWeight: 700, borderLeft: `3px solid ${p.data._ov ? color.teal : "transparent"}` }) },
    { field: "name", headerName: "Store Name", minWidth: 170, flex: 1 },
    { field: "region", headerName: "Region", width: 140 },
    { field: "market", headerName: "Market", width: 130 },
    { field: "velocity", headerName: "Velocity", width: 100, cellStyle: (p) => ({ color: VEL_COLOR[p.value] || color.text, fontWeight: 700 }) },
    { field: "bandPct", headerName: "Band %", width: 90 },
    ...LOC_ATTRS.map((a) => ({
      field: a.key, headerName: a.label, width: 150, editable: true,
      cellEditor: "agSelectCellEditor", cellEditorParams: { values: a.opts },
      cellStyle: (p) => {
        const def = LOCATIONS.find((l) => l.id === p.data.id)?.defaults[a.key];
        return { color: p.value !== def ? color.teal : color.textMuted, fontWeight: p.value !== def ? 700 : 400 };
      },
    })),
  ], []);

  const locationsPanel = (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
        <Stack direction="column" gap={0}>
          <Text variant="body-strong" tone="strong">Location Attributes</Text>
          <Text variant="micro" tone="subtle">{LOCATIONS.length} stores · Defaults from cluster — edit cells to override</Text>
        </Stack>
        <Stack direction="row" gap={2} align="center">
          {locOvCount ? <Badge variant="subtle" size="small" color="success" label={`${locOvCount} overridden`} /> : null}
          {locOvCount ? <Button variant="secondary" size="small" onClick={() => setLocAttrs({})}>Reset all</Button> : null}
        </Stack>
      </Stack>
      <Table defaultColDef={{ floatingFilter: true }} cardContainer rowHeight="compact" tableHeader="Store master" columnDefs={locationColumns} rowData={locationRows} domLayout="autoHeight" hideTableSetting hideTableActions pagination={false} onCellValueChanged={onLocCellChanged} stopEditingWhenCellsLoseFocus />
      <Text variant="micro" tone="subtle">{LOCATIONS.length} stores · {locOvCount} edited · synced from ERP / Store Master</Text>
    </Stack>
  );

  /* ─────────────── EXCEPTIONS panel ───────────────────────────────────── */
  const toggleGroup = (k) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));
  const toggleAttr = (key) => setAttrStore((p) => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n; });
  const toggleItem = (key) => setItemStore((p) => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n; });
  const attrCount = Object.keys(attrStore).length;
  const itemCount = Object.keys(itemStore).length;

  const StoreHead = () => (
    <div className="pa-matrix-row is-head">
      <div className="pa-cell-label">
        <Text variant="micro" tone="muted" style={{ fontWeight: 700 }}>{exView === "attr-store" ? "Attribute value" : "Product / SKU"}</Text>
      </div>
      {LOCATIONS.map((l) => (
        <div key={l.id} className="pa-cell-store">
          <Stack direction="column" align="center" gap={0}>
            <Text variant="micro" tone="subtle">{l.id}</Text>
            <Text variant="micro" tone="muted" truncate style={{ maxWidth: 68, textAlign: "center" }}>{l.name.replace(/^\d+\s/, "")}</Text>
          </Stack>
        </div>
      ))}
    </div>
  );

  const exceptionsPanel = (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
        <Stack direction="column" gap={1}>
          <Text variant="body-strong" tone="strong">Global Exceptions</Text>
          <Text variant="micro" tone="subtle">Define exceptions by product attribute or by individual SKU, per store.</Text>
        </Stack>
        <Stack direction="row" gap={2} align="center" wrap>
          <Input id="ex-search" name="ex-search"
            placeholder={exView === "attr-store" ? "Search attribute values…" : "Search SKU or description…"}
            value={exSearch} onChange={(e) => setExSearch(e.target.value)} size="medium"
          />
          <button className={`pa-ex-toggle${exView === "attr-store" ? " is-active" : ""}`} onClick={() => { setExView("attr-store"); setExSearch(""); }}>
            <Tag size={13} /> Attribute × Store
          </button>
          <button className={`pa-ex-toggle${exView === "item-store" ? " is-active" : ""}`} onClick={() => { setExView("item-store"); setExSearch(""); }}>
            <Package size={13} /> Item × Store
          </button>
        </Stack>
      </Stack>

      {exView === "attr-store" ? (
        <>
          <Banner tone="error"><strong>Product Attribute × Store</strong> — check a cell to flag that attribute value as an exception for that store.</Banner>
          {ATTR_GROUPS.map((g) => {
            const open = !collapsed[`ag_${g.key}`];
            const groupChecked = g.values.reduce((sum, v) => sum + LOCATIONS.filter((l) => attrStore[`${g.key}|${v}|${l.id}`]).length, 0);
            const visibleValues = exSearch.trim() ? g.values.filter((v) => v.toLowerCase().includes(exSearch.trim().toLowerCase())) : g.values;
            if (!visibleValues.length) return null;
            return (
              <Stack key={g.key} direction="column" gap={2}>
                <button className="pa-group-btn" onClick={() => toggleGroup(`ag_${g.key}`)}>
                  <Text variant="caption" tone="subtle">{open ? "▾" : "▸"}</Text>
                  <Text variant="caption" tone="strong">{g.label}</Text>
                  {groupChecked > 0 ? <Badge variant="subtle" size="small" color="error" label={String(groupChecked)} /> : null}
                </button>
                {(open || exSearch.trim()) ? (
                  <div className="pa-matrix">
                    <StoreHead />
                    {visibleValues.map((v) => (
                      <div key={v} className="pa-matrix-row">
                        <div className="pa-cell-label"><Text variant="micro" tone="error">{v}</Text></div>
                        {LOCATIONS.map((l) => {
                          const k = `${g.key}|${v}|${l.id}`;
                          return (
                            <div key={l.id} className="pa-cell-store">
                              <Checkbox withoutFormLabel checked={!!attrStore[k]} onChange={() => toggleAttr(k)} />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Stack>
            );
          })}
          <Stack direction="row" gap={3} align="center">
            <Text variant="micro" tone="subtle">{attrCount} exception{attrCount !== 1 ? "s" : ""} defined across {LOCATIONS.length} stores</Text>
            {attrCount ? <Button variant="text" size="small" onClick={() => setAttrStore({})}>Clear all</Button> : null}
          </Stack>
        </>
      ) : (
        <>
          <Banner tone="accent"><strong>Item × Store</strong> — check a cell to flag a specific SKU as an exception for that store.</Banner>
          {Object.keys(PRODUCTS_BY_DEPT).map((dept) => {
            const open = !collapsed[`dept_${dept}`];
            const prods = PRODUCTS_BY_DEPT[dept];
            const visibleProds = exSearch.trim() ? prods.filter((p) => p.desc.toLowerCase().includes(exSearch.trim().toLowerCase()) || String(p.sku).includes(exSearch.trim())) : prods;
            if (!visibleProds.length) return null;
            const deptChecked = prods.reduce((sum, p) => sum + LOCATIONS.filter((l) => itemStore[`${p.sku}|${l.id}`]).length, 0);
            return (
              <Stack key={dept} direction="column" gap={2}>
                <button className="pa-group-btn" onClick={() => toggleGroup(`dept_${dept}`)}>
                  <Text variant="caption" tone="subtle">{open ? "▾" : "▸"}</Text>
                  <Text variant="caption" tone="strong">{dept}</Text>
                  {deptChecked > 0 ? <Badge variant="subtle" size="small" color="info" label={String(deptChecked)} /> : null}
                </button>
                {(open || exSearch.trim()) ? (
                  <div className="pa-matrix">
                    <StoreHead />
                    {visibleProds.map((p) => (
                      <div key={p.sku} className="pa-matrix-row">
                        <div className="pa-cell-label">
                          <Stack direction="row" align="center" gap={2} style={{ minWidth: 0 }}>
                            <SkuSwatch sku={p} size={22} />
                            <Stack direction="column" gap={0} style={{ minWidth: 0 }}>
                              <Text variant="micro" tone="default" truncate style={{ maxWidth: 176 }}>{p.desc}</Text>
                              <Text variant="micro" tone="subtle" mono>{p.sku}</Text>
                            </Stack>
                          </Stack>
                        </div>
                        {LOCATIONS.map((l) => {
                          const k = `${p.sku}|${l.id}`;
                          return (
                            <div key={l.id} className="pa-cell-store">
                              <Checkbox withoutFormLabel checked={!!itemStore[k]} onChange={() => toggleItem(k)} />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Stack>
            );
          })}
          <Stack direction="row" gap={3} align="center">
            <Text variant="micro" tone="subtle">{itemCount} exception{itemCount !== 1 ? "s" : ""} defined across {LOCATIONS.length} stores</Text>
            {itemCount ? <Button variant="text" size="small" onClick={() => setItemStore({})}>Clear all</Button> : null}
          </Stack>
        </>
      )}
    </Stack>
  );

  const TAB_NAMES = [
    { value: 0, label: "Products" },
    { value: 1, label: "Location Attributes" },
    { value: 2, label: "Global Exceptions" },
  ];

  /* ─────────────── ASSORTMENT PERIODS section ──────────────────────────── */
  const activePds = assortPeriods.filter((p) => p.status === "active").length;
  const draftPds  = assortPeriods.filter((p) => p.status === "draft").length;
  const seasons   = [...new Set(assortPeriods.map((p) => p.season))].length;

  const startCreatePeriod = () => {
    setApDraft({
      id: null, dept: "Wood", season: "SS 2026",
      startWeek: "W01", endWeek: "W26",
      presDate: "", dueDate: "", status: "draft",
      phases: [
        { id: "ph1", name: "Pre-Season", startWeek: "W01", endWeek: "W04", color: "#2563EB" },
        { id: "ph2", name: "Core",       startWeek: "W05", endWeek: "W16", color: "#059669" },
      ],
    });
    setApView("create");
  };

  const startEditPeriod = (ap) => {
    setApDraft(JSON.parse(JSON.stringify(ap)));
    setApView("edit");
  };

  const deletePeriod = (id) => setAssortPeriods((prev) => prev.filter((p) => p.id !== id));

  const savePeriod = () => {
    if (!apDraft?.dept || !apDraft?.season) return;
    const toSave = { ...apDraft, id: apDraft.id || `ap-${Date.now()}` };
    setAssortPeriods((prev) => {
      const idx = prev.findIndex((p) => p.id === toSave.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = toSave; return n; }
      return [...prev, toSave];
    });
    setApView("list");
    setApDraft(null);
  };

  const patchDraft = (fields) => setApDraft((p) => ({ ...p, ...fields }));

  const addPhase = () => {
    const phases = apDraft.phases || [];
    const colIdx = phases.length % PHASE_COLORS.length;
    patchDraft({ phases: [...phases, { id: `ph-${Date.now()}`, name: "New Phase", startWeek: apDraft.startWeek || "W01", endWeek: apDraft.endWeek || "W26", color: PHASE_COLORS[colIdx] }] });
  };

  const updatePhase = (pi, field, val) => {
    const phases = [...(apDraft.phases || [])];
    phases[pi] = { ...phases[pi], [field]: val };
    patchDraft({ phases });
  };

  const cyclePhaseColor = (pi) => {
    const phases = [...(apDraft.phases || [])];
    const ci = PHASE_COLORS.indexOf(phases[pi].color);
    phases[pi] = { ...phases[pi], color: PHASE_COLORS[(ci + 1) % PHASE_COLORS.length] };
    patchDraft({ phases });
  };

  const removePhase = (pi) => {
    const phases = [...(apDraft.phases || [])];
    phases.splice(pi, 1);
    patchDraft({ phases });
  };

  const draftTotalWeeks = apDraft
    ? Math.max(1, parseInt((apDraft.endWeek || "W26").replace("W", ""), 10) - parseInt((apDraft.startWeek || "W01").replace("W", ""), 10) + 1)
    : 26;

  const weekOptions = ADMIN_WEEKS.map((w) => ({ value: w, label: w }));

  /* Assortment periods – list view */
  const periodsListView = (
    <Stack direction="column" gap={0}>
      {/* Dark header */}
      <div className="pa-dark-hd">
        <Stack direction="row" justify="space-between" align="center">
          <Stack direction="column" gap={1}>
            <div className="pa-dark-hd-title">Assortment Periods</div>
            <div className="pa-dark-hd-sub">Create and manage assortment periods by department · Define start/end weeks · Set sub-season phases</div>
          </Stack>
          <Button variant="primary" size="medium" onClick={startCreatePeriod}>
            <Plus size={14} style={{ marginRight: 4 }} />New Period
          </Button>
        </Stack>
      </div>

      {/* KPI strip */}
      <div className="pa-kpi-strip">
        {[
          { v: assortPeriods.length, l: "Total periods", c: "var(--color-text-strong)" },
          { v: activePds,            l: "Active",         c: "var(--color-success)" },
          { v: draftPds,             l: "Draft",          c: "var(--color-warning)" },
          { v: seasons,              l: "Seasons",        c: "var(--color-primary)" },
        ].map((m, i) => (
          <div key={m.l} className="pa-kpi-cell" style={{ borderRight: i < 3 ? "1px solid var(--color-border)" : "none" }}>
            <div className="pa-kpi-num" style={{ color: m.c }}>{m.v}</div>
            <div className="pa-kpi-label">{m.l}</div>
          </div>
        ))}
      </div>

      {/* Period cards */}
      <div style={{ padding: "var(--sp-4)" }}>
        {assortPeriods.length === 0 ? (
          <Stack direction="column" align="center" gap={3} paddingY={8}>
            <Text variant="heading" tone="muted">No assortment periods defined</Text>
            <Button variant="primary" size="medium" onClick={startCreatePeriod}>+ New Period</Button>
          </Stack>
        ) : (
          <Stack direction="column" gap={3}>
            {assortPeriods.map((ap) => {
              const dc = DEPT_COLORS[ap.dept] || { color: color.textMuted, bg: color.surfaceAlt };
              const sc = AP_STATUS[ap.status] || AP_STATUS.draft;
              const totalWeeks = parseInt((ap.endWeek || "W26").replace("W", ""), 10) - parseInt((ap.startWeek || "W01").replace("W", ""), 10) + 1;
              return (
                <div key={ap.id} className="pa-period-card" style={{ borderLeftColor: dc.color }}>
                  <div className="pa-period-hd">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" gap={2} align="center" wrap style={{ marginBottom: "var(--sp-1)" }}>
                        <span className="pa-dept-pill" style={{ background: dc.bg, color: dc.color }}>{ap.dept}</span>
                        <Text variant="body-strong" tone="strong">{ap.season}</Text>
                        <Badge variant="subtle" size="small" color={sc.color} label={sc.label} />
                      </Stack>
                      <Text variant="micro" tone="subtle">
                        {ap.startWeek} → {ap.endWeek} · {totalWeeks} weeks
                        {ap.presDate ? ` · PLR Pres: ${ap.presDate}` : ""}
                        {ap.dueDate  ? ` · Due: ${ap.dueDate}` : ""}
                      </Text>
                    </div>
                    <Stack direction="row" gap={2} align="center">
                      <Button variant="secondary" size="small" onClick={() => startEditPeriod(ap)}>
                        <Pencil size={12} style={{ marginRight: 4 }} />Edit
                      </Button>
                      <button className="pa-del-btn" onClick={() => deletePeriod(ap.id)} title="Delete period">
                        <Trash2 size={14} />
                      </button>
                    </Stack>
                  </div>
                  <div className="pa-period-body">
                    <PhaseBar phases={ap.phases || []} totalWeeks={totalWeeks} />
                    <div className="pa-phase-pills">
                      {(ap.phases || []).map((ph) => (
                        <span key={ph.id} className="pa-phase-pill" style={{ background: `${ph.color}18`, color: ph.color }}>
                          {ph.name} ({ph.startWeek}–{ph.endWeek})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </Stack>
        )}
      </div>
    </Stack>
  );

  /* Assortment periods – create/edit form */
  const periodsFormView = (
    <Stack direction="column" gap={0}>
      {/* Dark header */}
      <div className="pa-dark-hd">
        <Stack direction="row" align="center" gap={3}>
          <button className="pa-back-btn" onClick={() => { setApView("list"); setApDraft(null); }}>
            <ChevronLeft size={14} />Back
          </button>
          <Stack direction="column" gap={0}>
            <div className="pa-dark-hd-title">{apDraft?.id ? "Edit Assortment Period" : "New Assortment Period"}</div>
            <div className="pa-dark-hd-sub">Define department, week range, PLR dates, and sub-season phases</div>
          </Stack>
        </Stack>
      </div>

      <div style={{ padding: "var(--sp-4)" }}>
        <Stack direction="column" gap={3}>
          {/* Section 1: Period definition */}
          <Card sx={{ ...panelSx, overflow: "visible" }}>
            <Stack direction="column" gap={3}>
              <Text variant="body-strong" tone="strong">Period definition</Text>
              <div className="pa-form-grid pa-form-grid--3">
                <div>
                  <FieldLabel>Department</FieldLabel>
                  <FdSelect value={apDraft?.dept || "Wood"} options={ADMIN_DEPT_OPTS.map((d) => ({ value: d, label: d }))} onChange={(v) => patchDraft({ dept: v })} width="100%" />
                </div>
                <div>
                  <FieldLabel>Season</FieldLabel>
                  <FdSelect value={apDraft?.season || "SS 2026"} options={ADMIN_SEASON_OPTS.map((s) => ({ value: s, label: s }))} onChange={(v) => patchDraft({ season: v })} width="100%" />
                </div>
                <div>
                  <FieldLabel>Status</FieldLabel>
                  <FdSelect value={apDraft?.status || "draft"}
                    options={[{ value: "active", label: "Active" }, { value: "draft", label: "Draft" }, { value: "closed", label: "Closed" }]}
                    onChange={(v) => patchDraft({ status: v })} width="100%" />
                </div>
              </div>
            </Stack>
          </Card>

          {/* Section 2: Week range & PLR dates */}
          <Card sx={{ ...panelSx, overflow: "visible" }}>
            <Stack direction="column" gap={3}>
              <Text variant="body-strong" tone="strong">Week range &amp; PLR dates</Text>
              <div className="pa-form-grid pa-form-grid--4">
                <div>
                  <FieldLabel>Start Week</FieldLabel>
                  <FdSelect value={apDraft?.startWeek || "W01"} options={weekOptions} onChange={(v) => patchDraft({ startWeek: v })} width="100%" />
                </div>
                <div>
                  <FieldLabel>End Week</FieldLabel>
                  <FdSelect value={apDraft?.endWeek || "W26"} options={weekOptions} onChange={(v) => patchDraft({ endWeek: v })} width="100%" />
                </div>
                <div>
                  <FieldLabel>PLR Pres Date</FieldLabel>
                  <Input type="date" value={apDraft?.presDate || ""} onChange={(e) => patchDraft({ presDate: e.target.value })} fullWidth />
                </div>
                <div>
                  <FieldLabel>PLR Due Date</FieldLabel>
                  <Input type="date" value={apDraft?.dueDate || ""} onChange={(e) => patchDraft({ dueDate: e.target.value })} fullWidth />
                </div>
              </div>
              <Text variant="micro" tone="subtle">
                Total: <strong>{draftTotalWeeks} weeks</strong> · {apDraft?.startWeek || "W01"} → {apDraft?.endWeek || "W26"}
              </Text>
            </Stack>
          </Card>

          {/* Section 3: Sub-season phases */}
          <Card sx={panelSx}>
            <Stack direction="column" gap={3}>
              <Stack direction="row" justify="space-between" align="center">
                <Stack direction="column" gap={0}>
                  <Text variant="body-strong" tone="strong">Sub-season phases</Text>
                  <Text variant="micro" tone="subtle">Optional — divide the period into phases (e.g. Pre-Season, Core, Clearance)</Text>
                </Stack>
                <Button variant="secondary" size="small" onClick={addPhase}>
                  <Plus size={12} style={{ marginRight: 4 }} />Add Phase
                </Button>
              </Stack>

              {/* Phase bar preview */}
              {(apDraft?.phases || []).length > 0 && (
                <PhaseBar phases={apDraft?.phases || []} totalWeeks={draftTotalWeeks} />
              )}

              {/* Phase rows */}
              {(apDraft?.phases || []).length === 0 ? (
                <Stack align="center" paddingY={4}>
                  <Text variant="caption" tone="subtle">No phases defined — click "+ Add Phase" to divide this period</Text>
                </Stack>
              ) : (
                <Stack direction="column" gap={1}>
                  {(apDraft?.phases || []).map((ph, pi) => (
                    <div key={ph.id} className="pa-phase-row" style={{ borderLeftColor: ph.color }}>
                      <input
                        className="pa-phase-name-input"
                        value={ph.name}
                        placeholder="Phase name"
                        onChange={(e) => updatePhase(pi, "name", e.target.value)}
                      />
                      <select className="pa-phase-week-sel" value={ph.startWeek} onChange={(e) => updatePhase(pi, "startWeek", e.target.value)}>
                        {ADMIN_WEEKS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <select className="pa-phase-week-sel" value={ph.endWeek} onChange={(e) => updatePhase(pi, "endWeek", e.target.value)}>
                        {ADMIN_WEEKS.map((w) => <option key={w} value={w}>{w}</option>)}
                      </select>
                      <button className="pa-phase-color-dot" style={{ background: ph.color }} onClick={() => cyclePhaseColor(pi)} title="Click to change colour" />
                      <button className="pa-phase-del" onClick={() => removePhase(pi)} title="Remove phase"><Trash2 size={13} /></button>
                    </div>
                  ))}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Save/Cancel */}
          <Stack direction="row" justify="flex-end" gap={2}>
            <Button variant="secondary" size="medium" onClick={() => { setApView("list"); setApDraft(null); }}>Cancel</Button>
            <Button variant="primary" size="medium" onClick={savePeriod}>
              <CheckCircle2 size={14} style={{ marginRight: 4 }} />
              {apDraft?.id ? "Save Changes" : "Create Period"}
            </Button>
          </Stack>
        </Stack>
      </div>
    </Stack>
  );

  /* ─────────────── PLANNING RULES section ─────────────────────────────── */
  const planningRulesSection = (
    <Stack direction="column" gap={3}>
      <Card sx={panelSx}>
        <Stack direction="column" gap={1}>
          <Text variant="title">Planning Rules</Text>
          <Text variant="caption" tone="muted">Agent thresholds, model weights, and system configuration</Text>
        </Stack>
      </Card>
      <Card sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
        <div className="pa-rules-head">
          <span>Rule</span><span>Current value</span><span>Type</span><span>Editable</span>
        </div>
        {PLANNING_RULES.map((r) => (
          <div key={r.name} className="pa-rules-row">
            <span className="pa-rules-name">{r.name}</span>
            <span className="pa-rules-value">{r.value}</span>
            <span><Badge variant="subtle" size="small" color="default" label={r.type} /></span>
            <span>
              {r.editable
                ? <span className="pa-rules-editable"><Pencil size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />Yes</span>
                : <span className="pa-rules-locked"><Lock size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />System</span>}
            </span>
          </div>
        ))}
      </Card>
    </Stack>
  );

  /* ─────────────── USERS & ROLES section ──────────────────────────────── */
  const usersSection = (
    <Stack direction="column" gap={3}>
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center">
          <Stack direction="column" gap={1}>
            <Text variant="title">Users &amp; Roles</Text>
            <Text variant="caption" tone="muted">Access control and role assignments</Text>
          </Stack>
          <Button variant="primary" size="medium"><Plus size={14} style={{ marginRight: 4 }} />Invite user</Button>
        </Stack>
      </Card>
      <Card sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
        <div className="pa-users-head">
          <span>Name</span><span>Email</span><span>Role</span><span>Access scope</span><span>Status</span>
        </div>
        {ADMIN_USERS.map((u) => {
          const initials = u.name.split(" ").map((w) => w[0]).join("").substring(0, 2);
          return (
            <div key={u.email} className="pa-users-row">
              <span className="pa-user-name">
                <span className="pa-avatar" style={{ background: u.color }}>{initials}</span>
                {u.name}
              </span>
              <span className="pa-user-email">{u.email}</span>
              <span className="pa-user-role">{u.role}</span>
              <span className="pa-user-access">{u.access}</span>
              <span><Badge variant="subtle" size="small" color={u.status === "Active" ? "success" : "warning"} label={u.status} /></span>
            </div>
          );
        })}
      </Card>
    </Stack>
  );

  /* ─────────────── NAV config ──────────────────────────────────────────── */
  const NAV_ITEMS = [
    { id: "planning", icon: <LayoutDashboard size={15} />, label: "Planning Admin" },
    { id: "periods",  icon: <CalendarRange size={15} />,   label: "Assortment Periods" },
    { id: "rules",    icon: <SlidersHorizontal size={15} />, label: "Planning Rules" },
    { id: "users",    icon: <Users size={15} />,            label: "Users & Roles" },
  ];

  /* ─────────────── SCOPE WIZARD gate ──────────────────────────────────── */
  if (!scopeConfirmed) {
    return (
      <Stack direction="column" gap={4} style={{ maxWidth: 600, margin: "0 auto" }}>
        <Card sx={panelSx}>
          <Stack direction="column" gap={3}>
            <Stack direction="row" align="center" gap={2}>
              <Text variant="title">Planning Admin</Text>
              <Badge variant="subtle" size="small" color="warning" label="Scope required" />
            </Stack>
            <Text variant="caption" tone="muted">Define your planning scope before accessing the data. Your selections will persist for this session.</Text>
          </Stack>
        </Card>
        <Card sx={panelSx}>
          <StepIndicator step={scopeStep} labels={SCOPE_STEPS} className="pa-scope-steps" />
          <div className="pa-scope-body">
            {scopeStep === 0 && (
              <Stack direction="column" gap={3}>
                <Text variant="body-strong" tone="strong">Which departments are in scope?</Text>
                <div className="pa-scope-checks">
                  {SCOPE_DEPT_OPTS.map((d) => (
                    <label key={d} className="pa-scope-check-label">
                      <input type="checkbox" checked={scopeDepts.includes(d)} onChange={() => setScopeDepts((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])} />
                      {d}
                    </label>
                  ))}
                </div>
              </Stack>
            )}
            {scopeStep === 1 && (
              <Stack direction="column" gap={3}>
                <Text variant="body-strong" tone="strong">Which channels?</Text>
                <div className="pa-scope-checks">
                  {SCOPE_CHANNEL_OPTS.map((c) => (
                    <label key={c} className="pa-scope-check-label">
                      <input type="checkbox" checked={scopeChannels.includes(c)} onChange={() => setScopeChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} />
                      {c}
                    </label>
                  ))}
                </div>
              </Stack>
            )}
            {scopeStep === 2 && (
              <Stack direction="column" gap={3}>
                <Text variant="body-strong" tone="strong">Confirm planning period</Text>
                <div className="pa-scope-summary">
                  <div><strong>Season:</strong> SS 2026</div>
                  <div><strong>Departments:</strong> {scopeDepts.join(", ")}</div>
                  <div><strong>Channels:</strong> {scopeChannels.join(", ")}</div>
                  <div><strong>Active period:</strong> SS26-W20 (Jun 8 – Jun 14, 2026)</div>
                </div>
              </Stack>
            )}
          </div>
          <Stack direction="row" justify="space-between" style={{ marginTop: 24 }}>
            <Button variant="secondary" size="medium" disabled={scopeStep === 0} onClick={() => setScopeStep(scopeStep - 1)}>← Back</Button>
            {scopeStep < 2
              ? <Button variant="primary" size="medium" onClick={() => setScopeStep(scopeStep + 1)}>Next →</Button>
              : <Button variant="primary" size="medium" onClick={confirmScope}>Confirm &amp; Unlock →</Button>}
          </Stack>
        </Card>
      </Stack>
    );
  }

  /* ─────────────── MAIN RENDER ─────────────────────────────────────────── */
  return (
    <Stack direction="column" gap={4}>
      {/* Page header */}
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto">
            <Text variant="title">Planning Admin</Text>
            <Text variant="caption" tone="muted">Scope: {scopeDepts.join(" · ")} · SS 2026</Text>
          </Stack>
          <Stack direction="row" gap={2} align="center">
            <Badge variant="subtle" size="small" color="warning" label="● Source system — read only" />
            <Button variant="tertiary" size="small" onClick={() => { setScopeConfirmed(false); setScopeStep(0); try { localStorage.removeItem("pa_scope_confirmed"); } catch {} }}>
              Reset scope
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* Two-column: nav + content */}
      <Stack direction="row" gap={4} align="flex-start">
        {/* Left nav rail */}
        <div className="pa-nav-rail">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              className={`pa-nav-btn${section === item.id ? " is-active" : ""}`}
              onClick={() => { setSection(item.id); if (item.id === "periods") setApView("list"); }}
            >
              <span className="pa-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {section === "planning" && (
            <Stack direction="column" gap={3}>
              <Tabs
                value={tab}
                onChange={(_e, v) => setTab(v)}
                tabNames={TAB_NAMES}
                tabPanels={[productsPanel, locationsPanel, exceptionsPanel]}
              />
            </Stack>
          )}

          {section === "periods" && (
            <Card sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
              {apView === "list" ? periodsListView : periodsFormView}
            </Card>
          )}

          {section === "rules" && planningRulesSection}
          {section === "users" && usersSection}
        </div>
      </Stack>
    </Stack>
  );
}
