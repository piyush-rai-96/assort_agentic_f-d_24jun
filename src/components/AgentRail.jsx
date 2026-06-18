import { useState } from "react";
import { Button } from "impact-ui";
import {
  AGENT_SIGNALS, PIPELINE_STEPS, AUDIT_LOG,
  SUGGESTED_QUESTIONS, AGENT_KPIS,
} from "../data/agentActivity.js";
import "./AgentRail.css";

const TABS = ["Signals", "Pipeline", "Log", "Ask"];

const SEV_COLORS = {
  error:   "var(--color-error)",
  warning: "var(--color-warning)",
  success: "var(--color-success)",
  info:    "var(--color-info)",
  violet:  "var(--color-accent)",
};

/* ── Pipeline step row ─────────────────────────────────────────────── */
function PipelineStep({ step, isLast, onNavigate }) {
  const isDone    = step.status === "done";
  const isActive  = step.status === "active";
  const isPartial = step.status === "partial";
  const cls = isDone ? "is-done" : isActive ? "is-active" : isPartial ? "is-partial" : "is-pending";

  return (
    <div>
      <div className={`ar-step ${cls}`} onClick={() => onNavigate?.(step.mod)}>
        <div className="ar-step-track">
          <div className="ar-step-circle">
            {isDone ? "✓" : isActive ? "▶" : isPartial ? "◑" : step.id}
          </div>
        </div>
        <div className="ar-step-body">
          <div className="ar-step-label">{step.label}</div>
          <div className="ar-step-sub">{step.sub}</div>
          {isActive && <div className="ar-active-badge">Active now</div>}
        </div>
      </div>
      {!isLast && (
        <div style={{ display: "flex" }}>
          <div style={{ width: 20, display: "flex", justifyContent: "center" }}>
            <div className={`ar-step-connector${isDone ? " done" : ""}`} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main AgentRail ────────────────────────────────────────────────── */
export default function AgentRail({ onOpenChat, onNavigate }) {
  const [tab, setTab] = useState("Signals");
  const [collapsed, setCollapsed] = useState(false);

  const donePct = Math.round(
    (PIPELINE_STEPS.filter((s) => s.status === "done").length / PIPELINE_STEPS.length) * 100
  );
  const errorSigs = AGENT_SIGNALS.filter((s) => s.severity === "error" || s.severity === "warning").length;

  if (collapsed) {
    return (
      <aside className="fd-agent-rail fd-agent-rail--collapsed" aria-label="Agent activity collapsed">
        <Button
          variant="ghost"
          className="fd-agent-expand-tab"
          onClick={() => setCollapsed(false)}
          title="Expand Agent Rail"
        >
          <span className="fd-agent-expand-icon" aria-hidden="true" /> <span>Agent</span>
        </Button>
      </aside>
    );
  }

  return (
    <aside className="fd-agent-rail" aria-label="Agent activity">
      {/* ── Header ── */}
      <div className="fd-agent-head">
        <div className="fd-agent-title">
          <span className="fd-agent-dot" />
          Agent Activity
          <span className="fd-agent-period">SS 2026</span>
        </div>
        <Button
          variant="ghost"
          className="fd-agent-collapse-btn"
          onClick={() => setCollapsed(true)}
          title="Collapse agent rail"
          aria-label="Collapse agent rail"
        >
          »
        </Button>
        {/* Mini KPI strip */}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          {[
            { val: `${AGENT_KPIS.confidence}%`, lbl: "Confidence", c: "var(--color-primary)"  },
            { val: `${AGENT_KPIS.overrideRate}%`, lbl: "Override",  c: "var(--color-teal)"   },
            { val: `${AGENT_KPIS.storesSubmitted}/${AGENT_KPIS.storesTotal}`, lbl: "Curated", c: "var(--color-info)" },
          ].map((k) => (
            <div key={k.lbl} style={{ flex: 1, background: "var(--color-surface-alt)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 6px", textAlign: "center" }}>
              <div style={{ fontSize: "var(--fs-caption)", fontWeight: 800, color: k.c, lineHeight: 1 }}>{k.val}</div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-subtle)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", marginTop: 2 }}>{k.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="fd-agent-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t}
            className={`fd-agent-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}>
            {t}
            {t === "Signals" && errorSigs > 0 && (
              <span style={{ marginLeft: 3, fontSize: "var(--fs-xs)", fontWeight: 800, padding: "0 4px", background: "var(--color-error)", color: "white", borderRadius: 8, lineHeight: "14px" }}>{errorSigs}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="fd-agent-body">

        {/* ───── SIGNALS ───── */}
        {tab === "Signals" && (
          <>
            <div className="ar-tab-header">
              <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)" }}>
                {AGENT_SIGNALS.length} signals · {errorSigs} need action
              </span>
              <span className={`ar-tab-count${errorSigs === 0 ? " green" : ""}`}>{errorSigs} urgent</span>
            </div>
            {AGENT_SIGNALS.map((sig) => (
              <div key={sig.id} className={`ar-signal-card sev-${sig.severity}`}>
                <div className="ar-signal-header">
                  <span className="ar-signal-icon">{sig.icon}</span>
                  <span className="ar-signal-title">{sig.title}</span>
                  <span className="ar-signal-time">{sig.time}</span>
                </div>
                <div className="ar-signal-body">{sig.body}</div>
                <Button variant="ghost" className="ar-signal-action" onClick={() => onNavigate?.(sig.mod)}>
                  {sig.action} →
                </Button>
              </div>
            ))}
          </>
        )}

        {/* ───── PIPELINE ───── */}
        {tab === "Pipeline" && (
          <>
            <div className="ar-pipeline-header">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)" }}>FW 2025 progress</span>
                <span style={{ fontSize: "var(--fs-micro)", fontWeight: 800, color: "var(--color-primary)" }}>{donePct}%</span>
              </div>
              <div className="ar-pipeline-progress-track">
                <div className="ar-pipeline-progress-fill" style={{ width: `${donePct}%` }} />
              </div>
              <div style={{ fontSize: "var(--fs-xs)", color: "var(--color-text-subtle)", marginTop: 3 }}>
                {PIPELINE_STEPS.filter((s) => s.status === "done").length} of {PIPELINE_STEPS.length} steps complete
              </div>
            </div>
            <div className="ar-pipeline-steps">
              {PIPELINE_STEPS.map((step, i) => (
                <PipelineStep key={step.id} step={step} isLast={i === PIPELINE_STEPS.length - 1} onNavigate={onNavigate} />
              ))}
            </div>
          </>
        )}

        {/* ───── LOG ───── */}
        {tab === "Log" && (
          <>
            <div className="ar-tab-header">
              <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--color-text-muted)" }}>Recent activity</span>
              <span className="ar-tab-count green">{AUDIT_LOG.length} entries</span>
            </div>
            {AUDIT_LOG.map((entry) => (
              <div key={entry.id} className="ar-log-entry">
                <div className="ar-log-dot" style={{ background: SEV_COLORS[entry.severity] || "var(--border)" }} />
                <span className="ar-log-icon">{entry.icon}</span>
                <span className="ar-log-text">{entry.text}</span>
                <span className="ar-log-time">{entry.time}</span>
              </div>
            ))}
          </>
        )}

        {/* ───── ASK ───── */}
        {tab === "Ask" && (
          <>
            {/* Agent hero card */}
            <div className="ar-agent-hero">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-body-lg)", flexShrink: 0 }}>🤖</div>
                <div>
                  <div className="ar-agent-hero-title">FD Assortment Agent</div>
                  <div className="ar-agent-hero-sub">FW 2025 · 21 stores · ready to assist</div>
                </div>
              </div>
              <div className="ar-agent-hero-stats">
                <div className="ar-hero-stat">
                  <span className="ar-hero-stat-val">{AGENT_KPIS.confidence}%</span>
                  <span className="ar-hero-stat-lbl">Confidence</span>
                </div>
                <div className="ar-hero-stat">
                  <span className="ar-hero-stat-val">{AGENT_KPIS.pipelinePct}%</span>
                  <span className="ar-hero-stat-lbl">Pipeline</span>
                </div>
                <div className="ar-hero-stat">
                  <span className="ar-hero-stat-val">{AGENT_KPIS.activeSignals}</span>
                  <span className="ar-hero-stat-lbl">Signals</span>
                </div>
              </div>
            </div>

            {/* Suggested questions by category */}
            {SUGGESTED_QUESTIONS.map((cat) => (
              <div key={cat.category} className="ar-question-category">
                <div className="ar-question-category-label">
                  <span>{cat.icon}</span>{cat.category}
                </div>
                {cat.questions.map((q, i) => (
                  <Button key={i} variant="ghost" className="ar-question-chip" onClick={() => onOpenChat?.(q)}>
                    {q}
                  </Button>
                ))}
              </div>
            ))}

            {/* Open full chat button */}
            <Button variant="secondary" className="ar-open-chat-btn" onClick={() => onOpenChat?.("")}>
              <span>💬</span> Open full chat assistant
            </Button>
          </>
        )}
      </div>
    </aside>
  );
}
