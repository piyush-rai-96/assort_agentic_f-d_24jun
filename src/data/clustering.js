/*
 * Location Clustering data — ported from FD_CLUST_SCENARIOS / FD_OUTLIER_STORES
 * and renderAdminClustering() in the legacy fd-assortment-v4-2.html.
 *
 * Three clustering scenarios (Geographic / Behavioral / DC-based), each a set
 * of clusters referencing FD_STORES by id, plus flagged outlier stores.
 *
 * Also includes Cluster Run management data: active cluster set, run history,
 * attributes library, and wizard configuration.
 */
import { FD_STORES } from "./stores.js";
import { color } from "../styles/tokens.js";

export const FD_CLUST_SCENARIOS = {
  A: {
    id: "A", name: "Scenario A — Geographic (current state)", badge: "Current",
    composite: 74, statScore: 71, bizScore: 76,
    note: "Simple and familiar — but misses behavioral differences within regions.",
    clusters: [
      { id: "A1", label: "Mid-South & Gulf (TX)", color: "#D97706", stores: [104, 131, 240, 107, 376], tier: "high", revSqft: 311, st: 61, signals: ["High pro-contractor demand", "Hot climate — LVP and tile mixed", "DC 991 operational group"] },
      { id: "A2", label: "Mid-Atlantic (GA)", color: "#059669", stores: [101, 160], tier: "high", revSqft: 341, st: 61, signals: ["Historic home renovation", "Premium tile and stone", "Subway tile mainstay"] },
      { id: "A3", label: "Florida", color: "#0891B2", stores: [152, 360, 173], tier: "mid", revSqft: 328, st: 62, signals: ["Luxury tile demand", "High humidity — LVP focus", "Coastal style"] },
      { id: "A4", label: "New England (CT/NH)", color: "#6366F1", stores: [286, 237], tier: "mid", revSqft: 286, st: 57, signals: ["Traditional hardwood", "Cold climate — indoor focus", "Renovation-led"] },
      { id: "A5", label: "Northeast (PA/NY/NJ)", color: "#2563EB", stores: [344, 184, 236], tier: "high", revSqft: 428, st: 69, signals: ["Urban density", "High contractor pro mix", "Small format tile"] },
      { id: "A6", label: "Rockies & Pacific NW", color: "#0E7490", stores: [205, 358, 341], tier: "mid", revSqft: 290, st: 59, signals: ["Stone and slate trending", "Mountain aesthetic", "Outdoor tile demand"] },
      { id: "A7", label: "Great Lakes & Midwest", color: "#7C3AED", stores: [294, 356], tier: "low", revSqft: 241, st: 53, signals: ["Value-led shoppers", "LVP dominant", "Low stone penetration"] },
      { id: "A8", label: "Pacific South (CA)", color: "#B45309", stores: [129], tier: "high", revSqft: 412, st: 68, signals: ["Luxury tile", "High-end stone", "Designer-led market"] },
    ],
  },
  B: {
    id: "B", name: "Scenario B — Behavioral ★", badge: "Recommended",
    composite: 91, statScore: 88, bizScore: 93,
    note: "Best balance of signal and manageability. Groups stores by how they actually sell — not just where they are.",
    clusters: [
      { id: "B1", label: "Pro-Heavy South",    color: "#2D6A2D", stores: [104, 107, 101, 184, 129], tier: "high", revSqft: 382, st: 71, signals: ["Velocity A across all regions", "High pro-contractor mix", "Top unit productivity per sqft"] },
      { id: "B2", label: "DIY-Heavy West",     color: "#0B7A6C", stores: [240, 160, 360, 286, 236, 205, 358, 356], tier: "mid", revSqft: 308, st: 62, signals: ["Velocity B", "Balanced DIY + Pro", "Renovation-led demand"] },
      { id: "B3", label: "Volume-Value South", color: "#D97706", stores: [131, 376, 173, 237, 344, 294], tier: "mid", revSqft: 271, st: 57, signals: ["Velocity C", "High DIY mix", "LVP and basics-driven"] },
      { id: "B4", label: "Developing Markets", color: "#DC2626", stores: [152, 341], tier: "low", revSqft: 256, st: 55, signals: ["Velocity D", "Low velocity — monitoring", "Candidate for format review"] },
    ],
  },
  C: {
    id: "C", name: "Scenario C — DC-based Operational", badge: "Operational",
    composite: 79, statScore: 82, bizScore: 76,
    note: "Useful for logistics and replenishment planning. Does not reflect selling behavior.",
    clusters: [
      { id: "C1", label: "DC 991 — Southwest TX", color: "#B45309", stores: [104, 131, 240, 107, 376], tier: "mid", revSqft: 311, st: 61, signals: ["Texas markets", "Hot climate mix", "Pro + DIY balanced"] },
      { id: "C2", label: "DC 990 — Southeast", color: "#059669", stores: [101, 160, 152, 360, 173], tier: "high", revSqft: 334, st: 63, signals: ["Georgia + Florida", "Mixed climate", "Stone and tile heavy"] },
      { id: "C3", label: "DC 994 — Northeast", color: "#2563EB", stores: [286, 237, 344, 184, 236, 294, 356], tier: "high", revSqft: 349, st: 64, signals: ["Largest DC group", "7 stores", "Broad geography"] },
      { id: "C4", label: "DC 995 — Mountain/NW", color: "#0891B2", stores: [205, 358, 341], tier: "mid", revSqft: 290, st: 59, signals: ["Rockies + Pacific NW", "Outdoor and natural materials"] },
      { id: "C5", label: "DC 992 — Pacific South", color: "#6D28D9", stores: [129], tier: "high", revSqft: 412, st: 68, signals: ["California", "Luxury tier", "Designer market"] },
    ],
  },
};

