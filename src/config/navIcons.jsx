import React from "react";

/*
 * Lightweight inline SVG icons for the Sidebar (Impact UI expects a React node
 * per route). Sized at 20px and inheriting `currentColor` so they pick up the
 * sidebar's light-on-dark + active-state coloring automatically.
 */
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Icon = ({ children }) => <svg {...base}>{children}</svg>;

export const TodayIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </Icon>
);

export const AssortmentIcon = () => (
  <Icon>
    <path d="M12 2 2 7l10 5 10-5-10-5Z" />
    <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
  </Icon>
);

export const IntelligenceIcon = () => (
  <Icon>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </Icon>
);

export const AdminIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </Icon>
);

export const HindsightIcon = () => (
  <Icon>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </Icon>
);

export const StoreHubIcon = () => (
  <Icon>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </Icon>
);

export const PortfolioIcon = () => (
  <Icon>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6M9 13h6M9 17h6" />
  </Icon>
);

export const ForecastIcon = () => (
  <Icon>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M21 7v4h-4" />
  </Icon>
);

export const CatalogueIcon = () => (
  <Icon>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </Icon>
);

export const NationalIcon = () => (
  <Icon>
    <path d="m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    <path d="M9 22V12h6v10" />
  </Icon>
);

export const RegionalIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </Icon>
);

export const CurationIcon = () => (
  <Icon>
    <path d="M3 9 5 3h14l2 6M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18" />
    <path d="M9 13h6" />
  </Icon>
);

export const MpiIcon = () => (
  <Icon>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 13l2 2 4-4" />
  </Icon>
);

export const MarketIntelIcon = () => (
  <Icon>
    <path d="M9 18h6M10 22h4" />
    <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2Z" />
  </Icon>
);

export const FeedbackIcon = () => (
  <Icon>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Icon>
);

export const ApprovalIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 12 2 2 4-4" />
  </Icon>
);

export const PlanningAdminIcon = () => (
  <Icon>
    <path d="m7.5 4.3 9 5.2v9.4l-9 5.2-9-5.2V9.5l9-5.2Z" transform="translate(4.5 -2)" />
    <path d="M3.3 7 12 12l8.7-5M12 22V12" />
  </Icon>
);

export const CalendarIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Icon>
);

export const AssortPeriodsIcon = () => (
  <Icon>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
    <path d="M7 15h2M11 15h6M7 19h4" strokeWidth={2} />
  </Icon>
);

export const ClusteringIcon = () => (
  <Icon>
    <circle cx="6" cy="7" r="2" />
    <circle cx="17" cy="6" r="2" />
    <circle cx="9" cy="16" r="2" />
    <circle cx="18" cy="17" r="2" />
    <path d="M8 8.5 7.5 14M11 16l5 .6M16 7.5 10.5 15" />
  </Icon>
);

export const LeadTimeIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const PeerIntelIcon = () => (
  <Icon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="3" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" />
  </Icon>
);

export const SettingsIcon = AdminIcon;

export const WorkspaceIcon = () => (
  <Icon>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
    <path d="M7 7h10M7 11h6" />
  </Icon>
);

export const AssortIntelIcon = () => (
  <Icon>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
    <path d="M12 8v4l2 2" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <path d="m9 3 1 4M15 3l-1 4M21 9l-4 1M21 15l-4-1M15 21l-1-4M9 21l1-4M3 15l4-1M3 9l4 1" />
  </Icon>
);

/* Range Build — stacked rectangles (range of products) */
export const RangeBuildIcon = () => (
  <Icon>
    <rect x="3" y="14" width="18" height="5" rx="1" />
    <rect x="3" y="7"  width="18" height="5" rx="1" />
    <path d="M7 7V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
  </Icon>
);

/* Others — horizontal ellipsis */
export const OthersIcon = () => (
  <Icon>
    <circle cx="5"  cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
  </Icon>
);

/* Option Recommendation — target/bullseye (hit the right option count) */
export const OptionRecIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <line x1="12" y1="2" x2="12" y2="4.5" strokeWidth="2" />
    <line x1="12" y1="19.5" x2="12" y2="22" strokeWidth="2" />
    <line x1="2" y1="12" x2="4.5" y2="12" strokeWidth="2" />
    <line x1="19.5" y1="12" x2="22" y2="12" strokeWidth="2" />
  </Icon>
);
