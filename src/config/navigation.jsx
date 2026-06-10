import React from "react";
import {
  TodayIcon,
  AssortmentIcon,
  IntelligenceIcon,
  AdminIcon,
  HindsightIcon,
  StoreHubIcon,
  PortfolioIcon,
  ForecastIcon,
  CatalogueIcon,
  NationalIcon,
  RegionalIcon,
  CurationIcon,
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
} from "./navIcons.jsx";

/*
 * Navigation model for the Impact UI <Sidebar />.
 *
 * Mirrors the legacy taskflow groups (Today / Assortment Planning /
 * Intelligence / Admin). Each leaf `value` maps 1:1 to a legacy goModule() key
 * so upcoming views can be wired by value. Group parents only expand/collapse;
 * leaves carry the real `link`.
 */
export const routes = [
  {
    value: "today",
    label: "Today",
    icon: <TodayIcon />,
    link: "/today",
    children: [],
  },
  {
    value: "assortment",
    label: "Assortment Planning",
    icon: <AssortmentIcon />,
    link: "#assortment",
    children: [
      { value: "hindsight", label: "Hindsight", icon: <HindsightIcon />, link: "/hindsight" },
      { value: "store-hub", label: "Store Hub", icon: <StoreHubIcon />, link: "/store-hub" },
      { value: "portfolio", label: "Portfolio Build", icon: <PortfolioIcon />, link: "/portfolio" },
      { value: "forecast", label: "Like-Item Forecast", icon: <ForecastIcon />, link: "/forecast" },
      { value: "catalogue", label: "Catalogue", icon: <CatalogueIcon />, link: "/catalogue" },
      { value: "national", label: "National Core", icon: <NationalIcon />, link: "/national" },
      { value: "regional", label: "Regional Review", icon: <RegionalIcon />, link: "/regional" },
      { value: "store-curation", label: "Store Curation", icon: <CurationIcon />, link: "/store-curation" },
      { value: "mpi", label: "MPI / NPI", icon: <MpiIcon />, link: "/mpi" },
    ],
  },
  {
    value: "intelligence",
    label: "Intelligence",
    icon: <IntelligenceIcon />,
    link: "#intelligence",
    children: [
      { value: "intel", label: "Market Intelligence", icon: <MarketIntelIcon />, link: "/intel" },
      { value: "feedback", label: "Feedback Loop", icon: <FeedbackIcon />, link: "/feedback" },
      { value: "approval", label: "Final Approval", icon: <ApprovalIcon />, link: "/approval" },
    ],
  },
  {
    value: "admin",
    label: "Admin",
    icon: <AdminIcon />,
    link: "#admin",
    children: [
      { value: "admin-planning", label: "Planning Admin", icon: <PlanningAdminIcon />, link: "/admin-planning" },
      { value: "periods", label: "PLR Calendar", icon: <CalendarIcon />, link: "/periods" },
      { value: "clustering", label: "Location Clustering", icon: <ClusteringIcon />, link: "/clustering" },
      { value: "lead-time", label: "Lead Time & Oracle", icon: <LeadTimeIcon />, link: "/lead-time" },
      { value: "peer-intel", label: "Peer Intelligence", icon: <PeerIntelIcon />, link: "/peer-intel" },
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

/* value -> human label, for breadcrumb + content placeholder titles */
export const MODULE_LABELS = {
  today: "Today",
  hindsight: "Hindsight",
  "store-hub": "Store Hub",
  portfolio: "Portfolio Build",
  forecast: "Like-Item Forecast",
  catalogue: "Catalogue",
  national: "National Core",
  regional: "Regional Review",
  "store-curation": "Store Curation",
  mpi: "MPI / NPI",
  intel: "Market Intelligence",
  feedback: "Feedback Loop",
  approval: "Final Approval",
  "admin-planning": "Planning Admin",
  periods: "PLR Calendar",
  clustering: "Location Clustering",
  "lead-time": "Lead Time & Oracle",
  "peer-intel": "Peer Intelligence",
  settings: "Settings",
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
