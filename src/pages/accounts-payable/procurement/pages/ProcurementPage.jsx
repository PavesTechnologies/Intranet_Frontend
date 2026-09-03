import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import { useApPermissions } from "../../hooks/useApPermissions";
import PrRequestTab from "../components/PrRequestTab";
import PrApprovalsTab from "../components/PrApprovalsTab";
import QuotationTab from "../components/QuotationTab";
import VendorSelectionTab from "../components/VendorSelectionTab";
import PurchaseOrdersTab from "../components/PurchaseOrdersTab";

const TAB_IDS = ["prRequest", "prApprovals", "quotation", "vendorSelection", "purchaseOrders"];

export default function ProcurementPage() {
  const { canApprovePR } = useApPermissions();
  const [searchParams] = useSearchParams();

  const TABS = [
    { id: "prRequest", label: "PR Request" },
    ...(canApprovePR ? [{ id: "prApprovals", label: "PR Approvals" }] : []),
    { id: "quotation", label: "Quotation" },
    { id: "vendorSelection", label: "Vendor Selection" },
    { id: "purchaseOrders", label: "Purchase Orders" },
  ];

  // Supports deep links from PR Detail (e.g. "?tab=quotation&prId=123") — the target tab
  // itself reads prId back out of the query string to pre-select that requisition.
  const requestedTab = searchParams.get("tab");
  const initialTab = TAB_IDS.includes(requestedTab) ? requestedTab : TABS[0].id;
  const [activeTab, setActiveTab] = useState(initialTab);

  return (
    <div className="p-6">
      <PageHeader
        title="Procurement"
        subtitle="Raise purchase requisitions, route them for approval, collect quotations, select a vendor, and generate purchase orders."
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
        {activeTab === "prRequest" && <PrRequestTab />}
        {activeTab === "prApprovals" && canApprovePR && <PrApprovalsTab />}
        {activeTab === "quotation" && <QuotationTab />}
        {activeTab === "vendorSelection" && <VendorSelectionTab />}
        {activeTab === "purchaseOrders" && <PurchaseOrdersTab />}
      </div>
    </div>
  );
}
