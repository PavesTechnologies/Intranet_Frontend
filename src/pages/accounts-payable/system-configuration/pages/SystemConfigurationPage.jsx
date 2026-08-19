import { useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import GeneralConfigurationTab from "../components/GeneralConfigurationTab";
import StatusMasterTab from "../components/StatusMasterTab";
import TaxTypesTab from "../components/TaxTypesTab";
import PaymentTermsTab from "../components/PaymentTermsTab";

const TABS = [
  { id: "general", label: "General Configuration" },
  { id: "status", label: "Status Master" },
  { id: "tax", label: "Tax Types" },
  { id: "paymentTerms", label: "Payment Terms" },
];

export default function SystemConfigurationPage() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);

  return (
    <div className="p-6">
      <PageHeader
        title="System Configuration"
        subtitle="Manage AP master data — general settings, statuses, tax types, and payment terms."
      />

      <div className="flex gap-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm transition ${
              activeTab === tab.id
                ? "border-b-2 border-[#0A0082] font-semibold text-[#0A0082]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {activeTab === "general" && <GeneralConfigurationTab />}
        {activeTab === "status" && <StatusMasterTab />}
        {activeTab === "tax" && <TaxTypesTab />}
        {activeTab === "paymentTerms" && <PaymentTermsTab />}
      </div>
    </div>
  );
}
