/**
 * Shared agent recommendation engine — Keep / Modify / Drop.
 *
 * Used by National Core, Regional Review, and Store Curation.
 * Returns { action, confidence, reason, detail } for any SKU context.
 *
 * Rules (in priority order):
 *   Mandatory  →  Keep  (Core/BG tags are non-negotiable)
 *   Disc.      →  Drop  (Discontinued items should exit)
 *   Vel A, R13 ≥ 120, carry ≥ 70%  →  Keep high
 *   Vel A/B, R13 ≥ 90              →  Keep medium
 *   Vel D                          →  Drop high
 *   Vel C, R13 < 50                →  Drop medium
 *   carry < 20%                    →  Drop medium (low adoption)
 *   Vel B, R13 < 70                →  Modify (review pricing)
 *   Vel C, R13 ≥ 50                →  Modify (monitor)
 *   otherwise                      →  Modify (low confidence)
 */

/* ── Confidence → label ──────────────────────────────────────────────────── */
export const CONF_LABEL = { high: "High", medium: "Medium", low: "Low" };

/* ── Action colours ──────────────────────────────────────────────────────── */
export const REC_COLOR = {
  keep:   { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" },
  modify: { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  drop:   { bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5" },
};

/**
 * National-level recommendation.
 * @param {{ avgR13: number, velocity: string, carryPct: number, status: string, tag: string }} s
 */
export function getNationalRec({ avgR13 = 0, velocity = "C", carryPct = 0, status = "", tag = "" }) {
  if (tag === "Core" || tag === "BG") {
    return { action: "keep", confidence: "high", reason: "Mandatory", detail: "Core / BG — locked nationally" };
  }
  if (status === "Discontinued") {
    return { action: "drop", confidence: "high", reason: "Discontinued", detail: "Item exiting catalogue" };
  }

  /* Strong performers */
  if (velocity === "A" && avgR13 >= 120 && carryPct >= 70) {
    return { action: "keep", confidence: "high", reason: "Top performer", detail: `Vel A · ${avgR13} sqft · ${carryPct}% carry` };
  }
  if (velocity === "A" && avgR13 >= 90) {
    return { action: "keep", confidence: "high", reason: "High velocity", detail: `Vel A · ${avgR13} sqft avg R13` };
  }
  if ((velocity === "A" || velocity === "B") && avgR13 >= 90 && carryPct >= 60) {
    return { action: "keep", confidence: "medium", reason: "Solid adoption", detail: `Vel ${velocity} · good carry rate` };
  }
  if (velocity === "B" && avgR13 >= 100) {
    return { action: "keep", confidence: "medium", reason: "Consistent performer", detail: `Vel B · strong R13 output` };
  }

  /* Weak performers */
  if (velocity === "D") {
    return { action: "drop", confidence: "high", reason: "Low velocity", detail: "Vel D — poor sell-through across network" };
  }
  if (velocity === "C" && avgR13 < 50) {
    return { action: "drop", confidence: "medium", reason: "Underperformer", detail: `Vel C · only ${avgR13} sqft R13` };
  }
  if (carryPct < 20) {
    return { action: "drop", confidence: "medium", reason: "Low adoption", detail: `Only ${carryPct}% of stores carry` };
  }

  /* Mid performers — review recommended */
  if (velocity === "B" && avgR13 < 70) {
    return { action: "modify", confidence: "medium", reason: "Review pricing", detail: `Vel B but R13 below avg — check price positioning` };
  }
  if (velocity === "C" && avgR13 >= 60) {
    return { action: "modify", confidence: "low", reason: "Monitor closely", detail: `Vel C · marginal performance — watch next cycle` };
  }
  if (velocity === "B") {
    return { action: "modify", confidence: "low", reason: "Needs attention", detail: "Mid-tier carry with uneven sqft output" };
  }

  return { action: "modify", confidence: "low", reason: "Insufficient data", detail: "Not enough signals to score with confidence" };
}

/**
 * Cluster-level recommendation (Regional Review).
 * @param {{ avgR13: number, storeCount: number, totalStores: number, tier: string, status: string, tag: string }} s
 */
export function getClusterRec({ avgR13 = 0, storeCount = 0, totalStores = 1, tier = "mid", status = "", tag = "" }) {
  const carryPct = totalStores > 0 ? Math.round((storeCount / totalStores) * 100) : 0;

  if (tag === "Core" || tag === "BG") {
    return { action: "keep", confidence: "high", reason: "Core / BG", detail: "Locked — national mandatory" };
  }
  if (status === "Discontinued") {
    return { action: "drop", confidence: "high", reason: "Discontinued", detail: "Exiting catalogue" };
  }

  /* High-tier clusters get tighter thresholds */
  const keepR13 = tier === "high" ? 120 : tier === "mid" ? 90 : 70;
  const dropR13  = tier === "high" ? 60  : tier === "mid" ? 40 : 30;

  if (avgR13 >= keepR13 && carryPct >= 70) {
    return { action: "keep", confidence: "high", reason: "Cluster leader", detail: `${avgR13} sqft · ${carryPct}% in cluster` };
  }
  if (avgR13 >= keepR13) {
    return { action: "keep", confidence: "medium", reason: "Good performer", detail: `Strong R13 for ${tier}-tier cluster` };
  }
  if (carryPct >= 80 && avgR13 >= 60) {
    return { action: "keep", confidence: "medium", reason: "Wide adoption", detail: `${carryPct}% cluster carry` };
  }
  if (avgR13 < dropR13 || carryPct < 25) {
    return { action: "drop", confidence: "medium", reason: "Poor cluster fit", detail: `${avgR13} sqft · ${carryPct}% carry — below threshold` };
  }

  return { action: "modify", confidence: "low", reason: "Review range", detail: "Mid-performance — evaluate vs cluster avg" };
}

/**
 * Store-level recommendation (Store Curation).
 * @param {{ r13: number, menuPrice: number, status: string, tag: string, isActive: boolean }} s
 */
export function getStoreRec({ r13 = 0, menuPrice = 0, status = "", tag = "", isActive = true }) {
  if (tag === "Core" || tag === "BG") {
    return { action: "keep", confidence: "high", reason: "Core / BG", detail: "Mandatory in all stores" };
  }
  if (status === "Discontinued") {
    return { action: "drop", confidence: "high", reason: "Discontinued", detail: "Remove from store plan" };
  }
  if (!isActive) {
    return { action: "modify", confidence: "low", reason: "Not carried", detail: "Evaluate for potential add" };
  }
  if (r13 >= 180) {
    return { action: "keep", confidence: "high", reason: "Top store SKU", detail: `${Math.round(r13)} sqft — leading item` };
  }
  if (r13 >= 100) {
    return { action: "keep", confidence: "medium", reason: "Performing well", detail: `${Math.round(r13)} sqft R13` };
  }
  if (r13 > 0 && r13 < 30) {
    return { action: "drop", confidence: "medium", reason: "Poor store sales", detail: `Only ${Math.round(r13)} sqft — below floor` };
  }
  if (r13 >= 50) {
    return { action: "modify", confidence: "medium", reason: "Review placement", detail: `${Math.round(r13)} sqft — check pricing or position` };
  }
  if (r13 > 0) {
    return { action: "modify", confidence: "low", reason: "Marginal sales", detail: `${Math.round(r13)} sqft — monitor next cycle` };
  }

  return { action: "modify", confidence: "low", reason: "No history", detail: "New item — await first cycle data" };
}
