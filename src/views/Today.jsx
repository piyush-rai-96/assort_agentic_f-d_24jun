import React, { useMemo } from "react";
import { Card, Badge, Button, EmptyState, Tooltip } from "impact-ui";
import {
  ClipboardList, Search, Home, TrendingUp, TrendingDown, BarChart2,
  Folder, Bot, CheckCircle2, Brain, Tag, Calendar,
} from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { FD_CLUST_SCENARIOS, CLUSTER_ACCEPTANCE } from "../data/clustering.js";
import { FD_PLR_CALENDAR } from "../data/plr.js";
import { PLANS, PIPE_STAGES, PLAN_STATUS } from "../data/workspace.js";
import { INTEL_SEED } from "../data/intel.js";
import { MPI_DROPS } from "../data/mpi.js";
import { TODAY_SEED } from "../data/todaySeed.js";
import { useAuth } from "../context/AuthContext.jsx";
import { panelSx } from "../styles/panelSx.js";
import "./Today.css";

/* ── View-local constants ─────────────────────────────────────────────────── */

const QUICK_ACCESS = [
  { Icon: ClipboardList, label: "Store Curation", mod: "store-curation", bg: "var(--color-warning-soft)",  iconColor: "var(--color-warning)" },
  { Icon: Search,        label: "Market Intel",   mod: "intel",          bg: "var(--color-error-soft)",    iconColor: "var(--color-error)"   },
  { Icon: Home,          label: "National Core",  mod: "national",       bg: "var(--color-success-soft)",  iconColor: "var(--color-success)" },
  { Icon: TrendingUp,    label: "Forecast",       mod: "forecast",       bg: "var(--color-info-soft)",     iconColor: "var(--color-info)"    },
  { Icon: BarChart2,     label: "Hindsight",      mod: "hindsight",      bg: "var(--color-accent-soft)",   iconColor: "var(--color-accent)"  },
  { Icon: Folder,        label: "PLR Status",     mod: "approval",       bg: "var(--color-teal-soft)",     iconColor: "var(--color-teal)"    },
];

const URGENCY_COLOR = {
  immediate: "var(--color-error)",
  season:    "var(--color-warning)",
  next:      "var(--color-accent)",
  watch:     "var(--color-success)",
};

const SCENARIO_NAMES = {
  B: "Behavioural",
  A: "Performance + Demographics",
  C: "Product Attributes",
};
const SCENARIO_ICONS = { B: Brain, A: TrendingUp, C: Tag };
const TIER_COLOR     = { high: "success", mid: "warning", low: "error" };
const STATUS_COLOR   = { "in-progress": "info", review: "warning", draft: "default", approved: "success" };

/* Card sx helpers */
const cardClickSx = {
  ...panelSx,
  padding: "var(--sp-4)",
  cursor: "pointer",
  transition: "border-color 0.15s, box-shadow 0.15s, transform 0.15s",
};
const clusterCardSx = {
  ...panelSx,
  padding: "var(--sp-3)",
  cursor: "pointer",
  transition: "box-shadow 0.15s, transform 0.15s",
};
const intelCardSx = {
  ...panelSx,
  padding: "var(--sp-3) var(--sp-4)",
  cursor: "pointer",
  marginBottom: "var(--sp-2)",
  transition: "box-shadow 0.12s",
};
const plrCardSx = {
  ...panelSx,
  padding: "var(--sp-3) var(--sp-4)",
  cursor: "pointer",
  marginBottom: "var(--sp-2)",
  transition: "border-color 0.12s, box-shadow 0.12s",
  borderLeft: "var(--border-accent-width) solid var(--color-teal)",
};

