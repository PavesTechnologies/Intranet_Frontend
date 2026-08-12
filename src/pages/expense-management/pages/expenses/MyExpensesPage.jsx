import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, FileStack, FilePlus2, Landmark, Layers, AlertCircle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Pagination from "@/components/Pagination/pagination";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import ApprovalStatusPill from "@/pages/expense-management/approval-engine/components/ApprovalStatusPill";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import { expenseReportService, lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import ReportFormFields from "@/pages/expense-management/components/expense-reports/ReportFormFields";

const ITEMS_PER_PAGE = 10;

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const breadcrumbs = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Expenses", to: "/expense-management/expenses/my" },
  { label: "My Expenses" },
];

const emptyReportForm = {
  title: "",
  businessPurpose: "",
  costCenterId: "",
  currencyId: "",
};

export default function MyExpensesPage() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canManage = hasRole(["General", "Manager"]);

  const [reports, setReports] = useState([]);
  const [isServerPaginated, setIsServerPaginated] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [costCenters, setCostCenters] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [formData, setFormData] = useState(emptyReportForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLookups = useCallback(async () => {
    try {
      const [costCenterList, currencyList] = await Promise.all([
        lookupService.getActiveCostCenters(),
        lookupService.getActiveCurrencies(),
      ]);
      setCostCenters(costCenterList);
      setCurrencies(currencyList);
    } catch (err) {
      console.error("Failed to load lookups:", err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
      };
      const res = await expenseReportService.getAll(params);

      const payload = res.data?.data;

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
        const items = payload.reports || payload.expenseReports || payload.content || payload.data || [];
        const total = payload.total !== undefined ? payload.total : payload.totalElements ?? items.length ?? 0;
        setReports(items);
        setTotalItems(total);
        setIsServerPaginated(true);
      } else if (Array.isArray(payload)) {
        setReports(payload);
        setIsServerPaginated(false);
      } else {
        setReports([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch expense reports:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch expense reports.";
      showStatusToast(errMsg, "error");
      setReports([]);
      setTotalItems(0);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const matchesFilters = useCallback(
    (r) => {
      const title = (r.title || "").toLowerCase();
      const number = (r.reportNumber || "").toLowerCase();
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q || title.includes(q) || number.includes(q);
      const matchesStatus = !statusFilter || (r.reportStatus || "").toUpperCase() === statusFilter;
      return matchesSearch && matchesStatus;
    },
    [searchTerm, statusFilter]
  );

  const displayedReports = isServerPaginated
    ? reports
    : (() => {
        const filtered = reports.filter(matchesFilters);
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const totalCount = isServerPaginated ? totalItems : reports.filter(matchesFilters).length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 0;

  const allReportsForStats = isServerPaginated ? reports : reports.filter(matchesFilters);
  const totalReportsCount = isServerPaginated ? totalItems : reports.filter(matchesFilters).length;
  const draftCount = allReportsForStats.filter((r) => (r.reportStatus || "").toUpperCase() === "DRAFT").length;
  const totalReimbursable = allReportsForStats.reduce((sum, r) => sum + (Number(r.reimbursableAmount) || 0), 0);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePreviousPage = useCallback(() => setCurrentPage((p) => Math.max(p - 1, 1)), []);
  const handleNextPage = useCallback(() => setCurrentPage((p) => Math.min(p + 1, totalPages)), [totalPages]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = "Report title is required.";
    } else if (formData.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters.";
    }
    if (!formData.costCenterId) errors.costCenterId = "Cost center is required.";
    if (!formData.currencyId) errors.currencyId = "Report currency is required.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditClick = (report) => {
    setCurrentReport(report);
    setFormData({
      title: report.title || "",
      businessPurpose: report.businessPurpose || "",
      costCenterId: report.costCenterId || "",
      currencyId: report.currencyId || "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      title: formData.title.trim(),
      businessPurpose: formData.businessPurpose ? formData.businessPurpose.trim() : "",
      costCenterId: formData.costCenterId,
      currencyId: formData.currencyId,
    };

    try {
      setSubmitting(true);
      await expenseReportService.update(currentReport.reportId, payload);
      showStatusToast("Expense report updated successfully!", "success");
      setIsModalOpen(false);
      fetchReports();
    } catch (err) {
      console.error("Error updating expense report:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to update expense report.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (report) => {
    setReportToDelete(report);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) return;
    try {
      setDeleting(true);
      await expenseReportService.delete(reportToDelete.reportId);
      showStatusToast("Expense report deleted successfully!", "success");
      setIsConfirmOpen(false);
      setReportToDelete(null);
      if (displayedReports.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        fetchReports();
      }
    } catch (err) {
      console.error("Error deleting expense report:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete expense report.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const costCenterOptions = costCenters.map((c) => ({
    value: c.costCenterId,
    label: `${c.costCenterCode} - ${c.costCenterName}`,
  }));
  const currencyOptions = currencies.map((c) => ({
    value: c.currencyId,
    label: `${c.currencyCode} - ${c.currencyName}`,
  }));
  const headers = ["S.No", "Report #", "Title", "Cost Center", "Currency", "Total Amount", "Status", "Created", "Actions"];
  const columns = ["serial_no", "reportNumber", "title", "costCenter", "currency", "totalAmount", "status", "created", "actions"];

  const tableRows = displayedReports.map((r, index) => ({
    serial_no: ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
    reportNumber: <span className="font-mono text-[11px] font-semibold text-gray-700">{r.reportNumber || "—"}</span>,
    title: <span className="font-medium text-xs text-gray-900">{r.title || "Untitled Report"}</span>,
    costCenter: <span className="text-xs">{r.costCenterName || "—"}</span>,
    currency: <span className="font-semibold text-xs text-gray-600">{r.currencyCode || "—"}</span>,
    totalAmount: <span className="font-mono font-semibold text-xs text-gray-900">{formatAmount(r.totalAmount)}</span>,
    status: <StatusBadge label={r.reportStatus || "DRAFT"} size="sm" />,
    created: <span className="text-xs">{formatDate(r.createdAt)}</span>,
    actions: (
      <div className="flex items-center gap-1 justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="View Report"
          className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition rounded-md"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/expense-management/expenses/reports/${r.reportId}`);
          }}
        >
          <Eye size={14} />
        </Button>
        {canManage && (
          <>
            <Button
              type="button"
              variant="link"
              size="icon"
              title="Edit Report"
              className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
              onClick={(e) => {
                e.stopPropagation();
                handleEditClick(r);
              }}
            >
              <Pencil size={14} />
            </Button>
            <Button
              type="button"
              variant="link"
              size="icon"
              title="Delete Report"
              className="h-7 w-7 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(r);
              }}
            >
              <Trash2 size={14} />
            </Button>
          </>
        )}
      </div>
    ),
  }));

  const statusFilterOptions = [
    { label: "All Statuses", value: "" },
    { label: "Draft", value: "DRAFT" },
    { label: "Submitted", value: "SUBMITTED" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#0a174e]">My Expense Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">Track and manage the expense reports you've created.</p>
        </div>

        {canManage && (
          <Button
            onClick={() => navigate("/expense-management/expenses/create")}
            variant="primary"
            size="small"
            className="w-full whitespace-nowrap sm:w-auto shadow-sm !py-1.5 !text-xs"
          >
            <Plus size={14} />
            Create Expense Report
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileStack size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Reports</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalReportsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <FilePlus2 size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Draft Reports</p>
            <p className="text-xl font-bold text-amber-600 mt-0.5">{draftCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
            <Landmark size={18} />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Reimbursable</p>
            <p className="text-xl font-bold text-green-600 mt-0.5">{formatAmount(totalReimbursable)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
            <SearchInput
              value={searchTerm}
              onSearch={handleSearch}
              placeholder="Search by title or report number..."
              className="!py-1.5 !px-3 !text-xs"
            />
          </div>
          <FormSelect
            label="Status"
            name="statusFilter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={statusFilterOptions}
            className="[&>label]:text-xs [&>label]:mb-1"
            buttonClassName="!py-1.5 !px-3 !text-xs"
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading Expense Reports..." />
          </div>
        ) : loadError ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">Failed to load Expense Reports</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">Something went wrong while fetching data. Please try again.</p>
              <Button variant="outline" size="small" className="mt-4" onClick={fetchReports}>
                Retry
              </Button>
            </PageCardContent>
          </PageCard>
        ) : displayedReports.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Layers className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No Expense Reports Found</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                {searchTerm || statusFilter
                  ? "No expense reports match the selected search and filters."
                  : "Create your first expense report to get started."}
              </p>
            </PageCardContent>
          </PageCard>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-lg [&_td]:!py-1.5 [&_td]:!px-2.5 [&_td]:!text-xs [&_th]:!py-1.5 [&_th]:!px-2.5 [&_th]:!text-xs [&_table]:!text-xs [&_.rounded-full]:!text-[10px] [&_.rounded-full]:!px-1.5 [&_.rounded-full]:!py-0">
              <GenericTable
                headers={headers}
                rows={tableRows.map((row, i) => ({ ...row, onRowClick: () => navigate(`/expense-management/expenses/reports/${displayedReports[i].reportId}`) }))}
                columns={columns}
              />
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination currentPage={currentPage} totalPages={totalPages} onPrevious={handlePreviousPage} onNext={handleNextPage} />
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Expense Report"
        subtitle="Modify the selected expense report's properties."
        size="lg"
        fullScreenMobile
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button type="submit" form="report-edit-form" variant="primary" loading={submitting} loadingText="Saving..." disabled={submitting} className="w-full sm:w-auto">
              Save Changes
            </Button>
          </div>
        }
      >
        <form id="report-edit-form" onSubmit={handleFormSubmit} className="py-2">
          <ReportFormFields
            formData={formData}
            formErrors={formErrors}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
            costCenterOptions={costCenterOptions}
            currencyOptions={currencyOptions}
            disabled={submitting}
          />
        </form>
      </Modal>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete Expense Report"
        message={`Are you sure you want to delete the expense report "${reportToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Report"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setReportToDelete(null);
        }}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
