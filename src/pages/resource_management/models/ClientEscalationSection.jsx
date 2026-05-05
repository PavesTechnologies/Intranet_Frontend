import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ClientEscalationContact from "./ClientEscalationContact";
import CompanyEscalation from "./CompanyEscalation";

export default function ClientEscalationSection({ clientId, clientContactRefetchKey }) {
  const [activeTab, setActiveTab] = useState("client");

  return (
    <div className="w-full">
      {/* Tab container */}
      <div className="flex items-center justify-between border-b border-gray-200">
        {/* LEFT: Tabs */}
        <div className="flex space-x-6">
          <button
            onClick={() => setActiveTab("client")}
            className="relative pb-2 font-medium transition-colors focus:outline-none"
          >
            <span
              className={
                activeTab === "client"
                  ? "text-indigo-600"
                  : "text-gray-600 hover:text-gray-900"
              }
            >
              Client
            </span>

            {activeTab === "client" && (
              <motion.div
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-600"
                layoutId="underline"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab("company")}
            className="relative pb-2 font-medium transition-colors focus:outline-none"
          >
            <span
              className={
                activeTab === "company"
                  ? "text-indigo-600"
                  : "text-gray-600 hover:text-gray-900"
              }
            >
              Company
            </span>

            {activeTab === "company" && (
              <motion.div
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-600"
                layoutId="underline"
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              />
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 min-h-[100px] mb-8">
        <AnimatePresence mode="wait">
          {activeTab === "client" && (
            <motion.div
              key="client"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <ClientEscalationContact clientId={clientId} escalationRefetchKey={clientContactRefetchKey} />
            </motion.div>
          )}

          {activeTab === "company" && (
            <motion.div
              key="company"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <CompanyEscalation />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}