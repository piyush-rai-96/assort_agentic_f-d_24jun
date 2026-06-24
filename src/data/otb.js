/*
 * OTB (Open-to-Buy) budget system — new in V3.
 *
 * Tracks fiscal budgets at national dept, cluster slot, and store-location level.
 * Provides helper functions that compute consumed budget from live plan decisions.
 */
import { FD_STORES } from "./stores.js";

/* ── Department OTB budgets (SS 2026) ─────────────────────────────────── */
export const FD_OTB_DEPTS = {
  "Wood":               1_850_000,
  "Tile":               2_400_000,
  "Laminate & Vinyl":   1_600_000,
};

/* ── Cluster slot limits — max # of SKUs that can be kept at cluster level ── */
export const CLUSTER_SLOTS = {
  /* Scenario B (Behavioral — recommended) */
  B1: 24,  /* High-Velocity Pro Markets — 5 stores, high tier */
  B2: 20,  /* Mid-Velocity Suburban    — 8 stores, mid tier  */
  B3: 18,  /* Volume / Value Stores    — 6 stores, mid tier  */
  B4: 12,  /* Developing / Transitional — 2 stores, low tier */
  /* Scenario C (DC-based) */
  C1: 8,
  C2: 10,
  C3: 12,
  C4: 14,
  C5: 10,
};

/* ── Per-store budget by velocity band ───────────────────────────────────── */
const VELOCITY_BUDGET = { A: 140_000, B: 110_000, C: 85_000, D: 65_000 };

export function storeLocationBudget(storeId) {
  const store = FD_STORES.find((s) => s.id === storeId);
  return VELOCITY_BUDGET[store?.velocity ?? "C"] ?? 85_000;
}

/* ─── Compute consumed OTB at national level from natDecisions ──────────── */
export function otbNationalConsumed(natDecisions, catalogueSkus) {
  const byDept = { "Wood": 0, "Tile": 0, "Laminate & Vinyl": 0 };
  Object.entries(natDecisions).forEach(([skuId, decision]) => {
    if (decision !== "core") return;
    const sku = catalogueSkus.find((s) => s.id === skuId);
    if (!sku) return;
    const dept = sku.dept;
    if (dept in byDept) {
      // Approximate cost: price × avg 21 stores × avg 120 sqft/store
      byDept[dept] = (byDept[dept] || 0) + (sku.price || 5) * 21 * 120;
    }
  });
  return byDept;
}

/* ─── Compute consumed OTB at cluster level from clusterDecisions ───────── */
export function otbClusterConsumed(clusterDecisions, catalogueSkus) {
  // Returns { [clusterId]: { consumed: number, slots: number } }
  const result = {};
  Object.entries(clusterDecisions).forEach(([key, decision]) => {
    if (decision !== "add") return;
    const [clusterId, skuId] = key.split(":");
    if (!result[clusterId]) result[clusterId] = { consumed: 0, slots: 0 };
    result[clusterId].slots += 1;
    const sku = catalogueSkus.find((s) => s.id === skuId);
    if (sku) result[clusterId].consumed += (sku.price || 5) * 8 * 120;
  });
  return result;
}

/* ─── Compute consumed OTB at store level from store decisions ──────────── */
export function otbStoreConsumed(storeId, decisions, curationRows) {
  let adds = 0;
  let drops = 0;
  curationRows.forEach((row) => {
    const d = decisions[row.sku];
    if (d === "add") adds += (row.price || 5) * 120;
    else if (d === "drop") drops += (row.price || 5) * 120;
  });
  const budget = storeLocationBudget(storeId);
  return { budget, adds, drops, net: budget - adds + drops, pct: Math.round((adds / budget) * 100) };
}

/* ─── Format helpers ─────────────────────────────────────────────────────── */
export function fmtCurrency(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export function otbPct(consumed, budget) {
  return budget > 0 ? Math.min(100, Math.round((consumed / budget) * 100)) : 0;
}
