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
  const isRM = roles.includes("RESOURCE-MANAGER");
  // const isPM = roles.includes("PROJECT-MANAGER");
  const isGeneral = user?.roles?.includes("General");
  const isDeveloper = roles.includes("Developer");
  const isManager = roles.includes("Manager");
  const isHR = roles.includes("HR");

  // ✅ Fetch total employees
  useEffect(() => {
    const token = localStorage.getItem("token");
    const fetchEmployeeCount = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_USER_MANAGEMENT_URL}/admin/users/count`,
          {
            headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");
    const fetchActiveEmployees = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_USER_MANAGEMENT_URL}/admin/users/active-count`,
          {
            headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");

    const fetchProjectsCount = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_PMS_BASE_URL}/api/projects/count`,
          {
            headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");

    const fetchTasksCount = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_PMS_BASE_URL}/status/done/count`,
          {
            headers: { Authorization: `Bearer ${token}` },
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
    const token = localStorage.getItem("token");

    const fetchAvgTimesheetHours = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_TIMESHEET_API_ENDPOINT}/api/dashboard/total_hours`,
          {
            headers: { Authorization: `Bearer ${token}` },
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
          `${import.meta.env.VITE_BASE_URL}/api/leave-requests/manager/pending-count/${managerId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
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
    ...(isAdminOrSuperAdmin || isRM) ? [
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
    ] : [],
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
    {
      title: "Calendar",
      description: "View events, meetings, and deadlines",
      icon: Calendar,
      href: "/calendar",
      color: "bg-[#d23369]",
      stats: "5 events today",
    },
    {
      title: "Employee Exit",
      description: "Manage employee exit processes",
      icon: AlertCircle,
      href: "/employee-exit",
      color: "bg-[#ff3d72]",
      stats: "2 exits this month",
    },
  ];

  const filteredModuleCards = moduleCards.filter((card) => {
  // If it's the Onboarding card AND the user is General (but not HR)
  if (card.title === "Employee Onbording" && isGeneral && !isHR && !isManager) {
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
