import React from 'react';
import { Briefcase, AlertTriangle, Activity, BarChart3 } from 'lucide-react';
import { KPICard } from '../../../components/kpi/KPI';

const ProjectKPIs = ({ stats }) => {
  const cards = [
    { label: "Total Projects", value: stats.totalProjects, icon: Briefcase, color: "bg-blue-50 text-blue-600" },
    { label: "Active Projects", value: stats.activeProjects, icon: Activity, color: "bg-green-50 text-green-600" },
    { label: "High Risk Projects", value: stats.highRisk, icon: AlertTriangle, color: "bg-red-50 text-red-600" },
    { label: "Avg. Resource Util", value: stats.avgUtilization, icon: BarChart3, color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <KPICard
          key={index}
          label={card.label}
          value={card.value}
          icon={<card.icon className="h-5 w-5" />}
          color={card.color}
        />
      ))}
    </div>
  );
};

export default ProjectKPIs;