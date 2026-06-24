import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card, Badge, EmptyState, Button, Checkbox, Input, Chips } from "impact-ui";
import { FolderOpen, BarChart2, Calculator, Lock, Archive, Satellite, Puzzle, MapPin, CheckCircle2, Bot, Check, AlertTriangle, Globe, Brain, Package, Play, X } from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import StepIndicator from "../components/StepIndicator.jsx";
import {
  PLANS, PIPE_STAGES, PLAN_STATUS, PLAN_MODE,
  DEPT_OPTIONS, CLUSTERING_SCENARIOS, CONTEXT_CHIPS, PLR_PERIODS,
} from "../data/workspace.js";
import {
  CATALOGUE_SKUS, HARD_LOCKED_COUNT, STORE_PICK_COUNT,
  runCatalogueAgent,
} from "../data/catalogue.js";
import { FD_STORES } from "../data/stores.js";
import { FD_CLUST_SCENARIOS } from "../data/clusters.js";
import { CLUSTER_ACCEPTANCE } from "../data/clustering.js";
import { FD_ASSORTMENT } from "../data/assortment.js";
import { INTEL_SEED } from "../data/intel.js";
import { setAgentPlan, getAgentPlan, resetAgentPlan } from "../data/agentStore.js";
import { panelSx, softSx } from "../styles/panelSx.js";
import "./Workspace.css";

/* ─── Agent recommendation pipeline ────────────────────────────────────── */
const AGENT_PIPELINE = [
  { id: "scan",    Icon: FolderOpen,  tone: "primary", title: "Scanning FW 2025 catalogue",
    result: (c) => `${c.total} SKUs · ${c.coreLocked} locked Core/BG · ${c.eligible} eligible to score` },
  { id: "r13",     Icon: BarChart2,   tone: "info",    title: "Analyzing R13 sell-through",
    result: (c) => `${c.assortRows.toLocaleString()} store-SKU rows · ${c.storeCount} stores` },
  { id: "carry",   Icon: Calculator,  tone: "primary", title: "Computing carry rates & avg sqft",
    result: (c) => `Carry % + avg sqft scored for ${c.eligible} SKUs` },
  { id: "core",    Icon: Lock,        tone: "success", title: "Selecting National Core",
    result: (c) => `${c.natCount} SKUs promoted to Core` },
  { id: "cluster", Icon: Archive,     tone: "teal",    title: "Evaluating behavioral clusters",
    result: (c) => `${c.clCount} cluster adds across ${c.clusterCount} clusters` },
  { id: "intel",   Icon: Satellite,   tone: "accent",  title: "Applying Market Intel signals",
    result: (c) => (c.intelSignals ? `${c.intelSignals} actioned signal(s) folded in` : "No actioned signals — R13 only") },
  { id: "plan",    Icon: Puzzle,      tone: "success", title: "Generating 3-tier assortment plan",
    result: (c) => `Core ${c.natCount} · Cluster ${c.clCount} · Store ${c.storePicks}` },
];

const AGENT_TIERS = [
  { Icon: Lock,    tier: "National Core", desc: "SKUs with ≥80% carry + high avg sqft → mandatory all stores", tone: "success" },
  { Icon: Archive, tier: "Cluster Adds",  desc: "SKUs with ≥70% carry within a cluster → mandatory for that cluster", tone: "teal" },
  { Icon: MapPin,  tier: "Store Picks",   desc: "Remaining catalogue SKUs available for individual store selection", tone: "accent" },
];

/* ─── Animated agent run panel ──────────────────────────────────────────── */
/*
 * Props:
 *   ctx          — pipeline context (counts, totals)
 *   onPersist    — called once when animation reaches 100% to save to agentStore
 *   preFinished  — true when mounting already-complete (re-visit after a prior run)
 *   onNavigate   — passed through for "View Catalogue →" CTA
 *   onReRun      — passed through for "Re-run" CTA
 */
