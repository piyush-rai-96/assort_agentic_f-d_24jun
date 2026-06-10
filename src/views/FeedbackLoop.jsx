import React from "react";
import { Card, Badge } from "impact-ui";
import Text from "../components/Text.jsx";
import Stack from "../components/Stack.jsx";
import Grid from "../components/Grid.jsx";
import {
  AGENT_TREND,
  LOOP_STEPS,
  FEEDBACK_INSIGHTS,
  INSIGHT_TYPE,
  REASON_LABEL,
  REASON_BREAKDOWN,
  SESSION_DISMISSED,
  SESSION_OVERRIDES,
} from "../data/feedback.js";
import "./FeedbackLoop.css";

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

function Bar({ pct, color }) {
  return (
    <div className="fb-bar">
      <div className="fb-bar-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
    </div>
  );
}

export default function FeedbackLoop() {
  const maxTotal = Math.max(...REASON_BREAKDOWN.map((c) => c.overrides + c.dismissals));

  return (
    <Stack direction="column" gap={4}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Card sx={panelSx}>
        <Stack direction="column" gap={3}>
          <Stack direction="row" justify="space-between" align="center" gap={3} wrap>
            <Stack direction="column" gap={1} flex="1 1 auto" style={{ minWidth: 0 }}>
              <Text variant="title">Feedback loop — SS 2025 → FW 2025</Text>
              <Text variant="caption" tone="muted">What the agent learned, and how it updated the model</Text>
            </Stack>
            <Badge variant="subtle" size="small" color="info" label="5 model updates" />
          </Stack>

          {/* Trend strip */}
          <Grid columns={4} gap={3}>
            {AGENT_TREND.map((t) => (
              <Card key={t.season} sx={t.current ? { ...softSx, border: "1px solid var(--color-primary)", background: "var(--color-primary-soft)" } : softSx}>
                <Stack direction="column" gap={1} align="center">
                  <Text variant="micro" tone="muted">{t.season}{t.current ? " ★" : ""}</Text>
                  <Text variant="kpi" tone={t.current ? "primary" : "strong"}>{t.conf}%</Text>
                  <Text variant="micro" tone="subtle">confidence</Text>
                  <Text variant="body-strong" tone={t.overrideRate <= 19 ? "success" : "warning"} style={{ marginTop: "var(--sp-1)" }}>{t.overrideRate}%</Text>
                  <Text variant="micro" tone="subtle">override rate</Text>
                  {t.st != null ? (
                    <>
                      <Text variant="caption" tone="teal" style={{ marginTop: "var(--sp-1)" }}>{t.st}%</Text>
                      <Text variant="micro" tone="subtle">avg ST</Text>
                    </>
                  ) : null}
                </Stack>
              </Card>
            ))}
          </Grid>
        </Stack>
      </Card>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <Card sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
        <Grid min={140} gap={2}>
          {LOOP_STEPS.map((s) => (
            <Stack key={s.label} className="fb-step" direction="column" gap={1} paddingX={3} paddingY={3}>
              <Text variant="heading" as="div">{s.icon}</Text>
              <Text variant="caption" tone="strong">{s.label}</Text>
              <Text variant="micro" tone="muted" style={{ lineHeight: 1.5 }}>{s.desc}</Text>
            </Stack>
          ))}
        </Grid>
      </Card>

      {/* ── Model updates ──────────────────────────────────────────────────── */}
      <Stack direction="column" gap={3}>
        <Text variant="overline" tone="muted">SS 2025 model updates ({FEEDBACK_INSIGHTS.length})</Text>
        {FEEDBACK_INSIGHTS.map((fi) => {
          const ts = INSIGHT_TYPE[fi.type] || INSIGHT_TYPE.flag;
          return (
            <Card key={fi.id} sx={{ ...panelSx, borderLeft: `3px solid ${ts.accent}` }}>
              <Stack direction="column" gap={3}>
                <Stack direction="row" justify="space-between" align="flex-start" gap={2} wrap>
                  <Stack direction="row" gap={2} align="center" wrap style={{ minWidth: 0 }}>
                    <Text variant="body-strong" tone="strong">{fi.title}</Text>
                    {fi.skuId ? <Text variant="micro" tone="subtle" mono>{fi.skuId}</Text> : null}
                  </Stack>
                  <Badge variant="subtle" size="small" color={ts.badge} label={`${ts.icon} ${ts.label}`} />
                </Stack>

                {/* Stats row */}
                <Stack direction="row" gap={2} wrap align="stretch">
                  {fi.stores ? (
                    <Stack direction="column" align="center" gap={0} paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)", minWidth: 72 }}>
                      <Text variant="kpi" tone="strong">{fi.stores}</Text>
                      <Text variant="micro" tone="subtle">stores</Text>
                    </Stack>
                  ) : null}
                  {fi.prevConf && fi.newConf ? (
                    <Stack direction="column" align="center" gap={0} paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)" }}>
                      <Text variant="subheading" tone={fi.type === "downgrade" ? "error" : "success"}>{fi.prevConf}% → {fi.newConf}%</Text>
                      <Text variant="micro" tone="subtle">confidence</Text>
                    </Stack>
                  ) : null}
                  {fi.st ? (
                    <Stack direction="column" align="center" gap={0} paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)", minWidth: 72 }}>
                      <Text variant="kpi" tone="strong">{fi.st}%</Text>
                      <Text variant="micro" tone="subtle">actual ST</Text>
                    </Stack>
                  ) : null}
                  <Stack direction="column" gap={1} flex="1 1 200px" paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)" }}>
                    <Text variant="micro" tone="subtle">Dominant reason code</Text>
                    <Text variant="caption" tone="teal" style={{ fontWeight: 500 }}>{REASON_LABEL[fi.dominantCode] || fi.dominantCode}</Text>
                  </Stack>
                </Stack>

                {/* Confidence before/after bars */}
                {fi.prevConf && fi.newConf ? (
                  <Stack direction="column" gap={2}>
                    {[
                      { l: "Before (SS 2025)", v: fi.prevConf, c: "var(--color-border-strong)" },
                      { l: "After (FW 2025)", v: fi.newConf, c: ts.accent },
                    ].map((b) => (
                      <Stack key={b.l} direction="row" align="center" gap={2}>
                        <Text variant="micro" tone="subtle" style={{ width: 110, flexShrink: 0 }}>{b.l}</Text>
                        <Bar pct={b.v} color={b.c} />
                        <Text variant="micro" mono style={{ width: 32, textAlign: "right", flexShrink: 0 }}>{b.v}%</Text>
                      </Stack>
                    ))}
                  </Stack>
                ) : null}

                <Stack direction="row" gap={1} paddingX={3} paddingY={2} style={{ background: "var(--color-surface-alt)", borderRadius: "var(--r2)" }}>
                  <Text variant="caption" tone="default"><strong>Impact:</strong> {fi.impact}</Text>
                </Stack>
                <Text variant="caption" tone="muted" style={{ lineHeight: 1.6, borderTop: "1px solid var(--color-border)", paddingTop: "var(--sp-2)" }}>{fi.note}</Text>
              </Stack>
            </Card>
          );
        })}
      </Stack>

      {/* ── Reason code breakdown ──────────────────────────────────────────── */}
      <Stack direction="column" gap={3}>
        <Text variant="overline" tone="muted">SS 2025 reason code breakdown</Text>
        <Card sx={panelSx}>
          <Stack direction="column" gap={3}>
            {REASON_BREAKDOWN.map((cb) => (
              <Stack key={cb.code} direction="row" align="center" gap={3}>
                <Text variant="caption" tone="default" style={{ width: 180, flexShrink: 0 }}>{cb.code}</Text>
                <Stack direction="column" gap={1} flex="1 1 auto">
                  <Stack direction="row" align="center" gap={2}>
                    <div className="fb-codebar" style={{ width: Math.round((cb.overrides / maxTotal) * 220), background: "var(--color-primary)" }} />
                    <Text variant="micro" tone="subtle">{cb.overrides} overrides</Text>
                  </Stack>
                  <Stack direction="row" align="center" gap={2}>
                    <div className="fb-codebar" style={{ width: Math.round((cb.dismissals / maxTotal) * 220), background: "var(--color-error)" }} />
                    <Text variant="micro" tone="subtle">{cb.dismissals} dismissals</Text>
                  </Stack>
                </Stack>
                <Text variant="caption" tone="strong" style={{ width: 28, textAlign: "right", flexShrink: 0 }}>{cb.overrides + cb.dismissals}</Text>
              </Stack>
            ))}
            <Stack direction="row" gap={4} wrap style={{ borderTop: "1px solid var(--color-border)", paddingTop: "var(--sp-2)" }}>
              <Stack direction="row" align="center" gap={2}>
                <div className="fb-codebar" style={{ width: 12, background: "var(--color-primary)" }} />
                <Text variant="micro" tone="muted">Override — manager added something the agent didn’t recommend</Text>
              </Stack>
              <Stack direction="row" align="center" gap={2}>
                <div className="fb-codebar" style={{ width: 12, background: "var(--color-error)" }} />
                <Text variant="micro" tone="muted">Dismissal — manager rejected an agent recommendation</Text>
              </Stack>
            </Stack>
          </Stack>
        </Card>
      </Stack>

      {/* ── This session's feedback ────────────────────────────────────────── */}
      {SESSION_DISMISSED.length || SESSION_OVERRIDES.length ? (
        <Stack direction="column" gap={3}>
          <Text variant="overline" tone="muted">This session’s feedback (FW 2025)</Text>
          <Card sx={{ ...panelSx, padding: 0, overflow: "hidden" }}>
            {SESSION_DISMISSED.map((dr) => (
              <Stack key={`d-${dr.skuId}`} direction="row" gap={3} align="flex-start" paddingX={4} paddingY={3} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div className="fb-dot" style={{ background: "var(--color-error-soft)", color: "var(--color-error)" }}>▽</div>
                <Stack direction="column" gap={1} flex="1 1 auto">
                  <Text variant="caption" tone="strong">{dr.skuName}</Text>
                  <Text variant="micro" tone="muted">Dismissed · <Text as="span" variant="micro" tone="teal" style={{ fontWeight: 500 }}>{REASON_LABEL[dr.code]}</Text>{dr.note ? ` · “${dr.note}”` : ""}</Text>
                  {dr.conf >= 80 ? <Text variant="micro" tone="warning" style={{ fontWeight: 500 }}>⚑ High confidence ({dr.conf}%) — flagged to regional manager</Text> : null}
                </Stack>
              </Stack>
            ))}
            {SESSION_OVERRIDES.map((or) => (
              <Stack key={`o-${or.skuId}`} direction="row" gap={3} align="flex-start" paddingX={4} paddingY={3} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <div className="fb-dot" style={{ background: "var(--color-success-soft)", color: "var(--color-success)" }}>▲</div>
                <Stack direction="column" gap={1} flex="1 1 auto">
                  <Text variant="caption" tone="strong">{or.skuName}</Text>
                  <Text variant="micro" tone="muted">Override · <Text as="span" variant="micro" tone="teal" style={{ fontWeight: 500 }}>{REASON_LABEL[or.code]}</Text>{or.note ? ` · “${or.note}”` : ""}</Text>
                </Stack>
              </Stack>
            ))}
          </Card>
        </Stack>
      ) : null}
    </Stack>
  );
}
