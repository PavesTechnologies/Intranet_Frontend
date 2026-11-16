import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Info, Plus } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormTextArea from "../../../../components/forms/FormTextArea";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ToggleSwitch from "../components/ToggleSwitch";
import ApprovalPolicyLevelEditor from "../components/ApprovalPolicyLevelEditor";
import useDepartments from "../hooks/useDepartments";
import { usePurchaseCategoriesByDepartment } from "../hooks/usePurchaseCategories";
import { useApprovalRoles, useApprovers } from "../hooks/useApprovalMetadata";
import {
  useApprovalPolicyDetail,
  useCreateApprovalPolicy,
  useUpdateApprovalPolicy,
} from "../hooks/useApprovalPolicies";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";

const emptyLevel = () => ({
  approver_type: "DEPARTMENT_APPROVER",
  approval_rule: "ANY_ONE",
  role_code: "",
  user_uuid: "",
});

const emptyForm = () => ({
  name: "",
  isDefault: false,
  departmentId: "",
  purchaseCategoryId: "",
  minAmount: "",
  maxAmount: "",
  description: "",
  isActive: true,
  levels: [emptyLevel()],
});

// Returning to System Configuration after save/cancel should land back on the Approval
// Policies tab, not the default General Configuration one — the tab is local page state,
// not part of the URL, so it's threaded through router state instead.
const RETURN_TO_APPROVAL_POLICIES = { state: { activeTab: "approvalPolicies" } };

/**
 * Full-page create/edit for one ApprovalPolicy — same fields as the policy builder used to be
 * a modal for, just given a whole page since the level editor grows tall enough to want real
 * scroll room. The backend's ApprovalPolicyUpdateRequest has no is_active field — status is
 * only ever changed via PATCH .../status (ApprovalPoliciesTab's Activate/Deactivate action) —
 * so the Active toggle here only appears on create.
 * Routes: /accounts-payable/system-configuration/approval-policies/new
 *         /accounts-payable/system-configuration/approval-policies/:policyId/edit
 */
