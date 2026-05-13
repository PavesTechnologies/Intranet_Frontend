import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import {
  Users,
  FolderKanban,
  PlaneTakeoff,
  Clock,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Handshake,
  UserCog2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import axios from "axios";
import { hr } from "date-fns/locale/hr";
import { handler } from "@tailwindcss/line-clamp";

const Dashboard = () => {
  const { user } = useAuth();
  const [employeeCount, setEmployeeCount] = useState(null);
  const [projectsCount, setProjectsCount] = useState(null);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(null);
  const [taskCount, setTaskCount] = useState(null);
  const [avgTimesheetHours, setAvgTimesheetHours] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState(null);

  // ✅ Determine user roles

  const roles = user?.roles || [];
  const isAdminOrSuperAdmin =
    roles.includes("Super Admin") || roles.includes("Admin");
  const isRM = roles.includes("Resource_Manager");
  // const isPM = roles.includes("Project_Manager");
  const isHR = roles.includes("HR");
  const isGeneral = roles?.includes("General");
  const isDeveloper = roles.includes("Developer");
  const isManager = roles.includes("Manager");
  // const isHR = roles.includes("HR");
  const isAdmin = roles.includes("Admin");

  // ✅ Fetch total employees
  useEffect(() => {
    const fetchEmployeeCount = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/count`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          },
        );
        setEmployeeCount(res.data.user_count);
      } catch (error) {
        console.error("Error fetching employee count:", error);
      }
    };
    fetchEmployeeCount();
  }, []);

  // ✅ Fetch active employees
  useEffect(() => {
    const fetchActiveEmployees = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/active-count`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          },
        );
        setActiveEmployeeCount(res.data.active_user_count);
      } catch (error) {
        console.error("Error fetching active employee count:", error);
      }
    };
    fetchActiveEmployees();
  }, []);

  // fetch projects count
  useEffect(() => {

    const fetchProjectsCount = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/count`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          },
        );

        // Directly use the count from API
        const count = res.data ?? 0;
        setProjectsCount(count);
      } catch (error) {
        console.error("Error fetching projects count:", error);
      }
    };

    fetchProjectsCount();
  }, []);

  // fetch tasks count
  useEffect(() => {

    const fetchTasksCount = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/status/done/count`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          },
        );

        // Directly use the count from API
        const count = res.data ?? 0;
        setTaskCount(count);
        //console.log("Tasks count fetched:", count);
      } catch (error) {
        console.error("Error fetching tasks count:", error);
      }
    };

    fetchTasksCount();
  }, []);

  //fetch average timesheet hours
  useEffect(() => {

    const fetchAvgTimesheetHours = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/dashboard/total_hours`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          },
        );

        // Directly use the count from API
        const hours = res.data?.totalHours ?? 0;
        setAvgTimesheetHours(hours);
        console.log("Average timesheet hours fetched:", hours);
      } catch (error) {
        //console.error("Error fetching average timesheet hours:", error);
      }
    };
    fetchAvgTimesheetHours();
  }, []);

  // ✅ Fetch pending approvals
  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchPendingApprovals = async () => {
      try {
        const decodedToken = jwtDecode(token);
        const managerId = decodedToken.user_id;
        const res = await axios.get(
          `${window.__APP_CONFIG__.BASE_URL}/api/leave-requests/manager/pending-count/${managerId}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          },
        );

        // Directly use the count from API
        const count = res.data?.data ?? 0;
        setPendingApprovals(count);
        console.log("Pending approvals fetched:", count);
      } catch (error) {
        console.error("Error fetching pending approvals:", error);
      }
    };
    fetchPendingApprovals();
  }, []);

  // ✅ Determine project route
  let projectHref = "/projects";
  // if (isDeveloper) projectHref = "/projects/developer";
  // else if (isManager) projectHref = "/projects/manager";
  // else if (isAdminOrSuperAdmin) projectHref = "/projects/admin";

  // ✅ Quick Stats — conditionally show based on role
  const quickStats = isAdminOrSuperAdmin
    ? [
      {
        label: "Total Employees",
        value: employeeCount ?? "—",
        change: "+12",
        icon: Users,
        positive: true,
      },
      {
        label: "Active Employees",
        value: activeEmployeeCount ?? "—",
        change: "+10",
        icon: Users,
        positive: true,
      },
    ]
    : [
      {
        label: "Total Employees",
        value: employeeCount ?? "—",
        change: "+12",
        icon: Users,
        positive: true,
      },
      {
        label: "Active Projects",
        value: projectsCount ?? "—",
        change: "+2",
        icon: FolderKanban,
        positive: true,
      },
      {
        label: "Pending Approvals",
        value: pendingApprovals ?? "—",
        change: "-3",
        icon: AlertCircle,
        positive: false,
      },
      {
        label: "Completed Tasks",
        value: taskCount ?? "—",
        change: "+5%",
        icon: CheckCircle,
        positive: true,
      },
    ];

  // ✅ Module cards remain same for all roles
  const moduleCards = [
    ...(isAdminOrSuperAdmin || isRM
      ? [
        {
          // title: (isPM && !isRM) ? "Resource Project Management" : "Resource Management",
          title: "Resource Management",
          description:
            "Make the right people available to the right projects at the right time",
          icon: UserCog2,
          // href: (isPM && !isRM) ? "/resource-management/projects" : "/resource-management",
          href: "/resource-management",
          color: "bg-[#263383]",
          stats: "Manage resources effectively",
        },
      ]
      : []),
    {
      title: "Leave Management",
      description: "Handle leave requests and approvals",
      icon: PlaneTakeoff,
      href: "/leave-management",
      color: "bg-[#b22a4f]",
      stats: pendingApprovals ? `${pendingApprovals} pending approvals` : "-",
    },
    {
      title: "Project Management",
      description: "Track projects, deadlines, and team progress",
      icon: FolderKanban,
      href: projectHref,
      color: "bg-[#3548b6]",
      stats: projectsCount ? `${projectsCount} projects` : "Loading...",
    },
    {
      title: "User Management",
      description: "Manage employees, roles, and permissions",
      icon: Users,
      href: "/user-management/users",
      color: "bg-[#263383]",
      stats: activeEmployeeCount
        ? `${activeEmployeeCount} employees`
        : "Loading...",
    },
    {
      title: "Timesheets",
      description: "Track time and generate reports",
      icon: Clock,
      href: "/timesheets",
      color: "bg-[#ff3d72]",
      stats: avgTimesheetHours
        ? `Total logged: ${avgTimesheetHours} hrs`
        : "0 hrs/week",
    },
    {
      title: "Employee Onbording",
      description: "Create offers and onboard new employees",
      icon: Handshake,
      href: "/employee-onboarding/",
      color: "bg-[#d23369]",
      stats: "5 events today",
    },
    // {
    //   title: "Calendar",
    //   description: "View events, meetings, and deadlines",
    //   icon: Calendar,
    //   href: "/calendar",
    //   color: "bg-[#d23369]",
    //   stats: "5 events today",
    // },
    // {
    //   title: "Employee Exit",
    //   description: "Manage employee exit processes",
    //   icon: AlertCircle,
    //   href: "/employee-exit",
    //   color: "bg-[#ff3d72]",
    //   stats: "2 exits this month",
    // },
  ];
  const filteredModuleCards = moduleCards.filter((card) => {
    // If it's the Onboarding card AND the user is General (but not HR)
    if (card.title === "Employee Onbording" && !isGeneral && !isHR && !isManager && !isAdmin) {
      return false; // Hide it
    }
    return true; // Show everything else (including for HR)
  });

  const recentActivity = [
    {
      action: "New user registration",
      user: "Sarah Johnson",
      time: "2 hours ago",
      type: "user",
    },
    {
      action: "Project deadline updated",
      user: "Mike Chen",
      time: "4 hours ago",
      type: "project",
    },
    {
      action: "Leave request approved",
      user: "Emily Davis",
      time: "6 hours ago",
      type: "leave",
    },
    {
      action: "Timesheet submitted",
      user: "David Wilson",
      time: "1 day ago",
      type: "timesheet",
    },
    {
      action: "Employee Exit Process",
      user: "Anna Lee",
      time: "2 days ago",
      type: "exit",
    }
  ];

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp
                    className={`h-4 w-4 ${stat.positive ? "text-green-500" : "text-red-500"
                      }`}
                  />
                  <span
                    className={`text-sm ml-1 ${stat.positive ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <stat.icon className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modules & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module Cards */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Access
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModuleCards.map((card, index) => (
              <Link
                key={index}
                to={card.href}
                className="group bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 hover:border-[#263383]"
              >
                <div className="flex items-start space-x-4">
                  <div
                    className={`p-3 rounded-lg ${card.color} group-hover:scale-105 transition-transform`}
                  >
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 group-hover:text-[#263383] transition-colors">
                      {card.title}
                    </h4>
                    <p className="text-gray-600 text-sm mt-1">
                      {card.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-2 font-medium">
                      {card.stats}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Side Panel */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 space-y-4">
              {recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
                >
                  <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <div className="h-2 w-2 bg-[#ff3d72] rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">by {activity.user}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Announcements */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">
              System Announcements
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  System maintenance scheduled for this weekend.
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800">
                  New employee onboarding process updated.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


// import { useState } from "react";
// import Calendar from "../pages/leave_management/charts/Calendar";

// // ── Data ────────────────────────────────────────────────────────────────────

// const STATS = [
//   {
//     id: "projects",
//     label: "Active Projects",
//     value: "8",
//     sub: "3 on track",
//     accentBar: "bg-blue-400",
//     iconBg: "bg-blue-50",
//     iconColor: "text-blue-600",
//     badgeColor: "bg-blue-50 text-blue-700",
//     icon: (
//       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <rect x="3" y="3" width="7" height="7" rx="1.5" />
//         <rect x="14" y="3" width="7" height="7" rx="1.5" />
//         <rect x="3" y="14" width="7" height="7" rx="1.5" />
//         <rect x="14" y="14" width="7" height="7" rx="1.5" />
//       </svg>
//     ),
//   },
//   {
//     id: "hours",
//     label: "Hours This Week",
//     value: "26",
//     valueSuffix: "/ 40 hrs",
//     sub: "Timesheet pending",
//     accentBar: "bg-amber-500",
//     iconBg: "bg-amber-50",
//     iconColor: "text-amber-700",
//     badgeColor: "bg-amber-50 text-amber-700",
//     progress: 65,
//     icon: (
//       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <circle cx="12" cy="12" r="9" />
//         <polyline points="12 7 12 12 15.5 14" />
//       </svg>
//     ),
//   },
//   {
//     id: "leave",
//     label: "Leave Balance",
//     value: "12",
//     valueSuffix: "days left",
//     sub: "1 pending approval",
//     accentBar: "bg-teal-500",
//     iconBg: "bg-teal-50",
//     iconColor: "text-teal-700",
//     badgeColor: "bg-amber-50 text-amber-700",
//     icon: (
//       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <rect x="3" y="4" width="18" height="18" rx="2" />
//         <line x1="16" y1="2" x2="16" y2="6" />
//         <line x1="8" y1="2" x2="8" y2="6" />
//         <line x1="3" y1="10" x2="21" y2="10" />
//       </svg>
//     ),
//   },
//   {
//     id: "tasks",
//     label: "My Tasks",
//     value: "5",
//     valueSuffix: "open",
//     sub: "2 due today",
//     accentBar: "bg-orange-500",
//     iconBg: "bg-orange-50",
//     iconColor: "text-orange-700",
//     badgeColor: "bg-orange-50 text-orange-700",
//     icon: (
//       <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <polyline points="9 11 12 14 22 4" />
//         <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
//       </svg>
//     ),
//   },
// ];

// const MODULES = [
//   {
//     id: "project",
//     name: "Project Management",
//     desc: "Track tasks, milestones, and project progress across teams.",
//     meta: "8 active projects",
//     iconBg: "bg-blue-50",
//     iconColor: "text-blue-600",
//     icon: (
//       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
//         <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
//       </svg>
//     ),
//   },
//   {
//     id: "leave",
//     name: "Leave Management",
//     desc: "Apply for leaves, check balances, and view team availability.",
//     meta: "1 pending request",
//     iconBg: "bg-teal-50",
//     iconColor: "text-teal-600",
//     icon: (
//       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
//         <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
//         <line x1="8" y1="14" x2="8" y2="14" strokeLinecap="round" strokeWidth={2.5} />
//         <line x1="12" y1="14" x2="12" y2="14" strokeLinecap="round" strokeWidth={2.5} />
//         <line x1="8" y1="18" x2="8" y2="18" strokeLinecap="round" strokeWidth={2.5} />
//       </svg>
//     ),
//   },
//   {
//     id: "resource",
//     name: "Resource Management",
//     desc: "Manage allocations, capacity, and resource utilisation.",
//     meta: "14 resources tracked",
//     iconBg: "bg-amber-50",
//     iconColor: "text-amber-600",
//     icon: (
//       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <circle cx="12" cy="5" r="2" /><line x1="12" y1="7" x2="12" y2="11" />
//         <line x1="12" y1="11" x2="7" y2="15" /><line x1="12" y1="11" x2="17" y2="15" />
//         <circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" />
//       </svg>
//     ),
//   },
//   {
//     id: "user",
//     name: "User Management",
//     desc: "Manage profiles, access levels, and team directories.",
//     meta: "42 team members",
//     iconBg: "bg-violet-50",
//     iconColor: "text-violet-600",
//     icon: (
//       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
//         <circle cx="9" cy="7" r="4" />
//         <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
//         <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//       </svg>
//     ),
//   },
//   {
//     id: "timesheet",
//     name: "Timesheets",
//     desc: "Log daily hours, submit weekly timesheets, and view history.",
//     meta: "Submit by Friday",
//     iconBg: "bg-orange-50",
//     iconColor: "text-orange-600",
//     icon: (
//       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <circle cx="12" cy="12" r="9" />
//         <polyline points="12 7 12 12 15.5 14" />
//       </svg>
//     ),
//   },
//   {
//     id: "onboarding",
//     name: "Employee Onboarding",
//     desc: "Guide new hires through documents, tasks, and orientation.",
//     meta: "2 joiners this month",
//     iconBg: "bg-emerald-50",
//     iconColor: "text-emerald-600",
//     icon: (
//       <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//         <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
//         <circle cx="12" cy="7" r="4" />
//         <polyline points="16 11 18 13 22 9" />
//       </svg>
//     ),
//   },
// ];

// const ACTIVITY = [
//   { dot: "bg-blue-400", text: "Riya Sharma updated the Q2 Website Redesign milestone to 'Completed'", time: "10 min ago" },
//   { dot: "bg-teal-400", text: "Your leave request for May 20–22 was approved", time: "1 hr ago" },
//   { dot: "bg-amber-400", text: "Timesheet for Week 19 is pending submission", time: "3 hrs ago" },
//   { dot: "bg-violet-400", text: "Arjun Mehta has been added to the Backend team", time: "Yesterday" },
//   { dot: "bg-orange-400", text: "New onboarding checklist assigned to Priya Nair", time: "Yesterday" },
// ];

// const LEAVES = [
//   { name: "Kiran Das", date: "May 12 – 13", tag: "Approved", tagClass: "bg-emerald-50 text-emerald-700" },
//   { name: "Meena Pillai", date: "May 14 – 16", tag: "Approved", tagClass: "bg-emerald-50 text-emerald-700" },
//   { name: "Dev Anand", date: "May 19", tag: "Pending", tagClass: "bg-amber-50 text-amber-700" },
//   { name: "Sunita Rao", date: "May 22 – 23", tag: "Upcoming", tagClass: "bg-blue-50 text-blue-700" },
// ];

// // ── Sub-components ───────────────────────────────────────────────────────────

// function StatCard({ label, value, valueSuffix, sub, badgeColor, icon, accentBar, iconBg, iconColor, progress }) {
//   return (
//     <div className="relative bg-white shadow-3xl border border-gray-100 rounded-2xl p-4 flex flex-col gap-3 overflow-hidden">
//       {/* Left accent bar */}
//       {/* <div className={`absolute top-0 left-0 w-[3px] h-full rounded-l-2xl ${accentBar}`} /> */}

//       {/* Header: label + icon */}
//       <div className="flex items-center justify-between">
//         <span className="text-xs font-medium text-gray-500 tracking-wide">{label}</span>
//         <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${iconBg}`}>
//           <span className={`text-base ${iconColor}`}>{icon}</span>
//         </div>
//       </div>

