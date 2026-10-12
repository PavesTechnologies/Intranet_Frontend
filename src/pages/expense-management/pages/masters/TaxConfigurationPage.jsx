import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Percent, Lock, X, History } from "lucide-react";
import TaxAuditHistoryModal from "@/pages/expense-management/components/expense-reports/TaxAuditHistoryModal";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import StatusBadge from "@/components/status/statusbadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import api from "@/api/axiosInstance";
import { taxCodeService } from "@/pages/expense-management/api/expenseReportsApi";
import Pagination from "@/components/Pagination/pagination";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";
const ITEMS_PER_PAGE = 10;

// Backend TaxType enum - the types offered for India GST. A code's rate is the sum of its
// components; CGST_SGST and IGST components are generated from the rate, OTHER (e.g. GST + cess)
// takes them explicitly.
const TAX_TYPE_OPTIONS = [
  { label: "CGST + SGST (intra-state)", value: "CGST_SGST" },
  { label: "IGST (inter-state)", value: "IGST" },
  { label: "Exempt / Nil rated", value: "EXEMPT" },
  { label: "Other (e.g. GST + cess)", value: "OTHER" },
];
const TAX_TYPE_LABELS = {
  ...Object.fromEntries(TAX_TYPE_OPTIONS.map((o) => [o.value, o.label])),
  VAT: "VAT (overseas)",
  SALES_TAX: "Sales tax",
};
const COMPONENT_CODE_OPTIONS = ["CGST", "SGST", "UTGST", "IGST", "CESS", "OTHER"].map((c) => ({ label: c, value: c }));

const emptyForm = {
  taxCode: "",
  taxName: "",
  taxType: "CGST_SGST",
  ratePercent: "",
  itcRecoverablePercent: "0",
  inputTaxGlAccountId: "",
  description: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "ACTIVE",
  components: [],
  changeReason: "",
};

const unwrapList = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const plainNumber = (value) => Number(Number(value || 0).toFixed(2));

/** Components the server generates from the rate (CGST_SGST 18 -> CGST 9 + SGST 9, IGST 18 -> IGST 18). */
const templateComponents = (taxType, rate) => {
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return [];
  if (taxType === "CGST_SGST") return [{ componentCode: "CGST", ratePercent: r / 2 }, { componentCode: "SGST", ratePercent: r / 2 }];
  if (taxType === "IGST") return [{ componentCode: "IGST", ratePercent: r }];
  return [];
};

/** "CGST 9% + SGST 9%" from a code's components. */
const componentSummary = (components) =>
  (components || []).length > 1
    ? components.map((c) => `${c.componentCode} ${plainNumber(c.ratePercent)}%`).join(" + ")
    : null;

const itcLabel = (percent) => {
  const p = plainNumber(percent);
  if (p <= 0) return "Not claimable";
  return p >= 100 ? "Claimable" : `${p}% claimable`;
};