/*
 * CLUSTER_ACCEPTANCE — tracks which scenario (A/B/C) has been accepted as the
 * active cluster model. Set acceptedScenario to null to simulate the "no model
 * yet" state shown on the Today dashboard. Mirrors CLUST_S.acceptedScenario /
 * CLUST_S.acceptedScope in the legacy HTML prototype.
 */
export const CLUSTER_ACCEPTANCE = {
  acceptedScenario: "B",   // key into FD_CLUST_SCENARIOS, or null if not yet accepted
  acceptedScope: {
    dept: "All",
    channel: "All Stores",
    season: "FW 2025",
  },
};

export const FD_OUTLIER_STORES = [
  { id: 341, name: "341 Bremerton", reason: "Velocity D — low trading volume, only 2 seasons of full data", severity: "warn" },
  { id: 152, name: "152 Savannah", reason: "Velocity D — candidate for format review or cluster reassignment", severity: "warn" },
];

export const OUTLIER_OPTIONS = ["Include", "Exclude", "Monitor"];
export const STORE_COUNT = FD_STORES.length;

export const TIER_BADGE = { high: "success", mid: "warning", low: "error" };
export const VEL_COLOR = { A: color.success, B: color.teal, C: color.warning, D: color.error };
export const BAND_PCT = { A: "5%", B: "15%", C: "60%", D: "15%" };

/* Resolve a cluster's store-id list into full FD_STORES records (order preserved). */
export function clusterStores(cluster) {
  return cluster.stores.map((id) => FD_STORES.find((s) => s.id === id)).filter(Boolean);
}

/* The part of a scenario name after the em-dash (used as the tab tagline). */
export function scenarioTagline(name) {
  return name.split("—").slice(1).join("—").trim();
}

/* ── Cluster Run Management ──────────────────────────────────────────────── */

export const ACTIVE_CLUSTER_SET = {
  runId: "CR-018",
  name: "Network 5-cluster (k-means)",
  method: "k-means",
  attrNames: ["Pro / DIY mix", "Climate zone", "Sales velocity", "Category mix"],
  date: "2026-01-12",
  author: "D. Rivera",
  cohesion: 0.80,
  clusters: [
    { id: "C1", name: "Pro-Heavy South",   stores: 4, proAvg: 71, cohesion: 0.84, color: color.primary, dominantCats: ["Tile", "Installation Materials", "Stone"],  skus: 1124 },
    { id: "C2", name: "DIY-Heavy West",    stores: 4, proAvg: 29, cohesion: 0.78, color: color.teal,    dominantCats: ["LVP", "Laminate", "Tools"],                  skus: 986  },
    { id: "C3", name: "DIY-Heavy South",   stores: 4, proAvg: 32, cohesion: 0.81, color: color.info,    dominantCats: ["Tile", "Grout", "Accessories"],              skus: 1042 },
    { id: "C4", name: "Mixed Urban East",  stores: 4, proAvg: 51, cohesion: 0.76, color: color.accent,  dominantCats: ["Stone", "Mosaic", "Natural Stone"],          skus: 874  },
    { id: "C5", name: "Pro-Heavy Midwest", stores: 4, proAvg: 65, cohesion: 0.79, color: color.warning, dominantCats: ["Industrial", "Commercial Tile", "Install"],  skus: 756  },
  ],
};