function AgentRunPanel({ ctx, onPersist, preFinished = false, onNavigate, onReRun }) {
  const total = AGENT_PIPELINE.length;
  // If re-visiting an already-complete run, start fully done; else animate from 0
  const [done, setDone] = useState(preFinished ? total : 0);
  const persistedRef = useRef(preFinished); // prevent double-persist

  useEffect(() => {
    if (preFinished) return; // already complete — no animation needed
    if (done >= total) {
      if (!persistedRef.current) {
        persistedRef.current = true;
        onPersist?.();
      }
      return;
    }
    const dur = 640 + (done % 3) * 200;
    const t = setTimeout(() => setDone((d) => d + 1), dur);
    return () => clearTimeout(t);
  }, [done, total, preFinished, onPersist]);

  const finished = done >= total;
  const pct = Math.round((done / total) * 100);
  const activeStep = finished ? null : AGENT_PIPELINE[done];

  return (
    <Card size="small" sx={{ ...panelSx, ...(finished ? { borderLeft: "3px solid var(--color-success)" } : {}) }}>
      <div className={`cat-run${finished ? " is-complete" : ""}`}>

        {/* Header */}
        <div className="cat-run-head">
          <div className={`cat-bot ${finished ? "is-done" : ""}`}>
            {finished ? <CheckCircle2 size={22} aria-hidden="true" /> : <Bot size={22} aria-hidden="true" />}
          </div>
          <div className="cat-run-head-txt">
            <Text variant="subheading" tone={finished ? "success" : "primary"}>
              {finished ? "Assortment plan ready · all tiers applied" : "Agent is building your assortment…"}
            </Text>
            <Text variant="caption" tone="muted">
              {finished
                ? `All ${total} stages complete — Core ${ctx.natCount} · Cluster ${ctx.clCount} · Store ${ctx.storePicks} SKUs tiered`
                : `Step ${Math.min(done + 1, total)} of ${total} · ${activeStep?.title ?? ""}`}
            </Text>
          </div>
          <div className="cat-run-pct">
            <Text variant="kpi" tone={finished ? "success" : "primary"}>{pct}%</Text>
          </div>
        </div>

        {/* Progress bar */}
        <div className="cat-run-bar">
          <div
            className={`cat-run-bar-fill${finished ? " is-complete" : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Steps + terminal */}
        <div className="cat-run-grid">
          <ol className="cat-steps">
            {AGENT_PIPELINE.map((s, i) => {
              // When finished every step is done — no more spinners
              const state = finished ? "done" : i < done ? "done" : i === done ? "active" : "queued";
              return (
                <li key={s.id} className={`cat-step is-${state}`}>
                  <span className={`cat-step-ico tone-${s.tone}`}>
                    {state === "done"
                      ? <Check size={13} aria-hidden="true" />
                      : state === "active"
                        ? <span className="cat-spin" />
                        : <s.Icon size={13} aria-hidden="true" />}
                  </span>
                  <div className="cat-step-body">
                    <span className="cat-step-title">{s.title}</span>
                    <span className="cat-step-sub">
                      {state === "active"
                        ? <>{s.sub}<span className="cat-dots" /></>
                        : state === "done"
                          ? s.result(ctx)
                          : "Waiting…"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className={`cat-console${finished ? " is-complete" : ""}`} aria-hidden="true">
            <div className="cat-console-bar">
              <span className="cat-dot r" /><span className="cat-dot y" />
              <span className={`cat-dot g${finished ? " is-pulse" : ""}`} />
              <span className="cat-console-title">
                assortment-agent · trace{finished ? " · complete" : ""}
              </span>
              {finished && (
                <span className="cat-console-badge">exit 0</span>
              )}
            </div>
            <div className="cat-console-body">
              <div className="cat-log cat-log-muted">
                $ agent run --catalogue FW2025 --stores {ctx.storeCount} --season SS2026
              </div>
              {/* Always show all steps when finished, else only completed ones */}
              {(finished ? AGENT_PIPELINE : AGENT_PIPELINE.slice(0, done)).map((s) => (
                <div key={s.id} className="cat-log">
                  <span className="cat-log-ok">✓</span> {s.title}{" "}
                  <span className="cat-log-muted">— {s.result(ctx)}</span>
                </div>
              ))}
              {/* Active step — blinking cursor while running */}
              {!finished && (
                <div className="cat-log cat-log-run">
                  <span className="cat-log-arrow">▸</span> {activeStep?.title}<span className="cat-cursor" />
                </div>
              )}
              {/* Completion footer lines */}
              {finished && (
                <>
                  <div className="cat-log cat-log-done">
                    ✓ Plan committed · Core {ctx.natCount} · Cluster {ctx.clCount} · Store {ctx.storePicks}
                  </div>
                  <div className="cat-log cat-log-muted">
                    [ok] catalogue.write: {ctx.total} SKUs tiered · {ctx.coreLocked} locked
                  </div>
                  <div className="cat-log cat-log-muted">
                    [ok] agent-store.commit · {ctx.intelSignals} intel signal(s) applied
                  </div>
                  <div className="cat-log cat-log-exit">
                    Run completed · exit 0
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action row — only shown when complete */}
        {finished && (
          <div className="cat-run-actions">
            <Button variant="primary" size="small" onClick={() => onNavigate?.("catalogue")}>
              View Catalogue →
            </Button>
            <Button variant="outlined" size="small" onClick={() => onNavigate?.("national")}>
              Review National Core
            </Button>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" size="small" onClick={onReRun}>
              Re-run
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─── Top-of-Workspace agent section ────────────────────────────────────── */
function AgentSection({ onNavigateCatalogue, onNavigate }) {
  const scClusters = FD_CLUST_SCENARIOS.B.clusters;
  const existing = getAgentPlan();
  const alreadyRun = !!existing.agentRunAt;

  // phases: "idle" | "running" | "complete"
  const [phase, setPhase]   = useState(alreadyRun ? "complete" : "idle");
  const [plan,  setPlanLocal] = useState(alreadyRun ? existing : null);
  // collapsed only when user explicitly collapses — never auto-collapse after run
  const [collapsed, setCollapsed] = useState(false);

  const runAgent = () => {
    const result = runCatalogueAgent();
    setPlanLocal(result);
    setPhase("running");
    setCollapsed(false);
  };
  const reRun = () => {
    resetAgentPlan();
    setPlanLocal(null);
    setPhase("idle");
    setCollapsed(false);
  };
  // Called once when animation finishes — persists plan, keeps panel visible
  const onPersist = () => {
    setAgentPlan(plan);
    setPhase("complete");
  };

  const natCount = plan
    ? HARD_LOCKED_COUNT + Object.values(plan.natDecisions || {}).filter((v) => v === "core").length
    : HARD_LOCKED_COUNT;
  const clCount = plan
    ? Object.values(plan.clusterDecisions || {}).filter((v) => v === "add").length
    : 0;

  const agentCtx = useMemo(() => ({
    total: CATALOGUE_SKUS.length,
    coreLocked: HARD_LOCKED_COUNT,
    eligible: CATALOGUE_SKUS.filter((s) => !s.tag && s.status === "Active").length,
    assortRows: FD_ASSORTMENT.length,
    storeCount: FD_STORES.length,
    clusterCount: scClusters.length,
    intelSignals: INTEL_SEED.filter((i) => i.feedsModel && (i.status === "actioned" || i.status === "reviewed")).length,
    natCount,
    clCount,
    storePicks: STORE_PICK_COUNT,
  }), [natCount, clCount, scClusters.length]);

  /* Compact collapsed banner — only shown when user explicitly collapses */
  if (phase === "complete" && collapsed) {
    return (
      <Card size="small" sx={{ ...panelSx, borderLeft: "3px solid var(--color-success)" }}>
        <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
          <Stack direction="row" gap={2} align="center" flex="1 1 auto" style={{ minWidth: 0 }}>
            <CheckCircle2 size={20} aria-hidden="true" style={{ color: "var(--color-success)", flexShrink: 0 }} />
            <Stack direction="column" gap={0}>
              <Text variant="body-strong" tone="success">Assortment agent complete</Text>
              <Text variant="micro" tone="muted">
                Core {natCount} · Cluster {clCount} · Store {STORE_PICK_COUNT} · {plan?.agentRunAt}
              </Text>
            </Stack>
          </Stack>
          <Stack direction="row" gap={2} wrap>
            <Button variant="secondary" size="small" onClick={() => setCollapsed(false)}>View run log</Button>
            <Button variant="ghost" size="small" onClick={reRun}>Re-run</Button>
            <Button variant="primary" size="small" onClick={onNavigateCatalogue}>View Catalogue →</Button>
          </Stack>
        </Stack>
      </Card>
    );
  }

  /* Idle CTA */
  if (phase === "idle") {
    return (
      <Card size="small" sx={panelSx}>
        <Stack direction="row" gap={3} align="flex-start" wrap>
          <Stack className="cat-agent-dot" align="center" justify="center"
            style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--color-primary-soft)", flexShrink: 0 }}>
            <Bot size={22} aria-hidden="true" style={{ color: "var(--color-primary)" }} />
          </Stack>
          <Stack direction="column" gap={3} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="subheading" tone="primary">Agent Assortment Recommendation</Text>

            {/* Pipeline preview */}
            <div className="cat-pipe">
              {AGENT_PIPELINE.map((s, i) => (
                <React.Fragment key={s.id}>
                  <span className={`cat-pipe-chip tone-${s.tone}`}>
                    <span className="cat-pipe-ico"><s.Icon size={12} aria-hidden="true" /></span>
                    <span className="cat-pipe-label">{s.title.replace(/^(Scanning|Analyzing|Computing|Selecting|Evaluating|Applying|Generating) /, "")}</span>
                  </span>
                  {i < AGENT_PIPELINE.length - 1 && <span className="cat-pipe-arrow">→</span>}
                </React.Fragment>
              ))}
            </div>

            <Grid min={180} gap={3}>
              {AGENT_TIERS.map((t) => (
                <Card size="small" key={t.tier} sx={softSx}>
                  <Stack direction="column" gap={1}>
                    <t.Icon size={18} aria-hidden="true" style={{ color: `var(--color-${t.tone})` }} />
                    <Text variant="body-strong" tone={t.tone}>{t.tier}</Text>
                  </Stack>
                </Card>
              ))}
            </Grid>

            <Stack direction="row" gap={3} align="center" wrap>
              <Button variant="primary" size="medium" onClick={runAgent}><Bot size={14} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} />Run agent recommendation</Button>
            </Stack>
          </Stack>
        </Stack>
      </Card>
    );
  }

  /* Running — animated panel (stays visible when done) */
  if (phase === "running" || phase === "complete") {
    return (
      <Stack direction="column" gap={3}>
        <AgentRunPanel
          ctx={agentCtx}
          onPersist={onPersist}
          preFinished={phase === "complete"}
          onNavigate={onNavigate ?? onNavigateCatalogue}
          onReRun={reRun}
        />

        {/* Tier summary — shown below terminal once complete */}
        {phase === "complete" && (
          <>
            <Grid columns={3} gap={3}>
              {[
                { Icon: Lock,    label: "National Core", n: natCount,         note: "All stores · locked",   color: "var(--color-success)", tone: "success" },
                { Icon: Archive, label: "Cluster Adds",  n: clCount,          note: "Per-cluster mandatory", color: "var(--color-teal)",    tone: "info" },
                { Icon: MapPin,  label: "Store Picks",   n: STORE_PICK_COUNT, note: "Store-level curation",  color: "var(--color-accent)",  tone: "default" },
              ].map((t) => (
                <Card size="small" key={t.label} sx={{ ...softSx, borderTop: `3px solid ${t.color}`, padding: "var(--sp-4)" }}>
                  <Stack direction="column" gap={1}>
                    <t.Icon size={18} aria-hidden="true" style={{ color: t.color }} />
                    <Text variant="kpi" tone={t.tone}>{t.n}</Text>
                    <Text variant="body-strong" tone="strong">{t.label}</Text>
                    <Text variant="micro" tone="muted">{t.note}</Text>
                  </Stack>
                </Card>
              ))}
            </Grid>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="ghost" size="small" onClick={() => setCollapsed(true)}>
                Collapse run log
              </Button>
            </div>
          </>
        )}
      </Stack>
    );
  }
}

/* ─── Shared atoms ──────────────────────────────────────────────────────── */
const STATUS_BADGE_COLOR = {
  draft: "neutral", "in-progress": "info", review: "warning", approved: "success",
};
const MODE_BADGE_COLOR = {
  gated: "accent", autonomous: "teal",
};
function StatusPill({ status }) {
  const s = PLAN_STATUS[status] || PLAN_STATUS.draft;
  return (
    <Badge variant="subtle" color={STATUS_BADGE_COLOR[status] || "neutral"} label={s.label} />
  );
}
function ModePill({ mode }) {
  const m = PLAN_MODE[mode] || PLAN_MODE.gated;
  return (
    <Badge variant="subtle" color={MODE_BADGE_COLOR[mode] || "neutral"} label={m.label} />
  );
}

function PipelineMicroBar({ stages, completed, active }) {
  return (
    <div className="ws-pipe-bar" title="Pipeline progress">
      {stages.map((s) => {
        const done = completed.includes(s.id);
        const isCurrent = s.id === active && !done;
        return (
          <div
            key={s.id}
            className={`ws-pipe-seg ${done ? "done" : isCurrent ? "active" : "pending"}`}
            title={s.label}
          />
        );
      })}
    </div>
  );
}

function KpiChip({ label, value }) {
  return (
    <Stack direction="column" align="center" gap={0} style={{ flex: 1, minWidth: 56 }}>
      <Text variant="kpi" tone="strong">{value}</Text>
      <Text variant="overline" tone="muted">{label}</Text>
    </Stack>
  );
}

/* ─── Plan Card ─────────────────────────────────────────────────────────── */
function PlanCard({ plan, onOpen, selected, onToggleCompare }) {
  const completedPct = Math.round((plan.stagesCompleted.length / PIPE_STAGES.length) * 100);
  return (
    <Card
      size="small"
      className={`ws-plan-card ${selected ? "ws-plan-card--selected" : ""}`}
      onClick={() => onOpen(plan.id)}
      sx={{ cursor: "pointer", padding: "var(--sp-4)", transition: "box-shadow 0.15s" }}
    >
      <div className="ws-plan-card-header">
        <div className="ws-plan-card-title">
          <Text variant="body-strong" tone="strong" style={{ flex: 1, minWidth: 0 }}>{plan.name}</Text>
          <StatusPill status={plan.status} />
        </div>
        <div className="ws-plan-card-meta">
          <ModePill mode={plan.mode} />
          <span className="ws-plan-dept">{plan.dept}</span>
          <span className="ws-plan-season">{plan.season}</span>
          {plan.clustIds?.length > 0 && (
            <span className="ws-cluster-pills">
              {plan.clustIds.map((id) => (
                <span key={id} className="ws-cluster-pill">{id}</span>
              ))}
            </span>
          )}
        </div>
      </div>

      <PipelineMicroBar stages={PIPE_STAGES} completed={plan.stagesCompleted} active={plan.activeStage} />

      <div className="ws-plan-card-kpis">
        <KpiChip label="Stores" value={plan.kpis.stores} />
        <KpiChip label="SKUs" value={plan.kpis.skus} />
        <KpiChip label="Core" value={plan.kpis.coreCount} />
        <KpiChip label="Submitted" value={`${plan.kpis.submittedPct}%`} />
        <KpiChip label="Complete" value={`${completedPct}%`} />
      </div>

      {plan.notes && <p className="ws-plan-notes">{plan.notes}</p>}

      <div className="ws-plan-card-footer">
        <Text variant="micro" tone="muted">Updated {plan.updatedAt}</Text>
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            label="Compare"
            checked={selected}
            onChange={(e) => { e.stopPropagation(); onToggleCompare(plan.id); }}
          />
        </div>
      </div>
    </Card>
  );
}

/* ─── Compare Tray ──────────────────────────────────────────────────────── */
function CompareTray({ planIds, plans, onClose }) {
  if (!planIds.length) return null;
  const selected = plans.filter((p) => planIds.includes(p.id));
  const metrics = [
    { key: "skus",         label: "SKUs" },
    { key: "coreCount",    label: "Core SKUs" },
    { key: "submittedPct", label: "Submitted %" },
  ];
  return (
    <div className="ws-compare-tray">
      <div className="ws-compare-tray-inner">
        <span className="ws-compare-label">Compare ({planIds.length}/3)</span>
        <div className="ws-compare-slots">
          {selected.map((p) => (
            <div key={p.id} className="ws-compare-slot">
              <span className="ws-compare-slot-name">{p.name}</span>
              <div className="ws-compare-slot-kpis">
                {metrics.map((m) => (
                  <span key={m.key} className="ws-compare-slot-kpi">
                    <strong>{p.kpis[m.key]}{m.key === "submittedPct" ? "%" : ""}</strong> {m.label}
                  </span>
                ))}
              </div>
              <StatusPill status={p.status} />
            </div>
          ))}
          {Array.from({ length: 3 - planIds.length }).map((_, i) => (
            <div key={`empty-${i}`} className="ws-compare-slot ws-compare-slot--empty">
              + add a plan
            </div>
          ))}
        </div>
        <div className="ws-compare-tray-actions">
          <Button
            variant="primary"
            size="small"
            disabled={planIds.length < 2}
            onClick={() => {/* View comparison logic */}}
          >
            View Comparison →
          </Button>
          <Button variant="ghost" size="small" onClick={onClose}>
            <X size={12} aria-hidden="true" style={{ marginRight: 4, verticalAlign: "middle" }} />Clear
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Plan Detail (9-stage pipeline view) ───────────────────────────────── */
function PlanDetail({ plan, onBack, onNavigate }) {
  const completedSet = new Set(plan.stagesCompleted);
  return (
    <div className="ws-detail">
      <div className="ws-detail-header">
        <Button variant="ghost" size="small" onClick={onBack} style={{ marginBottom: "var(--sp-3)", paddingLeft: 0 }}>
          ← All Plans
        </Button>
        <div className="ws-detail-title-row">
          <Text variant="title" tone="strong">{plan.name}</Text>
          <StatusPill status={plan.status} />
          <ModePill mode={plan.mode} />
        </div>
        <Text variant="caption" tone="muted" style={{ margin: "var(--sp-1) 0 var(--sp-2)" }}>
          {plan.dept} · {plan.season} · Created by {plan.createdBy} on {plan.createdAt}
        </Text>
        {plan.notes && <div className="ws-detail-notes">{plan.notes}</div>}
      </div>

      <div className="ws-detail-kpi-row">
        {[
          { label: "Stores",    val: plan.kpis.stores },
          { label: "SKUs",      val: plan.kpis.skus },
          { label: "Core SKUs", val: plan.kpis.coreCount },
          { label: "Submitted", val: `${plan.kpis.submittedPct}%` },
          { label: "Confidence threshold", val: `${plan.confidenceThreshold}%` },
        ].map((k) => (
          <div key={k.label} className="ws-detail-kpi">
            <span className="ws-detail-kpi-val">{k.val}</span>
            <span className="ws-detail-kpi-lbl">{k.label}</span>
          </div>
        ))}
      </div>

      <Text variant="overline" tone="muted" style={{ marginBottom: "var(--sp-3)", display: "block" }} />
      <div className="ws-pipeline-grid">
        {PIPE_STAGES.map((s, i) => {
          const done = completedSet.has(s.id);
          const isCurrent = s.id === plan.activeStage && !done;
          const state = done ? "done" : isCurrent ? "active" : "pending";
          return (
            <div key={s.id} className={`ws-stage-card ws-stage-card--${state}`}>
              <div className="ws-stage-num">{i + 1}</div>
              <div className="ws-stage-info">
                <span className="ws-stage-label">{s.label}</span>
                <span className="ws-stage-state">
                  {done
                    ? <><Check size={11} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 3 }} />Complete</>
                    : isCurrent
                    ? <><Play size={11} aria-hidden="true" style={{ verticalAlign: "middle", marginRight: 3 }} />In progress</>
                    : "Pending"}
                </span>
              </div>
              {(done || isCurrent) && (
                <Button
                  variant={isCurrent ? "primary" : "secondary"}
                  size="small"
                  onClick={() => onNavigate(s.mod)}
                >
                  {isCurrent ? "Go →" : "View →"}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {plan.activeStage && (
        <div className="ws-detail-cta">
          <Button
            variant="primary"
            size="medium"
            onClick={() => {
              const stage = PIPE_STAGES.find((s) => s.id === plan.activeStage);
              if (stage) onNavigate(stage.mod);
            }}
          >
            Go to {PIPE_STAGES.find((s) => s.id === plan.activeStage)?.label}
          </Button>
        </div>
      )}
    </div>
  );
}

/* ─── Active Cluster Model Banner ───────────────────────────────────────── */
const TIER_COLOR = { high: "success", mid: "warning", low: "error" };
const SCENARIO_ICON = { A: Globe, B: Brain, C: Package };

function ClusterBanner({ onNavigate }) {
  const { acceptedScenario, acceptedScope } = CLUSTER_ACCEPTANCE;

  if (!acceptedScenario) {
    return (
      <Card size="small" sx={{ ...panelSx, borderLeft: "3px solid var(--color-warning)", marginBottom: "var(--sp-4)" }}>
        <Stack direction="row" align="center" gap={3} wrap>
          <AlertTriangle size={20} aria-hidden="true" style={{ color: "var(--color-warning)", flexShrink: 0 }} />
          <Stack direction="column" gap={0} flex="1">
            <Text variant="body-strong" tone="warning">No cluster model accepted yet</Text>
            <Text variant="caption" tone="muted">Build and accept a cluster model before creating a plan.</Text>
          </Stack>
          <Button variant="ghost" size="small" onClick={() => onNavigate?.("clustering")}>
            Location Clustering →
          </Button>
        </Stack>
      </Card>
    );
  }

  const scenario = FD_CLUST_SCENARIOS[acceptedScenario];
  const ScenarioIcon = SCENARIO_ICON[acceptedScenario] || Puzzle;

  return (
    <Card size="small" sx={{ ...panelSx, borderLeft: "3px solid var(--color-success)", marginBottom: "var(--sp-4)" }}>
      <Stack direction="row" align="center" gap={3} wrap style={{ marginBottom: "var(--sp-3)" }}>
        <ScenarioIcon size={20} aria-hidden="true" style={{ color: "var(--color-success)", flexShrink: 0 }} />
        <Text variant="body-strong" tone="strong" style={{ flex: 1 }}>Active Cluster Model</Text>
        <Badge variant="subtle" color="success" label={scenario.name.split("—")[0].trim()} />
        <Text variant="caption" tone="muted">
          {acceptedScope.dept} · {acceptedScope.channel} · {acceptedScope.season}
        </Text>
        <Button variant="ghost" size="small" onClick={() => onNavigate?.("clustering")}>
          View / Edit →
        </Button>
      </Stack>
      <div className="ws-cluster-grid">
        {scenario.clusters.map((cl) => (
          <div key={cl.id} className="ws-cluster-col">
            <div className="ws-cluster-col-header">
              <span className="ws-cluster-dot" style={{ background: cl.color }} />
              <span className="ws-cluster-col-label">{cl.label}</span>
            </div>
            <div className="ws-cluster-col-stats">
              {cl.stores?.length ?? "—"} stores · ${cl.revSqft ?? "—"}/sqft
            </div>
            <Badge variant="subtle" color={TIER_COLOR[cl.tier] || "neutral"} size="small" label={cl.tier} />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Summary Stat Tiles ────────────────────────────────────────────────── */
function StatTiles({ plans }) {
  const tiles = [
    { label: "Total Plans",  value: plans.length,                                           accent: "var(--color-primary)", tone: "primary" },
    { label: "In Progress",  value: plans.filter((p) => p.status === "in-progress").length, accent: "var(--color-info)",    tone: "info" },
    { label: "Under Review", value: plans.filter((p) => p.status === "review").length,      accent: "var(--color-warning)", tone: "warning" },
    { label: "Approved",     value: plans.filter((p) => p.status === "approved").length,    accent: "var(--color-success)", tone: "success" },
  ];
  return (
    <Grid columns={4} gap={4} style={{ marginBottom: "var(--sp-5)" }}>
      {tiles.map((t) => (
        <Card size="small" key={t.label} sx={{ ...softSx, borderTop: `3px solid ${t.accent}`, padding: "var(--sp-5)" }}>
          <Stack direction="column" gap={1}>
            <Text variant="kpi" tone={t.tone} style={{ marginTop: "var(--sp-2)" }}>{t.value}</Text>
            <Text variant="overline" tone="muted">{t.label}</Text>
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}

/* ─── Create Wizard — 3-step HTML v6 flow ───────────────────────────────── */
const WIZARD_STEPS = ["Plan Details", "Clusters", "Review & Submit"];

function CreateWizard({ onClose, onCreate }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    name: "",
    dept: "Tile",
    plrId: "",
    clustScenario: CLUSTER_ACCEPTANCE.acceptedScenario || "B",
    clustIds: [],
  });

  const set = (key, val) => setDraft((d) => ({ ...d, [key]: val }));

  /* Derived cluster data for selected scenario tab */
  const scenarioClusters = FD_CLUST_SCENARIOS[draft.clustScenario]?.clusters || [];
  const totalStores = scenarioClusters
    .filter((cl) => draft.clustIds.includes(cl.id))
    .reduce((n, cl) => n + (cl.stores?.length ?? 0), 0);

  const selectedPlr = PLR_PERIODS.find((p) => p.id === draft.plrId);
  const missingFields = !draft.name.trim() || !draft.plrId || !draft.clustIds.length;

  const canNext = () => {
    if (step === 0) return draft.name.trim().length >= 3 && !!draft.plrId;
    if (step === 1) return draft.clustIds.length > 0;
    return true;
  };

  const handleCreate = () => {
    if (missingFields) return;
    const now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    onCreate({
      ...draft,
      season: selectedPlr?.season || "SS 2026",
      id: `p${Date.now()}`,
      status: "draft",
      mode: "gated",
      confidenceThreshold: 75,
      activeStage: "hindsight",
      stagesCompleted: [],
      kpis: { stores: totalStores || 70, skus: 0, coreCount: 0, submittedPct: 0 },
      createdBy: "Karen M.",
      createdAt: now,
      updatedAt: now,
    });
  };

  const useActiveModel = () => {
    const key = CLUSTER_ACCEPTANCE.acceptedScenario;
    if (!key) return;
    const allIds = (FD_CLUST_SCENARIOS[key]?.clusters || []).map((c) => c.id);
    set("clustScenario", key);
    setDraft((d) => ({ ...d, clustScenario: key, clustIds: allIds }));
  };

  return (
    <div className="ws-wizard-overlay" role="dialog" aria-modal="true" aria-labelledby="ws-wizard-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ws-wizard">
        <div className="ws-wizard-header">
          <Text variant="subheading" tone="strong" id="ws-wizard-title">Create Assortment Plan</Text>
          <button type="button" className="ws-wizard-close" onClick={onClose} aria-label="Close">
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <StepIndicator step={step} labels={WIZARD_STEPS} className="ws-wizard-steps" />

        <div className="ws-wizard-body">
          {/* ── Step 0: Plan Details ─────────────────────────────────────── */}
          {step === 0 && (
            <div className="ws-wizard-section">
              <Input
                label="Plan name"
                placeholder="e.g. SS 2026 Tile & Ceramic"
                value={draft.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />

              <Text variant="overline" tone="muted" style={{ marginTop: "var(--sp-4)", marginBottom: "var(--sp-1)", display: "block" }}>Department *</Text>
              <div className="ws-radio-group">
                {["Tile", "Wood / LVP", "Laminate & Vinyl", "All Departments"].map((d) => (
                  <label key={d} className={`ws-radio-card ${draft.dept === d ? "selected" : ""}`}>
                    <input type="radio" value={d} checked={draft.dept === d} onChange={() => set("dept", d)} />
                    {d}
                  </label>
                ))}
              </div>

              <Text variant="overline" tone="muted" style={{ marginTop: "var(--sp-5)", marginBottom: "var(--sp-1)", display: "block" }}>Assortment Period *</Text>
              <div className="ws-plr-list">
                {PLR_PERIODS.map((p) => (
                  <label key={p.id} className={`ws-plr-row ${draft.plrId === p.id ? "selected" : ""}`}>
                    <input type="radio" name="plr" value={p.id} checked={draft.plrId === p.id}
                      onChange={() => set("plrId", p.id)} />
                    <div className="ws-plr-row-body">
                      <div className="ws-plr-row-top">
                        <span className="ws-plr-dept">{p.dept}</span>
                        <span className="ws-plr-season">{p.season}</span>
                        <span className="ws-plr-weeks">{p.weeks}</span>
                        <Badge variant="subtle" size="small"
                          color={p.status === "active" ? "success" : "neutral"} label={p.status === "active" ? "Active" : "Draft"} />
                      </div>
                      <div className="ws-plr-row-sub">Due {p.due}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 1: Clusters ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="ws-wizard-section">
              {CLUSTER_ACCEPTANCE.acceptedScenario && (
                <div className="ws-active-model-hint">
                  <span>Active model: <strong>{FD_CLUST_SCENARIOS[CLUSTER_ACCEPTANCE.acceptedScenario]?.name.split("—")[0].trim()}</strong></span>
                  <Button variant="ghost" size="small" onClick={useActiveModel}>
                    {draft.clustScenario === CLUSTER_ACCEPTANCE.acceptedScenario &&
                     draft.clustIds.length === scenarioClusters.length
                      ? <><Check size={11} aria-hidden="true" style={{ marginRight: 3, verticalAlign: "middle" }} />Selected</>
                      : "Use active model"}
                  </Button>
                </div>
              )}

              <div className="ws-scenario-tabs">
                {Object.values(FD_CLUST_SCENARIOS).map((sc) => (
                  <button key={sc.id} type="button"
                    className={`ws-scenario-tab ${draft.clustScenario === sc.id ? "active" : ""}`}
                    onClick={() => setDraft((d) => ({ ...d, clustScenario: sc.id, clustIds: [] }))}>
                    {sc.id === "A" ? "Geographic" : sc.id === "B" ? "Behavioral ★" : "DC-based"}
                  </button>
                ))}
              </div>

              <div className="ws-clust-actions">
                <Button variant="ghost" size="small"
                  onClick={() => set("clustIds", scenarioClusters.map((c) => c.id))}>All</Button>
                <Button variant="ghost" size="small"
                  onClick={() => set("clustIds", [])}>None</Button>
              </div>

              <div className="ws-clust-list">
                {scenarioClusters.map((cl) => {
                  const checked = draft.clustIds.includes(cl.id);
                  return (
                    <label key={cl.id} className={`ws-clust-row ${checked ? "selected" : ""}`}>
                      <input type="checkbox" checked={checked} onChange={() =>
                        setDraft((d) => ({
                          ...d,
                          clustIds: checked ? d.clustIds.filter((x) => x !== cl.id) : [...d.clustIds, cl.id],
                        }))
                      } />
                      <span className="ws-clust-dot" style={{ background: cl.color }} />
                      <span className="ws-clust-name">{cl.label}</span>
                      <Badge variant="subtle" size="small" color={TIER_COLOR[cl.tier] || "neutral"} label={cl.tier} />
                      <span className="ws-clust-meta">{cl.stores?.length ?? "—"} stores · ${cl.revSqft ?? "—"}/sqft · ST {cl.st ?? "—"}%</span>
                    </label>
                  );
                })}
              </div>

              {draft.clustIds.length > 0 && (
                <div className="ws-clust-summary">
                  ✓ {draft.clustIds.length} cluster{draft.clustIds.length > 1 ? "s" : ""} selected — {totalStores} stores in scope
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Review & Submit ──────────────────────────────────── */}
          {step === 2 && (
            <div className="ws-wizard-section">
              <div className="ws-review-grid">
                {[
                  { label: "Plan Name",       val: draft.name || "—" },
                  { label: "Department",      val: draft.dept },
                  { label: "PLR Period",      val: selectedPlr ? `${selectedPlr.season} (${selectedPlr.weeks})` : "—" },
                  { label: "Cluster Model",   val: FD_CLUST_SCENARIOS[draft.clustScenario]?.name.split("—")[0].trim() || "—" },
                  { label: "Clusters",        val: draft.clustIds.length ? draft.clustIds.join(", ") : "—" },
                  { label: "Stores in scope", val: totalStores || "—" },
                ].map((r) => (
                  <div key={r.label} className="ws-review-row">
                    <span className="ws-review-key">{r.label}</span>
                    <span className="ws-review-val">{r.val}</span>
                  </div>
                ))}
              </div>

              <div className="ws-what-happens">
                {[
                  "Catalogue filters to your dept + clusters",
                  "National Core SKUs locked for all stores",
                  "Regional review sent to cluster leads",
                  "Store curation opens for individual picks",
                ].map((step, i) => (
                  <div key={i} className="ws-what-step">
                    <span className="ws-what-num">{i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {missingFields && (
                <div className="ws-missing-warn" />
              )}
            </div>
          )}
        </div>

        <div className="ws-wizard-footer">
          <Button variant="ghost" size="medium"
            onClick={step === 0 ? onClose : () => setStep(step - 1)}>
            {step === 0 ? "Cancel" : "← Back"}
          </Button>
          {step < WIZARD_STEPS.length - 1 ? (
            <Button variant="primary" size="medium" disabled={!canNext()}
              onClick={() => setStep(step + 1)}>
              Next →
            </Button>
          ) : (
            <Button variant="primary" size="medium" disabled={missingFields}
              onClick={handleCreate}>
              Submit for PLR Review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Workspace View ───────────────────────────────────────────────── */
export default function Workspace({ onNavigate, user }) { // eslint-disable-line no-unused-vars
  const [plans, setPlans]           = useState(PLANS);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("All");
  const [detailId, setDetailId]     = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showWizard, setShowWizard] = useState(false);

  const STATUS_FILTERS = ["all", "draft", "in-progress", "review", "approved"];

  const filtered = useMemo(() => plans.filter((p) => {
    const statusOk = statusFilter === "all" || p.status === statusFilter;
    const deptOk = deptFilter === "All" || p.dept === deptFilter;
    return statusOk && deptOk;
  }), [plans, statusFilter, deptFilter]);

  const toggleCompare = (id) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleCreate = (newPlan) => {
    setPlans((prev) => [newPlan, ...prev]);
    setShowWizard(false);
    setDetailId(newPlan.id);
  };

  const detailPlan = plans.find((p) => p.id === detailId);

  if (detailPlan) {
    return (
      <div className="ws-root">
        <PlanDetail plan={detailPlan} onBack={() => setDetailId(null)} onNavigate={onNavigate} />
      </div>
    );
  }

  const activePlansCount = plans.filter((p) => p.status === "in-progress").length;

  return (
    <div className="ws-root">
      <Card size="small" sx={{ ...panelSx, marginBottom: "var(--sp-6)" }}>
        <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
          <Stack direction="row" align="center" gap={3} flex="1 1 auto" style={{ minWidth: 0 }}>
            <Text variant="title">My Workspace</Text>
            <Badge variant="subtle" color="primary" size="small" label="SS 2026" />
            <Badge variant="subtle" color="success" size="small" label={`${activePlansCount} active`} />
          </Stack>
          <Button variant="primary" size="small" onClick={() => setShowWizard(true)}>
            + New Plan
          </Button>
        </Stack>
      </Card>

      {/* ── Agent Recommendation Section ─────────────────────────────────── */}
      <AgentSection onNavigateCatalogue={() => onNavigate?.("catalogue")} onNavigate={onNavigate} />

      {/* ── Active Cluster Model Banner ───────────────────────────────────── */}
      <ClusterBanner onNavigate={onNavigate} />

      {/* ── Summary Stat Tiles ────────────────────────────────────────────── */}
      <StatTiles plans={plans} />

      <div className="ws-filters">
        <Stack direction="row" align="center" gap={2} wrap>
          {STATUS_FILTERS.map((s) => (
            <Chips
              key={s}
              label={`${s === "all" ? "All" : PLAN_STATUS[s]?.label || s} (${s === "all" ? plans.length : plans.filter((p) => p.status === s).length})`}
              isActive={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            />
          ))}
        </Stack>
        <Stack direction="row" align="center" gap={2} wrap style={{ marginTop: "var(--sp-2)" }}>
          {DEPT_OPTIONS.map((d) => (
            <Chips
              key={d}
              label={d}
              isActive={deptFilter === d}
              onClick={() => setDeptFilter(d)}
            />
          ))}
        </Stack>
      </div>

      <div className="ws-section-header">
        <span className="ws-section-label">
          {filtered.length} {filtered.length === 1 ? "Plan" : "Plans"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          heading="No plans match"
          description="Try adjusting the filters above or create a new plan."
          action={<Button variant="primary" onClick={() => setShowWizard(true)}>+ New Plan</Button>}
        />
      ) : (
        <div className="ws-plan-grid">
          {filtered.map((p) => (
            <PlanCard
              key={p.id}
              plan={p}
              onOpen={setDetailId}
              selected={compareIds.includes(p.id)}
              onToggleCompare={toggleCompare}
            />
          ))}
        </div>
      )}

      <CompareTray planIds={compareIds} plans={plans} onClose={() => setCompareIds([])} />

      {showWizard && (
        <CreateWizard onClose={() => setShowWizard(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
