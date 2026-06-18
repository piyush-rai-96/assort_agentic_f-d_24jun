/*
 * AgentChatBot.jsx — Impact UI ChatBotComponent wrapper.
 *
 * Uses three ChatBotComponent modes:
 *   isCustomScreen=true   → rich landing page (signals + question chips)
 *   isCustomScreen=false  → ConversationScreen with JSX-rich agentic responses
 *
 * Bot responses are JSX nodes (bodyType → chat.type="jsx") so they render
 * structured cards, tables, action buttons, and follow-up chips.
 */
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChatBotComponent, Button, Badge, Card } from "impact-ui";
import {
  AGENT_SIGNALS, SUGGESTED_QUESTIONS, AGENT_KPIS,
} from "../data/agentActivity.js";
import { ACTIVE_CLUSTER_SET } from "../data/clustering.js";

/* ─── Design tokens — aligned with Impact UI ChatBot aesthetic ─────────────
   The ChatBotComponent uses a white/lavender/orange-purple palette.
   We match it here so our customScreenJsx feels native to the component.
   All hex values are defined as CSS variables in global.css under the
   --cb-* namespace; semantic colors map to --color-* tokens. */
const C = {
  /* Chatbot brand gradient colours */
  gradStart: "var(--cb-grad-start)", gradEnd: "var(--cb-grad-end)",
  /* Blues / lavender (match chatbot left panel) */
  blue: "var(--cb-blue)", blueSoft: "var(--cb-blue-soft)", blueLight: "var(--cb-blue-light)",
  /* Semantic colours — mapped to Impact UI design tokens */
  amber: "var(--color-warning)", amberSoft: "var(--color-warning-soft)",
  red:   "var(--color-error)",   redSoft:   "var(--color-error-soft)",
  mint:  "var(--color-success)", mintSoft:  "var(--color-success-soft)",
  violet: "var(--cb-violet)",    violetSoft: "var(--cb-violet-soft)",
  teal:  "var(--cb-teal)",       tealSoft:  "var(--cb-teal-soft)",
  /* Neutral backgrounds (match chatbot white theme) */
  bg: "var(--cb-bg)", bgSunken: "var(--cb-bg-sunken)",
  border: "var(--cb-border)", borderSoft: "var(--cb-border-soft)",
  text: "var(--cb-text)", textMuted: "var(--cb-text-muted)", textSubtle: "var(--cb-text-subtle)",
};

const SEV = {
  error:   { bg: C.redSoft,    border: C.red,    dot: C.red    },
  warning: { bg: C.amberSoft,  border: C.amber,  dot: C.amber  },
  success: { bg: C.mintSoft,   border: C.mint,   dot: C.mint   },
  info:    { bg: C.blueSoft,   border: C.blue,   dot: C.blue   },
  violet:  { bg: C.violetSoft, border: C.violet, dot: C.violet },
};

/* ─── Timestamp — Impact UI expects "DD-MM-YYYY HH:mm:ss" ───────────────── */
function nowStamp() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/* ─── Build `conversation` prop from messages array ─────────────────────── */
function buildConversation(messages) {
  if (!messages.length) return null;
  return {
    conversations: {
      "FW2025-Assortment": {
        messages: messages.map((m, i) => ({
          id: i,
          userType: m.role === "bot" ? "bot" : "user",
          bodyText: m.text || "",
          bodyType: "text",
          jsx: m.jsx || undefined,
          thinkingResponse: m.thinkingResponse || undefined,
          timeStamp: m.timestamp,
        })),
      },
    },
  };
}

/* ══════════════════════════════════════════════════════════════════════════
   AGENTIC JSX RESPONSE BUILDERS
   ══════════════════════════════════════════════════════════════════════════ */