//       {/* Value */}
//       <div className="flex items-baseline gap-1">
//         <span className="text-[28px] font-semibold text-gray-900 leading-none">{value}</span>
//         {valueSuffix && (
//           <span className="text-sm text-gray-400">{valueSuffix}</span>
//         )}
//       </div>

//       {/* Optional progress bar (e.g. hours) */}
//       {progress !== undefined && (
//         <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
//           <div
//             className={`h-full rounded-full ${accentBar}`}
//             style={{ width: `${progress}%` }}
//           />
//         </div>
//       )}

//       {/* Badge */}
//       <span className={`self-start text-[11px] font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
//         {sub}
//       </span>
//     </div>
//   );
// }

// function ModuleCard({ name, desc, meta, icon, iconBg, iconColor, onClick }) {
//   const [hovered, setHovered] = useState(false);
//   return (
//     <button
//       onClick={onClick}
//       onMouseEnter={() => setHovered(true)}
//       onMouseLeave={() => setHovered(false)}
//       className={`text-left bg-white border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-150 ${hovered ? "border-gray-300 shadow-sm" : "border-gray-100"
//         }`}
//     >
//       <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
//         {icon}
//       </div>
//       <div>
//         <p className="text-sm font-semibold text-gray-800 mb-0.5">{name}</p>
//         <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
//       </div>
//       <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
//         <span className="text-xs text-gray-400">{meta}</span>
//         <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//           <path d="M5 12h14M12 5l7 7-7 7" />
//         </svg>
//       </div>
//     </button>
//   );
// }

