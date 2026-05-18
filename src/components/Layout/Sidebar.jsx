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
import { EO_SUBMENU } from "../../config/sidebarConfig";
import { filterMenuByRole } from "../../utils/sidebarPermissions";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    name: "Projects",
    href: "/projects",
    icon: FolderKanban,
    allowedRoles: ["Project_Manager", "General", "Tester"],
  },
  { name: "Leave Management", href: "/leave-management", icon: PlaneTakeoff },
  { name: "Timesheets", href: "/timesheets", icon: Clock },
  // { name: "Calendar", href: "/calendar", icon: Calendar },
  // { name: "Employee Exit", href: "/employee-exit", icon: AlertCircle },
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

// EO_SUBMENU is now config-driven from src/config/sidebarConfig.js.
// filterMenuByRole() trims it to only the items allowed for the current user's roles.

const Sidebar = ({ isCollapsed }) => {
  const location = useLocation();
  const { user, hasRole } = useAuth();

  // Filter main navigation based on allowedRoles
  const filteredNavigation = navigation.filter((item) => {
    if (!item.allowedRoles) return true;

    // Standard check
    const isAllowed = hasRole(item.allowedRoles);
    if (!isAllowed) return false;

    // Special logic for Projects to handle the "General" role commonality
    if (item.name === "Projects") {
      const userRoles = user?.roles?.map((r) => r.toUpperCase()) || [];
      // Roles that should not see Projects by default
      const forbiddenRoles = ["ADMIN", "SUPER ADMIN", "HR", "HR_MANAGER", "RESOURCE_MANAGER", "DELIVERY_MANAGER", "REPORTING_MANAGER"];
      // Roles that override the forbidden roles
      const strongRoles = ["PROJECT_MANAGER", "TESTER"];

      // If user has a professional project role, always show it
      if (userRoles.some((r) => strongRoles.includes(r))) return true;

      // If user has any forbidden role (and no strong role), hide it
      if (userRoles.some((r) => forbiddenRoles.includes(r))) return false;
    }

    return true;
  });

  // Role-filtered EO submenu — recomputed whenever the component re-renders with a new user
  const filteredEoSubmenu = filterMenuByRole(EO_SUBMENU, hasRole);

  // Role checks
  const isAdmin =
    user?.roles?.includes("Admin") || user?.roles?.includes("Super Admin");
  const isRMSAdmin = user?.roles?.includes("Admin");
  const isRM = user?.roles?.includes("Resource_Manager");
  const isPM = user?.roles?.includes("Project_Manager");
  const isDM = user?.roles?.includes("Delivery_Manager");
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

  const closeAllSubmenus = () => {
    setUserHovered(false);
    setRmHovered(false);
    setEoHovered(false);
    setChildMenu(null);
  };

  // --- Handlers for User Management ---
  const handleUserMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    closeAllSubmenus();
    if (userManagementRef.current) {
      const rect = userManagementRef.current.getBoundingClientRect();
      setSubmenuTop(rect.top);
    }
    setUserHovered(true);
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
    closeAllSubmenus();
    if (rmRef.current) {
      const rect = rmRef.current.getBoundingClientRect();
      setSubmenuTop(rect.top);
    }
    setRmHovered(true);
  };

  const handleRmMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setRmHovered(false);
    }, 200);
  };

  const handleEoMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    closeAllSubmenus();
    if (eoRef.current) {
      const rect = eoRef.current.getBoundingClientRect();
      setSubmenuTop(rect.top);
    }
    setEoHovered(true);
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
                onMouseEnter={closeAllSubmenus}
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

          {/* Employee Onboarding (Non-General, Non-DM) */}
          {(
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
                  className={`fixed w-fit min-w-[220px] whitespace-nowrap bg-white text-[#0a174e] rounded-lg shadow-2xl z-[9999] py-2 border ${isCollapsed ? "left-20" : "left-64"
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
                  {filteredEoSubmenu.map((item) => (
                    <li
                      key={item.label}
                      onMouseEnter={(e) => handleParentHover(item, e)}
                      onMouseDown={(e) => handleParentLeave()}
                      // onMouseLeave={handleParentLeave}
                      className="relative group"
                    >
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-4 py-2 text-xs transition-colors ${isActive
                            ? "bg-blue-100 text-[#0a174e] font-semibold"
                            : "hover:bg-[#263383] hover:text-white"
                          }`
                        }
                      >
                        <span>{item.label}</span>
                        {item.children && (
                          <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
              {childMenu && (
                <ul
                  className={`fixed w-fit min-w-[220px] whitespace-nowrap bg-white text-[#0a174e] rounded-lg shadow-2xl z-[9999] py-2 border ${isCollapsed ? "left-[300px]" : "left-[520px]"
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
                    <li key={child.label} className="group relative">
                      <NavLink
                        to={child.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-4 py-2 text-xs transition-colors ${isActive
                            ? "bg-blue-100 text-[#0a174e] font-semibold"
                            : "hover:bg-[#263383] hover:text-white"
                          }`
                        }
                      >
                        <span>{child.label}</span>
                        {child.children && (
                          <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* User Management (Admin Only) */}
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
                  className={`fixed w-fit min-w-[220px] whitespace-nowrap bg-white text-[#0a174e] rounded-lg shadow-2xl z-[9999] py-2 border ${isCollapsed ? "left-20" : "left-64"
                    }`}
                  style={{ top: `${submenuTop}px` }}
                  onMouseEnter={handleUserMouseEnter}
                  onMouseLeave={handleUserMouseLeave}
                >
                  {userManagementSubmenu.map((item) => (
                    <li key={item.label} className="group relative">
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-4 py-2 text-xs transition-colors ${isActive
                            ? "bg-blue-100 text-[#0a174e] font-semibold"
                            : "hover:bg-[#263383] hover:text-white"
                          }`
                        }
                      >
                        <span>{item.label}</span>
                        {item.children && (
                          <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* Resource Management (With Pop Label/Submenu) */}
          {(isRMSAdmin || isRM || isDM) && (
            <li
              ref={rmRef}
              className="relative"
              onMouseEnter={(isRM || isDM || isRMSAdmin) ? handleRmMouseEnter : undefined}
              onMouseLeave={(isRM || isDM || isRMSAdmin) ? handleRmMouseLeave : undefined}
            >
              {/* If Admin → Direct Link */}
              {isRMSAdmin && !isRM && !isDM ? (
                <Link
                  to="/resource-management"
                  onMouseEnter={closeAllSubmenus}
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
                  {rmHovered && (isRM || isDM || isRMSAdmin) && (
                    <ul
                      className={`fixed w-fit min-w-[220px] whitespace-nowrap bg-white text-[#0a174e] rounded-lg shadow-2xl z-[9999] py-2 border ${isCollapsed ? "left-20" : "left-64"
                        }`}
                      style={{ top: `${submenuTop}px` }}
                      onMouseEnter={handleRmMouseEnter}
                      onMouseLeave={handleRmMouseLeave}
                    >
                      {(isDM
                        ? deliveryManagerResourceManagementSubmenu
                        : resourceManagementSubmenu
                      ).map((item) => (
                        <li key={item.label} className="group relative">
                          <NavLink
                            to={item.to}
                            end
                            className={({ isActive }) =>
                              `flex items-center justify-between px-4 py-2 text-xs transition-colors ${isActive
                                ? "bg-blue-100 text-[#0a174e] font-semibold"
                                : "hover:bg-[#263383] hover:text-white"
                              }`
                            }
                          >
                            <span>{item.label}</span>
                            {item.children && (
                              <ChevronRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
                            )}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          )}

          {/* 5. Remaining Items (Leave, Timesheets, Calendar) */}
          {filteredNavigation.slice(1).map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onMouseEnter={closeAllSubmenus}
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
