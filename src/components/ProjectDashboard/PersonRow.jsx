// src/components/ProjectDashboard/PersonRow.jsx
import React from "react";

const getInitials = (name) => {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];
const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

const ROLE_COLORS = {
  indigo:  "bg-indigo-50 text-indigo-700 border border-indigo-200",
  violet:  "bg-violet-50 text-violet-700 border border-violet-200",
  blue:    "bg-blue-50 text-blue-700 border border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  default: "bg-slate-100 text-slate-500 border border-slate-200",
};

const PersonRow = ({ role, name, email, subtitle, roleColor }) => {
  if (!name) return null;
  const badgeCls = ROLE_COLORS[roleColor] ?? ROLE_COLORS.default;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(name)}`}>
        {getInitials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
        <p className="text-xs text-slate-400 truncate">{email || subtitle || ""}</p>
      </div>
      {role && (
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${badgeCls}`}>
          {role}
        </span>
      )}
    </div>
  );
};

export default PersonRow;
