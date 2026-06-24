import React from "react";
import {
  TodayIcon,
  RangeBuildIcon,
  CurationIcon,
  IntelligenceIcon,
  AdminIcon,
  OthersIcon,
  HindsightIcon,
  StoreHubIcon,
  PortfolioIcon,
  ForecastIcon,
  CatalogueIcon,
  NationalIcon,
  RegionalIcon,
  MpiIcon,
  MarketIntelIcon,
  FeedbackIcon,
  ApprovalIcon,
  PlanningAdminIcon,
  CalendarIcon,
  AssortPeriodsIcon,
  ClusteringIcon,
  LeadTimeIcon,
  PeerIntelIcon,
  SettingsIcon,
  AssortIntelIcon,
  OptionRecIcon,
} from "./navIcons.jsx";

/*
 * Navigation model for the Impact UI <Sidebar />.
 *
 * New hierarchy (Jun 2026 overhaul):
 *   Today (cockpit) → Intelligence → Line Review · PLR → PLR Status → Admin · setup
 *
 * "My Workspace" group removed — workspace content folded into Today cockpit.
 * "Range Build" + "Assortment Curation" merged into "Line Review · PLR" with
 *   three visual sub-headings (Build / Curate / Measure) rendered via
 *   isDisabled items styled as section labels in MainLayout.css.
 *
 * All leaf `value` keys are IDENTICAL to the legacy goModule() keys used
 * in VIEWS (App.jsx) and RBAC (users.js) — only the parent grouping changes.
 */
export const routes = [

  /* ── Today (cockpit) ────────────────────────────────────────────────────── */
  {
    value: "today",
    label: "Today",
    icon: <TodayIcon />,
    link: "/today",
    children: [],
  },

  /* ── Intelligence ───────────────────────────────────────────────────────── */
  {
    value: "intelligence",
    label: "Intelligence",
    icon: <IntelligenceIcon />,
    link: "#intelligence",
    children: [
      { value: "hindsight",  label: "Hindsight",           icon: <HindsightIcon />,   link: "/hindsight"  },
      { value: "peer-intel", label: "Peer Intelligence",   icon: <PeerIntelIcon />,   link: "/peer-intel" },
      { value: "intel",      label: "Market Intelligence", icon: <MarketIntelIcon />, link: "/intel"      },
    ],
  },

  /* ── Line Review · PLR ──────────────────────────────────────────────────── */
  /*
   * Impact UI Sidebar only supports 2 levels (parent → flat children).
   * Sub-headings are implemented as isDisabled items styled as section labels
   * via .child-route-disabled overrides in MainLayout.css.
   */
  {
    value: "line-review",
    label: "Line Review · PLR",
    icon: <RangeBuildIcon />,
    link: "#line-review",
    children: [
      /* ─ Build ─ */
      { value: "lr-build-hdr",   label: "Build",              isDisabled: true },
      { value: "portfolio",      label: "Portfolio Build",    icon: <PortfolioIcon />,  link: "/portfolio"      },
      { value: "forecast",       label: "Like-Item Forecast", icon: <ForecastIcon />,   link: "/forecast"       },
      { value: "catalogue",      label: "Catalogue",          icon: <CatalogueIcon />,  link: "/catalogue"      },
      { value: "option-rec",    label: "Option Recommendation", icon: <OptionRecIcon />, link: "/option-rec"    },
      /* ─ Curate ─ */
      { value: "lr-curate-hdr",  label: "Curate",             isDisabled: true },
      { value: "national",       label: "National Core",      icon: <NationalIcon />,   link: "/national"       },
      { value: "regional",       label: "Regional Review",    icon: <RegionalIcon />,   link: "/regional"       },
      { value: "store-curation", label: "Store Curation",     icon: <CurationIcon />,   link: "/store-curation" },
      /* ─ Measure ─ */
      { value: "lr-measure-hdr", label: "Measure",            isDisabled: true },
      { value: "mpi",            label: "NPI",                icon: <MpiIcon />,        link: "/mpi"            },
    ],
  },

  /* ── PLR Status (standalone) ────────────────────────────────────────────── */
  {
    value: "approval",
    label: "PLR Status",
    icon: <ApprovalIcon />,
    link: "/approval",
    children: [],
  },

  /* ── Admin · setup ──────────────────────────────────────────────────────── */
  {
    value: "admin",
    label: "Admin · setup",
    icon: <AdminIcon />,
    link: "#admin",
    children: [
      { value: "admin-planning", label: "Planning Admin",      icon: <PlanningAdminIcon />, link: "/admin-planning" },
      { value: "assort-periods", label: "Assortment Periods",  icon: <AssortPeriodsIcon />, link: "/assort-periods" },
      { value: "periods",        label: "PLR Calendar",        icon: <CalendarIcon />,      link: "/periods"        },
      { value: "clustering",     label: "Location Clustering", icon: <ClusteringIcon />,    link: "/clustering"     },
    ],
  },

  /* ── Others (present in app but not in primary nav) ─────────────────────── */
  {
    value: "others",
    label: "Others",
    icon: <OthersIcon />,
    link: "#others",
    hidden: true,
    children: [
      { value: "assortment-intelligence", label: "Assortment Intelligence", icon: <AssortIntelIcon />, link: "/assortment-intelligence" },
      { value: "feedback",                label: "Feedback Loop",           icon: <FeedbackIcon />,    link: "/feedback"                },
      { value: "lead-time",               label: "Lead Time & Oracle",      icon: <LeadTimeIcon />,    link: "/lead-time"               },
      { value: "store-hub",               label: "Store Hub",               icon: <StoreHubIcon />,    link: "/store-hub"               },
      { value: "workspace",               label: "My Workspace",            icon: <PortfolioIcon />,   link: "/workspace"               },
    ],
  },
];