/* Shared atoms */
const Divider = () => <div style={{ height: 1, background: C.border, margin: "8px 0" }} />;
const SectionLabel = ({ children }) => (
  <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.textSubtle, marginBottom: 6 }}>{children}</div>
);
const MetricRow = ({ label, value, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
    <span style={{ fontSize: "var(--fs-caption)", color: C.textMuted }}>{label}</span>
    <span style={{ fontSize: "var(--fs-caption)", fontWeight: 700, color: color || C.text }}>{value}</span>
  </div>
);
const ActionChip = ({ label, onClick }) => (
  <Button variant="ghost" onClick={onClick} style={{ padding: "4px 12px", borderRadius: 14, fontSize: "var(--fs-micro)", fontWeight: 700, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, whiteSpace: "nowrap" }}>
    {label}
  </Button>
);
const PrimaryAction = ({ label, onClick }) => (
  <Button variant="primary" onClick={onClick} style={{ padding: "6px 14px", borderRadius: 8, fontSize: "var(--fs-caption)", fontWeight: 700, background: C.blue }}>
    {label}
  </Button>
);
const CohesionBar = ({ value }) => {
  const clr = value >= 0.8 ? C.mint : value >= 0.7 ? C.amber : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: C.bgSunken, borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value * 100}%`, height: "100%", background: clr, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: "var(--fs-micro)", fontWeight: 700, color: clr, minWidth: 28 }}>{value.toFixed(2)}</span>
    </div>
  );
};
const FollowUps = ({ questions, onAsk }) => (
  <div style={{ marginTop: 12 }}>
    <SectionLabel>Follow-up questions</SectionLabel>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {questions.map((q, i) => <ActionChip key={i} label={q} onClick={() => onAsk(q)} />)}
    </div>
  </div>
);

/* ── Cluster response ─────────────────────────────────────────────────────  */
function buildClusterJsx(onAsk) {
  const { clusters, runId, method, cohesion } = ACTIVE_CLUSTER_SET || {};
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "var(--fs-body)", color: C.text }}>
      <div style={{ background: C.blueSoft, border: `1px solid ${C.blueLight}`, borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: "var(--fs-body-lg)", color: C.blue }}>📍 Active: {runId}</span>
          <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, background: C.mint, color: "white", padding: "2px 8px", borderRadius: 10 }}>Live</span>
        </div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 3 }}>{method} · Avg cohesion {cohesion}</div>
      </div>

      <SectionLabel>5 clusters — all healthy ✅</SectionLabel>
      {clusters?.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: "var(--fs-caption)" }}>{c.name}</span>
          <span style={{ fontSize: "var(--fs-micro)", color: C.textSubtle }}>{c.stores} stores</span>
          <div style={{ width: 80 }}><CohesionBar value={c.cohesion} /></div>
        </div>
      ))}

      <Divider />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        <PrimaryAction label="View cohesion scores →" onClick={() => onAsk("Show me cohesion scores for all clusters")} />
      </div>
      <FollowUps questions={[
        "Show me cohesion scores for all clusters",
        "How are stores split across clusters?",
        "When is the CR-018 cluster re-run scheduled?",
      ]} onAsk={onAsk} />
    </div>
  );
}

/* ── Cohesion response ────────────────────────────────────────────────────  */
function buildCohesionJsx(onAsk) {
  const { clusters } = ACTIVE_CLUSTER_SET || {};
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "var(--fs-body)", color: C.text }}>
      <SectionLabel>Cohesion scores — CR-018</SectionLabel>
      {clusters?.map((c) => (
        <div key={c.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
          <span style={{ fontSize: "var(--fs-caption)", fontWeight: 600 }}>{c.name}</span>
          <div style={{ width: 100 }}><CohesionBar value={c.cohesion} /></div>
        </div>
      ))}
      <div style={{ background: C.mintSoft, borderRadius: 8, padding: "8px 12px", marginTop: 10, fontSize: "var(--fs-caption)", color: C.mint, fontWeight: 600 }}>
        ✅ All 5 clusters above the 0.75 healthy threshold. Network average: <strong>0.80</strong>.
        Next re-run: <strong>Apr 12, 2026</strong>.
      </div>
      <FollowUps questions={[
        "Which cluster has the lowest cohesion score?",
        "Which cluster has the most stores in CR-018?",
        "When is the next cluster re-run scheduled?",
      ]} onAsk={onAsk} />
    </div>
  );
}

/* ── Curation response ────────────────────────────────────────────────────  */
function buildCurationJsx(onAsk) {
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "var(--fs-body)", color: C.text }}>
      <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}`, borderLeft: `3px solid ${C.amber}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, color: C.amber }}>⚠️ Action required — 8 stores not started</div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 2 }}>Curation window closes in <strong>9 days</strong>. Auto-close: Sep 20.</div>
      </div>

      <SectionLabel>Submission status</SectionLabel>
      <MetricRow label="Submitted" value={`${AGENT_KPIS.storesSubmitted} / ${AGENT_KPIS.storesTotal} stores`} color={C.mint} />
      <MetricRow label="Not started" value="8 stores (Gulf cluster)" color={C.red} />
      <MetricRow label="Days remaining" value="9 days" color={C.amber} />
      <MetricRow label="Completion" value={`${Math.round((AGENT_KPIS.storesSubmitted / AGENT_KPIS.storesTotal) * 100)}%`} color={C.blue} />

      <Divider />
      <div style={{ background: C.bg, borderRadius: 8, padding: "8px 12px", fontSize: "var(--fs-caption)" }}>
        <strong>Gulf cluster stores at risk:</strong> Austin Central, Dallas Uptown, Houston South, San Antonio Pro + 4 others.
        Stores not submitted by Sep 20 will receive <strong>agent-generated defaults</strong>.
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <PrimaryAction label="Show Gulf stores detail →" onClick={() => onAsk("Which Gulf stores have not submitted curation?")} />
      </div>
      <FollowUps questions={[
        "What are the consequences for stores missing the curation deadline?",
        "How does incomplete curation affect the MPI step?",
        "How many stores are still pending submission?",
      ]} onAsk={onAsk} />
    </div>
  );
}

/* ── SKU / Catalogue response ─────────────────────────────────────────────  */
function buildSkuJsx(onAsk) {
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "var(--fs-body)", color: C.text }}>
      <div style={{ background: C.blueSoft, border: `1px solid ${C.blueLight}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-body)", color: C.blue }}>📦 Catalogue: 35 SKUs · FW 2025</div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 2 }}>Forecast confidence: <strong style={{ color: C.mint }}>{AGENT_KPIS.confidence}%</strong> · Agent not yet run in Catalogue step</div>
      </div>

      <SectionLabel>Agent recommendations</SectionLabel>
      <div style={{ background: C.violetSoft, borderLeft: `3px solid ${C.violet}`, borderRadius: 6, padding: "8px 12px", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-caption)", color: C.violet }}>🤖 SOL-SEASHELL — Expansion flagged</div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 2 }}>+12 stores show high demand vs LY comps. Agent recommends adding to 3 additional clusters before next assortment lock.</div>
      </div>
      <div style={{ background: C.redSoft, borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-caption)", color: C.red }}>⚠️ POR-TRAVERT — Lead time extended to 20 wk</div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 2 }}>Sourcing risk for Q2 replenishment. Consider backup supplier or reducing forward buy quantity.</div>
      </div>

      <SectionLabel>National Core — 5 locked SKUs</SectionLabel>
      {[
        { sku: "AQG-WARMOAK",   desc: "Aqua Grey Warm Oak · 6\"×36\" LVP",       status: "Forecast received ✅" },
        { sku: "TIM-GRAYWASH",  desc: "Timber Greywash · 8\"×48\" WPC",          status: "Locked ✅"            },
        { sku: "POR-IVORY",     desc: "Porcelain Ivory Matte · 12\"×24\" tile",  status: "Locked ✅"            },
        { sku: "CER-NORDIC",    desc: "Ceramic Nordic White · 4\"×12\" subway",  status: "Locked ✅"            },
        { sku: "NAT-SLATE",     desc: "Natural Slate Charcoal · 18\"×18\" stone",status: "Locked ✅"            },
      ].map((s) => (
        <div key={s.sku} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: "var(--fs-micro)", fontWeight: 800, color: C.mint, flexShrink: 0 }}>✅</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: "var(--fs-caption)", fontWeight: 700, color: C.text }}>{s.sku}</div>
            <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted }}>{s.desc}</div>
          </div>
          <span style={{ fontSize: "var(--fs-micro)", color: s.status.includes("Forecast") ? C.blue : C.mint, fontWeight: 600, flexShrink: 0 }}>{s.status}</span>
        </div>
      ))}
      <MetricRow label="National Core lock" value="✅ Active — no changes without VP approval" color={C.mint} />

      <FollowUps questions={[
        "Why is SOL-SEASHELL flagged for expansion?",
        "What is the lead time risk on POR-TRAVERT?",
        "Show me the full Core SKU list",
      ]} onAsk={onAsk} />
    </div>
  );
}

