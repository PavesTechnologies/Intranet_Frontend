import React from "react";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip } from "recharts";
import { TIME_TO_HIRE_TREND } from "../mock/analyticsMockData";

export default function AnalyticsTimeToHireChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="font-bold text-[14px] mb-4 text-slate-900">Time-to-hire trend</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={TIME_TO_HIRE_TREND}>
          <CartesianGrid stroke="#E6E9F0" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: "#5B6472" }} axisLine={false} tickLine={false} />
          <RTooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E9F0", fontSize: 12 }} />
          <Line type="monotone" dataKey="days" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
