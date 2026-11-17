import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ErrorBoundary from "../ErrorBoundary";
import { getApplicationFromPath, isCanonicalPageShellRoute } from "../../utils/applicationRoutes";

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(true); // default collapsed
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  // Expense Management gets a denser chrome (sidebar/header/main padding) to
  // match its 80%-zoom reference density — scoped by route so every other
  // module's layout stays pixel-identical. See `.xms-density` in index.css.
  const isXms = location.pathname.startsWith("/expense-management");
  // Application Switcher: URL is the source of truth for which app (Intranet
  // vs Finance Management) is active, so Sidebar/Header stay in sync on refresh.
  const activeApplication = getApplicationFromPath(location.pathname);
  // P2.24a: canonical routes already own their own content padding via
  // PageContainer, so <main> must not add a second layer of p-4 for them —
  // see isCanonicalPageShellRoute's own doc comment for the full rationale.
  const isCanonicalShell = isCanonicalPageShellRoute(location.pathname);

  // Collapse automatically on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) setIsCollapsed(true);
      else setIsCollapsed(true); // keep collapsed by default
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Toggle sidebar manually
  const handleToggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isXms ? "xms-density" : ""}`}>
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} activeApplication={activeApplication} />

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed
            ? isXms ? "ml-[4.5rem]" : "ml-[5.5rem]"
            : isXms ? "ml-[14.5rem]" : "ml-[17rem]"
        }`} // increased margin for visible gap
      >
        <Header
          onToggleSidebar={handleToggleSidebar}
          isSidebarOpen={isSidebarOpen}
          activeApplication={activeApplication}
        />
        <main className={`flex-1 overflow-y-auto bg-gray-50 rounded-tl-xl shadow-inner ${isCanonicalShell ? "" : isXms ? "p-3" : "p-4"}`}>
          <ErrorBoundary locationKey={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default Layout;
