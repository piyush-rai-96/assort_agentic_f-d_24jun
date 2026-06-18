import React, { useMemo, useState } from "react";
import { Card, Badge, Button, ProgressBar, Chips, FiltersStrip, FilterPanel } from "impact-ui";
import { Cog, Home, ClipboardList, BarChart2, CheckCircle2, Search, Check, Lock } from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import FdSelect from "../components/FdSelect.jsx";
import {
  PLANS, PIPE_STAGES, PLAN_STATUS, PLR_PERIODS,
} from "../data/workspace.js";
import { panelSx } from "../styles/panelSx.js";
import "./Approval.css";

/* ─── Lane definitions ───────────────────────────────────────────────────── */
const LANES = [
  {
    id: "setup",
    label: "PLR Set Up",
    Icon: Cog,
    pipe: "catalogue",
    actions: [
      { l: "Edit PLR",              mod: null },
      { l: "Merchant Add",          mod: "catalogue" },
      { l: "Merchant Drop",         mod: "catalogue" },
      { l: "Set to Ready for SDRM", mod: null },
    ],
    statusFn: (plan) => [
      `PLR Pres: ${plan.name}`,
      `Plan created: ${plan.createdAt}`,
    ],
  },
  {
    id: "store",
    label: "Store Reviews",
    Icon: Home,
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
      return [`Clusters done: ${done} of ${cls.length}`, `Days open: ${done === cls.length ? 0 : 35}`];
    },
  },
  {
    id: "existing",
    label: "Existing SKU Approval",
    Icon: ClipboardList,
    pipe: "regional",
    actions: [
      { l: "National Core",   mod: "national" },
      { l: "Regional Review", mod: "regional" },
      { l: "Catalogue",       mod: "catalogue" },
    ],
    statusFn: (plan) => {
      const natDone = plan.stagesCompleted.includes("national");
      const regDone = plan.stagesCompleted.includes("regional");
      return [
        `National Core: ${natDone ? "✓ Complete" : "Pending"}`,
        `Regional: ${regDone ? "✓ Complete" : "Pending"}`,
      ];
    },
  },
  {
    id: "npi",
    label: "New Item Forecasting",
    Icon: BarChart2,
    pipe: "mpi",
    actions: [
      { l: "New SKU Selection", mod: "mpi" },
      { l: "New Item Forecast", mod: "forecast" },
    ],
    statusFn: (plan) => {
      const fDone = plan.stagesCompleted.includes("forecast");
      const mDone = plan.stagesCompleted.includes("mpi");
      return [
        `NPI items: ${mDone ? "✓ Reviewed" : "Pending"}`,
        `Forecast: ${fDone ? "✓ Done" : "Pending"}`,
      ];
    },
  },
  {
    id: "sku-approval",
    label: "New SKU Approval",
    Icon: CheckCircle2,
    pipe: "approval",
    actions: [
      { l: "Publish Assortment", mod: "approval" },
      { l: "Oracle Review",      mod: "oracle" },
    ],
    statusFn: (plan) => {
      const oDone = plan.stagesCompleted.includes("oracle");
      const aDone = plan.stagesCompleted.includes("approval");
      return [
        `Oracle: ${oDone ? "✓ Done" : "Pending"}`,
        `Approval: ${aDone ? "✓ Published" : "Not started"}`,
      ];
    },
  },
  {
    id: "hindsight",
    label: "Hindsight & Feedback",
    Icon: Search,
    pipe: "hindsight",
    actions: [
      { l: "Hindsight Report", mod: "hindsight" },
      { l: "Feedback Loop",    mod: null },
    ],
    statusFn: (plan) => {
      const hDone = plan.stagesCompleted.includes("hindsight");
      return [
        `Hindsight: ${hDone ? "✓ Complete" : "Pending"}`,
      ];
    },
  },
];

const LANE_PIPE_ORDER = LANES.map((l) => l.pipe);

function laneStatus(lane, plan) {
  const key = lane.pipe;
  if (plan.stagesCompleted.includes(key)) return "done";
  if (plan.activeStage === key) return "active";
  const myIdx = LANE_PIPE_ORDER.indexOf(key);
  for (let i = 0; i < myIdx; i++) {
    const upKey = LANE_PIPE_ORDER[i];
    if (!plan.stagesCompleted.includes(upKey) && plan.activeStage !== upKey) {
      return "locked";
    }
  }
  return "not-started";
}

