/**
 * Shared option-count calculation utilities.
 * Imported by both Approval.jsx (PLR Status Stage 1) and OptionRec.jsx.
 *
 * Option count formula: Options = Sales U / (Weeks × Positions × ROS)
 *
 * Per-cluster distribution:
 *   - National  (40% of total) — same count for every cluster
 *   - Regional  (30% of total) — weighted by cluster performance tier
 *   - Store     (30% of total) — weighted by cluster store count
 */
import { FD_SKUS }            from "../data/skus.js";
import { FD_ASSORTMENT }      from "../data/assortment.js";
import { FD_CLUST_SCENARIOS } from "../data/clustering.js";

/* ── Dept normalizer ─────────────────────────────────────────────────────── */
export const DEPT_NORMALIZE = {
  "Wood / LVP":        "Wood",
  "Laminate And Vinyl": "Laminate & Vinyl",
};
export const normDept = (d) => DEPT_NORMALIZE[d] || d;

/* ── Formatters ──────────────────────────────────────────────────────────── */
export const fmtD = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000   ? `$${Math.round(n / 1_000)}k`
  : `$${Math.round(n)}`;

export const fmtU = (n) =>
  n >= 1_000 ? `${Math.round(n / 1_000)}k sqft` : `${Math.round(n)} sqft`;

/* ── Planning targets by dept ────────────────────────────────────────────── */
const DEPT_TARGET_OPTIONS = {
  "Tile":                   40,
  "Wood":                   36,
  "Laminate & Vinyl":       32,
  "Stone":                  28,
  "Decorative Accessories": 20,
};

/* Tier weight for regional allocation (high performers get more cluster-specific range) */
const TIER_REGIONAL_WEIGHT = { high: 1.5, mid: 1.0, low: 0.5 };

/* ── Core calculation ────────────────────────────────────────────────────── */
/**
 * Compute agent option-count recommendation for a given dept + cluster scenario.
 *
 * Returns:
 *   { total, national, regional, store, ros, salesUPeriod, weeks,
 *     totalPositions, formula, clusters[] }
 *
 * Each cluster item:
 *   { id, label, color, stores, ros, opts, national, regional, store }
 */
export function plrCalcOptionCount(dept, _plrId, clustScenarioKey) {
  const sc = FD_CLUST_SCENARIOS[clustScenarioKey || "B"];
  if (!sc) return null;

  const d          = normDept(dept);
  const deptSkuSet = new Set(FD_SKUS.filter((s) => s.dept === d).map((s) => s.sku));
  const deptRows   = FD_ASSORTMENT.filter((r) => deptSkuSet.has(r.sku));
  if (!deptRows.length) return null;

  const weeks          = 26;
  const totalPositions = sc.clusters.reduce((a, cl) => a + (cl.stores?.length || 0), 0);
  if (totalPositions === 0) return null;

  /* Derive global ROS from real data (used in formula display) */
  const salesU13     = deptRows.reduce((a, r) => a + (r.r13Sqft || 0), 0);
  const uniqueSkus   = new Set(deptRows.map((r) => r.sku)).size;
  const uniqueStores = new Set(deptRows.map((r) => r.storeId)).size;
  const ros          = salesU13 / (13 * uniqueSkus * Math.max(uniqueStores, 1));
  if (ros <= 0) return null;

  /* Use planning target for total; back-derive salesUPeriod for formula consistency */
  const total        = DEPT_TARGET_OPTIONS[d] ?? Math.max(1, Math.round(salesU13 * 2 / (weeks * totalPositions * ros)));
  const salesUPeriod = Math.round(total * weeks * totalPositions * ros);

  /* Aggregate tier splits */
  const national = Math.round(total * 0.40);
  const regional = Math.round(total * 0.30);
  const store    = total - national - regional;

  /* Per-cluster ROS from real data */
  const clusterRosMap = {};
  sc.clusters.forEach((cl) => {
    const clRows = deptRows.filter((r) => (cl.stores || []).includes(r.storeId));
    if (clRows.length) {
      const clS13 = clRows.reduce((s, r) => s + (r.r13Sqft || 0), 0);
      const clSku = new Set(clRows.map((r) => r.sku)).size || 1;
      clusterRosMap[cl.id] = clS13 / (13 * clSku * cl.stores.length);
    } else {
      /* Fallback: derive from cluster's revSqft relative to network average */
      const avgRevSqft = sc.clusters.reduce((a, c) => a + (c.revSqft || 300), 0) / sc.clusters.length;
      clusterRosMap[cl.id] = ros * ((cl.revSqft || 300) / avgRevSqft);
    }
  });

  /* Regional weighting — by performance tier */
  const totalTierWeight = sc.clusters.reduce(
    (a, cl) => a + (TIER_REGIONAL_WEIGHT[cl.tier] ?? 1.0), 0,
  ) || 1;

  /* Store weighting — by store count (more stores = more localised picks) */
  const totalStoreWeight = totalPositions;

  /* Build per-cluster rows */
  const clusters = sc.clusters.map((cl) => {
    const clROS       = parseFloat((clusterRosMap[cl.id] || ros).toFixed(2));
    const tierWeight  = TIER_REGIONAL_WEIGHT[cl.tier] ?? 1.0;
    const storeWeight = (cl.stores?.length || 0);

    const clReg = Math.round(regional * (tierWeight  / totalTierWeight));
    const clSto = Math.round(store    * (storeWeight / totalStoreWeight));

    return {
      id:       cl.id,
      label:    cl.label,
      color:    cl.color,
      tier:     cl.tier,
      stores:   cl.stores?.length || 0,
      ros:      clROS,
      national,
      regional: clReg,
      store:    clSto,
      opts:     national + clReg + clSto,
    };
  });

  return {
    total,
    national,
    regional,
    store,
    ros:           parseFloat(ros.toFixed(2)),
    salesUPeriod,
    weeks,
    totalPositions,
    clusters,
    formula: `Sales ${salesUPeriod.toLocaleString()} sqft / (${weeks} wks × ${totalPositions} positions × ${parseFloat(ros.toFixed(2))} ROS)`,
  };
}
