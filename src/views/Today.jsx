import React, { useMemo } from "react";
import { Card, Badge, Button, EmptyState, Tooltip } from "impact-ui";
import {
  Bot, Search, BarChart2, TrendingDown, CheckCircle2,
  ClipboardList, AlertTriangle, AlertCircle, Info,
  Zap, ChevronRight, Activity, Brain, Tag, TrendingUp,
  Calendar, ArrowRight, Play,
} from "lucide-react";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import { FD_CLUST_SCENARIOS, CLUSTER_ACCEPTANCE } from "../data/clustering.js";
import { FD_PLR_CALENDAR } from "../data/plr.js";
import { PLANS, PIPE_STAGES, PLAN_STATUS } from "../data/workspace.js";
import { INTEL_SEED } from "../data/intel.js";
import { MPI_DROPS } from "../data/mpi.js";
import { TODAY_SEED, PIPELINE_PHASES, NEEDS_ATTENTION, RECENT_ACTIVITY } from "../data/todaySeed.js";
import { useAuth } from "../context/AuthContext.jsx";
import { panelSx } from "../styles/panelSx.js";
import "./Today.css";

/* ── Constants ─────────────────────────────────────────────────────────────── */

const SCENARIO_NAMES = { B: "Behavioural", A: "Performance + Demographics", C: "Product Attributes" };
const SCENARIO_ICONS = { B: Brain, A: TrendingUp, C: Tag };
const TIER_COLOR     = { high: "success", mid: "warning", low: "error" };
const STATUS_COLOR   = { "in-progress": "info", review: "warning", draft: "default", approved: "success" };

const SEVERITY_META = {
  error:   { Icon: AlertCircle,   color: "var(--color-error)",   bg: "var(--color-error-soft)",   badge: "error"   },
  warning: { Icon: AlertTriangle, color: "var(--color-warning)", bg: "var(--color-warning-soft)", badge: "warning" },
  info:    { Icon: Info,          color: "var(--color-info)",    bg: "var(--color-info-soft)",    badge: "info"    },
  success: { Icon: CheckCircle2,  color: "var(--color-success)", bg: "var(--color-success-soft)", badge: "success" },
};

