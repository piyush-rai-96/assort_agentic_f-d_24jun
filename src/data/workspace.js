/*
 * My Workspace — seed data for SS 2026 assortment plans.
 *
 * Mirrors the V3 PLANS[] and PIPE_STAGES_WS[] structures.
 * Modes: "gated" (merchant reviews each stage) | "autonomous" (agent auto-chains)
 */

export const PIPE_STAGES = [
  { id: "hindsight",       label: "Hindsight",        mod: "hindsight" },
  { id: "forecast",        label: "Forecast",         mod: "forecast" },
  { id: "catalogue",       label: "Catalogue",        mod: "catalogue" },
  { id: "national",        label: "National Core",    mod: "national" },
  { id: "regional",        label: "Regional Review",  mod: "regional" },
  { id: "curation",        label: "Store Curation",   mod: "store-curation" },
  { id: "mpi",             label: "MPI / NPI",        mod: "mpi" },
  { id: "oracle",          label: "Oracle",           mod: "oracle" },
  { id: "approval",        label: "Final Approval",   mod: "approval" },
];

// Status style map
export const PLAN_STATUS = {
  draft:       { label: "Draft",       color: "#7a9a7a", bg: "#f2f6ee" },
  "in-progress": { label: "In Progress", color: "#2563eb", bg: "#eff6ff" },
  review:      { label: "In Review",   color: "#d97706", bg: "#fffbeb" },
  approved:    { label: "Approved",    color: "#059669", bg: "#ecfdf5" },
};

// Pipeline mode badge
export const PLAN_MODE = {
  gated:      { label: "Gated",      color: "#6d28d9", bg: "#f5f3ff" },
  autonomous: { label: "Autonomous", color: "#0b7a6c", bg: "#e6f7f4" },
};

export const PLANS = [
  {
    id: "p1",
    name: "SS 2026 Tile & Ceramic",
    dept: "Tile",
    season: "SS 2026",
    status: "in-progress",
    mode: "gated",
    confidenceThreshold: 75,
    activeStage: "catalogue",
    stagesCompleted: ["hindsight", "forecast"],
    clustIds: ["B1", "B2", "B3", "B4"],
    plrId: "plr-ss26-q2",
    kpis: { stores: 70, skus: 22, coreCount: 8, submittedPct: 26 },
    notes: "Focus on large-format porcelain and zellige expansion. Block POR-TRAVERT pending lead time resolution.",
    createdBy: "Karen M.",
    createdAt: "Mar 12, 2026",
    updatedAt: "Jun 9, 2026",
  },
  {
    id: "p2",
    name: "SS 2026 Wood & LVP",
    dept: "Wood / LVP",
    season: "SS 2026",
    status: "draft",
    mode: "autonomous",
    confidenceThreshold: 80,
    activeStage: "hindsight",
    stagesCompleted: [],
    clustIds: ["B1", "B2"],
    plrId: "plr-ss26-q2",
    kpis: { stores: 70, skus: 13, coreCount: 3, submittedPct: 0 },
    notes: "Draft — pending Barnwood Oak QA resolution before running agent.",
    createdBy: "Karen M.",
    createdAt: "Apr 2, 2026",
    updatedAt: "Jun 1, 2026",
  },
  {
    id: "p3",
    name: "SS 2026 Laminate & Vinyl",
    dept: "Laminate & Vinyl",
    season: "SS 2026",
    status: "review",
    mode: "autonomous",
    confidenceThreshold: 70,
    activeStage: "regional",
    stagesCompleted: ["hindsight", "forecast", "catalogue", "national"],
    clustIds: ["B1", "B2", "B3"],
    plrId: "plr-ss26-q3",
    kpis: { stores: 70, skus: 18, coreCount: 5, submittedPct: 64 },
    notes: "In regional review — 6 of 8 clusters submitted. Awaiting Mid-Atlantic and Pacific South.",
    createdBy: "Jason R.",
    createdAt: "Feb 14, 2026",
    updatedAt: "Jun 10, 2026",
  },
];

export const PLR_PERIODS = [
  { id: "plr-ss26-q2", dept: "All",  season: "SS 2026 – Q2", weeks: "Wk 14–26", due: "Jun 27 2026", status: "active" },
  { id: "plr-ss26-q3", dept: "All",  season: "SS 2026 – Q3", weeks: "Wk 27–39", due: "Sep 12 2026", status: "draft"  },
  { id: "plr-fw25-q4", dept: "Tile", season: "FW 2025 – Q4", weeks: "Wk 40–52", due: "Oct 3 2025",  status: "active" },
];

export const DEPT_OPTIONS = [
  "All",
  "Tile",
  "Wood / LVP",
  "Laminate & Vinyl",
  "Natural Stone",
  "Accessories",
];

export const CLUSTERING_SCENARIOS = [
  { id: "cr-018", label: "CR-018 (Active) — k-means k=5", default: true },
  { id: "cr-017", label: "CR-017 — k-means k=4" },
  { id: "cr-019", label: "CR-019 — Hierarchical k=5" },
];

export const CONTEXT_CHIPS = [
  "Prioritise Core SKUs for locked assortment",
  "Flag supply-constrained SKUs from Market Intel",
  "Use SS 2025 LY actuals as forecast baseline",
  "Include limewash tile expansion signal",
  "Apply Gulf Coast competitive gap opportunity",
];
