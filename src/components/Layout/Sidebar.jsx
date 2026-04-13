import React, { useState, useRef, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Calendar,
  Clock,
  PlaneTakeoff,
  ChevronDown,
  ChevronRight,
  Handshake,
  UserCog2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leave Management", href: "/leave-management", icon: PlaneTakeoff },
  { name: "Timesheets", href: "/timesheets", icon: Clock },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Employee Exit", href: "/employee-exit", icon: AlertCircle },
];

const userManagementSubmenu = [
  { label: "User Manage", to: "/user-management/users" },
  { label: "Role Manage", to: "/user-management/roles" },
  { label: "Permission Manage", to: "/user-management/permissions" },
  { label: "Group Manage", to: "/user-management/groups" },
  { label: "Access Point Manage", to: "/user-management/access-points" },
];

// DATA FOR THE POP LABEL / SUBMENU
const resourceManagementSubmenu = [
  { label: "Client Management", to: "/resource-management" },
  { label: "Resource Project Management", to: "/resource-management/projects" },
  { label: "Workforce Availability", to: "/resource-management/workforce-availability" },
  { label: "Demand Management", to: "/resource-management/demand" },
  { label: "Role-Off Management", to: "/resource-management/roleoff" },
  { label: "Bench Management", to: "/resource-management/bench" },
  { label: "Utilization & Performance", to: "/resource-management/bench/utilization-performance" },
];

const deliveryManagerResourceManagementSubmenu = resourceManagementSubmenu.filter(
  (item) => item.label === "Demand Management" || item.label === "Role-Off Management"
);

const employeeOnboardingSubmenu = [
  {
    label: "Onboarding Dashboard",
    to: "/employee-onboarding/onboarding-summary",
    children: [
      { label: "Summary", to: "/employee-onboarding/onboarding-summary" },
      { label: "Analytics", to: "/employee-onboarding/analytics" },
    ],
  },
  {
    label: "Onboarding Task",
    to: "/employee-onboarding/",
    children: [
      { label: "Task Dashboard", to: "/employee-onboarding" },
      { label: "Create Offer", to: "/employee-onboarding/create" },
      { label: "BulkUpload", to: "/employee-onboarding/bulk-upload" },
      { label: "Add task", to: "/employee-onboarding/onboarding-task" },
      {
        label: "HR Configuration",
        to: "/employee-onboarding/hr-configuration",
      },
    ],
  },
  {
    label: "Employee Directory",
    to: "/employee-onboarding/employee-directory",
    children: [
      {
        label: "Employee Directory",
        to: "/employee-onboarding/employee-directory",
      },
      { label: "Employee List", to: "/employee-onboarding/employeelist" },
      {
        label: "Organization Tree ",
        to: "/employee-onboarding/organization-tree",
      },
    ],
  },
  {
    label: "Employee Verification",
    to: "/employee-onboarding/hr",
    children: [
      { label: "Employee Verification", to: "/employee-onboarding/hr" },
      {
        label: "Admin Approval Dashboard",
        to: "/employee-onboarding/admin/approval-dashboard",
      },

      {
        label: "Employee Credentials",
        to: "/employee-onboarding/employee-credentials",
      },
    ],
  },
  {
    label: "Employee Documents ",
    to: "/employee-onboarding/employeedocuments",
    children: [
      {
        label: "Employee Documents",
        to: "/employee-onboarding/employeedocuments",
      },
      {
        label: "Document Template",
        to: "/employee-onboarding/documents-template",
      },
      {
        label: "Organization Documents",
        to: "/employee-onboarding/organization-documents",
      },
    ],
  },
  {
    label: "Employee Exit Process",
    to: "/employee-exit",
  }
];

