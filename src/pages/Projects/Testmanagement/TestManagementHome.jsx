"use client";

import TopTabs from "./TopTabs";
import { useParams, useLocation } from "react-router-dom";

import Overview from "./Overview";
import TestPlans from "./TestPlans";
import TestDesign from "./TestDesign/TestDesign";
import TestExecution from "./TestExecution/TestExecution";
import BugPage from "./Bug/BugPage";

import { useEffect, useState } from "react";

export default function TestManagement() {
  const { projectId } = useParams();
  const location = useLocation();

  const getSelectedTabFromLocation = () => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || "test-management/test-plans";
  };

  const [selectedTab, setSelectedTab] = useState(getSelectedTabFromLocation());

  useEffect(() => {
    setSelectedTab(getSelectedTabFromLocation());
  }, [location.search]);

  const renderTabContent = () => {
    switch (selectedTab) {
      // case "test-management/overview":
      //   return <Overview projectId={projectId} />;

      case "test-management/test-plans":
        return <TestPlans projectId={projectId} />;

      case "test-management/test-design":
        return <TestDesign projectId={projectId} />;

      case "test-management/test-execution":
        return <TestExecution projectId={projectId} />;

      case "test-management/test-bugs":
        return <BugPage projectId={projectId} />;

      default:
        return <TestPlans  projectId={projectId} />;
    }
  };

  return (
    <div
      className="flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden"
      style={{ height: "calc(100vh - 64px)" }}
    >
      <TopTabs selectedTab={selectedTab} projectId={projectId} />
      <div className="flex-1 min-h-0 overflow-hidden">{renderTabContent()}</div>
    </div>
  );
}