"use client";

import { NavLink, useParams } from "react-router-dom";
import { FileText, PenTool, Play, Bug } from "lucide-react";

export default function TopTabs({ selectedTab }) {
  const { projectId } = useParams();
  console.log("Project ID in TopTabs:", projectId);

  // ⭐ 1. Define the tabs that are actually visible
  const validTabs = [
    "test-management/test-plans",
    "test-management/test-design",
    "test-management/test-execution",
    "test-management/test-bugs"
  ];

  // ⭐ 2. If the parent passes an invalid tab (like "overview"), force it to "test-plans"
  const activeTab = validTabs.includes(selectedTab) 
    ? selectedTab 
    : "test-management/test-plans";

  const tabs = [
    {
      name: "Test Plans",
      path: `/projects/${projectId}?tab=test-management/test-plans`,
      tab: "test-management/test-plans",
      icon: <FileText size={16} />,
    },
    {
      name: "Test Design",
      path: `/projects/${projectId}?tab=test-management/test-design`,
      tab: "test-management/test-design",
      icon: <PenTool size={16} />,
    },
    {
      name: "Test Execution",
      path: `/projects/${projectId}?tab=test-management/test-execution`,
      tab: "test-management/test-execution",
      icon: <Play size={16} />,
    },
    {
      name: "Bugs",
      path: `/projects/${projectId}?tab=test-management/test-bugs`,
      tab: "test-management/test-bugs", 
      icon: <Bug size={16} />,
    },
  ];

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="flex gap-6 px-6 py-3">
        {tabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            end
            className={`
              flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${
                activeTab === tab.tab
                  ? "bg-[#02195c] text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-50 hover:text-[#181818]"
              }
            `}
          >
            {tab.icon}
            {tab.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}