import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, Eye, Power } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import SearchInput from "../../../../components/filter/Searchbar";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ApproverLabel from "./ApproverLabel";
import useDepartments from "../hooks/useDepartments";
import usePurchaseCategories from "../hooks/usePurchaseCategories";
import { useApprovalPolicies, useSetApprovalPolicyStatus, useDeleteApprovalPolicy } from "../hooks/useApprovalPolicies";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";

const APPROVER_TYPE_LABEL = {
  DEPARTMENT_APPROVER: "Department Approver",
  ROLE: "Role",
  USER: "User",
};
const APPROVAL_RULE_LABEL = { ANY_ONE: "Any One", ALL: "All" };

const formatAmount = (value) =>
  value == null ? null : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);

const formatRange = (policy) => {
  const min = formatAmount(policy.min_amount);
  const max = formatAmount(policy.max_amount);
  if (min == null && max == null) return "Any amount";
  if (min != null && max == null) return `₹${min} and above`;
  if (min == null && max != null) return `Up to ₹${max}`;
  return `₹${min} – ₹${max}`;
};

/** Marks the one policy (at most, backend-enforced) used as the catch-all fallback when no
 * department/category/amount-scoped policy matches an invoice. */
const DefaultPolicyBadge = () => (
  <span className="inline-block rounded-full border border-indigo-300 bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
    Default
  </span>
);

/**
 * Configuration for the invoice approval workflow — real backend-driven policies, not the old
 * mock ApprovalRulesTab. Gated by APPROVAL_POLICY_MANAGE at the call site (SystemConfigurationPage).
 * ApprovalPolicyDTO carries only department_id/purchase_category_id (Backend/API_Layer/interface/
 * approval_policy_interface.py) — names are resolved client-side against the existing
 * departments/purchase-categories lookups, the same way DepartmentsAndCategoriesTab resolves
 * category->department.
 */
