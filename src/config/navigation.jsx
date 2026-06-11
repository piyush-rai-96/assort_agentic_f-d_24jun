import React from "react";
import {
  TodayIcon,
  RangeBuildIcon,
  WorkspaceIcon,
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
  ClusteringIcon,
  LeadTimeIcon,
  PeerIntelIcon,
  SettingsIcon,
  AssortIntelIcon,
} from "./navIcons.jsx";

/*
 * Navigation model for the Impact UI <Sidebar />.
 *
 * Groups mirror the fd-assortment-v6.html taskflow sidebar exactly:
 *   Today (standalone) / Range Build / My Workspace /
 *   Assortment Curation / Intelligence / Admin
 *
 * Modules that exist in the React app but not in the HTML prototype are
 * collected under an "Others" group so they remain accessible without
 * cluttering the primary workflow.
 *
 * All leaf `value` keys are IDENTICAL to the legacy goModule() keys used
 * in VIEWS (App.jsx) and RBAC (users.js) — only the parent grouping changes.
 */
export const routes = [

  /* ── Today ─────────────────────────────────────────────────────────────── */
  {
    value: "today",
    label: "Today",
    icon: <TodayIcon />,
    link: "/today",
    children: [],
  },

  /* ── Range Build ────────────────────────────────────────────────────────── */
  {
    value: "range-build",
    label: "Range Build",
    icon: <RangeBuildIcon />,
    link: "#range-build",
    children: [
      { value: "portfolio",  label: "Portfolio Build",      icon: <PortfolioIcon />,  link: "/portfolio"  },
      { value: "forecast",   label: "Like-Item Forecast",   icon: <ForecastIcon />,   link: "/forecast"   },
      { value: "catalogue",  label: "Catalogue",            icon: <CatalogueIcon />,  link: "/catalogue"  },
    ],
  },

  /* ── My Workspace ───────────────────────────────────────────────────────── */
  {
    value: "workspace-group",
    label: "My Workspace",
    icon: <WorkspaceIcon />,
    link: "#workspace-group",
    children: [
      { value: "workspace", label: "My Workspace", icon: <WorkspaceIcon />, link: "/workspace", badge: "Plans" },
    ],
  },

  /* ── Assortment Curation ────────────────────────────────────────────────── */
  {
    value: "curation",
    label: "Assortment Curation",
    icon: <CurationIcon />,
    link: "#curation",
    children: [
      { value: "national",       label: "National Core",    icon: <NationalIcon />,  link: "/national"       },
      { value: "regional",       label: "Regional Review",  icon: <RegionalIcon />,  link: "/regional"       },
      { value: "store-curation", label: "Store Curation",   icon: <CurationIcon />,  link: "/store-curation" },
      { value: "mpi",            label: "NPI",              icon: <MpiIcon />,       link: "/mpi"            },
    ],
  },

  /* ── Intelligence ───────────────────────────────────────────────────────── */
  {
    value: "intelligence",
    label: "Intelligence",
    icon: <IntelligenceIcon />,
    link: "#intelligence",
    children: [
      { value: "intel",      label: "Market Intelligence", icon: <MarketIntelIcon />, link: "/intel"      },
      { value: "hindsight",  label: "Hindsight",           icon: <HindsightIcon />,   link: "/hindsight"  },
      { value: "peer-intel", label: "Peer Intelligence",   icon: <PeerIntelIcon />,   link: "/peer-intel" },
      { value: "approval",   label: "PLR Status",          icon: <ApprovalIcon />,    link: "/approval"   },
    ],
  },

  /* ── Admin ──────────────────────────────────────────────────────────────── */
  {
    value: "admin",
    label: "Admin",
    icon: <AdminIcon />,
    link: "#admin",
    children: [
      { value: "admin-planning", label: "Planning Admin",       icon: <PlanningAdminIcon />, link: "/admin-planning" },
      { value: "periods",        label: "PLR Calendar",         icon: <CalendarIcon />,      link: "/periods"        },
      { value: "clustering",     label: "Location Clustering",  icon: <ClusteringIcon />,    link: "/clustering"     },
    ],
  },

  /* ── Others (present in app but not in the v6 HTML prototype) ───────────── */
  {
    value: "others",
    label: "Others",
    icon: <OthersIcon />,
    link: "#others",
    children: [
      { value: "assortment-intelligence", label: "Assortment Intelligence", icon: <AssortIntelIcon />, link: "/assortment-intelligence", badge: "Signals" },
      { value: "feedback",                label: "Feedback Loop",           icon: <FeedbackIcon />,    link: "/feedback"                },
      { value: "lead-time",               label: "Lead Time & Oracle",      icon: <LeadTimeIcon />,    link: "/lead-time"               },
      { value: "store-hub",               label: "Store Hub",               icon: <StoreHubIcon />,    link: "/store-hub"               },
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

/**
 * Filter the route tree down to only the modules the current user can access.
 *
 * @param {typeof routes} tree - full routes array
 * @param {string[] | "ALL"} allowed - user.modules from users.js
 * @returns a new routes array with unauthorized leaves removed and empty
 *          parent groups dropped entirely.
 */
export function filterRoutesByAccess(tree, allowed) {
  if (allowed === "ALL") return tree;
  return tree.reduce((acc, route) => {
    if (!route.children || route.children.length === 0) {
      // Leaf (e.g. "today")
      if (allowed.includes(route.value)) acc.push(route);
    } else {
      // Group parent — keep only accessible children
      const visibleChildren = route.children.filter((c) =>
        allowed.includes(c.value)
      );
      if (visibleChildren.length > 0) {
        acc.push({ ...route, children: visibleChildren });
      }
    }
    return acc;
  }, []);
}

/* value → human label, for breadcrumb + content placeholder titles */
export const MODULE_LABELS = {
  today:                    "Today",
  workspace:                "My Workspace",
  hindsight:                "Hindsight",
  "store-hub":              "Store Hub",
  portfolio:                "Portfolio Build",
  forecast:                 "Like-Item Forecast",
  "assortment-intelligence":"Assortment Intelligence",
  catalogue:                "Catalogue",
  national:                 "National Core",
  regional:                 "Regional Review",
  "store-curation":         "Store Curation",
  mpi:                      "NPI",
  intel:                    "Market Intelligence",
  feedback:                 "Feedback Loop",
  approval:                 "PLR Status",
  "admin-planning":         "Planning Admin",
  periods:                  "PLR Calendar",
  clustering:               "Location Clustering",
  "lead-time":              "Lead Time & Oracle",
  "peer-intel":             "Peer Intelligence",
  settings:                 "Settings",
};

/* parent group label for a given leaf value (used in breadcrumb) */
export const MODULE_GROUP = (() => {
  const map = {};
  routes.forEach((r) => {
    if (r.children && r.children.length) {
      r.children.forEach((c) => (map[c.value] = r.label));
    }
  });
  return map;
})();