/* ── Pipeline response ────────────────────────────────────────────────────  */
function buildPipelineJsx(onAsk) {
  const steps = [
    { label: "Portfolio Build",  status: "done",    detail: "Completed Oct 2"         },
    { label: "Forecast Receipt", status: "done",    detail: "87% confidence ✅"         },
    { label: "Catalogue",        status: "active",  detail: "Agent pending ⚡"          },
    { label: "National Core",    status: "partial", detail: "5 SKUs locked"             },
    { label: "Regional Review",  status: "partial", detail: "6/8 clusters submitted"    },
    { label: "Store Curation",   status: "active",  detail: "18/70 stores (26%)"        },
    { label: "MPI / NPI",        status: "pending", detail: "Waiting on curation"       },
    { label: "Oracle Export",    status: "pending", detail: "Final step — not started"  },
  ];
  const statusColor = { done: C.mint, active: C.blue, partial: C.amber, pending: C.textSubtle };
  const statusIcon  = { done: "✅", active: "▶", partial: "◑", pending: "○" };

  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "var(--fs-body)", color: C.text }}>
      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: "var(--fs-body-lg)" }}>FW 2025 Pipeline</span>
          <span style={{ fontWeight: 800, fontSize: "var(--fs-heading)", color: C.blue }}>{AGENT_KPIS.pipelinePct}% complete</span>
        </div>
        <div style={{ height: 7, background: C.bgSunken, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${AGENT_KPIS.pipelinePct}%`, height: "100%", background: `linear-gradient(90deg, ${C.blue}, ${C.violet})`, borderRadius: 4 }} />
        </div>
      </div>

      {steps.map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: "var(--fs-body)", flexShrink: 0 }}>{statusIcon[s.status]}</span>
          <span style={{ flex: 1, fontSize: "var(--fs-caption)", fontWeight: s.status !== "pending" ? 600 : 400 }}>{s.label}</span>
          <span style={{ fontSize: "var(--fs-micro)", color: statusColor[s.status], fontWeight: 600 }}>{s.detail}</span>
        </div>
      ))}

      <div style={{ background: C.blueSoft, borderRadius: 8, padding: "8px 12px", marginTop: 10, fontSize: "var(--fs-caption)" }}>
        <strong style={{ color: C.blue }}>Critical path:</strong> Run the Catalogue agent first → complete store curation before Sep 20 → MPI/NPI → Oracle export.
      </div>
      <FollowUps questions={[
        "What is blocking the pipeline from progressing?",
        "How many stores still need to complete curation?",
        "What must be completed before Oracle export can begin?",
      ]} onAsk={onAsk} />
    </div>
  );
}

/* ── Regional Review response ─────────────────────────────────────────────  */
function buildRegionalJsx(onAsk) {
  const clusters = [
    { name: "Pro-Heavy South",   status: "submitted", date: "Oct 3"     },
    { name: "DIY-Heavy West",    status: "submitted", date: "Oct 4"     },
    { name: "DIY-Heavy South",   status: "submitted", date: "Oct 5"     },
    { name: "Pro-Heavy Midwest", status: "submitted", date: "Oct 5"     },
    { name: "Gulf Coast",        status: "submitted", date: "Oct 6"     },
    { name: "Northeast Urban",   status: "submitted", date: "Oct 6"     },
    { name: "Mid-Atlantic",      status: "pending",   date: "—"         },
    { name: "Pacific South",     status: "pending",   date: "—"         },
  ];
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "var(--fs-body)", color: C.text }}>
      <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}`, borderLeft: `3px solid ${C.amber}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, color: C.amber }}>◑ Regional review — 6 of 8 clusters submitted</div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 2 }}>Mid-Atlantic (GA) and Pacific South (CA) are still pending. Lock date TBD.</div>
      </div>

      <SectionLabel>Cluster submission status</SectionLabel>
      {clusters.map((c) => (
        <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: "var(--fs-caption)", flexShrink: 0 }}>{c.status === "submitted" ? "✅" : "⏳"}</span>
          <span style={{ flex: 1, fontSize: "var(--fs-caption)", fontWeight: c.status === "pending" ? 500 : 600 }}>{c.name}</span>
          <span style={{ fontSize: "var(--fs-micro)", color: c.status === "submitted" ? C.mint : C.amber, fontWeight: 600 }}>
            {c.status === "submitted" ? `Submitted ${c.date}` : "Pending"}
          </span>
        </div>
      ))}

      <FollowUps questions={[
        "Which clusters are still pending regional review?",
        "What needs to happen before the regional review can lock?",
        "Show me the full pipeline status",
      ]} onAsk={onAsk} />
    </div>
  );
}

/* ── Market Intel response ────────────────────────────────────────────────  */
function buildIntelJsx(onAsk) {
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "var(--fs-body)", color: C.text }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[{ label: "7", sub: "Active signals", color: C.blue }, { label: "2", sub: "Threats", color: C.red }, { label: "1", sub: "Opportunity", color: C.mint }].map((k) => (
          <div key={k.sub} style={{ flex: "1 1 80px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: "var(--fs-title)", fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.label}</div>
            <div style={{ fontSize: "var(--fs-xs)", color: C.textSubtle, fontWeight: 700, marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Competitor threats</SectionLabel>
      <div style={{ background: C.redSoft, borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-caption)" }}>Flooring competitor — Southeast tile expansion</div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 2 }}>New tile line launching Q4 — 12 of your C3 stores are at direct risk. Recommended action: review assortment depth and price positioning.</div>
      </div>
      <div style={{ background: C.redSoft, borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-caption)" }}>Big-box LVP promotion running through Oct</div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 2 }}>Price pressure in DIY-Heavy clusters — 15 stores may see traffic shift to big-box. Consider promotional depth on core LVP SKUs.</div>
      </div>

      <SectionLabel>Growth opportunity</SectionLabel>
      <div style={{ background: C.mintSoft, borderLeft: `3px solid ${C.mint}`, borderRadius: 6, padding: "8px 12px" }}>
        <div style={{ fontWeight: 700, fontSize: "var(--fs-caption)", color: C.mint }}>Natural stone demand +18% YoY — Pacific South</div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, marginTop: 2 }}>C4 Mixed Urban East: recommend expanding stone SKU depth before the assortment lock. Demand signal strongest in CA and WA.</div>
      </div>

      <FollowUps questions={[
        "What should we do about the Southeast competitor tile threat?",
        "How do we respond to the LVP big-box promotion?",
        "What stone SKUs should we expand in Pacific South?",
      ]} onAsk={onAsk} />
    </div>
  );
}

/* ── Generic / default response ───────────────────────────────────────────  */
function buildDefaultJsx(question, onAsk) {
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: "var(--fs-body)", color: C.text }}>
      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: "var(--fs-caption)" }}>
        I'm the <strong>FD Assortment Intelligence Agent</strong> for FW 2025. I can analyse clusters, curation status, SKU recommendations, pipeline progress, regional review, and market intelligence.
      </div>
      <SectionLabel>Quick status — FW 2025</SectionLabel>
      <MetricRow label="Pipeline progress" value={`${AGENT_KPIS.pipelinePct}%`} color={C.blue} />
      <MetricRow label="Forecast confidence" value={`${AGENT_KPIS.confidence}%`} color={C.mint} />
      <MetricRow label="Stores submitted" value={`${AGENT_KPIS.storesSubmitted}/${AGENT_KPIS.storesTotal}`} color={C.blue} />
      <MetricRow label="Active signals" value={`${AGENT_KPIS.activeSignals} requiring action`} color={C.amber} />
      <FollowUps questions={[
        "What needs my attention most urgently?",
        "Show the FW 2025 pipeline status",
        "What is the current active cluster set?",
      ]} onAsk={onAsk} />
    </div>
  );
}

/* ── Build thinking header for each question type ─────────────────────────  */
const THINKING_HEADERS = {
  cluster:   { thinkingHeading: "🧠  Analysing cluster data…",        thinkingContent: "Checked CR-018 · k-means parameters · cohesion scores · 5 cluster assignments across 70 stores" },
  cohesion:  { thinkingHeading: "🧠  Computing cohesion metrics…",     thinkingContent: "Calculated within-cluster variance · compared to 0.75 healthy threshold · ranked all 5 clusters" },
  curation:  { thinkingHeading: "🧠  Checking curation status…",       thinkingContent: "Queried 70-store submission log · identified 8 not-started in Gulf cluster · checked window deadline" },
  sku:       { thinkingHeading: "🧠  Scanning SKU data…",              thinkingContent: "Reviewed 35 active SKUs · cross-referenced agent signals · checked forecast confidence and lead times" },
  pipeline:  { thinkingHeading: "🧠  Loading pipeline state…",         thinkingContent: "Fetched FW2025 phase status · calculated 63% completion · identified critical path blockers" },
  regional:  { thinkingHeading: "🧠  Checking regional review…",       thinkingContent: "Loaded 8-cluster regional submission log · identified Mid-Atlantic and Pacific South as pending" },
  intel:     { thinkingHeading: "🧠  Pulling market intelligence…",    thinkingContent: "Scanned 7 active signals · analysed 2 competitor threats and 1 expansion opportunity" },
  default:   { thinkingHeading: "🧠  Thinking…",                       thinkingContent: "Reviewing FW2025 assortment state across clusters, curation, SKUs, and market signals" },
};

/* ─── Resolve JSX response + thinking header from question text ───────────
   Priority order: specific proper nouns → cohesion → cluster → SKU →
   pipeline → regional → intel → curation → default                       */
function resolveJsxResponse(text, onAsk) {
  const q = text.toLowerCase();
  // Specific proper nouns — must come before broad topic checks
  if (q.includes("gulf"))
    return { jsx: buildCurationJsx(onAsk),  thinking: THINKING_HEADERS.curation  };
  if (q.includes("seashell") || q.includes("travert") || q.includes("aqg"))
    return { jsx: buildSkuJsx(onAsk),       thinking: THINKING_HEADERS.sku       };
  // Domain topics, most specific first
  if (q.includes("cohesion") || q.includes("re-run") || q.includes("rerun") || q.includes("next run"))
    return { jsx: buildCohesionJsx(onAsk),  thinking: THINKING_HEADERS.cohesion  };
  if (q.includes("cluster"))
    return { jsx: buildClusterJsx(onAsk),   thinking: THINKING_HEADERS.cluster   };
  if (q.includes("sku") || q.includes("catalogue") || q.includes("catalog") || q.includes("forecast") || q.includes("core sku") || q.includes("lead time") || q.includes("velocity") || q.includes("flagged"))
    return { jsx: buildSkuJsx(onAsk),       thinking: THINKING_HEADERS.sku       };
  if (q.includes("pipeline") || q.includes("blocking") || q.includes("oracle") || q.includes("export") || q.includes("mpi") || q.includes("npi") || q.includes("completion") || q.includes("progress") || q.includes("critical path"))
    return { jsx: buildPipelineJsx(onAsk),  thinking: THINKING_HEADERS.pipeline  };
  if (q.includes("region") || q.includes("regional") || (q.includes("review") && !q.includes("curation")))
    return { jsx: buildRegionalJsx(onAsk),  thinking: THINKING_HEADERS.regional  };
  if (q.includes("intel") || q.includes("competitor") || q.includes("threat") || q.includes("stone") || q.includes("lvp") || q.includes("market") || q.includes("c3") || q.includes("opportunity"))
    return { jsx: buildIntelJsx(onAsk),     thinking: THINKING_HEADERS.intel     };
  if (q.includes("curation") || q.includes("deadline") || q.includes("store") || q.includes("submit") || q.includes("not started"))
    return { jsx: buildCurationJsx(onAsk),  thinking: THINKING_HEADERS.curation  };
  if (q.includes("signal"))
    return { jsx: buildIntelJsx(onAsk),     thinking: THINKING_HEADERS.intel     };
  return { jsx: buildDefaultJsx(text, onAsk), thinking: THINKING_HEADERS.default };
}

/* ══════════════════════════════════════════════════════════════════════════
   LANDING PAGE JSX — passed as customScreenJsx
   ══════════════════════════════════════════════════════════════════════════ */

const CAT_STYLE = {
  "Clusters":         { color: "var(--color-accent)",   bg: "var(--color-accent-soft)",   border: "var(--color-accent)"   },
  "Curation":         { color: "var(--color-warning)",  bg: "var(--color-warning-soft)",  border: "var(--color-warning)"  },
  "SKUs & Catalogue": { color: "var(--color-primary)",  bg: "var(--color-primary-soft)",  border: "var(--color-primary)"  },
  "Performance":      { color: "var(--color-teal)",     bg: "var(--color-teal-soft)",     border: "var(--color-teal)"     },
};

/* Inline SVG icons for question categories */
const CAT_ICON = {
  "Clusters":         <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2"/></svg>,
  "Curation":         <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 8h6M5 5.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  "SKUs & Catalogue": <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 3h10v2.5L8 10 3 5.5V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8 10v4M5.5 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  "Performance":      <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><polyline points="2,12 6,7 9,10 13,4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

function ChatLandingContent({ onAsk }) {
  return (
    <div style={{ fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>

      {/* ══ HERO ═══════════════════════════════════════════════════════════════ */}
      <div style={{ padding: "var(--sp-6) var(--sp-5) var(--sp-4)", textAlign: "center", flexShrink: 0 }}>
        {/* Avatar */}
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-primary-soft) 0%, var(--color-accent-soft) 100%)", margin: "0 auto var(--sp-3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "var(--fs-display)", boxShadow: "var(--sh)", position: "relative" }}>
          ✦
          <div style={{ position: "absolute", bottom: 2, right: 2, width: 12, height: 12, borderRadius: "50%", background: "var(--color-success)", border: "2px solid var(--color-surface)" }} />
        </div>
        {/* Name */}
        <div style={{ fontSize: "var(--fs-title)", fontWeight: 800, color: "var(--color-text-strong)", letterSpacing: "-.02em", lineHeight: 1.2 }}>
          FD Assortment{" "}
          <span style={{ color: "var(--color-primary)" }}>Agent</span>
        </div>
        <div style={{ fontSize: "var(--fs-micro)", color: C.textSubtle, marginTop: "var(--sp-1)", fontWeight: 500 }}>
          FW 2025 · 70 stores · Ask me anything
        </div>
        {/* KPI pills */}
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--sp-2)", marginTop: "var(--sp-3)", flexWrap: "wrap" }}>
          <Badge variant="subtle" size="small" color="success" label={`${AGENT_KPIS.confidence}% confidence`} />
          <Badge variant="subtle" size="small" color="info"    label={`${AGENT_KPIS.pipelinePct}% pipeline`} />
          <Badge variant="subtle" size="small" color="warning" label={`${AGENT_KPIS.storesSubmitted}/${AGENT_KPIS.storesTotal} curated`} />
          <Badge variant="subtle" size="small" color="error"   label={`${AGENT_KPIS.activeSignals} signals`} />
        </div>
      </div>

      {/* ══ SCROLLABLE BODY ════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 var(--sp-4) var(--sp-5)" }}>

        {/* ── Active Signals ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "var(--sp-4)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--sp-2)" }}>
            <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: C.textSubtle }}>
              Active Signals
            </span>
            <Badge variant="subtle" size="small" color="error" label={String(AGENT_SIGNALS.length)} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
            {AGENT_SIGNALS.map((sig) => {
              const s = SEV[sig.severity] || SEV.info;
              return (
                <Card
                  key={sig.id}
                  size="small"
                  sx={{ borderLeft: `3px solid ${s.dot}`, cursor: "pointer", display: "flex", alignItems: "flex-start", gap: "var(--sp-2)", padding: "var(--sp-2) var(--sp-3)" }}
                  onClick={() => onAsk(sig.ask || sig.title)}
                  tabIndex={0}
                >
                  <span style={{ fontSize: "var(--fs-body-lg)", flexShrink: 0, marginTop: 1 }}>{sig.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "var(--fs-micro)", fontWeight: 700, color: C.text, marginBottom: 1 }}>{sig.title}</div>
                    <div style={{ fontSize: "var(--fs-micro)", color: C.textMuted, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{sig.body}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "var(--sp-1)", flexShrink: 0 }}>
                    <span style={{ fontSize: "var(--fs-xs)", color: C.textSubtle, whiteSpace: "nowrap" }}>{sig.time}</span>
                    <span style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: s.dot, whiteSpace: "nowrap" }}>Ask →</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Suggested Questions ─────────────────────────────────────────────── */}
        <div>
          <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: C.textSubtle, marginBottom: "var(--sp-2)" }}>
            Start with a question
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
            {SUGGESTED_QUESTIONS.flatMap((cat) =>
              cat.questions.slice(0, 2).map((q, i) => {
                const cs = CAT_STYLE[cat.category] || { color: C.blue, bg: C.blueSoft, border: C.blueLight };
                return (
                  <Card
                    key={`${cat.category}-${i}`}
                    size="small"
                    sx={{ cursor: "pointer", padding: "var(--sp-2) var(--sp-3)" }}
                    onClick={() => onAsk(q)}
                    tabIndex={0}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-1)", color: cs.color, marginBottom: "var(--sp-1)" }}>
                      {CAT_ICON[cat.category]}
                      <span style={{ fontSize: "var(--fs-xs)", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em" }}>{cat.category}</span>
                    </div>
                    <span style={{ fontSize: "var(--fs-micro)", fontWeight: 500, color: C.text, lineHeight: 1.4 }}>{q}</span>
                  </Card>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   HISTORY UTILITIES
   ══════════════════════════════════════════════════════════════════════════ */

/* Group conversations by date for the HistoryPanel data format */
function buildHistoryData(conversations) {
  if (!conversations.length) return [];
  const today     = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const buckets = {};
  conversations.forEach((conv) => {
    const d    = new Date(conv.timestamp);
    const key  = d.toDateString() === today.toDateString()     ? "Today"
               : d.toDateString() === yesterday.toDateString() ? "Yesterday"
               : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push({
      conversation_id: conv.id,
      name:            conv.name,
      module_name:     "FW 2025",
      pinned:          conv.pinned || false,
    });
  });

  return Object.entries(buckets).map(([group_name, conversation_list]) => ({
    group_name,
    conversation_list,
  }));
}

/* Generate a stable conversation ID */
const genId = () => `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* Build preDefinedQuestions from SUGGESTED_QUESTIONS for the bookmark panel */
const PRE_DEFINED_QUESTIONS = SUGGESTED_QUESTIONS.flatMap((cat) =>
  cat.questions.map((q) => ({ text: q, category: cat.category }))
);

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
export default function AgentChatBot({ isOpen, setIsOpen, initialMessage }) {
  /* ── Core state ─────────────────────────────────────────────────────── */
  const [messages,      setMessages]    = useState([]);
  const [isThinking,    setIsThinking]  = useState(false);
  const [screen,        setScreen]      = useState("landing"); // "landing" | "chat"

  /* ── History state ──────────────────────────────────────────────────── */
  const [conversations,    setConversations]    = useState([]); // saved sessions
  const [activeConvId,     setActiveConvId]     = useState(null);
  const [historyOpenGroups, setHistoryOpenGroups] = useState({});

  const thinkingRef  = useRef(null);
  const messagesRef  = useRef(messages);  // always-current messages for callbacks
  const convIdRef    = useRef(activeConvId);
  useEffect(() => { messagesRef.current  = messages;   }, [messages]);
  useEffect(() => { convIdRef.current    = activeConvId; }, [activeConvId]);

  /* ── Save current conversation into history ─────────────────────────── */
  const persistConversation = useCallback((msgs, existingId) => {
    if (!msgs || msgs.length === 0) return null;
    const firstUser = msgs.find((m) => m.role === "user");
    if (!firstUser) return null;

    const id    = existingId || genId();
    const entry = {
      id,
      name:      firstUser.text.slice(0, 60),
      messages:  [...msgs],
      timestamp: Date.now(),
    };

    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...entry };
        return next;
      }
      return [entry, ...prev];
    });
    return id;
  }, []);

  /* ── Core send function ─────────────────────────────────────────────── */
  const sendMessage = useCallback((msgOrText) => {
    const text = typeof msgOrText === "string" ? msgOrText : msgOrText?.text;
    if (!text?.trim()) return;

    setScreen("chat");
    setIsThinking(true);

    const userMsg = { role: "user", text: text.trim(), timestamp: nowStamp() };
    setMessages((prev) => {
      const next = [...prev, userMsg];
      /* Persist in real-time so history stays current */
      const id = persistConversation(next, convIdRef.current);
      if (!convIdRef.current) setActiveConvId(id);
      return next;
    });

    const delay = 800 + Math.random() * 600;
    if (thinkingRef.current) clearTimeout(thinkingRef.current);
    thinkingRef.current = setTimeout(() => {
      const { jsx, thinking } = resolveJsxResponse(text, sendMessage);
      const botMsg = {
        role: "bot",
        text: "",
        jsx,
        thinkingResponse: thinking,
        timestamp: nowStamp(),
        firstMessage: true,
      };
      setMessages((prev) => {
        const next = [...prev, botMsg];
        persistConversation(next, convIdRef.current);
        return next;
      });
      setIsThinking(false);
    }, delay);
  }, [persistConversation]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-trigger initial message when opened from AgentRail ─────────── */
  useEffect(() => {
    if (isOpen && initialMessage) {
      const t = setTimeout(() => sendMessage(initialMessage), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, initialMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Reset to landing on close (do NOT wipe history) ────────────────── */
  useEffect(() => {
    if (!isOpen) {
      if (thinkingRef.current) clearTimeout(thinkingRef.current);
      const t = setTimeout(() => {
        setMessages([]);
        setScreen("landing");
        setIsThinking(false);
        setActiveConvId(null);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => () => { if (thinkingRef.current) clearTimeout(thinkingRef.current); }, []);

  /* ── New-chat button — saves current, resets to landing ─────────────── */
  const handleNewChatClick = useCallback(() => {
    if (thinkingRef.current) clearTimeout(thinkingRef.current);
    persistConversation(messagesRef.current, convIdRef.current);
    setMessages([]);
    setScreen("landing");
    setIsThinking(false);
    setActiveConvId(null);
    return { isInitialClickPresent: false };
  }, [persistConversation]);

  /* ── Load a past conversation from history ───────────────────────────── */
  const handleSelectConversation = useCallback((item) => {
    const conv = conversations.find((c) => c.id === item.conversation_id);
    if (!conv) return;
    setMessages(conv.messages);
    setActiveConvId(conv.id);
    setScreen("chat");
  }, [conversations]);

  /* ── History: pin / rename / delete ─────────────────────────────────── */
  const handleHistoryMenuAction = useCallback((action, item, newName) => {
    setConversations((prev) => {
      switch (action) {
        case "pin":
          return prev.map((c) => c.id === item.conversation_id ? { ...c, pinned: true  } : c);
        case "unpin":
          return prev.map((c) => c.id === item.conversation_id ? { ...c, pinned: false } : c);
        case "rename":
          return prev.map((c) => c.id === item.conversation_id ? { ...c, name: newName } : c);
        case "delete":
          return prev.filter((c) => c.id !== item.conversation_id);
        default:
          return prev;
      }
    });
  }, []);

  /* ── Derived data ────────────────────────────────────────────────────── */
  const historyPanelData = useMemo(() => buildHistoryData(conversations), [conversations]);
  const conversationProp = useMemo(() => buildConversation(messages),     [messages]);
  const isOnLanding      = screen === "landing";
  const isOnConversation = screen === "chat";

  const customScreenJsx = useMemo(
    () => <ChatLandingContent onAsk={sendMessage} />,
    [sendMessage]
  );

  return (
    <ChatBotComponent
      isChatBotOpen={isOpen}
      setIsChatBotOpen={setIsOpen}
      onClose={() => setIsOpen(false)}
      userName="Karen M."
      /* ── Screen mode ────────────────────────────────────────────────── */
      isCustomScreen={isOnLanding}
      customScreenJsx={customScreenJsx}
      newChatScreen={false}
      /* ── Conversation ───────────────────────────────────────────────── */
      conversation={isOnConversation ? conversationProp : null}
      isAssistantThinking={isThinking}
      onSendIconClick={sendMessage}
      handleNewChatClick={handleNewChatClick}
      activeConversationId={activeConvId}
      /* ── History panel ──────────────────────────────────────────────── */
      showHistoryPanel={true}
      historyPanelData={historyPanelData}
      onHistorySelectConversation={handleSelectConversation}
      onHistoryToggleGroup={(name, isOpen) =>
        setHistoryOpenGroups((prev) => ({ ...prev, [name]: isOpen }))
      }
      historyOpenGroups={historyOpenGroups}
      onHistoryMenuAction={handleHistoryMenuAction}
      /* ── Suggested questions in bookmark panel ──────────────────────── */
      preDefinedQuestions={PRE_DEFINED_QUESTIONS}
      /* ── Config ─────────────────────────────────────────────────────── */
      hideMenuArrow
      footerText="AI-generated responses are illustrative — verify with source data before acting"
      suggestionBanner={{
        freeTextHeading: "Add more context:",
        freeTextContent: "The agent works best with specific details — e.g. store IDs, cluster names, or SKU codes.",
      }}
    />
  );
}
