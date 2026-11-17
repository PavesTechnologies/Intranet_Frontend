import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BlockLeaveDates from "./BlockLeaveDates";
import ManageActiveLeaveBlocks from "./ManageActiveLeaveBlocks";
import { Tabs, TabsList, TabsTrigger } from "../../../components/ui/tabs";

export default function BlockLeaveSection({ employeeId }) {
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" or "projectMembers"

  return (
    <div className="w-full">
      {/* Tab container */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="!inline-flex !h-auto !bg-transparent !p-0 !rounded-none !justify-start items-center gap-6 border-b border-gray-200">
          <TabsTrigger
            value="dashboard"
            className="relative pb-2 !rounded-none !bg-transparent !shadow-none font-medium transition-colors focus:outline-none data-[state=active]:!text-indigo-600 data-[state=inactive]:text-gray-600 hover:text-gray-900"
          >
            Active Blocked Leaves
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
            Block Leave Dates
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

      {/* Animated content (no changes here) */}
      <div className="mt-4 relative min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute w-full"
            >
              <ManageActiveLeaveBlocks employeeId={employeeId} />
            </motion.div>
          )}

          {activeTab === "projectMembers" && (
            <motion.div
              key="projectMembers"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute w-full"
            >
              <BlockLeaveDates employeeId={employeeId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}