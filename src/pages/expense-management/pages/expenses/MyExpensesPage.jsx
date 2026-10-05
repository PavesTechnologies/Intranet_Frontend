import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  FileStack,
  FilePlus2,
  Landmark,
  Layers,
  AlertCircle,
  X,
} from "lucide-react";

import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import StatusBadge from "@/components/status/statusbadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormSelect from "@/components/forms/FormSelect";
import Pagination from "@/components/Pagination/pagination";

import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";

import {
  expenseReportService,
  lookupService,
  REPORT_EDITABLE_STATUSES,
  REPORT_DELETABLE_STATUSES,
} from "@/pages/expense-management/api/expenseReportsApi";

import ReportFormFields, {
  validateBusinessPurpose,
} from "@/pages/expense-management/components/expense-reports/ReportFormFields";

const ITEMS_PER_PAGE = 10;

const formatDate = (value) => {
  if (!value) return "—";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "—";
  }

  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const formatAmount = (value) =>
  (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const breadcrumbs = [
  {
    label: "Expense Management",
    to: "/expense-management/dashboard",
  },
  {
    label: "Expenses",
    to: "/expense-management/expenses/my",
  },
  {
    label: "My Expenses",
  },
];

const emptyReportForm = {
  title: "",
  businessPurpose: "",
  costCenterId: "",
  currencyId: "",
};

export default function MyExpensesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /*
   * Cash Advance Stage 4 opens this page as:
   *
   * /expense-management/expenses/create?cashAdvanceId=<UUID>
   *
   * Preserve that ID throughout expense-report creation.
   */
  const cashAdvanceId = searchParams.get("cashAdvanceId") || "";

  const { hasRole } = useAuth();

  /*
   * Backend currently allows General/Admin-type users
   * to create expense reports.
   */
  const canManage = hasRole(["General"]);

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
  const [drawerMode, setDrawerMode] = useState("create");
  const [currentReport, setCurrentReport] = useState(null);

  const [formData, setFormData] = useState(emptyReportForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /*
   * Load Cost Centers and Currencies.
   */
  const fetchLookups = useCallback(async () => {
    try {
      const [costCenterList, currencyList] = await Promise.all([
        lookupService.getActiveCostCenters(),
        lookupService.getActiveCurrencies(),
      ]);

      setCostCenters(
        Array.isArray(costCenterList) ? costCenterList : []
      );

      setCurrencies(
        Array.isArray(currencyList) ? currencyList : []
      );
    } catch (err) {
      console.error("Failed to load lookups:", err);

      showStatusToast(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Failed to load Cost Centers and Currencies.",
        "error"
      );
    }
  }, []);

  /*
   * Load Expense Reports.
   */
  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);

      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm || undefined,
        status: statusFilter || undefined,
        sort: "createdAt,desc",
        sortBy: "createdAt",
        sortDirection: "desc",
      };

      const res = await expenseReportService.getAll(params);
      const payload = res.data?.data;

      if (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload)
      ) {
        const items =
          payload.reports ||
          payload.expenseReports ||
          payload.content ||
          payload.data ||
          [];

        const total =
          payload.total !== undefined
            ? payload.total
            : payload.totalElements ?? items.length ?? 0;

        const sortedItems = [...items].sort((a, b) => {
          const dateA = a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;

          const dateB = b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;

          return dateB - dateA;
        });

        setReports(sortedItems);
        setTotalItems(total);
        setIsServerPaginated(true);
      } else if (Array.isArray(payload)) {
        const sortedItems = [...payload].sort((a, b) => {
          const dateA = a.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;

          const dateB = b.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;

          return dateB - dateA;
        });

        setReports(sortedItems);
        setIsServerPaginated(false);
      } else {
        setReports([]);
        setTotalItems(0);
        setIsServerPaginated(false);
      }
    } catch (err) {
      console.error("Failed to fetch expense reports:", err);

      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Failed to fetch expense reports.";

      showStatusToast(errMsg, "error");

      setReports([]);
      setTotalItems(0);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  /*
   * Initial lookups.
   */
  useEffect(() => {
    fetchLookups();
  }, [fetchLookups]);

  /*
   * Load reports.
   */
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  /*
   * When Stage 4 opens this page with cashAdvanceId,
   * automatically open the Create Expense Report form.
   */
  useEffect(() => {
    if (!cashAdvanceId) {
      return;
    }

    if (!canManage) {
      showStatusToast(
        "You do not have permission to create an expense report.",
        "error"
      );
      return;
    }

    setDrawerMode("create");
    setCurrentReport(null);
    setFormData({
      ...emptyReportForm,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }, [cashAdvanceId, canManage]);

  const matchesFilters = useCallback(
    (r) => {
      const title = (r.title || "").toLowerCase();
      const number = (r.reportNumber || "").toLowerCase();
      const q = searchTerm.toLowerCase();

      const matchesSearch =
        !q || title.includes(q) || number.includes(q);

      const matchesStatus =
        !statusFilter ||
        (r.reportStatus || "").toUpperCase() === statusFilter;

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

  const totalCount = isServerPaginated
    ? totalItems
    : reports.filter(matchesFilters).length;

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 0;

  const allReportsForStats = isServerPaginated
    ? reports
    : reports.filter(matchesFilters);

  const totalReportsCount = isServerPaginated
    ? totalItems
    : reports.filter(matchesFilters).length;

  const draftCount = allReportsForStats.filter(
    (r) => (r.reportStatus || "").toUpperCase() === "DRAFT"
  ).length;

  const totalReimbursable = allReportsForStats.reduce(
    (sum, r) => sum + (Number(r.reimbursableAmount) || 0),
    0
  );

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
    setCurrentPage(1);
  }, []);

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handlePreviousPage = useCallback(
    () => setCurrentPage((p) => Math.max(p - 1, 1)),
    []
  );

  const handleNextPage = useCallback(
    () => setCurrentPage((p) => Math.min(p + 1, totalPages)),
    [totalPages]
  );
    const openCreateModal = () => {
    setDrawerMode("create");
    setCurrentReport(null);

    setFormData({
      ...emptyReportForm,
    });

    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (report) => {
    if (
      !REPORT_EDITABLE_STATUSES.includes(
        (report.reportStatus || "").toUpperCase()
      )
    ) {
      showStatusToast(
        "This expense report cannot be edited in its current status.",
        "error"
      );
      return;
    }

    setDrawerMode("edit");
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

  const closeModal = () => {
    if (submitting) return;

    setIsModalOpen(false);
    setCurrentReport(null);
    setFormErrors({});

    setFormData({
      ...emptyReportForm,
    });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setFormErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.title?.trim()) {
      errors.title = "Title is required.";
    }

    if (!formData.businessPurpose?.trim()) {
      errors.businessPurpose = "Business purpose is required.";
    } else {
      const purposeError = validateBusinessPurpose(
        formData.businessPurpose
      );

      if (purposeError) {
        errors.businessPurpose = purposeError;
      }
    }

    if (!formData.costCenterId) {
      errors.costCenterId = "Cost Center is required.";
    }

    if (!formData.currencyId) {
      errors.currencyId = "Currency is required.";
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      /*
       * Cash Advance integration:
       *
       * When the page was opened using:
       * ?cashAdvanceId=<UUID>
       *
       * send that ID along with the Expense Report request.
       */
      const payload = {
        title: formData.title.trim(),
        businessPurpose: formData.businessPurpose.trim(),
        costCenterId: formData.costCenterId,
        currencyId: formData.currencyId,
      };

      if (cashAdvanceId) {
        payload.cashAdvanceId = cashAdvanceId;
      }

      if (drawerMode === "edit" && currentReport?.id) {
        await expenseReportService.update(
          currentReport.id,
          payload
        );

        showStatusToast(
          "Expense report updated successfully.",
          "success"
        );
      } else {
        await expenseReportService.create(payload);

        showStatusToast(
          cashAdvanceId
            ? "Expense report created successfully with the Cash Advance."
            : "Expense report created successfully.",
          "success"
        );
      }

      closeModal();

      await fetchReports();
    } catch (err) {
      console.error("Failed to save expense report:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Failed to save expense report.";

      showStatusToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (report) => {
    const status = (report.reportStatus || "").toUpperCase();

    if (!REPORT_DELETABLE_STATUSES.includes(status)) {
      showStatusToast(
        "This expense report cannot be deleted in its current status.",
        "error"
      );
      return;
    }

    setReportToDelete(report);
    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete?.id) {
      return;
    }

    try {
      setDeleting(true);

      await expenseReportService.delete(reportToDelete.id);

      showStatusToast(
        "Expense report deleted successfully.",
        "success"
      );

      setIsConfirmOpen(false);
      setReportToDelete(null);

      /*
       * If the deleted report was the last item on the current page,
       * move back one page where appropriate.
       */
      if (
        displayedReports.length === 1 &&
        currentPage > 1
      ) {
        setCurrentPage((p) => p - 1);
      } else {
        await fetchReports();
      }
    } catch (err) {
      console.error("Failed to delete expense report:", err);

      const message =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Failed to delete expense report.";

      showStatusToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const closeDeleteModal = () => {
    if (deleting) return;

    setIsConfirmOpen(false);
    setReportToDelete(null);
  };

  const handleView = (report) => {
    if (!report?.id) return;

    navigate(
      `/expense-management/expenses/reports/${report.id}`
    );
  };

  const handleCreateExpense = (report) => {
    if (!report?.id) return;

    navigate(
      `/expense-management/expenses/create?reportId=${report.id}${
        cashAdvanceId
          ? `&cashAdvanceId=${cashAdvanceId}`
          : ""
      }`
    );
  };

  const getStatus = (report) =>
    (report?.reportStatus || "DRAFT").toUpperCase();

  const getStatusLabel = (status) => {
    switch (status) {
      case "DRAFT":
        return "Draft";

      case "SUBMITTED":
        return "Submitted";

      case "IN_REVIEW":
        return "In Review";

      case "APPROVED":
        return "Approved";

      case "REJECTED":
        return "Rejected";

      case "PAID":
        return "Paid";

      case "CANCELLED":
        return "Cancelled";

      default:
        return status || "—";
    }
  };

  const columns = [
    {
      header: "Report Number",
      accessor: "reportNumber",
      cell: (row) => (
        <span className="font-medium text-gray-900">
          {row.reportNumber || "—"}
        </span>
      ),
    },

    {
      header: "Title",
      accessor: "title",
      cell: (row) => (
        <span
          className="block max-w-[240px] truncate"
          title={row.title || ""}
        >
          {row.title || "—"}
        </span>
      ),
    },

    {
      header: "Business Purpose",
      accessor: "businessPurpose",
      cell: (row) => (
        <span
          className="block max-w-[280px] truncate"
          title={row.businessPurpose || ""}
        >
          {row.businessPurpose || "—"}
        </span>
      ),
    },

    {
      header: "Cost Center",
      accessor: "costCenter",
      cell: (row) =>
        row.costCenterName ||
        row.costCenter?.name ||
        row.costCenter?.code ||
        "—",
    },

    {
      header: "Currency",
      accessor: "currency",
      cell: (row) =>
        row.currencyCode ||
        row.currency?.code ||
        "—",
    },

    {
      header: "Amount",
      accessor: "reimbursableAmount",
      cell: (row) => (
        <span className="font-medium">
          {formatAmount(row.reimbursableAmount)}
        </span>
      ),
    },

    {
      header: "Created Date",
      accessor: "createdAt",
      cell: (row) => formatDate(row.createdAt),
    },

    {
      header: "Status",
      accessor: "reportStatus",
      cell: (row) => (
        <StatusBadge status={getStatus(row)}>
          {getStatusLabel(getStatus(row))}
        </StatusBadge>
      ),
    },

    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => {
        const status = getStatus(row);

        const canEdit =
          canManage &&
          REPORT_EDITABLE_STATUSES.includes(status);

        const canDelete =
          canManage &&
          REPORT_DELETABLE_STATUSES.includes(status);

        return (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleView(row)}
              className="rounded p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              title="View"
            >
              <Eye size={17} />
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => openEditModal(row)}
                className="rounded p-1.5 text-blue-600 hover:bg-blue-50"
                title="Edit"
              >
                <Pencil size={17} />
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={() => handleDeleteClick(row)}
                className="rounded p-1.5 text-red-600 hover:bg-red-50"
                title="Delete"
              >
                <Trash2 size={17} />
              </button>
            )}

            {status === "DRAFT" && canManage && (
              <button
                type="button"
                onClick={() => handleCreateExpense(row)}
                className="rounded p-1.5 text-green-600 hover:bg-green-50"
                title="Add Expense"
              >
                <FilePlus2 size={17} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  const statusOptions = [
    {
      label: "All Statuses",
      value: "",
    },
    {
      label: "Draft",
      value: "DRAFT",
    },
    {
      label: "Submitted",
      value: "SUBMITTED",
    },
    {
      label: "In Review",
      value: "IN_REVIEW",
    },
    {
      label: "Approved",
      value: "APPROVED",
    },
    {
      label: "Rejected",
      value: "REJECTED",
    },
    {
      label: "Paid",
      value: "PAID",
    },
  ];

  const costCenterOptions = costCenters.map((item) => ({
    label:
      item.name && item.code
        ? `${item.code} - ${item.name}`
        : item.name || item.code || String(item.id),
    value: item.id,
  }));

  const currencyOptions = currencies.map((item) => ({
    label:
      item.name && item.code
        ? `${item.code} - ${item.name}`
        : item.code || item.name || String(item.id),
    value: item.id,
  }));
    return (
    <>
      <div className="w-full">
        <Breadcrumb items={breadcrumbs} />

        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              My Expenses
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your expense reports and expenses.
            </p>
          </div>

          {canManage && (
            <Button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Create Expense Report
            </Button>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <PageCard>
            <PageCardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Total Reports
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {totalReportsCount}
                  </p>
                </div>

                <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                  <FileStack size={22} />
                </div>
              </div>
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Draft Reports
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {draftCount}
                  </p>
                </div>

                <div className="rounded-lg bg-yellow-50 p-3 text-yellow-600">
                  <FilePlus2 size={22} />
                </div>
              </div>
            </PageCardContent>
          </PageCard>

          <PageCard>
            <PageCardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    Reimbursable Amount
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-gray-900">
                    {formatAmount(totalReimbursable)}
                  </p>
                </div>

                <div className="rounded-lg bg-green-50 p-3 text-green-600">
                  <Landmark size={22} />
                </div>
              </div>
            </PageCardContent>
          </PageCard>
        </div>

        {/* Main Card */}
        <PageCard>
          <PageCardContent className="p-5">
            {/* Filters */}
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="w-full lg:max-w-md">
                <SearchInput
                  value={searchTerm}
                  onChange={handleSearch}
                  placeholder="Search by report number or title..."
                />
              </div>

              <div className="w-full lg:w-56">
                <FormSelect
                  name="status"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  options={statusOptions}
                  placeholder="Filter by status"
                />
              </div>
            </div>

            {/* Error State */}
            {loadError && !loading && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                <AlertCircle
                  size={20}
                  className="mt-0.5 flex-shrink-0"
                />

                <div>
                  <p className="font-medium">
                    Unable to load expense reports
                  </p>

                  <p className="mt-1 text-sm">
                    Please try again.
                  </p>

                  <button
                    type="button"
                    onClick={fetchReports}
                    className="mt-2 text-sm font-medium underline"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {/* Table */}
                <div className="overflow-x-auto">
                  <GenericTable
                    columns={columns}
                    data={displayedReports}
                    emptyMessage={
                      searchTerm || statusFilter
                        ? "No expense reports match your filters."
                        : "No expense reports found."
                    }
                  />
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-5 flex items-center justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPrevious={handlePreviousPage}
                      onNext={handleNextPage}
                    />
                  </div>
                )}
              </>
            )}
          </PageCardContent>
        </PageCard>
      </div>

      {/* ============================================================
          CREATE / EDIT EXPENSE REPORT MODAL
         ============================================================ */}

      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {drawerMode === "edit"
                      ? "Edit Expense Report"
                      : "Create Expense Report"}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {drawerMode === "edit"
                      ? "Update the expense report details."
                      : "Enter the details to create a new expense report."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleSubmit}>
                <div className="space-y-5 px-6 py-6">
                  {cashAdvanceId && drawerMode === "create" && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <div className="flex items-start gap-3">
                        <Landmark
                          size={20}
                          className="mt-0.5 flex-shrink-0 text-blue-600"
                        />

                        <div>
                          <p className="font-medium text-blue-900">
                            Cash Advance linked
                          </p>

                          <p className="mt-1 text-sm text-blue-700">
                            This expense report will be associated
                            with the selected Cash Advance.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <ReportFormFields
                    formData={formData}
                    errors={formErrors}
                    onChange={handleFormChange}
                    costCenterOptions={costCenterOptions}
                    currencyOptions={currencyOptions}
                  />
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeModal}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <LoadingSpinner />
                        Saving...
                      </>
                    ) : (
                      <>
                        {drawerMode === "edit"
                          ? "Update Report"
                          : "Create Report"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ============================================================
          DELETE CONFIRMATION MODAL
         ============================================================ */}

      {isConfirmOpen &&
        createPortal(
          <ConfirmationModal
            isOpen={isConfirmOpen}
            onClose={closeDeleteModal}
            onConfirm={handleDeleteConfirm}
            title="Delete Expense Report"
            message={
              reportToDelete
                ? `Are you sure you want to delete expense report ${
                    reportToDelete.reportNumber ||
                    reportToDelete.title ||
                    ""
                  }? This action cannot be undone.`
                : "Are you sure you want to delete this expense report?"
            }
            confirmText={deleting ? "Deleting..." : "Delete"}
            cancelText="Cancel"
            loading={deleting}
          />,
          document.body
        )}
    </>
  );
}