export const actionRoutes = [
  {
    value: "settings",
    label: "Settings",
    icon: <SettingsIcon />,
    link: "/settings",
    children: [],
  },
];

/* Disabled header values — these are visual section labels, not navigable modules */
const DISABLED_HEADERS = new Set(["lr-build-hdr", "lr-curate-hdr", "lr-measure-hdr"]);

/**
 * Filter the route tree down to only the modules the current user can access.
 *
 * @param {typeof routes} tree - full routes array
 * @param {string[] | "ALL"} allowed - user.modules from users.js
 * @returns a new routes array with unauthorized leaves removed and empty
 *          parent groups dropped entirely.
 */
export function filterRoutesByAccess(tree, allowed) {
  return tree.reduce((acc, route) => {
    if (route.hidden) return acc;

    if (allowed !== "ALL" && !route.children?.length) {
      if (allowed.includes(route.value)) acc.push(route);
    } else if (!route.children?.length) {
      acc.push(route);
    } else {
      const visibleChildren = allowed === "ALL"
        ? route.children
        : route.children.filter(
            (c) => DISABLED_HEADERS.has(c.value) || allowed.includes(c.value)
          );

      // Drop header-only groups (strip out headers, check if any real children remain)
      const realChildren = visibleChildren.filter((c) => !DISABLED_HEADERS.has(c.value));
      if (realChildren.length > 0) {
        acc.push({ ...route, children: visibleChildren });
      }
    }
    return acc;
  }, []);
}

/* value → human label, for breadcrumb + content placeholder titles */
export const MODULE_LABELS = {
  today:                    "Today",
  hindsight:                "Hindsight",
  "peer-intel":             "Peer Intelligence",
  intel:                    "Market Intelligence",
  portfolio:                "Portfolio Build",
  forecast:                 "Like-Item Forecast",
  catalogue:                "Catalogue",
  "option-rec":             "Option Recommendation",
  national:                 "National Core",
  regional:                 "Regional Review",
  "store-curation":         "Store Curation",
  mpi:                      "NPI",
  approval:                 "PLR Status",
  "admin-planning":         "Planning Admin",
  "assort-periods":         "Assortment Periods",
  periods:                  "PLR Calendar",
  clustering:               "Location Clustering",
  "assortment-intelligence":"Assortment Intelligence",
  "store-hub":              "Store Hub",
  feedback:                 "Feedback Loop",
  "lead-time":              "Lead Time & Oracle",
  workspace:                "My Workspace",
  settings:                 "Settings",
};

/* parent group label for a given leaf value (used in breadcrumb) */
export const MODULE_GROUP = (() => {
  const map = {};
  routes.forEach((r) => {
    if (r.children && r.children.length) {
      r.children.forEach((c) => {
        if (!DISABLED_HEADERS.has(c.value)) {
          map[c.value] = r.label;
        }
      });
    }
  });
  return map;
})();
