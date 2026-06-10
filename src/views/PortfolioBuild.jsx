import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Tabs, Table, ProgressBar, EmptyState, Input, TextArea } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { color } from "../styles/tokens.js";
import { FD_STORES } from "../data/stores.js";
import { CURRENT_USER } from "../data/todaySeed.js";
import {
  INITIAL_GAPS,
  INITIAL_WISHLISTS,
  buildVendorSkus,
  GAP_TYPE_OPTIONS,
  PRIORITY_OPTIONS,
  URGENCY_OPTIONS,
  DEPT_OPTIONS,
  EVIDENCE_OPTIONS,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
  STATUS_BADGE,
} from "../data/portfolioSeed.js";
import "./PortfolioBuild.css";

/* Shared Card style — neutralizes Impact UI defaults, token-driven (matches other views). */
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
/* List container card: rows own their own padding. */
const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };
const formCardSx = { ...panelSx, padding: "var(--sp-5)" };

const STORE_OPTIONS = [
  { value: "", label: "— Select store —" },
  ...FD_STORES.map((s) => ({ value: String(s.id), label: `${s.name} (${s.region})` })),
];

/* ── Add-forms (module scope so they keep focus while typing) ──────────────── */

function GapForm({ onSave, onCancel }) {
  const [type, setType] = useState("Price Point");
  const [priority, setPriority] = useState("high");
  const [category, setCategory] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [desc, setDesc] = useState("");
  const save = () => {
    if (!desc.trim()) return;
    onSave({ type, priority, category, priceRange, desc: desc.trim() });
  };
  return (
    <Stack direction="column" gap={4}>
      <Stack direction="column" gap={1}>
        <Text variant="subheading" tone="strong">Log a new line gap</Text>
        <Text variant="caption" tone="muted">
          Gaps are product types starting to perform without enough depth — missing price points,
          materials, looks, or formats. Each gap becomes a brief for vendor &amp; trade-show sourcing.
        </Text>
      </Stack>
      <Grid columns={2} gap={4}>
        <FdSelect label="Gap type" value={type} options={GAP_TYPE_OPTIONS} onChange={setType} width={600} />
        <FdSelect label="Priority" value={priority} options={PRIORITY_OPTIONS} onChange={setPriority} width={600} />
      </Grid>
      <Grid columns={2} gap={4}>
        <FdSelect label="Category / Department" value={category} options={DEPT_OPTIONS} onChange={setCategory} width={600} />
        <Stack direction="column" gap={1}>
          <Text variant="micro" tone="muted">Target price range</Text>
          <Input placeholder="e.g. $1.99–$2.49/sqft" value={priceRange} onChange={(e) => setPriceRange(e.target.value)} fullWidth size="medium" />
        </Stack>
      </Grid>
      <Stack direction="column" gap={1}>
        <Text variant="micro" tone="muted">Description <span style={{ color: color.error }}>*</span></Text>
        <TextArea
          placeholder={'Describe the gap clearly — what\'s missing, why it matters, what evidence supports it.'}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          width="100%"
          height="96px"
        />
      </Stack>
      <Stack direction="row" gap={2} justify="flex-end" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--sp-3)" }}>
        <Button variant="secondary" size="medium" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="medium" onClick={save}>Save gap →</Button>
      </Stack>
    </Stack>
  );
}

