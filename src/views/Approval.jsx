import React, { useState } from "react";
import { Badge, Button } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import {
  PLANS, PIPE_STAGES, PLAN_STATUS, PLR_PERIODS,
} from "../data/workspace.js";
import "./Approval.css";

/* ─── Lane definitions (mirrors HTML renderApproval LANES[]) ────────────── */
const LANES = [
  {
    id: "setup",
    label: "PLR Set Up",
    icon: "⚙️",
    pipe: "catalogue",
    actions: [
      { l: "Edit PLR",             mod: null },
      { l: "Merchant Add",         mod: "catalogue" },
      { l: "Merchant Drop",        mod: "catalogue" },
      { l: "Set to Ready for SDRM",mod: null },
    ],
    statusFn: (plan) =>
      `PLR Pres: ${plan.name}\nPlan created: ${plan.createdAt}`,
  },
  {
    id: "store",
    label: "Store Reviews",
    icon: "🏠",
    pipe: "curation",
    actions: [
      { l: "Add / Drop",            mod: "store-curation" },
      { l: "PLR Summary",           mod: "national" },
      { l: "SDRM Export",           mod: null },
      { l: "Store Activity Report", mod: null },
    ],
    statusFn: (plan) => {
      const cls = plan.clustIds || [];
      const done = plan.stagesCompleted.includes("curation") ? cls.length : 0;
      return `Clusters done: ${done} of ${cls.length}\nDays open: ${done === cls.length ? 0 : 35}`;
    },
  },
  {
    id: "existing",
    label: "Existing SKU Approval",
    icon: "📋",
    pipe: "regional",
    actions: [
      { l: "National Core",   mod: "national" },
      { l: "Regional Review", mod: "regional" },
      { l: "Catalogue",       mod: "catalogue" },
    ],
    statusFn: (plan) => {
      const natDone = plan.stagesCompleted.includes("national");
      const regDone = plan.stagesCompleted.includes("regional");
      return `National Core: ${natDone ? "✓ Complete" : "Pending"}\nRegional: ${regDone ? "✓ Complete" : "Pending"}`;
    },
  },
  {
    id: "npi",
    label: "New Item Forecasting",
    icon: "📊",
    pipe: "mpi",
    actions: [
      { l: "New SKU Selection",  mod: "mpi" },
      { l: "New Item Forecast",  mod: "forecast" },
    ],
    statusFn: (plan) => {
      const fDone = plan.stagesCompleted.includes("forecast");
      const mDone = plan.stagesCompleted.includes("mpi");
      return `NPI items: ${mDone ? "✓ Reviewed" : "Pending"}\nForecast: ${fDone ? "✓ Done" : "Pending"}`;
    },
  },
  {
    id: "sku-approval",
    label: "New SKU Approval",
    icon: "✅",
    pipe: "approval",
    actions: [
      { l: "Publish Assortment", mod: "approval" },
      { l: "Oracle Review",      mod: "oracle" },
    ],
    statusFn: (plan) => {
      const oDone = plan.stagesCompleted.includes("oracle");
      const aDone = plan.stagesCompleted.includes("approval");
      return `Oracle: ${oDone ? "✓ Done" : "Pending"}\nApproval: ${aDone ? "✓ Published" : "Not started"}`;
    },
  },
  {
    id: "hindsight",
    label: "Hindsight & Feedback",
    icon: "🔍",
    pipe: "hindsight",
    actions: [
      { l: "Hindsight Report", mod: "hindsight" },
      { l: "Feedback Loop",    mod: null },
    ],
    statusFn: (plan) => {
      const hDone = plan.stagesCompleted.includes("hindsight");
      return `Hindsight: ${hDone ? "✓ Complete" : "Pending"}\nFeedback: Active post-publish`;
    },
  },
];

/* Lane pipe keys in order — used for lock logic */
const LANE_PIPE_ORDER = LANES.map((l) => l.pipe);

/* ─── Derive lane state from plan stagesCompleted + activeStage ─────────── */
function laneStatus(lane, plan) {
  const key = lane.pipe;
  if (plan.stagesCompleted.includes(key)) return "done";
  if (plan.activeStage === key) return "active";
  // locked if any upstream lane pipe is not done and not active
  const myIdx = LANE_PIPE_ORDER.indexOf(key);
  for (let i = 0; i < myIdx; i++) {
    const upKey = LANE_PIPE_ORDER[i];
    if (!plan.stagesCompleted.includes(upKey) && plan.activeStage !== upKey) {
      return "locked";
    }
  }
  return "not-started";
}

