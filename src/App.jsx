import React from "react";
import { EmptyState } from "impact-ui";
import { useAuth } from "./context/AuthContext.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import Login from "./views/Login.jsx";
import ModulePlaceholder from "./views/ModulePlaceholder.jsx";
import Today from "./views/Today.jsx";
import Workspace from "./views/Workspace.jsx";
import Hindsight from "./views/Hindsight.jsx";
import StoreHub from "./views/StoreHub.jsx";
import PortfolioBuild from "./views/PortfolioBuild.jsx";
import LikeItemForecast from "./views/LikeItemForecast.jsx";
import AssortmentIntelligence from "./views/AssortmentIntelligence.jsx";
import Catalogue from "./views/Catalogue.jsx";
import National from "./views/National.jsx";
import Regional from "./views/Regional.jsx";
import StoreCuration from "./views/StoreCuration.jsx";
import Mpi from "./views/Mpi.jsx";
import MarketIntel from "./views/MarketIntel.jsx";
import FeedbackLoop from "./views/FeedbackLoop.jsx";
import Approval from "./views/Approval.jsx";
import PlanningAdmin from "./views/PlanningAdmin.jsx";
import PlrCalendar from "./views/PlrCalendar.jsx";
import Clustering from "./views/Clustering.jsx";
import LeadTime from "./views/LeadTime.jsx";
import PeerIntelligence from "./views/PeerIntelligence.jsx";

/*
 * App root — renders the Login screen when no user is authenticated,
 * and the full MainLayout shell when a valid session exists.
 *
 * The VIEWS map wires module values to view components exactly as before.
 * The render-prop adds a `hasAccess` check so any view that somehow receives
 * an unauthorised module value (e.g. via a stale URL or programmatic jump)
 * falls back to a clear "Access denied" EmptyState rather than silently
 * rendering nothing.
 */
const VIEWS = {
  today: ({ navigate, user }) => <Today onNavigate={navigate} user={user} />,
  workspace: ({ navigate, user }) => <Workspace onNavigate={navigate} user={user} />,
  hindsight: ({ user }) => <Hindsight user={user} />,
  "store-hub": () => <StoreHub />,
  portfolio: () => <PortfolioBuild />,
  forecast: () => <LikeItemForecast />,
  "assortment-intelligence": ({ navigate }) => <AssortmentIntelligence onNavigate={navigate} />,
  catalogue: ({ navigate }) => <Catalogue onNavigate={navigate} />,
  national: ({ navigate }) => <National onNavigate={navigate} />,
  regional: ({ navigate }) => <Regional onNavigate={navigate} />,
  "store-curation": ({ navigate, user }) => <StoreCuration onNavigate={navigate} user={user} />,
  mpi: () => <Mpi />,
  intel: () => <MarketIntel />,
  feedback: () => <FeedbackLoop />,
  approval: ({ navigate }) => <Approval onNavigate={navigate} />,
  "admin-planning": () => <PlanningAdmin />,
  periods: () => <PlrCalendar />,
  clustering: ({ navigate }) => <Clustering onNavigate={navigate} />,
  "lead-time": () => <LeadTime />,
  "peer-intel": () => <PeerIntelligence />,
};

function AccessDenied() {
  return (
    <div style={{ padding: "48px 32px" }}>
      <EmptyState
        heading="Access restricted"
        description="You don't have permission to view this module. Contact your administrator if you think this is a mistake."
      />
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  // No authenticated user → show the login screen.
  if (!user) {
    return <Login />;
  }

  return (
    <MainLayout>
      {({ activeModule, moduleLabel, groupLabel, navigate, hasAccess }) => {
        // Defense-in-depth: block access even if navigation state drifts.
        if (!hasAccess(activeModule)) {
          return <AccessDenied />;
        }
        const View = VIEWS[activeModule];
        return View ? (
          View({ navigate, user })
        ) : (
          <ModulePlaceholder
            activeModule={activeModule}
            moduleLabel={moduleLabel}
            groupLabel={groupLabel}
          />
        );
      }}
    </MainLayout>
  );
}