export default function ApprovalPoliciesTab() {
  const navigate = useNavigate();
  const { data: policyData, isLoading, isError, error } = useApprovalPolicies();
  const { data: departmentData } = useDepartments();
  const { data: categoryData } = usePurchaseCategories();

  const policies = policyData || [];
  const departmentsById = useMemo(() => new Map((departmentData || []).map((d) => [d.id, d])), [departmentData]);
  const categoriesById = useMemo(() => new Map((categoryData || []).map((c) => [c.id, c])), [categoryData]);

  const [search, setSearch] = useState("");
  const [viewPolicy, setViewPolicy] = useState(null);

  const setStatus = useSetApprovalPolicyStatus();
  const deletePolicy = useDeleteApprovalPolicy();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const filteredPolicies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return policies;
    return policies.filter((p) => p.name.toLowerCase().includes(q));
  }, [policies, search]);

  // Create/edit are their own full page now (the level builder gets tall) — see
  // ApprovalPolicyFormPage.jsx — rather than a modal.
  const openAdd = () => navigate(AP_ROUTES.SYSTEM_CONFIG_APPROVAL_POLICY_NEW);
  const openEdit = (policy) => navigate(AP_ROUTES.SYSTEM_CONFIG_APPROVAL_POLICY_EDIT(policy.id));

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    try {
      await setStatus.mutateAsync({ policyId: statusTarget.id, isActive: !statusTarget.is_active });
      toast.success(`Policy ${statusTarget.is_active ? "deactivated" : "activated"}.`);
      setStatusTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update policy status."));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deletePolicy.mutateAsync(deleteTarget.id);
      toast.success("Approval policy deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete approval policy."));
    }
  };

  const headers = ["Policy Name", "Department", "Purchase Category", "Amount Range", "Levels", "Status", "Actions"];
  const columns = ["name", "department", "category", "range", "levels", "status", "actions"];

  const rows = filteredPolicies.map((policy) => ({
    name: (
      <span className="flex items-center gap-2">
        <span className="font-medium text-gray-900">{policy.name}</span>
        {policy.is_default && <DefaultPolicyBadge />}
      </span>
    ),
    // A default policy has no department/category (backend enforces this) — nothing to resolve.
    department: policy.is_default ? "—" : departmentsById.get(policy.department_id)?.name || `#${policy.department_id}`,
    category: policy.is_default ? "—" : categoriesById.get(policy.purchase_category_id)?.name || `#${policy.purchase_category_id}`,
    range: formatRange(policy),
    levels: policy.levels?.length ?? 0,
    status: <StatusBadge label={policy.is_active ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="View Policy"
          className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 transition rounded-md"
          onClick={() => setViewPolicy(policy)}
        >
          <Eye size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Policy"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => openEdit(policy)}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title={policy.is_active ? "Deactivate Policy" : "Activate Policy"}
          className={`h-8 w-8 p-0 transition rounded-md ${
            policy.is_active ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
          }`}
          onClick={() => setStatusTarget(policy)}
        >
          <Power size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Policy"
          className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
          onClick={() => setDeleteTarget(policy)}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <SearchInput onSearch={setSearch} placeholder="Search by policy name..." />
        </div>
        <Button variant="primary" onClick={openAdd} className="whitespace-nowrap">
          <Plus size={16} />
          Add Approval Policy
        </Button>
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load approval policies.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading approval policies..." />
      ) : filteredPolicies.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          {search ? "No policies match your search." : "No approval policies configured yet."}
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      <Modal
        isOpen={!!viewPolicy}
        onClose={() => setViewPolicy(null)}
        title={
          viewPolicy?.is_default ? (
            <span className="flex items-center gap-2">
              {viewPolicy.name}
              <DefaultPolicyBadge />
            </span>
          ) : (
            viewPolicy?.name
          )
        }
        subtitle="Approval policy details"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewPolicy(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewPolicy && (
          <div className="space-y-4 py-2">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Department</dt>
                <dd className="mt-1 text-gray-900">
                  {viewPolicy.is_default ? "— (default policy)" : departmentsById.get(viewPolicy.department_id)?.name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Purchase Category</dt>
                <dd className="mt-1 text-gray-900">
                  {viewPolicy.is_default ? "— (default policy)" : categoriesById.get(viewPolicy.purchase_category_id)?.name || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount Range</dt>
                <dd className="mt-1 text-gray-900">{formatRange(viewPolicy)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</dt>
                <dd className="mt-1"><StatusBadge label={viewPolicy.is_active ? "Active" : "Inactive"} size="sm" /></dd>
              </div>
            </dl>
            {viewPolicy.description && <p className="text-sm text-gray-600">{viewPolicy.description}</p>}
            <div>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Approval Levels</h4>
              <ol className="space-y-2">
                {(viewPolicy.levels || [])
                  .slice()
                  .sort((a, b) => a.level_number - b.level_number)
                  .map((lvl) => (
                    <li key={lvl.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">Level {lvl.level_number}</span>
                        <span className="text-gray-600">{APPROVER_TYPE_LABEL[lvl.approver_type] || lvl.approver_type}</span>
                        <span className="text-xs text-gray-400">· {APPROVAL_RULE_LABEL[lvl.approval_rule] || lvl.approval_rule}</span>
                      </div>
                      {lvl.approver_type === "ROLE" && lvl.role_code && (
                        <p className="mt-1 text-xs text-gray-600">Role: {lvl.role_code}</p>
                      )}
                      {lvl.approver_type === "USER" && lvl.user_uuid && (
                        <p className="mt-1 text-xs text-gray-600">
                          User: <ApproverLabel userUuid={lvl.user_uuid} />
                        </p>
                      )}
                    </li>
                  ))}
              </ol>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Approval Policy"
        message={`Are you sure you want to delete the policy "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deletePolicy.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!statusTarget}
        title={statusTarget?.is_active ? "Deactivate Policy" : "Activate Policy"}
        message={`Are you sure you want to ${statusTarget?.is_active ? "deactivate" : "activate"} the policy "${statusTarget?.name}"?`}
        confirmText={statusTarget?.is_active ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        isLoading={setStatus.isPending}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
        variant={statusTarget?.is_active ? "danger" : "primary"}
      />
    </div>
  );
}
