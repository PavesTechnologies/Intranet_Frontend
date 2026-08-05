import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
  AlertCircle,
  Briefcase,
  Landmark,
  Calendar,
  FileText,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  Image as ImageIcon,
  Eye,
  Download,
  Loader2,
} from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import StatusBadge from "@/components/status/statusbadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import {
  expenseReportService,
  lineItemService,
  lookupService,
  receiptService,
} from "@/pages/expense-management/api/expenseReportsApi";
import ReportFormFields from "@/pages/expense-management/components/expense-reports/ReportFormFields";
import SummaryPanel from "@/pages/expense-management/components/expense-reports/SummaryPanel";
import api from "@/api/axiosInstance";
import Select from "react-select";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import FormDatePicker from "@/components/forms/FormDatePicker";
import GstCalculationCard from "@/pages/expense-management/components/expense-reports/GstCalculationCard";
import CurrencyConversionCard from "@/pages/expense-management/components/expense-reports/CurrencyConversionCard";
import ReceiptDropzone from "@/pages/expense-management/components/expense-reports/ReceiptDropzone";

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const DetailField = ({ icon, label, value }) => (
  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
    <div className="mt-0.5 shrink-0 text-blue-700">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-800 break-words">{value ?? "—"}</p>
    </div>
  </div>
);

const SORT_OPTIONS = [
  { label: "Date (Newest first)", value: "date_desc" },
  { label: "Date (Oldest first)", value: "date_asc" },
  { label: "Amount (High to Low)", value: "amount_desc" },
  { label: "Amount (Low to High)", value: "amount_asc" },
  { label: "Merchant (A-Z)", value: "merchant_asc" },
];

