import React from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut, User, Menu, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-[60]">
      <div className="flex items-center justify-between">
        {/* Left Section with Toggle */}
        <div className="flex items-center gap-4">
          {/* Sidebar toggle button */}
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
          <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-[#ff3d72] rounded-full"></span>
          </button>

          <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
            <div
              className="flex items-center space-x-3 cursor-pointer"
              onClick={() => navigate("/profile")}
            >
              <div className="h-8 w-8 bg-[#263383] rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-white" />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{name}</p>
                <p className="text-xs text-gray-600">{role}</p>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                navigate("/");
              }}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