export const CLUSTER_RUNS = [
  { id: "CR-018", name: "Network 5-cluster (k-means)", method: "k-means · k=5",   attrs: 4, stores: 21, status: "live",     date: "2026-01-12", author: "D. Rivera", cohesion: 0.80 },
  { id: "CR-017", name: "Network 4-cluster (k-means)", method: "k-means · k=4",   attrs: 4, stores: 21, status: "archived", date: "2025-10-08", author: "S. Patel",  cohesion: 0.74 },
  { id: "CR-016", name: "Regional behavioral run",     method: "k-means · k=6",   attrs: 5, stores: 21, status: "archived", date: "2025-07-15", author: "D. Rivera", cohesion: 0.77 },
  { id: "CR-015", name: "DC-aligned baseline",         method: "hierarchical",     attrs: 3, stores: 21, status: "archived", date: "2025-04-02", author: "T. Nguyen", cohesion: 0.68 },
];

export const CLUSTER_ATTRIBUTES = [
  { id: "pro_split",      name: "Pro / DIY mix",               group: "Customer",     desc: "Share of revenue from Pro contractor accounts",      recommended: true  },
  { id: "loyalty",        name: "Pro loyalty enrolment",        group: "Customer",     desc: "Pro loyalty program penetration rate",               recommended: false },
  { id: "sqft",           name: "Square footage",               group: "Format",       desc: "Total selling area in square feet",                  recommended: false },
  { id: "format",         name: "Store format",                 group: "Format",       desc: "Standard, Large, or Compact classification",         recommended: false },
  { id: "climate",        name: "Climate zone",                 group: "Geography",    desc: "Köppen climate classification for product mix",       recommended: true  },
  { id: "region",         name: "Region",                       group: "Geography",    desc: "Operational region assignment",                      recommended: false },
  { id: "permits",        name: "New-construction permits",     group: "Geography",    desc: "Local residential building permits index",            recommended: false },
  { id: "hhi",            name: "Median household income",      group: "Demographics", desc: "MSA-level median household income",                  recommended: false },
  { id: "pop",            name: "Catchment population",         group: "Demographics", desc: "Drive-time trade area population",                   recommended: false },
  { id: "sales_velocity", name: "Sales velocity",               group: "Performance",  desc: "Aggregate revenue velocity tier A–D",                recommended: true  },
  { id: "vol_tier",       name: "Volume tier",                  group: "Performance",  desc: "Store volume ranking within network",                recommended: false },
  { id: "cat_mix",        name: "Category mix index",           group: "Assortment",   desc: "Tile vs LVP vs Stone revenue balance",               recommended: true  },
];

export const WIZARD_DEFAULTS = {
  name: "SS26 Behavioral network run",
  notes: "",
  scope: "network",
  method: "kmeans",
  k: 5,
  attrs: ["pro_split", "climate", "sales_velocity", "cat_mix"],
  dept: "All",
  channel: "All Stores",
  season: "SS26",
  params: { performance: true, demographics: false, attributes: false },
};

export const SCOPE_OPTIONS = [
  { id: "network", label: "Entire network",    desc: `All ${FD_STORES.length} stores. Default for quarterly refresh.` },
  { id: "region",  label: "Single region",     desc: "Cluster within Southeast / Midwest / West only." },
  { id: "format",  label: "Format-only",       desc: "Compare Standard vs Large vs Compact in isolation." },
  { id: "custom",  label: "Custom store list", desc: "0 stores selected. Upload CSV or pick from list." },
];

export const METHOD_OPTIONS = [
  { id: "kmeans",   label: "k-means",              desc: "Hard partitioning, fast convergence",     badge: "Recommended", disabled: false },
  { id: "ward",     label: "Hierarchical (Ward)",   desc: "Tree-based, produces dendrogram",         badge: null,          disabled: false },
  { id: "dbscan",   label: "DBSCAN",                desc: "Density-based, identifies outliers",      badge: null,          disabled: false },
  { id: "gmm",      label: "Gaussian mixture",      desc: "Probabilistic soft assignment",           badge: "Stage 2",     disabled: true  },
];

