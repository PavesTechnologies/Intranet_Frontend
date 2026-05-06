// src/pages/resource_management/projects/components/ProjectKPIs.jsx
import React from 'react';
import { Briefcase, AlertTriangle, Activity, BarChart3 } from 'lucide-react';

const ProjectKPIs = ({ stats }) => {
  const cards = [
    { label: "Total Projects", value: stats.totalProjects, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Projects", value: stats.activeProjects, icon: Activity, color: "text-green-600", bg: "bg-green-50" },
    { label: "High Risk Projects", value: stats.highRisk, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    { label: "Avg. Resource Util", value: stats.avgUtilization, icon: BarChart3, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-gray-500 text-xs font-medium uppercase truncate">{card.label}</p>
            <h3 className="text-2xl font-bold text-[#081534] mt-1 truncate" title={String(card.value)}>{card.value}</h3>
          </div>
          <div className={`p-3 rounded-full shrink-0 ${card.bg}`}>
            <card.icon className={`h-6 w-6 ${card.color}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectKPIs;