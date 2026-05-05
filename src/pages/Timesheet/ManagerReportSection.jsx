import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ManagerMonthlyReport from "./ManagerMonthlyReport";
import ReportDashboard from "./ReportDashboard";

export default function ManagerReportSection() {
  const [activeTab, setActiveTab] = useState("monthlyReport"); 
  const navigate = useNavigate();
  return (
    <div className="w-full">
      {/* Tab container */}
      <div className="flex space-x-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("monthlyReport")}
          // ✨ CHANGE: Added 'relative' positioning
          className="relative pb-2 font-medium transition-colors focus:outline-none"
        >
          {/* Change text color based on active state */}
          <span
            className={
              activeTab === "monthlyReport"
                ? "text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
            }
          >
            Monthly Report
          </span>

          {/* ✨ CHANGE: Conditional underline with layoutId */}
          {activeTab === "monthlyReport" && (
            <motion.div
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-600"
              layoutId="underline"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab("financeReport")}
          // ✨ CHANGE: Added 'relative' positioning
          className="relative pb-2 font-medium transition-colors focus:outline-none"
        >
          {/* Change text color based on active state */}
          <span
            className={
              activeTab === "financeReport"
                ? "text-indigo-600"
                : "text-gray-600 hover:text-gray-900"
            }
          >
            Finance Report
          </span>
          
          {/* ✨ CHANGE: Conditional underline with layoutId */}
          {activeTab === "financeReport" && (
            <motion.div
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-600"
              layoutId="underline"
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            />
          )}
        </button>

        <div className="flex justify-between content-end">
          <button onClick={() => navigate(-1)}>
            <X className="text-gray-600" size={20} width={20}></X>
          </button>
        </div>
      </div>

      {/* Animated content (no changes here) */}
      <div className="mt-4">
        <AnimatePresence mode="wait">
          {activeTab === "monthlyReport" && (
            <motion.div
              key="monthlyReport"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ManagerMonthlyReport />
            </motion.div>
          )}

          {activeTab === "financeReport" && (
            <motion.div
              key="financeReport"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ReportDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
