import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { lazy, Suspense } from "react";
import { ArrowLeft } from "lucide-react";

import Summary from "../Summary/Summary.jsx";
import BacklogAndSprints from "./BacklogAndSprints";
import Board from "../../Projects/manager/Board.jsx";
import Timeline from "./Timeline";

import Navbar from "../../../components/Navbar/Navbar";
import TestManagement from "../Testmanagement/TestManagementHome";
import RiskRegisterPage from "./riskManagement/RiskRegisterPage";
import RiskHealthModal from "./riskManagement/RiskHealthModal.jsx";

const ProjectDemandManagement = lazy(() => import("./ProjectDemandManagement"));
const ProjectConfigurations = lazy(
  () => import("./project/ProjectConfigurations"),
);
const ProjectRoleOffManagement = lazy(
  () => import("./ProjectRoleOffManagement"),
);

const ProjectTabs = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [projectName, setProjectName] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false); // ✅ NEW

  // Get tab from URL OR default to summary
  const getSelectedTabFromLocation = () => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "summary";
  };

  const [selectedTab, setSelectedTab] = useState(getSelectedTabFromLocation());

  // Update selected tab when URL changes
  useEffect(() => {
    setSelectedTab(getSelectedTabFromLocation());
  }, [location.search]);

  // ⭐ Auto redirect test-management → overview
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");

    if (tab === "test-management") {
      navigate(`/projects/${projectId}?tab=test-management/overview`, {
        replace: true,
      });
    }
  }, [location.search, navigate, projectId]);

  // Fetch project details
  useEffect(() => {
    if (projectId && token) {
      axios
        .get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )
        .then((res) => {
          setProjectName(res.data.name);
          setNotFound(false);
        })
        .catch(() => {
          setNotFound(true);
        });
    }
  }, [projectId, token]);

  // ⭐ AUTO SHOW RISK MODAL WHEN PAGE LOADS
  useEffect(() => {
    if (projectId) {
      setShowRiskModal(true);
    }
  }, [projectId]);
  console.log(projectName);

  // Render tab content
  const renderTabContent = () => {
    if (!projectId) return null;
    const pid = parseInt(projectId, 10);

    if (selectedTab === "risk-management") {
      return <RiskRegisterPage projectId={pid} />;
    }
    if (selectedTab === "summary") {
      return <Summary projectId={pid} projectName={projectName} />;
    }
    if (selectedTab === "backlog") {
      return <BacklogAndSprints projectId={pid} projectName={projectName} />;
    }
    if (selectedTab === "board") {
      return <Board projectId={pid} projectName={projectName} />;
    }
    // if (selectedTab === "status-report") {
    //   return <ProjectStatusReportWrapper projectId={pid} />;
    // }
    // if (selectedTab === "timelines") {
    //   return <Timeline projectId={pid} />;
    // }
    if (selectedTab.startsWith("test-management")) {
      return <TestManagement projectId={pid} />;
    }
    if (selectedTab === "demand-management") {
      return (
        <Suspense
          fallback={
            <div className="p-12 text-center text-slate-400">
              Loading Demand Management...
            </div>
          }
        >
          <ProjectDemandManagement projectId={pid} projectName={projectName} />
        </Suspense>
      );
    }

    if (selectedTab === "roleoff-management") {
      return (
        <Suspense
          fallback={
            <div className="p-12 text-center text-slate-400">
              Loading Role-Off Management...
            </div>
          }
        >
          <ProjectRoleOffManagement projectId={pid} projectName={projectName} />
        </Suspense>
      );
    }

    if (selectedTab === "configurations") {
      return (
        <Suspense
          fallback={
            <div className="p-12 text-center text-slate-400">
              Loading Configurations...
            </div>
          }
        >
          <ProjectConfigurations projectId={pid} />
        </Suspense>
      );
    }

    return null;
  };

  if (!projectId) {
    return <div className="p-6 text-slate-400">No project selected.</div>;
  }

  if (notFound) {
    return <div className="p-6 text-red-500">Project not found.</div>;
  }

  const navItems = [
    { name: "Summary", tab: "summary" },
    { name: "Backlog", tab: "backlog" },
    { name: "Board", tab: "board" },
    { name: "Risk Management", tab: "risk-management" },
    { name: "Test Management", tab: "test-management" },
    { name: "Demand Management", tab: "demand-management" },
    { name: "RoleOff Management", tab: "roleoff-management" },
    { name: "Configurations", tab: "configurations" },
    //  { name: "Timelines", tab:"timelines" },
    // { name: "Calendar", tab: "calendar" },
  ];

  const navItemsWithActive = navItems.map((item) => ({
    name: item.name,
    onClick: () => navigate(`/projects/${projectId}?tab=${item.tab}`),
    isActive: selectedTab === item.tab,
  }));

  return (
    <div>
      {/* Header */}
      <header className="bg-white mb-4 px-4 py-3 flex items-center justify-between border-b">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-6">
          {/* Project Name */}
          <button
            onClick={() => navigate("/projects")}
            className="text-xl font-semibold text-slate-700 hover:text-indigo-600 transition"
          >
            {projectName || "Project"}
          </button>

          {/* Back Button */}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4">
          {/* Round Back Button (Positioned right before the Summary tab) */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-5 h-5 bg-white border border-gray-200 text-gray-600 rounded-full shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-3 h-3" strokeWidth={2.5} />
          </button>

          {/* Tab Navigation */}
          <Navbar logo={null} navItems={navItemsWithActive} />
        </div>
      </header>
      {/* Tab Content */}
      <div>{renderTabContent()}</div>

      {/* ✅ AUTO TRIGGER RISK HEALTH MODAL */}
      <RiskHealthModal
        projectId={parseInt(projectId, 10)}
        open={showRiskModal}
        onClose={() => setShowRiskModal(false)}
      />
    </div>
  );
};

export default ProjectTabs;
