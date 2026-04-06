import React, { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronDown, CheckCircle, Users, Clock, Info } from "lucide-react";
import StatusBadge from "../../../components/status/statusbadge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";


const STATUS = {
  JOINING: "JOINING",
  COMPLETED: "COMPLETED",
};

const REFERENCE_TODAY = new Date("2026-04-01T00:00:00");

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const endOfDay = (date) => {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
};

const addDays = (date, days) => {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
};

const addMonths = (date, months) => {
  const value = new Date(date);
  value.setMonth(value.getMonth() + months);
  return value;
};

const getWeekStart = (date) => {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(value, diff);
};

const getWeekEnd = (date) => endOfDay(addDays(getWeekStart(date), 6));

const getMonthStart = (date) =>
  startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));

const getMonthEnd = (date) =>
  endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));

const formatDate = (value, options = {}) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
};


const getDateRange = (filter) => {
  const today = new Date(REFERENCE_TODAY);

  switch (filter) {
    case "Previous Week": {
      const previousWeek = addDays(today, -7);
      return {
        start: getWeekStart(previousWeek),
        end: getWeekEnd(previousWeek),
      };
    }
    case "Previous Month": {
      const previousMonth = addMonths(today, -1);
      return {
        start: getMonthStart(previousMonth),
        end: getMonthEnd(previousMonth),
      };
    }
    case "This Month":
      return {
        start: getMonthStart(today),
        end: getMonthEnd(today),
      };
    case "This Week":
    default:
      return {
        start: getWeekStart(today),
        end: getWeekEnd(today),
      };
  }
};

const getWeekChunksInMonth = (date) => {
  const monthStart = getMonthStart(date);

  return Array.from({ length: 5 }, (_, index) => {
    const start = addDays(monthStart, index * 7);
    const end = endOfDay(addDays(start, 6));

    return {
      label: `Week ${index + 1}`,
      start,
      end,
    };
  });
};



