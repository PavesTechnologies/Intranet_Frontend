import React from "react";

export default function Tabs({ activeTab, setActiveTab }) {
  const tabs = ["Profile", "Job"];

  return (
    <div className="flex border-b mb-4">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 ${
            activeTab === tab
              ? "border-b-2 border-indigo-700 text-indigo-700"
              : "text-gray-500"
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
