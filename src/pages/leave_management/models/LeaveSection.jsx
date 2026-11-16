import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LeaveDashboard from "../charts/LeaveDashboard";
import ProjectMembersOnLeave from "./ProjectMembersOnLeave";
import { YearDropdown } from "./EmployeeLeaveBalances";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";

export default function LeaveSection({ employeeId, leaveId, onClose }) {
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" or "projectMembers"
  // console.log("leave section", employeeId, leaveId);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!onClose) return;
    document.body.style.overflow = "hidden";
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
    };
  }, [onClose]);


  return (
    <div className="w-full">
      {/* Tab container */}
      <div className="flex items-center justify-between border-b border-gray-200">
        {/* LEFT: Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="!inline-flex !h-auto !bg-transparent !p-0 !rounded-none !justify-start items-center gap-6">
            <TabsTrigger
              value="dashboard"
              className="relative pb-2 !rounded-none !bg-transparent !shadow-none font-medium transition-colors focus:outline-none data-[state=active]:!text-indigo-600 data-[state=inactive]:text-gray-600 hover:text-gray-900"
            >
              Leave Balance
              {activeTab === "dashboard" && (
                <motion.div
                  className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-600"
                  layoutId="underline"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </TabsTrigger>

            <TabsTrigger
              value="projectMembers"
              className="relative pb-2 !rounded-none !bg-transparent !shadow-none font-medium transition-colors focus:outline-none data-[state=active]:!text-indigo-600 data-[state=inactive]:text-gray-600 hover:text-gray-900"
            >
              Team Members on Leave
              {activeTab === "projectMembers" && (
                <motion.div
                  className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-600"
                  layoutId="underline"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* RIGHT: Year Dropdown */}
        <div className="flex items-end">
          <YearDropdown value={currentYear} onChange={setCurrentYear} />
        </div>
      </div>
      {/* Remove min-h and relative, just let content flow */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.25 }}
              // ✅ No absolute — takes full flow width naturally
            >
              <LeaveDashboard employeeId={employeeId} year={currentYear} />
            </motion.div>
          )}

          {activeTab === "projectMembers" && (
            <motion.div
              key="projectMembers"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
            >
              <ProjectMembersOnLeave
                employeeId={employeeId}
                leaveId={leaveId}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