export default function ExpenseReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole(["General", "Manager"]);

  const [report, setReport] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  const [isLineItemDrawerOpen, setIsLineItemDrawerOpen] = useState(false);
  const [selectedLineItem, setSelectedLineItem] = useState(null);
  const [lineItemToDelete, setLineItemToDelete] = useState(null);
  const [deletingLineItem, setDeletingLineItem] = useState(false);

  const [isEditReportOpen, setIsEditReportOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ title: "", businessPurpose: "", costCenterId: "", currencyId: "" });
  const [editFormErrors, setEditFormErrors] = useState({});
  const [savingReport, setSavingReport] = useState(false);
  const [isDeleteReportOpen, setIsDeleteReportOpen] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);

  const fetchReport = useCallback(async () => {
    try {
      const res = await expenseReportService.getById(reportId);
      setReport(res.data?.data);
    } catch (err) {
      console.error("Failed to fetch expense report:", err);
      setLoadError(true);
    }
  }, [reportId]);

  const fetchLineItems = useCallback(async () => {
    try {
      const res = await lineItemService.getAll(reportId);
      const payload = res.data?.data;
      const list = Array.isArray(payload) ? payload : payload?.lineItems || payload?.content || payload?.data || [];
      setLineItems(list);
    } catch (err) {
      console.error("Failed to fetch line items:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch line items.";
      showStatusToast(errMsg, "error");
    }
  }, [reportId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    await Promise.all([fetchReport(), fetchLineItems()]);
    setLoading(false);
  }, [fetchReport, fetchLineItems]);

  const fetchLookups = useCallback(async () => {
    try {
      setLookupsLoading(true);
      const [costCenterList, currencyList, categoryList] = await Promise.all([
        lookupService.getActiveCostCenters(),
        lookupService.getActiveCurrencies(),
        lookupService.getActiveCategories(),
      ]);
      setCostCenters(costCenterList);
      setCurrencies(currencyList);
      setCategories(categoryList);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    } finally {
      setLookupsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    fetchLookups();
  }, [fetchAll, fetchLookups]);

  const costCenterOptions = useMemo(
    () => costCenters.map((c) => ({ value: c.costCenterId, label: `${c.costCenterCode} - ${c.costCenterName}` })),
    [costCenters]
  );
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.currencyId, label: `${c.currencyCode} - ${c.currencyName}`, code: c.currencyCode })),
    [currencies]
  );
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.categoryId, label: `${c.categoryCode} - ${c.categoryName}` })),
    [categories]
  );

  const filteredLineItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    let list = !q
      ? lineItems
      : lineItems.filter((li) => {
          const merchant = (li.merchantName || "").toLowerCase();
          const category = (li.categoryName || "").toLowerCase();
          const desc = (li.description || "").toLowerCase();
          return merchant.includes(q) || category.includes(q) || desc.includes(q);
        });

    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "date_asc":
          return new Date(a.expenseDate || 0) - new Date(b.expenseDate || 0);
        case "amount_desc":
          return (Number(b.amount) || 0) - (Number(a.amount) || 0);
        case "amount_asc":
          return (Number(a.amount) || 0) - (Number(b.amount) || 0);
        case "merchant_asc":
          return (a.merchantName || "").localeCompare(b.merchantName || "");
        case "date_desc":
        default:
          return new Date(b.expenseDate || 0) - new Date(a.expenseDate || 0);
      }
    });

    return list;
  }, [lineItems, searchTerm, sortBy]);

  const openAddLineItem = () => {
    setSelectedLineItem(null);
    setIsLineItemDrawerOpen(true);
  };

  const openEditLineItem = (li) => {
    setSelectedLineItem(li);
    setIsLineItemDrawerOpen(true);
  };

  const handleLineItemSaved = () => {
    fetchLineItems();
    fetchReport();
  };

  const handleDeleteLineItemConfirm = async () => {
    if (!lineItemToDelete) return;
    try {
      setDeletingLineItem(true);
      await lineItemService.delete(reportId, lineItemToDelete.lineItemId);
      showStatusToast("Line item deleted successfully!", "success");
      setLineItemToDelete(null);
      fetchLineItems();
      fetchReport();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete line item.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeletingLineItem(false);
    }
  };

  const openEditReport = () => {
    if (!report) return;
    setEditFormData({
      title: report.title || "",
      businessPurpose: report.businessPurpose || "",
      costCenterId: report.costCenterId || "",
      currencyId: report.currencyId || "",
    });
    setEditFormErrors({});
    setIsEditReportOpen(true);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (editFormErrors[name]) setEditFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleEditSelectChange = (name, value) => {
    setEditFormData((prev) => ({ ...prev, [name]: value }));
    if (editFormErrors[name]) setEditFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editFormData.title.trim()) errors.title = "Report title is required.";
    if (!editFormData.costCenterId) errors.costCenterId = "Cost center is required.";
    if (!editFormData.currencyId) errors.currencyId = "Report currency is required.";
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditReportSubmit = async (e) => {
    e.preventDefault();
    if (!validateEditForm()) return;

    const payload = {
      title: editFormData.title.trim(),
      businessPurpose: editFormData.businessPurpose ? editFormData.businessPurpose.trim() : "",
      costCenterId: editFormData.costCenterId,
      currencyId: editFormData.currencyId,
    };

    try {
      setSavingReport(true);
      await expenseReportService.update(reportId, payload);
      showStatusToast("Expense report updated successfully!", "success");
      setIsEditReportOpen(false);
      fetchReport();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to update expense report.";
      showStatusToast(errMsg, "error");
    } finally {
      setSavingReport(false);
    }
  };

  const handleDeleteReportConfirm = async () => {
    try {
      setDeletingReport(true);
      await expenseReportService.delete(reportId);
      showStatusToast("Expense report deleted successfully!", "success");
      navigate("/expense-management/expenses/my");
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete expense report.";
      showStatusToast(errMsg, "error");
      setIsDeleteReportOpen(false);
    } finally {
      setDeletingReport(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Expenses", to: "/expense-management/expenses/my" },
    { label: "My Expenses", to: "/expense-management/expenses/my" },
    { label: report?.title || "Report Details" },
  ];

  const headers = canManage
    ? ["Category", "Merchant", "Date", "Amount", "GST", "Net Amount", "Base Amount", "Billable", "Actions"]
    : ["Category", "Merchant", "Date", "Amount", "GST", "Net Amount", "Base Amount", "Billable"];
  const columns = canManage
    ? ["category", "merchant", "date", "amount", "gst", "net", "base", "billable", "actions"]
    : ["category", "merchant", "date", "amount", "gst", "net", "base", "billable"];

  const tableRows = filteredLineItems.map((li) => {
    const rowObj = {
      category: <span className="font-medium text-gray-800">{li.categoryName || "—"}</span>,
      merchant: (
        <div className="text-left">
          <p className="font-medium text-gray-900">{li.merchantName || "—"}</p>
          {li.description && <p className="text-xs text-gray-400 truncate max-w-[180px]">{li.description}</p>}
        </div>
      ),
      date: formatDate(li.expenseDate),
      amount: (
        <span className="font-mono font-semibold text-gray-900">
          {formatAmount(li.amount)} <span className="text-xs text-gray-400">{li.currencyCode}</span>
        </span>
      ),
      gst: <span className="font-mono text-amber-600">{formatAmount(li.taxAmount)}</span>,
      net: <span className="font-mono font-semibold text-emerald-700">{formatAmount(li.netAmount)}</span>,
      base: (
        <span className="font-mono text-[#0A0082] font-semibold">
          {formatAmount(li.baseAmount)} <span className="text-xs text-gray-400">{li.baseCurrencyCode}</span>
        </span>
      ),
      billable: li.clientBillable ? (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">Yes</span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-200">No</span>
      ),
    };

    if (canManage) {
      rowObj.actions = (
        <div className="flex items-center gap-1 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Edit Line Item"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => openEditLineItem(li)}
          >
            <Pencil size={16} />
          </Button>
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete Line Item"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => setLineItemToDelete(li)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      );
    }

    return rowObj;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <div className="py-24">
          <LoadingSpinner text="Loading expense report..." />
        </div>
      </div>
    );
  }

  if (loadError || !report) {
    return (
      <div className="space-y-4">
        <Breadcrumb items={breadcrumbs} />
        <PageCard>
          <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
            <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
            <h2 className="text-sm font-semibold text-gray-700">Failed to load this expense report</h2>
            <Button variant="outline" size="small" className="mt-4" onClick={fetchAll}>
              Retry
            </Button>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Report Information */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#0a174e]">{report.title}</h1>
                  <StatusBadge label={report.reportStatus || "DRAFT"} size="sm" />
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">{report.reportNumber}</p>
              </div>

              {canManage && (
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="small" onClick={openEditReport}>
                    <Pencil size={14} />
                    Edit
                  </Button>
                  <Button variant="danger" size="small" onClick={() => setIsDeleteReportOpen(true)}>
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <DetailField icon={<FileText size={16} />} label="Business Purpose" value={report.businessPurpose || "—"} />
              <DetailField icon={<Briefcase size={16} />} label="Cost Center" value={report.costCenterName || "—"} />
              <DetailField icon={<Landmark size={16} />} label="Report Currency" value={report.currencyCode || "—"} />
              <DetailField icon={<Calendar size={16} />} label="Created" value={formatDate(report.createdAt)} />
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-50 text-[#0A0082]">
                  <Receipt size={16} />
                </div>
                <h2 className="text-base font-bold text-gray-900">Line Items</h2>
              </div>
              {canManage && (
                <Button variant="primary" size="small" onClick={openAddLineItem} className="shadow-sm">
                  <Plus size={14} />
                  Add Line Item
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
              <div className="sm:col-span-2">
                <SearchInput value={searchTerm} onSearch={setSearchTerm} placeholder="Search by merchant, category, description..." />
              </div>
              <FormSelect name="sortBy" value={sortBy} onChange={(e) => setSortBy(e.target.value)} options={SORT_OPTIONS} />
            </div>

            {filteredLineItems.length === 0 ? (
              <PageCard>
                <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                  <Layers className="h-10 w-10 text-gray-300 mb-3" />
                  <h2 className="text-sm font-semibold text-gray-700">No Line Items Yet</h2>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    {searchTerm
                      ? "No line items match your search."
                      : "Add your first expense line item — currency conversion and GST are calculated automatically."}
                  </p>
                </PageCardContent>
              </PageCard>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg">
                <GenericTable headers={headers} rows={tableRows} columns={columns} />
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-1">
          <SummaryPanel report={{ ...report, status: report?.reportStatus }} lineItems={lineItems} />
        </div>
      </div>

      <LineItemDrawer
        isOpen={isLineItemDrawerOpen}
        onClose={() => setIsLineItemDrawerOpen(false)}
        reportId={reportId}
        lineItem={selectedLineItem}
        defaultCostCenterId={report.costCenterId}
        categoryOptions={categoryOptions}
        costCenterOptions={costCenterOptions}
        currencyOptions={currencyOptions}
        onSaved={handleLineItemSaved}
      />

      <ConfirmationModal
        isOpen={!!lineItemToDelete}
        title="Delete Line Item"
        message={`Are you sure you want to delete the line item "${lineItemToDelete?.merchantName}"? This action cannot be undone.`}
        confirmText="Delete Line Item"
        cancelText="Cancel"
        onConfirm={handleDeleteLineItemConfirm}
        onCancel={() => setLineItemToDelete(null)}
        isLoading={deletingLineItem}
        variant="danger"
      />

      <Modal
        isOpen={isEditReportOpen}
        onClose={() => setIsEditReportOpen(false)}
        title="Edit Expense Report"
        subtitle="Modify this expense report's properties."
        size="lg"
        fullScreenMobile
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsEditReportOpen(false)} disabled={savingReport} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="detail-report-edit-form" variant="primary" loading={savingReport} loadingText="Saving..." className="w-full sm:w-auto">
              Save Changes
            </Button>
          </div>
        }
      >
        <form id="detail-report-edit-form" onSubmit={handleEditReportSubmit} className="py-2">
          <ReportFormFields
            formData={editFormData}
            formErrors={editFormErrors}
            onInputChange={handleEditInputChange}
            onSelectChange={handleEditSelectChange}
            costCenterOptions={costCenterOptions}
            currencyOptions={currencyOptions}
            disabled={savingReport}
            lookupsLoading={lookupsLoading}
          />
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isDeleteReportOpen}
        title="Delete Expense Report"
        message={`Are you sure you want to delete "${report.title}"? This will remove all its line items and receipts. This action cannot be undone.`}
        confirmText="Delete Report"
        cancelText="Cancel"
        onConfirm={handleDeleteReportConfirm}
        onCancel={() => setIsDeleteReportOpen(false)}
        isLoading={deletingReport}
        variant="danger"
      />
    </div>
  );
}

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.125rem 0.25rem",
    minHeight: "42px",
    backgroundColor: "#ffffff",
    "&:hover": { borderColor: state.isFocused ? "#3b82f6" : "#d1d5db" },
  }),
  menu: (base) => ({ ...base, zIndex: 9999 }),
};

const emptyForm = (defaultCostCenterId) => ({
  categoryId: "",
  expenseDate: new Date().toISOString().split("T")[0],
  merchantName: "",
  description: "",
  amount: "",
  currencyId: "",
  taxAmount: "0",
  costCenterId: defaultCostCenterId || "",
  clientBillable: false,
  projectId: "",
});

function LineItemDrawer({
  isOpen,
  onClose,
  reportId,
  lineItem,
  defaultCostCenterId,
  categoryOptions = [],
  costCenterOptions = [],
  currencyOptions = [],
  onSaved,
}) {
  const [formData, setFormData] = useState(emptyForm(defaultCostCenterId));
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [savedLineItem, setSavedLineItem] = useState(null);
  const [projects, setProjects] = useState([]);

  const [receipts, setReceipts] = useState([]);
  const [loadingReceipts, setLoadingReceipts] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]); // [{ id, file, name, size }]
  const [receiptToDelete, setReceiptToDelete] = useState(null);
  const [deletingReceipt, setDeletingReceipt] = useState(false);
  const inputRef = useRef(null);

  const isEditingExisting = !!lineItem;

  const fetchReceipts = useCallback(async () => {
    const idToFetch = lineItem?.lineItemId || savedLineItem?.lineItemId;
    if (!idToFetch) return;
    try {
      setLoadingReceipts(true);
      const res = await receiptService.getAll(idToFetch);
      const list = Array.isArray(res.data) ? res.data : res.data?.receipts || res.data?.content || res.data?.data || [];
      setReceipts(list);
    } catch (err) {
      console.error("Failed to fetch receipts:", err);
    } finally {
      setLoadingReceipts(false);
    }
  }, [lineItem?.lineItemId, savedLineItem?.lineItemId]);

  useEffect(() => {
    if (isOpen && (lineItem?.lineItemId || savedLineItem?.lineItemId)) {
      fetchReceipts();
    }
  }, [isOpen, lineItem?.lineItemId, savedLineItem?.lineItemId, fetchReceipts]);

  useEffect(() => {
    if (!isOpen) {
      setSavedLineItem(null);
      setPendingFiles([]);
      setReceipts([]);
      return;
    }

    const loadProjects = async () => {
      try {
        const res = await api.get("/xms/admin/projects", {
          baseURL: window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const list = res.data?.data || res.data || [];
        setProjects(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error("Failed to load projects:", err);
      }
    };
    loadProjects();

    if (lineItem) {
      if (!savedLineItem || lineItem.lineItemId !== savedLineItem.lineItemId) {
        setFormData({
          categoryId: lineItem.categoryId || "",
          expenseDate: lineItem.expenseDate || new Date().toISOString().split("T")[0],
          merchantName: lineItem.merchantName || "",
          description: lineItem.description || "",
          amount: lineItem.amount ?? "",
          currencyId: lineItem.currencyId || "",
          taxAmount: lineItem.taxAmount ?? "0",
          costCenterId: lineItem.costCenterId || defaultCostCenterId || "",
          clientBillable: !!lineItem.clientBillable,
          projectId: lineItem.projectId || "",
        });
        setSavedLineItem(lineItem);
      }
    } else {
      setFormData(emptyForm(defaultCostCenterId));
      setSavedLineItem(null);
    }
    setFormErrors({});
  }, [isOpen, lineItem, defaultCostCenterId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileChange = (files) => {
    if (!files?.length) return;
    const newFiles = [];
    let hasDuplicate = false; 

    for (const file of Array.from(files)) {
      const isDuplicate = pendingFiles.some(
        (pf) => pf.name === file.name && pf.size === file.size
      );
      if (isDuplicate) {
        hasDuplicate = true;
      } else {
        newFiles.push({
          id: Math.random().toString(36).substring(2, 9),
          file,
          name: file.name,
          size: file.size,
        });
      }
    }

    if (hasDuplicate) {
      showStatusToast("This receipt has already been uploaded.", "error");
    }

    if (newFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleViewReceipt = async (receipt) => {
    try {
      if (receipt.receiptId) {
        const res = await receiptService.getViewUrl(receipt.receiptId);
        const url = extractUrl(res.data?.data || res.data);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      } else if (receipt.file) {
        const url = URL.createObjectURL(receipt.file);
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      showStatusToast("Failed to open receipt preview.", "error");
    }
  };

  const handleDownloadReceipt = async (receipt) => {
    try {
      const res = await receiptService.getDownloadUrl(receipt.receiptId);
      const url = extractUrl(res.data?.data || res.data);
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = receipt.fileName || "receipt";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
      }
    } catch (err) {
      showStatusToast("Failed to download receipt.", "error");
    }
  };

  const handleDeleteReceiptConfirm = async () => {
    if (!receiptToDelete) return;
    try {
      setDeletingReceipt(true);
      await receiptService.delete(receiptToDelete.receiptId);
      showStatusToast("Receipt deleted successfully!", "success");
      setReceiptToDelete(null);
      fetchReceipts();
    } catch (err) {
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete receipt.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeletingReceipt(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    const amountNum = Number(formData.amount);
    const gstNum = Number(formData.taxAmount);

    if (!formData.amount || amountNum <= 0) {
      errors.amount = "Amount is required and must be greater than 0.";
    }
    if (formData.taxAmount === "" || gstNum < 0) {
      errors.taxAmount = "GST must be zero or a positive number.";
    } else if (amountNum > 0 && gstNum > amountNum) {
      errors.taxAmount = "GST cannot exceed the expense amount.";
    }
    if (!formData.merchantName.trim()) errors.merchantName = "Merchant is required.";
    if (!formData.currencyId) errors.currencyId = "Currency is required.";
    if (!formData.categoryId) errors.categoryId = "Category is required.";
    if (!formData.costCenterId) errors.costCenterId = "Cost center is required.";
    if (!formData.expenseDate) errors.expenseDate = "Expense date is required.";
    if (formData.clientBillable && !formData.projectId) {
      errors.projectId = "Project is required when billable.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      categoryId: formData.categoryId,
      expenseDate: formData.expenseDate,
      merchantName: formData.merchantName.trim(),
      description: formData.description ? formData.description.trim() : "",
      amount: Number(formData.amount),
      currencyId: formData.currencyId,
      taxAmount: Number(formData.taxAmount),
      costCenterId: formData.costCenterId,
      projectId: formData.clientBillable ? (formData.projectId || null) : null,
      clientBillable: !!formData.clientBillable,
    };

    try {
      setSubmitting(true);
      let res;
      if (savedLineItem) {
        res = await lineItemService.update(reportId, savedLineItem.lineItemId, payload);
        showStatusToast("Line item updated successfully!", "success");
        setSavedLineItem(res.data?.data || res.data || { ...payload, lineItemId: savedLineItem?.lineItemId });
        onSaved?.();
      } else {
        res = await lineItemService.create(reportId, payload);
        const createdItem = res.data?.data || res.data;
        const lineItemId = createdItem?.lineItemId;

        if (lineItemId && pendingFiles.length > 0) {
          for (const pf of pendingFiles) {
            const formDataUpload = new FormData();
            formDataUpload.append("file", pf.file);
            try {
              await receiptService.upload(lineItemId, formDataUpload);
            } catch (uploadErr) {
              console.error(`Failed to upload ${pf.name}:`, uploadErr);
              showStatusToast(`Failed to upload ${pf.name}`, "error");
            }
          }
        }

        showStatusToast("Line item added successfully!", "success");
        onSaved?.();
        onClose();
      }
    } catch (err) {
      console.error("Error saving line item:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save line item.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const mergedCategoryOptions = useMemo(() => {
    if (!lineItem?.categoryId) return categoryOptions;
    const alreadyPresent = categoryOptions.some((o) => o.value === lineItem.categoryId);
    if (alreadyPresent) return categoryOptions;
    return [{ value: lineItem.categoryId, label: lineItem.categoryName || lineItem.categoryId }, ...categoryOptions];
  }, [categoryOptions, lineItem]);

  const projectOptions = useMemo(() => {
    return projects
      .filter((p) => (p.status || "").toString().toUpperCase() === "ACTIVE")
      .map((p) => ({
        value: p.projectId,
        label: `${p.projectCode} - ${p.projectName}`,
      }));
  }, [projects]);

  const selectedCurrency = currencyOptions.find((o) => o.value === formData.currencyId) || null;
  const selectedCostCenter = costCenterOptions.find((o) => o.value === formData.costCenterId) || null;
  const selectedCategory = mergedCategoryOptions.find((o) => o.value === formData.categoryId) || null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={savedLineItem ? "Edit Line Item" : "Add Line Item"}
      subtitle={
        savedLineItem
          ? "Modify this expense line item, or attach supporting receipts below."
          : "Capture a single expense with real-time currency and GST calculation."
      }
      size="2xl"
      fullScreenMobile
      closeOnBackdrop={false}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
            {savedLineItem ? "Done" : "Cancel"}
          </Button>
          <Button
            type="submit"
            form="line-item-form"
            variant="primary"
            loading={submitting}
            loadingText="Saving..."
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            {savedLineItem ? "Save Changes" : "Save Line Item"}
          </Button>
        </div>
      }
    >
      {savedLineItem && !isEditingExisting && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs font-medium text-green-700">
          <CheckCircle2 size={14} />
          Line item saved. You can keep editing, attach receipts, or click Done.
        </div>
      )}

      {categoryOptions.length === 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-700">
          <AlertTriangle size={14} />
          Expense categories couldn't be loaded for your account — contact your administrator if this
          persists.
        </div>
      )}

      <form id="line-item-form" onSubmit={handleSubmit} className="space-y-4 py-1">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Category <span className="text-red-500">*</span>
            </label>
            <Select
              options={mergedCategoryOptions}
              value={selectedCategory}
              onChange={(opt) => handleSelectChange("categoryId", opt ? opt.value : "")}
              placeholder="Select expense category..."
              isSearchable
              styles={customSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.categoryId && <span className="text-xs text-red-600 block mt-1">{formErrors.categoryId}</span>}
          </div>

          <FormDatePicker
            label="Expense Date *"
            name="expenseDate"
            value={formData.expenseDate}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput
            label="Merchant"
            name="merchantName"
            placeholder="e.g. REDBUS"
            value={formData.merchantName}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.merchantName}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Cost Center <span className="text-red-500">*</span>
            </label>
            <Select
              options={costCenterOptions}
              value={selectedCostCenter}
              onChange={(opt) => handleSelectChange("costCenterId", opt ? opt.value : "")}
              placeholder="Select cost center..."
              isSearchable
              styles={customSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.costCenterId && <span className="text-xs text-red-600 block mt-1">{formErrors.costCenterId}</span>}
          </div>
        </div>

        <FormTextArea
          label="Description"
          name="description"
          placeholder="Optional notes about this expense..."
          value={formData.description}
          onChange={handleInputChange}
          disabled={submitting}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormInput
            label="Amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.amount}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.amount}
          />

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Currency <span className="text-red-500">*</span>
            </label>
            <Select
              options={currencyOptions}
              value={selectedCurrency}
              onChange={(opt) => handleSelectChange("currencyId", opt ? opt.value : "")}
              placeholder="Select currency..."
              isSearchable
              styles={customSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.currencyId && <span className="text-xs text-red-600 block mt-1">{formErrors.currencyId}</span>}
          </div>

          <FormInput
            label="GST"
            name="taxAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={formData.taxAmount}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.taxAmount}
          />
        </div>

        <FormSelect
          label="Client Billable?"
          name="clientBillable"
          value={formData.clientBillable}
          onChange={(e) => handleSelectChange("clientBillable", e.target.value === true || e.target.value === "true")}
          options={[
            { label: "Yes", value: true },
            { label: "No", value: false },
          ]}
        />

        {formData.clientBillable && (
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Project <span className="text-red-500">*</span>
            </label>
            <Select
              options={projectOptions}
              value={projectOptions.find((o) => o.value === formData.projectId) || null}
              onChange={(opt) => handleSelectChange("projectId", opt ? opt.value : "")}
              placeholder="Select project..."
              isSearchable
              styles={customSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.projectId && <span className="text-xs text-red-600 block mt-1">{formErrors.projectId}</span>}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <GstCalculationCard amount={formData.amount} gst={formData.taxAmount} />
          <CurrencyConversionCard
            amount={formData.amount}
            currencyCode={selectedCurrency?.code}
            exchangeRate={savedLineItem?.exchangeRate}
            baseAmount={savedLineItem?.baseAmount}
            baseCurrencyCode={savedLineItem?.baseCurrencyCode}
            pending={!savedLineItem}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Receipts</label>
          {isEditingExisting ? (
            <div className="space-y-3">
              {loadingReceipts ? (
                <div className="flex items-center justify-center py-6 text-gray-400">
                  <Loader2 className="animate-spin" size={18} />
                </div>
              ) : receipts.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-2">No receipts uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {receipts.map((r) => (
                    <div
                      key={r.receiptId}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 hover:border-gray-300 hover:shadow-sm transition"
                    >
                      <div className="shrink-0 p-2 rounded-lg bg-blue-50 text-blue-600">
                        {isImageFile(r.fileName) ? <ImageIcon size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{r.fileName || "Receipt"}</p>
                        <p className="text-[10px] text-gray-400">
                          {formatFileSize(r.fileSize)} &bull; {formatDate(r.uploadedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="link"
                          size="icon"
                          title="View Receipt"
                          className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100 rounded-md"
                          onClick={() => handleViewReceipt(r)}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="link"
                          size="icon"
                          title="Download Receipt"
                          className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 rounded-md"
                          onClick={() => handleDownloadReceipt(r)}
                        >
                          <Download size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="link"
                          size="icon"
                          title="Delete Receipt"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 rounded-md"
                          onClick={() => setReceiptToDelete(r)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFileChange(e.dataTransfer.files);
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed p-5 text-center cursor-pointer transition ${
                  isDragging ? "border-[#0A0082] bg-indigo-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <UploadCloud className={isDragging ? "text-[#0A0082]" : "text-gray-400"} size={22} />
                <p className="text-xs font-medium text-gray-600">
                  Drag &amp; drop a receipt, or <span className="text-[#0A0082] font-semibold">browse</span>
                </p>
                <p className="text-[10px] text-gray-400">PDF, PNG, JPG up to 10MB</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                  className="hidden"
                  onChange={(e) => {
                    handleFileChange(e.target.files);
                    e.target.value = "";
                  }}
                />
              </div>

              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  {pendingFiles.map((pf) => (
                    <div
                      key={pf.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5 hover:border-gray-300 hover:shadow-sm transition"
                    >
                      <div className="shrink-0 p-2 rounded-lg bg-blue-50 text-blue-600">
                        {isImageFile(pf.name) ? <ImageIcon size={16} /> : <FileText size={16} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{pf.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {formatFileSize(pf.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button
                          type="button"
                          variant="link"
                          size="icon"
                          title="View Receipt"
                          className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100 rounded-md"
                          onClick={() => handleViewReceipt(pf)}
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="link"
                          size="icon"
                          title="Remove File"
                          className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 rounded-md"
                          onClick={() => setPendingFiles((prev) => prev.filter((item) => item.id !== pf.id))}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </form>

      <ConfirmationModal
        isOpen={!!receiptToDelete}
        title="Delete Receipt"
        message={`Are you sure you want to delete the receipt "${receiptToDelete?.fileName}"? This action cannot be undone.`}
        confirmText="Delete Receipt"
        cancelText="Cancel"
        onConfirm={handleDeleteReceiptConfirm}
        onCancel={() => setReceiptToDelete(null)}
        isLoading={deletingReceipt}
        variant="danger"
      />
    </Modal>
  );
}

const formatFileSize = (bytes) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImageFile = (fileName = "") => /\.(png|jpe?g|gif|webp|heic)$/i.test(fileName);

const extractUrl = (data) => {
  if (!data) return null;
  if (typeof data === "string") return data;
  return data.url || data.viewUrl || data.downloadUrl || data.presignedUrl || null;
};
