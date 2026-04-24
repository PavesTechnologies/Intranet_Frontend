"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useEffect } from "react";
export default function OnboardingNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const isAdmin = hasRole(["ADMIN"]);
  const isManager = hasRole(["MANAGER"]);
  const isHR = hasRole(["HR"]);
 const isOnlyGeneral =
  hasRole(["GENERAL"]) &&
  !hasRole(["HR"]) &&
  !hasRole(["MANAGER"]) &&
  !hasRole(["ADMIN"]);

 useEffect(() => {
  if (
    isOnlyGeneral &&
    location.pathname === "/employee-onboarding"
  ) {
    navigate("/employee-onboarding/employee-directory", { replace: true });
  }
}, [isOnlyGeneral, location.pathname]);
  /* ================= HIDE NAVBAR ================= */

  const hideNavbarRoutes = [
    "/employee-onboarding/employee-credentials",
  ];

  if (hideNavbarRoutes.some((route) => location.pathname.startsWith(route))) {
    return null;
  }

  /* ================= PARENT NAV ================= */

  const parentNav = [

    // ✅ Dashboard → HR, MANAGER
    ...(hasRole(["HR", "MANAGER"]) ? [{
      label: "Onboarding Dashboard",
      match: [
        "/employee-onboarding/onboarding-summary",
        "/employee-onboarding/analytics"
      ],
      redirect: "/employee-onboarding/onboarding-summary",
    }] : []),

    // ✅ Task → HR, ADMIN, MANAGER
    ...((isHR || isAdmin || isManager) ? [{
      label: "Onboarding Task",
      match: [
        "/employee-onboarding",
        "/employee-onboarding/create",
        "/employee-onboarding/bulk-upload",
        "/employee-onboarding/onboarding-task",
        "/employee-onboarding/hr-configuration",
        // "/employee-onboarding/admin",
      ],
      exactRoot: true,
      redirect: "/employee-onboarding",
    }] : []),

    // ✅ Directory → ALL
    {
      label: "Employee Directory",
      match: [
        "/employee-onboarding/employee-directory",
        "/employee-onboarding/employeelist",
        "/employee-onboarding/organization-tree",
      ],
      redirect: "/employee-onboarding/employee-directory",
    },

    // ✅ Documents → HR, MANAGER
    ...(hasRole(["HR", "MANAGER"]) ? [{
      label: "Employee Documents",
      match: [
        "/employee-onboarding/employeedocuments",
        "/employee-onboarding/document-templates",
        "/employee-onboarding/organization-documents",
      ],
      redirect: "/employee-onboarding/employeedocuments",
    }] : []),

    // ✅ Weekly → HR, MANAGER
    ...(hasRole(["HR", "MANAGER"]) ? [{
      label: "Weekly Workforce Summary",
      match: ["/employee-onboarding/weekly-joining-report-dashboard"],
      redirect: "/employee-onboarding/weekly-joining-report-dashboard",
    }] : []),


//  Employee Verification (Parent → HR + MANAGER)
...(hasRole(["HR", "MANAGER"]) ? [{
  label: "Employee Verification",
  redirect: hasRole(["HR"])
    ? "/employee-onboarding/hr"
    : "/employee-onboarding/core-employee",
  children: [
    ...(hasRole(["HR"]) ? [
      { label: "HR Verification", path: "/employee-onboarding/hr" },
      { label: "Background Check", path: "/employee-onboarding/backgroundcheck" },
    ] : []),

    ...(hasRole(["HR", "MANAGER"]) ? [
      { label: "Core Employee", path: "/employee-onboarding/core-employee" }
    ] : []),
  ]
}] : []),
    // ✅ Exit → HR, MANAGER
    ...(hasRole(["HR", "MANAGER"]) ? [{
      label: "Employee Exit",
      match: ["/employee-exit"],
      redirect: "/employee-exit",
    }] : []),

  ];

  /* ================= TASK NAV ================= */

  const taskNav = [
  ...(!isOnlyGeneral
      ? [{ label: "Task Dashboard", path: "/employee-onboarding" }]
      : []),

    ...(hasRole(["HR"]) ? [
      { label: "Create Offer", path: "/employee-onboarding/create" },
      { label: "Bulk Upload", path: "/employee-onboarding/bulk-upload" }
    ] : []),

    ...(hasRole(["HR", "ADMIN"]) ? [
      { label: "Add Tasks", path: "/employee-onboarding/onboarding-task" }
    ] : []),

    ...(hasRole(["HR", "ADMIN"]) ? [
      { label: "HR Configuration", path: "/employee-onboarding/hr-configuration" }
    ] : []),

    // ...(hasRole(["MANAGER"]) ? [
    //   { label: "Approval Dashboard", path: "/employee-onboarding/admin/approval-dashboard" }
    // ] : []),

    ...(isManager && !isAdmin ? [
      { label: "Approval Dashboard", path: "/employee-onboarding/admin/approval-dashboard" }
    ] : []),
  ];

  /* ================= DASHBOARD NAV ================= */

  const dashboardNav = [
    { label: "Summary", path: "/employee-onboarding/onboarding-summary" },
    { label: "Analytics", path: "/employee-onboarding/analytics" },
  ];

  /* ================= DIRECTORY NAV ================= */

  // const directoryNav = [
  //   { label: "Employee Directory", path: "/employee-onboarding/employee-directory" },
  //   { label: "Employee List", path: "/employee-onboarding/employeelist" },
  //   { label: "Organization Tree", path: "/employee-onboarding/organization-tree" },
  // ];
  const directoryNav = [
  // ✅ ALL
  {
    label: "Employee Directory",
    path: "/employee-onboarding/employee-directory",
  },

  // ✅ ONLY HR + MANAGER
  ...(isHR || isManager
    ? [
        {
          label: "Employee List",
          path: "/employee-onboarding/employeelist",
        },
      ]
    : []),

  // ✅ ALL
  {
    label: "Organization Tree",
    path: "/employee-onboarding/organization-tree",
  },
];

  /* ================= DOCUMENT NAV ================= */

  const documentsNav = [
    ...(hasRole(["HR", "MANAGER"]) ? [
      { label: "Employee Documents", path: "/employee-onboarding/employeedocuments" }
    ] : []),

    ...(hasRole(["HR"]) ? [
      { label: "Document Templates", path: "/employee-onboarding/document-templates" },
      { label: "Organization Documents", path: "/employee-onboarding/organization-documents" }
    ] : []),
  ];

  /* ================= HR NAV ================= */

  const hrNav = [
    ...(hasRole(["HR"]) ? [
      { label: "HR Verification", path: "/employee-onboarding/hr" },
      { label: "Background Check", path: "/employee-onboarding/backgroundcheck" }
    ] : []),

    ...(hasRole(["HR", "ADMIN", "MANAGER"]) ? [
      { label: "Core Employee", path: "/employee-onboarding/core-employee" }
    ] : []),
  ];

  /* ================= WEEKLY NAV ================= */

  const weeklyNav = [
    { label: "Weekly Dashboard", path: "/employee-onboarding/weekly-joining-report-dashboard" },
  ];

  /* ================= EXIT NAV ================= */

  const exitNav = [
    { label: "Exit Dashboard", path: "/employee-exit" },
  ];

  /* ================= NAV SWITCH ================= */

  // let navToRender = taskNav;
  let navToRender =  taskNav;

  if (location.pathname.startsWith("/employee-onboarding/onboarding-summary") ||
      location.pathname.startsWith("/employee-onboarding/analytics")) {
    navToRender = dashboardNav;
  }
  else if (location.pathname.startsWith("/employee-onboarding/employee-directory") ||
           location.pathname.startsWith("/employee-onboarding/employeelist") ||
           location.pathname.startsWith("/employee-onboarding/organization-tree")) {
    navToRender = directoryNav;
  }
  else if (location.pathname.startsWith("/employee-onboarding/employeedocuments") ||
           location.pathname.startsWith("/employee-onboarding/document-templates") ||
           location.pathname.startsWith("/employee-onboarding/organization-documents")) {
    navToRender = documentsNav;
  }
  else if (location.pathname.startsWith("/employee-onboarding/hr") ||
           location.pathname.startsWith("/employee-onboarding/backgroundcheck") ||
           location.pathname.startsWith("/employee-onboarding/core-employee")) {
    navToRender = hrNav;
  }
  else if (location.pathname.startsWith("/employee-onboarding/weekly-joining-report-dashboard")) {
    navToRender = weeklyNav;
  }
  else if (location.pathname.startsWith("/employee-exit")) {
    navToRender = exitNav;
  }

  /* ================= RENDER ================= */
   return (
    <div>

    {/* ================= PARENT NAVBAR (TOP) ================= */}

    <div className="relative border-b bg-white z-30">
      <div className="flex gap-12 px-6 pt-3">

        {parentNav.map((item) => {
//           const isActive = (() => {

//   // ✅ Case 1: Items with match (normal tabs)
//   if (item.match) {
//     return item.match.some((path) => {
//       if (item.exactRoot && path === "/employee-onboarding") {
//         return location.pathname === "/employee-onboarding";
//       }
//       return (
//         location.pathname === path ||
//         location.pathname.startsWith(path + "/")
//       );
//     });
//   }

//   // ✅ Case 2: Items with children (Employee Verification)
//   if (item.children) {
//     return item.children.some((child) =>
//       location.pathname === child.path ||
//       location.pathname.startsWith(child.path + "/")
//     );
//   }

//   return false;
// })();
const isActive = (() => {

  if (item.match) {
    return item.match.some((path) => {

      // ✅ Fix: exact root should NOT match subroutes
      if (item.exactRoot && path === "/employee-onboarding") {
        return location.pathname === "/employee-onboarding";
      }

      // ✅ Prevent admin route matching for non-admin tabs
      if (location.pathname.startsWith("/employee-onboarding/admin")) {
        return path === "/employee-onboarding/admin";
      }

      return (
        location.pathname === path ||
        location.pathname.startsWith(path + "/")
      );
    });
  }

  if (item.children) {
    return item.children.some((child) =>
      location.pathname === child.path ||
      location.pathname.startsWith(child.path + "/")
    );
  }

  return false;
})();
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
  