function greetingFor(h) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(d) {
  const days   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/* ── Main component ─────────────────────────────────────────────────────────── */

export default function Today({ onNavigate, onOpenAgent }) {
  const go = (mod) => onNavigate?.(mod);
  const { user } = useAuth();

  const model = useMemo(() => {
    const now       = new Date();
    const greeting  = greetingFor(now.getHours());
    const firstName = (user?.name || "there").split(" ")[0];
    const dateStr   = formatDate(now);

    const openPlans    = PLANS.filter((p) => p.status === "in-progress").length;
    const openIntel    = INTEL_SEED.filter((s) => s.status === "new").length;
    const openPLRs     = FD_PLR_CALENDAR.filter((p) => p.status === "Open").length;
    const openDrops    = MPI_DROPS.length;
    const awaitingAppr = PLANS.filter((p) => p.status === "review").length;

    const statStrip = [
      { Icon: Bot,           label: "Plans active",      val: openPlans,    color: "var(--color-info)",    bg: "var(--color-info-soft)",    mod: "catalogue"  },
      { Icon: Search,        label: "New intel signals",  val: openIntel,    color: "var(--color-warning)", bg: "var(--color-warning-soft)", mod: "intel"      },
      { Icon: ClipboardList, label: "Open PLRs",          val: openPLRs,     color: "var(--color-teal)",    bg: "var(--color-teal-soft)",    mod: "approval"   },
      { Icon: TrendingDown,  label: "NPI drop items",     val: openDrops,    color: "var(--color-error)",   bg: "var(--color-error-soft)",   mod: "mpi"        },
      { Icon: CheckCircle2,  label: "Awaiting approval",  val: awaitingAppr, color: "var(--color-success)", bg: "var(--color-success-soft)", mod: "approval"   },
    ];

    /* Alerts: priority attention items from seed data + top intel signals */
    const alerts = NEEDS_ATTENTION
      .filter((n) => !(n.hideWhenAgentRan && TODAY_SEED.agentRan))
      .slice(0, 3)
      .map((n) => ({
        ...n,
        title: n.title.replace("{pending}", String(70 - Math.round(TODAY_SEED.submittedRatio * 70))),
      }));

    const recentSignals = INTEL_SEED.slice(0, 3);

    /* What Needs You */
    const reviewPlans  = PLANS.filter((p) => p.status === "review").slice(0, 4);
    const openPLRList  = FD_PLR_CALENDAR.filter((p) => p.status === "Open").slice(0, 3);

    return {
      greeting, firstName, dateStr,
      openNotifs: TODAY_SEED.openNotifications ?? 0,
      statStrip, alerts, recentSignals,
      reviewPlans, openPLRList,
      agentRan: TODAY_SEED.agentRan,
      openIntel,
    };
  }, [user]);

  const { acceptedScenario, acceptedScope } = CLUSTER_ACCEPTANCE;
  const activeScenario = acceptedScenario ? FD_CLUST_SCENARIOS[acceptedScenario] : null;

  return (
    <div className="today-shell">

      {/* ── ZONE 1 · Status bar ───────────────────────────────────────────────
          Full-width: greeting header + 5 stat tiles
      ──────────────────────────────────────────────────────────────────────── */}

      {/* Greeting header */}
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

          {/* Notification badge — opens agent instead of workspace */}
          <Tooltip title="Open notifications" variant="secondary" orientation="left">
            <button
              type="button"
              className="today-notif-btn"
              onClick={() => onOpenAgent?.("What needs my attention today?")}
              aria-label={`${model.openNotifs} open notifications — ask the agent`}
            >
              <div className="today-notif-count">{model.openNotifs}</div>
              <Text variant="overline" as="div" className="today-notif-label">notifications</Text>
            </button>
          </Tooltip>
        </Stack>
      </Card>

      {/* Stat strip */}
      <div className="today-stat-strip">
        {model.statStrip.map((s) => (
          <button
            key={s.mod + s.label}
            type="button"
            className="today-stat-cell"
            style={{ "--stat-color": s.color, "--stat-bg": s.bg }}
            onClick={() => go(s.mod)}
            aria-label={`${s.val} ${s.label}`}
          >
            <div className="today-stat-icon-wrap" style={{ background: s.bg }}>
              <s.Icon size={18} aria-hidden="true" style={{ color: s.color }} />
            </div>
            <div className="today-stat-val" style={{ color: s.color }}>{s.val}</div>
            <Text variant="overline" tone="subtle" as="div" className="today-stat-label">{s.label}</Text>
          </button>
        ))}
      </div>

      {/* Pipeline progress bar */}
      <Card size="small" sx={{ ...panelSx, padding: "var(--sp-3) var(--sp-5)", flexShrink: 0 }}>
        <Stack direction="row" align="center" justify="space-between" style={{ marginBottom: "var(--sp-3)" }}>
          <Stack direction="row" align="center" gap={2}>
            <Activity size={14} style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-hidden="true" />
            <Text variant="caption" tone="strong">SS 2026 pipeline</Text>
          </Stack>
          <Badge variant="subtle" color="info" label="In progress" />
        </Stack>
        <div className="today-pipeline-track">
          {PIPELINE_PHASES.map((ph) => (
            <Tooltip key={ph.mod} title={`${ph.label} — ${ph.pct}%`} variant="secondary" orientation="top">
              <button
                type="button"
                className="today-pipeline-seg"
                onClick={() => go(ph.mod)}
                aria-label={`${ph.label} ${ph.pct}% complete`}
              >
                <div
                  className="today-pipeline-fill"
                  style={{ width: `${ph.pct}%`, background: ph.pct === 100 ? "var(--color-success)" : ph.pct > 0 ? "var(--color-primary)" : "transparent" }}
                />
                <Text variant="micro" tone="subtle" as="div" className="today-pipeline-label">{ph.label}</Text>
              </button>
            </Tooltip>
          ))}
        </div>
      </Card>

      {/* ── ZONE 2 + 3 + 4 · Two-column body ────────────────────────────────── */}
      <div className="today-body">

        {/* LEFT column: Alerts + Run the Agent */}
        <div className="today-left-col">

          {/* Zone 2 — Alerts */}
          <div className="today-zone-header">
            <AlertCircle size={14} aria-hidden="true" style={{ color: "var(--color-error)", flexShrink: 0 }} />
            <Text variant="overline" tone="subtle">Alerts</Text>
          </div>

          {model.alerts.length ? (
            model.alerts.map((item, i) => {
              const meta = SEVERITY_META[item.severity] || SEVERITY_META.info;
              const SevIcon = meta.Icon;
              return (
                <Card
                  key={i}
                  size="small"
                  sx={{
                    ...panelSx,
                    padding: "var(--sp-3) var(--sp-4)",
                    marginBottom: "var(--sp-2)",
                    cursor: "pointer",
                    borderLeft: `3px solid ${meta.color}`,
                    transition: "box-shadow 0.12s, transform 0.12s",
                  }}
                  className="today-alert-card"
                  onClick={() => go(item.mod)}
                  tabIndex={0}
                >
                  <Stack direction="row" align="flex-start" gap={3}>
                    <div style={{ marginTop: 2, flexShrink: 0 }}>
                      <SevIcon size={15} style={{ color: meta.color }} aria-hidden="true" />
                    </div>
                    <Stack direction="column" gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="caption" tone="strong" truncate as="div" style={{ marginBottom: "var(--sp-1)" }}>
                        {item.title}
                      </Text>
                      <Text variant="micro" tone="subtle">{item.sub}</Text>
                    </Stack>
                    <Badge variant="subtle" color={meta.badge} label={item.severity} />
                  </Stack>
                </Card>
              );
            })
          ) : (
            <Card size="small" sx={{ ...panelSx, padding: "var(--sp-4)", marginBottom: "var(--sp-2)" }}>
              <Stack direction="row" align="center" gap={2}>
                <CheckCircle2 size={16} style={{ color: "var(--color-success)" }} aria-hidden="true" />
                <Text variant="caption" tone="muted">No active alerts — all systems go.</Text>
              </Stack>
            </Card>
          )}

          {/* Intel signal highlights */}
          {model.recentSignals.length > 0 && (
            <>
              <div className="today-section-divider" />
              <div className="today-zone-header" style={{ marginBottom: "var(--sp-2)" }}>
                <Search size={13} aria-hidden="true" style={{ color: "var(--color-warning)", flexShrink: 0 }} />
                <Text variant="overline" tone="subtle">Intel signals</Text>
                <Badge variant="subtle" color="warning" label={`${model.openIntel} new`} />
              </div>
              {model.recentSignals.map((sig) => (
                <Card
                  key={sig.id}
                  size="small"
                  sx={{
                    ...panelSx,
                    padding: "var(--sp-3) var(--sp-4)",
                    marginBottom: "var(--sp-2)",
                    cursor: "pointer",
                    borderLeft: "3px solid var(--color-warning)",
                    transition: "box-shadow 0.12s",
                  }}
                  className="today-intel-card"
                  onClick={() => go("intel")}
                  tabIndex={0}
                >
                  <Text variant="caption" tone="strong" truncate as="div" style={{ marginBottom: "var(--sp-1)" }}>
                    {sig.title}
                  </Text>
                  <Text variant="micro" tone="subtle">{sig.author}&nbsp;·&nbsp;{sig.date}</Text>
                </Card>
              ))}
              <Button variant="ghost" size="small" onClick={() => go("intel")} sx={{ width: "100%", marginTop: "var(--sp-1)" }}>
                View all signals <ArrowRight size={13} style={{ marginLeft: 4 }} />
              </Button>
            </>
          )}

          {/* Zone 3 — Run the Agent */}
          <div className="today-section-divider" style={{ marginTop: "var(--sp-5)" }} />
          <div className="today-zone-header" style={{ marginBottom: "var(--sp-2)" }}>
            <Bot size={14} aria-hidden="true" style={{ color: "var(--color-primary)", flexShrink: 0 }} />
            <Text variant="overline" tone="subtle">Agent</Text>
          </div>

          <Card
            size="small"
            sx={{
              ...panelSx,
              padding: "var(--sp-5)",
              background: "linear-gradient(135deg, var(--color-primary-tint-6, rgba(37,99,235,0.06)) 0%, var(--color-surface) 100%)",
              borderColor: "var(--color-primary-tint-28, rgba(37,99,235,0.28))",
            }}
            className="today-agent-card"
          >
            <Stack direction="row" align="flex-start" gap={4}>
              <div className="today-agent-icon-wrap" aria-hidden="true">
                <Bot size={20} style={{ color: "var(--color-primary)" }} />
              </div>
              <Stack direction="column" gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" align="center" gap={2} wrap>
                  <Text variant="subheading">Assortment Agent</Text>
                  <Badge
                    variant="subtle"
                    color={model.agentRan ? "success" : "warning"}
                    label={model.agentRan ? "Last run today" : "Not run yet"}
                  />
                </Stack>
                <Text variant="caption" tone="muted">
                  {model.agentRan
                    ? "Agent recommendations are ready. Review tiers, signals, and plan actions."
                    : "Run the agent to unlock SKU tier recommendations and assortment plan for SS 2026."}
                </Text>
                <Stack direction="row" gap={2} wrap style={{ marginTop: "var(--sp-1)" }}>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => onOpenAgent?.("Run the assortment agent for SS 2026 and show me the recommendations.")}
                  >
                    <Play size={13} style={{ marginRight: 4 }} aria-hidden="true" />
                    {model.agentRan ? "Ask the Agent" : "Run Agent"}
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => go("catalogue")}
                  >
                    View Catalogue
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </Card>

          {/* Recent activity feed */}
          <div className="today-section-divider" style={{ marginTop: "var(--sp-4)" }} />
          <div className="today-zone-header" style={{ marginBottom: "var(--sp-2)" }}>
            <Zap size={13} aria-hidden="true" style={{ color: "var(--color-accent)", flexShrink: 0 }} />
            <Text variant="overline" tone="subtle">Recent activity</Text>
          </div>
          {RECENT_ACTIVITY.slice(0, 5).map((act, i) => (
            <button
              key={i}
              type="button"
              className="today-activity-row"
              onClick={() => go(act.mod)}
              aria-label={act.text}
            >
              <Text variant="micro" tone="muted" as="span" className="today-activity-time">{act.time}</Text>
              <Text variant="micro" tone="subtle" as="span" className="today-activity-text" style={{ flex: 1 }}>{act.text}</Text>
            </button>
          ))}
        </div>

        {/* RIGHT column: What Needs You */}
        <div className="today-right-col">

          {/* Zone 4 — What Needs You */}
          <div className="today-zone-header">
            <CheckCircle2 size={14} aria-hidden="true" style={{ color: "var(--color-success)", flexShrink: 0 }} />
            <Text variant="overline" tone="subtle">What needs you</Text>
          </div>

          {/* Plans awaiting review / approval */}
          {model.reviewPlans.length ? (
            <>
              <Text variant="caption" tone="muted" as="div" style={{ marginBottom: "var(--sp-2)", marginTop: "var(--sp-1)" }}>
                Plans awaiting review
              </Text>
              {model.reviewPlans.map((plan) => {
                const st   = PLAN_STATUS[plan.status] || { label: plan.status };
                const done = plan.stagesCompleted.length;
                return (
                  <Card
                    key={plan.id}
                    size="small"
                    sx={{
                      ...panelSx,
                      padding: "var(--sp-3) var(--sp-4)",
                      marginBottom: "var(--sp-2)",
                      cursor: "pointer",
                      transition: "border-color 0.15s, box-shadow 0.15s",
                    }}
                    className="today-plan-card"
                    onClick={() => go("workspace")}
                    tabIndex={0}
                  >
                    <Stack direction="row" justify="space-between" align="center" style={{ marginBottom: "var(--sp-2)" }}>
                      <Text variant="caption" tone="strong" truncate style={{ flex: 1, minWidth: 0 }}>{plan.name}</Text>
                      <Badge variant="subtle" color={STATUS_COLOR[plan.status]} label={st.label} />
                    </Stack>
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
                    <Text variant="micro" tone="subtle">
                      {done}/{PIPE_STAGES.length} stages&nbsp;·&nbsp;{plan.createdBy}
                    </Text>
                  </Card>
                );
              })}
            </>
          ) : (
            <Card size="small" sx={{ ...panelSx, padding: "var(--sp-4)", marginBottom: "var(--sp-3)" }}>
              <EmptyState
                heading="No plans awaiting review"
                description="Plans submitted for review will appear here."
              />
            </Card>
          )}

          {/* Open PLR windows */}
          {model.openPLRList.length > 0 && (
            <>
              <div className="today-section-divider" />
              <Text variant="caption" tone="muted" as="div" style={{ marginBottom: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
                Open PLR windows
              </Text>
              {model.openPLRList.map((plr) => (
                <Card
                  key={plr.id}
                  size="small"
                  sx={{
                    ...panelSx,
                    padding: "var(--sp-3) var(--sp-4)",
                    marginBottom: "var(--sp-2)",
                    cursor: "pointer",
                    borderLeft: "3px solid var(--color-teal)",
                    transition: "border-color 0.12s, box-shadow 0.12s",
                  }}
                  className="today-plr-card"
                  onClick={() => go("approval")}
                  tabIndex={0}
                >
                  <Stack direction="row" align="center" justify="space-between" gap={3}>
                    <Stack direction="column" gap={0} style={{ flex: 1, minWidth: 0 }}>
                      <Text variant="caption" tone="strong" truncate as="div" style={{ marginBottom: "var(--sp-1)" }}>{plr.name}</Text>
                      <Text variant="micro" tone="subtle">{plr.presDate}&nbsp;·&nbsp;{plr.dueDate}</Text>
                    </Stack>
                    <Badge variant="subtle" color="success" label="Open" />
                  </Stack>
                </Card>
              ))}
              <Button variant="ghost" size="small" onClick={() => go("approval")} sx={{ width: "100%", marginTop: "var(--sp-1)" }}>
                PLR Status <ChevronRight size={13} style={{ marginLeft: 2 }} />
              </Button>
            </>
          )}

          {/* Active cluster model */}
          <div className="today-section-divider" style={{ marginTop: "var(--sp-4)" }} />
          <Text variant="caption" tone="muted" as="div" style={{ marginBottom: "var(--sp-2)", marginTop: "var(--sp-3)" }}>
            Active cluster model
          </Text>
          {activeScenario ? (
            <Card
              size="small"
              sx={{ ...panelSx, padding: "var(--sp-3) var(--sp-4)", cursor: "pointer", transition: "box-shadow 0.15s" }}
              className="today-cluster-mini"
              onClick={() => go("clustering")}
              tabIndex={0}
            >
              <Stack direction="row" align="center" gap={2} style={{ marginBottom: "var(--sp-2)" }}>
                {(() => { const Icon = SCENARIO_ICONS[acceptedScenario] || Brain; return <Icon size={14} style={{ color: "var(--color-primary)", flexShrink: 0 }} aria-hidden="true" />; })()}
                <Text variant="caption" tone="strong">{SCENARIO_NAMES[acceptedScenario] || acceptedScenario}</Text>
              </Stack>
              <Text variant="micro" tone="subtle">
                {activeScenario.clusters.length} clusters&nbsp;·&nbsp;
                {acceptedScope.dept}&nbsp;·&nbsp;{acceptedScope.season}
              </Text>
              <div style={{ display: "flex", gap: "var(--sp-1)", flexWrap: "wrap", marginTop: "var(--sp-2)" }}>
                {activeScenario.clusters.slice(0, 4).map((cl) => (
                  <Badge key={cl.id} variant="subtle" color={TIER_COLOR[cl.tier] || "info"} label={cl.label} />
                ))}
                {activeScenario.clusters.length > 4 && (
                  <Badge variant="subtle" color="default" label={`+${activeScenario.clusters.length - 4}`} />
                )}
              </div>
            </Card>
          ) : (
            <Card size="small" sx={{ ...panelSx, padding: "var(--sp-4)" }}>
              <EmptyState
                heading="No active cluster model"
                primaryButtonLabel="Set up clusters"
                onPrimaryButtonClick={() => go("clustering")}
              />
            </Card>
          )}

          {/* Quick navigation */}
          <div className="today-section-divider" style={{ marginTop: "var(--sp-4)" }} />
          <div className="today-zone-header" style={{ marginBottom: "var(--sp-2)" }}>
            <Calendar size={13} aria-hidden="true" style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
            <Text variant="overline" tone="subtle">Quick access</Text>
          </div>
          <div className="today-quick-grid">
            {[
              { label: "Hindsight",      mod: "hindsight",      color: "var(--color-accent)",  bg: "var(--color-accent-soft)"  },
              { label: "National Core",  mod: "national",       color: "var(--color-success)", bg: "var(--color-success-soft)" },
              { label: "Regional",       mod: "regional",       color: "var(--color-info)",    bg: "var(--color-info-soft)"    },
              { label: "Store Curation", mod: "store-curation", color: "var(--color-warning)", bg: "var(--color-warning-soft)" },
              { label: "Market Intel",   mod: "intel",          color: "var(--color-error)",   bg: "var(--color-error-soft)"   },
              { label: "Peer Intel",     mod: "peer-intel",     color: "var(--color-teal)",    bg: "var(--color-teal-soft)"    },
            ].map((btn) => (
              <Card
                key={btn.mod}
                size="small"
                sx={{
                  ...panelSx,
                  padding: "var(--sp-2) var(--sp-3)",
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
                <Stack direction="row" align="center" justify="space-between" gap={1}>
                  <Text variant="caption" tone="strong" style={{ color: btn.color }}>{btn.label}</Text>
                  <ChevronRight size={12} style={{ color: btn.color, flexShrink: 0, opacity: 0.7 }} aria-hidden="true" />
                </Stack>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
