import React, { useMemo } from "react";
import { Card, Button, Badge, ProgressBar, Chart } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { color } from "../styles/tokens.js";
import { FD_STORES } from "../data/stores.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  TODAY_SEED,
  VELOCITY_NETWORK_PCT,
  PIPELINE_PHASES,
  NEEDS_ATTENTION,
  RECENT_ACTIVITY,
  QUICK_ACTIONS,
} from "../data/todaySeed.js";
import "./Today.css";

/* Card style — neutralizes Impact UI Card's default minHeight/maxWidth so
   cards size to content with consistent token-driven padding. */
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
const clickableSx = {
  ...panelSx,
  cursor: "pointer",
  transition: "border-color .15s, box-shadow .15s, transform .15s",
  "&:hover": {
    borderColor: "var(--color-primary)",
    boxShadow: "var(--sh2)",
    transform: "translateY(-2px)",
  },
};

const VELOCITY_BADGE = { A: "success", B: "info", C: "warning", D: "error" };
const SEVERITY_TAG = {
  error: { label: "Urgent", color: "error" },
  warning: { label: "Soon", color: "warning" },
  success: { label: "On track", color: "success" },
  info: { label: "Signal", color: "info" },
};

function greetingFor(hour) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Today({ onNavigate }) {
  const go = (mod) => onNavigate?.(mod);
  const { user } = useAuth();

  // ── All legacy renderToday() calculations, ported to a single memo ────────
  const model = useMemo(() => {
    const { coreCount, natLocked, agentRan, fcstReceived, submittedRatio, catalogueSkuCount } = TODAY_SEED;

    const totalStores = FD_STORES.length;
    const submitted = Math.round(totalStores * submittedRatio);
    const pending = totalStores - submitted;
    const submittedPct = Math.round((submitted / totalStores) * 100);
    const totalCore = coreCount + natLocked;

    const phases = PIPELINE_PHASES.map((p) => {
      let pct = 0;
      switch (p.mod) {
        case "portfolio": pct = 100; break;
        case "forecast": pct = fcstReceived > 0 ? 80 : 20; break;
        case "catalogue": pct = agentRan ? 100 : 0; break;
        case "national": pct = natLocked > 0 ? 60 : 0; break;
        case "regional": pct = 10; break;
        case "store-curation": pct = submittedPct; break;
        default: pct = 0;
      }
      return { ...p, pct };
    });
    const overallPct = Math.round(phases.reduce((a, p) => a + p.pct, 0) / phases.length);

    const bands = ["A", "B", "C", "D"].map((v) => {
      const stores = FD_STORES.filter((s) => s.velocity === v);
      const done = Math.round(stores.length * 0.72);
      const pct = stores.length ? Math.round((done / stores.length) * 100) : 0;
      return { v, total: stores.length, done, pct, networkPct: VELOCITY_NETWORK_PCT[v] };
    });

    const greeting = greetingFor(new Date().getHours());
    const firstName = (user?.name || "there").split(" ")[0];

    const kpis = [
      { value: totalStores, label: "Total Stores", sub: `${totalStores} in network`, mod: "store-curation" },
      { value: submitted, label: "Stores Submitted", sub: `${submittedPct}% complete`, mod: "store-curation" },
      { value: pending, label: "Pending", sub: "deadline Sep 20", mod: "store-curation" },
      { value: totalCore, label: "National Core", sub: `${coreCount} hard + ${natLocked} agent`, mod: "national" },
      { value: catalogueSkuCount, label: "Catalogue SKUs", sub: "FW 2025 locked", mod: "catalogue" },
    ];

    const fill = (s) => s.replace("{pending}", pending);
    const attention = NEEDS_ATTENTION.filter((a) => !(a.hideWhenAgentRan && agentRan)).map((a) => ({
      ...a,
      title: fill(a.title),
    }));
    const quick = QUICK_ACTIONS.map((q) => ({ ...q, sub: fill(q.sub) }));

    return { greeting, firstName, pending, phases, overallPct, bands, kpis, attention, quick };
  }, [user]);

  return (
    <Stack direction="column" gap={5} className="today">
      {/* ── Greeting + status pills ─────────────────────────────────────── */}
      <Stack direction="row" justify="space-between" align="center" gap={4} wrap>
        <Stack direction="column" gap={1}>
          <Text variant="display">
            {model.greeting}, {model.firstName} 👋
          </Text>
          <Text variant="caption" tone="muted">
            Floor &amp; Decor · {user?.role || "Assortment Planning"} · FW 2025
          </Text>
        </Stack>
        <Stack direction="row" align="center" gap={2} wrap>
          <Badge variant="subtle" color="error" label={`${model.pending} stores pending`} />
          <Badge variant="subtle" color="warning" label="Sep 20 deadline" />
        </Stack>
      </Stack>

      {/* ── Pipeline ────────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        <Text variant="subheading" as="h3" style={{ marginBottom: "var(--sp-3)" }}>
          FW 2025 Pipeline
        </Text>
        <Grid min={180} gap={3}>
          {model.phases.map((p) => (
            <Card key={p.mod} sx={{ ...clickableSx, padding: "var(--sp-3)" }} onClick={() => go(p.mod)}>
              <Stack direction="column" gap={2}>
                <Stack direction="row" justify="space-between" align="center">
                  <Text variant="caption" tone="muted">{p.label}</Text>
                  <Text variant="caption" tone="subtle" mono>{p.pct}%</Text>
                </Stack>
                <ProgressBar
                  value={p.pct}
                  status={p.pct === 100 ? "completed" : "remaining"}
                  showTime={false}
                  customLabel=" "
                />
              </Stack>
            </Card>
          ))}
        </Grid>
      </Card>

      {/* ── KPI row ─────────────────────────────────────────────────────── */}
      <Grid min={180} gap={3}>
        {model.kpis.map((k) => (
          <Card key={k.label} sx={clickableSx} onClick={() => go(k.mod)}>
            <Stack direction="column" gap={1}>
              <Text variant="kpi" tone="strong">{k.value}</Text>
              <Text variant="body-strong">{k.label}</Text>
              <Text variant="caption" tone="subtle">{k.sub}</Text>
            </Stack>
          </Card>
        ))}
      </Grid>

      {/* ── Mid row: curation bands / overall ring / needs attention ────── */}
      <Grid min={300} gap={4} align="stretch">
        {/* Store curation progress by velocity */}
        <Card sx={panelSx}>
          <Text variant="subheading" as="h3">Store Curation Progress</Text>
          <Stack direction="column" gap={3} style={{ margin: "var(--sp-4) 0" }}>
            {model.bands.map((b) => (
              <Stack key={b.v} direction="column" gap={2}>
                <Stack direction="row" justify="space-between" align="center">
                  <Stack direction="row" align="center" gap={2}>
                    <Badge variant="subtle" size="small" color={VELOCITY_BADGE[b.v]} label={`Vel ${b.v}`} />
                    <Text variant="caption" tone="muted">
                      {b.total} stores · {b.networkPct}% of network
                    </Text>
                  </Stack>
                  <Text variant="body-strong" mono>{b.done}/{b.total}</Text>
                </Stack>
                <ProgressBar
                  value={b.pct}
                  status={b.pct >= 70 ? "completed" : "remaining"}
                  showTime={false}
                  customLabel=" "
                />
              </Stack>
            ))}
          </Stack>
          <Button variant="primary" size="medium" onClick={() => go("store-curation")}>
            Open Store Curation →
          </Button>
        </Card>

        {/* Overall completion donut */}
        <Card sx={panelSx}>
          <Text variant="subheading" as="h3">FW 2025 Overall</Text>
          <Stack direction="column" align="center" justify="center">
            <Chart
              graphType="pie"
              showHeader={false}
              cardContainer={false}
              showDownloadButton={false}
              showExpandButton={false}
              showSubTitle
              subtitleText={`${model.overallPct}%`}
              height={190}
              chartMarginBottom={8}
              legendOptions={{ enabled: false }}
              tooltipOptions={{ enabled: false }}
              seriesData={[
                {
                  name: "FW 2025",
                  type: "pie",
                  innerSize: "72%",
                  data: [
                    { name: "Complete", y: model.overallPct, color: color.primary },
                    { name: "Remaining", y: 100 - model.overallPct, color: color.track },
                  ],
                },
              ]}
              plotOptionsOptions={{
                pie: {
                  innerSize: "72%",
                  borderWidth: 0,
                  dataLabels: { enabled: false },
                  enableMouseTracking: false,
                  states: { hover: { halo: { size: 0 } } },
                },
              }}
            />
            <Text variant="caption" tone="subtle">Average completion across 8 phases</Text>
          </Stack>
        </Card>

        {/* Needs attention */}
        <Card sx={panelSx}>
          <Text variant="subheading" as="h3" style={{ marginBottom: "var(--sp-3)" }}>Needs attention</Text>
          <Stack direction="column" gap={3}>
            {model.attention.map((a, i) => (
              <Card key={i} sx={{ ...clickableSx, padding: "var(--sp-3)" }} onClick={() => go(a.mod)}>
                <Stack direction="row" align="center" gap={3}>
                  <Badge
                    variant="subtle"
                    size="small"
                    color={SEVERITY_TAG[a.severity].color}
                    label={SEVERITY_TAG[a.severity].label}
                  />
                  <Stack direction="column" flex="1" style={{ minWidth: 0 }}>
                    <Text variant="body-strong" truncate>{a.title}</Text>
                    <Text variant="caption" tone="subtle">{a.sub}</Text>
                  </Stack>
                  <Text variant="heading" tone="subtle">›</Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Card>
      </Grid>

      {/* ── Bottom row: recent activity / quick actions ─────────────────── */}
      <Grid min={320} gap={4} align="start">
        <Card sx={panelSx}>
          <Text variant="subheading" as="h3" style={{ marginBottom: "var(--sp-3)" }}>Recent activity</Text>
          <Stack direction="column" gap={1}>
            {RECENT_ACTIVITY.map((a, i) => (
              <Stack key={i} direction="row" align="center" gap={3} className="today-feed-row" paddingX={3} paddingY={3}>
                <span className="today-feed-icon">{a.icon}</span>
                <Text variant="caption" tone="muted" flex="1" as="span" style={{ flex: 1 }}>{a.text}</Text>
                <Text variant="micro" tone="subtle" style={{ whiteSpace: "nowrap" }}>{a.time}</Text>
              </Stack>
            ))}
          </Stack>
        </Card>

        <Card sx={panelSx}>
          <Text variant="subheading" as="h3" style={{ marginBottom: "var(--sp-3)" }}>Quick actions</Text>
          <Grid columns={2} gap={3}>
            {model.quick.map((q) => (
              <Card key={q.label} sx={{ ...clickableSx, padding: "var(--sp-4)" }} onClick={() => go(q.mod)}>
                <Stack direction="column" gap={1}>
                  <span className="today-quick-icon">{q.icon}</span>
                  <Text variant="subheading">{q.label}</Text>
                  <Text variant="caption" tone="subtle">{q.sub}</Text>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Card>
      </Grid>
    </Stack>
  );
}
