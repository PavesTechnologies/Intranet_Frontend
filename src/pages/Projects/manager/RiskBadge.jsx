import React from "react";

// Maps singular type (from API/issue objects) → plural label used in RiskRegisterPage
const TYPE_LABEL = { Story: "Stories", Task: "Tasks", Epic: "Epics", Bug: "Bugs" };

const RiskBadge = ({ count, issueType, issueId, projectId, navigate }) => {
  if (!count || count <= 0) return null;

  const handleClick = (e) => {
    e.stopPropagation();
    navigate(`/projects/${projectId}?tab=risk-management`, {
      state: {
        linkedType:  issueType,
        linkedId:    issueId,
        activeLabel: TYPE_LABEL[issueType] ?? "All",
      },
    });
  };

  return (
    <button
      onClick={handleClick}
      title={`${count} risk${count > 1 ? "s" : ""} associated — click to view`}
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors shrink-0 whitespace-nowrap"
    >
      ⚠ {count} {count === 1 ? "risk" : "risks"}
    </button>
  );
};

export default RiskBadge;
