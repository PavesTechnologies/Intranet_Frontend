import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Receipt,
  UserCheck,
  ClipboardList,
  LogOut,
  UserCog,
} from "lucide-react";


/* ================= LOGIN DATA ================= */
const loginData = [
  { day: "30 Jan", count: 1 },
  { day: "31 Jan", count: 0 },
  { day: "01 Feb", count: 0 },
  { day: "02 Feb", count: 4 },
  { day: "03 Feb", count: 2 },
  { day: "04 Feb", count: 1 },
  { day: "05 Feb", count: 0 },
  { day: "06 Feb", count: 1 },
  { day: "07 Feb", count: 0 },
  { day: "08 Feb", count: 0 },
  { day: "09 Feb", count: 0 },
  { day: "10 Feb", count: 2 },
  { day: "11 Feb", count: 2 },
  { day: "12 Feb", count: 2 },
  { day: "13 Feb", count: 2 },
];

/* ================= STATS ================= */
const employeesStats = [
  { label: "Total headcount", value: 26, trend: "+1" },
  { label: "Registered", value: 26 },
  { label: "Not invited", value: 0 },
  { label: "Yet to register", value: 0 },
];

/* ================= PENDING ================= */
const pending = [
  { label: "Documents", value: 7, icon: FileText, bg: "#f3e8ff", color: "#7c3aed" },
  { label: "Expenses", value: 0, icon: Receipt, bg: "#dcfce7", color: "#16a34a" },
  { label: "Probations", value: 0, icon: UserCheck, bg: "#fee2e2", color: "#ef4444" },
  { label: "Onboarding Tasks", value: 347, icon: ClipboardList, bg: "#fef3c7", color: "#ca8a04" },
  { label: "Exit Tasks", value: 0, icon: LogOut, bg: "#e0e7ff", color: "#4f46e5" },
  { label: "Profile changes", value: 0, icon: UserCog, bg: "#f3e8ff", color: "#7c3aed" },
];

export default function OnboardingSummaryPage() {
  return (
    <>
    <div className="min-h-screen bg-[#f5f6fa] text-[13px] font-sans">
      <div className="max-w-[1400px] mx-auto px-4 py-4">

        {/* ===== TWO COLUMN DASHBOARD ===== */}
        <div className="grid grid-cols-12 gap-4">

          {/* ===== LEFT COLUMN ===== */}
          <div className="col-span-12 xl:col-span-5 space-y-4">

            {/* Employees */}
            <div className="bg-white border rounded-md p-4">
              <h2 className="font-semibold text-gray-800 mb-4">Employees</h2>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {employeesStats.map((s, i) => (
                  <div key={i}>
                    <div className="flex items-end gap-1">
                      <span className="text-xl font-semibold">{s.value}</span>
                      {s.trend && (
                        <span className="text-green-600 text-xs">{s.trend}</span>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quicklinks */}
            <div className="bg-white border rounded-md p-4 space-y-4">
              <Section
                title="Quicklinks"
                items={[
                  "+ New Employee","Employee Custom Fields",
                  "+ New Poll","Org Directory",
                  "+ New Announcement","Org Tree",
                ]}
              />
              <Section
                title="Bulk operations"
                items={[
                  "Add Employees in Bulk","Import Employee Job Details",
                  "Update Employees in Bulk","Import Employee Custom Fields",
                  "Bulk invite employees","Bulk Import Employee Documents",
                ]}
              />
              <Section
                title="Quick Reports"
                items={[
                  "All employees","Employee job details",
                  "Registered employees","Employees in probation",
                  "Incomplete profiles","Employees in notice period",
                ]}
              />
            </div>
          </div>

          {/* ===== RIGHT COLUMN ===== */}
          <div className="col-span-12 xl:col-span-7 space-y-4">

            {/* Pending */}
            <div className="bg-white border rounded-md p-4">
              <h2 className="font-semibold text-gray-800 mb-4">Pending Actions</h2>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                {pending.map((p, i) => {
                  const Icon = p.icon;
                  return (
                    <div key={i} className="flex flex-col items-center text-center">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{ background: p.bg }}
                      >
                        <Icon size={16} color={p.color} />
                      </div>
                      <p className="mt-1 font-semibold" style={{ color: p.color }}>
                        {p.value}
                      </p>
                      <p className="text-[11px] text-gray-500">{p.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white border rounded-md p-4">
              <div className="flex justify-between mb-2">
                <h3 className="font-semibold text-gray-800">Employee Login Summary</h3>
                <div className="border rounded px-2 py-1 text-xs">Last 14 days ▾</div>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={loginData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#84cc16"
                      fill="#84cc1633"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <div className="w-3 h-3 bg-lime-500 rounded-sm" /> Login Count
              </div>
            </div>
          </div>
        </div>

        {/* ===== BOTTOM GRID ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <Card title="Exits (2)">
            <Row ini="SS" name="Sai Sruthi Varala" dept="Human Resources - Hyderabad Office" date="31 AUG 2025" />
            <Row ini="SK" name="Surya Kiran Vanam" dept="Engineering - Hyderabad Office" date="30 NOV 2025" />
          </Card>

          <Card title="Onboarding (1)">
            <Row ini="WS" name="Wazid Shaik" dept="Engineering - Hyderabad Office" />
          </Card>

          <Card title="Probation (1)">
            <Row ini="RK" name="Rakesh K" dept="Human Resources - Hyderabad Office" />
          </Card>

          <Card title="Birthdays">
            <Row ini="PS" name="Patan Sumiya" dept="Engineering - Hyderabad Office" date="14 FEB 2000" gray />
          </Card>

          <div className="bg-white border rounded-md p-4 lg:col-span-2">
            <h3 className="font-semibold text-gray-800 mb-2">Work anniversaries</h3>
            <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded">
              No work anniversaries today.
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

/* ===== SMALL COMPONENTS ===== */

function Section({ title, items }) {
  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-2 text-[13px]">{title}</h3>
      <div className="grid grid-cols-2 gap-y-1">
        {items.map((item, idx) => (
          <a
            key={idx}
            href="#"
            className="text-[12px] text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
          >
            {item}
          </a>
        ))}
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="bg-white border rounded-md p-4">
      <h3 className="font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Row({ ini, name, dept, date, gray }) {
  return (
    <div className="flex justify-between items-center">
      <div className="flex gap-3 items-center">
        <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center text-xs font-semibold">
          {ini}
        </div>
        <div>
          <p className="text-[13px] font-medium text-gray-900">{name}</p>
          <p className="text-[11px] text-gray-500">{dept}</p>
        </div>
      </div>
      {date && (
        <p className={`text-[11px] ${gray ? "text-gray-500" : "text-red-500"}`}>
          {date}
        </p>
      )}
    </div>
  );
}
