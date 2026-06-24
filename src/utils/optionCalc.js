/**
 * Shared option-count calculation utilities.
 * Imported by both Approval.jsx (PLR Status Stage 1) and OptionRec.jsx
 * (standalone Option Recommendation screen).
 */
import { FD_SKUS }          from "../data/skus.js";
import { FD_ASSORTMENT }    from "../data/assortment.js";
import { FD_CLUST_SCENARIOS } from "../data/clustering.js";

/* ── Dept normalizer ─────────────────────────────────────────────────────── */
export const DEPT_NORMALIZE = {
  "Wood / LVP": "Wood",
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

/* ── Core calculation ────────────────────────────────────────────────────── */
/**
 * Compute agent option-count recommendation for a given dept + cluster scenario.
 *
 * Returns:
 *   { total, national, regional, store, ros, salesUPeriod, weeks,
 *     totalPositions, formula, clusters[] }
 *
 * Each cluster item:
 *   { id, label, color, stores, ros, opts, national, regional, store, salesU }
 *
 * Returns null if data is insufficient (no SKUs for dept, zero ROS, etc.).
 */
export function plrCalcOptionCount(dept, _plrId, clustScenarioKey) {
  const sc = FD_CLUST_SCENARIOS[clustScenarioKey || "B"];
  if (!sc) return null;

  const d           = normDept(dept);
  const deptSkuSet  = new Set(FD_SKUS.filter((s) => s.dept === d).map((s) => s.sku));
  const deptRows    = FD_ASSORTMENT.filter((r) => deptSkuSet.has(r.sku));
  if (!deptRows.length) return null;

  const weeks          = 26;
  const totalPositions = sc.clusters.reduce((a, cl) => a + (cl.stores?.length || 0), 0);
  const salesU13       = deptRows.reduce((a, r) => a + (r.r13Sqft || 0), 0);
  const salesUPeriod   = salesU13 * (weeks / 13);
  const uniqueSkus     = new Set(deptRows.map((r) => r.sku)).size;
  const uniqueStores   = new Set(deptRows.map((r) => r.storeId)).size;
  const ros            = salesU13 / (13 * uniqueSkus * Math.max(uniqueStores, 1));
  if (ros <= 0 || totalPositions === 0) return null;

  const total    = Math.max(1, Math.round(salesUPeriod / (weeks * totalPositions * ros)));
  const national = Math.round(total * 0.4);
  const regional = Math.round(total * 0.3);
  const store    = total - national - regional;

  /* Per-cluster ROS sum for proportional weighting */
  const rosSum = sc.clusters.reduce((a, cl) => {
    const clRows = deptRows.filter((r) => (cl.stores || []).includes(r.storeId));
    if (!clRows.length) return a + ros;
    const clS13 = clRows.reduce((s, r) => s + (r.r13Sqft || 0), 0);
    const clSku = new Set(clRows.map((r) => r.sku)).size;
    return a + clS13 / (13 * clSku * cl.stores.length);
  }, 0) || 1;

  const clusters = sc.clusters.map((cl) => {
    const clRows = deptRows.filter((r) => (cl.stores || []).includes(r.storeId));
    const clS13  = clRows.length ? clRows.reduce((a, r) => a + (r.r13Sqft || 0), 0) : 0;
    const clSku  = new Set(clRows.map((r) => r.sku)).size || 1;
    const clROS  = clRows.length ? clS13 / (13 * clSku * cl.stores.length) : ros;
    const weight = clROS / rosSum;
    const clReg  = Math.round(regional * weight);
    const clSto  = Math.round(store    * weight);
    return {
      id:       cl.id,
      label:    cl.label,
      color:    cl.color,
      stores:   cl.stores?.length || 0,
      ros:      parseFloat(clROS.toFixed(2)),
      opts:     national + clReg + clSto,
      national,
      regional: clReg,
      store:    clSto,
      salesU:   Math.round(clS13 * (weeks / 13)),
    };
  });

  return {
    total, national, regional, store,
    ros:          parseFloat(ros.toFixed(2)),
    salesUPeriod: Math.round(salesUPeriod),
    weeks,
    totalPositions,
    clusters,
    formula: `Sales ${Math.round(salesUPeriod)} sqft / (${weeks} wks × ${totalPositions} positions × ${parseFloat(ros.toFixed(2))} ROS)`,
  };
}
