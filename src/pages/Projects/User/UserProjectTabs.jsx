import React, { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";

// Component imports
import Summary from "./UserSummary";
import Backlog from "./UserBacklog/userbacklog";
import Board from "./UserBoard";
import SprintBoard from "./UserSprint/SprintBoard";
import Lists from "./UserLists";
import Navbar from "../../../components/Navbar/Navbar";

const ProjectTabs = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [projectName, setProjectName] = useState("");
  const [notFound, setNotFound] = useState(false);

  const token = localStorage.getItem("token"); // JWT token

  // Get tab from URL (default to "summary")
  const getSelectedTabFromLocation = () => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "summary";
  };

  const [selectedTab, setSelectedTab] = useState(getSelectedTabFromLocation());

  // Fetch project name with token
  useEffect(() => {
    if (projectId) {
      api
        .get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        )
        .then((res) => {
          setProjectName(res.data.name);
          setNotFound(false);
        })
        .catch(() => setNotFound(true));
    }
  }, [projectId, token]);

  // Update tab when location changes
  useEffect(() => {
    setSelectedTab(getSelectedTabFromLocation());
  }, [location.search]);

  // Render content for each tab
  const renderTabContent = () => {
    if (!projectId) return null;
    const pid = parseInt(projectId, 10);

    switch (selectedTab) {
      case "summary":
        return <Summary projectId={pid} projectName={projectName} />;
      case "backlog":
        return <Backlog projectId={pid} projectName={projectName} />;
      case "board":
        return <Board projectId={pid} projectName={projectName} />;
      case "sprint":
        return <SprintBoard projectId={pid} projectName={projectName} />;
      case "lists":
        return <Lists projectId={pid} />;
      default:
        return null;
    }
  };

  if (!projectId) {
    return <div className="p-6 text-slate-400">No project selected.</div>;
  }

  if (notFound) {
    return <div className="p-6 text-red-500">Project not found.</div>;
  }

  // Navigation items
  const navItems = [
    { name: "Summary", tab: "summary" },
    { name: "Backlog", tab: "backlog" },
    { name: "Board", tab: "board" },
    { name: "Sprints", tab: "sprint" },
    { name: "Lists", tab: "lists" },
  ];

  // Convert nav items to match Navbar prop expectations
  const navItemsWithActive = navItems.map((item) => ({
    name: item.name,
    onClick: () => navigate(`/projects/user/${projectId}?tab=${item.tab}`),
    isActive: selectedTab === item.tab,
  }));

  return (
    <div className="flex flex-col h-screen">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-indigo-900 leading-none mr-4">
            {projectName}
          </h2>
          <Navbar logo={null} navItems={navItemsWithActive} />
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1 overflow-auto bg-slate-50">
        <div className="max-w-7xl mx-auto w-full px-4 py-4">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
};

export default ProjectTabs;