function WishForm({ onSave, onCancel }) {
  const [store, setStore] = useState("");
  const [item, setItem] = useState("");
  const [evidence, setEvidence] = useState("Customer requests");
  const [urgency, setUrgency] = useState("med");
  const [note, setNote] = useState("");
  const save = () => {
    if (!store || !item.trim()) return;
    onSave({ store, item: item.trim(), evidence, urgency, note: note.trim() });
  };
  return (
    <Stack direction="column" gap={4}>
      <Stack direction="column" gap={1}>
        <Text variant="subheading" tone="strong">Submit a field wishlist item</Text>
        <Text variant="caption" tone="muted">
          A product you&apos;re seeing demand for that&apos;s not in the current catalogue. Include the
          evidence — the more specific, the stronger the case to the merchant team.
        </Text>
      </Stack>
      <FdSelect label="Store" value={store} options={STORE_OPTIONS} onChange={setStore} width={600} isWithSearch />
      <Stack direction="column" gap={1}>
        <Text variant="micro" tone="muted">Product / item request <span style={{ color: color.error }}>*</span></Text>
        <Input placeholder="e.g. Wide-plank white oak engineered, farmhouse look" value={item} onChange={(e) => setItem(e.target.value)} fullWidth size="medium" />
      </Stack>
      <Grid columns={2} gap={4}>
        <FdSelect label="Evidence type" value={evidence} options={EVIDENCE_OPTIONS} onChange={setEvidence} width={600} />
        <FdSelect label="Urgency" value={urgency} options={URGENCY_OPTIONS} onChange={setUrgency} width={600} />
      </Grid>
      <Stack direction="column" gap={1}>
        <Text variant="micro" tone="muted">Supporting detail</Text>
        <TextArea
          placeholder="How many customers asking? Any specific projects? Price they're willing to pay?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          width="100%"
          height="96px"
        />
      </Stack>
      <Stack direction="row" gap={2} justify="flex-end" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--sp-3)" }}>
        <Button variant="secondary" size="medium" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="medium" onClick={save}>Submit wishlist →</Button>
      </Stack>
    </Stack>
  );
}

function VendorForm({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [dept, setDept] = useState("");
  const [show, setShow] = useState("");
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState("");
  const save = () => {
    if (!name.trim() || !vendor.trim()) return;
    onSave({
      name: name.trim(),
      vendor: vendor.trim(),
      dept,
      show: show.trim() || "Direct",
      landedCost: parseFloat(cost) || 0,
      margin: parseFloat(margin) || 0,
    });
  };
  return (
    <Stack direction="column" gap={4}>
      <Stack direction="column" gap={1}>
        <Text variant="subheading" tone="strong">Add a vendor SKU</Text>
        <Text variant="caption" tone="muted">
          Log a SKU seen at a trade show, sourced direct, or submitted by a vendor. Shortlisted items
          are reviewed by the merchant team before PLR approval.
        </Text>
      </Stack>
      <Stack direction="column" gap={1}>
        <Text variant="micro" tone="muted">SKU / Product name <span style={{ color: color.error }}>*</span></Text>
        <Input placeholder="e.g. Marazzi Calacatta Statuarietto 24×48 Polished" value={name} onChange={(e) => setName(e.target.value)} fullWidth size="medium" />
      </Stack>
      <Grid columns={2} gap={4}>
        <Stack direction="column" gap={1}>
          <Text variant="micro" tone="muted">Vendor <span style={{ color: color.error }}>*</span></Text>
          <Input placeholder="e.g. Marazzi" value={vendor} onChange={(e) => setVendor(e.target.value)} fullWidth size="medium" />
        </Stack>
        <FdSelect label="Department" value={dept} options={DEPT_OPTIONS} onChange={setDept} width={600} />
      </Grid>
      <Grid columns={3} gap={4}>
        <Stack direction="column" gap={1}>
          <Text variant="micro" tone="muted">Trade show / source</Text>
          <Input placeholder="e.g. Coverings 2026" value={show} onChange={(e) => setShow(e.target.value)} fullWidth size="medium" />
        </Stack>
        <Stack direction="column" gap={1}>
          <Text variant="micro" tone="muted">Landed cost ($/sqft)</Text>
          <Input type="number" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} fullWidth size="medium" />
        </Stack>
        <Stack direction="column" gap={1}>
          <Text variant="micro" tone="muted">Est. margin %</Text>
          <Input type="number" placeholder="0" value={margin} onChange={(e) => setMargin(e.target.value)} fullWidth size="medium" />
        </Stack>
      </Grid>
      <Stack direction="row" gap={2} justify="flex-end" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--sp-3)" }}>
        <Button variant="secondary" size="medium" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="medium" onClick={save}>Add to shortlist →</Button>
      </Stack>
    </Stack>
  );
}

/* ── Empty-state card shown when nothing is selected in a split panel ───────── */
function PanelEmpty({ heading, description }) {
  return (
    <Card sx={panelSx}>
      <Stack direction="column" gap={2} align="center" justify="center" style={{ minHeight: 320, textAlign: "center" }}>
        <EmptyState heading={heading} description={description} />
      </Stack>
    </Card>
  );
}

