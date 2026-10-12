import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2, Eye, Power } from "lucide-react";
import Button from "../../../../../components/Button/Button";
import GenericTable from "../../../../../components/Table/table";
import SearchInput from "../../../../../components/filter/Searchbar";
import Modal from "../../../../../components/Modal/modal";
import ConfirmationModal from "../../../../../components/confirmation_modal/ConfirmationModal";
import FormInput from "../../../../../components/forms/FormInput";
import FormSelect from "../../../../../components/forms/FormSelect";
import ToggleSwitch from "../ToggleSwitch";
import StatusBadge from "../../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
import TdsRateConditionEditor from "./TdsRateConditionEditor";
import {
  useTdsRules,
  useTdsPaymentNatures,
  useTdsDeductors,
  useCreateTdsRule,
  useUpdateTdsRule,
  useUpdateTdsRuleStatus,
  useDeleteTdsRule,
} from "../../hooks/useTdsConfig";
import { useApPermissions } from "../../../hooks/useApPermissions";
import { getApiErrorMessage } from "../../../utils/apiError";

const emptyForm = () => ({
  code: "",
  oldSection: "",
  newSection: "",
  paymentNatureCode: "",
  deductorId: "",
  rateCondition: "",
  rate: "",
  thresholdAmount: "",
  thresholdPeriod: "SINGLE_TRANSACTION",
  effectiveFrom: "",
  effectiveTo: "",
});

