/*
 * Catalogue data + assortment-agent scoring.
 * Ported from CATALOGUE_SKUS, ASSORTMENT_PLAN helpers, and apRunAgent in the
 * legacy fd-assortment-v4-2.html.
 *
 * The agent scores every non-core Active SKU on R13 carry-rate + avg sqft and
 * recommends a 3-tier plan (National Core / Cluster adds / Store picks). Without
 * a received forecast (cross-screen state isn't shared yet) scoring uses R13
 * history only — exactly the legacy fallback path.
 */
import { FD_SKUS } from "./skus.js";
import { FD_ASSORTMENT } from "./assortment.js";
import { FD_STORES } from "./stores.js";
import { FD_CLUST_SCENARIOS } from "./clusters.js";

/* Catalogue SKU rows derived from the product catalogue (legacy CATALOGUE_SKUS). */
export const CATALOGUE_SKUS = FD_SKUS.map((s, i) => {
  const isBG = s.tag && (s.tag === "BG" || s.tag === "East" || s.tag === "Core");
  const tier = isBG ? "core" : s.dept === "Laminate & Vinyl" && i < 6 ? "core" : i < 14 ? "regional" : "store";
  const storeCount = tier === "core" ? 21 : tier === "regional" ? 8 + (i % 8) : 0;
  return {
    id: String(s.sku),
    name: s.desc,
    cat: s.dept + (s.subDept ? " – " + s.subDept : ""),
    dept: s.dept,
    subDept: s.subDept,
    cls: s.cls,
    subCls: s.subCls,
    vsn: s.vsn,
    color: s.color,
    finish: s.finish,
    sizeSpec: s.size,
    price: s.price,
    tier,
    stores: storeCount,
    tag: s.tag,
    status: s.status,
  };
});

export const HARD_LOCKED_COUNT = FD_SKUS.filter((s) => s.tag === "Core" || s.tag === "BG").length;
export const STORE_PICK_COUNT = CATALOGUE_SKUS.filter((s) => s.tier === "store").length;

/* A SKU is national-locked if it's an original Core/BG, or promoted to core in the plan. */
export function isNatLocked(skuId, natDecisions) {
  const sku = FD_SKUS.find((s) => s.sku === skuId);
  if (sku && (sku.tag === "Core" || sku.tag === "BG")) return true;
  return natDecisions[skuId] === "core";
}

/* A SKU is cluster-added if any cluster decision for it is "add". */
export function isClusterAdd(skuId, clusterDecisions) {
  return Object.keys(clusterDecisions).some((k) => k.endsWith(":" + skuId) && clusterDecisions[k] === "add");
}

/* National R13 footprint + a qualitative reason tag for a SKU (legacy apNatScore). */
export function nationalStats(sku) {
  const rows = FD_ASSORTMENT.filter((r) => r.sku === sku.sku);
  const stores = new Set(rows.map((r) => r.storeId));
  const sqft = rows.reduce((a, r) => a + (r.r13Sqft || 0), 0);
  const avgSqft = stores.size ? sqft / stores.size : 0;
  const carryPct = (stores.size / FD_STORES.length) * 100;
  const reason =
    carryPct >= 80 && avgSqft >= 100
      ? "high-carry-high-sqft"
      : carryPct >= 80
      ? "high-carry"
      : avgSqft >= 130
      ? "high-sqft"
      : "emerging";
  return { sku, carryPct: Math.round(carryPct), avgSqft: Math.round(avgSqft), score: Math.round(carryPct * 0.4 + avgSqft * 0.6), reason };
}
const natScore = nationalStats;

function clusterScore(sku, cl) {
  const rows = FD_ASSORTMENT.filter((r) => cl.stores.indexOf(r.storeId) !== -1 && r.sku === sku.sku);
  const stores = new Set(rows.map((r) => r.storeId));
  const sqft = rows.reduce((a, r) => a + (r.r13Sqft || 0), 0);
  const avgSqft = stores.size ? sqft / stores.size : 0;
  const carryPct = (stores.size / cl.stores.length) * 100;
  return { sku, stores: stores.size, carryPct: Math.round(carryPct), avgSqft: Math.round(avgSqft), score: Math.round(carryPct * 0.4 + avgSqft * 0.6) };
}

/*
 * apIntelModifier — V3 intel-to-agent scoring integration.
 * Reads actioned Market Intel signals and returns a score delta (capped ±30)
 * plus warning flags for the National/Catalogue recommendation cards.
 */
const INTEL_DELTA_MAP = {
  competitive: -15,
  supply:      -20,
  product:     -12,
  market:      +10,
  trend:       +8,
  customer:    +5,
};

export function apIntelModifier(skuId, intelSeed) {
  if (!intelSeed) return { delta: 0, flags: [], signalCount: 0 };
  const actioned = intelSeed.filter(
    (i) => i.feedsModel &&
      (i.status === "actioned" || i.status === "reviewed") &&
      i.skus?.includes(String(skuId))
  );
  let delta = 0;
  const flags = [];
  actioned.forEach((sig) => {
    delta += INTEL_DELTA_MAP[sig.type] || 0;
    if (sig.type === "supply") flags.push("supply-constrained");
    if (sig.type === "product") flags.push("quality-hold");
  });
  delta = Math.max(-30, Math.min(30, delta));
  return { delta, flags, signalCount: actioned.length };
}

/* Run the agent — returns a fresh plan (decisions + rec caches) the view stores in state. */
export function runCatalogueAgent() {
  const nonCore = FD_SKUS.filter((s) => !s.tag && s.status === "Active");
  const sc = FD_CLUST_SCENARIOS.B;

  const agentNatRecs = nonCore
    .map(natScore)
    .filter((c) => c.carryPct >= 80 && c.avgSqft >= 100)
    .sort((a, b) => b.score - a.score);

  const agentClusterRecs = {};
  sc.clusters.forEach((cl) => {
    agentClusterRecs[cl.id] = nonCore
      .map((sku) => clusterScore(sku, cl))
      .filter((c) => c.carryPct >= 70 && c.avgSqft >= 80)
      .sort((a, b) => b.score - a.score);
  });

  const natDecisions = {};
  agentNatRecs.forEach((c) => (natDecisions[c.sku.sku] = "core"));

  const clusterDecisions = {};
  Object.entries(agentClusterRecs).forEach(([cid, recs]) =>
    recs.forEach((c) => (clusterDecisions[cid + ":" + c.sku.sku] = "add"))
  );

  return { natDecisions, clusterDecisions, agentNatRecs, agentClusterRecs, agentRunAt: new Date().toLocaleTimeString() };
}
