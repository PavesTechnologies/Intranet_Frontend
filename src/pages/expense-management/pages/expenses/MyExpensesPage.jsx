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
import Pagination from "@/components/Pagination/pagination";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import StatusBadge from "@/components/status/statusbadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormSelect from "@/components/forms/FormSelect";

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

      setCostCenters(Array.isArray(costCenterList) ? costCenterList : []);

      setCurrencies(Array.isArray(currencyList) ? currencyList : []);
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

      if (payload && typeof payload === "object" && !Array.isArray(payload)) {
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
   * IMPORTANT:
   *
   * When Stage 4 opens this page with cashAdvanceId,
   * automatically open the Create Expense Report form.
   *
   * This prevents the user from having to click another
   * Create button manually.
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

  /*
   * Search/filter helper.
   */
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

  /*
   * Normal text input.
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  /*
   * Custom select handler.
   */
  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  /*
   * Validate form.
   */
  const validateForm = () => {
    const errors = {};

    if (!formData.title.trim()) {
      errors.title = "Report title is required.";
    } else if (formData.title.trim().length < 3) {
      errors.title = "Title must be at least 3 characters.";
    }

    if (!formData.costCenterId) {
      errors.costCenterId = "Cost center is required.";
    }

    if (!formData.currencyId) {
      errors.currencyId = "Report currency is required.";
    }

    const businessPurposeError = validateBusinessPurpose(
      formData.businessPurpose
    );

    if (businessPurposeError) {
      errors.businessPurpose = businessPurposeError;
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  };

  /*
   * Manual Create Expense Report button.
   */
  const handleCreateClick = () => {
    setDrawerMode("create");

    setCurrentReport(null);

    setFormData({
      ...emptyReportForm,
    });

    setFormErrors({});

    setIsModalOpen(true);
  };

  /*
   * Edit existing report.
   */
  const handleEditClick = (report) => {
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

  /*
   * CREATE / UPDATE EXPENSE REPORT
   *
   * IMPORTANT FIXES:
   *
   * 1. cashAdvanceId is included when the page was opened
   *    from Cash Advance Stage 4.
   *
   * 2. We no longer rely on the custom Button's HTML
   *    "form" attribute.
   *
   * 3. The footer button directly calls handleFormSubmit.
   */
  const handleFormSubmit = async (e) => {
    if (e) {
      e.preventDefault();

      if (e.stopPropagation) {
        e.stopPropagation();
      }
    }

    if (submitting) {
      return;
    }

    const isValid = validateForm();

    if (!isValid) {
      showStatusToast(
        "Please complete all required expense report fields.",
        "error"
      );

      return;
    }

    const payload = {
      title: formData.title.trim(),

      businessPurpose: formData.businessPurpose
        ? formData.businessPurpose.trim()
        : "",

      costCenterId: formData.costCenterId,

      currencyId: formData.currencyId,

      /*
       * This is the critical Cash Advance link.
       *
       * For normal expense reports this is null/omitted.
       *
       * For Cash Advance Stage 4:
       * ?cashAdvanceId=<UUID>
       *
       * this value is sent to backend.
       */
      ...(cashAdvanceId
        ? {
            cashAdvanceId: cashAdvanceId,
          }
        : {}),
    };

    console.log(
      "Creating/updating expense report payload:",
      payload
    );

    try {
      setSubmitting(true);

      if (drawerMode === "create") {
        const res = await expenseReportService.create(payload);

        showStatusToast(
          cashAdvanceId
            ? "Expense report linked to the Cash Advance successfully!"
            : "Expense report details saved successfully!",
          "success"
        );

        setIsModalOpen(false);

        const newReportId =
          res.data?.data?.reportId ||
          res.data?.reportId ||
          res.data?.data?.id ||
          res.data?.id;

        if (newReportId) {
          /*
           * After creating the report, go directly to the
           * report details page where individual expense
           * lines and receipts can be added.
           */
          navigate(
            `/expense-management/expenses/reports/${newReportId}`
          );
        } else {
          showStatusToast(
            "Expense report was created but the report ID was not returned.",
            "error"
          );
        }
      } else {
        await expenseReportService.update(
          currentReport.reportId,
          payload
        );

        showStatusToast(
          "Expense report updated successfully!",
          "success"
        );

        setIsModalOpen(false);

        fetchReports();
      }
    } catch (err) {
      console.error(
        `Error ${
          drawerMode === "create" ? "creating" : "updating"
        } expense report:`,
        err
      );

      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        err.message ||
        `Failed to ${
          drawerMode === "create" ? "create" : "update"
        } expense report.`;

      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  /*
   * Delete.
   */
  const handleDeleteClick = (report) => {
    setReportToDelete(report);

    setIsConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!reportToDelete) {
      return;
    }

    try {
      setDeleting(true);

      await expenseReportService.delete(
        reportToDelete.reportId
      );

      showStatusToast(
        "Expense report deleted successfully!",
        "success"
      );

      setIsConfirmOpen(false);

      setReportToDelete(null);

      if (displayedReports.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        fetchReports();
      }
    } catch (err) {
      console.error(
        "Error deleting expense report:",
        err
      );

      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        "Failed to delete expense report.";

      showStatusToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };

  /*
   * Cost Center options.
   */
  const costCenterOptions = costCenters.map((c) => ({
    value: c.costCenterId,
    label: `${c.costCenterCode} - ${c.costCenterName}`,
  }));

  /*
   * Currency options.
   */
  const currencyOptions = currencies.map((c) => ({
    value: c.currencyId,
    label: `${c.currencyCode} - ${c.currencyName}`,
  }));

  const headers = [
    "S.No",
    "Report #",
    "Title",
    "Cost Center",
    "Currency",
    "Total Amount",
    "Status",
    "Created",
    "Actions",
  ];

  const columns = [
    "serial_no",
    "reportNumber",
    "title",
    "costCenter",
    "currency",
    "totalAmount",
    "status",
    "created",
    "actions",
  ];

  /*
   * Table rows.
   */
  const tableRows = displayedReports.map((r, index) => ({
    serial_no: (
      <span className="text-xs">
        {(
          (currentPage - 1) * ITEMS_PER_PAGE +
          index +
          1
        ).toString()}
      </span>
    ),

    reportNumber: (
      <span className="font-mono text-[11px] font-semibold text-gray-700">
        {r.reportNumber || "—"}
      </span>
    ),

    title: (
      <span className="font-medium text-xs text-gray-900">
        {r.title || "Untitled Report"}
      </span>
    ),

    costCenter: (
      <span className="text-xs">
        {r.costCenterName || "—"}
      </span>
    ),

    currency: (
      <span className="font-semibold text-xs text-gray-600">
        {r.currencyCode || "—"}
      </span>
    ),

    totalAmount: (
      <span className="font-mono font-semibold text-xs text-gray-900">
        {formatAmount(r.totalAmount)}
      </span>
    ),

    status: (
      <StatusBadge
        label={r.reportStatus || "DRAFT"}
        size="sm"
      />
    ),

    created: (
      <span className="text-xs">
        {formatDate(r.createdAt)}
      </span>
    ),

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

            navigate(
              `/expense-management/expenses/reports/${r.reportId}`
            );
          }}
        >
          <Eye size={14} />
        </Button>

        {canManage &&
          REPORT_EDITABLE_STATUSES.includes(
            r.reportStatus
          ) && (
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
          )}

        {canManage &&
          REPORT_DELETABLE_STATUSES.includes(
            r.reportStatus
          ) && (
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
          )}
      </div>
    ),
  }));

  const statusFilterOptions = [
    {
      label: "All Statuses",
      value: "",
    },
    {
      label: "Draft",
      value: "DRAFT",
    },
    {
      label: "Pending Approval",
      value: "PENDING_APPROVAL",
    },
    {
      label: "Pending Finance Verification",
      value: "PENDING_FINANCE_VERIFICATION",
    },
    {
      label: "Awaiting Correction",
      value: "AWAITING_CORRECTION",
    },
    {
      label: "Query Raised",
      value: "QUERY_RAISED",
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
      label: "Cancelled",
      value: "CANCELLED",
    },
    {
      label: "Policy Rejected",
      value: "POLICY_REJECTED",
    },
    {
      label: "Reimbursed",
      value: "REIMBURSED",
    },
    {
      label: "Closed",
      value: "CLOSED",
    },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb items={breadcrumbs} />

      {/* Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-[#0a174e]">
            My Expense Reports
          </h1>

          <p className="text-xs text-gray-500 mt-0.5">
            Track and manage the expense reports you've created.
          </p>
        </div>

        {canManage && (
          <Button
            type="button"
            onClick={handleCreateClick}
            variant="primary"
            size="small"
            className="w-full whitespace-nowrap sm:w-auto shadow-sm !py-1.5 !text-xs"
          >
            <Plus size={14} />

            Create Expense Report
          </Button>
        )}
      </div>

      {/* Cash Advance indicator */}
      {cashAdvanceId && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
          <p className="text-xs font-semibold text-indigo-900">
            Cash Advance Expense Submission
          </p>

          <p className="text-xs text-indigo-700 mt-1">
            This expense report is being created for Cash
            Advance:
          </p>

          <p className="text-xs font-mono font-semibold text-indigo-900 mt-1 break-all">
            {cashAdvanceId}
          </p>

          <p className="text-[11px] text-indigo-600 mt-1">
            Add the actual expenses and upload their receipts
            after creating this report.
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <FileStack size={18} />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Reports
            </p>

            <p className="text-xl font-bold text-gray-900 mt-0.5">
              {totalReportsCount}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <FilePlus2 size={18} />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Draft Reports
            </p>

            <p className="text-xl font-bold text-amber-600 mt-0.5">
              {draftCount}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-lg">
            <Landmark size={18} />
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Total Reimbursable
            </p>

            <p className="text-xl font-bold text-green-600 mt-0.5">
              {formatAmount(totalReimbursable)}
            </p>
          </div>
        </div>
      </div>

      {/* Search/filter */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search
            </label>

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

      {/* Reports table */}
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading Expense Reports..." />
          </div>
        ) : loadError ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <AlertCircle className="h-10 w-10 text-red-300 mb-3" />

              <h2 className="text-sm font-semibold text-gray-700">
                Failed to load Expense Reports
              </h2>

              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Something went wrong while fetching data.
                Please try again.
              </p>

              <Button
                variant="outline"
                size="small"
                className="mt-4"
                onClick={fetchReports}
              >
                Retry
              </Button>
            </PageCardContent>
          </PageCard>
        ) : displayedReports.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Layers className="h-10 w-10 text-gray-300 mb-3" />

              <h2 className="text-sm font-semibold text-gray-700">
                No Expense Reports Found
              </h2>

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
                rows={tableRows.map((row, i) => ({
                  ...row,
                  onRowClick: () =>
                    navigate(
                      `/expense-management/expenses/reports/${displayedReports[i].reportId}`
                    ),
                }))}
                columns={columns}
              />
            </div>

            {totalPages > 1 && (
              <div className="mt-4 flex justify-center">
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
      </div>

      {/* CREATE / EDIT DRAWER */}
      {isModalOpen &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] animate-in fade-in duration-200"
              onClick={() => {
                if (!submitting) {
                  setIsModalOpen(false);
                }
              }}
            />

            {/* Drawer */}
            <div
              className="fixed inset-y-0 right-0 z-[10000] w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {drawerMode === "create"
                      ? "Create Expense Report"
                      : "Edit Expense Report"}
                  </h2>

                  <p className="text-xs text-gray-500 font-medium mt-0.5">
                    {drawerMode === "create"
                      ? "Start a new expense report, then add individual line items with receipts."
                      : "Modify the selected expense report's properties."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!submitting) {
                      setIsModalOpen(false);
                    }
                  }}
                  disabled={submitting}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition disabled:opacity-50"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <form
                  id="report-edit-form"
                  onSubmit={handleFormSubmit}
                  className="py-2"
                >
                  <ReportFormFields
                    formData={formData}
                    formErrors={formErrors}
                    onInputChange={handleInputChange}
                    onSelectChange={handleSelectChange}
                    costCenterOptions={costCenterOptions}
                    currencyOptions={currencyOptions}
                    disabled={submitting}
                  />

                  {/* Cash Advance information */}
                  {cashAdvanceId && drawerMode === "create" && (
                    <div className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                      <p className="text-xs font-semibold text-indigo-900">
                        Linked Cash Advance
                      </p>

                      <p className="text-[11px] text-indigo-700 mt-1">
                        This expense report will be linked to
                        the disbursed Cash Advance selected in
                        Stage 4.
                      </p>

                      <p className="text-[11px] font-mono font-semibold text-indigo-900 mt-1 break-all">
                        {cashAdvanceId}
                      </p>
                    </div>
                  )}
                </form>
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!submitting) {
                      setIsModalOpen(false);
                    }
                  }}
                  disabled={submitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>

                {/*
                 * IMPORTANT:
                 *
                 * Do NOT use:
                 *
                 * type="submit"
                 * form="report-edit-form"
                 *
                 * here.
                 *
                 * We directly call handleFormSubmit so the custom
                 * Button component cannot interfere with submission.
                 */}
                <Button
                  type="button"
                  variant="primary"
                  loading={submitting}
                  loadingText="Saving..."
                  disabled={submitting}
                  onClick={handleFormSubmit}
                  className="w-full sm:w-auto"
                >
                  {drawerMode === "create"
                    ? "Create Expense Report"
                    : "Save Changes"}
                </Button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Delete confirmation */}
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