// function ActivityFeed() {
//   return (
//     <div className="bg-white border border-gray-100 rounded-2xl p-5">
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-sm font-semibold text-gray-800">Recent activity</h2>
//         <button className="text-xs text-blue-600 hover:underline">View all</button>
//       </div>
//       <ul className="divide-y divide-gray-50">
//         {ACTIVITY.map((item, i) => (
//           <li key={i} className="flex gap-3 items-start py-3 first:pt-0 last:pb-0">
//             <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
//             <div>
//               <p className="text-xs text-gray-700 leading-relaxed">{item.text}</p>
//               <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
//             </div>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// function LeavePanel() {
//   return (
//     <div className="bg-white border border-gray-100 rounded-2xl p-5">
//       <div className="flex items-center justify-between mb-4">
//         <h2 className="text-sm font-semibold text-gray-800">Team on leave</h2>
//         {/* <button className="text-xs text-blue-600 hover:underline">Calendar</button> */}
//       </div>
//       <ul className="divide-y divide-gray-50">
//         {LEAVES.map((item, i) => (
//           <li key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
//             <div>
//               <p className="text-xs font-medium text-gray-800">{item.name}</p>
//               <p className="text-xs text-gray-400 mt-0.5">{item.date}</p>
//             </div>
//             <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${item.tagClass}`}>
//               {item.tag}
//             </span>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

