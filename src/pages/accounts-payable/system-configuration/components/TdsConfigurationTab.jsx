import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import Button from "../../../../components/Button/Button";
import TdsRulesSection from "./tds/TdsRulesSection";
import TdsPaymentNatureSection from "./tds/TdsPaymentNatureSection";
import TdsDeductorSection from "./tds/TdsDeductorSection";
import TdsExcelImportModal from "./tds/TdsExcelImportModal";
import { useTdsConfigMetadata } from "../hooks/useTdsConfig";
import { useApPermissions } from "../../hooks/useApPermissions";

const INNER_TABS = [
  { id: "rules", label: "TDS Rules" },
  { id: "natureOfPayment", label: "Nature of Payment" },
  { id: "deductor", label: "Deductor" },
];

/**
 * TDS Configuration — Finance_Executive-only, additionally gated on the real TDS_CONFIG_VIEW
 * permission (see SystemConfigurationPage.jsx's canOpenTdsConfig). Backed by the real
 * /apm/tds/config/* API (tdsConfigService.js/useTdsConfig.js) — no local mock state anymore;
 * each inner section fetches and mutates its own data via TanStack Query, same as
 * ApprovalPoliciesTab/DepartmentsAndCategoriesTab. Metadata (rate-condition fields/operators,
 * threshold types) is fetched once here and passed down to whichever sections need it.
 */
export default function TdsConfigurationTab() {
  const [innerTab, setInnerTab] = useState(INNER_TABS[0].id);
  const [importOpen, setImportOpen] = useState(false);
  const { canImportTdsConfig } = useApPermissions();
  const { data: metadata } = useTdsConfigMetadata();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-2">
        <div className="flex gap-6">
          {INNER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setInnerTab(tab.id)}
              className={`pb-2 text-sm transition ${
                innerTab === tab.id
                  ? "border-b-2 border-[#0A0082] font-semibold text-[#0A0082]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {canImportTdsConfig && (
          <Button variant="outline" size="small" onClick={() => setImportOpen(true)} className="whitespace-nowrap">
            <FileSpreadsheet size={16} />
            Upload TDS Excel
          </Button>
        )}
      </div>

      {innerTab === "rules" && <TdsRulesSection metadata={metadata} />}
      {innerTab === "natureOfPayment" && <TdsPaymentNatureSection />}
      {innerTab === "deductor" && <TdsDeductorSection />}

      {canImportTdsConfig && <TdsExcelImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} />}
    </div>
  );
}