/* Badge color per lane state */
const LANE_BADGE = {
  done:          { color: "success", label: "Complete"    },
  active:        { color: "info",    label: "In Progress" },
  locked:        { color: "neutral", label: "Locked"      },
  "not-started": { color: "neutral", label: "Not Started" },
};

/* Plan status badge */
const STATUS_BADGE = {
  draft:         { color: "neutral", label: "Draft"        },
  "in-progress": { color: "info",    label: "In Progress"  },
  review:        { color: "warning", label: "Under Review" },
  approved:      { color: "success", label: "Approved"     },
};

/* ─── Swim Lane Card ─────────────────────────────────────────────────────── */
function SwimLane({ lane, plan, onNavigate }) {
  const st = laneStatus(lane, plan);
  const isDone   = st === "done";
  const isActive = st === "active";
  const isLocked = st === "locked";
  const badge    = LANE_BADGE[st];
  const lines    = lane.statusFn(plan);

  return (
    <Card
      size="small"
      sx={{
        ...panelSx,
        width: 200,
        flexShrink: 0,
        padding: 0,
        overflow: "hidden",
        borderColor: isActive
          ? "var(--color-primary)"
          : isDone
          ? "var(--color-success-border)"
          : "var(--color-border)",
        boxShadow: isActive ? "var(--sh3)" : "var(--sh)",
        opacity: isLocked ? 0.7 : 1,
      }}
    >
      {/* Lane header */}
      <div className={`ap-lane-header ap-lane-header--${st}`}>
        <div className="ap-lane-header-top">
          <Text variant="caption" style={{ color: "inherit", fontWeight: 700, flex: 1, lineHeight: 1.3 }}>
            {lane.label}
          </Text>
          {isDone   && <div className="ap-lane-check"><Check size={10} /></div>}
          {isActive && <div className="ap-lane-pulse" />}
          {isLocked && <Lock size={11} className="ap-lane-lock" />}
        </div>
        <Badge variant="subtle" color={badge.color} label={badge.label} size="small" />
      </div>

      {/* Action buttons */}
      <div className="ap-lane-actions">
        {lane.actions.map((act) => {
          const canClick = !isLocked && !!act.mod;
          return (
            <Button
              key={act.l}
              variant="ghost"
              size="small"
              disabled={!canClick}
              onClick={canClick ? () => onNavigate?.(act.mod) : undefined}
              sx={{ width: "100%", justifyContent: "flex-start", fontSize: "var(--fs-xs)" }}
            >
              {act.l}
            </Button>
          );
        })}
      </div>

      {/* Status footer */}
      <div className="ap-lane-footer">
        {lines.map((line, i) => (
          <Text key={i} variant="micro" tone="muted" style={{ lineHeight: 1.7 }}>
            {line}
          </Text>
        ))}
      </div>
    </Card>
  );
}

/* ─── Plan Meta Bar ──────────────────────────────────────────────────────── */
function PlanMetaBar({ plan }) {
  const plrPeriod = PLR_PERIODS.find((p) => p.id === plan.plrId);
  const doneCount = PIPE_STAGES.filter((s) => plan.stagesCompleted.includes(s.id)).length;
  const pct       = Math.round((doneCount / PIPE_STAGES.length) * 100);
  const badge     = STATUS_BADGE[plan.status] || STATUS_BADGE.draft;

  return (
    <Card sx={{ ...panelSx, borderRadius: 0, borderLeft: "none", borderRight: "none" }}>
      <div className="ap-meta-bar">
        <div className="ap-meta-left">
          <div className="ap-meta-accent" />
          <Stack gap={1}>
            <div className="ap-meta-row">
              <span className="ap-meta-key">Department</span>
              <Text variant="caption" style={{ fontWeight: 700 }}>{plan.dept}</Text>
              {plan.plrId && (
                <>
                  <span className="ap-meta-sep" />
                  <span className="ap-meta-key">PLR ID</span>
                  <Text variant="caption" style={{ fontWeight: 700 }}>{plan.plrId}</Text>
                </>
              )}
              <span className="ap-meta-sep" />
              <span className="ap-meta-key">PLR Name</span>
              <Text variant="caption" style={{ fontWeight: 700 }}>{plan.name}</Text>
            </div>
            <div className="ap-meta-row">
              {plrPeriod ? (
                <>
                  <span className="ap-meta-key">PLR Presentation Date</span>
                  <Text variant="caption" tone="success" style={{ fontWeight: 700 }}>{plrPeriod.due}</Text>
                  <span className="ap-meta-sep" />
                  <span className="ap-meta-key">Season</span>
                  <Text variant="caption" style={{ fontWeight: 700 }}>{plrPeriod.season}</Text>
                </>
              ) : (
                <Text variant="micro" tone="muted" style={{ fontStyle: "italic" }}>
                  No PLR period linked — created manually
                </Text>
              )}
            </div>
          </Stack>
        </div>

        <div className="ap-meta-right">
          <div className="ap-meta-progress">
            <ProgressBar
              value={pct}
              customLabel={`${doneCount}/${PIPE_STAGES.length} stages`}
              status={pct === 100 ? "success" : "remaining"}
            />
          </div>
          <Badge variant="subtle" color={badge.color} label={badge.label} />
        </div>
      </div>
    </Card>
  );
}

