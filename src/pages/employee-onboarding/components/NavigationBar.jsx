"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";

export default function OnboardingNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* ================= HIDE NAVBAR FOR THESE ROUTES ================= */

  const hideNavbarRoutes = [
    "/employee-onboarding/employee-credentials"
    // "/employee-onboarding/core-employee",
  ];

  const shouldHideNavbar = hideNavbarRoutes.some((route) =>
    location.pathname.startsWith(route)
  );

  if (shouldHideNavbar) return null;

  /* ================= PERMISSIONS ================= */

  const permissions = user?.permissions || [];
  const canViewAdminView = permissions.includes("VIEW_ADMIN_PAGE");

  /* ================= PARENT TOP NAV ================= */

const parentNav = [
  {
    label: "Onboarding Dashboard",
    match: ["/employee-onboarding/onboarding-summary", "/employee-onboarding/analytics"],
    redirect: "/employee-onboarding/onboarding-summary",
  },
  {
    label: "Onboarding Task",
    match: [
      "/employee-onboarding",
      "/employee-onboarding/create",
      "/employee-onboarding/bulk-upload",
      "/employee-onboarding/onboarding-task",
      "/employee-onboarding/hr-configuration",
      "/employee-onboarding/admin",
    ],
    exactRoot: true,
    redirect: "/employee-onboarding",
  },
  {
    label: "Employee Directory",
    match: [
      "/employee-onboarding/employee-directory",
      "/employee-onboarding/employeelist",
      "/employee-onboarding/organization-tree",
    ],
    redirect: "/employee-onboarding/employee-directory",
  },
  {
    label: "Employee Verification",
    match: [
      "/employee-onboarding/hr/",
      "/employee-onboarding/core-employee",
    ],
    redirect: "/employee-onboarding/hr",
  },
  {
    label: "Employee Documents",
    match: [
      "/employee-onboarding/employeedocuments",
      "/employee-onboarding/document-templates",
      "/employee-onboarding/organization-documents",
    ],
    redirect: "/employee-onboarding/employeedocuments",
  },
  {
    label: "Weekly Workforce Summary",
    match: [
      "/employee-onboarding/weekly-joining-report-dashboard"
    ],
    redirect: "/employee-onboarding/weekly-joining-report-dashboard",
  }
];

  /* ================= MAIN TASK NAV ================= */

  const taskNav = [
    { label: "Task Dashboard", path: "/employee-onboarding" },

    ...(canViewAdminView
      ? [
          {
            label: "Admin View",
            path: "/employee-onboarding/admin/approval-dashboard",
          },
        ]
      : []),

    { label: "Create Offer", path: "/employee-onboarding/create" },
    { label: "Bulk Upload", path: "/employee-onboarding/bulk-upload" },
    { label: "Add Tasks", path: "/employee-onboarding/onboarding-task" },
    { label: "HR Configuration", path: "/employee-onboarding/hr-configuration" },
  ];

  /* ================= DASHBOARD NAV ================= */

  const dashboardNav = [
    { label: "Summary", path: "/employee-onboarding/onboarding-summary" },
    { label: "Analytics", path: "/employee-onboarding/analytics" },
  ];

  /* ================= DIRECTORY NAV ================= */

  const directoryNav = [
    { label: "Employee Directory", path: "/employee-onboarding/employee-directory" },
    { label: "Employee List", path: "/employee-onboarding/employeelist" },
    { label: "Organization Tree", path: "/employee-onboarding/organization-tree" },
  ];

  const documentsNav = [
    { label: "Employee Documents", path: "/employee-onboarding/employeedocuments" },
    { label: "Document Templates", path: "/employee-onboarding/document-templates" },
    { label: "Organization Documents", path: "/employee-onboarding/organization-documents" },
  ];

  const hrverificationNav = [
    { label: "HR Verification", path: "/employee-onboarding/hr" },
    { label: "Core Employee", path: "/employee-onboarding/core-employee" },
  ];

  const weeklyJoiningDashboardNav = [
    { label: "Weekly Joining Dashboard", path: "/employee-onboarding/weekly-joining-report-dashboard" },
  ];


  /* ================= SELECT NAV TO RENDER ================= */

  let navToRender = null;

  if (
    location.pathname.startsWith("/employee-onboarding/onboarding-summary") ||
    location.pathname.startsWith("/employee-onboarding/analytics")
  ) {
    navToRender = dashboardNav;
  } else if (
    location.pathname.startsWith("/employee-onboarding/employee-directory") ||
    location.pathname.startsWith("/employee-onboarding/employeelist") ||
    location.pathname.startsWith("/employee-onboarding/organization-tree")
  ) {
    navToRender = directoryNav;
  } else if (
    location.pathname.startsWith("/employee-onboarding/employeedocuments") ||
    location.pathname.startsWith("/employee-onboarding/document-templates") ||
    location.pathname.startsWith("/employee-onboarding/organization-documents")
  ) {
    navToRender = documentsNav;
  } 
    else if (
    location.pathname.startsWith("/employee-onboarding/hr-configuration")
  ) {
    navToRender = taskNav;
  }
  else if (
    location.pathname.startsWith("/employee-onboarding/hr") ||
    location.pathname.startsWith("/employee-onboarding/core-employee")
  ) {
    navToRender = hrverificationNav;
  } 
  else if (
    location.pathname.startsWith("/employee-onboarding/weekly-joining-report-dashboard")
  ) {
    navToRender = weeklyJoiningDashboardNav;
  }
  else {
    navToRender = taskNav;
  }

  /* ================= RENDER ================= */

  return (
    <div>

    {/* ================= PARENT NAVBAR (TOP) ================= */}

    <div className="relative border-b bg-white z-30">
      <div className="flex gap-12 px-6 pt-3">

        {parentNav.map((item) => {

          // const isActive = item.match.some((path) =>
          //   location.pathname === path ||
          //   location.pathname.startsWith(path)
          // );
          const isActive = item.match.some((path) => {
            if (item.exactRoot && path === "/employee-onboarding") {
              return location.pathname === "/employee-onboarding";
            }
            return (
              location.pathname === path ||
              location.pathname.startsWith(path + "/")
            );
          });

          return (
            <div
              key={item.label}
              onClick={() => navigate(item.redirect)}
              className="relative cursor-pointer pb-3 text-sm font-semibold"
            >
              <span
                className={
                  isActive
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }
              >
                {item.label}
              </span>

              {/* Green triangle indicator */}
              {isActive && (
                <span
                 className="absolute left-1/2 -bottom-[10px] -translate-x-1/2
                  h-0 w-0 z-40
                  border-l-8 border-r-8 border-b-8
                  border-l-transparent border-r-transparent border-b-blue-700"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>

    <div className="relative border-b bg-gray-200 mt-4 z-10">
      <div className="flex gap-10 px-6">
        {navToRender.map((item) => {

          let isActive = false;

          // 🔴 FIX: First tab should match EXACTLY only
          if (item.path === "/employee-onboarding") {
            isActive = location.pathname === "/employee-onboarding";
          } else {
            isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(item.path + "/");
          }

          return (
            <div
              key={item.label}
              onClick={() => navigate(item.path)}
              className="relative cursor-pointer py-3 text-sm font-medium"
            >
              <span
                className={
                  isActive
                    ? "text-gray-900"
                    : "text-gray-500 hover:text-gray-900"
                }
              >
                {item.label}
              </span>

              {isActive && (
                <span
                  className="absolute left-1/2 -bottom-1 h-0 w-0 
                  -translate-x-1/2 
                  border-l-8 border-r-8 border-t-8
                  border-l-transparent border-r-transparent border-t-green-500"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}