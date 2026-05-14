import { useState, useEffect } from "react";
import AppCard from "./AppCard";
import LoadingSpinner from "../LoadingSpinner";
import { User } from "lucide-react";
import Working from "../icons/working.svg";

const MOCK_EMPLOYEES = [
  { id: 1, name: "Riya Sharma", leaveType: "Earned Leave", duration: "Full day" },
  { id: 2, name: "Arjun Mehta", leaveType: "Sick Leave", duration: "Full day" },
  { id: 3, name: "Priya Nair", leaveType: "Comp Off", duration: "Half day" },
];

const AVATAR_COLORS = [
  "bg-teal-400", "bg-rose-400", "bg-blue-400", "bg-violet-400",
  "bg-orange-400", "bg-emerald-400", "bg-pink-400", "bg-indigo-400",
];

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function EmployeeCard({ employee }) {
  const initials = getInitials(employee.name);
  const color = getColor(employee.name);
  const firstName = employee.name.trim().split(/\s+/)[0];

  return (
    <div className="group relative flex flex-col items-center gap-1.5 transition-all duration-200 hover:-translate-y-1">
      {/* Tooltip */}
      {employee.duration && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gray-900/90 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-20 pointer-events-none translate-y-2 group-hover:translate-y-0">
          {employee.duration}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/90" />
        </div>
      )}

      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center font-semibold text-white text-xs shadow-sm border-2 border-white`}>
        {initials}
      </div>

      {/* First name */}
      <span className="text-[10px] font-semibold text-gray-600 max-w-[52px] truncate text-center leading-tight">
        {firstName}
      </span>
    </div>
  );
}

export default function TodayOnLeavePanel() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: replace with real API call when endpoint is ready
    // const res = await todayOnLeave(); setEmployees(res?.data ?? res ?? []);
    setEmployees(MOCK_EMPLOYEES);
    setLoading(false);
  }, []);

  return (
    <AppCard
      density="comfortable"
      renderHeader={() => (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-amber-400" />
            <span className="text-sm font-semibold text-gray-800">Today on Leave</span>
          </div>
          {!loading && employees.length > 0 && (
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              {employees.length} out
            </span>
          )}
        </div>
      )}
    >
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <LoadingSpinner text="Loading..." />
        </div>
      ) : employees.length === 0 ? (
        <div className="flex items-center gap-2 py-1">
          {/* <User size={15} className="text-gray-400" strokeWidth={2.5} /> */}
          <p className="text-xs text-gray-400 italic font-semibold">No one is on leave today</p>
          <img src={Working} alt="working" width={100} height={10} />
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {employees.map((emp, i) => (
            <EmployeeCard key={emp.id ?? i} employee={emp} />
          ))}
        </div>
      )}
    </AppCard>
  );
}