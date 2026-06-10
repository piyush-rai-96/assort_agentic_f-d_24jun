/*
 * agentActivity.js — static seed data for AgentRail and AgentChatBot.
 * Mirrors the live pipeline state for FW 2025 / Floor & Decor Assortment.
 */

export const AGENT_KPIS = {
  confidence:      87,
  overrideRate:    12,
  storesSubmitted: 18,
  storesTotal:     70,
  pipelinePct:     63,
  activeSignals:    4,
};

export const AGENT_SIGNALS = [
  { id: 1,  severity: "error",   icon: "🚨", title: "8 stores not started",         body: "Gulf cluster stores have not submitted curation. Window auto-closes Sep 20.",      time: "2h ago",   action: "Review stores",     mod: "store-curation" },
  { id: 2,  severity: "warning", icon: "⚠️", title: "Agent not run yet",             body: "Run the agent in Catalogue step to unlock velocity tiers and SKU recommendations.", time: "Today",    action: "Go to Catalogue",   mod: "catalogue"      },
  { id: 3,  severity: "warning", icon: "⏰", title: "Curation window closes in 9d",  body: "52 stores pending submission. Cluster review requires all stores before lock.",     time: "Today",    action: "Open curation",     mod: "store-curation" },
  { id: 4,  severity: "success", icon: "✅", title: "Regional review open",          body: "6 of 8 clusters have submitted. Awaiting Mid-Atlantic and Pacific South.",          time: "1h ago",   action: "View regional",     mod: "regional"       },
  { id: 5,  severity: "info",    icon: "📊", title: "7 intel signals available",     body: "2 competitor threats and 1 expansion opportunity detected in your trade areas.",     time: "3h ago",   action: "View intel",        mod: "intel"          },
  { id: 6,  severity: "violet",  icon: "🤖", title: "Agent flagged SOL-SEASHELL",    body: "Expansion opportunity: +12 stores show high demand signal based on LY comps.",     time: "5h ago",   action: "Review SKU",        mod: "catalogue"      },
];

export const PIPELINE_STEPS = [
  { id: 1, label: "Portfolio Build",   sub: "Completed Oct 2",            status: "done",    mod: "portfolio"     },
  { id: 2, label: "Forecast Receipt",  sub: "87% forecast confidence",    status: "done",    mod: "catalogue"     },
  { id: 3, label: "Catalogue",         sub: "Agent pending — run needed", status: "active",  mod: "catalogue"     },
  { id: 4, label: "National Core",     sub: "5 SKUs locked",              status: "partial", mod: "national"      },
  { id: 5, label: "Regional Review",   sub: "6/8 clusters submitted",     status: "partial", mod: "regional"      },
  { id: 6, label: "Store Curation",    sub: "18/70 submitted",            status: "active",  mod: "store-curation"},
  { id: 7, label: "MPI / NPI",         sub: "Waiting on curation",        status: "pending", mod: "mpi"           },
  { id: 8, label: "Oracle Export",     sub: "Final step",                 status: "pending", mod: "lead-time"     },
];

export const AUDIT_LOG = [
  { id: 1,  severity: "success", icon: "✅", text: "107 Almeda submitted curation",               time: "2m ago"  },
  { id: 2,  severity: "violet",  icon: "🤖", text: "Agent flagged SOL-SEASHELL for expansion",    time: "18m ago" },
  { id: 3,  severity: "info",    icon: "📊", text: "Forecast received for AQG-WARMOAK",           time: "1h ago"  },
  { id: 4,  severity: "success", icon: "🔒", text: "National Core locked · 5 SKUs approved",      time: "2h ago"  },
  { id: 5,  severity: "warning", icon: "📍", text: "286 West Hartford — 3 store picks added",     time: "3h ago"  },
  { id: 6,  severity: "error",   icon: "⚠️", text: "POR-TRAVERT: lead time extended to 20wk",    time: "4h ago"  },
  { id: 7,  severity: "info",    icon: "📈", text: "Hindsight published · FW24 Wood +8% vs plan", time: "6h ago"  },
  { id: 8,  severity: "success", icon: "🏪", text: "Cluster CR-018 promoted to live",             time: "Yesterday"},
];

export const SUGGESTED_QUESTIONS = [
  {
    category: "Clusters",
    icon: "🗂",
    questions: [
      "What is the current active cluster set?",
      "Which cluster has the highest cohesion?",
      "How many stores are in each cluster?",
    ],
  },
  {
    category: "Curation",
    icon: "🏪",
    questions: [
      "Which stores haven't submitted curation yet?",
      "What is the curation window deadline?",
      "Show me the Gulf cluster stores",
    ],
  },
  {
    category: "SKUs & Catalogue",
    icon: "📦",
    questions: [
      "Which SKUs are flagged for expansion?",
      "What is the current forecast confidence?",
      "Show me the Core SKU list",
    ],
  },
  {
    category: "Performance",
    icon: "📊",
    questions: [
      "What is the pipeline completion percentage?",
      "Which regions are behind on review?",
      "Show market intel signals",
    ],
  },
];