// // ── Main Dashboard ───────────────────────────────────────────────────────────

// export default function Dashboard() {
//   const [activeModule, setActiveModule] = useState(null);

//   return (
//     <div className="min-h-screen bg-gray-50 font-sans">
//       {/* Sidebar */}
//       {/* <aside className="fixed left-0 top-0 h-full w-16 bg-white border-r border-gray-100 flex flex-col items-center py-5 gap-6 z-10">
//         <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
//           <span className="text-white text-xs font-bold">IN</span>
//         </div>
//         <nav className="flex flex-col items-center gap-4 mt-4">
//           {[
//             { label: "Home", icon: <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" /> },
//             { label: "Projects", icon: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></> },
//             { label: "Team", icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></> },
//             { label: "Clock", icon: <><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 14" /></> },
//           ].map(({ label, icon }) => (
//             <button
//               key={label}
//               aria-label={label}
//               className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
//             >
//               <svg className="w-4.5 h-4.5" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//                 {icon}
//               </svg>
//             </button>
//           ))}
//         </nav>
//         <div className="mt-auto">
//           <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
//             AJ
//           </div>
//         </div>
//       </aside> */}

//       {/* Main content */}
//       <main className="p-8 max-w-6xl">
//         {/* Top bar */}
//         {/* <header className="flex items-start justify-between mb-8">
//           <div>
//             <h1 className="text-xl font-semibold text-gray-900">Good morning, Alex 👋</h1>
//             <p className="text-sm text-gray-400 mt-0.5">Monday, 11 May 2026 · Here's your workspace overview</p>
//           </div>
//           <div className="flex items-center gap-2">
//             <div className="relative">
//               <button className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//                   <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
//                   <path d="M13.73 21a2 2 0 0 1-3.46 0" />
//                 </svg>
//               </button>
//               <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
//             </div>
//             <button className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors">
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
//                 <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
//               </svg>
//             </button>
//             <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 border border-blue-200">
//               AJ
//             </div>
//           </div>
//         </header> */}

