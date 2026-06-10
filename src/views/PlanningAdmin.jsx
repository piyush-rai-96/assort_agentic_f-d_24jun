import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Table, Tabs, Checkbox, Input } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
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
      { field: "sku", headerName: "SKU", width: 124, pinned: "left", filter: "agTextColumnFilter", cellStyle: (p) => ({ fontFamily: "var(--font-mono)", color: color.teal, fontWeight: 700, borderLeft: `3px solid ${p.data._ov ? color.teal : "transparent"}` }) },
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
          <Button variant={exView === "attr-store" ? "primary" : "secondary"} size="small" onClick={() => { setExView("attr-store"); setExSearch(""); }}>🏷 Attribute × Store</Button>
          <Button variant={exView === "item-store" ? "primary" : "secondary"} size="small" onClick={() => { setExView("item-store"); setExSearch(""); }}>📦 Item × Store</Button>
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
                <Stack className="pa-group" direction="row" align="center" gap={2} onClick={() => toggleGroup(`ag_${g.key}`)}>
                  <Text variant="caption" tone="subtle">{open ? "▾" : "▸"}</Text>
                  <Text variant="caption" tone="strong">{g.label}</Text>
                  {groupChecked > 0 ? <Badge variant="subtle" size="small" color="error" label={String(groupChecked)} /> : null}
                </Stack>
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
                <Stack className="pa-group" direction="row" align="center" gap={2} onClick={() => toggleGroup(`dept_${dept}`)}>
                  <Text variant="caption" tone="subtle">{open ? "▾" : "▸"}</Text>
                  <Text variant="caption" tone="strong">{dept}</Text>
                  {deptChecked > 0 ? <Badge variant="subtle" size="small" color="info" label={String(deptChecked)} /> : null}
                </Stack>
                {open || exSearch.trim() ? (
                  <div className="pa-matrix">
                    <StoreHead />
                    {visibleProds.map((p) => (
                      <div key={p.sku} className="pa-matrix-row">
                        <div className="pa-cell-label">
                          <Stack direction="column" gap={0} style={{ minWidth: 0 }}>
                            <Text variant="micro" tone="default" truncate style={{ maxWidth: 176 }}>{p.desc}</Text>
                            <Text variant="micro" tone="subtle" mono>{p.sku}</Text>
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
    { value: 0, label: "📦 Products" },
    { value: 1, label: "📍 Location Attributes" },
    { value: 2, label: "🚫 Global Exceptions" },
  ];

  return (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Planning Admin</Text>
          </Stack>
          <Badge variant="subtle" size="small" color="warning" label="● Source system data — read only" />
        </Stack>
      </Card>

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} tabNames={TAB_NAMES} tabPanels={[productsPanel, locationsPanel, exceptionsPanel]} />
    </Stack>
  );
}
