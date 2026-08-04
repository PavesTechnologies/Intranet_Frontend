// src/components/ProjectDashboard/DetailRow.jsx
import React from "react";

const DetailRow = ({ label, value }) => (
  value ? (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-700 break-words">{value}</span>
    </div>
  ) : null
);

export default DetailRow;
