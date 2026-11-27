import AppCard from "./AppCard";
import { CheckCircle2 } from "lucide-react";

const AVATAR_COLORS = [
  "bg-teal-500", "bg-rose-500", "bg-blue-500", "bg-violet-500",
  "bg-orange-500", "bg-emerald-500", "bg-pink-500", "bg-indigo-500",
];

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function EmployeeCard({ employee }) {
  return (
    <li className="flex min-w-0 items-center gap-2.5 rounded-xl border border-[#EEF0F7] bg-[#FAFBFE] p-2 pr-3 transition hover:border-[#D9DCEC] hover:bg-white">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white shadow-sm ${getColor(employee.employeeName)}`}>
        {getInitials(employee.employeeName)}
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[13px] font-semibold text-[#0A174E]" title={employee.employeeName}>
          {employee.employeeName}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-[#78716C]">{employee.session || "On leave"}</p>
      </div>
    </li>
  );
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 animate-pulse">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-xl border border-[#EEF0F7] p-2">
          <div className="h-9 w-9 rounded-full bg-[#EEF0F7]" />
          <div className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-[#EEF0F7]" />
            <div className="h-2.5 w-14 rounded bg-[#EEF0F7]" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Colleagues on leave today. Data is fetched by the Dashboard and passed in. */
export default function TodayOnLeavePanel({ employees = [], loading = false }) {
  return (
    <AppCard
      density="comfortable"
      renderHeader={() => (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="h-1 w-6 rounded bg-gradient-to-r from-[#0A0082] to-[#FF3D72]" />
            <span className="font-heading text-sm font-semibold text-[#0A174E]">Who&apos;s Out Today</span>
          </div>
          {!loading && employees.length > 0 && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
              {employees.length} out
            </span>
          )}
        </div>
      )}
    >
      {loading ? (
        <SkeletonRow />
      ) : employees.length === 0 ? (
        <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50/70 px-3 py-2.5">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <p className="text-xs text-emerald-800">
            <span className="font-semibold">Full house today.</span> No one is on leave.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {employees.map((emp, i) => (
            <EmployeeCard key={emp.id ?? i} employee={emp} />
          ))}
        </ul>
      )}
    </AppCard>
  );
}
