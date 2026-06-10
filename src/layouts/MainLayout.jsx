import React, { useState, useEffect, useCallback } from "react";
import { Header, Sidebar } from "impact-ui";
import {
  routes,
  actionRoutes,
  MODULE_LABELS,
  MODULE_GROUP,
  filterRoutesByAccess,
} from "../config/navigation.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import AgentRail from "../components/AgentRail.jsx";
import AgentChatBot from "../components/AgentChatBot.jsx";
import "./MainLayout.css";

/*
 * MainLayout — the master shell that wraps every view.
 *
 * Composition:
 *   • <Sidebar />  Impact UI fixed dark rail (64px → 280px overlay) for module nav
 *   • <Header />   Impact UI fixed top bar (logo, breadcrumb, user, actions)
 *   • <main>       scrollable content outlet (renders `children` / active view)
 *   • <AgentRail/> right-hand agent activity panel (legacy .hub-right)
 *
 * Navigation state is held here. `filterRoutesByAccess` prunes the sidebar tree
 * to only the modules the authenticated user may visit. `navigate()` and
 * `selectModule()` both gate against `hasAccess` so programmatic tile links
 * cannot bypass RBAC.
 */
export default function MainLayout({
  children,
  showAgentRail = true,
  onModuleChange,
  // Legacy prop accepted for backward compat but IGNORED — user comes from context.
  user: _ignored,
  onLogout: _ignoredLogout,
}) {
  const { user, logout, hasAccess } = useAuth();

  // Derive the allowed routes for this user once.
  const allowedRoutes = filterRoutesByAccess(routes, user?.modules ?? []);

  // Derive initial parent/child state from user's landing module.
  const initialModule = user?.landing ?? "today";
  const deriveInitialParent = (mod) => {
    const topLevel = allowedRoutes.find((r) => r.value === mod);
    if (topLevel) return topLevel.value;
    const parent = allowedRoutes.find((r) =>
      (r.children || []).some((c) => c.value === mod)
    );
    return parent ? parent.value : (allowedRoutes[0]?.value ?? "today");
  };
  const deriveInitialChild = (mod) => {
    const topLevel = allowedRoutes.find((r) => r.value === mod);
    return topLevel ? null : mod;
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [parentActive, setParentActive] = useState(() => deriveInitialParent(initialModule));
  const [childActive, setChildActive] = useState(() => deriveInitialChild(initialModule));
  const [activeModule, setActiveModule] = useState(initialModule);

  /* ── Chatbot state ──────────────────────────────────────────────── */
  const [isChatBotOpen,    setIsChatBotOpen]   = useState(false);
  const [chatInitialMsg,   setChatInitialMsg]   = useState("");

  // Re-sync to the user's landing whenever the authenticated user changes
  // (e.g. after a logout+login sequence within the same session).
  useEffect(() => {
    if (!user) return;
    const landing = user.landing ?? "today";
    setActiveModule(landing);
    setParentActive(deriveInitialParent(landing));
    setChildActive(deriveInitialChild(landing));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const selectModule = (value) => {
    if (!hasAccess(value)) return; // silently ignore unauthorized requests
    setActiveModule(value);
    onModuleChange?.(value);
    setIsSidebarOpen(false);
  };

  // Programmatic navigation (e.g. from a dashboard tile). Keeps the sidebar
  // parent/child highlight in sync with the chosen module value.
  const navigate = (value) => {
    if (!hasAccess(value)) return; // route guard
    const topLevel = allowedRoutes.find((r) => r.value === value);
    if (topLevel) {
      setParentActive(value);
      setChildActive(null);
    } else {
      const parent = allowedRoutes.find((r) =>
        (r.children || []).some((c) => c.value === value)
      );
      if (parent) {
        setParentActive(parent.value);
        setChildActive(value);
      }
    }
    selectModule(value);
  };

  const handleParentRouteChange = (item) => {
    if (!hasAccess(item.value) && item.children?.length === 0) return;
    setParentActive(item.value);
    if (!item.children || item.children.length === 0) {
      setChildActive(null);
      selectModule(item.value);
    }
  };

  const handleChildRouteChange = (parent, child) => {
    if (!hasAccess(child.value)) return;
    setParentActive(parent.value);
    setChildActive(child.value);
    selectModule(child.value);
  };

  const moduleLabel = MODULE_LABELS[activeModule] || "Today";
  const groupLabel = MODULE_GROUP[activeModule];

  /* Open chatbot — optionally pre-populate with a question */
  const openChatBot = useCallback((question = "") => {
    setChatInitialMsg(question || "");
    setIsChatBotOpen(true);
  }, []);

  const breadcrumb = (
    <nav className="fd-breadcrumb" aria-label="Breadcrumb">
      <span className="crumb-group">Floor &amp; Decor</span>
      <span className="sep">/</span>
      {groupLabel && (
        <>
          <span className="crumb-group">{groupLabel}</span>
          <span className="sep">/</span>
        </>
      )}
      <span className="crumb-active">{moduleLabel}</span>
    </nav>
  );

  return (
    <div className="fd-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        handleClose={() => setIsSidebarOpen((open) => !open)}
        routes={allowedRoutes}
        actionRoutes={actionRoutes}
        parentActive={parentActive}
        childActive={childActive}
        handleParentRouteChange={handleParentRouteChange}
        handleChildRouteChange={handleChildRouteChange}
        handleLogOut={logout}
        isCloseWhenClickOutside
      />

      <Header
        title="Assortment Planning"
        userName={user?.name ?? ""}
        centerComponent={breadcrumb}
        showHelpIcon
        showNotificationIcon
        notificationIndicator
        showMessageIcon={false}
        showChatBotIcon
        handleChatBotClick={() => openChatBot()}
        handleLogoClick={() => navigate(user?.landing ?? "today")}
      />

      <div className="fd-body">
        <main className="fd-content" role="main" aria-live="polite">
          <div className="fd-content-inner">
            {typeof children === "function"
              ? children({ activeModule, moduleLabel, groupLabel, navigate, hasAccess })
              : children}
          </div>
        </main>
        {showAgentRail && (
          <AgentRail onOpenChat={openChatBot} onNavigate={navigate} />
        )}
      </div>

      {/* Impact UI ChatBot — renders as a fixed overlay on the right */}
      <AgentChatBot
        isOpen={isChatBotOpen}
        setIsOpen={setIsChatBotOpen}
        initialMessage={chatInitialMsg}
      />
    </div>
  );
}