/* ─── Lane visual theme maps ─────────────────────────────────────────────── */
const LANE_THEME = {
  done:        { border: "#10B981", headerBg: "#065F46", cardBg: "#F0FDF4", headerSub: "#A7F3D0", subLabel: "Complete",     statusColor: "#065F46", statusBorder: "#A7F3D0", btnBg: "#D1FAE5", btnBorder: "#6EE7B7", btnColor: "#065F46" },
  active:      { border: "#10B981", headerBg: "#0B3D2E", cardBg: "#F0FAFA", headerSub: "#6EEDB8", subLabel: "In progress",  statusColor: "#0F766E", statusBorder: "#99F6E4", btnBg: "#CCFBF1", btnBorder: "#99F6E4", btnColor: "#0F766E" },
  locked:      { border: "#E2E8F0", headerBg: "#334155", cardBg: "#F8FAFC", headerSub: "rgba(255,255,255,.4)", subLabel: "Locked",     statusColor: "#64748B", statusBorder: "#E2E8F0", btnBg: "#E2E8F0", btnBorder: "#CBD5E1", btnColor: "#94A3B8" },
  "not-started": { border: "#E2E8F0", headerBg: "#334155", cardBg: "#F8FAFC", headerSub: "rgba(255,255,255,.4)", subLabel: "Not started", statusColor: "#64748B", statusBorder: "#E2E8F0", btnBg: "#E2E8F0", btnBorder: "#CBD5E1", btnColor: "#475569" },
};

/* ─── Status badge color map ─────────────────────────────────────────────── */
const STATUS_BADGE = {
  draft:       { color: "neutral",  label: "Draft"        },
  "in-progress": { color: "info",   label: "In Progress"  },
  review:      { color: "warning",  label: "Under Review" },
  approved:    { color: "success",  label: "Approved"     },
};