function FilterDropdown({
  filter,
  setFilter,
  showFilterDropdown,
  setShowFilterDropdown,
  filterRef,
}) {
  return (
    <div className="relative" ref={filterRef}>
      <button
        onClick={() => setShowFilterDropdown((value) => !value)}
        className="inline-flex h-8 items-center gap-2 rounded-full border border-[#dbe4ef] bg-white px-3 text-xs font-medium text-[#64748b]"
      >
        <Calendar className="h-3.5 w-3.5" />
        {filter}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {showFilterDropdown && (
        <div className="absolute left-0 z-20 mt-2 w-44 rounded-xl border border-white/40 bg-white shadow-xl backdrop-blur-md p-1">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              onClick={() => {
                setFilter(option);
                setShowFilterDropdown(false);
              }}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                filter === option
                  ? "bg-[#f3f7fb] font-semibold text-[#0f172a]"
                  : "text-[#64748b] hover:bg-[#f8fafc]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, subtitle }) {
  return (
    <div className="min-h-[120px] rounded-xl border border-white/40 bg-white/80 backdrop-blur-md px-6 py-5 shadow-lg">
      <div className="flex items-start justify-between">
        <div className={`h-1 w-10 rounded-full ${title === "Completed" ? "bg-green-500" : "bg-orange-500"}`} >
          <p className="text-[10px] font-semibold text-[#475569]">{title}</p>
          <p className="mt-2 text-[34px] font-bold leading-none text-[#0f172a]">
            {value}
          </p>
        </div>
        <div className="rounded-full border border-[#dbe4ef] p-1.5 text-[#94a3b8]">
          <Info className="h-3 w-3" />
        </div>
      </div>
      <p className="mt-4 text-[10px] text-[#94a3b8]">{subtitle}</p>
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="rounded-xl border border-white/40 bg-white shadow-md p-5 transition hover:shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-[#0f172a]">{title}</h2>
          <p className="text-[10px] text-[#94a3b8]">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur-md">
        <p className="mb-2 text-xs font-semibold text-slate-800">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-slate-500 capitalize">{entry.name}</span>
              </div>
              <span className="font-semibold text-slate-900">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function MonthlyGraph({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 10, fill: '#64748b' }}
          dy={10}
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Legend 
          iconType="square" 
          iconSize={8} 
          wrapperStyle={{ fontSize: '10px', color: '#64748b', paddingTop: '10px' }} 
        />
        <Bar dataKey="completed" name="Completed" stackId="a" fill="#18a56f" radius={[0, 0, 2, 2]} barSize={80} />
        <Bar dataKey="joining" name="Joining" stackId="a" fill="#43b3e8" radius={[2, 2, 0, 0]} barSize={80} />
      </BarChart>
    </ResponsiveContainer>
  );
}


function WeeklyGraph({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barCategoryGap="40%">
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
        <XAxis 
          dataKey="name" 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#64748b' }}
          interval={0}
          
        />
        <YAxis 
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Legend 
          iconType="square" 
          iconSize={8} 
          wrapperStyle={{ fontSize: '10px', color: '#64748b', paddingTop: '10px' }} 
        />
        <Bar dataKey="completed" name="Completed" stackId="a" fill="#157a74" radius={[0, 0, 2, 2]} barSize={50} />
        <Bar dataKey="joining" name="Joining" stackId="a" fill="#f59e0b" radius={[2, 2, 0, 0]} barSize={50} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function WeeklyDashboard() {
  const [filter, setFilter] = useState("This Week");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const filterRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState(null);
  const [dateRange, setDateRange] = useState({
  start: new Date(),
  end: new Date(),
});
const formatDateSafe = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
  const fetchDashboard = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/weekly-joining-report/dashboard/?start_date=${formatDateSafe(dateRange.start)}&end_date=${formatDateSafe(dateRange.end)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await response.json();
      setApiData(data);

    } catch (error) {
      console.error("API Error:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchDashboard();
}, [dateRange]);


  const selectedCandidates = apiData?.joinedCandidates || [];

  const summary = {
  completed: apiData?.summary?.joined || 0,
  joining: apiData?.summary?.pending || 0,
  total: apiData?.joinedCandidates?.length || 0,
};

const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const weeklyData = (apiData?.weeklyJoinings || [])
  .map(item => ({
    name: item.day,
    completed: item.completed,
    joining: item.joining
  }))
  .sort((a, b) => dayOrder.indexOf(a.name) - dayOrder.indexOf(b.name));

const monthlyData = apiData?.monthlyJoinings?.map(item => ({
  name: item.week,
  completed: item.completed,
  joining: item.joining
})) || [];
  
const activities = apiData?.activities?.map((item, index) => ({
  id: index,
  title: item.message.split(" ")[0], // name
  subtitle: "", // optional
  meta: item.time,
  status: item.type === "Completed" ? STATUS.COMPLETED : STATUS.JOINING
})) || [];

  return (
    <div  className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-[#eef4ff] to-[#f1f5f9] p-4 sm:p-6">
      <div className="mx-auto max-w-[1180px] space-y-4">
<div className="flex items-start justify-between mb-6">

  <div>
    <h1 className="text-3xl font-bold text-slate-900">
      Joining Report Dashboard
    </h1>
    <p className="text-sm text-slate-500 mt-1">
      Overview of weekly joining and completion trends for new hires
    </p>
  </div>

  {/* FILTER RIGHT */}
  <div className="relative" ref={filterRef}>
    <button
      onClick={() => setShowFilterDropdown((v) => !v)}
      className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm hover:shadow-md transition"
    >
      <Calendar size={16} />
      {dateRange.start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - {dateRange.end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      <ChevronDown size={16} />
    </button>

    {showFilterDropdown && (
      <div className="absolute right-0 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white shadow-xl z-20 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Select Date Range
        </p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] text-slate-400 font-medium">Start Date</label>
            <input
              type="date"
              value={formatDateSafe(dateRange.start)}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setDateRange(prev => ({
                    ...prev,
                    start: new Date(value)
                  }));
                }
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="mt-5 text-slate-300 font-medium">-</div>

          <div className="flex flex-col gap-1 w-full">
            <label className="text-[10px] text-slate-400 font-medium">End Date</label>
            <input
              type="date"
              value={formatDateSafe(dateRange.end)}
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setDateRange(prev => ({
                    ...prev,
                    start: new Date(value)
                  }));
                }
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>
    )}
  </div>
</div>


{/* KPI CARDS */}
<div className="grid gap-5 md:grid-cols-2">

  {/* COMPLETED */}
  <div className="relative rounded-2xl bg-white shadow-md border border-slate-200 p-6 hover:shadow-lg transition">

    {/* Accent */}
    <div className="absolute top-0 left-6 h-1 w-[480px] bg-green-500 rounded-full"></div>

    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-600">Completed</p>
        <h2 className="text-4xl font-bold mt-3 text-slate-900">
          {apiData?.summary?.joined ||0}
        </h2>
      </div>

      {/* ICON */}
      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-50 text-green-600">
        <CheckCircle size={18} />
      </div>
    </div>

    <p className="text-sm text-slate-500 mt-4">
      Candidates already crossed the joining day inside the selected period
    </p>
  </div>


  {/* JOINING */}
  <div className="relative rounded-2xl bg-white shadow-md border border-slate-200 p-6 hover:shadow-lg transition">

    {/* Accent */}
    <div className="absolute top-0 left-6 h-1 w-[480px] bg-orange-400 rounded-full"></div>

    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-600">Joining</p>
        <h2 className="text-4xl font-bold mt-3 text-slate-900">
          {apiData?.summary?.pending || 0}
        </h2>
      </div>

      {/* ICON */}
      <div className="h-10 w-10 flex items-center justify-center rounded-full bg-orange-50 text-orange-500">
        <Clock size={18} />
      </div>
    </div>

    <p className="text-sm text-slate-500 mt-4">
      Candidates still waiting for their joining day inside the selected period
    </p>
  </div>

</div>
        <Section
          title="Monthly Flow"
          subtitle="Weekly blocks for the current month with the same completed vs joining logic."
        >
          <div className="h-[240px]">
            <MonthlyGraph data={monthlyData} />
          </div>
        </Section>
        <Section
          title="Weekly View"
          subtitle="Week selection is grouped day by day."
          action={
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#f59e0b]">
              This Week
            </span>
          }
        >
          <div className="h-[240px]">
            <WeeklyGraph data={weeklyData} />
          </div>
        </Section>
         <Section
          title="Candidate Table"
          subtitle="Table rows follow the exact same selected-range logic as the KPI cards and charts."
          action={
            <span className="inline-flex items-center gap-1 rounded-full border border-[#dbe4ef] bg-white px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#94a3b8]">
              <Users className="h-2.5 w-2.5" />
              {summary.total} records
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] overflow-hidden rounded-xl border border-white/40 bg-white shadow-sm text-left">
              <thead>
                <tr className="bg-[#f7faff] text-[9px] uppercase tracking-[0.18em] text-[#94a3b8]">
                  <th className="px-3 py-3 font-semibold">Candidate</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Department</th>
                  <th className="px-3 py-3 font-semibold">Joining Date</th>
                  <th className="px-3 py-3 font-semibold">Manager</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf2f7] bg-white">
              {selectedCandidates.map((candidate, index) => (
            <tr key={index} className="text-[11px] text-[#64748b]">
              <td className="px-3 py-3">
                <div className="font-semibold text-[#334155]">{candidate.name}</div>
              </td>

              <td className="px-3 py-3">{candidate.role}</td>

              <td className="px-3 py-3">
                {candidate.department || "N/A"}
              </td>

              <td className="px-3 py-3">
                {formatDate(candidate.joiningDate)}
              </td>

              <td className="px-3 py-3">-</td>

              <td className="px-3 py-3">
                <StatusBadge
                  label={candidate.status}
                  size="sm"
                />
              </td>
            </tr>
          ))}
          </tbody>
            </table>
          </div>
        </Section>

      <Section
      title="Recent Activities"
      subtitle="Only joining and completed actions are shown for the selected period."
    >
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition hover:-translate-y-1"
        >
          {/* NAME */}
          <p className="text-sm font-semibold text-slate-900">
            {activity.title}
          </p>

          {/* DEPARTMENT */}
          <p className="text-xs text-slate-500 mt-1">
            {activity.subtitle}
          </p>

          {/* DATE + LOCATION */}
          <p className="text-xs text-slate-400 mt-3">
            {activity.meta}
          </p>

          {/* STATUS */}
          <div className="mt-4">
            <span
              className={`text-[10px] font-semibold px-3 py-1 rounded-full ${
                activity.status === STATUS.COMPLETED
                  ? "bg-green-100 text-green-600"
                  : "bg-orange-100 text-orange-600"
              }`}
            >
              {activity.status === STATUS.COMPLETED ? "Completed" : "Joining"}
            </span>
          </div>
        </div>
      ))}
    </div>
    </Section>
      </div>
    </div>
  );
}