export default function TaxConfigurationPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["Admin", "Super_Admin"]);

  const [taxCodes, setTaxCodes] = useState([]);
  const [glAccounts, setGlAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCode, setCurrentCode] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [codeToDelete, setCodeToDelete] = useState(null);
  // Tax code whose audit history is open (Admin and Finance both read it).
  const [historyCode, setHistoryCode] = useState(null);

  const fetchTaxCodes = useCallback(async () => {
    try {
      setLoading(true);
      setTaxCodes(unwrapList(await taxCodeService.getAll()));
    } catch (err) {
      console.error("Failed to fetch tax codes:", err);
      showStatusToast(err.response?.data?.message || "Failed to fetch tax codes.", "error");
      setTaxCodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTaxCodes();
  }, [fetchTaxCodes]);

  // Input-tax GL account picker (optional). Failure here must not block the page.
  useEffect(() => {
    if (!isAdmin) return;
    api
      .get("/xms/admin/gl-accounts/active", {
        baseURL: EXPENSE_API_BASE,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setGlAccounts(unwrapList(res)))
      .catch((err) => console.error("Failed to load GL accounts:", err));
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    if (!q) return taxCodes;
    return taxCodes.filter((t) =>
      [t.taxCode, t.taxName, t.taxType, t.description].some((v) => (v || "").toLowerCase().includes(q))
    );
  }, [taxCodes, searchTerm]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const displayed = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
    setCurrentPage(1);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, [name]: value };
      // Exempt codes are always 0% and never claimable.
      if (name === "taxType" && value === "EXEMPT") {
        next.ratePercent = "0";
        next.itcRecoverablePercent = "0";
        next.components = [];
      }
      if (name === "taxType" && value === "OTHER" && prev.components.length === 0) {
        next.components = [
          { componentCode: "CGST", label: "", ratePercent: "" },
          { componentCode: "SGST", label: "", ratePercent: "" },
          { componentCode: "CESS", label: "", ratePercent: "" },
        ];
      }
      return next;
    });
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const updateComponent = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      components: prev.components.map((c, i) => (i === index ? { ...c, [field]: value } : c)),
    }));
    if (formErrors.components) setFormErrors((prev) => ({ ...prev, components: "" }));
  };
  const addComponent = () =>
    setFormData((prev) => ({ ...prev, components: [...prev.components, { componentCode: "CESS", label: "", ratePercent: "" }] }));
  const removeComponent = (index) =>
    setFormData((prev) => ({ ...prev, components: prev.components.filter((_, i) => i !== index) }));

  const isOtherType = formData.taxType === "OTHER";
  const componentTotal = formData.components.reduce((sum, c) => sum + (Number(c.ratePercent) || 0), 0);
  const isLocked = !!currentCode?.locked;
  const isDeactivating =
    !!currentCode && (currentCode.status || "").toUpperCase() === "ACTIVE" && formData.status === "INACTIVE";

  const validateForm = () => {
    const errors = {};
    const code = formData.taxCode.trim();
    const rate = isOtherType ? componentTotal : Number(formData.ratePercent);
    const itc = Number(formData.itcRecoverablePercent);

    if (!code) errors.taxCode = "Tax code is required.";
    else if (code.length > 50) errors.taxCode = "Tax code cannot exceed 50 characters.";
    else if (!/^[a-zA-Z0-9-_]+$/.test(code)) errors.taxCode = "Only letters, numbers, hyphens and underscores are allowed.";

    if (!formData.taxName.trim()) errors.taxName = "Tax name is required.";

    if (isOtherType) {
      if (formData.components.length === 0) errors.components = "Add at least one component.";
      else if (formData.components.some((c) => !(Number(c.ratePercent) > 0))) errors.components = "Every component needs a rate above 0.";
      else if (new Set(formData.components.map((c) => c.componentCode)).size !== formData.components.length) {
        errors.components = "Each component can appear only once.";
      } else if (componentTotal > 100) errors.components = "Component rates cannot add up to more than 100%.";
    } else if (formData.ratePercent === "" || !Number.isFinite(rate)) errors.ratePercent = "Rate is required.";
    else if (rate < 0 || rate > 100) errors.ratePercent = "Rate must be between 0 and 100.";
    else if (formData.taxType === "EXEMPT" && rate !== 0) errors.ratePercent = "An exempt code must have a rate of 0.";
    else if (formData.taxType !== "EXEMPT" && rate <= 0) errors.ratePercent = "Rate must be above 0.";

    if (formData.itcRecoverablePercent === "" || !Number.isFinite(itc) || itc < 0 || itc > 100) {
      errors.itcRecoverablePercent = "Enter a percentage between 0 and 100.";
    }
    if (isDeactivating && !formData.changeReason.trim()) {
      errors.changeReason = "Give a reason for deactivating this code.";
    }

    if (!formData.effectiveFrom) errors.effectiveFrom = "Effective from date is required.";
    if (formData.effectiveTo && formData.effectiveFrom && formData.effectiveTo < formData.effectiveFrom) {
      errors.effectiveTo = "Effective to cannot be before effective from.";
    }
    if (formData.description && formData.description.length > 250) {
      errors.description = "Description cannot exceed 250 characters.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    setCurrentCode(null);
    setFormData(emptyForm);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditClick = (t) => {
    setCurrentCode(t);
    setFormData({
      taxCode: t.taxCode || "",
      taxName: t.taxName || "",
      taxType: t.taxType || "CGST_SGST",
      ratePercent: t.ratePercent != null ? String(plainNumber(t.ratePercent)) : "",
      itcRecoverablePercent: String(plainNumber(t.itcRecoverablePercent ?? (t.itcEligible ? 100 : 0))),
      inputTaxGlAccountId: t.inputTaxGlAccountId || "",
      description: t.description || "",
      effectiveFrom: t.effectiveFrom || "",
      effectiveTo: t.effectiveTo || "",
      status: t.status || "ACTIVE",
      components: (t.components || []).map((c) => ({
        componentCode: c.componentCode,
        label: c.label || "",
        ratePercent: String(plainNumber(c.ratePercent)),
      })),
      changeReason: "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      taxCode: formData.taxCode.trim(),
      taxName: formData.taxName.trim(),
      taxType: formData.taxType,
      ratePercent: isOtherType ? null : Number(formData.ratePercent),
      itcRecoverablePercent: formData.taxType === "EXEMPT" ? 0 : Number(formData.itcRecoverablePercent),
      countryCode: "IN",
      // CGST_SGST / IGST components are generated server-side from the rate.
      components: isOtherType
        ? formData.components.map((c) => ({
            componentCode: c.componentCode,
            label: c.label?.trim() || null,
            ratePercent: Number(c.ratePercent),
          }))
        : null,
      changeReason: formData.changeReason.trim() || null,
      inputTaxGlAccountId: formData.inputTaxGlAccountId || null,
      description: formData.description ? formData.description.trim() : "",
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || null,
      status: formData.status,
    };

    try {
      setSubmitting(true);
      if (currentCode) {
        await taxCodeService.update(currentCode.taxCodeId, payload);
        showStatusToast("Tax code updated successfully!", "success");
      } else {
        await taxCodeService.create(payload);
        showStatusToast("Tax code created successfully!", "success");
        setCurrentPage(1);
      }
      setIsModalOpen(false);
      fetchTaxCodes();
    } catch (err) {
      console.error("Error saving tax code:", err);
      showStatusToast(err.response?.data?.message || "Failed to save tax code.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!codeToDelete) return;
    try {
      setSubmitting(true);
      await taxCodeService.delete(codeToDelete.taxCodeId);
      showStatusToast("Tax code deleted successfully!", "success");
      setIsConfirmOpen(false);
      setCodeToDelete(null);
      if (displayed.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
      fetchTaxCodes();
    } catch (err) {
      console.error("Error deleting tax code:", err);
      showStatusToast(err.response?.data?.message || "Failed to delete tax code.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Masters", to: "/expense-management/masters/expense-categories" },
    { label: "Tax Configuration" },
  ];

  const headers = ["S.No", "Tax Code", "Name", "Type", "Rate", "ITC", "Effective", "Categories", "Status"];
  const columns = ["serial_no", "taxCode", "taxName", "taxType", "rate", "itc", "effective", "categories", "status"];
  headers.push("Actions");
  columns.push("actions");

  const tableRows = displayed.map((t, index) => {
    const breakdown = componentSummary(t.components);
    const row = {
      serial_no: String((currentPage - 1) * ITEMS_PER_PAGE + index + 1),
      taxCode: (
        <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-gray-800">
          {t.taxCode}
          {t.locked && (
            <Lock
              size={12}
              className="text-gray-400"
              aria-label="Locked"
              title={`Used by ${t.usageCount} expense line(s): rate, type, components and ITC % are locked`}
            />
          )}
        </span>
      ),
      taxName: t.taxName || "—",
      taxType: TAX_TYPE_LABELS[t.taxType] || t.taxType || "—",
      rate: (
        <div className="leading-tight">
          <span className="font-semibold text-gray-900">{Number(t.ratePercent || 0)}%</span>
          {breakdown && <span className="block text-[11px] text-gray-400">{breakdown}</span>}
        </div>
      ),
      itc: itcLabel(t.itcRecoverablePercent ?? (t.itcEligible ? 100 : 0)),
      effective: `${formatDate(t.effectiveFrom)} → ${t.effectiveTo ? formatDate(t.effectiveTo) : "Open"}`,
      categories: t.mappedCategoryCount ?? 0,
      status: <StatusBadge label={(t.status || "").toUpperCase() === "ACTIVE" ? "Active" : "Inactive"} size="sm" />,
    };
    row.actions = (
      <div className="flex items-center gap-2 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Tax code history"
            aria-label="Tax code history"
            className="h-8 w-8 p-0 text-gray-500 hover:bg-gray-50 hover:text-gray-800 transition rounded-md"
            onClick={() => setHistoryCode(t)}
          >
            <History size={16} />
          </Button>
          {isAdmin && (
          <>
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Edit tax code"
            aria-label="Edit tax code"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => handleEditClick(t)}
          >
            <Pencil size={16} />
          </Button>
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete tax code"
            aria-label="Delete tax code"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => {
              setCodeToDelete(t);
              setIsConfirmOpen(true);
            }}
          >
            <Trash2 size={16} />
          </Button>
          </>
          )}
      </div>
    );
    return row;
  });

  const isExempt = formData.taxType === "EXEMPT";
  const formBreakdown = componentSummary(templateComponents(formData.taxType, formData.ratePercent));
  // Existing non-India codes (none today) stay editable, but new ones only get the India set.
  const typeOptions =
    TAX_TYPE_OPTIONS.some((o) => o.value === formData.taxType)
      ? TAX_TYPE_OPTIONS
      : [...TAX_TYPE_OPTIONS, { label: TAX_TYPE_LABELS[formData.taxType] || formData.taxType, value: formData.taxType }];

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">Tax Configuration</h1>
          <p className="text-sm text-gray-500 mt-1">
            India GST codes for expenses. Map a code to an expense category (from a date, under Expense Categories) and its rate pre-fills GST on line items.
          </p>
        </div>
        {isAdmin && (
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <Button onClick={openCreateModal} variant="primary" size="medium" className="w-full whitespace-nowrap sm:w-auto shadow-sm">
              <Plus size={16} />
              Add Tax Code
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="w-full lg:max-w-md">
          <SearchInput onSearch={handleSearch} placeholder="Search by code, name, type..." />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading tax codes..." />
          </div>
        ) : displayed.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Percent className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No Tax Codes Found</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                {searchTerm ? `No tax codes match "${searchTerm}".` : "Add a tax code to start mapping rates to expense categories."}
              </p>
            </PageCardContent>
          </PageCard>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable headers={headers} rows={tableRows} columns={columns} />
            </div>
            <div className="mt-4 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              />
            </div>
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentCode ? "Edit Tax Code" : "Add Tax Code"}
        subtitle={
          currentCode
            ? "Renaming a code updates every expense category mapped to it."
            : "Define a tax rate that expense categories can be mapped to."
        }
        size="lg"
        fullScreenMobile
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              form="tax-code-form"
              variant="primary"
              loading={submitting}
              loadingText="Saving..."
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Save Tax Code
            </Button>
          </div>
        }
      >
        <form id="tax-code-form" onSubmit={handleFormSubmit} className="space-y-4 py-2">
          {isLocked && (
            <p className="flex items-start gap-2 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              <Lock size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <span>
                Used by {currentCode.usageCount} expense line{currentCode.usageCount === 1 ? "" : "s"}, so its type, rate,
                components and ITC % are locked. For a rate change, create a new code and remap the categories from the
                date it applies.
              </span>
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Tax Code"
              name="taxCode"
              placeholder="e.g. GST18"
              value={formData.taxCode}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.taxCode}
            />
            <FormInput
              label="Tax Name"
              name="taxName"
              placeholder="e.g. GST 18%"
              value={formData.taxName}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.taxName}
            />
            {isLocked ? (
              <FormInput label="Tax Type" name="taxTypeLocked" value={TAX_TYPE_LABELS[formData.taxType] || formData.taxType} disabled />
            ) : (
              <FormSelect
                label="Tax Type"
                name="taxType"
                value={formData.taxType}
                onChange={handleInputChange}
                options={typeOptions}
                anchorOptions
              />
            )}
            <div>
              <FormInput
                label={isOtherType ? "Rate (%) - sum of components" : "Rate (%)"}
                name="ratePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 18"
                value={isOtherType ? String(plainNumber(componentTotal)) : formData.ratePercent}
                onChange={handleInputChange}
                onWheel={(e) => e.target.blur()}
                requiredMark
                disabled={submitting || isExempt || isOtherType || isLocked}
                error={formErrors.ratePercent}
              />
              {formBreakdown && !formErrors.ratePercent && (
                <p className="mt-1 text-[11px] text-gray-500">{formBreakdown}</p>
              )}
            </div>
            <div>
              <FormInput
                label="Recoverable ITC (%)"
                name="itcRecoverablePercent"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0 = blocked credit, 100 = fully claimable"
                value={formData.itcRecoverablePercent}
                onChange={handleInputChange}
                onWheel={(e) => e.target.blur()}
                requiredMark
                disabled={submitting || isExempt || isLocked}
                error={formErrors.itcRecoverablePercent}
              />
              {!formErrors.itcRecoverablePercent && (
                <p className="mt-1 text-[11px] text-gray-500">Share of this tax the company can claim back.</p>
              )}
            </div>
            <FormSelect
              label="Input Tax GL Account"
              name="inputTaxGlAccountId"
              value={formData.inputTaxGlAccountId}
              onChange={handleInputChange}
              anchorOptions
              options={[
                { label: "— None —", value: "" },
                ...glAccounts.map((g) => ({ label: `${g.glAccountCode} - ${g.glAccountName}`, value: g.glAccountId })),
              ]}
            />
            <FormInput
              label="Effective From"
              name="effectiveFrom"
              type="date"
              value={formData.effectiveFrom}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.effectiveFrom}
            />
            <FormInput
              label="Effective To"
              name="effectiveTo"
              type="date"
              value={formData.effectiveTo}
              onChange={handleInputChange}
              disabled={submitting}
              error={formErrors.effectiveTo}
            />
          </div>

          {isOtherType && (
            <div className="rounded-lg border border-gray-200 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-700">Components</p>
                {!isLocked && (
                  <Button type="button" variant="outline" size="small" onClick={addComponent} disabled={submitting}>
                    <Plus size={14} /> Add component
                  </Button>
                )}
              </div>
              {formData.components.map((c, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_90px_32px] items-end gap-2">
                  {isLocked ? (
                    <FormInput label={index === 0 ? "Code" : undefined} name={`componentCode-${index}`} value={c.componentCode} disabled />
                  ) : (
                    <FormSelect
                      label={index === 0 ? "Code" : undefined}
                      name={`componentCode-${index}`}
                      value={c.componentCode}
                      onChange={(e) => updateComponent(index, "componentCode", e.target.value)}
                      options={COMPONENT_CODE_OPTIONS}
                      anchorOptions
                    />
                  )}
                  <FormInput
                    label={index === 0 ? "Label (optional)" : undefined}
                    name={`componentLabel-${index}`}
                    placeholder={`${c.componentCode} ${c.ratePercent || "…"}%`}
                    value={c.label}
                    onChange={(e) => updateComponent(index, "label", e.target.value)}
                    disabled={submitting}
                  />
                  <FormInput
                    label={index === 0 ? "Rate (%)" : undefined}
                    name={`componentRate-${index}`}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={c.ratePercent}
                    onChange={(e) => updateComponent(index, "ratePercent", e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    disabled={submitting || isLocked}
                  />
                  <Button
                    type="button"
                    variant="link"
                    size="icon"
                    title="Remove component"
                    aria-label="Remove component"
                    className="mb-1 h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                    onClick={() => removeComponent(index)}
                    disabled={submitting || isLocked}
                  >
                    <X size={16} />
                  </Button>
                </div>
              ))}
              {formErrors.components && <p className="text-[11px] text-red-600">{formErrors.components}</p>}
            </div>
          )}

          <FormTextArea
            label="Description"
            name="description"
            placeholder="Optional, e.g. which purchases this applies to"
            value={formData.description}
            onChange={handleInputChange}
            disabled={submitting}
            error={formErrors.description}
          />

          <FormSelect
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ]}
          />
          {isDeactivating && (
            <FormTextArea
              label="Reason for deactivating"
              name="changeReason"
              placeholder="Recorded in the audit log, e.g. slab withdrawn from 01-Apr"
              value={formData.changeReason}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.changeReason}
            />
          )}
          {isDeactivating &&
            currentCode.mappedCategoryCount > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {currentCode.mappedCategoryCount} expense{" "}
                {currentCode.mappedCategoryCount === 1 ? "category is" : "categories are"} still mapped to this code.
                New expenses in {currentCode.mappedCategoryCount === 1 ? "it" : "them"} will no longer get GST
                pre-filled until they are remapped to an active code.
              </p>
            )}
        </form>
      </Modal>

      <TaxAuditHistoryModal
        isOpen={!!historyCode}
        onClose={() => setHistoryCode(null)}
        entity="tax-codes"
        entityId={historyCode?.taxCodeId}
        title={`Tax Code History · ${historyCode?.taxCode || ""}`}
      />

      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete Tax Code"
        message={`Are you sure you want to delete tax code "${codeToDelete?.taxCode}"? Codes that are mapped to categories or were used on expenses cannot be deleted; deactivate them instead.`}
        confirmText="Delete Tax Code"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setCodeToDelete(null);
        }}
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}
