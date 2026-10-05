import { useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { formatDate } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";
import { useApPermissions } from "../../hooks/useApPermissions";
import { useVendorNda } from "../../procurement/hooks/useNda";
import {
  NDA_STATUS_LABEL,
  NDA_STATUS_TONE,
  ONBOARDING_STATUS,
  ONBOARDING_STATUS_LABEL,
  ONBOARDING_STATUS_TONE,
  isOnboardingOpen,
} from "../../procurement/constants/vendorOnboarding";

const HEADERS = [
  "Request ID",
  "Vendor Name",
  "PR Number",
  "Department",
  "Purchase Category",
  "Requested By",
  "Created",
  "Status",
  "NDA Status",
  "Action",
];

const COLUMNS = [
  "requestId",
  "vendorName",
  "prNumber",
  "department",
  "category",
  "requestedBy",
  "created",
  "status",
  "ndaStatus",
  "action",
];

/**
 * NDA status for one request's vendor, read from GET /apm/nda/vendor/{vendor_id} scoped to the
 * request's department/category. One query per row: a request only has a vendor once intake
 * has run, so most rows make no call at all, and the intaker's queue is short. If these lists
 * ever grow, a batch NDA-status endpoint would be the fix — the frontend must not infer it.
 */
function NdaStatusCell({ request }) {
  const { canViewNda } = useApPermissions();

  const { data, isLoading } = useVendorNda(request.vendor_id, {
    departmentId: request.department_id,
    purchaseCategoryId: request.purchase_category_id,
    enabled: canViewNda && Boolean(request.vendor_id),
  });

  if (!request.vendor_id) return <span className="text-xs text-gray-400">—</span>;
  if (!canViewNda) return <span className="text-xs text-gray-400">—</span>;
  if (isLoading) return <span className="text-xs text-gray-400">Checking...</span>;

  const statusCode = data?.nda?.status_code;
  if (!statusCode) return <span className="text-xs text-gray-400">—</span>;

  return (
    <StatusPill
      label={NDA_STATUS_LABEL[statusCode] || statusCode}
      tone={NDA_STATUS_TONE[statusCode] || "neutral"}
    />
  );
}

/**
 * Internal Vendor Onboarding Requests, rendered with the same GenericTable the Vendors list
 * uses. Every value comes from the API; ids are resolved to names through the existing
 * department/category/PR/vendor lookups rather than displayed raw.
 *
 * @param {{ requests: object[], loading?: boolean, departmentName: (id:number)=>string,
 *   categoryName: (id:number)=>string, prNumberById: Map, vendorNameById: Map,
 *   requesterLabel: (createdBy:string)=>React.ReactNode }} props
 */
export default function InternalRequestsTable({
  requests = [],
  loading = false,
  departmentName,
  categoryName,
  prNumberById,
  vendorNameById,
  requesterLabel,
}) {
  const navigate = useNavigate();
  const { canProcessOnboarding } = useApPermissions();

  const actionLabel = (statusCode) => {
    if (!isOnboardingOpen(statusCode)) return "View";
    if (statusCode === ONBOARDING_STATUS.CREATED || statusCode === ONBOARDING_STATUS.ASSIGNED) {
      return "Review";
    }
    return "Continue";
  };

  const rows = requests.map((request) => ({
    requestId: (
      <button
        type="button"
        onClick={() => navigate(AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL(request.id))}
        className="font-semibold text-[#0A0082] hover:underline"
      >
        #{request.id}
      </button>
    ),
    vendorName:
      request.requested_vendor_name ||
      vendorNameById?.get(Number(request.vendor_id)) ||
      "—",
    prNumber: prNumberById?.get(Number(request.pr_id)) || `PR #${request.pr_id}`,
    department: departmentName(request.department_id),
    category: categoryName(request.purchase_category_id),
    requestedBy: requesterLabel(request.created_by),
    created: request.created_at ? formatDate(request.created_at) : "—",
    status: (
      <StatusPill
        label={ONBOARDING_STATUS_LABEL[request.status_code] || request.status_code || "—"}
        tone={ONBOARDING_STATUS_TONE[request.status_code] || "neutral"}
      />
    ),
    ndaStatus: <NdaStatusCell request={request} />,
    action: (
      <Button
        size="small"
        variant={
          canProcessOnboarding && isOnboardingOpen(request.status_code) ? "primary" : "outline"
        }
        onClick={() => navigate(AP_ROUTES.VENDOR_INTERNAL_REQUEST_DETAIL(request.id))}
      >
        <Eye className="h-3.5 w-3.5" />{" "}
        {canProcessOnboarding ? actionLabel(request.status_code) : "View"}
      </Button>
    ),
  }));

  return <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} loading={loading} />;
}
