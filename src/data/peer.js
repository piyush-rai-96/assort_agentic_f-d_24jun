/*
 * Peer Intelligence data — ported from the StoreHub "Assortment Intelligence"
 * prototype (data.jsx / peer.jsx) and re-homed under the Admin module.
 *
 * Peer Comparison drills a focus store against its behavioral cluster: which
 * network winners it fails to carry, which losers it still carries, and the
 * cross-store sell-through variance heatmap.
 */

/* Focus store + cluster context shown in the page header. */
export const PEER_CONTEXT = {
  storeName: "Atlanta — Buckhead",
  storeId: "S0142",
  cluster: "Pro-Heavy South",
  clusterStores: 18,
  category: "Tile",
  networkSkus: 1247,
};

export const CATEGORIES = [
  { id: "tile", name: "Tile", icon: "◧", skuCount: 1247 },
  { id: "wood", name: "Wood", icon: "▤", skuCount: 892 },
  { id: "stone", name: "Stone", icon: "◆", skuCount: 416 },
  { id: "install", name: "Installation Materials", icon: "◔", skuCount: 738 },
  { id: "decor", name: "Decorative & Wall Tile", icon: "◇", skuCount: 521 },
];

/* Deterministic sparkline generators (verbatim from the prototype). */
const seed = (n) => {
  let s = n;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};
const trendUp = (n = 12, base = 40) => { const r = seed(n); return Array.from({ length: 12 }, (_, i) => Math.round(base + i * 2.5 + r() * 8)); };
const trendDown = (n = 12, base = 80) => { const r = seed(n); return Array.from({ length: 12 }, (_, i) => Math.round(base - i * 2.0 + r() * 8)); };
const trendFlat = (n = 12, base = 55) => { const r = seed(n); return Array.from({ length: 12 }, (_, i) => Math.round(base + Math.sin(i) * 4 + r() * 6)); };

export const SKUS = [
  { id: "TIL-44218", name: "Marbella Carrara 12x24 Porcelain", cat: "Tile", sub: "Porcelain", flag: "network-win", carried: false, peerCarry: 78, peerST: 84, classification: "Winner", confidence: 88, trend: trendUp(1, 38), proSplit: "Pro-leaning", revOpp: 142000, supplier: "Cersaie" },
  { id: "WOO-30817", name: 'Heritage Oak 7" LVP — Smoked', cat: "Wood", sub: "LVP", flag: "network-win", carried: false, peerCarry: 67, peerST: 79, classification: "Winner", confidence: 82, trend: trendUp(2, 42), proSplit: "DIY-leaning", revOpp: 98500, supplier: "COREtec" },
  { id: "INS-12409", name: "ProSet Premium Mortar 50lb (Gray)", cat: "Installation Materials", sub: "Mortar", flag: "network-win", carried: false, peerCarry: 91, peerST: 88, classification: "Winner", confidence: 94, trend: trendUp(3, 50), proSplit: "Pro-dominant", revOpp: 64200, supplier: "Mapei" },
  { id: "TIL-58302", name: "Sahara Beige Travertine 18x18", cat: "Tile", sub: "Natural Stone", flag: "network-win", carried: false, peerCarry: 54, peerST: 71, classification: "Winner", confidence: 71, trend: trendUp(4, 35), proSplit: "Mixed", revOpp: 47800, supplier: "StoneCraft" },
  { id: "TIL-22014", name: "Mediterranean Mosaic 2x2 Glass — Teal", cat: "Tile", sub: "Glass", flag: "network-loser", carried: true, peerCarry: 48, peerST: 22, classification: "Loser", confidence: 79, trend: trendDown(5, 70), proSplit: "DIY-leaning", revOpp: -28000, weeksAtLoser: 14, plrCycles: 3, trapped: 41200 },
  { id: "DEC-66128", name: "Vintage Tin Backsplash Panel — Bronze", cat: "Decorative & Wall Tile", sub: "Accent", flag: "stale", carried: true, peerCarry: 31, peerST: 14, classification: "Stale", confidence: 86, trend: trendFlat(6, 18), proSplit: "DIY-leaning", revOpp: -19500, weeksAtLoser: 38, plrCycles: 8, trapped: 22800 },
  { id: "WOO-91044", name: 'Ranch Pine Solid 3.25" — Knotty', cat: "Wood", sub: "Solid Hardwood", flag: "network-loser", carried: true, peerCarry: 39, peerST: 26, classification: "Loser", confidence: 73, trend: trendDown(7, 62), proSplit: "DIY-leaning", revOpp: -33000, weeksAtLoser: 11, plrCycles: 2, trapped: 38400 },
];

