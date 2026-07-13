import React from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { TOP_SKILLS } from "../mock/analyticsMockData";

export default function AnalyticsTopSkillsChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="font-bold text-[14px] mb-4 text-slate-900">Top in-demand skills</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={TOP_SKILLS} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid horizontal={false} stroke="#E6E9F0" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="skill" width={80} tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
          <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E9F0", fontSize: 12 }} />
          <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="#16A34A" barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
