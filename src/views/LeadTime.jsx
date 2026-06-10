import React, { useMemo, useState } from "react";
import { Card, Button, Badge, ProgressBar } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import { LEAD_TIME_SKUS, STATUS_META, PIPELINE_STAGES } from "../data/leadtime.js";
import "./LeadTime.css";

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

function Banner({ tone, icon, children }) {
  const bg = { warning: "var(--color-warning-soft)", error: "var(--color-error-soft)" }[tone] || "var(--color-surface-alt)";
  const bd = { warning: "var(--color-warning)", error: "var(--color-error)" }[tone] || "var(--color-border)";
  return (
    <Stack direction="row" gap={2} align="flex-start" paddingX={3} paddingY={2} style={{ background: bg, border: `1px solid ${bd}`, borderLeft: `3px solid ${bd}`, borderRadius: "var(--r2)" }}>
      {icon ? <Text variant="caption">{icon}</Text> : null}
      <Text variant="caption" tone={tone === "error" ? "error" : "default"} style={{ lineHeight: 1.5 }}>{children}</Text>
    </Stack>
  );
}

export default function LeadTime() {
  const [skus, setSkus] = useState(LEAD_TIME_SKUS);

  const atRiskCount = skus.filter((s) => s.atRisk).length;
  const pendingOracle = skus.filter((s) => s.status === "pending-oracle").length;
  const avgLead = useMemo(() => Math.round(skus.reduce((a, s) => a + s.leadWeeks, 0) / (skus.length || 1)), [skus]);

  const markOracle = (id) =>
    setSkus((prev) => prev.map((s) => (s.id === id ? { ...s, status: "oracle-created", oracleCreate: new Date().toISOString().slice(0, 10) } : s)));

  const kpis = [
    { v: skus.length, l: "SKUs in pipeline", sub: "approved this cycle", tone: "info" },
    { v: pendingOracle, l: "Pending Oracle creation", sub: "lean data only", tone: "warning" },
    { v: `${avgLead} wks`, l: "Avg lead time", sub: "approval to floor", tone: "error" },
    { v: atRiskCount, l: "Trend-risk flags", sub: "may miss peak season", tone: atRiskCount ? "error" : "success" },
  ];

  return (
    <Stack direction="column" gap={4}>
      {/* Header */}
      <Card sx={panelSx}>
        <Stack direction="column" gap={3}>
          <Stack direction="row" justify="space-between" align="flex-start" gap={4} wrap>
            <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="title">Phase 5 — Lead Time &amp; Oracle</Text>
              <Text variant="caption" tone="muted">Approved SKUs · Oracle/Foundation creation · 6–8+ month lead times · Trend risk monitoring</Text>
            </Stack>
            <Stack direction="row" gap={2} wrap>
              {atRiskCount ? <Badge variant="subtle" size="small" color="error" label={`⚠ ${atRiskCount} at-risk`} /> : null}
              {pendingOracle ? <Badge variant="subtle" size="small" color="warning" label={`${pendingOracle} pending Oracle`} /> : null}
            </Stack>
          </Stack>
          <Grid min={170} gap={2}>
            {kpis.map((k) => (
              <div key={k.l} className="lt-kpi">
                <Text variant="kpi" tone={k.tone}>{k.v}</Text>
                <Text variant="micro" tone="muted">{k.l}</Text>
                <Text variant="micro" tone="subtle">{k.sub}</Text>
              </div>
            ))}
          </Grid>
        </Stack>
      </Card>

      {/* Pipeline timeline */}
      <Card sx={panelSx}>
        <Stack direction="column" gap={3}>
          <Text variant="body-strong" tone="strong">Typical lead-time pipeline</Text>
          <Stack className="lt-timeline" direction="row" gap={0}>
            {PIPELINE_STAGES.map((s, i) => (
              <div key={s.l} className="lt-stage">
                <div className="lt-node" style={{ background: s.c }}>{i + 1}</div>
                <Text variant="micro" tone="subtle" style={{ textAlign: "center" }}>{s.l}</Text>
              </div>
            ))}
          </Stack>
          <Banner tone="warning" icon="⏱">
            Total pipeline: <strong>6–8+ months</strong> from approval to floor. Oracle creation should begin within 5 business days of approval to avoid compounding delays.
          </Banner>
        </Stack>
      </Card>

      {/* SKU list */}
      {skus.map((sku) => {
        const meta = STATUS_META[sku.status] || { label: sku.status, badge: "default", prog: 10 };
        const oracleMissing = !sku.oracleCreate;
        return (
          <div key={sku.id} className={`lt-card${sku.atRisk ? " at-risk" : ""}`} style={{ padding: "var(--sp-4)" }}>
            <Stack direction="column" gap={3}>
              <Stack direction="row" justify="space-between" align="flex-start" gap={3} wrap>
                <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
                  <Text variant="body-strong" tone="strong">{sku.name}</Text>
                  <Text variant="micro" tone="subtle">{sku.dept} · Approved: {sku.approvedDate} · Target season: {sku.season}</Text>
                </Stack>
                <Badge variant="subtle" size="small" color={meta.badge} label={meta.label} />
              </Stack>

              <Stack direction="row" align="center" gap={3} wrap>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <ProgressBar value={meta.prog} status={meta.prog >= 100 ? "completed" : "remaining"} showTime={false} customLabel=" " />
                </div>
                <Text variant="micro" tone="muted" mono style={{ minWidth: 32, textAlign: "right" }}>{meta.prog}%</Text>
              </Stack>

              <Grid columns="1fr 1fr 1fr" gap={2} min={150}>
                <div className="lt-detail">
                  <Text variant="micro" tone="subtle">Oracle creation</Text>
                  <Text variant="caption" tone={oracleMissing ? "error" : "muted"} style={{ fontWeight: 600 }}>{sku.oracleCreate || "⚠ Not yet created"}</Text>
                </div>
                <div className="lt-detail">
                  <Text variant="micro" tone="subtle">Est. floor date</Text>
                  <Text variant="caption" tone="muted" style={{ fontWeight: 600 }}>{sku.estimatedFloor}</Text>
                </div>
                <div className="lt-detail">
                  <Text variant="micro" tone="subtle">Lead time</Text>
                  <Text variant="caption" tone="muted" style={{ fontWeight: 600 }}>{sku.leadWeeks} weeks</Text>
                </div>
              </Grid>

              {sku.atRisk ? (
                <Banner tone="error" icon="⚠️"><strong>Trend risk:</strong> {sku.riskReason}</Banner>
              ) : null}

              {sku.status === "pending-oracle" ? (
                <Stack direction="row" justify="flex-end">
                  <Button variant="primary" size="small" onClick={() => markOracle(sku.id)}>✓ Mark Oracle created</Button>
                </Stack>
              ) : null}
            </Stack>
          </div>
        );
      })}
    </Stack>
  );
}
