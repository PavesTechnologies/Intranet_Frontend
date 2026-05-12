"use client";

import { NavLink, useParams } from "react-router-dom";
import { FileText, PenTool, Play, Bug } from "lucide-react";

export default function TopTabs({ selectedTab }) {
  const { projectId } = useParams();

  const validTabs = [
    "test-management/test-plans",
    "test-management/test-design",
    "test-management/test-execution",
    "test-management/test-bugs",
  ];

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
    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200 flex-shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <NavLink
            key={tab.name}
            to={tab.path}
            end
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.tab
                ? "bg-indigo-900 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className={activeTab === tab.tab ? "text-white" : "text-slate-500"}>
              {tab.icon}
            </span>
            {tab.name}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