// Fallback only — ideally sourced from /apm/tds/config/metadata's threshold-type section once
// its exact shape is confirmed (see TdsConfigurationTab's metadata fetch).
const FALLBACK_THRESHOLD_PERIOD_OPTIONS = [
  { value: "SINGLE_TRANSACTION", label: "Single Transaction" },
  { value: "FINANCIAL_YEAR", label: "Financial Year (Aggregate)" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

/** Backend returns 409 when a rule/payment-nature/deductor is referenced elsewhere — not a
 * generic server error, per spec section 11. */
function deleteErrorMessage(err, whatLabel) {
  if (err?.status === 409) {
    return (
      getApiErrorMessage(err, null) ||
      `This ${whatLabel} is currently in use and cannot be deleted. Deactivate it instead.`
    );
  }
  return getApiErrorMessage(err, `Could not delete this ${whatLabel}.`);
}

/**
 * TDS Rules — the core rate/threshold master, backed by the real /apm/tds/config/rules API. A
 * single Income-tax section (e.g. 194C) legitimately has multiple rows here, one per Code — the
 * backend identifies a specific variant by Code, not by section (see spec section 6); this
 * component never merges variants together.
 * @param {{metadata?: object}} props - from /apm/tds/config/metadata, passed through to the Rate
 *   Condition editor.
 */
export default function TdsRulesSection({ metadata }) {
  const { canCreateTdsConfig, canEditTdsConfig, canDeleteTdsConfig } = useApPermissions();

  const [search, setSearch] = useState("");
  const [natureFilter, setNatureFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Server-side filtering — the list endpoint takes these as query params (spec section 4), not
  // a client-side .filter() over the full dataset.
  const filters = useMemo(
    () => ({ search: search || undefined, status: statusFilter || undefined, paymentNature: natureFilter || undefined }),
    [search, statusFilter, natureFilter],
  );
  const { data: rules, isLoading, isError, error } = useTdsRules(filters);
  const { data: natures = [] } = useTdsPaymentNatures();
  const { data: deductors = [] } = useTdsDeductors();

  const createRule = useCreateTdsRule();
  const updateRule = useUpdateTdsRule();
  const updateStatus = useUpdateTdsRuleStatus();
  const deleteRule = useDeleteTdsRule();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});

  const [viewItem, setViewItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);

  const natureNameByCode = useMemo(() => new Map(natures.map((n) => [n.code, n.name])), [natures]);
  const natureOptions = useMemo(
    () => natures.filter((n) => n.isActive).map((n) => ({ value: n.code, label: n.name })),
    [natures],
  );
  const deductorNameById = useMemo(() => new Map(deductors.map((d) => [d.id, d.name])), [deductors]);
  const deductorOptions = useMemo(
    () => deductors.filter((d) => d.isActive).map((d) => ({ value: d.id, label: d.name })),
    [deductors],
  );
  const thresholdPeriodOptions =
    metadata?.threshold_types ?? metadata?.thresholdTypes ?? FALLBACK_THRESHOLD_PERIOD_OPTIONS;

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.code.trim()) nextErrors.code = "Code is required.";
    if (!form.paymentNatureCode) nextErrors.paymentNatureCode = "Nature of Payment is required.";
    if (form.rate === "" || Number.isNaN(Number(form.rate))) nextErrors.rate = "Rate is required.";
    if (!form.effectiveFrom) nextErrors.effectiveFrom = "Effective From is required.";
    if (form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
      nextErrors.effectiveTo = "Effective To must be on or after Effective From.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const openAddModal = () => {
    setCurrentItem(null);
    setForm(emptyForm());
    setErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setCurrentItem(item);
    setForm({
      code: item.code,
      oldSection: item.oldSection,
      newSection: item.newSection,
      paymentNatureCode: item.paymentNatureCode,
      deductorId: item.deductorId ?? "",
      rateCondition: item.rateCondition || "",
      rate: String(item.rate),
      thresholdAmount: String(item.thresholdAmount ?? ""),
      thresholdPeriod: item.thresholdPeriod || "SINGLE_TRANSACTION",
      effectiveFrom: item.effectiveFrom,
      effectiveTo: item.effectiveTo || "",
    });
    setErrors({});
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = {
      ...form,
      code: form.code.trim(),
      oldSection: form.oldSection.trim(),
      newSection: form.newSection.trim(),
      deductorId: form.deductorId === "" ? null : Number(form.deductorId),
    };

    try {
      if (currentItem) {
        await updateRule.mutateAsync({ ruleId: currentItem.id, form: payload });
        toast.success(`TDS rule "${payload.code}" updated.`);
      } else {
        await createRule.mutateAsync(payload);
        toast.success(`TDS rule "${payload.code}" created.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save this TDS rule."));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRule.mutateAsync(deleteTarget.id);
      toast.success(`TDS rule "${deleteTarget.code}" deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(deleteErrorMessage(err, "TDS rule"));
    }
  };

  const handleToggleStatus = async () => {
    if (!statusTarget) return;
    try {
      await updateStatus.mutateAsync({ ruleId: statusTarget.id, isActive: !statusTarget.isActive });
      toast.success(`TDS rule "${statusTarget.code}" ${statusTarget.isActive ? "deactivated" : "activated"}.`);
      setStatusTarget(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update this rule's status."));
    }
  };

  const headers = ["Code", "Old Section", "New Section", "Nature of Payment", "Deductor", "Rate", "Threshold", "Status", "Actions"];
  const columns = ["code", "oldSection", "newSection", "nature", "deductor", "rate", "threshold", "status", "actions"];

  const rows = (rules || []).map((rule) => ({
    code: <span className="font-mono text-sm font-semibold text-gray-900">{rule.code}</span>,
    oldSection: rule.oldSection || "—",
    newSection: rule.newSection || "—",
    nature: (
      <div>
        <div>{rule.paymentNatureName || natureNameByCode.get(rule.paymentNatureCode) || rule.paymentNatureCode}</div>
        {rule.rateCondition && <div className="text-xs text-gray-500">{rule.rateCondition}</div>}
      </div>
    ),
    deductor: rule.deductorName || deductorNameById.get(rule.deductorId) || "—",
    rate: `${rule.rate}%`,
    threshold: rule.thresholdAmount
      ? `₹${rule.thresholdAmount.toLocaleString("en-IN")} / ${
          thresholdPeriodOptions.find((o) => o.value === rule.thresholdPeriod)?.label || rule.thresholdPeriod
        }`
      : "—",
    status: <StatusBadge label={rule.isActive ? "Active" : "Inactive"} size="sm" />,
    actions: (
      <div className="flex items-center justify-center gap-2">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="View Rule"
          className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 transition rounded-md"
          onClick={() => setViewItem(rule)}
        >
          <Eye size={16} />
        </Button>
        {canEditTdsConfig && (
          <>
            <Button
              type="button"
              variant="link"
              size="icon"
              title="Edit Rule"
              className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
              onClick={() => openEditModal(rule)}
            >
              <Pencil size={16} />
            </Button>
            <Button
              type="button"
              variant="link"
              size="icon"
              title={rule.isActive ? "Deactivate Rule" : "Activate Rule"}
              className={`h-8 w-8 p-0 transition rounded-md ${
                rule.isActive ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"
              }`}
              onClick={() => setStatusTarget(rule)}
            >
              <Power size={16} />
            </Button>
          </>
        )}
        {canDeleteTdsConfig && (
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete Rule"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => setDeleteTarget(rule)}
          >
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row">
          <div className="w-full sm:max-w-xs">
            <SearchInput onSearch={setSearch} placeholder="Search by code, section, deductor..." />
          </div>
          <div className="w-full sm:max-w-[220px]">
            <FormSelect
              options={[{ value: "", label: "All Natures" }, ...natureOptions]}
              value={natureFilter}
              onChange={(e) => setNatureFilter(e.target.value)}
            />
          </div>
          <div className="w-full sm:max-w-[180px]">
            <FormSelect options={STATUS_FILTER_OPTIONS} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
          </div>
        </div>
        {canCreateTdsConfig && (
          <Button variant="primary" onClick={openAddModal} className="whitespace-nowrap">
            <Plus size={16} />
            Add TDS Rule
          </Button>
        )}
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load TDS rules.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading TDS rules..." />
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          {search || natureFilter || statusFilter ? "No rules match your filters." : "No TDS rules configured yet."}
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentItem ? "Edit TDS Rule" : "Add TDS Rule"}
        subtitle="Define a TDS section variant — rate, threshold, and effective period."
        size="lg"
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              form="tds-rule-form"
              variant="primary"
              className="w-full sm:w-auto"
              loading={createRule.isPending || updateRule.isPending}
            >
              Save Rule
            </Button>
          </div>
        }
      >
        <form id="tds-rule-form" onSubmit={handleSave} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Code"
              name="code"
              placeholder="e.g. TDS_194C_IND"
              value={form.code}
              onChange={handleFieldChange}
              requiredMark
              error={errors.code}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Old Section" name="oldSection" placeholder="e.g. 194C" value={form.oldSection} onChange={handleFieldChange} />
              <FormInput label="New Section" name="newSection" placeholder="e.g. 194C" value={form.newSection} onChange={handleFieldChange} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Nature of Payment"
              name="paymentNatureCode"
              value={form.paymentNatureCode}
              onChange={handleFieldChange}
              options={natureOptions}
              placeholder="Select nature of payment"
            />
            <FormSelect
              label="Deductor"
              name="deductorId"
              value={form.deductorId}
              onChange={handleFieldChange}
              options={deductorOptions}
              placeholder="Select deductor"
            />
          </div>
          {errors.paymentNatureCode && <p className="text-xs text-red-500">{errors.paymentNatureCode}</p>}

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Rate (%)"
              name="rate"
              type="number"
              step="0.01"
              value={form.rate}
              onChange={handleFieldChange}
              requiredMark
              error={errors.rate}
            />
            <FormInput
              label="Threshold Amount"
              name="thresholdAmount"
              type="number"
              value={form.thresholdAmount}
              onChange={handleFieldChange}
            />
          </div>

          <FormSelect
            label="Threshold Period"
            name="thresholdPeriod"
            value={form.thresholdPeriod}
            onChange={handleFieldChange}
            options={thresholdPeriodOptions}
          />

          <TdsRateConditionEditor
            value={form.rateCondition}
            onChange={(rateCondition) => setForm((prev) => ({ ...prev, rateCondition }))}
            metadata={metadata}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Effective From"
              name="effectiveFrom"
              type="date"
              value={form.effectiveFrom}
              onChange={handleFieldChange}
              requiredMark
              error={errors.effectiveFrom}
            />
            <FormInput
              label="Effective To"
              name="effectiveTo"
              type="date"
              value={form.effectiveTo}
              onChange={handleFieldChange}
              error={errors.effectiveTo}
            />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewItem}
        onClose={() => setViewItem(null)}
        title={viewItem?.code}
        subtitle="TDS rule details"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setViewItem(null)}>
              Close
            </Button>
          </div>
        }
      >
        {viewItem && (
          <dl className="grid grid-cols-2 gap-3 py-2 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Old Section</dt>
              <dd className="mt-1 text-gray-900">{viewItem.oldSection || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">New Section</dt>
              <dd className="mt-1 text-gray-900">{viewItem.newSection || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Nature of Payment</dt>
              <dd className="mt-1 text-gray-900">
                {viewItem.paymentNatureName || natureNameByCode.get(viewItem.paymentNatureCode) || viewItem.paymentNatureCode}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Rate Condition</dt>
              <dd className="mt-1 font-mono text-xs text-gray-900">{viewItem.rateCondition || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Deductor</dt>
              <dd className="mt-1 text-gray-900">{viewItem.deductorName || deductorNameById.get(viewItem.deductorId) || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Rate</dt>
              <dd className="mt-1 text-gray-900">{viewItem.rate}%</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Threshold</dt>
              <dd className="mt-1 text-gray-900">
                {viewItem.thresholdAmount ? `₹${viewItem.thresholdAmount.toLocaleString("en-IN")}` : "—"}
                {" / "}
                {thresholdPeriodOptions.find((o) => o.value === viewItem.thresholdPeriod)?.label || viewItem.thresholdPeriod}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Status</dt>
              <dd className="mt-1"><StatusBadge label={viewItem.isActive ? "Active" : "Inactive"} size="sm" /></dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Effective From</dt>
              <dd className="mt-1 text-gray-900">{viewItem.effectiveFrom || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Effective To</dt>
              <dd className="mt-1 text-gray-900">{viewItem.effectiveTo || "—"}</dd>
            </div>
          </dl>
        )}
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete TDS Rule"
        message={`Are you sure you want to delete "${deleteTarget?.code}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteRule.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!statusTarget}
        title={statusTarget?.isActive ? "Deactivate Rule" : "Activate Rule"}
        message={`Are you sure you want to ${statusTarget?.isActive ? "deactivate" : "activate"} "${statusTarget?.code}"?`}
        confirmText={statusTarget?.isActive ? "Deactivate" : "Activate"}
        cancelText="Cancel"
        isLoading={updateStatus.isPending}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusTarget(null)}
        variant={statusTarget?.isActive ? "danger" : "primary"}
      />
    </div>
  );
}