export const RUN_STATUS_PHASES = [
  "Standardising features…",
  "Computing centroids…",
  "Assigning stores…",
  "Computing cohesion…",
  "Done",
];

/*
 * PREVIEW_CLUSTER_STORES — sample store-level records used for analytics and
 * store management inside the Cluster Run wizard (Step 3 done-state).
 *
 * Fields:
 *   id            — unique store key
 *   name          — display name
 *   state         — 2-char state code
 *   region        — operational region
 *   clusterId     — 'C1'–'C5' or null (unassigned / available to add)
 *   proSplit      — % revenue from Pro contractor accounts (0-100)
 *   sqftK         — selling area in thousands of sq ft
 *   velScore      — 1(A best)–4(D worst)
 *   cohesionContrib — store's contribution to cluster cohesion (null if unassigned)
 *   catTile       — % of sales in Tile category
 *   catLvp        — % of sales in LVP / Laminate category
 *   hhi           — median household income (USD)
 */
export const PREVIEW_CLUSTER_STORES = [
  /* ── C1: Pro-Heavy South ────── */
  { id:"PS101", name:"Austin Central",      state:"TX", region:"Southwest", clusterId:"C1", proSplit:75, sqftK:85, velScore:1, cohesionContrib:0.88, catTile:52, catLvp:28, hhi:71000 },
  { id:"PS102", name:"Dallas Uptown",       state:"TX", region:"Southwest", clusterId:"C1", proSplit:70, sqftK:78, velScore:1, cohesionContrib:0.85, catTile:55, catLvp:22, hhi:68000 },
  { id:"PS103", name:"Houston South",       state:"TX", region:"Southwest", clusterId:"C1", proSplit:68, sqftK:91, velScore:1, cohesionContrib:0.82, catTile:48, catLvp:31, hhi:64000 },
  { id:"PS104", name:"San Antonio Pro",     state:"TX", region:"Southwest", clusterId:"C1", proSplit:72, sqftK:73, velScore:2, cohesionContrib:0.80, catTile:50, catLvp:30, hhi:58000 },

  /* ── C2: DIY-Heavy West ─────── */
  { id:"PS201", name:"Phoenix West",        state:"AZ", region:"Southwest", clusterId:"C2", proSplit:25, sqftK:68, velScore:2, cohesionContrib:0.80, catTile:38, catLvp:44, hhi:62000 },
  { id:"PS202", name:"Las Vegas NW",        state:"NV", region:"West",      clusterId:"C2", proSplit:30, sqftK:72, velScore:2, cohesionContrib:0.77, catTile:42, catLvp:40, hhi:59000 },
  { id:"PS203", name:"Denver Tech",         state:"CO", region:"Mountain",  clusterId:"C2", proSplit:28, sqftK:65, velScore:2, cohesionContrib:0.78, catTile:35, catLvp:48, hhi:75000 },
  { id:"PS204", name:"Seattle East",        state:"WA", region:"Northwest", clusterId:"C2", proSplit:32, sqftK:61, velScore:3, cohesionContrib:0.74, catTile:33, catLvp:50, hhi:82000 },

  /* ── C3: DIY-Heavy South ────── */
  { id:"PS301", name:"Charlotte South",     state:"NC", region:"Southeast", clusterId:"C3", proSplit:30, sqftK:74, velScore:2, cohesionContrib:0.83, catTile:44, catLvp:40, hhi:66000 },
  { id:"PS302", name:"Raleigh West",        state:"NC", region:"Southeast", clusterId:"C3", proSplit:35, sqftK:70, velScore:2, cohesionContrib:0.82, catTile:46, catLvp:38, hhi:72000 },
  { id:"PS303", name:"Nashville DIY",       state:"TN", region:"Southeast", clusterId:"C3", proSplit:29, sqftK:77, velScore:2, cohesionContrib:0.80, catTile:40, catLvp:45, hhi:61000 },
  { id:"PS304", name:"Memphis Whitehaven",  state:"TN", region:"Southeast", clusterId:"C3", proSplit:33, sqftK:66, velScore:3, cohesionContrib:0.76, catTile:38, catLvp:47, hhi:55000 },

  /* ── C4: Mixed Urban East ───── */
  { id:"PS401", name:"NYC Brooklyn",        state:"NY", region:"Northeast", clusterId:"C4", proSplit:54, sqftK:48, velScore:2, cohesionContrib:0.78, catTile:48, catLvp:30, hhi:92000 },
  { id:"PS402", name:"Boston Cambridge",    state:"MA", region:"Northeast", clusterId:"C4", proSplit:50, sqftK:52, velScore:2, cohesionContrib:0.77, catTile:50, catLvp:28, hhi:98000 },
  { id:"PS403", name:"Philadelphia Center", state:"PA", region:"Northeast", clusterId:"C4", proSplit:47, sqftK:55, velScore:3, cohesionContrib:0.74, catTile:45, catLvp:33, hhi:71000 },
  { id:"PS404", name:"Washington DC East",  state:"DC", region:"Mid-Atl",   clusterId:"C4", proSplit:52, sqftK:58, velScore:2, cohesionContrib:0.75, catTile:47, catLvp:32, hhi:95000 },

  /* ── C5: Pro-Heavy Midwest ──── */
  { id:"PS501", name:"Chicago South Loop",  state:"IL", region:"Midwest",   clusterId:"C5", proSplit:68, sqftK:80, velScore:1, cohesionContrib:0.82, catTile:50, catLvp:30, hhi:64000 },
  { id:"PS502", name:"Columbus Pro",        state:"OH", region:"Midwest",   clusterId:"C5", proSplit:63, sqftK:75, velScore:2, cohesionContrib:0.79, catTile:48, catLvp:32, hhi:59000 },
  { id:"PS503", name:"Indianapolis North",  state:"IN", region:"Midwest",   clusterId:"C5", proSplit:66, sqftK:82, velScore:1, cohesionContrib:0.80, catTile:52, catLvp:28, hhi:62000 },
  { id:"PS504", name:"Detroit West",        state:"MI", region:"Midwest",   clusterId:"C5", proSplit:62, sqftK:69, velScore:2, cohesionContrib:0.77, catTile:46, catLvp:35, hhi:57000 },

  /* ── Available (unassigned) — can be added to any cluster ── */
  { id:"PS601", name:"Tampa Bay North",     state:"FL", region:"Southeast", clusterId:null,  proSplit:55, sqftK:76, velScore:2, cohesionContrib:null, catTile:44, catLvp:38, hhi:66000 },
  { id:"PS602", name:"Orlando Pro Center",  state:"FL", region:"Southeast", clusterId:null,  proSplit:62, sqftK:84, velScore:1, cohesionContrib:null, catTile:52, catLvp:28, hhi:70000 },
  { id:"PS603", name:"Kansas City West",    state:"MO", region:"Midwest",   clusterId:null,  proSplit:40, sqftK:71, velScore:2, cohesionContrib:null, catTile:40, catLvp:42, hhi:61000 },
];

