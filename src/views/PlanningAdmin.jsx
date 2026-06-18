import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, Tabs, Checkbox, Input, Chips } from "impact-ui";
import Text from "../components/Text.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import Stack from "../components/Stack.jsx";
import SkuSwatch from "../components/SkuSwatch.jsx";
import { color, deptColor } from "../styles/tokens.js";
import {
  PRODUCTS,
  LOCATIONS,
  LOC_ATTRS,
  CORE_BG_OPTS,
  STATUS_OPTS,
  BAND_PCT,
  ATTR_GROUPS,
  PRODUCTS_BY_DEPT,
} from "../data/admin.js";
import "./PlanningAdmin.css";
import { panelSx } from "../styles/panelSx.js";


const STATUS_COLOR = { Active: color.success, Discontinued: color.error, Pending: color.warning };
const VEL_COLOR = { A: color.success, B: color.info, C: color.warning, D: color.error, E: color.error };
const isLocked = (v) => v === "Core" || v === "BG";

function Banner({ tone, children }) {
  const bg = { error: "var(--color-error-soft)", accent: "var(--color-primary-soft)", teal: "var(--color-surface-alt)" }[tone] || "var(--color-surface-alt)";
  const bd = { error: "var(--color-error)", accent: "var(--color-primary)", teal: "var(--color-teal)" }[tone] || "var(--color-border)";
  return (
    <Stack direction="row" gap={2} align="flex-start" paddingX={3} paddingY={2} style={{ background: bg, border: `1px solid ${bd}`, borderLeft: `3px solid ${bd}`, borderRadius: "var(--r2)" }}>
      <Text variant="caption" tone="default" style={{ lineHeight: 1.5 }}>{children}</Text>
    </Stack>
  );
}

