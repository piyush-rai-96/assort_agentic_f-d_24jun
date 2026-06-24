import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, Button, Badge, Input, TextArea, Chips, FiltersStrip, FilterPanel, EmptyState } from "impact-ui";
import { Bot, ClipboardList, X, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
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

const EMPTY_LOG = {
  type: null, direction: null, urgency: null, scope: null,
  title: "", body: "", skus: [], confidence: null, skuPick: "", submitted: false,
};

const TYPE_TINT = {
  competitive: { bg: "var(--color-error-soft)", fg: "var(--color-error)" },
  market: { bg: "var(--color-info-soft)", fg: "var(--color-info)" },
  customer: { bg: "var(--color-success-soft)", fg: "var(--color-success)" },
  product: { bg: "var(--color-warning-soft)", fg: "var(--color-warning)" },
  supply: { bg: "var(--color-error-soft)", fg: "var(--color-error)" },
  trend: { bg: "var(--color-info-soft)", fg: "var(--color-info)" },
};

function Tag({ tint, children }) {
  return (
    <span className="mi-tag" style={tint ? { background: tint.bg, color: tint.fg } : undefined}>
      {children}
    </span>
  );
}

const CAT_NAME = Object.fromEntries(CATALOGUE_SKUS.map((s) => [s.id, s.name]));

/* Downstream impact chain — per signal type + direction */
function getDownstreamChain(signal) {
  const key = `${signal.type}/${signal.direction}`;
  const skuLabel = signal.skus.length ? `(${signal.skus.slice(0, 2).join(", ")})` : "";
  const clusterLabel = signal.cluster ? `in ${signal.cluster}` : "";
  const chains = {
    "market/opportunity": [
      "Forecast uplift for affected SKUs",
      `Peer Intelligence confidence ↑ ${skuLabel}`,
      `PLR carry + depth recommendation ${clusterLabel}`,
    ],
    "product/threat": [
      `Confidence ↓ for ${skuLabel || "affected SKUs"}`,
      "De-winner flag in Peer Intelligence",
      "HOLD — do not expand in next PLR",
    ],
    "customer/opportunity": [
      "Line gap created in Range Build",
      "Wishlist item for next PLR",
      "Like-item forecast transferred off named comps",
    ],
    "competitive/threat": [
      "Watch flag added to affected SKUs",
      "Peer Intelligence confidence ↓",
      "Pricing / defend recommendation surfaced",
    ],
    "supply/threat": [
      "Forecast dampened for constrained SKUs",
      "Hindsight annotated — supply dip, not demand weakness",
      "Supply risk warning on recommendation cards",
    ],
    "trend/opportunity": [
      "Early forecast uplift for category",
      "New-range candidate added to Range Build",
      "PLR surfaces as next-season recommend",
    ],
    "competitive/opportunity": [
      "Competitor gap flagged as market opportunity",
      "Peer Intelligence confidence ↑ for gap SKUs",
      "Opportunistic carry recommendation in next PLR",
    ],
  };
  return chains[key] || [
    "Signal structured and tagged",
    "Agent model updated at next refresh",
    "Visible in next Peer Intelligence / PLR cycle",
  ];
}

function SkuChip({ children }) {
  const code = typeof children === "string" ? children : "";
  const name = CAT_NAME[code] || code;
  return (
    <Stack
      direction="row" align="center" gap={1}
      style={{ border: "1px solid var(--color-border)", borderRadius: "var(--r2)", background: "var(--color-surface)", padding: "2px 7px 2px 3px" }}
    >
      <SkuSwatch desc={name} size={16} />
      <Text variant="micro" mono style={{ color: "var(--color-accent)" }}>{code}</Text>
    </Stack>
  );
}

function NoteBox({ tone, label, children }) {
  const bg = { warning: "var(--color-warning-soft)", teal: "var(--color-surface-alt)", accent: "var(--color-primary-soft)" }[tone] || "var(--color-surface-alt)";
  const bd = { warning: "var(--color-warning)", teal: "var(--color-teal)", accent: "var(--color-primary)" }[tone] || "var(--color-border)";
  return (
    <Stack direction="column" gap={1} paddingX={3} paddingY={2}
      style={{ background: bg, border: `1px solid ${bd}`, borderRadius: "var(--r2)" }}
    >
      <Text variant="micro" style={{ fontWeight: 700, color: bd }}>{label}</Text>
      <Text variant="caption" style={{ lineHeight: 1.6, color: "var(--color-text)" }}>{children}</Text>
    </Stack>
  );
}

const CONF_BADGE_COLOR = { confirmed: "success", "multiple customers": "warning", anecdotal: "default" };
const CONF_LABEL = { confirmed: "Confirmed", "multiple customers": "Multiple", anecdotal: "Anecdotal" };

/* Signal card rendered in the 2-col grid */
function SignalCard({ i, isSelected, fromPortfolio, onSelect, onMarkReviewed, onApplyModel, onCatTask, onFieldReq, onWatch, onDismiss, onOpenDetail }) {
  const isThreat = i.direction === "threat";
  const isAnecdotal = i.confidence === "anecdotal";
  const hasActions =
    i.status === "new" ||
    i.status === "reviewed" ||
    ((i.status === "actioned" || i.status === "watching") && i.merchantNote);

  const dirBorderColor = i.direction === "opportunity" ? "var(--color-success)" : "var(--color-error)";
  return (
    <Card
      className={`mi-signal-card mi-signal-card--${i.direction}${isSelected ? " mi-signal-card--selected" : ""}${i.id === fromPortfolio ? " mi-signal-card--portfolio" : ""}${isAnecdotal ? " mi-signal-card--anecdotal" : ""}`}
      onClick={onSelect}
      sx={{ ...panelSx, cursor: "pointer", borderLeft: `3px solid ${dirBorderColor}`,
        boxShadow: isSelected ? "0 0 0 2px var(--color-primary)" : undefined,
        ":hover": { boxShadow: `0 4px 12px rgba(0,0,0,.1), 0 0 0 1.5px ${dirBorderColor}` },
        transition: "box-shadow .15s",
      }}
    >
      {/* ── Top: title + status badge ── */}
      <div className="mi-sc-top">
        <div className="mi-sc-title">{i.title}</div>
        <Badge variant="subtle" size="small" color={STATUS_BADGE[i.status]} label={i.status} />
      </div>

      {/* ── Meta row: author/date on left, scope pill on right ── */}
      <div className="mi-sc-meta">
        <span>{i.author} · {i.date}</span>
        <Badge variant="subtle" size="small" color="neutral"
          label={`${i.scope}${i.store ? ` · ${i.store}` : ""}`} />
      </div>

      {/* ── Compact tag row: type + direction + urgency + icons ── */}
      <div className="mi-sc-tags">
        <Tag tint={TYPE_TINT[i.type]}>{i.type}</Tag>
        <Badge variant="subtle" size="small"
          color={isThreat ? "error" : "success"}
          label={`${isThreat ? "↓" : "↑"} ${i.direction}`} />
        {i.urgency !== "watch" ? (
          <Badge variant="subtle" size="small"
            color={i.urgency === "high" ? "error" : i.urgency === "medium" ? "warning" : "neutral"}
            label={i.urgency} />
        ) : null}
        {i.feedsModel && (
          <span className="mi-sc-indicator mi-sc-indicator--model" title="Agent-suggested tags">
            <Bot size={10} aria-hidden="true" />
            <span className="mi-sc-agent-label">Agent-suggested</span>
          </span>
        )}
        {i.catalogueGap && (
          <Badge variant="subtle" size="small" color="info" label="gap" />
        )}
        {i.confidence && (
          <Badge variant="subtle" size="small"
            color={i.confidence === "high" ? "success" : i.confidence === "medium" ? "info" : i.confidence === "low" ? "warning" : "neutral"}
            label={CONF_LABEL[i.confidence] || i.confidence} />
        )}
      </div>

      {/* ── Body — 2-line CSS clamp ── */}
      <div className="mi-sc-body">{i.body}</div>

      {/* ── Footer: SKUs + actions ── */}
      {(i.skus.length > 0 || hasActions) && (
        <div className="mi-sc-footer" onClick={(e) => e.stopPropagation()}>
          {i.skus.length > 0 && (
            <div className="mi-sc-skus">
              {i.skus.map((s) => <SkuChip key={s}>{s}</SkuChip>)}
            </div>
          )}
          {hasActions && (
            <div className="mi-sc-actions">
              {i.status === "new" && (
                <Button size="small" variant="secondary" onClick={() => onMarkReviewed(i.id)}>Mark reviewed</Button>
              )}
              {(i.status === "new" || i.status === "reviewed") && i.feedsModel && (
                <Stack direction="column" gap={0.5} align="flex-start">
                  <Button size="small" variant="primary" onClick={() => onOpenDetail(i.id)}>Apply to model</Button>
                  <span className="mi-action-hint">See instruction preview first →</span>
                </Stack>
              )}
              {(i.status === "new" || i.status === "reviewed") && i.catalogueGap && (
                <Stack direction="column" gap={0.5} align="flex-start">
                  <Button size="small" variant="secondary" onClick={() => onCatTask(i.id)}>Line Gap</Button>
                  <span className="mi-action-hint">→ Routes to Range Build</span>
                </Stack>
              )}
              {(i.status === "new" || i.status === "reviewed") && i.direction === "opportunity" && !i.feedsModel && (
                <Stack direction="column" gap={0.5} align="flex-start">
                  <Button size="small" variant="secondary" onClick={() => onFieldReq(i.id)}>Field Request</Button>
                  <span className="mi-action-hint">→ Routes to Range Build</span>
                </Stack>
              )}
              {i.status === "reviewed" && (
                <>
                  <Button size="small" variant="secondary" onClick={() => onWatch(i.id)}>Watch</Button>
                  <Button size="small" variant="secondary" type="destructive" onClick={() => onDismiss(i.id)}>Dismiss</Button>
                </>
              )}
              {(i.status === "actioned" || i.status === "watching") && i.merchantNote && (
                <span className="mi-actioned-note">{i.merchantNote}</span>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function MarketIntel() {
  const [view, setView] = useState("inbox");
  const [intel, setIntel] = useState(INTEL_SEED);
  const [statusTab, setStatusTab] = useState("all");
  const [dirFilter, setDirFilter] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);
  const [confFilter, setConfFilter] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [log, setLog] = useState(EMPTY_LOG);
  const [alanState, setAlanState] = useState(null); // null | "loading" | "proposed"
  const [alanProposal, setAlanProposal] = useState(null);
  const [fromPortfolio, setFromPortfolio] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("status");
  const highlightedRowRef = useRef(null);
  const toastTimer = useRef(null);

  const showToast = (msg, tone = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  useEffect(() => {
    const id = popIntelHighlight();
    if (id) {
      setSelectedId(id);
      setFromPortfolio(id);
      setStatusTab("all");
      setDirFilter(null);
      setTypeFilter(null);
      const it = INTEL_SEED.find((i) => i.id === id);
      if (it) setNoteDraft(it.merchantNote || "");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (confFilter && i.confidence !== confFilter) return false;
        return true;
      }),
    [intel, statusTab, dirFilter, typeFilter, confFilter]
  );

  /* ── Metrics ──────────────────────────────────────────────────────────── */
  const total = intel.length;
  const newCount = intel.filter((i) => i.status === "new").length;
  const threats = intel.filter((i) => i.direction === "threat").length;
  const opps = intel.filter((i) => i.direction === "opportunity").length;
  const appliedToModel = intel.filter((i) => i.feedsModel && i.status === "actioned").length;
  const changedDecision = intel.filter((i) => i.feedsModel && i.status === "actioned").length;
  const metrics = [
    { v: total,           l: "Total signals",        tone: "strong",  accent: "var(--color-text-muted)" },
    { v: newCount,        l: "Awaiting review",       tone: "error",   accent: "var(--color-warning)" },
    { v: threats,         l: "Threat signals",        tone: "error",   accent: "var(--color-error)" },
    { v: opps,            l: "Opportunities",         tone: "success", accent: "var(--color-success)" },
    { v: appliedToModel,  l: "Applied to model",      tone: "accent",  accent: "var(--color-primary)" },
    { v: changedDecision, l: "Changed a decision",    tone: "success", accent: "var(--color-teal, var(--color-success))" },
  ];

  /* ── Mutations ────────────────────────────────────────────────────────── */
  const patch = (id, fields) => setIntel((prev) => prev.map((i) => (i.id === id ? { ...i, ...fields } : i)));
  const selectIntel = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    const it = intel.find((i) => i.id === id);
    setNoteDraft(it?.merchantNote || "");
  };
  const saveNote = (id) => { patch(id, { merchantNote: noteDraft }); showToast("Note saved"); };

  /* ── Filter handlers ──────────────────────────────────────────────────── */
  const setStatus = (key) => { setStatusTab(key); setDirFilter(null); setTypeFilter(null); setConfFilter(null); };
  const toggleDir = (key) => { setDirFilter((d) => (d === key ? null : key)); setStatusTab("all"); };
  const toggleType = (key) => { setTypeFilter((t) => (t === key ? null : key)); setStatusTab("all"); };

  /* ── Card actions ─────────────────────────────────────────────────────── */
  const markReviewed = (id) => { patch(id, { status: "reviewed" }); showToast('Status updated to "reviewed"'); };
  const applyToModel = (id) => {
    patch(id, { status: "actioned" });
    showToast("Applied to model — confidence scores updated. Visible in Catalogue.", "accent");
  };
  const createCatalogueTask = (id) => { patch(id, { status: "actioned" }); showToast("Line gap added to Portfolio Build"); };
  const sendFieldRequest = (id) => { patch(id, { status: "actioned" }); showToast("Field request sent to Portfolio Build"); };
  const watchSignal = (id) => { patch(id, { status: "watching" }); showToast("Signal added to Watch list"); };
  const dismissSignal = (id) => {
    patch(id, { status: "dismissed" });
    if (selectedId === id) setSelectedId(null);
    showToast("Signal dismissed", "error");
  };

  /* ── Log form ─────────────────────────────────────────────────────────── */
  const setLogField = (key, val) => setLog((p) => ({ ...p, [key]: p[key] === val ? null : val }));
  const addSku = () => setLog((p) => (p.skuPick && !p.skus.includes(p.skuPick) ? { ...p, skus: [...p.skus, p.skuPick], skuPick: "" } : p));
  const removeSku = (s) => setLog((p) => ({ ...p, skus: p.skus.filter((x) => x !== s) }));
  const submitLog = () => {
    if (!log.type || !log.direction || !log.title.trim() || !log.body.trim()) {
      showToast("Please fill in all required fields", "error");
      return;
    }
    const entry = {
      id: `I-${String(100 + intel.length + 1)}`,
      type: log.type, direction: log.direction, urgency: log.urgency || "watch", scope: log.scope || "store",
      cluster: "Pro-Heavy South", store: "ATL-01", title: log.title, body: log.body,
      skus: [...log.skus], categories: [], confidence: log.confidence || "anecdotal",
      modelInstruction: log.skus.length
        ? `Signal logged: ${log.type} / ${log.direction}. Affects ${log.skus.join(", ")}. Pending merchant review before model update.`
        : null,
      feedsModel: !!log.skus.length, status: "new", author: "Lisa T.", authorRole: "Store Manager",
      date: "Jun 3, 2025", escalated: false, merchantNote: "",
    };
    setIntel((prev) => [entry, ...prev]);
    setLog({ ...EMPTY_LOG, submitted: true });
    setAlanState(null);
    setAlanProposal(null);
  };

  const countBy = (pred) => intel.filter(pred).length;

  /* ── Ask Alan keyword extraction ─────────────────────────────────────── */
  const extractAlanProposal = (body) => {
    const text = body.toLowerCase();
    let type = null, direction = null, scope = "store";
    if (/competitor|competing|home depot|floor.{0,10}decor|tile corner|tile shop/.test(text)) { type = "competitive"; direction = "threat"; }
    else if (/development|construction|breaking ground|mixed.use|residential|commercial|building ground/.test(text)) { type = "market"; direction = "opportunity"; }
    else if (/contractor|asked for|not in catalogue|not carry|customer request|wishlist/.test(text)) { type = "customer"; direction = "opportunity"; }
    else if (/return|complaint|install|defect|quality|failure|humidity/.test(text)) { type = "product"; direction = "threat"; }
    else if (/lead time|supply|available|stock|delivery|weeks|vendor/.test(text)) { type = "supply"; direction = "threat"; }
    else if (/trend|demand building|designer|emerging|renovation|interior/.test(text)) { type = "trend"; direction = "opportunity"; }

    if (/national|across all/.test(text)) scope = "national";
    else if (/region|southeast|gulf|pacific|northeast|midwest|mountain/.test(text)) scope = "region";
    else if (/cluster|stores in/.test(text)) scope = "cluster";

    const skuMatches = body.match(/SKU-\d+/g) || [];
    const uniqueSkus = [...new Set(skuMatches)].filter((s) => CATALOGUE_SKUS.some((c) => c.id === s));

    return { type, direction, scope, skus: uniqueSkus };
  };

  const triggerAlanPrefill = () => {
    if (!log.body.trim()) return;
    setAlanState("loading");
    setTimeout(() => {
      const proposal = extractAlanProposal(log.body);
      setAlanProposal(proposal);
      setAlanState("proposed");
    }, 1500);
  };

  const acceptAlanProposal = () => {
    setLog((p) => ({
      ...p,
      type: alanProposal.type || p.type,
      direction: alanProposal.direction || p.direction,
      scope: alanProposal.scope || p.scope,
      skus: alanProposal.skus.length ? alanProposal.skus : p.skus,
    }));
    setAlanState(null);
    setAlanProposal(null);
  };

  const dismissAlanProposal = () => { setAlanState(null); setAlanProposal(null); };

  /* ── Derived filter tags for FiltersStrip ─────────────────────────────── */
  const miFilterTags = useMemo(() => {
    const tags = [];
    if (statusTab !== "all") tags.push({ id: "status", label: "Status", values: [{ id: 1, label: statusTab }] });
    if (dirFilter) tags.push({ id: "dir", label: "Direction", values: [{ id: 1, label: dirFilter }] });
    if (typeFilter) {
      const opt = TYPE_OPTIONS.find((t) => t.id === typeFilter);
      tags.push({ id: "type", label: "Type", values: [{ id: 1, label: opt?.label || typeFilter }] });
    }
    if (confFilter) tags.push({ id: "conf", label: "Confidence", values: [{ id: 1, label: CONF_LABEL[confFilter] || confFilter }] });
    return tags;
  }, [statusTab, dirFilter, typeFilter, confFilter]);

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

  const CONF_FD_OPTIONS = [
    { value: "confirmed",         label: "Confirmed (3rd-party verified)" },
    { value: "multiple customers", label: "Multiple customers (2–5 signals)" },
    { value: "anecdotal",         label: "Anecdotal (1 customer)" },
  ];

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
    {
      value: "confidence",
      title: "Confidence",
      numberOfFilter: confFilter ? 1 : 0,
      children: (
        <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
          <FdSelect
            label="Confidence level"
            value={confFilter || ""}
            options={[{ value: "", label: "All confidence levels" }, ...CONF_FD_OPTIONS]}
            onChange={(v) => { if (v === "") setConfFilter(null); else setConfFilter(v); }}
            width={320}
          />
        </Stack>
      ),
    },
  ];

  /* ── Cluster map data ─────────────────────────────────────────────────── */
  const clusterData = useMemo(() => {
    const data = {};
    CLUSTER_NAMES.forEach((c) => { data[c] = { threats: 0, opps: 0, signals: [] }; });
    intel.forEach((i) => {
      const targets = i.scope === "national" ? CLUSTER_NAMES : i.cluster ? [i.cluster] : [];
      targets.forEach((t) => {
        if (data[t]) {
          data[t][i.direction === "threat" ? "threats" : "opps"]++;
          data[t].signals.push(i);
        }
      });
    });
    return data;
  }, [intel]);

  /* ═══════════════ SIDEBAR (signal list only) ═══════════════ */
  const sidebar = (
    <div className="mi-sidebar-pane">
      <div className="mi-filter-scroll">
        <div className="mi-filter-label">{filtered.length} signal{filtered.length !== 1 ? "s" : ""}</div>
        <div className="mi-list-items">
          {filtered.length === 0 ? (
            <div className="mi-list-empty">No signals match current filters.</div>
          ) : (
            filtered.map((i) => (
              <div
                key={i.id}
                ref={i.id === fromPortfolio ? highlightedRowRef : undefined}
                className={`mi-list-row${selectedId === i.id ? " is-active" : ""}${i.id === fromPortfolio ? " is-from-portfolio" : ""}`}
                onClick={() => selectIntel(i.id)}
              >
                <span className={`mi-dir-dot is-${i.direction}`} aria-hidden>
                  {i.direction === "threat" ? "↓" : "↑"}
                </span>
                <div className="mi-list-row-body">
                  <div className="mi-list-row-title">{i.title}</div>
                  <div className="mi-list-row-meta">
                    <Tag tint={TYPE_TINT[i.type]}>{i.type}</Tag>
                    {i.status === "new" ? <span className="mi-new-dot" title="New" /> : null}
                    <span className="mi-list-row-date">{i.date}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mi-sidebar-footer">
        <Button
          variant="primary" size="medium"
          onClick={() => { setView("log"); setLog(EMPTY_LOG); }}
          style={{ width: "100%" }}
        >
          + Log new intelligence
        </Button>
      </div>
    </div>
  );

  /* ═══════════════ METRIC STRIP ═══════════════ */
  const metricStrip = (
    <div className="mi-metric-strip">
      {metrics.map((m) => (
        <div key={m.l} className="mi-metric">
          <span className={`mi-metric-accent tone-${m.tone}`} style={m.accent ? { background: m.accent } : undefined} />
          <span className={`mi-metric-num tone-${m.tone}`}>{m.v}</span>
          <span className="mi-metric-label">{m.l}</span>
        </div>
      ))}
    </div>
  );

  /* ═══════════════ INBOX (card grid) ═══════════════ */
  const TABS = [
    { id: "all", label: "All signals" },
    { id: "new", label: `New  (${newCount})` },
    { id: "actioned", label: "Actioned" },
    { id: "watching", label: "Watching" },
  ];

  const cardGrid = (
    <div className="mi-main-scroll">
      {metricStrip}
      <div className="mi-tabs-row">
        {TABS.map((t) => (
          <Chips key={t.id} label={t.label} isActive={statusTab === t.id} onClick={() => setStatus(t.id)} />
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="mi-cards-empty">
          <EmptyState
            title="No signals match"
            description="Try adjusting or clearing your filters to see more market intelligence."
          />
        </div>
      ) : (
        <div className="mi-cards-grid">
          {filtered.map((i) => (
            <SignalCard
              key={i.id}
              i={i}
              isSelected={selectedId === i.id}
              fromPortfolio={fromPortfolio}
              onSelect={() => selectIntel(i.id)}
              onMarkReviewed={markReviewed}
              onApplyModel={applyToModel}
              onCatTask={createCatalogueTask}
              onFieldReq={sendFieldRequest}
              onWatch={watchSignal}
              onDismiss={dismissSignal}
              onOpenDetail={(id) => selectIntel(id)}
            />
          ))}
        </div>
      )}
    </div>
  );

  /* ═══════════════ SIGNAL DETAIL (right panel) ═══════════════ */
  const detailPanel = selected && (
    <div className="mi-detail-inner">
      {/* Close row */}
      <div className="mi-detail-close-row">
        <span className="mi-detail-label">Signal detail</span>
        <Button variant="ghost" size="small" onClick={() => setSelectedId(null)} aria-label="Close detail"
          sx={{ padding: "2px 6px", minWidth: 0 }}>
          <X size={16} />
        </Button>
      </div>

      {/* Body */}
      <div className="mi-detail-body">
        {/* Title + badges */}
        <div className="mi-detail-title">{selected.title}</div>
        <div className="mi-signal-tags" style={{ marginBottom: "var(--sp-3)" }}>
          <Tag tint={TYPE_TINT[selected.type]}>{selected.type}</Tag>
          <Badge variant="subtle" size="small"
            color={selected.direction === "threat" ? "error" : "success"}
            label={`${selected.direction === "threat" ? "↓" : "↑"} ${selected.direction}`} />
          {selected.urgency !== "watch" ? (
            <Badge variant="subtle" size="small"
              color={selected.urgency === "high" ? "error" : selected.urgency === "medium" ? "warning" : "neutral"}
              label={selected.urgency} />
          ) : null}
          <Badge variant="subtle" size="small" color={STATUS_BADGE[selected.status]} label={selected.status} />
        </div>

        {/* Metadata grid */}
        <div className="mi-detail-meta-card">
          {[
            ["Author", `${selected.author} · ${selected.authorRole}`],
            ["Date", selected.date],
            ["Scope", `${selected.scope}${selected.store ? ` · ${selected.store}` : ""}${selected.cluster ? ` / ${selected.cluster}` : ""}`],
            ["Confidence", selected.confidence],
          ].map(([l, v]) => (
            <div key={l} className="mi-detail-meta-row">
              <span className="mi-detail-meta-lbl">{l}</span>
              <span className="mi-detail-meta-val">
                {v}
                {l === "Confidence" &&
                  selected.confidence === "confirmed" &&
                  (selected.authorRole?.includes("VP") || selected.authorRole?.includes("Regional")) && (
                    <Badge
                      variant="subtle" size="small" color="success" label="High weight"
                      style={{ marginLeft: "var(--sp-2)" }}
                    />
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Full body */}
        <div style={{ marginBottom: "var(--sp-1)" }}>
          <Text variant="micro" tone="subtle">Human-read only · not processed by the model</Text>
        </div>
        <div className="mi-detail-full-body">{selected.body}</div>

        {/* Affected SKUs */}
        {selected.skus.length > 0 && (
          <div className="mi-detail-section">
            <div className="mi-detail-section-label">Affected SKUs</div>
            <div className="mi-signal-skus">
              {selected.skus.map((s) => <SkuChip key={s}>{s}</SkuChip>)}
            </div>
          </div>
        )}

        {/* Model instruction */}
        {selected.feedsModel && selected.modelInstruction && (
          <>
            <NoteBox tone="accent" label="Agent model instruction">{selected.modelInstruction}</NoteBox>
            <Text variant="micro" tone="subtle" style={{ marginTop: "var(--sp-1)" }}>
              Machine-readable · processed by the agent model
            </Text>
          </>
        )}

        {/* Downstream impact chain */}
        {selected.feedsModel && (
          <div className="mi-downstream">
            <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)" }}>
              <ArrowDownCircle size={14} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
              <Text variant="caption" style={{ fontWeight: 700, color: "var(--color-primary)" }}>Where this signal flows</Text>
            </Stack>
            <div className="mi-downstream-steps">
              {getDownstreamChain(selected).map((step, idx, arr) => (
                <React.Fragment key={step}>
                  <span className="mi-downstream-step">{step}</span>
                  {idx < arr.length - 1 && <span className="mi-downstream-arrow">→</span>}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Catalogue gap */}
        {selected.catalogueGap && (
          <NoteBox tone="warning" label="Catalogue gap flagged">{selected.catalogueRequest}</NoteBox>
        )}

        {/* Merchant note display */}
        {selected.merchantNote && (
          <NoteBox tone="teal" label="Merchant note">{selected.merchantNote}</NoteBox>
        )}

        {/* Merchant note input */}
        <div className="mi-detail-section">
          <div className="mi-detail-section-label">Add merchant note</div>
          <TextArea
            placeholder="Note for tracking — visible to merchant team only…"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            width="100%"
            height="72px"
          />
        </div>

        {/* Detail action buttons */}
        <div className="mi-detail-actions">
          {(selected.status === "new" || selected.status === "reviewed") && selected.feedsModel && (
            <Button variant="primary" size="medium" onClick={() => applyToModel(selected.id)} style={{ width: "100%" }}>
              Apply structured tags to model
            </Button>
          )}
          {(selected.status === "new" || selected.status === "reviewed") && selected.catalogueGap && (
            <Button variant="secondary" size="medium" onClick={() => createCatalogueTask(selected.id)} style={{ width: "100%" }}>
              Create catalogue task
            </Button>
          )}
          <div className="mi-detail-actions-row">
            {selected.status === "new" && (
              <Button variant="secondary" size="small" onClick={() => markReviewed(selected.id)}>
                Mark reviewed
              </Button>
            )}
            {selected.status !== "actioned" && (
              <Button variant="secondary" size="small" onClick={() => saveNote(selected.id)}>
                Save note
              </Button>
            )}
            <Button variant="secondary" size="small" onClick={() => watchSignal(selected.id)}>Watch</Button>
            <Button variant="secondary" size="small" type="destructive" onClick={() => dismissSignal(selected.id)}>Dismiss</Button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ═══════════════ MAP VIEW ═══════════════ */
  const mapView = (
    <div className="mi-main-scroll">
      <div className="mi-map-legend">
        <Badge variant="subtle" size="small" color="error" label="Threat" />
        <Badge variant="subtle" size="small" color="success" label="Opportunity" />
        <Badge variant="subtle" size="small" color="info" label="Feeds model" />
      </div>
      <Grid columns={2} gap={3}>
        {CLUSTER_NAMES.map((cn) => {
          const cd = clusterData[cn];
          const totalSig = cd.signals.length;
          const urgImmediate = cd.signals.filter((s) => s.urgency === "immediate").length;
          const threatPct = totalSig > 0 ? Math.round((cd.threats / totalSig) * 100) : 0;
          return (
            <Card
              key={cn}
              sx={{ ...softSx, borderLeft: `3px solid ${cd.threats > 0 ? "var(--color-error)" : "var(--color-success)"}` }}
            >
              <Stack direction="column" gap={2}>
                <Stack direction="row" justify="space-between" align="center" gap={2}>
                  <Text variant="body-strong" tone="strong">{cn}</Text>
                  <Stack direction="row" gap={2} align="center">
                    {urgImmediate ? (
                      <Badge variant="subtle" size="small" color="error" label={`${urgImmediate} immediate`} />
                    ) : null}
                    <Text variant="micro" tone="subtle">{totalSig} signal{totalSig !== 1 ? "s" : ""}</Text>
                  </Stack>
                </Stack>
                <Stack direction="row" gap={2}>
                  <Stack direction="column" align="center" paddingX={3} paddingY={1}
                    style={{ background: "var(--color-error-soft)", borderRadius: "var(--r2)", minWidth: 56 }}>
                    <Text variant="kpi" tone="error">{cd.threats}</Text>
                    <Text variant="micro" tone="error">T</Text>
                  </Stack>
                  <Stack direction="column" align="center" paddingX={3} paddingY={1}
                    style={{ background: "var(--color-success-soft)", borderRadius: "var(--r2)", minWidth: 56 }}>
                    <Text variant="kpi" tone="success">{cd.opps}</Text>
                    <Text variant="micro" tone="success">O</Text>
                  </Stack>
                  <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                    {cd.signals.slice(0, 2).map((s) => (
                      <Text
                        key={s.id} variant="micro" tone="muted" truncate
                        style={{ cursor: "pointer" }}
                        onClick={() => { selectIntel(s.id); setView("inbox"); }}
                      >
                        {s.title}
                      </Text>
                    ))}
                    {cd.signals.length > 2 ? (
                      <Text variant="micro" tone="subtle">+{cd.signals.length - 2} more</Text>
                    ) : null}
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
    </div>
  );

  /* ═══════════════ LOG FORM ═══════════════ */
  const ChoiceGrid = ({ field, options, columns }) => (
    <Grid columns={columns} gap={2}>
      {options.map((o) => (
        <Stack
          key={o.id}
          className={`mi-choice${log[field] === o.id ? " is-selected" : ""}`}
          direction="column" gap={0}
          onClick={() => setLogField(field, o.id)}
        >
          <Text variant="caption" tone="strong">{o.label}</Text>
          {o.desc ? <Text variant="micro" tone="subtle">{o.desc}</Text> : null}
        </Stack>
      ))}
    </Grid>
  );

  const FormSection = ({ label, required, children }) => (
    <Stack direction="column" gap={2}>
      <Text variant="caption" tone="muted" style={{ fontWeight: 600 }}>
        {label}
        {required ? <Text as="span" variant="caption" tone="error"> *</Text> : null}
      </Text>
      {children}
    </Stack>
  );

  const feedsModelPreview = log.type && log.direction && log.skus.length > 0;

  const logForm = log.submitted ? (
    <Card sx={{ ...softSx, maxWidth: 560, margin: "0 auto" }}>
      <Stack direction="column" gap={4} align="center" paddingY={6}>
        <div className="mi-log-success-icon">✓</div>
        <Text variant="heading" tone="strong">Intel logged</Text>
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
          Your signal is in the merchant inbox. Structured tags will feed the agent model at the next refresh.
        </Text>
        <Stack direction="row" gap={2}>
          <Button variant="primary" size="medium" onClick={() => setLog(EMPTY_LOG)}>Log another signal</Button>
          <Button variant="secondary" size="medium" onClick={() => { setView("inbox"); setLog(EMPTY_LOG); }}>
            Back to inbox
          </Button>
        </Stack>
      </Stack>
    </Card>
  ) : (
    <Grid columns="1fr 340px" gap={4}>
      <Card sx={softSx}>
        <Stack direction="column" gap={4}>
          <FormSection label="Signal type" required><ChoiceGrid field="type" options={TYPE_OPTIONS} columns={2} /></FormSection>
          <FormSection label="Direction" required><ChoiceGrid field="direction" options={DIRECTION_OPTIONS} columns={2} /></FormSection>
          <FormSection label="Urgency"><ChoiceGrid field="urgency" options={URGENCY_OPTIONS} columns={4} /></FormSection>
          <FormSection label="Scope"><ChoiceGrid field="scope" options={SCOPE_OPTIONS} columns={4} /></FormSection>
          <FormSection label="Title" required>
            <Input
              placeholder="One-line description — e.g. Competitor opening 2 blocks away Q3"
              value={log.title}
              onChange={(e) => setLog((p) => ({ ...p, title: e.target.value }))}
              fullWidth
            />
          </FormSection>
          <FormSection label="What you observed" required>
            <TextArea
              placeholder="The full picture — who, what, where, when. Free text stays human-read only."
              value={log.body}
              onChange={(e) => { setLog((p) => ({ ...p, body: e.target.value })); setAlanState(null); setAlanProposal(null); }}
              width="100%" height="110px"
            />
            {log.body.trim().length > 20 && alanState === null && (
              <Button variant="secondary" size="small" onClick={triggerAlanPrefill}>
                Ask Alan to extract tags →
              </Button>
            )}
            {alanState === "loading" && (
              <div className="mi-alan-propose mi-alan-propose--loading">
                <span className="mi-alan-spinner" />
                <Text variant="caption" tone="muted">Alan is reading your signal…</Text>
              </div>
            )}
            {alanState === "proposed" && alanProposal && (
              <div className="mi-alan-propose">
                <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)" }}>
                  <Bot size={14} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                  <Text variant="caption" tone="primary" style={{ fontWeight: 700 }}>Alan suggests</Text>
                </Stack>
                <Stack direction="row" gap={1} wrap style={{ marginBottom: "var(--sp-2)" }}>
                  {alanProposal.type && <Badge variant="subtle" size="small" color={TYPE_BADGE[alanProposal.type]} label={alanProposal.type} />}
                  {alanProposal.direction && <Badge variant="subtle" size="small" color={DIR_BADGE[alanProposal.direction]} label={alanProposal.direction} />}
                  {alanProposal.scope && <Badge variant="subtle" size="small" color="default" label={alanProposal.scope} />}
                  {alanProposal.skus.map((s) => <Badge key={s} variant="subtle" size="small" color="info" label={s} />)}
                </Stack>
                {(!alanProposal.type && !alanProposal.direction) ? (
                  <Text variant="micro" tone="subtle" style={{ marginBottom: "var(--sp-2)" }}>
                    Could not extract tags automatically — fill in the fields above.
                  </Text>
                ) : null}
                <Stack direction="row" gap={2}>
                  <Button variant="primary" size="small" onClick={acceptAlanProposal}>Accept</Button>
                  <Button variant="secondary" size="small" onClick={dismissAlanProposal}>Edit manually</Button>
                </Stack>
              </div>
            )}
          </FormSection>
          <FormSection label="Affected SKUs (optional)">
            {log.skus.length ? (
              <Stack direction="row" gap={1} wrap>
                {log.skus.map((s) => (
                  <Stack key={s} direction="row" align="center" gap={1} paddingX={2}
                    style={{ border: "1px solid var(--color-accent)", borderRadius: "var(--r2)" }}>
                    <Text variant="micro" mono style={{ color: "var(--color-accent)" }}>{s}</Text>
                    <Text variant="micro" tone="subtle" style={{ cursor: "pointer" }} onClick={() => removeSku(s)}>×</Text>
                  </Stack>
                ))}
              </Stack>
            ) : null}
            <Stack direction="row" gap={2} align="flex-end">
              <FdSelect
                value={log.skuPick}
                options={[
                  { value: "", label: "Select a catalogue SKU…" },
                  ...CATALOGUE_SKUS.filter((s) => !log.skus.includes(s.id)).map((s) => ({ value: s.id, label: s.name })),
                ]}
                onChange={(v) => setLog((p) => ({ ...p, skuPick: v }))}
                width={360}
              />
              <Button variant="secondary" size="medium" onClick={addSku}>Add</Button>
            </Stack>
            <Text variant="micro" tone="subtle">SKU references enable per-product confidence score updates.</Text>
          </FormSection>
          <FormSection label="Confidence level">
            <ChoiceGrid field="confidence" options={CONFIDENCE_OPTIONS} columns={3} />
          </FormSection>
          <Stack direction="row" gap={2}>
            <Button variant="primary" size="medium" onClick={submitLog} style={{ flex: 1 }}>Log intelligence →</Button>
            <Button variant="secondary" size="medium" onClick={() => setView("inbox")}>Cancel</Button>
          </Stack>
        </Stack>
      </Card>

      {/* Preview panel */}
      <div style={{ position: "sticky", top: 0 }}>
        <Card sx={softSx}>
          <Stack direction="column" gap={3}>
            <Text variant="caption" tone="muted" style={{ fontWeight: 700 }}>Entry preview</Text>
            {!log.type && !log.direction ? (
              <Text variant="micro" tone="subtle" style={{ textAlign: "center", padding: "20px 0" }}>
                Start filling in the form to preview your entry
              </Text>
            ) : (
              <Stack direction="column" gap={2}>
                <Stack direction="row" gap={1} wrap>
                  {log.type ? <Badge variant="subtle" size="small" color={TYPE_BADGE[log.type]} label={log.type} /> : null}
                  {log.direction ? <Badge variant="subtle" size="small" color={DIR_BADGE[log.direction]} label={log.direction} /> : null}
                  {log.urgency ? <Badge variant="subtle" size="small" color={URGENCY_BADGE[log.urgency]} label={log.urgency} /> : null}
                  {log.scope ? <Badge variant="subtle" size="small" color="default" label={log.scope} /> : null}
                </Stack>
                {log.title ? <Text variant="caption" tone="strong">{log.title}</Text> : null}
                {log.body ? (
                  <Text variant="micro" tone="muted" style={{ lineHeight: 1.5 }}>
                    {log.body.slice(0, 200)}{log.body.length > 200 ? "…" : ""}
                  </Text>
                ) : null}
                {log.skus.length ? (
                  <Stack direction="row" gap={1} wrap>
                    {log.skus.map((s) => <SkuChip key={s}>{s}</SkuChip>)}
                  </Stack>
                ) : null}
              </Stack>
            )}
            {feedsModelPreview ? (
              <NoteBox tone="accent" label="Model tags">
                {log.direction === "threat" ? "Reduce" : "Boost"} confidence for{" "}
                {log.skus.join(", ")} at {log.scope || "specified"} level.
              </NoteBox>
            ) : null}
          </Stack>
        </Card>
      </div>
    </Grid>
  );

  /* ═══════════════ SHELL ═══════════════ */
  return (
    <Stack direction="column" gap={4}>
      {/* Header */}
      <Card sx={{ ...softSx, padding: "var(--sp-4) var(--sp-5)" }}>
        <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
          <Text variant="title">Market Intelligence</Text>
          <Stack direction="row" gap={2} wrap align="center">
            {view !== "log" && (
              <>
                <Chips label="Inbox" isActive={view === "inbox"} onClick={() => setView("inbox")} />
                <Chips label="Signal map" isActive={view === "map"} onClick={() => setView("map")} />
              </>
            )}
            {view === "log" ? (
              <Button variant="secondary" size="medium" onClick={() => setView("inbox")}>
                ← Back to inbox
              </Button>
            ) : (
              <Button variant="primary" size="medium" onClick={() => { setView("log"); setLog(EMPTY_LOG); }}>
                + Log intelligence
              </Button>
            )}
          </Stack>
        </Stack>
      </Card>

      {/* Log form (full-width, no sidebar) */}
      {view === "log" ? logForm : (
        <>
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
            onSecondaryButtonClick={() => { setStatus("all"); setDirFilter(null); setTypeFilter(null); setConfFilter(null); }}
          />
          {/* 3-pane shell */}
          <div className="mi-shell">
            {sidebar}
            <div className="mi-main-pane">
              {view === "inbox" ? cardGrid : mapView}
            </div>
            <div className={`mi-detail-rail${selectedId && selected ? " is-open" : ""}`}>
              {detailPanel}
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={`mi-toast mi-toast--${toast.tone}`}>{toast.msg}</div>
      )}
    </Stack>
  );
}
