import React from "react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { ATS_SCORE_DISTRIBUTION } from "../mock/analyticsMockData";

export default function AnalyticsAtsDistributionChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="font-bold text-[14px] mb-4 text-slate-900">ATS score distribution</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={ATS_SCORE_DISTRIBUTION}>
          <CartesianGrid stroke="#E6E9F0" vertical={false} />
          <XAxis dataKey="bucket" tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
          <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E9F0", fontSize: 12 }} />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#7C3AED" barSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
