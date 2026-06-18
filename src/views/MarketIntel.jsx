import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, Button, Badge, Input, TextArea, EmptyState, Chips, FiltersStrip, FilterPanel } from "impact-ui";
import { Bot, ClipboardList, Lock } from "lucide-react";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import SkuSwatch from "../components/SkuSwatch.jsx";
import {
  INTEL_SEED,
  CATALOGUE_SKUS,
  CLUSTER_NAMES,
  TYPE_OPTIONS,
  DIRECTION_OPTIONS,
  URGENCY_OPTIONS,
  SCOPE_OPTIONS,
  CONFIDENCE_OPTIONS,
  TYPE_BADGE,
  DIR_BADGE,
  URGENCY_BADGE,
  STATUS_BADGE,
} from "../data/intel.js";
import { popIntelHighlight } from "../data/intelStore.js";
import "./MarketIntel.css";
import { panelSx, softSx } from "../styles/panelSx.js";

const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };
const sidebarSx = { ...paneSx, width: "288px", minWidth: "288px", flexShrink: 0, alignSelf: "flex-start" };
const railSx = { ...paneSx };

const EMPTY_LOG = { type: null, direction: null, urgency: null, scope: null, title: "", body: "", skus: [], confidence: null, skuPick: "", submitted: false };

/* Soft tint per signal type — drives the compact tag pills. */
const TYPE_TINT = {
  competitive: { bg: "var(--color-error-soft)", fg: "var(--color-error)" },
  market: { bg: "var(--color-info-soft)", fg: "var(--color-info)" },
  customer: { bg: "var(--color-success-soft)", fg: "var(--color-success)" },
  product: { bg: "var(--color-warning-soft)", fg: "var(--color-warning)" },
  supply: { bg: "var(--color-error-soft)", fg: "var(--color-error)" },
  trend: { bg: "var(--color-info-soft)", fg: "var(--color-info)" },
};

/* Tag pill — replaces the badge stacks with a quieter, premium token. */
function Tag({ tint, children }) {
  return <span className="mi-tag" style={tint ? { background: tint.bg, color: tint.fg } : undefined}>{children}</span>;
}

/* SKU code → catalogue name, so the chip can render a material-accurate swatch. */
const CAT_NAME = Object.fromEntries(CATALOGUE_SKUS.map((s) => [s.id, s.name]));

/* SKU reference chip with a product-look thumbnail. */
function SkuChip({ children }) {
  const code = typeof children === "string" ? children : "";
  const name = CAT_NAME[code] || code;
  return (
    <Stack direction="row" align="center" gap={1} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--r2)", background: "var(--color-surface)", padding: "2px 7px 2px 3px" }}>
      <SkuSwatch desc={name} size={16} />
      <Text variant="micro" mono style={{ color: "var(--color-accent)" }}>{code}</Text>
    </Stack>
  );
}

/* Soft callout box used in the detail panel. */
function NoteBox({ tone, label, children }) {
  const bg = { warning: "var(--color-warning-soft)", teal: "var(--color-surface-alt)", accent: "var(--color-primary-soft)" }[tone] || "var(--color-surface-alt)";
  const bd = { warning: "var(--color-warning)", teal: "var(--color-teal)", accent: "var(--color-primary)" }[tone] || "var(--color-border)";
  return (
    <Stack direction="column" gap={1} paddingX={3} paddingY={2} style={{ background: bg, border: `1px solid ${bd}`, borderRadius: "var(--r2)" }}>
      <Text variant="micro" tone={tone === "warning" ? "warning" : "teal"} style={{ fontWeight: 700 }}>{label}</Text>
      <Text variant="caption" tone="default" style={{ lineHeight: 1.6 }}>{children}</Text>
    </Stack>
  );
}