/* My-store-vs-cluster comparison rows (static, from the prototype).
 * highlight values:
 *   "miss"        — store trails cluster (red ▼)
 *   "opportunity" — gap to fill, not a failure (amber ◈)
 *   "loser"       — active risk / trapped capital (red ▼)
 */
export const COMPARE_ROWS = [
  { metric: "# SKUs carried",               a: "1,047", b: "1,128", c: "1,212", highlight: "miss"        },
  { metric: "Avg sell-through rate",         a: "64.2%", b: "67.1%", c: "74.8%", highlight: "miss"        },
  { metric: "# Winners carried",             a: "188",   b: "212",   c: "241",   highlight: "miss"        },
  { metric: "# Network Winners not carried", a: "24",    b: "—",     c: "—",     highlight: "opportunity" },
  { metric: "# Losers still carried",        a: "31",    b: "24",    c: "—",     highlight: "loser"       },
  { metric: "Trapped capital estimate",      a: "$184k", b: "$148k", c: "—",     highlight: "loser"       },
];

/* Stores shown as columns in the variance heatmap.
 * compValues — stub metrics used when the store is selected as a comp / sister store
 * in the "My Store vs Cluster" comparison table.
 */
export const HEATMAP_STORES = [
  { id: "S0142", name: "Buckhead",    isMe: true },
  { id: "S0211", name: "North Plano", compValues: { skus: "1,089", st: "66.8%", winnersCarried: "201", winnersNotCarried: "18", losers: "27", trapped: "$162k" } },
  { id: "S0089", name: "Westheimer",  compValues: { skus: "1,134", st: "68.4%", winnersCarried: "214", winnersNotCarried: "12", losers: "22", trapped: "$138k" } },
  { id: "S0317", name: "Scottsdale",  compValues: { skus: "1,201", st: "71.2%", winnersCarried: "228", winnersNotCarried: "9",  losers: "19", trapped: "$115k" } },
  { id: "S0028", name: "Brandon",     compValues: { skus: "1,058", st: "65.3%", winnersCarried: "196", winnersNotCarried: "21", losers: "29", trapped: "$175k" } },
  { id: "S0455", name: "South End",   compValues: { skus: "1,176", st: "70.1%", winnersCarried: "220", winnersNotCarried: "11", losers: "21", trapped: "$128k" } },
];

/* Counts used by the drill-down card headers / "view all" affordances. */
export const WINNER_TOTAL = 24;
export const LOSER_TOTAL = 31;

/* flag → label + Badge color role. */
export const FLAG_META = {
  "network-win": { label: "Network Win", badge: "success" },
  "network-loser": { label: "Network Loser", badge: "error" },
  stale: { label: "Stale", badge: "warning" },
  emerging: { label: "Emerging", badge: "warning" },
};

/* Variance heatmap cell tint → semantic soft tokens (high = better). */
export function heatColor(v) {
  const t = Math.max(0, Math.min(1, v));
  if (t > 0.66) return "var(--color-success-soft)";
  if (t > 0.5) return "var(--color-info-soft)";
  if (t > 0.33) return "var(--color-surface-alt)";
  if (t > 0.17) return "var(--color-warning-soft)";
  return "var(--color-error-soft)";
}
