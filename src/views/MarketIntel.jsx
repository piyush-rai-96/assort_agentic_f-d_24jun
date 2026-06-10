import React, { useMemo, useState } from "react";
import { Card, Button, Badge, Input, TextArea, EmptyState } from "impact-ui";
import FdSelect from "../components/FdSelect.jsx";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
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
import "./MarketIntel.css";

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
const softSx = { ...panelSx, background: "var(--color-surface-alt)", boxShadow: "none" };
const paneSx = { ...panelSx, padding: 0, overflow: "hidden" };
const sidebarSx = { ...paneSx, width: "252px", minWidth: "252px", flexShrink: 0, alignSelf: "flex-start" };
const detailSx = { ...paneSx, width: "340px", minWidth: "340px", flexShrink: 0, alignSelf: "flex-start" };

const EMPTY_LOG = { type: null, direction: null, urgency: null, scope: null, title: "", body: "", skus: [], confidence: null, skuPick: "", submitted: false };

/* SKU reference chip. */
function SkuChip({ children }) {
  return (
    <Stack direction="row" align="center" gap={1} paddingX={2} style={{ border: "1px solid var(--color-accent)", borderRadius: "var(--r2)", background: "var(--color-surface)" }}>
      <Text variant="micro" mono style={{ color: "var(--color-accent)" }}>{children}</Text>
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
  const [selectedId, setSelectedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [log, setLog] = useState(EMPTY_LOG);

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
    { v: total, l: "Total signals", sub: "logged", tone: "strong" },
    { v: newCount, l: "Awaiting review", sub: "needs action", tone: "error" },
    { v: threats, l: "Threat signals", sub: "risk to sales", tone: "error" },
    { v: opps, l: "Opportunities", sub: "to sell more", tone: "success" },
    { v: feedModel, l: "Feed model", sub: "structured tags", tone: "accent" },
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

  /* ── Chip (filter / tab) ──────────────────────────────────────────────── */
  const Chip = ({ active, onClick, children }) => (
    <Button variant={active ? "primary" : "secondary"} size="small" onClick={onClick}>{children}</Button>
  );

  const countBy = (pred) => intel.filter(pred).length;

  /* ═══════════════ SIDEBAR ═══════════════ */
  const sidebar = (
    <Card sx={sidebarSx} className="mi-sidebar">
      <Stack direction="column" style={{ height: "100%" }}>
        <Stack direction="column" gap={2} paddingX={3} paddingY={3} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Text variant="overline" tone="muted">Filters</Text>
          <Stack direction="row" gap={2} wrap>
            <Chip active={statusTab === "all" && !dirFilter && !typeFilter} onClick={() => setStatus("all")}>All {total}</Chip>
            <Chip active={statusTab === "new"} onClick={() => setStatus("new")}>New {newCount}</Chip>
            <Chip active={statusTab === "reviewed"} onClick={() => setStatus("reviewed")}>Reviewed {countBy((i) => i.status === "reviewed")}</Chip>
            <Chip active={statusTab === "actioned"} onClick={() => setStatus("actioned")}>Actioned {countBy((i) => i.status === "actioned")}</Chip>
          </Stack>
          <Stack direction="row" gap={2} wrap>
            <Chip active={dirFilter === "threat"} onClick={() => toggleDir("threat")}>Threats {threats}</Chip>
            <Chip active={dirFilter === "opportunity"} onClick={() => toggleDir("opportunity")}>Opps {opps}</Chip>
          </Stack>
          <Stack direction="row" gap={1} wrap>
            {TYPE_OPTIONS.map((t) => (
              <Chip key={t.id} active={typeFilter === t.id} onClick={() => toggleType(t.id)}>{t.label.split(" ")[0]}</Chip>
            ))}
          </Stack>
        </Stack>

        <div className="mi-list" style={{ flex: 1, padding: "8px 8px" }}>
          {filtered.length === 0 ? (
            <Stack paddingY={5} align="center"><Text variant="caption" tone="subtle">No signals match current filters.</Text></Stack>
          ) : (
            <Stack direction="column" gap={1}>
              <Text variant="micro" tone="subtle" style={{ padding: "0 4px" }}>{filtered.length} signal{filtered.length !== 1 ? "s" : ""}</Text>
              {filtered.map((i) => (
                <Stack key={i.id} className={`mi-list-row${selectedId === i.id ? " is-active" : ""}`} direction="column" gap={1} paddingX={2} paddingY={2} onClick={() => selectIntel(i.id)}>
                  <Stack direction="row" justify="space-between" align="flex-start" gap={2}>
                    <Text variant="caption" tone="default" style={{ lineHeight: 1.4 }}>{i.title}</Text>
                    <Badge variant="subtle" size="small" color={DIR_BADGE[i.direction]} label={i.direction === "threat" ? "↓" : "↑"} />
                  </Stack>
                  <Stack direction="row" gap={1} wrap>
                    <Badge variant="subtle" size="small" color={TYPE_BADGE[i.type]} label={i.type} />
                    <Badge variant="subtle" size="small" color={URGENCY_BADGE[i.urgency]} label={i.urgency} />
                    <Badge variant="subtle" size="small" color={STATUS_BADGE[i.status]} label={i.status} />
                  </Stack>
                  <Text variant="micro" tone="subtle">{i.author} · {i.date}</Text>
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

  /* ═══════════════ INTEL CARD ═══════════════ */
  const cardActions = (i) => {
    if (i.status === "new") {
      return (
        <Stack direction="row" gap={2} wrap>
          <Button variant="secondary" size="small" onClick={(e) => { e.stopPropagation(); patch(i.id, { status: "reviewed" }); }}>Mark reviewed</Button>
          {i.feedsModel ? <Button variant="primary" size="small" onClick={(e) => { e.stopPropagation(); patch(i.id, { status: "actioned" }); }}>🤖 Apply to model</Button> : null}
          {i.catalogueGap ? <Button variant="secondary" size="small" onClick={(e) => { e.stopPropagation(); patch(i.id, { status: "actioned" }); }}>Create catalogue task</Button> : null}
        </Stack>
      );
    }
    if (i.status === "reviewed") {
      return (
        <Stack direction="row" gap={2} wrap>
          {i.feedsModel ? <Button variant="primary" size="small" onClick={(e) => { e.stopPropagation(); patch(i.id, { status: "actioned" }); }}>🤖 Apply to model</Button> : null}
          <Button variant="secondary" size="small" onClick={(e) => { e.stopPropagation(); patch(i.id, { status: "watching" }); }}>Watch</Button>
          <Button variant="secondary" size="small" type="destructive" onClick={(e) => { e.stopPropagation(); patch(i.id, { status: "dismissed" }); }}>Dismiss</Button>
        </Stack>
      );
    }
    return <Text variant="micro" tone="subtle">{i.merchantNote || "No merchant note yet."}</Text>;
  };

  const intelCard = (i) => (
    <Card key={i.id} sx={panelSx} className={`mi-card is-${i.direction}${selectedId === i.id ? " is-selected" : ""}`} onClick={() => selectIntel(i.id)}>
      <Stack direction="column" gap={2}>
        <Stack direction="row" justify="space-between" align="flex-start" gap={2}>
          <Stack direction="column" gap={1} style={{ minWidth: 0 }}>
            <Text variant="body-strong" tone="strong" style={{ lineHeight: 1.4 }}>{i.title}</Text>
            <Text variant="micro" tone="subtle">{i.author} · {i.scope}{i.store ? ` · ${i.store}` : ""}{i.cluster ? ` · ${i.cluster}` : ""} · {i.date}</Text>
          </Stack>
          <Badge variant="subtle" size="small" color={STATUS_BADGE[i.status]} label={i.status} />
        </Stack>
        <Stack direction="row" gap={1} wrap>
          <Badge variant="subtle" size="small" color={TYPE_BADGE[i.type]} label={i.type} />
          <Badge variant="subtle" size="small" color={DIR_BADGE[i.direction]} label={i.direction} />
          <Badge variant="subtle" size="small" color={URGENCY_BADGE[i.urgency]} label={i.urgency} />
          {i.feedsModel ? <Badge variant="subtle" size="small" color="info" label="🤖 feeds model" /> : <Badge variant="subtle" size="small" color="default" label="human-read only" />}
          {i.catalogueGap ? <Badge variant="subtle" size="small" color="warning" label="catalogue gap" /> : null}
        </Stack>
        <Text variant="caption" tone="muted" style={{ lineHeight: 1.6 }}>{i.body.slice(0, 160)}…</Text>
        {i.skus.length ? <Stack direction="row" gap={1} wrap>{i.skus.map((s) => <SkuChip key={s}>{s}</SkuChip>)}</Stack> : null}
        {cardActions(i)}
      </Stack>
    </Card>
  );

  /* ═══════════════ INBOX ═══════════════ */
  const inbox = (
    <Stack direction="column" gap={3}>
      <Grid min={140} gap={3}>
        {metrics.map((m) => (
          <Card key={m.l} sx={softSx}>
            <Stack direction="column" gap={1} align="center">
              <Text variant="kpi" tone={m.tone}>{m.v}</Text>
              <Text variant="micro" tone="muted" style={{ textAlign: "center" }}>{m.l}</Text>
              <Text variant="micro" tone="subtle" style={{ textAlign: "center" }}>{m.sub}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      <Stack direction="row" gap={2} wrap>
        <Chip active={statusTab === "all" && !dirFilter && !typeFilter} onClick={() => setStatus("all")}>All signals</Chip>
        <Chip active={statusTab === "new"} onClick={() => setStatus("new")}>New ({newCount})</Chip>
        <Chip active={statusTab === "actioned"} onClick={() => setStatus("actioned")}>Actioned</Chip>
        <Chip active={statusTab === "watching"} onClick={() => setStatus("watching")}>Watching</Chip>
      </Stack>

      {filtered.length === 0 ? (
        <Card sx={softSx}><EmptyState heading="No signals" description="No signals match the current filters." /></Card>
      ) : (
        <Grid columns={2} gap={3}>{filtered.map(intelCard)}</Grid>
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
            <Text variant="micro" tone="subtle">SKU references let the agent update confidence scores for specific products. Leave blank for general market/trend signals.</Text>
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
          <Text variant="caption" tone="muted" style={{ fontWeight: 600 }}>📋 Entry preview</Text>
          {!log.type && !log.direction ? (
            <Text variant="caption" tone="subtle" style={{ textAlign: "center", padding: "16px 0" }}>Start filling in the form to preview your entry</Text>
          ) : (
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
          <Stack direction="column" gap={2} style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--sp-3)" }}>
            <Text variant="micro" tone="muted" style={{ fontWeight: 600 }}>🤖 MODEL IMPACT</Text>
            {feedsModelPreview ? (
              <NoteBox tone="accent" label="Structured tags will feed model">
                {log.direction === "threat" ? "Reduce" : "Boost"} confidence for {log.skus.join(", ")} at {log.scope || "specified"} level. Signal type: {log.type}. Urgency: {log.urgency || "unset"}.
              </NoteBox>
            ) : (
              <Stack direction="column" gap={1} paddingX={3} paddingY={2} style={{ background: "var(--color-surface-sunken)", borderRadius: "var(--r2)" }}>
                {!log.type ? <Text variant="micro" tone="subtle">• Select a signal type to enable model tagging</Text> : null}
                {!log.skus.length ? <Text variant="micro" tone="subtle">• Add at least one SKU to enable confidence score updates</Text> : null}
                {log.type && log.skus.length ? <Text variant="micro" tone="success">✓ Free text stays human-read. Structured tags will feed model on submit.</Text> : null}
              </Stack>
            )}
          </Stack>
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
      <Stack direction="row" justify="space-between" align="center" wrap gap={2}>
        <Text variant="heading" tone="strong">Signal map — by cluster</Text>
        <Stack direction="row" gap={3}>
          <Badge variant="subtle" size="small" color="error" label="Threat" />
          <Badge variant="subtle" size="small" color="success" label="Opportunity" />
          <Badge variant="subtle" size="small" color="info" label="Feeds model" />
        </Stack>
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
                    <Text variant="micro" tone="error">threats</Text>
                  </Stack>
                  <Stack direction="column" align="center" paddingX={3} paddingY={1} style={{ background: "var(--color-success-soft)", borderRadius: "var(--r2)", minWidth: 56 }}>
                    <Text variant="kpi" tone="success">{cd.opps}</Text>
                    <Text variant="micro" tone="success">opps</Text>
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

  /* ═══════════════ DETAIL PANEL ═══════════════ */
  const detailPanel = selected ? (
    <Card sx={detailSx} className="mi-detail">
      <Stack direction="column" style={{ height: "100%" }}>
        <Stack direction="row" justify="space-between" align="center" paddingX={3} paddingY={3} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Text variant="caption" tone="strong">Signal detail</Text>
          <Button variant="text" size="small" onClick={() => setSelectedId(null)}>×</Button>
        </Stack>
        <div className="mi-list" style={{ flex: 1, padding: "var(--sp-3)" }}>
          <Stack direction="column" gap={3}>
            <Stack direction="column" gap={2}>
              <Text variant="body-strong" tone="strong" style={{ lineHeight: 1.4 }}>{selected.title}</Text>
              <Stack direction="row" gap={1} wrap>
                <Badge variant="subtle" size="small" color={TYPE_BADGE[selected.type]} label={selected.type} />
                <Badge variant="subtle" size="small" color={DIR_BADGE[selected.direction]} label={selected.direction} />
                <Badge variant="subtle" size="small" color={URGENCY_BADGE[selected.urgency]} label={selected.urgency} />
                <Badge variant="subtle" size="small" color={STATUS_BADGE[selected.status]} label={selected.status} />
              </Stack>
            </Stack>

            <Stack direction="column" gap={1} paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)" }}>
              {[
                ["Author", `${selected.author} · ${selected.authorRole}`],
                ["Date", selected.date],
                ["Scope", `${selected.scope}${selected.store ? ` · ${selected.store}` : ""}${selected.cluster ? ` / ${selected.cluster}` : ""}`],
                ["Confidence", selected.confidence],
              ].map(([l, v]) => (
                <Stack key={l} direction="row" gap={2}>
                  <Text variant="micro" tone="subtle" style={{ minWidth: 70 }}>{l}</Text>
                  <Text variant="micro" tone="default" style={{ fontWeight: 500 }}>{v}</Text>
                </Stack>
              ))}
            </Stack>

            <Text variant="caption" tone="muted" style={{ lineHeight: 1.7, borderBottom: "1px solid var(--color-border)", paddingBottom: "var(--sp-3)" }}>{selected.body}</Text>

            {selected.skus.length ? (
              <Stack direction="column" gap={1}>
                <Text variant="overline" tone="muted">Affected SKUs</Text>
                <Stack direction="row" gap={1} wrap>{selected.skus.map((s) => <SkuChip key={s}>{s}</SkuChip>)}</Stack>
              </Stack>
            ) : null}

            {selected.feedsModel && selected.modelInstruction ? (
              <Stack direction="column" gap={1}>
                <Text variant="overline" tone="muted">Agent model instruction</Text>
                <NoteBox tone="accent" label="🤖 Structured instruction">{selected.modelInstruction}</NoteBox>
              </Stack>
            ) : null}

            {selected.catalogueGap ? <NoteBox tone="warning" label="🔒 Catalogue gap flagged">{selected.catalogueRequest}</NoteBox> : null}
            {selected.merchantNote ? <NoteBox tone="teal" label="Merchant note">{selected.merchantNote}</NoteBox> : null}

            <Stack direction="column" gap={1}>
              <Text variant="overline" tone="muted">Add merchant note</Text>
              <TextArea placeholder="Note for tracking — visible to merchant team only…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} width="100%" height="64px" />
            </Stack>

            <Stack direction="column" gap={2}>
              {(selected.status === "new" || selected.status === "reviewed") && selected.feedsModel ? <Button variant="primary" size="small" onClick={() => patch(selected.id, { status: "actioned" })} style={{ width: "100%" }}>🤖 Apply structured tags to model</Button> : null}
              {(selected.status === "new" || selected.status === "reviewed") && selected.catalogueGap ? <Button variant="secondary" size="small" onClick={() => patch(selected.id, { status: "actioned" })} style={{ width: "100%" }}>Create catalogue consideration task</Button> : null}
              <Stack direction="row" gap={2} wrap>
                {selected.status === "new" ? <Button variant="secondary" size="small" onClick={() => patch(selected.id, { status: "reviewed" })}>Mark reviewed</Button> : null}
                {selected.status !== "actioned" ? <Button variant="secondary" size="small" onClick={() => saveNote(selected.id)}>Save note</Button> : null}
                <Button variant="secondary" size="small" onClick={() => patch(selected.id, { status: "watching" })}>Watch</Button>
                <Button variant="secondary" size="small" type="destructive" onClick={() => patch(selected.id, { status: "dismissed" })}>Dismiss</Button>
              </Stack>
            </Stack>
          </Stack>
        </div>
      </Stack>
    </Card>
  ) : null;

  /* ═══════════════ SHELL ═══════════════ */
  return (
    <Stack direction="column" gap={4}>
      <Card sx={panelSx}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">Market Intelligence</Text>
            <Text variant="caption" tone="muted">Field-logged market, competitor &amp; customer signals · structured tags feed the recommendation agent</Text>
          </Stack>
          <Stack direction="row" gap={3} wrap>
            <Button variant={view === "inbox" ? "primary" : "secondary"} size="medium" onClick={() => setView("inbox")}>Inbox</Button>
            <Button variant={view === "map" ? "primary" : "secondary"} size="medium" onClick={() => setView("map")}>Signal map</Button>
          </Stack>
        </Stack>
      </Card>

      <Stack direction="row" gap={3} align="flex-start" wrap>
        {sidebar}
        <div style={{ flex: 1, minWidth: 0 }}>
          {view === "inbox" ? inbox : view === "log" ? logForm : mapView}
        </div>
        {view === "inbox" ? detailPanel : null}
      </Stack>
    </Stack>
  );
}