export default function PortfolioBuild({ onNavigate }) {
  const [gaps, setGaps] = useState(INITIAL_GAPS);
  const [wishlists, setWishlists] = useState(INITIAL_WISHLISTS);
  const [vendorSkus, setVendorSkus] = useState(() => buildVendorSkus());

  const [tab, setTab] = useState(0); // 0 summary · 1 gaps · 2 wishlist · 3 vendor
  const [showAdd, setShowAdd] = useState(false);
  const [activeGapId, setActiveGapId] = useState(null);
  const [activeWishId, setActiveWishId] = useState(null);
  const [activeVendorId, setActiveVendorId] = useState(null);
  const [vendorFilter, setVendorFilter] = useState("All");

  const approved = vendorSkus.filter((s) => s.status === "Approved").length;
  const shortlisted = vendorSkus.filter((s) => s.status === "Shortlisted").length;
  const highPri = gaps.filter((g) => g.priority === "high").length;
  const progressPct = Math.min(Math.round((approved / 50) * 100), 100);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTab = (t) => {
    setTab(t);
    setShowAdd(false);
  };
  const openSummaryGap = (id) => { setTab(1); setActiveGapId(id); setShowAdd(false); };
  const openSummaryWish = (id) => { setTab(2); setActiveWishId(id); setShowAdd(false); };
  const openSummaryVendor = (id) => { setTab(3); setActiveVendorId(id); setShowAdd(false); };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const saveGap = (payload) => {
    const g = { id: "g" + Date.now(), date: "Today", addedBy: CURRENT_USER.name.split(" ")[0], ...payload };
    setGaps((prev) => [g, ...prev]);
    setShowAdd(false);
    setActiveGapId(g.id);
  };
  const deleteGap = (id) => {
    setGaps((prev) => prev.filter((g) => g.id !== id));
    if (activeGapId === id) setActiveGapId(null);
  };
  const saveWish = (payload) => {
    const storeObj = FD_STORES.find((s) => String(s.id) === String(payload.store));
    const w = {
      id: "w" + Date.now(),
      store: storeObj ? storeObj.name : "Store " + payload.store,
      region: storeObj ? storeObj.region : "",
      item: payload.item,
      evidence: payload.evidence,
      urgency: payload.urgency,
      note: payload.note,
      date: "Today",
    };
    setWishlists((prev) => [w, ...prev]);
    setShowAdd(false);
    setActiveWishId(w.id);
  };
  const saveVendor = (payload) => {
    const v = { id: "vsku-" + Date.now(), status: "Shortlisted", ...payload };
    setVendorSkus((prev) => [v, ...prev]);
    setShowAdd(false);
    setActiveVendorId(v.id);
  };
  const setVendorStatus = (id, status) => {
    setVendorSkus((prev) => prev.map((v) => (v.id === id ? { ...v, status } : v)));
  };
  const convertWishToGap = (w) => {
    const g = {
      id: "g" + Date.now(),
      type: "Look/Style",
      desc: `${w.item} (from ${w.store})`,
      priority: "med",
      addedBy: w.store,
      date: "Today",
    };
    setGaps((prev) => [g, ...prev]);
    setTab(1);
    setActiveGapId(g.id);
  };

  const activeGap = gaps.find((g) => g.id === activeGapId);
  const activeWish = wishlists.find((w) => w.id === activeWishId);
  const activeVendor = vendorSkus.find((v) => v.id === activeVendorId);

  // ── KPI strip ───────────────────────────────────────────────────────────────
  const kpis = [
    { label: "Gaps logged", value: gaps.length, sub: `${highPri} high priority`, tab: 1 },
    { label: "Field wishlists", value: wishlists.length, sub: "from stores & DMMs", tab: 2 },
    { label: "Vendor SKUs", value: vendorSkus.length, sub: `${shortlisted} shortlisted`, tab: 3 },
    { label: "Approved", value: approved, sub: "of target 30–50", tab: 3 },
    { label: "Portfolio progress", value: `${progressPct}%`, sub: "toward 50-SKU target", tab: null },
  ];

  // ── Summary table column defs ─────────────────────────────────────────────
  const gapColumns = useMemo(
    () => [
      {
        field: "priority",
        headerName: "Priority",
        width: 110,
        filter: "agSetColumnFilter",
        valueFormatter: (p) => PRIORITY_LABEL[p.value] || p.value,
        cellStyle: (p) => ({ color: color[PRIORITY_BADGE[p.value]] || color.text, fontWeight: 700 }),
      },
      { field: "type", headerName: "Type", width: 130, filter: "agSetColumnFilter" },
      { field: "desc", headerName: "Description", minWidth: 260, flex: 1, filter: "agTextColumnFilter" },
      { field: "addedBy", headerName: "Added by", width: 130, filter: "agTextColumnFilter" },
      { field: "date", headerName: "Date", width: 100 },
    ],
    []
  );
  const wishColumns = useMemo(
    () => [
      { field: "store", headerName: "Store", width: 150, filter: "agTextColumnFilter", cellStyle: () => ({ color: color.teal, fontWeight: 600 }) },
      { field: "region", headerName: "Region", width: 120, filter: "agSetColumnFilter" },
      { field: "item", headerName: "Request", minWidth: 240, flex: 1, filter: "agTextColumnFilter" },
      { field: "evidence", headerName: "Evidence", minWidth: 180, flex: 1, filter: "agTextColumnFilter" },
      { field: "date", headerName: "Date", width: 100 },
    ],
    []
  );
  const vendorColumns = useMemo(
    () => [
      { field: "name", headerName: "SKU / Product", minWidth: 220, flex: 1, filter: "agTextColumnFilter" },
      { field: "vendor", headerName: "Vendor", width: 110, filter: "agTextColumnFilter" },
      { field: "show", headerName: "Source", width: 130, filter: "agSetColumnFilter" },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        filter: "agSetColumnFilter",
        cellStyle: (p) => ({ color: color[STATUS_BADGE[p.value]] || color.text, fontWeight: 700 }),
      },
      {
        field: "margin",
        headerName: "Margin",
        width: 100,
        filter: "agNumberColumnFilter",
        valueFormatter: (p) => `${p.value}%`,
        cellStyle: (p) => ({ color: p.value >= 42 ? color.success : color.text, fontWeight: 600 }),
      },
      { field: "landedCost", headerName: "Landed $", width: 110, filter: "agNumberColumnFilter", valueFormatter: (p) => `$${Number(p.value).toFixed(2)}` },
    ],
    []
  );

  // ── Master list (selectable rows) ──────────────────────────────────────────
  const GapList = (
    <Card sx={paneSx}>
      <div className="pf-list">
        {gaps.length === 0 ? (
          <Stack direction="column" gap={1} padding={5} align="center">
            <Text variant="body-strong" tone="muted">No gaps logged yet</Text>
            <Text variant="caption" tone="subtle">Click “+ Add Gap” to start.</Text>
          </Stack>
        ) : (
          gaps.map((g) => (
            <Stack
              key={g.id}
              className={`pf-list-row${activeGapId === g.id ? " is-active" : ""}`}
              direction="column"
              gap={1}
              paddingX={3}
              paddingY={3}
              onClick={() => { setActiveGapId(activeGapId === g.id ? null : g.id); setShowAdd(false); }}
            >
              <Stack direction="row" gap={2} align="center" wrap>
                <Badge variant="subtle" size="small" color={PRIORITY_BADGE[g.priority]} label={PRIORITY_LABEL[g.priority] || g.priority} />
                <Text variant="micro" tone="muted">{g.type}</Text>
              </Stack>
              <Text variant="caption" tone="default">{g.desc}</Text>
              <Text variant="micro" tone="subtle">{g.addedBy} · {g.date}</Text>
            </Stack>
          ))
        )}
      </div>
    </Card>
  );

  const WishList = (
    <Card sx={paneSx}>
      <div className="pf-list">
        {wishlists.length === 0 ? (
          <Stack direction="column" gap={1} padding={5} align="center">
            <Text variant="body-strong" tone="muted">No wishlists submitted yet</Text>
          </Stack>
        ) : (
          wishlists.map((w) => (
            <Stack
              key={w.id}
              className={`pf-list-row${activeWishId === w.id ? " is-active" : ""}`}
              direction="column"
              gap={1}
              paddingX={3}
              paddingY={3}
              onClick={() => { setActiveWishId(activeWishId === w.id ? null : w.id); setShowAdd(false); }}
            >
              <Stack direction="row" gap={2} align="center" justify="space-between" wrap>
                <Text variant="caption" tone="teal">{w.store}</Text>
                {w.region ? <Badge variant="subtle" size="small" color="info" label={w.region} /> : null}
              </Stack>
              <Text variant="caption" tone="default">{w.item}</Text>
              <Text variant="micro" tone="subtle">{w.evidence}</Text>
            </Stack>
          ))
        )}
      </div>
    </Card>
  );

  const VENDOR_FILTERS = ["All", "Shortlisted", "Approved", "Under review", "Declined"];
  const filteredVendors = vendorFilter === "All" ? vendorSkus : vendorSkus.filter((v) => v.status === vendorFilter);

  const VendorListPanel = (
    <Card sx={paneSx}>
      <Stack direction="row" gap={2} wrap paddingX={3} paddingY={3} style={{ borderBottom: "1px solid var(--color-border)" }}>
        {VENDOR_FILTERS.map((f) => {
          const count = f === "All" ? vendorSkus.length : vendorSkus.filter((v) => v.status === f).length;
          if (count === 0 && f !== "All") return null;
          return (
            <Button
              key={f}
              variant={vendorFilter === f ? "primary" : "secondary"}
              size="small"
              onClick={() => setVendorFilter(f)}
            >
              {f} ({count})
            </Button>
          );
        })}
      </Stack>
      <div className="pf-list">
        {filteredVendors.map((v) => (
          <Stack
            key={v.id}
            className={`pf-list-row${activeVendorId === v.id ? " is-active" : ""}`}
            direction="column"
            gap={1}
            paddingX={3}
            paddingY={3}
            onClick={() => { setActiveVendorId(activeVendorId === v.id ? null : v.id); setShowAdd(false); }}
          >
            <Stack direction="row" gap={2} align="center" justify="space-between" wrap>
              <Text variant="micro" tone="muted">{v.vendor}{v.dept ? ` · ${v.dept}` : ""}</Text>
              <Badge variant="subtle" size="small" color={STATUS_BADGE[v.status]} label={v.status} />
            </Stack>
            <Text variant="caption" tone="default">{v.name}</Text>
            <Stack direction="row" gap={3}>
              <Text variant="micro" mono tone={v.margin >= 42 ? "success" : "subtle"}>{v.margin}% margin</Text>
              <Text variant="micro" mono tone="subtle">${v.landedCost.toFixed(2)} landed</Text>
            </Stack>
          </Stack>
        ))}
      </div>
    </Card>
  );

  // ── Detail panels ───────────────────────────────────────────────────────────
  const GapDetail = activeGap && (
    <Card sx={formCardSx}>
      <Stack direction="column" gap={3}>
        <Stack direction="row" justify="space-between" align="flex-start" gap={3} wrap>
          <Stack direction="row" gap={2} align="center" wrap>
            <Badge variant="subtle" size="small" color={PRIORITY_BADGE[activeGap.priority]} label={`${PRIORITY_LABEL[activeGap.priority]} priority`} />
            <Badge variant="subtle" size="small" color="info" label={activeGap.type} />
          </Stack>
          <Button variant="secondary" size="small" type="destructive" onClick={() => deleteGap(activeGap.id)}>Delete gap</Button>
        </Stack>
        <Text variant="heading" tone="strong">{activeGap.desc}</Text>
        {activeGap.priceRange ? <Text variant="caption" tone="muted">Target price: {activeGap.priceRange}</Text> : null}
        {activeGap.category ? <Text variant="caption" tone="muted">Category: {activeGap.category}</Text> : null}
        <Text variant="micro" tone="subtle">Logged by {activeGap.addedBy} · {activeGap.date}</Text>

        <Card sx={{ ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none" }}>
          <Text variant="micro" tone="muted" style={{ marginBottom: "var(--sp-2)" }}>VENDOR SKUS THAT MAY ADDRESS THIS GAP</Text>
          <Stack direction="column" gap={0}>
            {vendorSkus.filter((v) => v.status !== "Declined").slice(0, 3).map((v) => (
              <Stack key={v.id} direction="row" justify="space-between" align="center" gap={2} paddingY={2} style={{ borderTop: "1px solid var(--color-border)" }}>
                <Text variant="caption" tone="default" truncate>{v.name} <Text as="span" variant="micro" tone="muted">{v.vendor}</Text></Text>
                <Badge variant="subtle" size="small" color={STATUS_BADGE[v.status]} label={v.status} />
              </Stack>
            ))}
          </Stack>
        </Card>
      </Stack>
    </Card>
  );

  const WishDetail = activeWish && (
    <Card sx={formCardSx}>
      <Stack direction="column" gap={3}>
        <Stack direction="column" gap={1}>
          <Text variant="caption" tone="teal">{activeWish.store}{activeWish.region ? ` · ${activeWish.region}` : ""}</Text>
          <Text variant="heading" tone="strong">{activeWish.item}</Text>
        </Stack>
        <Grid columns={2} gap={3}>
          {[
            { l: "Evidence", v: activeWish.evidence },
            { l: "Urgency", v: activeWish.urgency || "Medium" },
            { l: "Submitted", v: activeWish.date },
            { l: "Submitted by", v: activeWish.store },
          ].map((f) => (
            <Card key={f.l} sx={{ ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none", padding: "var(--sp-3)" }}>
              <Stack direction="column" gap={1}>
                <Text variant="micro" tone="muted">{f.l}</Text>
                <Text variant="caption" tone="default">{f.v}</Text>
              </Stack>
            </Card>
          ))}
        </Grid>
        {activeWish.note ? (
          <Card sx={{ ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none" }}>
            <Stack direction="column" gap={1}>
              <Text variant="micro" tone="muted">SUPPORTING DETAIL</Text>
              <Text variant="caption" tone="default">{activeWish.note}</Text>
            </Stack>
          </Card>
        ) : null}
        <Stack direction="row" gap={2} wrap>
          <Button variant="primary" size="medium" onClick={() => convertWishToGap(activeWish)}>Convert to line gap →</Button>
          <Button variant="secondary" size="medium" onClick={() => goTab(3)}>Find vendor SKU</Button>
        </Stack>
      </Stack>
    </Card>
  );

  const VendorDetail = activeVendor && (
    <Card sx={formCardSx}>
      <Stack direction="column" gap={3}>
        <Stack direction="row" justify="space-between" align="flex-start" gap={3} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="caption" tone="muted">{activeVendor.vendor}{activeVendor.show ? ` · ${activeVendor.show}` : ""}</Text>
            <Text variant="heading" tone="strong">{activeVendor.name}</Text>
          </Stack>
          <Badge variant="subtle" size="small" color={STATUS_BADGE[activeVendor.status]} label={activeVendor.status} />
        </Stack>
        <Grid columns={3} gap={3}>
          {[
            { l: "Landed cost", v: `$${activeVendor.landedCost.toFixed(2)}/sqft` },
            { l: "Est. margin", v: `${activeVendor.margin}%`, flag: activeVendor.margin >= 42 },
            { l: "Source", v: activeVendor.show || "Direct" },
          ].map((m) => (
            <Card key={m.l} sx={{ ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none", padding: "var(--sp-3)" }}>
              <Stack direction="column" gap={1} align="center">
                <Text variant="subheading" tone={m.flag ? "success" : "strong"}>{m.v}</Text>
                <Text variant="micro" tone="muted">{m.l}</Text>
              </Stack>
            </Card>
          ))}
        </Grid>
        <Card sx={{ ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none" }}>
          <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: "var(--sp-2)" }}>
            <Text variant="caption" tone="strong">Margin vs target (42%)</Text>
            <Text variant="caption" mono tone={activeVendor.margin >= 42 ? "success" : "error"}>{activeVendor.margin}%</Text>
          </Stack>
          <ProgressBar value={Math.min(activeVendor.margin, 100)} status={activeVendor.margin >= 42 ? "completed" : "remaining"} showTime={false} customLabel=" " />
          <Text variant="micro" tone="subtle" style={{ marginTop: "var(--sp-2)" }}>
            {activeVendor.margin >= 42 ? "Above 42% threshold — eligible for approval" : "Below 42% threshold — needs renegotiation or decline"}
          </Text>
        </Card>
        {activeVendor.status === "Shortlisted" ? (
          <Stack direction="row" gap={3} wrap>
            <Button variant="primary" size="medium" onClick={() => setVendorStatus(activeVendor.id, "Approved")} style={{ flex: 1 }}>✓ Approve for PLR</Button>
            <Button variant="secondary" size="medium" type="destructive" onClick={() => setVendorStatus(activeVendor.id, "Declined")} style={{ flex: 1 }}>✕ Decline</Button>
          </Stack>
        ) : activeVendor.status === "Approved" ? (
          <Card sx={{ ...panelSx, background: "var(--color-primary-soft)", boxShadow: "none" }}>
            <Stack direction="row" justify="space-between" align="center" gap={2} wrap>
              <Text variant="caption" tone="primary">Approved — ready for Like-Item Forecast</Text>
            </Stack>
          </Card>
        ) : null}
      </Stack>
    </Card>
  );

  // ── Split-panel scaffold for gaps / wishlist / vendor tabs ──────────────────
  const SplitPanel = ({ addLabel, onToggleAdd, list, form, detail, emptyHeading, emptyDescription }) => (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="flex-end">
        <Button variant={showAdd ? "secondary" : "primary"} size="medium" onClick={onToggleAdd}>
          {showAdd ? "✕ Cancel" : addLabel}
        </Button>
      </Stack>
      <Grid columns="320px minmax(0, 1fr)" gap={4} align="start">
        {list}
        {showAdd ? <Card sx={formCardSx}>{form}</Card> : detail || <PanelEmpty heading={emptyHeading} description={emptyDescription} />}
      </Grid>
    </Stack>
  );

  // ── Summary tab ─────────────────────────────────────────────────────────────
  const summaryMini = [
    { v: gaps.length, l: "Line gaps", tab: 1 },
    { v: wishlists.length, l: "Field wishlists", tab: 2 },
    { v: shortlisted, l: "Shortlisted", tab: 3 },
    { v: approved, l: "Approved", tab: 3 },
  ];

  const SummarySection = ({ title, count, onViewAll, table, empty }) => (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
        <Stack direction="row" gap={2} align="center">
          <Text variant="body-strong" tone="strong">{title}</Text>
          <Badge variant="subtle" size="small" color="info" label={String(count)} />
        </Stack>
        <Button variant="tertiary" size="small" onClick={onViewAll}>View all →</Button>
      </Stack>
      {count > 0 ? table : (
        <Card sx={{ ...panelSx, background: "var(--color-surface-alt)" }}>
          <Text variant="caption" tone="subtle">{empty}</Text>
        </Card>
      )}
    </Stack>
  );

  const tableProps = {
    cardContainer: true,
    rowHeight: "compact",
    domLayout: "autoHeight",
    defaultColDef: { floatingFilter: true },
    hideTableSetting: true,
    hideTableActions: true,
    pagination: false,
  };

  const panelSummary = (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={2} wrap>
          <Text variant="subheading" tone="strong">PLR cycle progress</Text>
          <Text variant="caption" tone="muted">
            <strong style={{ color: color.primary }}>{approved}</strong> approved of <strong>50</strong> SKU target
          </Text>
        </Stack>
        <div style={{ marginTop: "var(--sp-2)" }}>
          <ProgressBar value={progressPct} status={progressPct >= 100 ? "completed" : "remaining"} showTime={false} customLabel=" " />
        </div>
        <Grid columns={4} gap={3} style={{ marginTop: "var(--sp-3)" }}>
          {summaryMini.map((m) => (
            <Card
              key={m.l}
              sx={{ ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none", padding: "var(--sp-3)", cursor: "pointer" }}
              onClick={() => goTab(m.tab)}
            >
              <Stack direction="column" gap={1} align="center">
                <Text variant="kpi" tone="strong">{m.v}</Text>
                <Text variant="micro" tone="muted">{m.l}</Text>
              </Stack>
            </Card>
          ))}
        </Grid>
      </Card>

      <SummarySection
        title="Line Gaps"
        count={gaps.length}
        onViewAll={() => goTab(1)}
        empty="No gaps logged yet."
        table={<Table {...tableProps} tableHeader="Line gaps" columnDefs={gapColumns} rowData={gaps} onRowClicked={(e) => openSummaryGap(e.data.id)} />}
      />
      <SummarySection
        title="Field Wishlists"
        count={wishlists.length}
        onViewAll={() => goTab(2)}
        empty="No wishlists yet."
        table={<Table {...tableProps} tableHeader="Field wishlists" columnDefs={wishColumns} rowData={wishlists} onRowClicked={(e) => openSummaryWish(e.data.id)} />}
      />
      <SummarySection
        title="Vendor SKUs"
        count={vendorSkus.length}
        onViewAll={() => goTab(3)}
        empty="No vendor SKUs yet."
        table={<Table {...tableProps} tableHeader="Vendor SKUs" columnDefs={vendorColumns} rowData={vendorSkus} onRowClicked={(e) => openSummaryVendor(e.data.id)} />}
      />

      {approved > 0 ? (
        <Card sx={{ ...panelSx, background: "var(--color-primary-soft)" }}>
          <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
            <Text variant="caption" tone="primary">
              <strong>{approved} SKU{approved > 1 ? "s" : ""} approved</strong> and ready to advance to Like-Item Forecasting
            </Text>
            <Button variant="primary" size="medium" onClick={() => onNavigate?.("forecast")}>Advance to Forecast →</Button>
          </Stack>
        </Card>
      ) : null}
    </Stack>
  );

  const panelGaps = (
    <SplitPanel
      addLabel="+ Add Gap"
      onToggleAdd={() => { setShowAdd((s) => !s); setActiveGapId(null); }}
      list={GapList}
      form={<GapForm onSave={saveGap} onCancel={() => setShowAdd(false)} />}
      detail={GapDetail}
      emptyHeading="Select a gap to view details"
      emptyDescription="Or click “+ Add Gap” to log a new one. Gaps feed vendor briefs and trade-show targets."
    />
  );
  const panelWishlist = (
    <SplitPanel
      addLabel="+ Submit Wishlist"
      onToggleAdd={() => { setShowAdd((s) => !s); setActiveWishId(null); }}
      list={WishList}
      form={<WishForm onSave={saveWish} onCancel={() => setShowAdd(false)} />}
      detail={WishDetail}
      emptyHeading="Select a wishlist to view details"
      emptyDescription="Or click “+ Submit Wishlist” to add a field request from a store or DMM."
    />
  );
  const panelVendor = (
    <SplitPanel
      addLabel="+ Add Vendor SKU"
      onToggleAdd={() => { setShowAdd((s) => !s); setActiveVendorId(null); }}
      list={VendorListPanel}
      form={<VendorForm onSave={saveVendor} onCancel={() => setShowAdd(false)} />}
      detail={VendorDetail}
      emptyHeading="Select a vendor SKU to review"
      emptyDescription="Or click “+ Add Vendor SKU” to log one from a trade show or direct source."
    />
  );

  const TAB_NAMES = [
    { value: 0, label: `All Items (${gaps.length + wishlists.length + vendorSkus.length})` },
    { value: 1, label: `Line Gaps (${gaps.length})` },
    { value: 2, label: `Field Wishlist (${wishlists.length})` },
    { value: 3, label: `Vendor SKUs (${vendorSkus.length})` },
  ];

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Phase 1 — Portfolio Build</Text>
            <Text variant="caption" tone="muted">
              Merchant-owned · Gap identification · Field wishlists · Vendor &amp; trade-show sourcing · Target: 30–50 new SKUs
            </Text>
          </Stack>
          <Stack direction="row" gap={2} align="center" wrap justify="flex-end">
            <Badge variant="subtle" size="small" color="success" label="FW 2025 · TILE PLR" />
            <Badge variant="subtle" size="small" color="warning" label="Atlanta review: Jun 15" />
          </Stack>
        </Stack>
      </Card>

      {/* ── KPI strip (clickable → tab) ────────────────────────────────────── */}
      <Grid min={170} gap={3}>
        {kpis.map((k) => (
          <Card
            key={k.label}
            sx={{ ...panelSx, padding: "var(--sp-3)", cursor: k.tab != null ? "pointer" : "default" }}
            onClick={k.tab != null ? () => goTab(k.tab) : undefined}
          >
            <Stack direction="column" gap={1}>
              <Text variant="overline" tone="muted">{k.label}</Text>
              <Text variant="kpi" tone="strong">{k.value}</Text>
              <Text variant="caption" tone="subtle">{k.sub}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      {/* ── Tabbed content ─────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={(_e, v) => goTab(v)}
        tabNames={TAB_NAMES}
        tabPanels={[panelSummary, panelGaps, panelWishlist, panelVendor]}
      />
    </Stack>
  );
}
