import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, User, Menu, X, Eye, KeyRound, ChevronDown, } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";

// Update this constant when the Change Password route is confirmed
const CHANGE_PASSWORD_ROUTE = "/change-password";

const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [employeeProfile, setEmployeeProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const name = user?.name || user?.email || "User";
  const firstName = name.split(" ")[0];
  const role = user?.roles?.join(", ") || "User";

  const iconVariants = {
    hidden: { rotate: -15, opacity: 1, scale: 0.5 },
    visible: {
      rotate: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.25 },
    },
    exit: {
      rotate: 15,
      opacity: 1,
      scale: 0.5,
      transition: { duration: 0.25 },
    },
  };

  useEffect(() => {
    const fetchEmployeeProfile = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) return;

        const res = await axios.get(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const employees = Array.isArray(res.data)
          ? res.data
          : res.data.data || [];

        console.log("EMPLOYEES API:", employees);
        console.log("AUTH USER:", user);

        // Match logged-in employee using employee_id
        const matchedEmployee = employees.find(
          (emp) =>
            String(emp.employee_id) ===
            String(user?.employee_id)
        );

        console.log(
          "MATCHED EMPLOYEE:",
          matchedEmployee
        );

        setEmployeeProfile(matchedEmployee);

      } catch (err) {
        console.error(
          "Failed to fetch employee profile",
          err
        );
      }
    };

    if (user?.employee_id) {
      fetchEmployeeProfile();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleViewProfile = () => {
    setDropdownOpen(false);
    if (!employeeProfile?.employee_uuid) return;
    navigate(`/employee-onboarding/employeeProfile/${employeeProfile.employee_uuid}`);
  };

  const handleChangePassword = () => {
    setDropdownOpen(false);
    navigate(`/profile/edit`);
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/");
  };

  return (
    <header className="bg-white border-b border-gray-200 px-5 py-2 sticky top-0 z-[50]">
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Sidebar Toggle */}
          <button
            onClick={onToggleSidebar}
            className="flex items-center justify-center p-2 rounded-md hover:bg-gray-100 transition-colors"
            title="Toggle Sidebar"
          >
            <AnimatePresence mode="wait" initial={true}>
              {isSidebarOpen ? (
                <motion.div
                  key="x"
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <X className="h-5 w-5 text-gray-700" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  variants={iconVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  <Menu className="h-5 w-5 text-gray-700" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <div>
            <h2 className="text-1.5xl font-bold text-gray-900">
              Welcome back, {firstName}
            </h2>

            <p className="text-sm text-gray-600">
              Here's what's happening with your organization today.
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          {/* <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="h-5 w-5" />

            <span className="absolute top-1 right-1 h-2 w-2 bg-[#ff3d72] rounded-full"></span>
          </button> */}

          {/* Profile dropdown */}
          <div className="relative pl-4 border-l border-gray-200" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center space-x-3 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors"
              title={role}
            >
              <div className="h-8 w-8 bg-[#263383] rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-white" />
              </div>

              <div className="hidden md:block text-left max-w-[180px]">
                <p className="text-sm font-medium text-gray-900 leading-tight truncate">{name}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{role}</p>
              </div>

              <ChevronDown
                className={`h-4 w-4 text-gray-400 hidden md:block transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
              />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50"
                  style={{ boxShadow: "0 8px 24px rgba(8,21,52,0.12)" }}
                >
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-[#f4f6fc]">
                    <p className="text-xs font-bold text-[#081534] truncate">{name}</p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{role}</p>
                  </div>

                  {/* Menu items */}
                  <div className="py-1">
                    <button
                      onClick={handleViewProfile}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f4f6fc] hover:text-[#263383] transition-colors"
                    >
                      <Eye className="h-4 w-4 flex-shrink-0" />
                      View Profile
                    </button>

                    <button
                      onClick={handleChangePassword}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f4f6fc] hover:text-[#263383] transition-colors"
                    >
                      <KeyRound className="h-4 w-4 flex-shrink-0" />
                      Change Password
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 flex-shrink-0" />
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
