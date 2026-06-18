/**
 * Shared badge color maps — single source of truth.
 * Import these wherever DEPT_BADGE or VEL_BADGE are needed instead of
 * redefining them in each view file.
 *
 * Usage:
 *   import { DEPT_BADGE, VEL_BADGE } from "../config/badgeColors.js";
 *   <Badge color={DEPT_BADGE[sku.dept] || "neutral"} ... />
 */

/** Department → Impact UI Badge color */
export const DEPT_BADGE = {
  Wood:               "warning",
  Tile:               "success",
  "Laminate & Vinyl": "info",
};

/** Velocity tier → Impact UI Badge color */
export const VEL_BADGE = {
  A: "success",
  B: "info",
  C: "warning",
  D: "error",
};

/** Plan status → Impact UI Badge color */
export const STATUS_BADGE = {
  draft:         { color: "neutral", label: "Draft"        },
  "in-progress": { color: "info",    label: "In Progress"  },
  review:        { color: "warning", label: "Under Review" },
  approved:      { color: "success", label: "Approved"     },
  archived:      { color: "neutral", label: "Archived"     },
};
