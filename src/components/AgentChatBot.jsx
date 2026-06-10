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
import { ChatBotComponent } from "impact-ui";
import {
  AGENT_SIGNALS, SUGGESTED_QUESTIONS, AGENT_KPIS,
} from "../data/agentActivity.js";
import { ACTIVE_CLUSTER_SET } from "../data/clustering.js";

/* ─── Design tokens (inline — ChatBotComponent renders in its own DOM island) */
const C = {
  green:  "#2d6a2d", greenSoft: "#edfaed", greenMid: "#1e5020",
  teal:   "#0b7a6c", tealSoft: "#e6f7f4",
  blue:   "#2563eb", blueSoft: "#eff6ff",
  amber:  "#d97706", amberSoft: "#fffbeb",
  red:    "#dc2626", redSoft: "#fef2f2",
  violet: "#6d28d9", violetSoft: "#f5f3ff",
  mint:   "#059669", mintSoft: "#ecfdf5",
  border: "#c8dcbc", borderStrong: "#b4c8a0",
  bg:     "#f2f6ee", bgSunken: "#eaeee4",
  text:   "#0a1a0a", textMuted: "#456845", textSubtle: "#7a9a7a",
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
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.textSubtle, marginBottom: 6 }}>{children}</div>
);
const MetricRow = ({ label, value, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
    <span style={{ fontSize: 12, color: C.textMuted }}>{label}</span>
    <span style={{ fontSize: 12, fontWeight: 700, color: color || C.text }}>{value}</span>
  </div>
);
const ActionChip = ({ label, onClick }) => (
  <button onClick={onClick} style={{ padding: "4px 12px", borderRadius: 14, fontSize: 11, fontWeight: 700, cursor: "pointer", border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, whiteSpace: "nowrap" }}>
    {label}
  </button>
);
const PrimaryAction = ({ label, onClick }) => (
  <button onClick={onClick} style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none", background: C.green, color: "white" }}>
    {label}
  </button>
);
const CohesionBar = ({ value }) => {
  const clr = value >= 0.8 ? C.mint : value >= 0.7 ? C.amber : C.red;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, background: "#eaefde", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${value * 100}%`, height: "100%", background: clr, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: clr, minWidth: 28 }}>{value.toFixed(2)}</span>
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
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13, color: C.text }}>
      <div style={{ background: C.greenSoft, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: C.greenMid }}>📍 Active: {runId}</span>
          <span style={{ fontSize: 10, fontWeight: 700, background: C.mint, color: "white", padding: "2px 8px", borderRadius: 10 }}>Live</span>
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>{method} · Avg cohesion {cohesion}</div>
      </div>

      <SectionLabel>5 clusters — all healthy ✅</SectionLabel>
      {clusters?.map((c) => (
        <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: c.color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontWeight: 600, fontSize: 12 }}>{c.name}</span>
          <span style={{ fontSize: 11, color: C.textSubtle }}>{c.stores} stores</span>
          <div style={{ width: 80 }}><CohesionBar value={c.cohesion} /></div>
        </div>
      ))}

      <Divider />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
        <PrimaryAction label="View cluster detail →" onClick={() => onAsk("Show me the Pro-Heavy South cluster details")} />
      </div>
      <FollowUps questions={["Which cluster has the highest cohesion?", "Run a new cluster analysis", "Which stores are in each cluster?"]} onAsk={onAsk} />
    </div>
  );
}

/* ── Cohesion response ────────────────────────────────────────────────────  */
function buildCohesionJsx(onAsk) {
  const { clusters } = ACTIVE_CLUSTER_SET || {};
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13, color: C.text }}>
      <SectionLabel>Cohesion scores — CR-018</SectionLabel>
      {clusters?.map((c) => (
        <div key={c.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 8, alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span>
          <div style={{ width: 100 }}><CohesionBar value={c.cohesion} /></div>
        </div>
      ))}
      <div style={{ background: C.mintSoft, borderRadius: 8, padding: "8px 12px", marginTop: 10, fontSize: 12, color: C.mint, fontWeight: 600 }}>
        ✅ All 5 clusters above healthy threshold of 0.75. Network average: <strong>0.80</strong>.
      </div>
      <FollowUps questions={["What drives Pro-Heavy South's high cohesion?", "Which attributes contribute most?", "When is the next re-run?"]} onAsk={onAsk} />
    </div>
  );
}

/* ── Curation response ────────────────────────────────────────────────────  */
function buildCurationJsx(onAsk) {
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13, color: C.text }}>
      <div style={{ background: C.amberSoft, border: `1px solid ${C.amber}`, borderLeft: `3px solid ${C.amber}`, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ fontWeight: 800, color: C.amber }}>⚠️ Action required — 8 stores not started</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Curation window closes in <strong>9 days</strong>. Auto-close: Sep 20.</div>
      </div>

      <SectionLabel>Submission status</SectionLabel>
      <MetricRow label="Submitted" value={`${AGENT_KPIS.storesSubmitted} / ${AGENT_KPIS.storesTotal} stores`} color={C.mint} />
      <MetricRow label="Not started" value="8 stores (Gulf cluster)" color={C.red} />
      <MetricRow label="Days remaining" value="9 days" color={C.amber} />
      <MetricRow label="Completion" value={`${Math.round((AGENT_KPIS.storesSubmitted / AGENT_KPIS.storesTotal) * 100)}%`} color={C.blue} />

      <Divider />
      <div style={{ background: C.bg, borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
        <strong>Gulf cluster stores at risk:</strong> Austin Central, Dallas Uptown, Houston South, San Antonio Pro + 4 others. These will receive agent defaults if not submitted.
      </div>

      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <PrimaryAction label="Open store curation →" onClick={() => onAsk("Which specific stores need curation attention?")} />
      </div>
      <FollowUps questions={["Show me Gulf cluster stores", "What happens if they miss the deadline?", "Which stores submitted last?"]} onAsk={onAsk} />
    </div>
  );
}

/* ── SKU / Catalogue response ─────────────────────────────────────────────  */
function buildSkuJsx(onAsk) {
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13, color: C.text }}>
      <div style={{ background: C.greenSoft, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: C.greenMid }}>📦 Catalogue: 35 SKUs · FW 2025</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Forecast confidence: <strong style={{ color: C.mint }}>{AGENT_KPIS.confidence}%</strong></div>
      </div>

      <SectionLabel>Agent recommendations</SectionLabel>
      <div style={{ background: C.violetSoft, borderLeft: `3px solid ${C.violet}`, borderRadius: 6, padding: "8px 12px", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.violet }}>🤖 SOL-SEASHELL — Expansion opportunity</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>+12 stores showing high demand based on LY comps. Recommend adding to 3 new clusters.</div>
      </div>
      <div style={{ background: C.redSoft, borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.red }}>⚠️ POR-TRAVERT — Lead time risk</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Lead time extended to 20 weeks. Consider back-up sourcing for Q2 replenishment.</div>
      </div>

      <SectionLabel>Core status</SectionLabel>
      <MetricRow label="Core / BG tagged" value="5 SKUs" color={C.green} />
      <MetricRow label="National Core lock" value="✅ Active" color={C.mint} />
      <MetricRow label="AQG-WARMOAK" value="Forecast received ✅" color={C.teal} />

      <FollowUps questions={["Show all Core SKUs", "Why is SOL-SEASHELL flagged?", "What is POR-TRAVERT's impact?"]} onAsk={onAsk} />
    </div>
  );
}

/* ── Pipeline response ────────────────────────────────────────────────────  */
function buildPipelineJsx(onAsk) {
  const steps = [
    { label: "Portfolio Build",  status: "done",    pct: 100, detail: "Completed Oct 2" },
    { label: "Forecast",         status: "done",    pct: 100, detail: "87% confidence" },
    { label: "Catalogue",        status: "active",  pct:  45, detail: "Agent pending ⚡" },
    { label: "National Core",    status: "partial", pct:  70, detail: "5 SKUs locked" },
    { label: "Regional Review",  status: "partial", pct:  75, detail: "6/8 clusters" },
    { label: "Store Curation",   status: "active",  pct:  26, detail: "18/70 stores" },
    { label: "MPI / NPI",        status: "pending", pct:   0, detail: "Waiting" },
    { label: "Oracle Export",    status: "pending", pct:   0, detail: "Final step" },
  ];
  const statusColor = { done: C.mint, active: C.blue, partial: C.amber, pending: C.textSubtle };
  const statusIcon  = { done: "✅", active: "▶", partial: "◑", pending: "○" };

  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13, color: C.text }}>
      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>FW 2025 Pipeline</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: C.green }}>{AGENT_KPIS.pipelinePct}%</span>
        </div>
        <div style={{ height: 7, background: "#d8e4c4", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${AGENT_KPIS.pipelinePct}%`, height: "100%", background: `linear-gradient(90deg, ${C.green}, ${C.teal})`, borderRadius: 4 }} />
        </div>
      </div>

      {steps.map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 13 }}>{statusIcon[s.status]}</span>
          <span style={{ flex: 1, fontSize: 12, fontWeight: s.status !== "pending" ? 600 : 400 }}>{s.label}</span>
          <span style={{ fontSize: 11, color: statusColor[s.status], fontWeight: 700 }}>{s.detail}</span>
        </div>
      ))}

      <div style={{ background: C.blueSoft, borderRadius: 8, padding: "8px 12px", marginTop: 10, fontSize: 12 }}>
        <strong style={{ color: C.blue }}>Critical path:</strong> Run the Catalogue agent → complete store curation before Sep 20 deadline.
      </div>
      <FollowUps questions={["What's blocking the Catalogue step?", "How many stores are pending curation?", "When is the Oracle export deadline?"]} onAsk={onAsk} />
    </div>
  );
}