const Sidebar = ({ isCollapsed }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Role checks
  const isAdmin =
    user?.roles?.includes("Admin") || user?.roles?.includes("Super Admin");
  const isRM = user?.roles?.includes("RESOURCE-MANAGER");
  const isPM = user?.roles?.includes("PROJECT-MANAGER");
  const isDM = user?.roles?.includes("DELIVERY-MANAGER");
  const isGeneral = user?.roles?.includes("General");

  // State for User Management Hover
  const [userHovered, setUserHovered] = useState(false);
  const userManagementRef = useRef(null);

  const [eoHovered, setEoHovered] = useState(false);
  const eoRef = useRef(null);

  // State for Resource Management Hover (NEW)
  const [rmHovered, setRmHovered] = useState(false);
  const rmRef = useRef(null);

  const [submenuTop, setSubmenuTop] = useState(0);
  const hoverTimeout = useRef(null);
  const [childMenu, setChildMenu] = useState(null);
  const [childTop, setChildTop] = useState(0);
  const parentHoverRef = useRef(false);
  const childHoverRef = useRef(false);
  const closeTimerRef = useRef(null);

  // --- Handlers for User Management ---
  const handleUserMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (userManagementRef.current) {
      const rect = userManagementRef.current.getBoundingClientRect();
      setSubmenuTop(rect.top);
    }
    setUserHovered(true);
    setRmHovered(false); // Close others
  };

  const handleUserMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setUserHovered(false);
    }, 200);
  };

  const handleParentHover = (item, e) => {
    cancelClose();

    parentHoverRef.current = true;

    if (item.children) {
      const rect = e.currentTarget.getBoundingClientRect();
      setChildTop(rect.top);
      setChildMenu(item.children);
    } else {
      setChildMenu(null);
    }
  };

  const handleParentLeave = () => {
    setTimeout(() => {
      if (!childHoverRef.current) {
        setChildMenu(null);
      }
    }, 150);
  };
  const cancelClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();

    closeTimerRef.current = setTimeout(() => {
      if (!parentHoverRef.current && !childHoverRef.current) {
        setChildMenu(null);
        setEoHovered(false);
      }
    }, 260); // slightly higher = smoother
  };

  // --- Handlers for Resource Management (NEW) ---
  const handleRmMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (rmRef.current) {
      const rect = rmRef.current.getBoundingClientRect();
      setSubmenuTop(rect.top);
    }
    setRmHovered(true);
    setUserHovered(false); // Close others
  };

  const handleRmMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setRmHovered(false);
    }, 200);
  };

  const handleEoMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (eoRef.current) {
      const rect = eoRef.current.getBoundingClientRect();
      setSubmenuTop(rect.top);
    }
    setEoHovered(true);
    setUserHovered(false);
    setRmHovered(false);
  };

  const handleEoMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setEoHovered(false);
    }, 200);
  };

  useEffect(() => {
    setUserHovered(false);
    setRmHovered(false);
    setEoHovered(false);
  }, [location.pathname]);

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-[#081534] text-white flex flex-col z-50 transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"
        } border-r border-[#0f1a3a]`}
    >
      {/* Branding */}
      <div className="p-6 border-b border-[#0f1a3a] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img src="logo.png" alt="Logo" className="h-10 w-10 shrink-0" />
          {!isCollapsed && (
            <div>
              <h1 className="text-base font-bold leading-none">Paves Tech</h1>
              <p className="text-xs text-gray-400 mt-1">intranet</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-hide">
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>

        <ul className="space-y-1">
          {
            <li>
              <Link
                to="/dashboard"
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-medium transition-all duration-200 ${location.pathname === "/dashboard"
                  ? "bg-[#263383] text-white border-l-4 border-[#ff3d72]"
                  : "text-gray-300 hover:bg-[#0f1536] hover:text-white"
                  }`}
                title={isCollapsed ? "Dashboard" : ""}
              >
                <LayoutDashboard className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>Dashboard</span>}
              </Link>
            </li>
          }

          {/* 2. Resource Management (With Pop Label/Submenu) */}
          {(isAdmin || isRM || isDM) && (
            <li
              ref={rmRef}
              className="relative"
              onMouseEnter={(isRM || isDM) ? handleRmMouseEnter : undefined}
              onMouseLeave={(isRM || isDM) ? handleRmMouseLeave : undefined}
            >
              {/* If Admin → Direct Link */}
              {isAdmin && !isRM && !isDM ? (
                <Link
                  to="/resource-management"
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-medium transition-all duration-200 ${location.pathname.startsWith("/resource-management")
                    ? "bg-[#263383] text-white border-l-4 border-[#ff3d72]"
                    : "text-gray-300 hover:bg-[#0f1536] hover:text-white"
                    }`}
                  title={isCollapsed ? "Resource Management" : ""}
                >
                  <UserCog2 className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>Resource Management</span>}
                </Link>
              ) : (
                <>
                  {/* Resource Manager / Delivery Manager → Show Hover Menu */}
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 ${location.pathname.startsWith("/resource-management")
                      ? "bg-[#263383] text-white border-l-4 border-[#ff3d72]"
                      : "text-gray-300 hover:bg-[#0f1536] hover:text-white"
                      }`}
                  >
                    <UserCog2 className="h-5 w-5 shrink-0" />

                    {!isCollapsed && (
                      <>
                        <span className="flex-1">Resource Management</span>
                        <ChevronRight
                          className={`h-4 w-4 transition-all duration-300 ${rmHovered ? "translate-x-1" : ""
                            }`}
                        />
                      </>
                    )}
                  </div>

                  {/* Show submenu only for Resource Manager or Delivery Manager */}
                  {rmHovered && (isRM || isDM) && (
                    <ul
                      className={`fixed w-64 bg-white text-[#0a174e] rounded-lg shadow-2xl z-[9999] py-2 border ${isCollapsed ? "left-20" : "left-64"
                        }`}
                      style={{ top: `${submenuTop}px` }}
                      onMouseEnter={handleRmMouseEnter}
                      onMouseLeave={handleRmMouseLeave}
                    >
                      {(isDM
                        ? deliveryManagerResourceManagementSubmenu
                        : resourceManagementSubmenu
                      ).map((item) => (
                          <li key={item.label}>
                            <NavLink
                              to={item.to}
                              end
                              className={({ isActive }) =>
                                `block px-4 py-2 text-xs transition-colors ${isActive
                                  ? "bg-blue-100 text-[#0a174e] font-semibold"
                                  : "hover:bg-[#263383] hover:text-white"
                                }`
                              }
                            >
                              {item.label}
                            </NavLink>
                          </li>
                        ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          )}

          {/* 3. User Management (Admin Only) */}
          {isAdmin && (
            <li
              ref={userManagementRef}
              className="relative"
              onMouseEnter={handleUserMouseEnter}
              onMouseLeave={handleUserMouseLeave}
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 ${location.pathname.startsWith("/user-management")
                  ? "bg-[#263383] text-white border-l-4 border-[#ff3d72]"
                  : "text-gray-300 hover:bg-[#0f1536] hover:text-white"
                  }`}
                title={isCollapsed ? "User Management" : ""}
              >
                <Users className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1">User Management</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${userHovered ? "rotate-180" : ""
                        }`}
                    />
                  </>
                )}
              </div>

              {/* User Management Submenu */}
              {userHovered && (
                <ul
                  className={`fixed w-56 bg-white text-[#0a174e] rounded-lg shadow-2xl z-[9999] py-2 border ${isCollapsed ? "left-20" : "left-64"
                    }`}
                  style={{ top: `${submenuTop}px` }}
                  onMouseEnter={handleUserMouseEnter}
                  onMouseLeave={handleUserMouseLeave}
                >
                  {userManagementSubmenu.map((item) => (
                    <li key={item.label}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-xs transition-colors ${isActive
                            ? "bg-blue-100 text-[#0a174e] font-semibold"
                            : "hover:bg-[#263383] hover:text-white"
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* 4. Employee Onboarding (Non-General, Non-DM) */}
          {!isGeneral && (
            <li
              ref={eoRef}
              className="relative"
              onMouseEnter={handleEoMouseEnter}
              onMouseLeave={handleEoMouseLeave}
            >
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-medium cursor-pointer transition-all duration-200 ${location.pathname == "/employee-onboarding" ||
                  location.pathname == "/employee-onboarding/"
                  ? "bg-[#263383] text-white border-l-4 border-[#ff3d72]"
                  : "text-gray-300 hover:bg-[#0f1536] hover:text-white"
                  }`}
                title={isCollapsed ? "Employee Onboarding" : ""}
              >
                <Handshake className="h-5 w-5 shrink-0" />

                {!isCollapsed && (
                  <>
                    <span className="flex-1">Employee Onboarding</span>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${eoHovered ? "rotate-180" : ""
                        }`}
                    />
                  </>
                )}
              </div>

              {/* SAME POPUP STYLE AS RESOURCE MANAGEMENT */}
              {eoHovered && (
                <ul
                  className={`fixed w-64 bg-white text-[#0a174e] rounded-lg shadow-2xl z-[9999] py-2 border ${isCollapsed ? "left-20" : "left-64"
                    }`}
                  style={{ top: `${submenuTop}px` }}
                  onMouseEnter={() => {
                    parentHoverRef.current = true;
                    cancelClose();
                    // if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
                  }}
                  onMouseLeave={() => {
                    parentHoverRef.current = false;
                    scheduleClose();
                  }}
                >
                  {employeeOnboardingSubmenu.map((item) => (
                    <li
                      key={item.label}
                      onMouseEnter={(e) => handleParentHover(item, e)}
                      onMouseDown={(e) => handleParentLeave()}
                      // onMouseLeave={handleParentLeave}
                      className="relative"
                    >
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-xs transition-colors ${isActive
                            ? "bg-blue-100 text-[#0a174e] font-semibold"
                            : "hover:bg-[#263383] hover:text-white"
                          }`
                        }
                      >
                        {item.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
              {childMenu && (
                <ul
                  className={`fixed w-56 bg-white text-[#0a174e] rounded-lg shadow-2xl z-[9999] py-2 border ${isCollapsed ? "left-[300px]" : "left-[520px]"
                    }`}
                  style={{ top: `${childTop - 4}px` }}
                  onMouseEnter={() => {
                    childHoverRef.current = true;
                    cancelClose();
                  }}
                  onMouseLeave={() => {
                    childHoverRef.current = false;
                    scheduleClose();
                  }}
                  onMouseDown={() => {
                    childHoverRef.current = false;
                    scheduleClose();
                  }}
                >
                  {childMenu.map((child) => (
                    <li key={child.label}>
                      <NavLink
                        to={child.to}
                        className={({ isActive }) =>
                          `block px-4 py-2 text-xs transition-colors ${isActive
                            ? "bg-blue-100 text-[#0a174e] font-semibold"
                            : "hover:bg-[#263383] hover:text-white"
                          }`
                        }
                      >
                        {child.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* 5. Remaining Items (Leave, Timesheets, Calendar) */}
          {navigation.slice(1).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-medium transition-all duration-200 ${isActive
                    ? "bg-[#263383] text-white border-l-4 border-[#ff3d72]"
                    : "text-gray-300 hover:bg-[#0f1536] hover:text-white"
                    }`}
                  title={isCollapsed ? item.name : ""}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;

// : (isPM && !isRM && !isDM) ? (
//                 <Link
//                   to="/resource-management/projects"
//                   className={`flex items-center gap-3 px-4 py-3 rounded-md text-xs font-medium transition-all duration-200 ${location.pathname.startsWith("/resource-management/projects")
//                     ? "bg-[#263383] text-white border-l-4 border-[#ff3d72]"
//                     : "text-gray-300 hover:bg-[#0f1536] hover:text-white"
//                     }`}
//                   title={isCollapsed ? "Resource Project Management" : ""}
//                 >
//                   <UserCog2 className="h-5 w-5 shrink-0" />
//                   {!isCollapsed && <span>Resource Project Management</span>}
//                 </Link>
//               )