export default function MarketIntel() {
  const [view, setView] = useState("inbox");
  const [intel, setIntel] = useState(INTEL_SEED);
  const [statusTab, setStatusTab] = useState("all");
  const [dirFilter, setDirFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [selectedId, setSelectedId] = useState(INTEL_SEED[0]?.id ?? null);
  const [noteDraft, setNoteDraft] = useState("");
  const [log, setLog] = useState(EMPTY_LOG);
  const [fromPortfolio, setFromPortfolio] = useState(null); // id that arrived via Portfolio Build chip
  const highlightedRowRef = useRef(null);

  /* ── Filter panel state ───────────────────────────────────────────────── */
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("status");

  /* On mount: check if we were navigated here from Portfolio Build with a
     specific intel item to highlight. popIntelHighlight() clears the store
     after reading so the highlight is one-shot only. */
  useEffect(() => {
    const id = popIntelHighlight();
    if (id) {
      setSelectedId(id);
      setFromPortfolio(id);
      setStatusTab("all");      // clear any active filter so the item is visible
      setDirFilter(null);
      setTypeFilter(null);
      const it = INTEL_SEED.find((i) => i.id === id);
      if (it) setNoteDraft(it.merchantNote || "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Scroll the highlighted row into view once it's rendered */
  useEffect(() => {
    if (fromPortfolio && highlightedRowRef.current) {
      highlightedRowRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [fromPortfolio]);

  const selected = useMemo(() => intel.find((i) => i.id === selectedId) || null, [intel, selectedId]);

  const filtered = useMemo(
    () =>
      intel.filter((i) => {
        if (statusTab !== "all" && i.status !== statusTab) return false;
        if (dirFilter && i.direction !== dirFilter) return false;
        if (typeFilter && i.type !== typeFilter) return false;
        return true;
      }),
    [intel, statusTab, dirFilter, typeFilter]
  );

  /* ── Metrics ──────────────────────────────────────────────────────────── */
  const total = intel.length;
  const newCount = intel.filter((i) => i.status === "new").length;
  const threats = intel.filter((i) => i.direction === "threat").length;
  const opps = intel.filter((i) => i.direction === "opportunity").length;
  const feedModel = intel.filter((i) => i.feedsModel).length;
  const metrics = [
    { v: total, l: "Total signals", tone: "strong" },
    { v: newCount, l: "Awaiting review", tone: "error" },
    { v: threats, l: "Threat signals", tone: "error" },
    { v: opps, l: "Opportunities", tone: "success" },
    { v: feedModel, l: "Feed model", tone: "accent" },
  ];

  /* ── Mutations ────────────────────────────────────────────────────────── */
  const patch = (id, fields) => setIntel((prev) => prev.map((i) => (i.id === id ? { ...i, ...fields } : i)));
  const selectIntel = (id) => { setSelectedId(id); const it = intel.find((i) => i.id === id); setNoteDraft(it?.merchantNote || ""); };
  const saveNote = (id) => patch(id, { merchantNote: noteDraft });

  /* ── Filter handlers ──────────────────────────────────────────────────── */
  const setStatus = (key) => { setStatusTab(key); setDirFilter(null); setTypeFilter(null); };
  const toggleDir = (key) => { setDirFilter((d) => (d === key ? null : key)); setStatusTab("all"); };
  const toggleType = (key) => { setTypeFilter((t) => (t === key ? null : key)); setStatusTab("all"); };

  /* ── Log form ─────────────────────────────────────────────────────────── */
  const setLogField = (key, val) => setLog((p) => ({ ...p, [key]: p[key] === val ? null : val }));
  const addSku = () => setLog((p) => (p.skuPick && !p.skus.includes(p.skuPick) ? { ...p, skus: [...p.skus, p.skuPick], skuPick: "" } : p));
  const removeSku = (s) => setLog((p) => ({ ...p, skus: p.skus.filter((x) => x !== s) }));
  const submitLog = () => {
    if (!log.type || !log.direction || !log.title.trim() || !log.body.trim()) return;
    const entry = {
      id: `I-${String(100 + intel.length + 1)}`,
      type: log.type, direction: log.direction, urgency: log.urgency || "watch", scope: log.scope || "store",
      cluster: "Southeast Suburban", store: "ATL-01", title: log.title, body: log.body,
      skus: [...log.skus], categories: [], confidence: log.confidence || "anecdotal",
      modelInstruction: log.skus.length ? `Signal logged: ${log.type} / ${log.direction}. Affects ${log.skus.join(", ")}. Pending merchant review before model update.` : null,
      feedsModel: !!log.skus.length, status: "new", author: "Lisa T.", authorRole: "Store Manager", date: "Jun 3, 2025", escalated: false, merchantNote: "",
    };
    setIntel((prev) => [entry, ...prev]);
    setLog({ ...EMPTY_LOG, submitted: true });
  };

  /* ── Chip (filter / tab) — removed; now using Impact UI Chips directly ── */

  const countBy = (pred) => intel.filter(pred).length;

  /* ── Derived filter tags for FiltersStrip ─────────────────────────────── */
  const miFilterTags = useMemo(() => {
    const tags = [];
    if (statusTab !== "all") tags.push({ id: "status", label: "Status", values: [{ id: 1, label: statusTab }] });
    if (dirFilter) tags.push({ id: "dir", label: "Direction", values: [{ id: 1, label: dirFilter }] });
    if (typeFilter) {
      const opt = TYPE_OPTIONS.find((t) => t.id === typeFilter);
      tags.push({ id: "type", label: "Type", values: [{ id: 1, label: opt?.label || typeFilter }] });
    }
    return tags;
  }, [statusTab, dirFilter, typeFilter]);

  /* ── FilterPanel tabs ─────────────────────────────────────────────────── */
  const STATUS_FD_OPTIONS = [
    { value: "all", label: `All (${intel.length})` },
    { value: "new", label: `New (${newCount})` },
    { value: "reviewed", label: `Reviewed (${countBy((i) => i.status === "reviewed")})` },
    { value: "actioned", label: `Actioned (${countBy((i) => i.status === "actioned")})` },
  ];
  const DIR_FD_OPTIONS = [
    { value: "threat", label: `Threats (${threats})` },
    { value: "opportunity", label: `Opps (${opps})` },
  ];
  const TYPE_FD_OPTIONS = TYPE_OPTIONS.map((t) => ({ value: t.id, label: t.label }));

  const miFilterPanelTabs = [
    {
      value: "status",
      title: "Status",
      numberOfFilter: statusTab !== "all" ? 1 : 0,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect
            label="Signal Status"
            value={statusTab}
            options={STATUS_FD_OPTIONS}
            onChange={(v) => setStatus(v)}
            width={320}
          />
        </Stack>
      ),
    },
    {
      value: "direction",
      title: "Direction",
      numberOfFilter: dirFilter ? 1 : 0,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect
            label="Direction"
            value={dirFilter || ""}
            options={[{ value: "", label: "All directions" }, ...DIR_FD_OPTIONS]}
            onChange={(v) => { if (v === "") setDirFilter(null); else setDirFilter(v); }}
            width={320}
          />
        </Stack>
      ),
    },
    {
      value: "type",
      title: "Type",
      numberOfFilter: typeFilter ? 1 : 0,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect
            label="Signal Type"
            value={typeFilter || ""}
            options={[{ value: "", label: "All types" }, ...TYPE_FD_OPTIONS]}
            onChange={(v) => { if (v === "") setTypeFilter(null); else setTypeFilter(v); }}
            width={320}
          />
        </Stack>
      ),
    },
  ];

  /* ═══════════════ SIDEBAR ═══════════════ */
  const sidebar = (
    <Card sx={sidebarSx} className="mi-sidebar">
      <Stack direction="column" style={{ height: "100%" }}>

        <div className="mi-list" style={{ flex: 1, padding: "8px 8px" }}>
          {filtered.length === 0 ? (
            <Stack paddingY={5} align="center"><Text variant="caption" tone="subtle">No signals match current filters.</Text></Stack>
          ) : (
            <Stack direction="column" gap={1}>
              {filtered.map((i) => (
                <Stack
                  key={i.id}
                  ref={i.id === fromPortfolio ? highlightedRowRef : undefined}
                  className={`mi-list-row${selectedId === i.id ? " is-active" : ""}${i.id === fromPortfolio ? " is-from-portfolio" : ""}`}
                  direction="row" gap={2} align="flex-start" paddingX={2} paddingY={2}
                  onClick={() => selectIntel(i.id)}
                >
                  <span className={`mi-dir-dot is-${i.direction}`} aria-hidden>{i.direction === "threat" ? "↓" : "↑"}</span>
                  <Stack direction="column" gap={1} style={{ minWidth: 0, flex: 1 }}>
                    <Text variant="caption" tone="default" className="mi-clamp-2" style={{ lineHeight: 1.35 }}>{i.title}</Text>
                    <Stack direction="row" gap={1} align="center" wrap>
                      <Tag tint={TYPE_TINT[i.type]}>{i.type}</Tag>
                      {i.status === "new" ? <span className="mi-new-dot" title="New" /> : null}
                      <Text variant="micro" tone="subtle">{i.date}</Text>
                    </Stack>
                  </Stack>
                </Stack>
              ))}
            </Stack>
          )}
        </div>

        <Stack paddingX={3} paddingY={3} style={{ borderTop: "1px solid var(--color-border)" }}>
          <Button variant="primary" size="medium" onClick={() => { setView("log"); setLog(EMPTY_LOG); }} style={{ width: "100%" }}>+ Log new intelligence</Button>
        </Stack>
      </Stack>
    </Card>
  );

  /* ═══════════════ STAT RAIL ═══════════════ */
  const statRail = (
    <Card sx={railSx}>
      <div className="mi-stat-rail">
        {metrics.map((m) => (
          <div key={m.l} className="mi-stat">
            <span className={`mi-stat-accent tone-${m.tone}`} />
            <span className={`mi-stat-num tone-${m.tone}`}>{m.v}</span>
            <span className="mi-stat-label">{m.l}</span>
          </div>
        ))}
      </div>
    </Card>
  );

  /* ═══════════════ SIGNAL DETAIL (master-detail right pane) ═══════════════ */
  const signalDetail = (i) => {
    const isThreat = i.direction === "threat";
    const meta = [
      ["Author", `${i.author} · ${i.authorRole}`],
      ["Date", i.date],
      ["Scope", `${i.scope}${i.store ? ` · ${i.store}` : ""}${i.cluster ? ` / ${i.cluster}` : ""}`],
      ["Confidence", i.confidence],
    ];
    return (
      <Card sx={panelSx} className={`mi-detail-pane is-${i.direction}`}>
        <Stack direction="column" gap={4}>
          {/* Title row */}
          <Stack direction="row" gap={3} align="flex-start">
            <span className={`mi-medallion lg is-${i.direction}`} aria-hidden>{isThreat ? "↓" : "↑"}</span>
            <Stack direction="column" gap={2} style={{ minWidth: 0, flex: 1 }}>
              <Text variant="heading" tone="strong" style={{ lineHeight: 1.3 }}>{i.title}</Text>
              <Stack direction="row" gap={1} wrap align="center">
                <Tag tint={TYPE_TINT[i.type]}>{i.type}</Tag>
                <Tag tint={isThreat ? TYPE_TINT.competitive : TYPE_TINT.customer}>{i.direction}</Tag>
                {i.urgency !== "watch" ? <span className="mi-tag mi-tag--gap" style={i.urgency === "immediate" ? { background: "var(--color-error-soft)", color: "var(--color-error)" } : undefined}>{i.urgency}</span> : null}
                {i.feedsModel ? <span className="mi-tag mi-tag--model"><Bot size={11} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 3 }} />feeds model</span> : null}
                {i.catalogueGap ? <span className="mi-tag mi-tag--gap">catalogue gap</span> : null}
                {i.id === fromPortfolio && (
                  <span className="mi-tag mi-tag--portfolio"><ClipboardList size={11} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 3 }} />via Portfolio Build</span>
                )}
              </Stack>
            </Stack>
            <Badge variant="subtle" size="small" color={STATUS_BADGE[i.status]} label={i.status} />
          </Stack>

          {/* Two-column body / context */}
          <div className="mi-detail-grid">
            <Stack direction="column" gap={3} style={{ minWidth: 0 }}>
              <Text variant="body" tone="default" className="mi-body-measure">{i.body}</Text>
              <TextArea placeholder="Merchant note…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} width="100%" height="72px" />
            </Stack>

            <Stack direction="column" gap={3} className="mi-detail-aside">
              <div className="mi-meta-card">
                {meta.map(([l, v]) => (
                  <Stack key={l} direction="row" justify="space-between" gap={2} className="mi-meta-row">
                    <Text variant="micro" tone="subtle">{l}</Text>
                    <Text variant="micro" tone="default" style={{ fontWeight: 600, textAlign: "right" }}>{v}</Text>
                  </Stack>
                ))}
              </div>
              {i.skus.length ? (
                <Stack direction="row" gap={1} wrap>{i.skus.map((s) => <SkuChip key={s}>{s}</SkuChip>)}</Stack>
              ) : null}
              {i.feedsModel && i.modelInstruction ? <NoteBox tone="accent" label="Model instruction">{i.modelInstruction}</NoteBox> : null}
              {i.catalogueGap ? <NoteBox tone="warning" label="Catalogue gap">{i.catalogueRequest}</NoteBox> : null}
              {i.merchantNote ? <NoteBox tone="teal" label="Merchant note">{i.merchantNote}</NoteBox> : null}
            </Stack>
          </div>

          {/* Actions */}
          <Stack direction="row" gap={2} wrap align="center" style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--sp-3)" }}>
            {(i.status === "new" || i.status === "reviewed") && i.feedsModel ? <Button variant="primary" size="small" onClick={() => patch(i.id, { status: "actioned" })}>🤖 Apply tags to model</Button> : null}
            {(i.status === "new" || i.status === "reviewed") && i.catalogueGap ? <Button variant="secondary" size="small" onClick={() => patch(i.id, { status: "actioned" })}>Create catalogue task</Button> : null}
            {i.status === "new" ? <Button variant="secondary" size="small" onClick={() => patch(i.id, { status: "reviewed" })}>Mark reviewed</Button> : null}
            {i.status !== "actioned" ? <Button variant="secondary" size="small" onClick={() => saveNote(i.id)}>Save note</Button> : null}
            <Button variant="secondary" size="small" onClick={() => patch(i.id, { status: "watching" })}>Watch</Button>
            <Button variant="secondary" size="small" type="destructive" onClick={() => patch(i.id, { status: "dismissed" })}>Dismiss</Button>
          </Stack>
        </Stack>
      </Card>
    );
  };

  /* ═══════════════ INBOX (master-detail) ═══════════════ */
  const inbox = (
    <Stack direction="column" gap={3}>
      {statRail}
      {selected ? (
        signalDetail(selected)
      ) : (
        <Card sx={softSx}>
          <EmptyState heading="No signal selected" />
        </Card>
      )}
    </Stack>
  );

  /* ═══════════════ LOG FORM ═══════════════ */
  const ChoiceGrid = ({ field, options, columns }) => (
    <Grid columns={columns} gap={2}>
      {options.map((o) => (
        <Stack key={o.id} className={`mi-choice${log[field] === o.id ? " is-selected" : ""}`} direction="column" gap={0} onClick={() => setLogField(field, o.id)}>
          <Text variant="caption" tone="strong">{o.label}</Text>
          {o.desc ? <Text variant="micro" tone="subtle">{o.desc}</Text> : null}
        </Stack>
      ))}
    </Grid>
  );

  const FormSection = ({ label, required, children }) => (
    <Stack direction="column" gap={2}>
      <Text variant="caption" tone="muted" style={{ fontWeight: 600 }}>{label}{required ? <Text as="span" variant="caption" tone="error"> *</Text> : null}</Text>
      {children}
    </Stack>
  );

  const feedsModelPreview = log.type && log.direction && log.skus.length > 0;
  const logForm = log.submitted ? (
    <Card sx={panelSx}>
      <Stack direction="column" gap={3} align="center" paddingY={5}>
        <Text variant="display">✅</Text>
        <Text variant="heading" tone="strong">Intel logged</Text>
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>Your signal is in the merchant inbox. Structured tags will feed the agent model at the next refresh.</Text>
        <Stack direction="row" gap={2}>
          <Button variant="primary" size="medium" onClick={() => setLog(EMPTY_LOG)}>Log another signal</Button>
          <Button variant="secondary" size="medium" onClick={() => setView("inbox")}>Back to inbox</Button>
        </Stack>
      </Stack>
    </Card>
  ) : (
    <Grid columns="1fr 340px" gap={3}>
      <Card sx={panelSx}>
        <Stack direction="column" gap={4}>
          <FormSection label="Signal type" required><ChoiceGrid field="type" options={TYPE_OPTIONS} columns={2} /></FormSection>
          <FormSection label="Direction" required><ChoiceGrid field="direction" options={DIRECTION_OPTIONS} columns={2} /></FormSection>
          <FormSection label="Urgency"><ChoiceGrid field="urgency" options={URGENCY_OPTIONS} columns={4} /></FormSection>
          <FormSection label="Scope"><ChoiceGrid field="scope" options={SCOPE_OPTIONS} columns={4} /></FormSection>
          <FormSection label="Title" required>
            <Input placeholder="One-line description — e.g. Competitor opening 2 blocks away Q3" value={log.title} onChange={(e) => setLog((p) => ({ ...p, title: e.target.value }))} fullWidth />
          </FormSection>
          <FormSection label="What you observed" required>
            <TextArea placeholder="The full picture — who, what, where, when. This stays human-read only; only the structured tags above feed the agent model." value={log.body} onChange={(e) => setLog((p) => ({ ...p, body: e.target.value }))} width="100%" height="110px" />
          </FormSection>
          <FormSection label="Affected SKUs (optional)">
            {log.skus.length ? <Stack direction="row" gap={1} wrap>{log.skus.map((s) => (
              <Stack key={s} direction="row" align="center" gap={1} paddingX={2} style={{ border: "1px solid var(--color-accent)", borderRadius: "var(--r2)" }}>
                <Text variant="micro" mono style={{ color: "var(--color-accent)" }}>{s}</Text>
                <Text variant="micro" tone="subtle" style={{ cursor: "pointer" }} onClick={() => removeSku(s)}>×</Text>
              </Stack>
            ))}</Stack> : null}
            <Stack direction="row" gap={2} align="flex-end">
              <FdSelect value={log.skuPick} options={[{ value: "", label: "Select a catalogue SKU…" }, ...CATALOGUE_SKUS.filter((s) => !log.skus.includes(s.id)).map((s) => ({ value: s.id, label: s.name }))]} onChange={(v) => setLog((p) => ({ ...p, skuPick: v }))} width={360} />
              <Button variant="secondary" size="medium" onClick={addSku}>Add</Button>
            </Stack>
            <Text variant="micro" tone="subtle">SKU references enable per-product confidence updates.</Text>
          </FormSection>
          <FormSection label="Confidence level"><ChoiceGrid field="confidence" options={CONFIDENCE_OPTIONS} columns={3} /></FormSection>
          <Stack direction="row" gap={2}>
            <Button variant="primary" size="medium" onClick={submitLog} style={{ flex: 1 }}>Log intelligence →</Button>
            <Button variant="secondary" size="medium" onClick={() => setView("inbox")}>Cancel</Button>
          </Stack>
        </Stack>
      </Card>

      <Card sx={softSx}>
        <Stack direction="column" gap={3}>
          {!log.type && !log.direction ? null : (
            <Stack direction="column" gap={2}>
              <Stack direction="row" gap={1} wrap>
                {log.type ? <Badge variant="subtle" size="small" color={TYPE_BADGE[log.type]} label={log.type} /> : null}
                {log.direction ? <Badge variant="subtle" size="small" color={DIR_BADGE[log.direction]} label={log.direction} /> : null}
                {log.urgency ? <Badge variant="subtle" size="small" color={URGENCY_BADGE[log.urgency]} label={log.urgency} /> : null}
                {log.scope ? <Badge variant="subtle" size="small" color="default" label={log.scope} /> : null}
              </Stack>
              {log.title ? <Text variant="caption" tone="strong">{log.title}</Text> : null}
              {log.body ? <Text variant="micro" tone="muted" style={{ lineHeight: 1.5 }}>{log.body.slice(0, 200)}{log.body.length > 200 ? "…" : ""}</Text> : null}
              {log.skus.length ? <Stack direction="row" gap={1} wrap>{log.skus.map((s) => <SkuChip key={s}>{s}</SkuChip>)}</Stack> : null}
            </Stack>
          )}
          {feedsModelPreview ? (
            <NoteBox tone="accent" label="Model tags">
              {log.direction === "threat" ? "Reduce" : "Boost"} confidence for {log.skus.join(", ")} at {log.scope || "specified"} level.
            </NoteBox>
          ) : null}
        </Stack>
      </Card>
    </Grid>
  );

  /* ═══════════════ MAP ═══════════════ */
  const clusterData = useMemo(() => {
    const data = {};
    CLUSTER_NAMES.forEach((c) => { data[c] = { threats: 0, opps: 0, signals: [] }; });
    intel.forEach((i) => {
      const targets = i.scope === "national" ? CLUSTER_NAMES : i.cluster ? [i.cluster] : [];
      targets.forEach((t) => { if (data[t]) { data[t][i.direction === "threat" ? "threats" : "opps"]++; data[t].signals.push(i); } });
    });
    return data;
  }, [intel]);

  const mapView = (
    <Stack direction="column" gap={3}>
      <Stack direction="row" justify="flex-end" align="center" wrap gap={2}>
        <Badge variant="subtle" size="small" color="error" label="Threat" />
        <Badge variant="subtle" size="small" color="success" label="Opportunity" />
        <Badge variant="subtle" size="small" color="info" label="Feeds model" />
      </Stack>
      <Grid columns={2} gap={3}>
        {CLUSTER_NAMES.map((cn) => {
          const cd = clusterData[cn];
          const totalSig = cd.signals.length;
          const urgImmediate = cd.signals.filter((s) => s.urgency === "immediate").length;
          const threatPct = totalSig > 0 ? Math.round((cd.threats / totalSig) * 100) : 0;
          return (
            <Card key={cn} sx={{ ...panelSx, borderLeft: `3px solid ${cd.threats > 0 ? "var(--color-error)" : "var(--color-success)"}` }}>
              <Stack direction="column" gap={2}>
                <Stack direction="row" justify="space-between" align="center" gap={2}>
                  <Text variant="body-strong" tone="strong">{cn}</Text>
                  <Stack direction="row" gap={2} align="center">
                    {urgImmediate ? <Badge variant="subtle" size="small" color="error" label={`${urgImmediate} immediate`} /> : null}
                    <Text variant="micro" tone="subtle">{totalSig} signal{totalSig !== 1 ? "s" : ""}</Text>
                  </Stack>
                </Stack>
                <Stack direction="row" gap={2}>
                  <Stack direction="column" align="center" paddingX={3} paddingY={1} style={{ background: "var(--color-error-soft)", borderRadius: "var(--r2)", minWidth: 56 }}>
                    <Text variant="kpi" tone="error">{cd.threats}</Text>
                    <Text variant="micro" tone="error">T</Text>
                  </Stack>
                  <Stack direction="column" align="center" paddingX={3} paddingY={1} style={{ background: "var(--color-success-soft)", borderRadius: "var(--r2)", minWidth: 56 }}>
                    <Text variant="kpi" tone="success">{cd.opps}</Text>
                    <Text variant="micro" tone="success">O</Text>
                  </Stack>
                  <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                    {cd.signals.slice(0, 2).map((s) => (
                      <Text key={s.id} variant="micro" tone="muted" truncate style={{ cursor: "pointer" }} onClick={() => { selectIntel(s.id); setView("inbox"); }}>{s.title}</Text>
                    ))}
                    {cd.signals.length > 2 ? <Text variant="micro" tone="subtle">+{cd.signals.length - 2} more</Text> : null}
                  </Stack>
                </Stack>
                {totalSig > 0 ? (
                  <div className="mi-bar">
                    <div className="mi-bar-threat" style={{ width: `${threatPct}%` }} />
                    <div className="mi-bar-opp" style={{ flex: 1 }} />
                  </div>
                ) : null}
              </Stack>
            </Card>
          );
        })}
      </Grid>
    </Stack>
  );

  /* ═══════════════ SHELL ═══════════════ */
  return (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Market Intelligence</Text>
          </Stack>
          <Stack direction="row" gap={2} wrap>
            <Chips label="Inbox" isActive={view === "inbox"} onClick={() => setView("inbox")} />
            <Chips label="Signal map" isActive={view === "map"} onClick={() => setView("map")} />
          </Stack>
        </Stack>
      </Card>

      <FiltersStrip
        filterTags={miFilterTags}
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
        title="Signal Filters"
        size="medium"
        anchor="right"
        isOpen={filterPanelOpen}
        setIsOpen={setFilterPanelOpen}
        active={activeFilterTab}
        setActive={setActiveFilterTab}
        filters={miFilterPanelTabs}
        primaryButtonLabel="Apply"
        onPrimaryButtonClick={() => setFilterPanelOpen(false)}
        secondaryButtonLabel="Clear all"
        onSecondaryButtonClick={() => { setStatus("all"); setDirFilter(null); setTypeFilter(null); }}
      />

      <Stack direction="row" gap={3} align="flex-start" wrap>
        {view !== "log" ? sidebar : null}
        <div style={{ flex: 1, minWidth: 0 }}>
          {view === "inbox" ? inbox : view === "log" ? logForm : mapView}
        </div>
      </Stack>
    </Stack>
  );
}