function greetingFor(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(d) {
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ── Main component ───────────────────────────────────────────────────────── */

export default function Today({ onNavigate }) {
  const go = (mod) => onNavigate?.(mod);
  const { user } = useAuth();

  const model = useMemo(() => {
    const now        = new Date();
    const greeting   = greetingFor(now.getHours());
    const firstName  = (user?.name || "there").split(" ")[0];
    const dateStr    = formatDate(now);

    const openPlans    = PLANS.filter((p) => p.status === "in-progress").length;
    const openIntel    = INTEL_SEED.filter((s) => s.status === "new").length;
    const openPLRs     = FD_PLR_CALENDAR.filter((p) => p.status === "Open").length;
    const openDrops    = MPI_DROPS.length;
    const awaitingAppr = PLANS.filter((p) => p.status === "review").length;
    const openNotifs   = TODAY_SEED.openNotifications ?? 0;

    const activePlans   = PLANS.filter((p) =>
      p.status === "in-progress" || p.status === "review"
    ).slice(0, 4);
    const openPLRList   = FD_PLR_CALENDAR.filter((p) => p.status === "Open").slice(0, 3);
    const recentSignals = INTEL_SEED.slice(0, 4);

    const statStrip = [
      { Icon: Bot,           label: "Plans active",      val: openPlans,    color: "var(--color-info)",    bg: "var(--color-info-soft)",    mod: "workspace" },
      { Icon: Search,        label: "New intel signals",  val: openIntel,    color: "var(--color-warning)", bg: "var(--color-warning-soft)", mod: "intel"     },
      { Icon: ClipboardList, label: "Open PLRs",          val: openPLRs,     color: "var(--color-teal)",    bg: "var(--color-teal-soft)",    mod: "plr-calendar" },
      { Icon: TrendingDown,  label: "NPI drop items",     val: openDrops,    color: "var(--color-error)",   bg: "var(--color-error-soft)",   mod: "mpi"       },
      { Icon: CheckCircle2,  label: "Awaiting approval",  val: awaitingAppr, color: "var(--color-success)", bg: "var(--color-success-soft)", mod: "approval"  },
    ];

    return {
      greeting, firstName, dateStr, openNotifs,
      statStrip, activePlans, openPLRList, recentSignals,
    };
  }, [user]);

  /* Cluster panel state */
  const { acceptedScenario, acceptedScope } = CLUSTER_ACCEPTANCE;
  const activeScenario = acceptedScenario ? FD_CLUST_SCENARIOS[acceptedScenario] : null;

  return (
    <div className="today-shell">

      {/* ── 1. Page header — consistent pattern with all other views ──────── */}
      <Card size="small" sx={{ ...panelSx, flexShrink: 0 }}>
        <Stack direction="row" align="center" justify="space-between" gap={4}>
          <Stack direction="column" gap={1}>
            <Text variant="overline" tone="success">
              {model.dateStr}&nbsp;·&nbsp;FW 2025 curation window open
            </Text>
            <Text variant="title" as="h1">
              {model.greeting}, {model.firstName}
            </Text>
            {user?.greeting && (
              <Text variant="caption" tone="muted">{user.greeting}</Text>
            )}
          </Stack>
          <button type="button" className="today-hero-notifs" onClick={() => go("workspace")}>
            <div className="today-hero-notifs-count" aria-live="polite">{model.openNotifs}</div>
            <Text variant="overline" as="div" className="today-hero-notifs-label">open notifications</Text>
          </button>
        </Stack>
      </Card>

      {/* ── 2. Quick-stat strip ────────────────────────────────────────────── */}
      <div className="today-stat-strip">
        {model.statStrip.map((stat) => (
          <button
            key={stat.mod}
            type="button"
            className="today-stat-cell"
            style={{ "--stat-color": stat.color, "--stat-bg": stat.bg }}
            onClick={() => go(stat.mod)}
            aria-label={`${stat.val} ${stat.label}`}
          >
            <div className="today-stat-icon-wrap" style={{ background: stat.bg }}>
              <stat.Icon size={18} aria-hidden="true" style={{ color: stat.color }} />
            </div>
            <div className="today-stat-val" style={{ color: stat.color }}>{stat.val}</div>
            <Text variant="overline" tone="subtle" as="div" className="today-stat-label">{stat.label}</Text>
          </button>
        ))}
      </div>

      {/* ── 3. Active cluster model panel ──────────────────────────────────── */}
      <div className="today-cluster-panel">
        {!activeScenario ? (
          /* No model accepted yet */
          <EmptyState
            heading="No active cluster model"
            primaryButtonLabel="Set up clusters →"
            onPrimaryButtonClick={() => go("clustering")}
          />
        ) : (
          /* Model accepted */
          <Card size="small" sx={{ ...panelSx, padding: "var(--sp-4) var(--sp-5)" }}>
            {/* Header */}
            <Stack direction="row" align="center" justify="space-between" style={{ marginBottom: "var(--sp-4)" }}>
              <Stack direction="row" align="center" gap={2}>
                <div className="today-cluster-model-icon" aria-hidden="true">
                  {(() => { const Icon = SCENARIO_ICONS[acceptedScenario] || Brain; return <Icon size={18} />; })()}
                </div>
                <Stack direction="column" gap={0}>
                  <Text variant="body-strong">
                    {SCENARIO_NAMES[acceptedScenario] || acceptedScenario}
                  </Text>
                  <Text variant="caption" tone="subtle">
                    {activeScenario.clusters.length} clusters&nbsp;·&nbsp;
                    {acceptedScope.dept}&nbsp;·&nbsp;
                    {acceptedScope.channel}&nbsp;·&nbsp;
                    {acceptedScope.season}
                  </Text>
                </Stack>
              </Stack>
              <Button variant="ghost" size="small" onClick={() => go("clustering")}>
                Manage →
              </Button>
            </Stack>

            {/* Cluster cards grid */}
            <div
              className="today-cluster-cards"
              style={{ gridTemplateColumns: `repeat(${Math.min(activeScenario.clusters.length, 4)}, 1fr)` }}
            >
              {activeScenario.clusters.map((cl) => (
                <Card
                  key={cl.id}
                  size="small"
                  className="today-cluster-card"
                  sx={{
                    ...clusterCardSx,
                    borderLeft: `var(--border-accent-width) solid ${cl.color}`,
                    background: "var(--color-surface-alt)",
                    boxShadow: "none",
                  }}
                  onClick={() => go("clustering")}
                  tabIndex={0}
                >
                  <Stack direction="row" align="center" gap={1} style={{ marginBottom: "var(--sp-2)" }}>
                    <div className="today-cluster-dot" style={{ background: cl.color }} />
                    <Text variant="caption" as="span" className="today-cluster-label">{cl.label}</Text>
                  </Stack>
                  <Text variant="micro" tone="subtle" as="div" className="today-cluster-meta">
                    {cl.stores.length} stores&nbsp;·&nbsp;${cl.revSqft}/sqft&nbsp;·&nbsp;{cl.st}% ST
                  </Text>
                  <div style={{ marginTop: "var(--sp-2)" }}>
                    <Badge
                      variant="subtle"
                      color={TIER_COLOR[cl.tier] || "info"}
                      label={`${(cl.tier || "").charAt(0).toUpperCase()}${(cl.tier || "").slice(1)}`}
                    />
                  </div>
                  {cl.signals?.[0] && (
                    <Text variant="micro" tone="muted" as="div" className="today-cluster-signal">{cl.signals[0]}</Text>
                  )}
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* ── 4. Two-column body ─────────────────────────────────────────────── */}
      <div className="today-body">

        {/* Left: My focus today */}
        <div className="today-focus-col">

          {/* Active plan cards */}
          {model.activePlans.length ? (
            model.activePlans.map((plan) => {
              const st   = PLAN_STATUS[plan.status] || { label: plan.status };
              const done = plan.stagesCompleted.length;
              return (
                <Card
                  key={plan.id}
                  size="small"
                  sx={cardClickSx}
                  onClick={() => go("workspace")}
                  className="today-plan-card"
                  tabIndex={0}
                >
                  <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: "var(--sp-3)" }}>
                    <Text variant="subheading">{plan.name}</Text>
                    <Badge
                      variant="subtle"
                      color={STATUS_COLOR[plan.status]}
                      label={st.label}
                    />
                  </Stack>

                  {/* Segmented pipeline progress bar */}
                  <div className="today-plan-pipe">
                    {PIPE_STAGES.map((s) => (
                      <Tooltip key={s.id} title={s.label} variant="secondary" orientation="top">
                        <div
                          className="today-plan-pipe-seg"
                          style={{
                            background: plan.stagesCompleted.includes(s.id)
                              ? "var(--color-success)"
                              : s.id === plan.activeStage
                              ? "color-mix(in srgb, var(--color-info) 60%, transparent)"
                              : "var(--color-border)",
                          }}
                        />
                      </Tooltip>
                    ))}
                  </div>

                  <Text variant="caption" tone="subtle">
                    {done}/{PIPE_STAGES.length} stages&nbsp;·&nbsp;{plan.createdBy}&nbsp;·&nbsp;{plan.updatedAt}
                  </Text>
                </Card>
              );
            })
          ) : (
            <EmptyState
              heading="No active plans"
              primaryButtonLabel="+ Create Plan"
              onPrimaryButtonClick={() => go("workspace")}
            />
          )}

          {/* Open PLR windows */}
          {model.openPLRList.length > 0 && (
            <>
              <div className="today-section-divider" />
              {model.openPLRList.map((plr) => (
                <Card
                  key={plr.id}
                  size="small"
                  className="today-plr-card"
                  sx={plrCardSx}
                  onClick={() => go("plr-calendar")}
                  tabIndex={0}
                >
                  <Stack direction="row" align="center" justify="space-between" gap={3}>
                    <Stack direction="column" gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="caption" tone="strong" style={{ marginBottom: "var(--sp-1)" }}>{plr.name}</Text>
                      <Text variant="micro" tone="subtle">
                        {plr.presDate}&nbsp;·&nbsp;{plr.dueDate}
                      </Text>
                    </Stack>
                    <Badge variant="subtle" color="success" label="Open" />
                  </Stack>
                </Card>
              ))}
            </>
          )}
        </div>

        {/* Right: Quick access + Recent signals */}
        <div className="today-right-col">

          <div className="today-quick-grid">
            {QUICK_ACCESS.map((btn) => (
              <Card
                key={btn.mod}
                size="small"
                sx={{
                  ...panelSx,
                  padding: "var(--sp-3) var(--sp-3)",
                  cursor: "pointer",
                  background: btn.bg,
                  boxShadow: "none",
                  border: "1px solid transparent",
                  transition: "transform 0.12s, box-shadow 0.12s, border-color 0.12s",
                }}
                onClick={() => go(btn.mod)}
                className="today-quick-card"
                tabIndex={0}
              >
                <Stack direction="row" align="center" gap={2}>
                  <btn.Icon size={18} aria-hidden="true" className="today-quick-icon" style={{ color: btn.iconColor, flexShrink: 0 }} />
                  <Text variant="caption" tone="strong">{btn.label}</Text>
                </Stack>
              </Card>
            ))}
          </div>

          {model.recentSignals.length > 0 && (
            <>
              <div className="today-section-divider" />
              {model.recentSignals.map((sig) => (
                <Card
                  key={sig.id}
                  size="small"
                  className="today-intel-card"
                  sx={{
                    ...intelCardSx,
                    borderLeft: `var(--border-accent-width) solid ${URGENCY_COLOR[sig.urgency] || "var(--color-border-strong)"}`,
                  }}
                  onClick={() => go("intel")}
                  tabIndex={0}
                >
                  <Text
                    variant="caption"
                    tone="strong"
                    truncate
                    as="div"
                    style={{ marginBottom: "var(--sp-1)" }}
                  >
                    {sig.title}
                  </Text>
                  <Text variant="micro" tone="subtle">
                    {sig.author}&nbsp;·&nbsp;{sig.date}
                  </Text>
                </Card>
              ))}
              <Button variant="ghost" size="small" onClick={() => go("intel")} sx={{ width: "100%", marginTop: "var(--sp-2)" }}>
                View all signals →
              </Button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