/* ─── Main PLR Status View ───────────────────────────────────────────────── */
export default function Approval({ onNavigate }) {
  const [planIdx, setPlanIdx] = useState(0);
  const [published, setPublished] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState("plan");

  const activePlans  = PLANS.filter((p) => p.status !== "draft");
  const displayPlans = activePlans.length ? activePlans : PLANS;
  const plan         = displayPlans[Math.min(planIdx, displayPlans.length - 1)];

  const allDone   = PIPE_STAGES.every((s) => s.id === "approval" || plan.stagesCompleted.includes(s.id));
  const doneCount = PIPE_STAGES.filter((s) => plan.stagesCompleted.includes(s.id)).length;

  const approvalFilterTags = useMemo(() => [
    { id: "plan", label: "PLR", values: [{ id: 1, label: plan.name }] },
  ], [plan]);

  const PLAN_FD_OPTIONS = displayPlans.map((p, i) => ({ value: String(i), label: p.name }));

  return (
    <Stack gap={4}>
      {/* ── Page header Card ──────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        <div className="ap-page-header">
          <div className="ap-page-header-top">
            <Stack gap={1}>
              <Text variant="title" style={{ fontWeight: 800, letterSpacing: "-0.3px" }}>
                Product Line Reviews
              </Text>
            </Stack>
            <Button
              variant="primary"
              size="small"
              onClick={() => onNavigate?.("workspace")}
            >
              + Create New PLR
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Filters strip ──────────────────────────────────────────────────── */}
      {displayPlans.length > 1 && (
        <>
          <FiltersStrip
            filterTags={approvalFilterTags}
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
            title="PLR Filters"
            size="medium"
            anchor="right"
            isOpen={filterPanelOpen}
            setIsOpen={setFilterPanelOpen}
            active={activeFilterTab}
            setActive={setActiveFilterTab}
            filters={[
              {
                value: "plan",
                title: "PLR Plan",
                numberOfFilter: 1,
                children: (
                  <Stack direction="column" gap={3} style={{ padding: "var(--sp-4)" }}>
                    <FdSelect
                      label="Product Line Review"
                      value={String(planIdx)}
                      options={PLAN_FD_OPTIONS}
                      onChange={(v) => setPlanIdx(Number(v))}
                      width={320}
                    />
                  </Stack>
                ),
              },
            ]}
            primaryButtonLabel="Apply"
            onPrimaryButtonClick={() => setFilterPanelOpen(false)}
          />
        </>
      )}

      {/* ── Plan meta bar ─────────────────────────────────────────────────── */}
      <PlanMetaBar plan={plan} />

      {/* ── Swim lanes ────────────────────────────────────────────────────── */}
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

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <Card sx={{ ...panelSx, padding: "var(--sp-3) var(--sp-4)" }}>
        <div className="ap-action-bar">
          {plan.notes ? (
            <Text variant="caption" tone="muted">
              <span className="ap-action-note">{plan.notes}</span>
            </Text>
          ) : null}
          <Button
            variant="primary"
            size="medium"
            disabled={!allDone && !published}
            onClick={allDone ? () => setPublished(true) : undefined}
          >
            {published ? "✓ Assortment Published" : "Publish Assortment"}
          </Button>
        </div>
      </Card>
    </Stack>
  );
}