/* ── Market Intel response ────────────────────────────────────────────────  */
function buildIntelJsx(onAsk) {
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13, color: C.text }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[{ label: "7", sub: "Total signals", color: C.blue }, { label: "2", sub: "Threats", color: C.red }, { label: "1", sub: "Opportunity", color: C.mint }].map((k) => (
          <div key={k.sub} style={{ flex: "1 1 80px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.label}</div>
            <div style={{ fontSize: 10, color: C.textSubtle, fontWeight: 700, marginTop: 3 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <SectionLabel>Competitor threats</SectionLabel>
      <div style={{ background: C.redSoft, borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>Flooring competitor — Southeast expansion</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>New tile line launching — 12 of your stores at direct risk. Consider assortment depth review in C3 stores.</div>
      </div>
      <div style={{ background: C.redSoft, borderLeft: `3px solid ${C.red}`, borderRadius: 6, padding: "8px 12px", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 12 }}>Big-box LVP promotion through Oct</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Price competition in DIY-Heavy clusters. 15 stores may see traffic shift.</div>
      </div>

      <SectionLabel>Opportunity</SectionLabel>
      <div style={{ background: C.mintSoft, borderLeft: `3px solid ${C.mint}`, borderRadius: 6, padding: "8px 12px" }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.mint }}>Natural stone demand +18% YoY — Pacific South</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>C4 Mixed Urban East stores: recommend expanding stone SKUs before next assortment lock.</div>
      </div>

      <FollowUps questions={["Which stores are most exposed to the competitor threat?", "How should we respond in C3?", "What stone SKUs should we add?"]} onAsk={onAsk} />
    </div>
  );
}

/* ── Generic / default response ───────────────────────────────────────────  */
function buildDefaultJsx(question, onAsk) {
  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", fontSize: 13, color: C.text }}>
      <div style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 10, fontSize: 12 }}>
        I'm the <strong>FD Assortment Intelligence Agent</strong> for FW 2025. I can analyse clusters, curation status, SKU recommendations, pipeline progress, and market intelligence.
      </div>
      <SectionLabel>Quick status — FW 2025</SectionLabel>
      <MetricRow label="Pipeline progress" value={`${AGENT_KPIS.pipelinePct}%`} color={C.green} />
      <MetricRow label="Forecast confidence" value={`${AGENT_KPIS.confidence}%`} color={C.mint} />
      <MetricRow label="Stores submitted" value={`${AGENT_KPIS.storesSubmitted}/${AGENT_KPIS.storesTotal}`} color={C.blue} />
      <MetricRow label="Active signals" value={`${AGENT_KPIS.activeSignals} requiring action`} color={C.amber} />
      <FollowUps questions={["What needs my attention today?", "Show pipeline status", "What is the active cluster set?"]} onAsk={onAsk} />
    </div>
  );
}

/* ── Build thinking header for each question type ─────────────────────────  */
const THINKING_HEADERS = {
  cluster:   { thinkingHeading: "🧠  Analysing cluster data…",      thinkingContent: "Checked CR-018 · k-means parameters · cohesion scores · 5 cluster assignments across 70 stores" },
  cohesion:  { thinkingHeading: "🧠  Computing cohesion metrics…",   thinkingContent: "Calculated within-cluster variance · compared to 0.75 healthy threshold · ranked all 5 clusters" },
  curation:  { thinkingHeading: "🧠  Checking curation status…",     thinkingContent: "Queried 70-store submission log · identified 8 not-started in Gulf cluster · checked window deadline" },
  sku:       { thinkingHeading: "🧠  Scanning SKU data…",            thinkingContent: "Reviewed 35 active SKUs · cross-referenced agent signals · checked forecast confidence and lead times" },
  pipeline:  { thinkingHeading: "🧠  Loading pipeline state…",       thinkingContent: "Fetched FW2025 phase status · calculated 63% completion · identified critical path blockers" },
  intel:     { thinkingHeading: "🧠  Pulling market intelligence…",  thinkingContent: "Scanned 7 active signals · analysed 2 competitor threats and 1 expansion opportunity" },
  default:   { thinkingHeading: "🧠  Thinking…",                     thinkingContent: "Reviewing FW2025 assortment state across clusters, curation, SKUs, and market signals" },
};

/* ─── Resolve JSX response + thinking header from question text ───────────  */
function resolveJsxResponse(text, onAsk) {
  const q = text.toLowerCase();
  if (q.includes("cohesion"))                                  return { jsx: buildCohesionJsx(onAsk),  thinking: THINKING_HEADERS.cohesion  };
  if (q.includes("cluster"))                                   return { jsx: buildClusterJsx(onAsk),   thinking: THINKING_HEADERS.cluster   };
  if (q.includes("store") || q.includes("curation"))           return { jsx: buildCurationJsx(onAsk),  thinking: THINKING_HEADERS.curation  };
  if (q.includes("sku") || q.includes("catalogue") || q.includes("catalog") || q.includes("forecast")) return { jsx: buildSkuJsx(onAsk), thinking: THINKING_HEADERS.sku };
  if (q.includes("pipeline") || q.includes("pipeline") || q.includes("progress") || q.includes("step")) return { jsx: buildPipelineJsx(onAsk), thinking: THINKING_HEADERS.pipeline };
  if (q.includes("intel") || q.includes("competitor") || q.includes("signal") || q.includes("market")) return { jsx: buildIntelJsx(onAsk), thinking: THINKING_HEADERS.intel };
  return { jsx: buildDefaultJsx(text, onAsk), thinking: THINKING_HEADERS.default };
}

/* ══════════════════════════════════════════════════════════════════════════
   LANDING PAGE JSX — passed as customScreenJsx
   ══════════════════════════════════════════════════════════════════════════ */
function ChatLandingContent({ onAsk }) {
  const urgentSignals = AGENT_SIGNALS.filter((s) => s.severity === "error" || s.severity === "warning").slice(0, 3);

  return (
    <div style={{ fontFamily: "Manrope, system-ui, sans-serif", padding: "4px 2px 8px", overflowY: "auto", maxHeight: "calc(100% - 20px)" }}>

      {/* ── Agent branding ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg, ${C.green}, ${C.teal})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.greenMid }}>FD Assortment Agent</div>
          <div style={{ fontSize: 11, color: C.textSubtle }}>FW 2025 · 70 stores · {AGENT_KPIS.pipelinePct}% pipeline complete</div>
        </div>
        <div style={{ marginLeft: "auto", background: C.mintSoft, border: `1px solid ${C.mint}`, borderRadius: 8, padding: "4px 10px", fontSize: 10, fontWeight: 700, color: C.mint }}>
          ● Active
        </div>
      </div>

      {/* ── Quick KPI strip ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { v: `${AGENT_KPIS.confidence}%`,    l: "Confidence",  c: C.green  },
          { v: `${AGENT_KPIS.pipelinePct}%`,   l: "Pipeline",    c: C.blue   },
          { v: `${AGENT_KPIS.storesSubmitted}/${AGENT_KPIS.storesTotal}`, l: "Curated", c: C.teal },
        ].map((k) => (
          <div key={k.l} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: k.c, lineHeight: 1 }}>{k.v}</div>
            <div style={{ fontSize: 9, color: C.textSubtle, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginTop: 3 }}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* ── Active signals ── */}
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.textSubtle, marginBottom: 8 }}>Active signals</div>
      {urgentSignals.map((sig) => {
        const s = SEV[sig.severity] || SEV.info;
        return (
          <button key={sig.id} onClick={() => onAsk(sig.title)}
            style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", marginBottom: 6, background: s.bg, border: `1px solid ${s.border}`, borderLeft: `3px solid ${s.dot}`, borderRadius: 8, cursor: "pointer", textAlign: "left" }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{sig.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{sig.title}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sig.body}</div>
            </div>
            <span style={{ fontSize: 10, color: C.textSubtle, flexShrink: 0, marginTop: 2 }}>{sig.time}</span>
          </button>
        );
      })}

      {/* ── Question categories ── */}
      {SUGGESTED_QUESTIONS.map((cat) => (
        <div key={cat.category} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: C.textSubtle, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
            <span>{cat.icon}</span>{cat.category}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {cat.questions.map((q, i) => (
              <button key={i} onClick={() => onAsk(q)}
                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg, color: C.textMuted, fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", transition: "background 0.1s" }}
                onMouseOver={(e) => { e.currentTarget.style.background = C.greenSoft; e.currentTarget.style.borderColor = C.green; e.currentTarget.style.color = C.green; }}
                onMouseOut={(e) => { e.currentTarget.style.background = C.bg; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textMuted; }}>
                {q}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════════ */
export default function AgentChatBot({ isOpen, setIsOpen, initialMessage }) {
  const [messages,       setMessages]      = useState([]);
  const [isThinking,     setIsThinking]    = useState(false);
  const [isCustomScreen, setIsCustomScreen]= useState(true);
  const thinkingRef = useRef(null);

  /* Core send function — shared by landing chips + conversation input */
  const sendMessage = useCallback((msgOrText) => {
    /* chatInput passes an object { text, role, ... }, question chips pass a string */
    const text = typeof msgOrText === "string" ? msgOrText : msgOrText?.text;
    if (!text?.trim()) return;

    setIsCustomScreen(false);
    setIsThinking(true);

    const userMsg = { role: "user", text: text.trim(), timestamp: nowStamp() };
    setMessages((prev) => [...prev, userMsg]);

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
      setMessages((prev) => [...prev, botMsg]);
      setIsThinking(false);
    }, delay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Auto-trigger initial message when opened from AgentRail */
  useEffect(() => {
    if (isOpen && initialMessage) {
      const t = setTimeout(() => sendMessage(initialMessage), 150);
      return () => clearTimeout(t);
    }
  }, [isOpen, initialMessage]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Reset state on close */
  useEffect(() => {
    if (!isOpen) {
      if (thinkingRef.current) clearTimeout(thinkingRef.current);
      const t = setTimeout(() => {
        setMessages([]);
        setIsCustomScreen(true);
        setIsThinking(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => () => { if (thinkingRef.current) clearTimeout(thinkingRef.current); }, []);

  /* New chat handler — return to landing */
  const handleNewChatClick = useCallback(() => {
    if (thinkingRef.current) clearTimeout(thinkingRef.current);
    setMessages([]);
    setIsCustomScreen(true);
    setIsThinking(false);
    return { isInitialClickPresent: false };
  }, []);

  /* Build the landing page JSX — memoised so sendMessage ref stays stable */
  const customScreenJsx = useMemo(
    () => <ChatLandingContent onAsk={sendMessage} />,
    [sendMessage]
  );

  const conversationProp = useMemo(() => buildConversation(messages), [messages]);

  return (
    <ChatBotComponent
      isChatBotOpen={isOpen}
      setIsChatBotOpen={setIsOpen}
      onClose={() => setIsOpen(false)}
      userName="Karen M."
      /* Landing vs conversation mode */
      isCustomScreen={isCustomScreen}
      customScreenJsx={customScreenJsx}
      newChatScreen={false}
      /* Conversation data */
      conversation={conversationProp}
      isAssistantThinking={isThinking}
      onSendIconClick={sendMessage}
      handleNewChatClick={handleNewChatClick}
      /* Config */
      showHistoryPanel={false}
      hideMenuArrow
      footerText="AI-generated responses are illustrative — verify with source data before acting"
      suggestionBanner={{
        freeTextHeading: "Add more context:",
        freeTextContent: "The agent works best with specific details — e.g. store IDs, cluster names, or SKU codes.",
      }}
    />
  );
}
