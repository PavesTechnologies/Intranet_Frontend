"use client";

import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useEffect } from "react";

export default function OnboardingNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const isAdmin = hasRole(["ADMIN"]);
  const isManager = hasRole(["REPORTING_MANAGER"]);
  const isGeneral = hasRole(["GENERAL"]);
  const isHR = hasRole(["HR"]);
  
  const isOnlyGeneral =
    hasRole(["GENERAL"]) &&
    !hasRole(["HR"]) &&
    !hasRole(["Reporting_Manager"]) &&
    !hasRole(["ADMIN"]);

  useEffect(() => {
    if (
      isOnlyGeneral &&
      location.pathname === "/employee-onboarding"
    ) {
      navigate("/employee-onboarding/employee-directory", { replace: true });
    }
  }, [isOnlyGeneral, location.pathname, navigate]);

  /* ================= HIDE NAVBAR ================= */

  const hideNavbarRoutes = [
    "/employee-onboarding/employee-credentials",
    "/employee-onboarding/employeeProfile",
  ];

  if (hideNavbarRoutes.some((route) => location.pathname.startsWith(route))) {
    return null;
  }

  /* ================= PARENT NAV ================= */

  const parentNav = [
    // ✅ Insights & Analytics → HR, MANAGER
    ...(hasRole(["HR", "Reporting_Manager"]) ? [{
      label: "Insights & Analytics",
      match: [
        "/employee-onboarding/onboarding-summary",
        "/employee-onboarding/analytics"
      ],
      redirect: "/employee-onboarding/onboarding-summary",
    }] : []),

    // ✅ Onboarding Management → HR, ADMIN, MANAGER
    ...((isHR || isAdmin || isManager) ? [{
      label: "Onboarding Management",
      match: [
        "/employee-onboarding",
        "/employee-onboarding/create",
        "/employee-onboarding/bulk-upload",
        "/employee-onboarding/onboarding-task",
        "/employee-onboarding/hr-configuration",
      ],
      exactRoot: true,
      redirect: isManager && isGeneral
        ? "/employee-onboarding/admin/approval-dashboard"
        : "/employee-onboarding",
    }] : []),

    // ✅ People Directory → ALL
    {
      label: "Employee Directory",
      match: [
        "/employee-onboarding/employee-directory",
        "/employee-onboarding/employeelist",
        "/employee-onboarding/organization-tree",
      ],
      redirect: "/employee-onboarding/employee-directory",
    },

    // ✅ Document Center → HR, MANAGER
    ...(hasRole(["HR", "Reporting_Manager"]) ? [{
      label: "Document Center",
      match: [
        "/employee-onboarding/employeedocuments",
        // "/employee-onboarding/document-templates",
        // "/employee-onboarding/organization-documents",
      ],
      redirect: "/employee-onboarding/employeedocuments",
    }] : []),

    // ✅ Workforce Reports → HR, MANAGER
    ...(hasRole(["HR", "Reporting_Manager"]) ? [{
      label: "Workforce Reports",
      match: ["/employee-onboarding/weekly-joining-report-dashboard"],
      redirect: "/employee-onboarding/weekly-joining-report-dashboard",
    }] : []),

    // ✅ Compliance & Verification (Parent → HR + MANAGER)
    ...(hasRole(["HR", "REPORTING_MANAGER"]) ? [{
      label: "Compliance & Verification",
      redirect: hasRole(["HR"])
        ? "/employee-onboarding/hr"
        : "/employee-onboarding/core-employee",
      children: [
        ...(hasRole(["HR"]) ? [
          { label: "Internal Audit", path: "/employee-onboarding/hr" },
          { label: "BGC Screening", path: "/employee-onboarding/backgroundcheck" },
        ] : []),
        ...(hasRole(["HR", "REPORTING_MANAGER"]) ? [
          { label: "Profile Hub", path: "/employee-onboarding/core-employee" }
        ] : []),
      ]
    }] : []),

    // ✅ Offboarding → HR, MANAGER
    ...(hasRole(["HR", "REPORTING_MANAGER"]) ? [{
      label: "Offboarding",
      match: ["/employee-exit"],
      redirect: "/employee-exit",
    }] : []),

    ...(hasRole(["HR", "ADMIN"]) ? [{
      label: "ManageSkillTaxonomy",
      match: ["/employee-onboarding/manage-skill-taxonomy"],
      redirect: "/employee-onboarding/manage-skill-taxonomy",
    }] : []),
  ];

  /* ================= SUB-NAV DEFINITIONS ================= */

  const managementNav = [
    ...(!isOnlyGeneral
      ? [{ label: "Workflow Overview", path: "/employee-onboarding" }]
      : []),
    ...(hasRole(["HR"]) ? [
      { label: "Offer Management", path: "/employee-onboarding/create" },
      { label: "Data Import", path: "/employee-onboarding/bulk-upload" }
    ] : []),
    ...(hasRole(["HR", "ADMIN"]) ? [
      { label: "Task Configuration", path: "/employee-onboarding/onboarding-task" }
    ] : []),
    ...(hasRole(["HR", "ADMIN"]) ? [
      { label: "System Settings", path: "/employee-onboarding/hr-configuration" }
    ] : []),
    ...(isManager && !isAdmin ? [
      { label: "Pending Approvals", path: "/employee-onboarding/admin/approval-dashboard" }
    ] : []),
  ];

  const insightsNav = [
    { label: "Executive Summary", path: "/employee-onboarding/onboarding-summary" },
    { label: "Operational Metrics", path: "/employee-onboarding/analytics" },
  ];

  const directoryNav = [
    { label: "Employee Directory", path: "/employee-onboarding/employee-directory" },
    ...(isHR || isManager ? [{ label: "Member Records", path: "/employee-onboarding/employeelist" }] : []),
    { label: "Org Chart", path: "/employee-onboarding/organization-tree" },
  ];

  const documentsNav = [
    ...(hasRole(["HR", "REPORTING_MANAGER"]) ? [{ label: "Personnel Files", path: "/employee-onboarding/employeedocuments" }] : []),
    ...(hasRole(["HR"]) ? [
      { label: "e-Form Templates", path: "/employee-onboarding/document-templates" },
      // { label: "Corporate Policies", path: "/employee-onboarding/organization-documents" }
    ] : []),
  ];

  const complianceNav = [
    ...(hasRole(["HR"]) ? [
      { label: "Internal Audit", path: "/employee-onboarding/hr" },
      { label: "BGC Screening", path: "/employee-onboarding/backgroundcheck" }
    ] : []),
    ...(hasRole(["HR", "ADMIN", "REPORTING_MANAGER"]) ? [{ label: "Profile Hub", path: "/employee-onboarding/core-employee" }] : []),
  ];

  const reportsNav = [
    { label: "Reporting Dashboard", path: "/employee-onboarding/weekly-joining-report-dashboard" },
  ];

  const offboardingNav = [
    { label: "Offboarding Overview", path: "/employee-exit" },
  ];

  const skillTaxonomyNav = [
    { label: "Skill Taxonomy", path: "/employee-onboarding/manage-skill-taxonomy" },
    { label: "Requests", path: "/employee-onboarding/manage-skill-taxonomy/requests" },
  ];

  /* ================= NAV SWITCH LOGIC ================= */

  let navToRender = managementNav; // Default

  const path = location.pathname;

  if (path.startsWith("/employee-onboarding/onboarding-summary") || path.startsWith("/employee-onboarding/analytics")) {
    navToRender = insightsNav;
  } 
  else if (path.startsWith("/employee-onboarding/employee-directory") || path.startsWith("/employee-onboarding/employeelist") || path.startsWith("/employee-onboarding/organization-tree")) {
    navToRender = directoryNav;
  } 
  else if (path.startsWith("/employee-onboarding/employeedocuments") || path.startsWith("/employee-onboarding/document-templates") || path.startsWith("/employee-onboarding/organization-documents")) {
    navToRender = documentsNav;
  } 
  else if (path.startsWith("/employee-onboarding/hr") || path.startsWith("/employee-onboarding/backgroundcheck") || path.startsWith("/employee-onboarding/core-employee")) {
    // 💡 This block handles compliance. Since 'hr-configuration' starts with 'hr', 
    // we explicitly check to ensure hr-configuration stays in Management Nav.
    if (path.startsWith("/employee-onboarding/hr-configuration")) {
        navToRender = managementNav;
    } else {
        navToRender = complianceNav;
    }
  } 
  else if (path.startsWith("/employee-onboarding/weekly-joining-report-dashboard")) {
    navToRender = reportsNav;
  } 
  else if (path.startsWith("/employee-exit")) {
    navToRender = offboardingNav;
  } 
  else if (path.startsWith("/employee-onboarding/manage-skill-taxonomy")) {
    navToRender = skillTaxonomyNav;
  }
  else if (path.startsWith("/employee-onboarding")) {
    navToRender = managementNav;
  }

  /* ================= RENDER ================= */
  return (
    <div>
      {/* PARENT NAVBAR */}
      <div className="relative border-b bg-white z-30">
        <div className="flex gap-6 px-6 py-1">
          {parentNav.map((item) => {
            const isActive = (() => {
              if (item.match) {
                return item.match.some((p) => {
                  if (item.exactRoot && p === "/employee-onboarding") return path === "/employee-onboarding";
                  if (path.startsWith("/employee-onboarding/admin")) return p === "/employee-onboarding/admin";
                  return path === p || path.startsWith(p + "/");
                });
              }
              if (item.children) {
                return item.children.some((child) => path === child.path || path.startsWith(child.path + "/"));
              }
              return false;
            })();

            return (
              <div key={item.label} onClick={() => navigate(item.redirect)} className="relative cursor-pointer py-1 text-sm font-semibold">
                <span className={isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}>{item.label}</span>
                {isActive && (
                  <span className="absolute left-1/2 -bottom-[6px] -translate-x-1/2 h-0 w-0 z-40 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-blue-700" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECONDARY NAVBAR */}
      <div className="relative border-b bg-gray-200 mt-4 z-10">
        <div className="flex gap-6 px-6">
          {navToRender.map((item) => {
            let isActive = (() => {
              if (item.path === "/employee-onboarding") return path === "/employee-onboarding";
              const directMatch = path === item.path || path.startsWith(item.path + "/");
              if (!directMatch) return false;
              // Yield to a more specific sibling that also matches (e.g. /requests beats /manage-skill-taxonomy)
              const moreSpecificSiblingMatches = navToRender.some(
                (other) =>
                  other.path !== item.path &&
                  other.path.startsWith(item.path) &&
                  (path === other.path || path.startsWith(other.path + "/")),
              );
              return !moreSpecificSiblingMatches;
            })();

            return (
              <div key={item.label} onClick={() => navigate(item.path)} className="relative cursor-pointer py-1 text-sm font-medium">
                <span className={isActive ? "text-gray-900" : "text-gray-500 hover:text-gray-900"}>{item.label}</span>
                {isActive && (
                  <span className="absolute left-1/2 -bottom-1 h-0 w-0 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-green-500" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
