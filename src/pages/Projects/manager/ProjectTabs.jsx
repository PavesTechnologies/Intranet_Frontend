import React, { useEffect, useState, lazy, Suspense } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Plus, ChevronDown, Settings, UserMinus, TrendingUp } from "lucide-react";

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

const ProjectTabs = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [projectName, setProjectName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const getSelectedTabFromLocation = () => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "summary";
  };

  const [selectedTab, setSelectedTab] = useState(getSelectedTabFromLocation());

  useEffect(() => {
    setSelectedTab(getSelectedTabFromLocation());
    setShowMoreMenu(false);
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "test-management") {
      navigate(`/projects/${projectId}?tab=test-management/overview`, { replace: true });
    }
  }, [location.search, navigate, projectId]);

  useEffect(() => {
    if (projectId && token) {
      axios
        .get(`${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          setProjectName(res.data.name);
          setNotFound(false);
        })
        .catch(() => setNotFound(true));
    }
  }, [projectId, token]);

  useEffect(() => {
    if (projectId) setShowRiskModal(true);
  }, [projectId]);

  const mainNavItems = [
    { name: "Summary", tab: "summary" },
    { name: "Backlog", tab: "backlog" },
    { name: "Board", tab: "board" },
    { name: "Risk Management", tab: "risk-management" },
    { name: "Test Management", tab: "test-management" },
  ];

  const moreOptions = [
    { name: "Demand Management", tab: "demand-management", icon: <TrendingUp size={14} /> },
    { name: "RoleOff Management", tab: "roleoff-management", icon: <UserMinus size={14} /> },
    { name: "Configurations", tab: "configurations", icon: <Settings size={14} /> },
  ];

  const navItemsWithActive = mainNavItems.map((item) => ({
    name: item.name,
    onClick: () => navigate(`/projects/${projectId}?tab=${item.tab}`),
    isActive: selectedTab === item.tab || (item.tab === "test-management" && selectedTab.startsWith("test-management")),
  }));

  const renderTabContent = () => {
    if (!projectId) return null;
    const pid = parseInt(projectId, 10);
    if (selectedTab === "risk-management") return <RiskRegisterPage projectId={pid} />;
    if (selectedTab === "summary") return <Summary projectId={pid} projectName={projectName} />;
    if (selectedTab === "backlog") return <BacklogAndSprints projectId={pid} projectName={projectName} />;
    if (selectedTab === "board") return <Board projectId={pid} projectName={projectName} />;
    if (selectedTab.startsWith("test-management")) return <TestManagement projectId={pid} />;
    
    if (selectedTab === "demand-management") {
      return (
        <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Demand...</div>}>
          <ProjectDemandManagement projectId={pid} projectName={projectName} />
        </Suspense>
      );
    }
    if (selectedTab === "roleoff-management") {
      return (
        <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Role-Off...</div>}>
          <ProjectRoleOffManagement projectId={pid} projectName={projectName} />
        </Suspense>
      );
    }
    if (selectedTab === "configurations") {
      return (
        <Suspense fallback={<div className="p-12 text-center text-slate-400">Loading Configs...</div>}>
          <ProjectConfigurations projectId={pid} />
        </Suspense>
      );
    }
    return null;
  };

  if (notFound) return <div className="p-6 text-red-500">Project not found.</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header Container */}
      <header className="bg-white px-6 py-2 flex items-center justify-between ">
        
        {/* Left Section: Project Title */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-sm">
            {projectName?.charAt(0) || "P"}
          </div>
          <button
            onClick={() => navigate("/projects")}
            className="text-md font-semibold text-slate-800 hover:text-indigo-600 transition"
          >
            {projectName || "Project"}
          </button>
        </div>

        {/* Right Section: Navigation Items Aligned Right */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-8 h-8 hover:bg-slate-100 rounded-full transition-all "
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Standard Tabs - Aligned right by parent flex */}
          <div className="flex items-center border-none">
            <Navbar 
                logo={null} 
                navItems={navItemsWithActive} 
                className="!border-none !shadow-none bg-transparent" // Removing lines/borders
            />
          </div>

          {/* Jira-style "+" Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-all ${
                  moreOptions.some(opt => opt.tab === selectedTab) 
                  ? "text-indigo-600 bg-indigo-50" 
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Plus className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${showMoreMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMoreMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-20 py-2">
                  {moreOptions.map((option) => (
                    <button
                      key={option.tab}
                      onClick={() => navigate(`/projects/${projectId}?tab=${option.tab}`)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        selectedTab === option.tab 
                        ? "bg-indigo-50 text-indigo-700 font-semibold" 
                        : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className={selectedTab === option.tab ? "text-indigo-600" : "text-slate-400"}>
                        {option.icon}
                      </span>
                      {option.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="p-0 overflow-auto">
        {renderTabContent()}
      </main>

      <RiskHealthModal
        projectId={parseInt(projectId, 10)}
        open={showRiskModal}
        onClose={() => setShowRiskModal(false)}
      />
    </div>
  );
};

export default ProjectTabs;