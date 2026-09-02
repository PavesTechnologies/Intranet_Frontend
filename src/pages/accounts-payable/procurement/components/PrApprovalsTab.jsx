import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AlertTriangle } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import FormSelect from "../../../../components/forms/FormSelect";
import Modal from "../../../../components/Modal/modal";
import FormTextArea from "../../../../components/forms/FormTextArea";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { AP_ROUTES } from "../../constants/routes";
import usePendingApprovals from "../hooks/usePendingApprovals";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import usePurchaseCategories from "../../system-configuration/hooks/usePurchaseCategories";
import { useApprovePurchaseRequisition, useRejectPurchaseRequisition } from "../hooks/usePurchaseRequisitionMutations";

const ALL = "";

/**
 * Approve/reject queue — GET /purchase-requisitions/pending-approval is already
 * filtered server-side to PENDING_APPROVAL, so no client-side status filter is needed.
 */
export default function PrApprovalsTab() {
  const navigate = useNavigate();
  const [departmentId, setDepartmentId] = useState(ALL);
  const [decisionTarget, setDecisionTarget] = useState(null); // { pr, action: "approve" | "reject" }
  const [comment, setComment] = useState("");

  const { data: pendingPrs = [], isLoading, isError, error } = usePendingApprovals(
    departmentId || undefined,
  );
  const { data: departments = [] } = useDepartments();
  const { data: categories = [] } = usePurchaseCategories();

  const approveMutation = useApprovePurchaseRequisition(decisionTarget?.pr?.id);
  const rejectMutation = useRejectPurchaseRequisition(decisionTarget?.pr?.id);

  const departmentNameById = new Map(departments.map((d) => [d.id, d.name]));
  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const departmentOptions = [
    { value: ALL, label: "All Departments" },
    ...departments.map((d) => ({ value: d.id, label: d.name })),
  ];

  const closeModal = () => {
    setDecisionTarget(null);
    setComment("");
  };

  const handleConfirm = async () => {
    if (!decisionTarget) return;
    if (decisionTarget.action === "reject" && !comment.trim()) return;

    try {
      if (decisionTarget.action === "approve") {
        await approveMutation.mutateAsync(comment.trim() || undefined);
        toast.success(`${decisionTarget.pr.pr_number} approved.`);
      } else {
        await rejectMutation.mutateAsync(comment.trim());
        toast.success(`${decisionTarget.pr.pr_number} rejected.`);
      }
      closeModal();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not record this decision."));
    }
  };

  const headers = ["PR Number", "Requester", "Department", "Category", "Required By", "Estimated Total", "Actions"];
  const columns = ["prNumber", "requester", "department", "category", "requiredBy", "estimatedTotal", "actions"];

  const rows = pendingPrs.map((pr) => ({
    prNumber: (
      <button
        type="button"
        className="font-mono text-xs font-semibold text-[#0A0082] hover:underline"
        onClick={() => navigate(AP_ROUTES.PROCUREMENT_PR_DETAIL(pr.id))}
      >
        {pr.pr_number}
      </button>
    ),
    requester: (
      <span className="font-mono text-xs text-gray-500" title={pr.created_by}>
        {String(pr.created_by || "—").slice(0, 8)}
      </span>
    ),
    department: departmentNameById.get(pr.department_id) || "—",
    category: categoryNameById.get(pr.purchase_category_id) || "—",
    requiredBy: formatDate(pr.required_by),
    estimatedTotal: formatCurrency(Number(pr.estimated_total) || 0),
    actions: (
      <div className="flex items-center gap-2 justify-center">
        <Button variant="outline" size="small" onClick={() => setDecisionTarget({ pr, action: "reject" })}>
          Reject
        </Button>
        <Button variant="primary" size="small" onClick={() => setDecisionTarget({ pr, action: "approve" })}>
          Approve
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="w-full sm:w-56">
        <FormSelect
          label="Department"
          name="departmentId"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          options={departmentOptions}
        />
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load pending approvals.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading pending approvals..." />
      ) : pendingPrs.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          No purchase requisitions pending approval.
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      <Modal
        isOpen={!!decisionTarget}
        onClose={closeModal}
        title={decisionTarget?.action === "approve" ? "Approve requisition" : "Reject requisition"}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant={decisionTarget?.action === "approve" ? "primary" : "danger"}
              onClick={handleConfirm}
              disabled={decisionTarget?.action === "reject" && !comment.trim()}
              loading={approveMutation.isPending || rejectMutation.isPending}
            >
              {decisionTarget?.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </div>
        }
      >
        {decisionTarget?.action === "reject" && (
          <p className="mb-3 flex items-start gap-2 text-sm text-gray-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />A reason is required.
          </p>
        )}
        <FormTextArea
          label={decisionTarget?.action === "approve" ? "Comments (optional)" : "Rejection reason"}
          name="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          required={decisionTarget?.action === "reject"}
        />
      </Modal>
    </div>
  );
}
