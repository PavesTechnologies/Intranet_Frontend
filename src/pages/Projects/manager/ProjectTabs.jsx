import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { lazy, Suspense } from "react";
import { ChevronRight, ChevronDown, Check } from "lucide-react";

import Summary from "../Summary/Summary.jsx";
import BacklogAndSprints from "./BacklogAndSprints";
import Board from "../../Projects/manager/Board.jsx";
import Navbar from "../../../components/Navbar/Navbar";
import TestManagement from "../Testmanagement/TestManagementHome";
import RiskRegisterPage from "./riskManagement/RiskRegisterPage";
import RiskHealthModal from "./riskManagement/RiskHealthModal.jsx";

const ProjectDemandManagement = lazy(() => import("./ProjectDemandManagement"));
const ProjectConfigurations = lazy(() => import("./project/ProjectConfigurations"));
const ProjectRoleOffManagement = lazy(() => import("./ProjectRoleOffManagement"));

// ─── Tab skeleton loaders ────────────────────────────────────────────────────
const SkeletonBlock = ({ className }) => (
  <div className={`animate-pulse bg-slate-100 rounded ${className}`} />
);

const TabSkeleton = () => (
  <div className="p-6 space-y-4">
    <SkeletonBlock className="h-8 w-1/3" />
    <SkeletonBlock className="h-4 w-full" />
    <SkeletonBlock className="h-4 w-5/6" />
    <SkeletonBlock className="h-4 w-4/6" />
    <div className="grid grid-cols-3 gap-4 pt-4">
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
      <SkeletonBlock className="h-24" />
    </div>
  </div>
);

// ─── Resource Management Dropdown ───────────────────────────────────────────
const RESOURCE_TABS = [
  { name: "Demand",         tab: "demand-management" },
  { name: "RoleOff",        tab: "roleoff-management" },
  { name: "Configurations", tab: "configurations" },
];