//         {/* Stats */}
//         {/* <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">at a glance</p> */}
//         <div className="grid grid-cols-4 gap-3 mb-8">
//           {STATS.map((s) => (
//             <StatCard key={s.id} {...s} />
//           ))}
//         </div>

//         {/* Modules */}
//         <div className="grid grid-cols-6 gap-2">
//           <div className="col-span-3">
//             <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">modules</p>
//             <div className="grid grid-cols-2 gap-3 mb-8">
//               {MODULES.map((m) => (
//                 <ModuleCard
//                   key={m.id}
//                   {...m}
//                   onClick={() => setActiveModule(m.id)}
//                 />
//               ))}
//             </div>
//           </div>
//           <div className="col-span-3">
//             <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">Quick Updates</p>
//             <div className="mt-2">
//               <LeavePanel />
//             </div>
//           </div>
//         </div>

//         {/* Bottom panels */}
//         <div className="grid grid-cols-7 gap-2">
//           <div className="col-span-4">
//             <ActivityFeed />
//           </div>
//           <div className="col-span-3">
//             <Calendar />
//           </div>
//         </div>
//       </main>

//       {/* Active module toast */}
//       {activeModule && (
//         <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 z-50">
//           <span>Navigating to <strong>{MODULES.find((m) => m.id === activeModule)?.name}</strong></span>
//           <button onClick={() => setActiveModule(null)} className="text-gray-400 hover:text-white ml-1">
//             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
//               <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
//             </svg>
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }