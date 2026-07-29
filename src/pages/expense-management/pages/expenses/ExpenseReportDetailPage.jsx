import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/pages/expense-management/api/expenseReportsApi";
import ReportFormFields from "@/pages/expense-management/components/expense-reports/ReportFormFields";
import SummaryPanel from "@/pages/expense-management/components/expense-reports/SummaryPanel";
import LineItemDrawer from "@/pages/expense-management/components/expense-reports/LineItemDrawer";

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
      setReport(res.data);
    } catch (err) {
      console.error("Failed to fetch expense report:", err);
      setLoadError(true);
    }
  }, [reportId]);

  const fetchLineItems = useCallback(async () => {
    try {
      const res = await lineItemService.getAll(reportId);
      const list = Array.isArray(res.data) ? res.data : res.data?.lineItems || res.data?.content || res.data?.data || [];
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
                  <StatusBadge label={report.status || "DRAFT"} size="sm" />
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
          <SummaryPanel report={report} lineItems={lineItems} />
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