const ResourceDropdown = ({ selectedTab, onSelect }) => {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef(null);
  const openTimer  = useRef(null);
  const menuRef    = useRef(null);

  const isActive = RESOURCE_TABS.some((t) => t.tab === selectedTab);
  const activeChild = RESOURCE_TABS.find((t) => t.tab === selectedTab);

  const scheduleOpen = () => {
    clearTimeout(closeTimer.current);
    openTimer.current = setTimeout(() => setOpen(true), 80);
  };

  const scheduleClose = () => {
    clearTimeout(openTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  // Keyboard support
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      setOpen((v) => !v);
    }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown" && open) {
      e.preventDefault();
      menuRef.current?.querySelector("button")?.focus();
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
    >
      {/* Trigger tab */}
      <button
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium
          transition-all duration-150 focus:outline-none focus-visible:ring-2
          focus-visible:ring-indigo-500 focus-visible:ring-offset-1
          ${isActive
            ? "bg-slate-100 text-slate-900"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}
        `}
      >
        Resource
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2.5}
        />
      </button>

      {/* Dropdown panel */}
      <div
        ref={menuRef}
        onMouseEnter={scheduleOpen}
        onMouseLeave={scheduleClose}
        className={`
          absolute top-full left-0 mt-1.5 w-44 bg-white border border-slate-200
          rounded-lg shadow-lg shadow-slate-200/60 overflow-hidden z-50
          transition-all duration-150 origin-top
          ${open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-1 pointer-events-none"}
        `}
        role="menu"
      >
        {RESOURCE_TABS.map((item, i) => (
          <button
            key={item.tab}
            role="menuitem"
            tabIndex={open ? 0 : -1}
            onClick={() => { onSelect(item.tab); setOpen(false); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                menuRef.current?.querySelectorAll("button")[i + 1]?.focus();
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                i === 0
                  ? menuRef.current?.previousSibling?.focus()
                  : menuRef.current?.querySelectorAll("button")[i - 1]?.focus();
              }
              if (e.key === "Escape") setOpen(false);
            }}
            className={`
              w-full flex items-center justify-between px-3.5 py-2.5 text-sm
              transition-colors duration-100 focus:outline-none focus-visible:bg-slate-50
              ${selectedTab === item.tab
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}
            `}
          >
            <span>{item.name}</span>
            {selectedTab === item.tab && (
              <Check className="w-3.5 h-3.5 text-indigo-500" strokeWidth={2.5} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const ProjectTabs = () => {
  const { projectId } = useParams();
  const location      = useLocation();
  const navigate      = useNavigate();
  const token         = localStorage.getItem("token");

  const [projectName, setProjectName] = useState("");
  const [notFound,    setNotFound]    = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);

  const getSelectedTabFromLocation = useCallback(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "summary";
  }, [location.search]);

  const [selectedTab, setSelectedTab] = useState(getSelectedTabFromLocation);

  useEffect(() => {
    setSelectedTab(getSelectedTabFromLocation());
  }, [getSelectedTabFromLocation]);

  // Auto-redirect test-management → overview sub-route
  useEffect(() => {
    const tab = new URLSearchParams(location.search).get("tab");
    if (tab === "test-management") {
      navigate(`/projects/${projectId}?tab=test-management/overview`, { replace: true });
    }
  }, [location.search, navigate, projectId]);

  // Fetch project name
  useEffect(() => {
    if (!projectId || !token) return;
    axios
      .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => { setProjectName(res.data.name); setNotFound(false); })
      .catch(() => setNotFound(true));
  }, [projectId, token]);

  // Risk modal: only show once per 24 h per project
  useEffect(() => {
    if (!projectId) return;
    const key       = `risk_modal_seen_${projectId}`;
    const lastSeen  = localStorage.getItem(key);
    const now       = Date.now();
    const ONE_DAY   = 24 * 60 * 60 * 1000;

    if (!lastSeen || now - parseInt(lastSeen, 10) > ONE_DAY) {
      setShowRiskModal(true);
      localStorage.setItem(key, String(now));
    }
  }, [projectId]);

  const goToTab = (tab) => navigate(`/projects/${projectId}?tab=${tab}`);

  // ─── Tab content ────────────────────────────────────────────────────────
  const renderTabContent = () => {
    if (!projectId) return null;
    const pid = parseInt(projectId, 10);

    if (selectedTab === "summary")         return <Summary projectId={pid} projectName={projectName} />;
    if (selectedTab === "backlog")         return <BacklogAndSprints projectId={pid} projectName={projectName} />;
    if (selectedTab === "board")           return <Board projectId={pid} projectName={projectName} />;
    if (selectedTab === "risk-management") return <RiskRegisterPage projectId={pid} />;
    if (selectedTab.startsWith("test-management")) return <TestManagement projectId={pid} />;

    if (selectedTab === "demand-management")
      return (
        <Suspense fallback={<TabSkeleton />}>
          <ProjectDemandManagement projectId={pid} projectName={projectName} />
        </Suspense>
      );
    if (selectedTab === "roleoff-management")
      return (
        <Suspense fallback={<TabSkeleton />}>
          <ProjectRoleOffManagement projectId={pid} projectName={projectName} />
        </Suspense>
      );
    if (selectedTab === "configurations")
      return (
        <Suspense fallback={<TabSkeleton />}>
          <ProjectConfigurations projectId={pid} />
        </Suspense>
      );

    return null;
  };

  // ─── Primary tabs ────────────────────────────────────────────────────────
  const PRIMARY_TABS = [
    { name: "Summary", tab: "summary" },
    { name: "Backlog",  tab: "backlog" },
    { name: "Board",    tab: "board" },
    { name: "Risk",     tab: "risk-management" },
    { name: "Test",     tab: "test-management" },
  ];

  // ─── Guards ──────────────────────────────────────────────────────────────
  if (!projectId) return <div className="p-6 text-slate-400">No project selected.</div>;
  if (notFound)   return <div className="p-6 text-red-500">Project not found.</div>;

  const isResourceTab = RESOURCE_TABS.some((t) => t.tab === selectedTab);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── TIER 1 · Context Header ─────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200">
        <div className="px-5 py-2.5 flex items-center gap-2 text-sm">

          {/* Breadcrumb */}
          <button
            onClick={() => navigate("/projects")}
            className="text-slate-400 hover:text-indigo-600 font-medium transition-colors duration-150"
          >
            Projects
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" strokeWidth={2} />

          <span className="text-slate-800 font-semibold truncate max-w-[280px]">
            {projectName || "—"}
          </span>
        </div>
      </header>

      {/* ── TIER 2 · Navigation Strip ───────────────────────────────── */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="px-5 flex items-center gap-1 h-11">

          {/* Primary tabs */}
          {PRIMARY_TABS.map((item) => {
            const active =
              selectedTab === item.tab ||
              (item.tab === "test-management" && selectedTab.startsWith("test-management"));

            return (
              <button
                key={item.tab}
                onClick={() => goToTab(item.tab)}
                className={`
                  px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                  focus-visible:ring-offset-1
                  ${active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}
                `}
              >
                {item.name}
              </button>
            );
          })}

          {/* Divider */}
          <div className="mx-2 h-4 w-px bg-slate-200 shrink-0" />

          {/* Resource Management dropdown */}
          <ResourceDropdown selectedTab={selectedTab} onSelect={goToTab} />
        </div>
      </nav>

      {/* ── Tab content ─────────────────────────────────────────────── */}
      <main>{renderTabContent()}</main>

      {/* Risk Health Modal (throttled to once per 24 h) */}
      <RiskHealthModal
        projectId={parseInt(projectId, 10)}
        open={showRiskModal}
        onClose={() => setShowRiskModal(false)}
      />
    </div>
  );
};

export default ProjectTabs;