/* ─── Swim Lane Card ─────────────────────────────────────────────────────── */
function SwimLane({ lane, plan, onNavigate }) {
  const st = laneStatus(lane, plan);
  const theme = LANE_THEME[st];
  const isDone   = st === "done";
  const isActive = st === "active";
  const isLocked = st === "locked";
  const statusLines = lane.statusFn(plan).split("\n");

  return (
    <div
      className={`ap-lane ap-lane--${st}`}
      style={{ borderColor: theme.border, background: theme.cardBg }}
    >
      {/* Lane header */}
      <div className="ap-lane-header" style={{ background: theme.headerBg }}>
        <div className="ap-lane-header-top">
          <span className="ap-lane-title">{lane.label}</span>
          {isDone   && <div className="ap-lane-check">✓</div>}
          {isActive && <div className="ap-lane-pulse" />}
          {isLocked && <span className="ap-lane-lock">🔒</span>}
        </div>
        <div className="ap-lane-sub" style={{ color: theme.headerSub }}>
          {theme.subLabel}
        </div>
      </div>

      {/* Action buttons */}
      <div className="ap-lane-actions">
        {lane.actions.map((act) => {
          const canClick = !isLocked && !!act.mod;
          return (
            <button
              key={act.l}
              type="button"
              className={`ap-action-btn ${canClick ? "ap-action-btn--clickable" : "ap-action-btn--disabled"}`}
              style={{
                background: theme.btnBg,
                borderColor: theme.btnBorder,
                color: theme.btnColor,
                cursor: canClick ? "pointer" : "not-allowed",
              }}
              disabled={!canClick}
              onClick={canClick ? () => onNavigate?.(act.mod) : undefined}
            >
              {act.l}
            </button>
          );
        })}
      </div>

      {/* Status footer */}
      <div className="ap-lane-footer" style={{ borderColor: theme.statusBorder }}>
        {statusLines.map((line, i) => (
          <div key={i} className="ap-lane-footer-line" style={{ color: theme.statusColor }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Plan Meta Header ───────────────────────────────────────────────────── */
function PlanMetaBar({ plan }) {
  const plrPeriod = PLR_PERIODS.find((p) => p.id === plan.plrId);
  const doneCount = PIPE_STAGES.filter((s) => plan.stagesCompleted.includes(s.id)).length;
  const pct = Math.round((doneCount / PIPE_STAGES.length) * 100);
  const badge = STATUS_BADGE[plan.status] || STATUS_BADGE.draft;

  return (
    <div className="ap-meta-bar">
      <div className="ap-meta-left">
        <div className="ap-meta-accent" />
        <div className="ap-meta-fields">
          <div className="ap-meta-row">
            <span className="ap-meta-key">DEPARTMENT</span>
            <span className="ap-meta-val">{plan.dept}</span>
            {plan.plrId && (
              <>
                <span className="ap-meta-key">PLR ID</span>
                <span className="ap-meta-val">{plan.plrId}</span>
              </>
            )}
            <span className="ap-meta-key">PLR NAME</span>
            <span className="ap-meta-val">{plan.name}</span>
          </div>
          <div className="ap-meta-row">
            {plrPeriod ? (
              <>
                <span className="ap-meta-key">PLR PRESENTATION DATE</span>
                <span className="ap-meta-val ap-meta-val--green">{plrPeriod.due}</span>
                <span className="ap-meta-key">SEASON</span>
                <span className="ap-meta-val">{plrPeriod.season}</span>
              </>
            ) : (
              <span className="ap-meta-no-plr">No PLR period linked — created manually</span>
            )}
          </div>
        </div>
      </div>
      <div className="ap-meta-right">
        <div className="ap-meta-progress">
          <div className="ap-meta-progress-label">Pipeline progress</div>
          <div className="ap-meta-progress-row">
            <div className="ap-meta-progress-track">
              <div className="ap-meta-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="ap-meta-progress-val">{doneCount}/{PIPE_STAGES.length}</span>
          </div>
        </div>
        <Badge
          variant="subtle"
          color={badge.color}
          label={badge.label}
        />
      </div>
    </div>
  );
}

/* ─── Main PLR Status View ───────────────────────────────────────────────── */
export default function Approval({ onNavigate }) {
  const [planIdx, setPlanIdx] = useState(0);
  const [published, setPublished] = useState(false);

  // Mirrors HTML: show non-draft plans; fall back to all plans
  const activePlans = PLANS.filter((p) => p.status !== "draft");
  const displayPlans = activePlans.length ? activePlans : PLANS;
  const plan = displayPlans[Math.min(planIdx, displayPlans.length - 1)];

  // Publish gate: all PIPE_STAGES except 'approval' must be done
  const allDone = PIPE_STAGES.every(
    (s) => s.id === "approval" || plan.stagesCompleted.includes(s.id)
  );
  const doneCount = PIPE_STAGES.filter((s) => plan.stagesCompleted.includes(s.id)).length;

  return (
    <div className="ap-root">
      {/* ── Dark page header ────────────────────────────────────────────────── */}
      <div className="ap-page-header">
        <div className="ap-page-header-top">
          <div className="ap-page-header-left">
            <div className="ap-page-title">Product Line Reviews</div>
            <div className="ap-page-subtitle">
              PLR Review Status &nbsp;·&nbsp; {displayPlans.length} active plan{displayPlans.length !== 1 ? "s" : ""}
            </div>
          </div>
          <button
            type="button"
            className="ap-create-btn"
            onClick={() => onNavigate?.("workspace")}
          >
            + Create New PLR
          </button>
        </div>

        {/* Plan selector tabs — only shown when >1 plan */}
        {displayPlans.length > 1 && (
          <div className="ap-plan-tabs">
            {displayPlans.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`ap-plan-tab ${i === planIdx ? "active" : ""}`}
                onClick={() => setPlanIdx(i)}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Plan meta bar ───────────────────────────────────────────────────── */}
      <PlanMetaBar plan={plan} />

      {/* ── Swim lanes ──────────────────────────────────────────────────────── */}
      <div className="ap-swim-scroll">
        <div className="ap-swim-row">
          {LANES.map((lane) => (
            <SwimLane
              key={lane.id}
              lane={lane}
              plan={plan}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>

      {/* ── Bottom action bar ───────────────────────────────────────────────── */}
      <div className="ap-action-bar">
        <div className="ap-action-bar-left">
          {doneCount} of {PIPE_STAGES.length} pipeline stages complete
          {plan.notes ? <>&nbsp;·&nbsp;<span className="ap-action-note">{plan.notes}</span></> : null}
        </div>
        <button
          type="button"
          className={`ap-publish-btn ${allDone ? "ap-publish-btn--enabled" : "ap-publish-btn--disabled"}`}
          disabled={!allDone && !published}
          onClick={allDone ? () => setPublished(true) : undefined}
        >
          {published ? "✅ Assortment Published" : "✅ Publish Assortment"}
        </button>
      </div>
    </div>
  );
}
