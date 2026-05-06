import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ClientBasicSLA from "./ClientBasicSLA";
import ClientBasicCompliance from "./ClientBasicCompliance";
import ClientEscalationContact from "./ClientEscalationContact";
import ClientEscalationSection from "./ClientEscalationSection";
// import ClientAssets from "./ClientAssets";

export default function ClientSection({ clientDetails, slaRefetchKey, complianceRefetchKey, escalationRefetchKey }) {
  // const [activeTab, setActiveTab] = useState("escalation");
  const TAB_CONFIG = [
    { key: "sla", label: "SLA", enabled: (d) => d?.SLA },
    { key: "compliance", label: "Pre-requisites", enabled: (d) => d?.compliance },
    {
      key: "escalation",
      label: "Escalation Contact",
      enabled: (d) => d?.escalationContact,
    },
  ];
  const visibleTabs = useMemo(
    () => TAB_CONFIG.filter((t) => t.enabled(clientDetails)),
    [clientDetails]
  );

  const [activeTab, setActiveTab] = useState(
    visibleTabs[0]?.key
  );

  // 🔥 Reset active tab if clientDetails changes
  useEffect(() => {
    if (visibleTabs.length > 0) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs]);

  // 🚫 No tabs → render nothing
  if (visibleTabs.length === 0) return null;


  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
        <div className="flex space-x-6 min-w-max">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative pb-3 font-medium focus:outline-none"
            >
              <span
                className={
                  activeTab === tab.key
                    ? "text-indigo-600 font-semibold"
                    : "text-gray-500 hover:text-gray-800"
                }
              >
                {tab.label}
              </span>

              {activeTab === tab.key && (
                <motion.div
                  className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-indigo-600"
                  layoutId="underline"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Container - REMOVED fixed height and absolute positioning */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          {activeTab === "sla" && (
            <motion.div
              key="sla"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ClientBasicSLA clientId={clientDetails.clientId} slaRefetchKey={slaRefetchKey} />
            </motion.div>
          )}

          {activeTab === "compliance" && (
            <motion.div key="compliance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <ClientBasicCompliance clientId={clientDetails.clientId} complianceRefetchKey={complianceRefetchKey} />
            </motion.div>
          )}

          {activeTab === "escalation" && (
            <motion.div key="escalation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              {/* <ClientEscalationContact clientId={clientDetails.clientId} escalationRefetchKey={escalationRefetchKey} /> */}
              <ClientEscalationSection clientId={clientDetails.clientId} clientContactRefetchKey={escalationRefetchKey} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}