/* Network-wide averages used as radar baseline. */
export const NETWORK_AVERAGES = {
  proSplit:  49,
  sqftK:     71,
  velScore:  2.2,
  catTile:   45,
  cohesion:  0.78,
};

/* Velocity score → letter label */
export const VEL_SCORE_LABEL = { 1: "A", 2: "B", 3: "C", 4: "D" };

/* Deterministic preview clusters for wizard Step 1 live-preview. */
export function previewClusters(k, attrCount, method) {
  const methodBonus = { kmeans: 0, ward: 0.02, dbscan: -0.03 };
  const attrBonus = Math.min(0.04, Math.max(-0.04, (attrCount - 4) * 0.01));
  const bonus = (methodBonus[method] || 0) + attrBonus;
  const extraColors = ["#0E7490", "#B45309", "#7C3AED"];
  const extraNames  = ["Value Volume", "Emerging Markets", "Premium Urban"];
  const result = [];
  for (let i = 0; i < k; i++) {
    const base = ACTIVE_CLUSTER_SET.clusters[i];
    result.push({
      id: `C${i + 1}`,
      name:     base ? base.name    : extraNames[i - 5] || `Cluster ${i + 1}`,
      stores:   base ? base.stores  : Math.round(70 / k),
      cohesion: Math.max(0.5, Math.min(0.99, (base ? base.cohesion : 0.72) + bonus)),
      color:    base ? base.color   : extraColors[(i - 5) % 3],
    });
  }
  return result;
}
