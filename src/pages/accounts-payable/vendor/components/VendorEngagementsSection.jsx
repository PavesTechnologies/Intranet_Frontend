import { useState } from "react";
import { Pencil } from "lucide-react";

import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { getApiErrorMessage } from "../../utils/apiError";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import usePurchaseCategories from "../../system-configuration/hooks/usePurchaseCategories";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useVendorEngagementsByVendor } from "../../vendor-intake/hooks/useVendorIntake";
import {
  effectiveNdaRequired,
  PRE_SCREEN_RESULT_LABEL,
  PRE_SCREEN_RESULT_TONE,
} from "../../vendor-intake/constants/vendorIntake";
import EditEngagementModal from "./EditEngagementModal";

const HEADERS = [
  "Department",
  "Purchase Category",
  "Purpose",
  "Pre-Screen",
  "NDA Required",
  "Action",
];
const COLUMNS = ["department", "category", "purpose", "preScreen", "nda", "action"];

/**
 * Vendor Engagements for one vendor.
 *
 * Department and Purchase Category are NOT Vendor Master columns — they belong to the
 * vendor_category_mapping (engagement) rows, read here from
 * GET /apm/vendor-intake/vendor/{vendor_id}. The ids are resolved to names through the
 * existing department/purchase-category masters; nothing is copied onto the vendor entity and
 * no values are hardcoded. A vendor can hold several engagements, so every row is listed.
 *
 * @param {{ vendorId: string|number }} props
 */
export default function VendorEngagementsSection({ vendorId }) {
  // The engagement row being edited, or null. Held here (not inside the modal) so the modal
  // always opens seeded from the row's current server values.
  const [editingEngagement, setEditingEngagement] = useState(null);

  const { canEditVendor } = useApPermissions();

  const {
    data: engagements = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useVendorEngagementsByVendor(vendorId);

  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = usePurchaseCategories();

  const departmentName = (id) =>
    departments.find((d) => d.id === id)?.name || (id ? `Department #${id}` : "—");
  const categoryName = (id) =>
    categories.find((c) => c.id === id)?.name || (id ? `Category #${id}` : "—");

  const rows = engagements.map((engagement) => ({
    department: departmentName(engagement.department_id),
    category: categoryName(engagement.category_id),
    purpose: engagement.purpose_of_onboarding || engagement.business_requirement || "—",
    preScreen: engagement.pre_screen_status ? (
      <StatusPill
        label={
          PRE_SCREEN_RESULT_LABEL[engagement.pre_screen_status] || engagement.pre_screen_status
        }
        tone={PRE_SCREEN_RESULT_TONE[engagement.pre_screen_status] || "neutral"}
      />
    ) : (
      "—"
    ),
    nda: (() => {
      const required = effectiveNdaRequired(engagement);
      if (required === null) return "—";
      return (
        <StatusPill
          label={required ? "YES" : "NO"}
          tone={required ? "warning" : "success"}
        />
      );
    })(),
    action: canEditVendor ? (
      <Button
        size="small"
        variant="outline"
        onClick={() => setEditingEngagement(engagement)}
        aria-label={`Edit engagement ${engagement.engagement_id}`}
      >
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
    ) : (
      "-"
    ),
  }));

  return (
    <div className="space-y-3">
      <div>
        <h2 className={Fonts.subheading}>Vendor Engagements</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          The departments and purchase categories this vendor has been onboarded for. A vendor
          can hold more than one engagement.
        </p>
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load vendor engagements.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading vendor engagements..." />
      ) : engagements.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-500">
          This vendor has no engagements yet. One is created when the vendor is onboarded for a
          department and purchase category.
        </div>
      ) : (
        <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} />
      )}

      <EditEngagementModal
        isOpen={!!editingEngagement}
        engagement={editingEngagement}
        vendorId={vendorId}
        onClose={() => setEditingEngagement(null)}
        // The mutation already invalidates this query; the explicit refetch makes the refresh
        // immediate even where the list is being rendered from a still-fresh cache.
        onSaved={refetch}
      />
    </div>
  );
}