export default function PlanningAdmin() {
  const [tab, setTab] = useState(0);
  const [prodAttrs, setProdAttrs] = useState({});
  const [locAttrs, setLocAttrs] = useState({});
  const [exSearch, setExSearch] = useState("");

  /* ════════════ PRODUCTS ════════════ */
  const productRows = useMemo(
    () =>
      PRODUCTS.map((p) => {
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
    const sku = e.data.sku;
    setProdAttrs((prev) => ({ ...prev, [sku]: { ...prev[sku], [field]: e.newValue } }));
  };

  const productColumns = useMemo(
    () => [
      { field: "sku", headerName: "SKU", width: 156, pinned: "left", filter: "agTextColumnFilter",
        cellStyle: (p) => ({ fontFamily: "var(--font-mono)", color: color.teal, fontWeight: 700, borderLeft: `3px solid ${p.data._ov ? color.teal : "transparent"}` }),
        cellRenderer: (p) => (
          <div style={{ display: "flex", alignItems: "center", gap: 8, height: "100%" }}>
            <SkuSwatch sku={p.data} size={20} />
            <span>{p.value}</span>
          </div>
        ),
      },
      { field: "vsn", headerName: "VSN", width: 120, filter: "agTextColumnFilter" },
      { field: "dept", headerName: "Department", width: 140, filter: "agSetColumnFilter", cellStyle: (p) => ({ color: deptColor[p.value] || color.accent, fontWeight: 600 }) },
      { field: "subDept", headerName: "Sub-Department", width: 170, filter: "agSetColumnFilter" },
      { field: "cls", headerName: "Class", width: 130, filter: "agSetColumnFilter" },
      { field: "subCls", headerName: "Sub-Class", width: 150, filter: "agSetColumnFilter" },
      { field: "desc", headerName: "Description", minWidth: 220, flex: 1, filter: "agTextColumnFilter" },
      { field: "color", headerName: "Color", width: 110, filter: "agSetColumnFilter" },
      { field: "finish", headerName: "Finish", width: 120, filter: "agSetColumnFilter" },
      { field: "size", headerName: "Size", width: 110, filter: "agSetColumnFilter" },
      { field: "price", headerName: "Menu $/sqft", width: 110, filter: "agNumberColumnFilter", valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
      {
        field: "coreBG", headerName: "Core / BG", width: 130,
        filter: "agSetColumnFilter",
        editable: (p) => !isLocked(p.value),
        cellEditor: "agSelectCellEditor", cellEditorParams: { values: CORE_BG_OPTS },
        valueFormatter: (p) => (isLocked(p.value) ? `🔒 ${p.value}` : p.value || "—"),
        cellStyle: (p) => ({ color: isLocked(p.value) ? color.success : color.text, fontWeight: isLocked(p.value) ? 700 : 400 }),
      },
      { field: "lead", headerName: "Lead (wk)", width: 100, filter: "agNumberColumnFilter" },
      {
        field: "status", headerName: "Status", width: 130,
        filter: "agSetColumnFilter",
        editable: true, cellEditor: "agSelectCellEditor", cellEditorParams: { values: STATUS_OPTS },
        cellStyle: (p) => ({ color: STATUS_COLOR[p.value] || color.text, fontWeight: 700 }),
      },
      { field: "attrs", headerName: "Key Attributes", minWidth: 200, flex: 1, filter: "agTextColumnFilter" },
    ],
    []
  );

  const productsPanel = (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
        <Stack direction="column" gap={1} style={{ minWidth: 0 }}>
          <Text variant="body-strong" tone="strong">Product Attributes</Text>
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

  /* ════════════ LOCATIONS ════════════ */
  const locationRows = useMemo(
    () =>
      LOCATIONS.map((l) => {
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
    const id = e.data.id;
    setLocAttrs((prev) => ({ ...prev, [id]: { ...prev[id], [field]: e.newValue } }));
  };

  const locationColumns = useMemo(
    () => [
      { field: "id", headerName: "Store #", width: 110, pinned: "left", filter: "agTextColumnFilter", cellStyle: (p) => ({ fontFamily: "var(--font-mono)", color: color.teal, fontWeight: 700, borderLeft: `3px solid ${p.data._ov ? color.teal : "transparent"}` }) },
      { field: "name", headerName: "Store Name", minWidth: 170, flex: 1, filter: "agTextColumnFilter" },
      { field: "region", headerName: "Region", width: 140, filter: "agSetColumnFilter" },
      { field: "market", headerName: "Market", width: 130, filter: "agSetColumnFilter" },
      { field: "state", headerName: "State", width: 80, filter: "agSetColumnFilter" },
      { field: "dc", headerName: "DC", width: 80, filter: "agSetColumnFilter" },
      { field: "velocity", headerName: "Velocity", width: 100, filter: "agSetColumnFilter", cellStyle: (p) => ({ color: VEL_COLOR[p.value] || color.text, fontWeight: 700 }) },
      { field: "bandPct", headerName: "Band %", width: 90 },
      ...LOC_ATTRS.map((a) => ({
        field: a.key, headerName: a.label, width: 150,
        filter: "agSetColumnFilter",
        editable: true, cellEditor: "agSelectCellEditor", cellEditorParams: { values: a.opts },
        cellStyle: (p) => {
          const def = LOCATIONS.find((l) => l.id === p.data.id)?.defaults[a.key];
          const ov = p.value !== def;
          return { color: ov ? color.teal : color.textMuted, fontWeight: ov ? 700 : 400 };
        },
      })),
    ],
    []
  );

  const locationsPanel = (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
        <Stack direction="column" gap={1} style={{ minWidth: 0 }}>
          <Text variant="body-strong" tone="strong">Location Attributes</Text>
        </Stack>
        <Stack direction="row" gap={2} align="center">
          {locOvCount ? <Badge variant="subtle" size="small" color="success" label={`${locOvCount} overridden`} /> : null}
          {locOvCount ? <Button variant="secondary" size="small" onClick={() => setLocAttrs({})}>Reset all</Button> : null}
        </Stack>
      </Stack>
      <Table defaultColDef={{ floatingFilter: true }} cardContainer rowHeight="compact" tableHeader="Store master" columnDefs={locationColumns} rowData={locationRows} domLayout="autoHeight" hideTableSetting hideTableActions pagination={false} onCellValueChanged={onLocCellChanged} stopEditingWhenCellsLoseFocus />
      <Text variant="micro" tone="subtle">{LOCATIONS.length} stores shown · {locOvCount} edited · 🔁 ERP / Store Master</Text>
    </Stack>
  );

  /* ════════════ EXCEPTIONS ════════════ */
  const [exView, setExView] = useState("attr-store");
  const [attrStore, setAttrStore] = useState({});
  const [itemStore, setItemStore] = useState({});
  const [collapsed, setCollapsed] = useState(() => {
    const c = {};
    ATTR_GROUPS.forEach((g, i) => { c[`ag_${g.key}`] = i !== 0; });
    Object.keys(PRODUCTS_BY_DEPT).forEach((d, i) => { c[`dept_${d}`] = i !== 0; });
    return c;
  });
  const toggleGroup = (k) => setCollapsed((p) => ({ ...p, [k]: !p[k] }));

  const toggleAttr = (key) => setAttrStore((p) => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n; });
  const toggleItem = (key) => setItemStore((p) => { const n = { ...p }; if (n[key]) delete n[key]; else n[key] = true; return n; });

  const attrCount = Object.keys(attrStore).length;
  const itemCount = Object.keys(itemStore).length;

  const StoreHead = () => (
    <div className="pa-matrix-row is-head">
      <div className="pa-cell-label"><Text variant="micro" tone="muted" style={{ fontWeight: 700 }}>{exView === "attr-store" ? "Attribute value" : "Product / SKU"}</Text></div>
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
        <Stack direction="column" gap={1} style={{ minWidth: 0 }}>
          <Text variant="body-strong" tone="strong">Global Exceptions</Text>
          <Text variant="micro" tone="subtle">Define exceptions by product attribute or by individual SKU, per store. Checked cells = exception active.</Text>
        </Stack>
        <Stack direction="row" gap={2} align="center" wrap>
          <Input
            id="ex-search"
            name="ex-search"
            placeholder={exView === "attr-store" ? "Search attribute values…" : "Search SKU or description…"}
            value={exSearch}
            onChange={(e) => setExSearch(e.target.value)}
            size="medium"
          />
          <Chips label="🏷 Attribute × Store" isActive={exView === "attr-store"} onClick={() => { setExView("attr-store"); setExSearch(""); }} />
          <Chips label="📦 Item × Store" isActive={exView === "item-store"} onClick={() => { setExView("item-store"); setExSearch(""); }} />
        </Stack>
      </Stack>

      {exView === "attr-store" ? (
        <>
          <Banner tone="error"><strong>Product Attribute × Store</strong> — check a cell to flag that attribute value as an exception for that store. Use to exclude a material or format from specific locations. Groups collapse by attribute.</Banner>
          {ATTR_GROUPS.map((g) => {
            const open = !collapsed[`ag_${g.key}`];
            const groupChecked = g.values.reduce((sum, v) => sum + LOCATIONS.filter((l) => attrStore[`${g.key}|${v}|${l.id}`]).length, 0);
            const visibleValues = exSearch.trim()
              ? g.values.filter((v) => v.toLowerCase().includes(exSearch.trim().toLowerCase()))
              : g.values;
            if (visibleValues.length === 0) return null;
            return (
              <Stack key={g.key} direction="column" gap={2}>
                <Button
                  variant="ghost"
                  className="pa-group"
                  aria-expanded={!!open}
                  onClick={() => toggleGroup(`ag_${g.key}`)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", width: "100%", padding: "4px 0", font: "inherit" }}
                >
                  <Text variant="caption" tone="subtle">{open ? "▾" : "▸"}</Text>
                  <Text variant="caption" tone="strong">{g.label}</Text>
                  {groupChecked > 0 ? <Badge variant="subtle" size="small" color="error" label={String(groupChecked)} /> : null}
                </Button>
                {open || exSearch.trim() ? (
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
          <Banner tone="accent"><strong>Item × Store</strong> — check a cell to flag a specific SKU as an exception for that store. Use to exclude an individual product from a specific location. Groups collapse by department.</Banner>
          {Object.keys(PRODUCTS_BY_DEPT).map((dept) => {
            const open = !collapsed[`dept_${dept}`];
            const prods = PRODUCTS_BY_DEPT[dept];
            const visibleProds = exSearch.trim()
              ? prods.filter((p) =>
                  p.desc.toLowerCase().includes(exSearch.trim().toLowerCase()) ||
                  String(p.sku).includes(exSearch.trim())
                )
              : prods;
            if (visibleProds.length === 0) return null;
            const deptChecked = prods.reduce((sum, p) => sum + LOCATIONS.filter((l) => itemStore[`${p.sku}|${l.id}`]).length, 0);
            return (
              <Stack key={dept} direction="column" gap={2}>
                <Button
                  variant="ghost"
                  className="pa-group"
                  aria-expanded={!!open}
                  onClick={() => toggleGroup(`dept_${dept}`)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", width: "100%", padding: "4px 0", font: "inherit" }}
                >
                  <Text variant="caption" tone="subtle">{open ? "▾" : "▸"}</Text>
                  <Text variant="caption" tone="strong">{dept}</Text>
                  {deptChecked > 0 ? <Badge variant="subtle" size="small" color="info" label={String(deptChecked)} /> : null}
                </Button>
                {open || exSearch.trim() ? (
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
    { value: 3, label: "Calendar Mapping" },
  ];

  // V3: Scope wizard gate
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

  // Calendar Mapping tab content
  const FY_CARDS = [
    { year: "FY2025", status: "complete", color: color.success,   periods: 52, season: "FW 2025 · SS 2025" },
    { year: "FY2026", status: "current",  color: color.info,      periods: 52, season: "FW 2026 · SS 2026 (active)" },
    { year: "FY2027", status: "future",   color: color.neutral,   periods: 52, season: "FW 2027 · SS 2027" },
  ];
  const SS_PERIODS = [
    { period: "SS26-W01", start: "Jan 26, 2026", end: "Feb 1, 2026",  status: "complete" },
    { period: "SS26-W04", start: "Feb 16, 2026", end: "Feb 22, 2026", status: "complete" },
    { period: "SS26-W08", start: "Mar 16, 2026", end: "Mar 22, 2026", status: "current"  },
    { period: "SS26-W12", start: "Apr 13, 2026", end: "Apr 19, 2026", status: "upcoming" },
    { period: "SS26-W16", start: "May 11, 2026", end: "May 17, 2026", status: "upcoming" },
    { period: "SS26-W20", start: "Jun 8, 2026",  end: "Jun 14, 2026", status: "active"   },
    { period: "SS26-W24", start: "Jul 6, 2026",  end: "Jul 12, 2026", status: "upcoming" },
  ];
  const calendarPanel = (
    <Stack direction="column" gap={4}>
      <Stack direction="row" gap={3} wrap>
        {FY_CARDS.map((fy) => (
          <div key={fy.year} className="pa-fy-card" style={{ borderColor: fy.color }}>
            <div className="pa-fy-year" style={{ color: fy.color }}>{fy.year}</div>
            <div className="pa-fy-season">{fy.season}</div>
            <div className="pa-fy-meta">{fy.periods} periods</div>
            <div className="pa-fy-status" style={{ background: `${fy.color}20`, color: fy.color }}>
              {fy.status === "complete" ? "✅ Complete" : fy.status === "current" ? "▶ Current" : "○ Future"}
            </div>
          </div>
        ))}
      </Stack>
      <div className="pa-period-list-header">
        <Text variant="body-strong" tone="strong">SS 2026 Period List</Text>
      </div>
      <div className="pa-period-list">
        {SS_PERIODS.map((p) => (
          <div key={p.period} className={`pa-period-row pa-period-row--${p.status}`}>
            <span className="pa-period-id">{p.period}</span>
            <span className="pa-period-range">{p.start} – {p.end}</span>
            <span className={`pa-period-status pa-period-status--${p.status}`}>
              {p.status === "complete" ? "Complete" : p.status === "current" ? "▶ Active" : p.status === "active" ? "▶ Current" : "Upcoming"}
            </span>
          </div>
        ))}
      </div>
    </Stack>
  );

  if (!scopeConfirmed) {
    return (
      <Stack direction="column" gap={4} style={{ maxWidth: 600, margin: "0 auto" }}>
        <Card sx={panelSx}>
          <Stack direction="column" gap={3}>
            <Stack direction="row" align="center" gap={2}>
              <Text variant="title">Planning Admin</Text>
              <Badge variant="subtle" size="small" color="warning" label="Scope required" />
            </Stack>
            <Text variant="caption" tone="muted">
              Define your planning scope before accessing the data. Your selections will persist for this session.
            </Text>
          </Stack>
        </Card>

        <Card sx={panelSx}>
          {/* Step indicator */}
          <StepIndicator step={scopeStep} labels={SCOPE_STEPS} className="pa-scope-steps" />

          <div className="pa-scope-body">
            {scopeStep === 0 && (
              <Stack direction="column" gap={3}>
                <Text variant="body-strong" tone="strong">Which departments are in scope?</Text>
                <div className="pa-scope-checks">
                  {SCOPE_DEPT_OPTS.map((d) => (
                    <label key={d} className="pa-scope-check-label">
                      <input
                        type="checkbox"
                        checked={scopeDepts.includes(d)}
                        onChange={() => setScopeDepts((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
                      />
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
                      <input
                        type="checkbox"
                        checked={scopeChannels.includes(c)}
                        onChange={() => setScopeChannels((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                      />
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
            <Button variant="secondary" size="medium" disabled={scopeStep === 0} onClick={() => setScopeStep(scopeStep - 1)}>
              ← Back
            </Button>
            {scopeStep < 2 ? (
              <Button variant="primary" size="medium" onClick={() => setScopeStep(scopeStep + 1)}>
                Next →
              </Button>
            ) : (
              <Button variant="primary" size="medium" onClick={confirmScope}>
                Confirm &amp; Unlock →
              </Button>
            )}
          </Stack>
        </Card>
      </Stack>
    );
  }

  return (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Planning Admin</Text>
            <Text variant="caption" tone="muted">Scope: {scopeDepts.join(" · ")} · SS 2026</Text>
          </Stack>
          <Stack direction="row" gap={2} align="center">
            <Badge variant="subtle" size="small" color="warning" label="● Source system data — read only" />
            <Button variant="tertiary" size="small" onClick={() => { setScopeConfirmed(false); setScopeStep(0); try { localStorage.removeItem("pa_scope_confirmed"); } catch {} }}>
              Reset scope
            </Button>
          </Stack>
        </Stack>
      </Card>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} tabNames={TAB_NAMES} tabPanels={[productsPanel, locationsPanel, exceptionsPanel, calendarPanel]} />
    </Stack>
  );
}