export default function ApprovalPolicyFormPage() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(policyId);

  const { data: policy, isLoading: isPolicyLoading, isError: isPolicyError, error: policyError } =
    useApprovalPolicyDetail(policyId);

  const { data: departmentData } = useDepartments();
  const departments = departmentData || [];

  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [hasHydrated, setHasHydrated] = useState(!isEditing);

  const { data: categoryData } = usePurchaseCategoriesByDepartment(
    // FormSelect preserves value's real type — departmentId is stored as a number once chosen.
    Number.isFinite(Number(form.departmentId)) ? Number(form.departmentId) : null,
  );

  useEffect(() => {
    if (isEditing && policy && !hasHydrated) {
      setForm({
        name: policy.name,
        // is_default is immutable after creation (backend's ApprovalPolicyUpdateRequest doesn't
        // even accept it) — hydrated here only so the rest of the form knows to keep hiding the
        // scoping fields, never rendered as an editable toggle once a policy exists.
        isDefault: Boolean(policy.is_default),
        departmentId: policy.department_id,
        purchaseCategoryId: policy.purchase_category_id,
        minAmount: policy.min_amount != null ? String(policy.min_amount) : "",
        maxAmount: policy.max_amount != null ? String(policy.max_amount) : "",
        description: policy.description || "",
        isActive: policy.is_active,
        levels: (policy.levels || [])
          .slice()
          .sort((a, b) => a.level_number - b.level_number)
          .map((lvl) => ({
            approver_type: lvl.approver_type,
            approval_rule: lvl.approval_rule,
            role_code: lvl.role_code || "",
            user_uuid: lvl.user_uuid || "",
          })),
      });
      setHasHydrated(true);
    }
  }, [isEditing, policy, hasHydrated]);

  const departmentOptions = departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }));
  const categoryOptions = (categoryData || []).map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }));

  const { data: roleCodes } = useApprovalRoles();
  const roleOptions = (roleCodes || []).map((r) => ({ value: r, label: r }));
  const { data: approvers } = useApprovers();

  const selectedDepartmentName = useMemo(() => {
    const dept = departments.find((d) => d.id === Number(form.departmentId));
    return dept ? `${dept.code} — ${dept.name}` : null;
  }, [departments, form.departmentId]);

  const createPolicy = useCreateApprovalPolicy();
  const updatePolicy = useUpdateApprovalPolicy(policyId);
  const isSaving = createPolicy.isPending || updatePolicy.isPending;

  const handleField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleDepartmentChange = (value) => {
    setForm((prev) => ({ ...prev, departmentId: value, purchaseCategoryId: "" }));
  };

  const updateLevel = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      levels: prev.levels.map((lvl, i) => (i === index ? { ...lvl, [field]: value } : lvl)),
    }));
  };

  const addLevel = () => setForm((prev) => ({ ...prev, levels: [...prev.levels, emptyLevel()] }));

  const removeLevel = (index) =>
    setForm((prev) => ({ ...prev, levels: prev.levels.filter((_, i) => i !== index) }));

  const moveLevel = (index, direction) => {
    setForm((prev) => {
      const next = prev.levels.slice();
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, levels: next };
    });
  };

  const handleBack = () => navigate(AP_ROUTES.SYSTEM_CONFIG, RETURN_TO_APPROVAL_POLICIES);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Policy name is required.";
    // A default (catch-all) policy has no scoping at all — the backend rejects a department/
    // category/amount range on one, so these are only required for a normal scoped policy.
    if (!form.isDefault) {
      if (!form.departmentId) next.department = "Department is required.";
      if (!form.purchaseCategoryId) next.category = "Purchase category is required.";
      if (form.minAmount !== "" && form.maxAmount !== "" && Number(form.maxAmount) < Number(form.minAmount)) {
        next.maxAmount = "Maximum amount must be greater than or equal to the minimum amount.";
      }
    }
    if (form.levels.length === 0) next.levels = "At least one approval level is required.";
    form.levels.forEach((lvl, i) => {
      if (lvl.approver_type === "ROLE" && !lvl.role_code) next[`level-${i}`] = "Select a role for this level.";
      if (lvl.approver_type === "USER" && !lvl.user_uuid) next[`level-${i}`] = "Select a user for this level.";
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      // A default policy can't have a department/category/amount range at all — the backend
      // 422s with "A default policy cannot have a department, purchase category, or amount
      // range" if any of these are sent non-null alongside is_default: true.
      department_id: form.isDefault ? null : Number(form.departmentId),
      purchase_category_id: form.isDefault ? null : Number(form.purchaseCategoryId),
      min_amount: form.isDefault ? null : form.minAmount !== "" ? Number(form.minAmount) : null,
      max_amount: form.isDefault ? null : form.maxAmount !== "" ? Number(form.maxAmount) : null,
      levels: form.levels.map((lvl, i) => ({
        level_number: i + 1,
        approver_type: lvl.approver_type,
        approval_rule: lvl.approval_rule,
        role_code: lvl.approver_type === "ROLE" ? lvl.role_code : null,
        user_uuid: lvl.approver_type === "USER" ? lvl.user_uuid : null,
      })),
    };
    if (!isEditing) {
      payload.is_active = form.isActive;
      // is_default is immutable after creation — the update endpoint doesn't accept it at all,
      // only set it on the initial create.
      payload.is_default = form.isDefault;
    }

    try {
      if (isEditing) {
        await updatePolicy.mutateAsync(payload);
        toast.success("Approval policy updated.");
      } else {
        await createPolicy.mutateAsync(payload);
        toast.success("Approval policy created.");
      }
      navigate(AP_ROUTES.SYSTEM_CONFIG, RETURN_TO_APPROVAL_POLICIES);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save approval policy."));
    }
  };

  if (isEditing && isPolicyLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading approval policy..." />
      </div>
    );
  }

  if (isEditing && isPolicyError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(policyError, "Could not load this approval policy.")}
        </div>
        <Button variant="outline" className="mt-4" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" /> Back to Approval Policies
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 pb-24">
      <Breadcrumb
        items={[
          { label: "System Configuration", to: AP_ROUTES.SYSTEM_CONFIG },
          { label: isEditing ? "Edit Approval Policy" : "Add Approval Policy" },
        ]}
      />

      <PageHeader
        title={isEditing ? "Edit Approval Policy" : "Add Approval Policy"}
        subtitle="Define the department/category/amount scope this policy applies to, and its approval levels."
        actions={
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" /> Back to Approval Policies
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PageCard>
          <PageCardContent className="space-y-4">
            <h2 className={Fonts.subheading}>Policy Details</h2>

            <FormInput
              label="Policy Name"
              name="name"
              placeholder="e.g. IT Hardware — High Value"
              value={form.name}
              onChange={(e) => handleField("name", e.target.value)}
              requiredMark
              error={errors.name}
              className="max-w-xl"
            />

            {isEditing ? (
              form.isDefault && (
                <div className="max-w-xl flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  <span>
                    This is the <strong>Default Policy</strong> — a catch-all fallback used only when no
                    department/category/amount-scoped policy matches an invoice. Whether a policy is the
                    default can't be changed after it's created, so it has no department, purchase
                    category, or amount range.
                  </span>
                </div>
              )
            ) : (
              <div className="max-w-xl rounded-lg border border-gray-200 p-4">
                <ToggleSwitch
                  label="Default Policy"
                  checked={form.isDefault}
                  onChange={(val) => handleField("isDefault", val)}
                />
                <p className="mt-2 text-xs text-gray-500">
                  A fallback used only when no department/category/amount-scoped policy matches an
                  invoice. A default policy can't have a department, purchase category, or amount range —
                  those fields disappear below when this is on. Only one default policy can be active at a
                  time.
                </p>
              </div>
            )}

            {!form.isDefault && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-xl">
                  <div>
                    <FormSelect
                      label="Department"
                      name="departmentId"
                      value={form.departmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value)}
                      options={[{ value: "", label: "Select department" }, ...departmentOptions]}
                      placeholder="Select department"
                    />
                    {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
                  </div>
                  <div>
                    <FormSelect
                      label="Purchase Category"
                      name="purchaseCategoryId"
                      value={form.purchaseCategoryId}
                      onChange={(e) => handleField("purchaseCategoryId", e.target.value)}
                      options={[
                        { value: "", label: form.departmentId ? "Select category" : "Select a department first" },
                        ...categoryOptions,
                      ]}
                      placeholder="Select category"
                    />
                    {errors.category && <p className="mt-1 text-xs text-red-500">{errors.category}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-xl">
                  <FormInput
                    label="Minimum Amount"
                    name="minAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="No minimum"
                    value={form.minAmount}
                    onChange={(e) => handleField("minAmount", e.target.value)}
                  />
                  <FormInput
                    label="Maximum Amount"
                    name="maxAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="No maximum"
                    value={form.maxAmount}
                    onChange={(e) => handleField("maxAmount", e.target.value)}
                    error={errors.maxAmount}
                  />
                </div>
              </>
            )}

            <FormTextArea
              label="Description"
              name="description"
              placeholder="Optional notes about when this policy applies..."
              value={form.description}
              onChange={(e) => handleField("description", e.target.value)}
              rows={2}
              className="max-w-xl"
            />

            {!isEditing && (
              <div className="max-w-xl rounded-lg border border-gray-200 p-4">
                <ToggleSwitch label="Active" checked={form.isActive} onChange={(val) => handleField("isActive", val)} />
              </div>
            )}
          </PageCardContent>
        </PageCard>

        <PageCard>
          <PageCardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className={Fonts.subheading}>Approval Levels</h2>
              <Button type="button" variant="outline" size="small" onClick={addLevel}>
                <Plus size={14} /> Add Level
              </Button>
            </div>
            {errors.levels && <p className="text-xs text-red-500">{errors.levels}</p>}
            <div className="space-y-3">
              {form.levels.map((lvl, index) => (
                <div key={index}>
                  <ApprovalPolicyLevelEditor
                    level={{ ...lvl, level_number: index + 1 }}
                    index={index}
                    total={form.levels.length}
                    onChange={(field, value) => updateLevel(index, field, value)}
                    onRemove={() => removeLevel(index)}
                    onMoveUp={() => moveLevel(index, -1)}
                    onMoveDown={() => moveLevel(index, 1)}
                    roleOptions={roleOptions}
                    approvers={approvers}
                    disableRemove={form.levels.length === 1}
                    departmentName={selectedDepartmentName}
                  />
                  {errors[`level-${index}`] && <p className="mt-1 text-xs text-red-500">{errors[`level-${index}`]}</p>}
                </div>
              ))}
            </div>
          </PageCardContent>
        </PageCard>

        <div className="sticky bottom-0 -mx-6 flex justify-end gap-3 border-t border-gray-200 bg-white/95 px-6 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSaving} loadingText="Saving...">
            Save Policy
          </Button>
        </div>
      </form>
    </div>
  );
}