/* Keyword-based bot response library */
export const BOT_RESPONSES = {
  cluster: `The current active cluster set is **CR-018** (k-means · k=5), promoted on Jan 12, 2026 by D. Rivera.

• **Pro-Heavy South** — 18 stores · cohesion 0.84 ✅
• **DIY-Heavy West** — 15 stores · cohesion 0.78
• **DIY-Heavy South** — 16 stores · cohesion 0.81 ✅
• **Mixed Urban East** — 13 stores · cohesion 0.76
• **Pro-Heavy Midwest** — 8 stores · cohesion 0.79

Average cohesion: **0.80** — above the healthy threshold of 0.75. Next quarterly re-run is scheduled for **Apr 12, 2026**.`,

  cohesion: `Cohesion scores for CR-018:

| Cluster | Cohesion | Status |
|---------|----------|--------|
| Pro-Heavy South | 0.84 | ✅ Healthy |
| DIY-Heavy South | 0.81 | ✅ Healthy |
| Pro-Heavy Midwest | 0.79 | ✅ Healthy |
| DIY-Heavy West | 0.78 | ✅ Healthy |
| Mixed Urban East | 0.76 | ✅ Healthy |

All 5 clusters are above the 0.75 healthy threshold. The network average is **0.80**.`,

  store: `The network has **70 stores** across 5 behavioral clusters in CR-018.

**Submission status:** 18/70 stores have completed curation (26%).
**8 stores** in the Gulf cluster have not started — curation window closes **Sep 20**.

Top performing stores by velocity:
• Austin Central (TX) — Velocity A · Pro split 75%
• Dallas Uptown (TX) — Velocity A · Pro split 70%
• Chicago South Loop (IL) — Velocity A · Pro split 68%`,

  sku: `The active catalogue contains **35 SKUs**.

• **Core / BG tagged:** 5 SKUs (National Core locked)
• **Agent recommendation:** SOL-SEASHELL flagged for expansion (+12 stores showing demand)
• **Lead time risk:** POR-TRAVERT extended to 20 weeks

Forecast confidence: **87%** · AQG-WARMOAK forecast received today.`,

  forecast: `Forecast status for FW 2025:

• **Overall confidence:** 87%
• **AQG-WARMOAK:** Forecast received today ✅
• **Pipeline stage:** Catalogue step (agent pending)

The agent has not yet run in the Catalogue step. Running the agent will unlock velocity tier recommendations and SKU-level guidance. Recommend running before the curation deadline.`,

  curation: `Store curation status:

• **Submitted:** 18 / 70 stores (26%)
• **Curation window:** Closes in **9 days**
• **Not started:** 8 stores in Gulf cluster ⚠️
• **Pending:** ~52 stores remaining

Gulf cluster stores at risk: Austin Central, Dallas Uptown, Houston South, San Antonio Pro, and 4 others. Auto-close is set for **Sep 20** — stores not submitted by then will receive agent defaults.`,

  national: `National Core status:

• **Locked SKUs:** 5 (National Core approved)
• **Status:** ✅ Core locked and downstream

The 5 Core SKUs have been approved and the National Core lock is active. Regional and store-level picks are now open on top of the Core base. No further changes to Core are allowed without VP approval.`,

  regional: `Regional review status:

• **Submitted:** 6 of 8 clusters
• **Pending:** Mid-Atlantic (GA) and Pacific South (CA)
• **Status:** Review open · lock date TBD

Pro-Heavy South and DIY-Heavy clusters have submitted. Awaiting C2 (DIY-Heavy West) and C4 (Mixed Urban East) leads to finalize their regional recommendations.`,

  intel: `Market intelligence — 7 signals active:

**Competitor threats (2):**
1. Flooring competitor launching expanded tile line in Southeast — 12 stores at risk
2. Big-box retailer running LVP promotion through Oct — DIY-Heavy stores impacted

**Opportunity (1):**
• Natural stone demand up 18% YoY in Pacific South — recommend expanding C4 stone SKUs

**Trends (4):** Indoor ceramic +6%, LVP slowing in Mountain region, grout accessories outperforming, heated floor tiles emerging in Northeast.`,

  pipeline: `FW 2025 pipeline progress — **63% complete**:

| Step | Status |
|------|--------|
| Portfolio Build | ✅ Done |
| Forecast Receipt | ✅ Done |
| Catalogue | ▶ Active (agent pending) |
| National Core | ◑ Partial (5 SKUs locked) |
| Regional Review | ◑ Partial (6/8 clusters) |
| Store Curation | ▶ Active (18/70 done) |
| MPI / NPI | ⏳ Pending |
| Oracle Export | ⏳ Pending |

Critical path: Run the agent in Catalogue, then complete store curation before the window closes.`,

  default: `I'm the **FD Assortment Intelligence Agent** for FW 2025.

I can help you with:
• 🗂 **Cluster analysis** — active set, cohesion, store assignments
• 🏪 **Store curation** — submission status, deadlines, outliers
• 📦 **SKU & catalogue** — agent recommendations, forecast data
• 📊 **Performance** — pipeline progress, regional status, market intel

What would you like to explore? You can ask in plain English.`,
};
