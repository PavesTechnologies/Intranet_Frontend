
import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Wallet,
  PiggyBank,
  TrendingDown,
  Layers,
  Briefcase,
  Calendar,
  AlertCircle,
} from "lucide-react";
import Select from "react-select";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Pagination from "@/components/Pagination/pagination";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import Modal from "@/components/Modal/modal";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormInput from "@/components/forms/FormInput";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import api from "@/api/axiosInstance";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";
const EMPLOYEE_ONBOARDING_URL = window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL || "";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const budgetService = {
  getAll: (params) => {
    return api.get("/xms/admin/cost-center-budgets", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    });
  },
  getById: (id) => {
    return api.get(`/xms/admin/cost-center-budgets/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
  },
  create: (payload) => {
    return api.post("/xms/admin/cost-center-budgets", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
  },
  update: (id, payload) => {
    return api.put(`/xms/admin/cost-center-budgets/${id}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
  },
  delete: (id) => {
    return api.delete(`/xms/admin/cost-center-budgets/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
  },
};

const costCenterService = {
  getAll: (params) => {
    return api.get("/xms/admin/cost-centers", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    });
  },
};

const departmentService = {
  getAll: () => {
    return api.get(`${EMPLOYEE_ONBOARDING_URL}/masters/departments/`, {
      headers: authHeaders(),
    });
  },
};

const ITEMS_PER_PAGE = 10;
const STATS_LIMIT = 1000;

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(59, 130, 246, 0.5)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    padding: "0.125rem 0.25rem",
    minHeight: "42px",
    backgroundColor: "#ffffff",
    "&:hover": {
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
    },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 9999,
  }),
};

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return typeof value === "string" ? value : "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
};

const formatAmount = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
};

const DetailRow = ({ icon, label, value, breakAll = false }) => (
  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
    <div className="mt-0.5 shrink-0 text-blue-700">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-sm font-medium text-gray-800 ${breakAll ? "break-all" : "break-words"}`}>
        {value ?? "N/A"}
      </p>
    </div>
  </div>
);

const UtilizationBar = ({ percent }) => {
  const clamped = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const barColor = clamped >= 90 ? "bg-red-500" : clamped >= 70 ? "bg-yellow-500" : "bg-green-500";
  const textColor = clamped >= 90 ? "text-red-600" : clamped >= 70 ? "text-yellow-600" : "text-green-600";

  return (
    <div className="flex items-center gap-2 w-full max-w-[150px] mx-auto">
      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-9 text-right ${textColor}`}>{clamped}%</span>
    </div>
  );
};

export default function CostCenterBudgetPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["Admin", "Super_Admin"]);

  const [budgets, setBudgets] = useState([]);
  const [allBudgets, setAllBudgets] = useState([]);
  const [isServerPaginated, setIsServerPaginated] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [statsBudgets, setStatsBudgets] = useState([]);

  const [costCenters, setCostCenters] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [fiscalYearFilter, setFiscalYearFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [availableBudgetTouched, setAvailableBudgetTouched] = useState(false);
  const [formData, setFormData] = useState({
    costCenterId: "",
    fiscalYear: "",
    budgetAmount: "",
    availableBudget: "",
  });
  const [formErrors, setFormErrors] = useState({});

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewBudget, setViewBudget] = useState(null);

  const getCostCenterList = useCallback(() => {
    if (Array.isArray(costCenters)) return costCenters;
    if (costCenters && typeof costCenters === "object") {
      return costCenters.costCenters || costCenters.content || costCenters.data || [];
    }
    return [];
  }, [costCenters]);

  const getDepartmentList = useCallback(() => {
    if (Array.isArray(departments)) return departments;
    if (departments && typeof departments === "object") return departments.content || departments.data || [];
    return [];
  }, [departments]);

  const resolveDepartmentName = useCallback(
    (departmentUuid) => {
      const dept = getDepartmentList().find((d) => d.department_uuid === departmentUuid);
      return dept?.department_name || "—";
    },
    [getDepartmentList]
  );

  const resolveCostCenter = useCallback(
    (costCenterId) => getCostCenterList().find((cc) => cc.costCenterId === costCenterId),
    [getCostCenterList]
  );

  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const fetchCostCenters = async () => {
    try {
      const res = await costCenterService.getAll({ page: 1, limit: STATS_LIMIT });
      const items = Array.isArray(res.data)
        ? res.data
        : res.data?.costCenters || res.data?.content || res.data?.data || [];
      setCostCenters(items || []);
    } catch (err) {
      console.error("Failed to fetch cost centers:", err);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const res = await budgetService.getAll({ page: 1, limit: STATS_LIMIT });
      const items = Array.isArray(res.data)
        ? res.data
        : res.data?.budgets || res.data?.content || res.data?.data || [];
      setStatsBudgets(items || []);
    } catch (err) {
      console.error("Failed to fetch cost center budget stats:", err);
    }
  }, []);

  const fetchBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm,
        department: departmentFilter || undefined,
        fiscalYear: fiscalYearFilter || undefined,
      };

      const res = await budgetService.getAll(params);

      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        const items = res.data.budgets || res.data.content || res.data.data || [];
        const total = res.data.total !== undefined ? res.data.total : res.data.totalElements ?? items.length ?? 0;
        setBudgets(items);
        setTotalItems(total);
        setIsServerPaginated(true);
      } else if (Array.isArray(res.data)) {
        setAllBudgets(res.data);
        setIsServerPaginated(false);
      } else {
        setBudgets([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch Cost Center Budgets:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch Cost Center Budgets.";
      showStatusToast(errMsg, "error");
      setBudgets([]);
      setTotalItems(0);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, departmentFilter, fiscalYearFilter]);

  useEffect(() => {
    fetchDepartments();
    fetchCostCenters();
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const matchesFilters = useCallback(
    (b) => {
      const cc = resolveCostCenter(b.costCenterId);
      const code = (cc?.costCenterCode || "").toLowerCase();
      const name = (cc?.costCenterName || "").toLowerCase();
      const fiscalYear = (b.fiscalYear || "").toLowerCase();
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q || code.includes(q) || name.includes(q) || fiscalYear.includes(q);
      const matchesDept = !departmentFilter || cc?.departmentUuid === departmentFilter;
      const matchesFiscalYear = !fiscalYearFilter || b.fiscalYear === fiscalYearFilter;
      return matchesSearch && matchesDept && matchesFiscalYear;
    },
    [searchTerm, departmentFilter, fiscalYearFilter, resolveCostCenter]
  );

  const displayedBudgets = isServerPaginated
    ? budgets
    : (() => {
        const filtered = allBudgets.filter(matchesFilters);
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const totalCount = isServerPaginated ? totalItems : allBudgets.filter(matchesFilters).length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 0;

  const getConsumed = (b) => {
    if (b.consumedBudget !== undefined && b.consumedBudget !== null) return Number(b.consumedBudget);
    return Number(b.budgetAmount || 0) - Number(b.availableBudget || 0);
  };

  const totalBudgetsCount = statsBudgets.length;
  const totalAllocatedBudget = statsBudgets.reduce((sum, b) => sum + Number(b.budgetAmount || 0), 0);
  const totalAvailableBudget = statsBudgets.reduce((sum, b) => sum + Number(b.availableBudget || 0), 0);
  const totalConsumedBudget = statsBudgets.reduce((sum, b) => sum + getConsumed(b), 0);

  const fiscalYearOptions = Array.from(new Set(statsBudgets.map((b) => b.fiscalYear).filter(Boolean))).sort();

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
    setCurrentPage(1);
  }, []);

  const handleDepartmentFilterChange = (e) => {
    setDepartmentFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleFiscalYearFilterChange = (e) => {
    setFiscalYearFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("");
    setFiscalYearFilter("");
    setCurrentPage(1);
  };

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBudgetAmountChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => {
      const next = { ...prev, budgetAmount: value };
      if (!currentBudget && !availableBudgetTouched) {
        next.availableBudget = value;
      }
      return next;
    });
    if (formErrors.budgetAmount) {
      setFormErrors((prev) => ({ ...prev, budgetAmount: "" }));
    }
  };

  const handleAvailableBudgetChange = (e) => {
    setAvailableBudgetTouched(true);
    handleInputChange(e);
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.costCenterId) {
      errors.costCenterId = "Cost center is required.";
    }

    if (!formData.fiscalYear.trim()) {
      errors.fiscalYear = "Fiscal year is required.";
    } else if (!/^\d{4}-\d{4}$/.test(formData.fiscalYear.trim())) {
      errors.fiscalYear = "Use the format YYYY-YYYY, e.g. 2026-2027.";
    } else {
      const [start, end] = formData.fiscalYear.trim().split("-").map(Number);
      if (end !== start + 1) {
        errors.fiscalYear = "Fiscal year must span two consecutive years, e.g. 2026-2027.";
      }
    }

    const budgetAmount = Number(formData.budgetAmount);
    if (formData.budgetAmount === "" || Number.isNaN(budgetAmount) || budgetAmount <= 0) {
      errors.budgetAmount = "Budget amount must be greater than 0.";
    }

    const availableBudget = Number(formData.availableBudget);
    if (formData.availableBudget === "" || Number.isNaN(availableBudget) || availableBudget < 0) {
      errors.availableBudget = "Available budget must be 0 or greater.";
    } else if (!Number.isNaN(budgetAmount) && availableBudget > budgetAmount) {
      errors.availableBudget = "Available budget cannot exceed the budget amount.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    if (!isAdmin) return;
    setCurrentBudget(null);
    setAvailableBudgetTouched(false);
    setFormData({ costCenterId: "", fiscalYear: "", budgetAmount: "", availableBudget: "" });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditClick = (b) => {
    if (!isAdmin) return;
    setCurrentBudget(b);
    setAvailableBudgetTouched(true);
    setFormData({
      costCenterId: b.costCenterId || "",
      fiscalYear: b.fiscalYear || "",
      budgetAmount: b.budgetAmount != null ? String(b.budgetAmount) : "",
      availableBudget: b.availableBudget != null ? String(b.availableBudget) : "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleViewClick = (b) => {
    setViewBudget(b);
    setIsViewOpen(true);
  };

  const handleDeleteClick = (b) => {
    if (!isAdmin) return;
    setBudgetToDelete(b);
    setIsConfirmOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      costCenterId: formData.costCenterId,
      fiscalYear: formData.fiscalYear.trim(),
      budgetAmount: Number(formData.budgetAmount),
      availableBudget: Number(formData.availableBudget),
    };

    try {
      setSubmitting(true);
      if (currentBudget) {
        await budgetService.update(currentBudget.budgetId, payload);
        showStatusToast("Cost Center Budget updated successfully!", "success");
      } else {
        await budgetService.create(payload);
        showStatusToast("Cost Center Budget created successfully!", "success");
        setCurrentPage(1);
      }

      setIsModalOpen(false);
      fetchBudgets();
      fetchStats();
    } catch (err) {
      console.error("Error saving Cost Center Budget:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save Cost Center Budget.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!budgetToDelete) return;

    try {
      setSubmitting(true);
      await budgetService.delete(budgetToDelete.budgetId);
      showStatusToast("Cost Center Budget deleted successfully!", "success");

      setIsConfirmOpen(false);
      setBudgetToDelete(null);

      if (displayedBudgets.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchBudgets();
      }
      fetchStats();
    } catch (err) {
      console.error("Error deleting Cost Center Budget:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete Cost Center Budget.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Masters", to: "/expense-management/masters/expense-categories" },
    { label: "Cost Center Budgets" },
  ];

  const headers = [
    "S.No",
    "Cost Center",
    "Department",
    "Fiscal Year",
    "Budget Amount",
    "Available Budget",
    "Consumed Budget",
    "Utilization",
    "Created Date",
    "Actions",
  ];
  const columns = [
    "serial_no",
    "costCenter",
    "department",
    "fiscalYear",
    "budgetAmount",
    "availableBudget",
    "consumedBudget",
    "utilization",
    "createdDate",
    "actions",
  ];

  const tableRows = displayedBudgets.map((b, index) => {
    const cc = resolveCostCenter(b.costCenterId);
    const consumed = getConsumed(b);
    const utilizationPercent = Number(b.budgetAmount) > 0 ? (consumed / Number(b.budgetAmount)) * 100 : 0;

    return {
      serial_no: ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
      costCenter: cc ? `${cc.costCenterCode} - ${cc.costCenterName}` : b.costCenterId || "N/A",
      department: cc ? resolveDepartmentName(cc.departmentUuid) : "—",
      fiscalYear: b.fiscalYear || "N/A",
      budgetAmount: formatAmount(b.budgetAmount),
      availableBudget: formatAmount(b.availableBudget),
      consumedBudget: formatAmount(consumed),
      utilization: <UtilizationBar percent={utilizationPercent} />,
      createdDate: formatDate(b.createdDate || b.createdAt),
      actions: (
        <div className="flex items-center gap-1 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="View Budget"
            aria-label="View Budget"
            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition rounded-md"
            onClick={() => handleViewClick(b)}
          >
            <Eye size={16} />
          </Button>

          {isAdmin && (
            <>
              <Button
                type="button"
                variant="link"
                size="icon"
                title="Edit Budget"
                aria-label="Edit Budget"
                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
                onClick={() => handleEditClick(b)}
              >
                <Pencil size={16} />
              </Button>

              <Button
                type="button"
                variant="link"
                size="icon"
                title="Delete Budget"
                aria-label="Delete Budget"
                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
                onClick={() => handleDeleteClick(b)}
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      ),
    };
  });

  const costCenterOptions = getCostCenterList().map((cc) => ({
    value: cc.costCenterId,
    label: `${cc.costCenterCode} - ${cc.costCenterName} (${resolveDepartmentName(cc.departmentUuid)})`,
  }));
  const selectedCostCenterOption = costCenterOptions.find((o) => o.value === formData.costCenterId) || null;
  const selectedCostCenterForForm = resolveCostCenter(formData.costCenterId);

  const departmentFilterOptions = [
    { label: "All Departments", value: "" },
    ...getDepartmentList().map((d) => ({ value: d.department_uuid, label: d.department_name })),
  ];
  const fiscalYearFilterOptions = [
    { label: "All Fiscal Years", value: "" },
    ...fiscalYearOptions.map((fy) => ({ label: fy, value: fy })),
  ];

  const viewCostCenter = viewBudget ? resolveCostCenter(viewBudget.costCenterId) : null;
  const viewConsumed = viewBudget ? getConsumed(viewBudget) : 0;

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">Cost Center Budget Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Allocate and track budgets against cost centers across fiscal years.
          </p>
        </div>

        {isAdmin && (
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <Button
              onClick={openCreateModal}
              variant="primary"
              size="medium"
              className="w-full whitespace-nowrap sm:w-auto shadow-sm"
            >
              <Plus size={16} />
              Create Budget
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Layers size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Budgets</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalBudgetsCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Wallet size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Allocated Budget</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{formatAmount(totalAllocatedBudget)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <PiggyBank size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Available Budget</p>
            <p className="text-2xl font-bold text-green-600 mt-1 truncate">{formatAmount(totalAvailableBudget)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <TrendingDown size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Consumed Budget</p>
            <p className="text-2xl font-bold text-red-500 mt-1 truncate">{formatAmount(totalConsumedBudget)}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <SearchInput
              value={searchTerm}
              onSearch={handleSearch}
              placeholder="Search by fiscal year or cost center..."
            />
          </div>

          <FormSelect
            label="Department"
            name="departmentFilter"
            value={departmentFilter}
            onChange={handleDepartmentFilterChange}
            options={departmentFilterOptions}
          />

          <FormSelect
            label="Fiscal Year"
            name="fiscalYearFilter"
            value={fiscalYearFilter}
            onChange={handleFiscalYearFilterChange}
            options={fiscalYearFilterOptions}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <Button type="button" variant="outline" size="small" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Data Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading Cost Center Budgets..." />
          </div>
        ) : loadError ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">Failed to load Cost Center Budgets</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                Something went wrong while fetching data. Please try again.
              </p>
              <Button variant="outline" size="small" className="mt-4" onClick={fetchBudgets}>
                Retry
              </Button>
            </PageCardContent>
          </PageCard>
        ) : displayedBudgets.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Wallet className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No Cost Center Budgets Found</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                {searchTerm || departmentFilter || fiscalYearFilter
                  ? "No budgets match the selected search and filters."
                  : "Start by allocating a new budget to a cost center."}
              </p>
            </PageCardContent>
          </PageCard>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable headers={headers} rows={tableRows} columns={columns} />
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

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentBudget ? "Edit Cost Center Budget" : "Create Cost Center Budget"}
        subtitle={
          currentBudget
            ? "Modify the allocated budget for this cost center and fiscal year."
            : "Allocate a new budget to a cost center for a fiscal year."
        }
        size="lg"
        fullScreenMobile
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="cost-center-budget-form"
              variant="primary"
              loading={submitting}
              loadingText="Saving..."
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Save Budget
            </Button>
          </div>
        }
      >
        <form id="cost-center-budget-form" onSubmit={handleFormSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Cost Center <span className="text-red-500">*</span>
            </label>
            <Select
              options={costCenterOptions}
              value={selectedCostCenterOption}
              onChange={(opt) => handleSelectChange("costCenterId", opt ? opt.value : "")}
              placeholder="Search and select cost center..."
              isSearchable
              isClearable
              styles={customSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.costCenterId && (
              <span className="text-xs text-red-600 block mt-1">{formErrors.costCenterId}</span>
            )}
            {selectedCostCenterForForm && (
              <p className="text-xs text-gray-500 mt-1">
                Department: {resolveDepartmentName(selectedCostCenterForForm.departmentUuid)}
              </p>
            )}
          </div>

          <FormInput
            label="Fiscal Year"
            name="fiscalYear"
            placeholder="e.g. 2026-2027"
            value={formData.fiscalYear}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.fiscalYear}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Budget Amount"
              name="budgetAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500000"
              value={formData.budgetAmount}
              onChange={handleBudgetAmountChange}
              requiredMark
              disabled={submitting}
              error={formErrors.budgetAmount}
            />

            <FormInput
              label="Available Budget"
              name="availableBudget"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500000"
              value={formData.availableBudget}
              onChange={handleAvailableBudgetChange}
              requiredMark
              disabled={submitting}
              error={formErrors.availableBudget}
            />
          </div>
          {!currentBudget && (
            <p className="text-xs text-gray-400 -mt-2">
              Available budget defaults to the budget amount unless you change it manually.
            </p>
          )}
        </form>
      </Modal>

      {/* View Budget */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        title="Cost Center Budget Details"
        subtitle="Read-only summary of the selected budget."
        size="lg"
        fullScreenMobile
      >
        {viewBudget && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow
              icon={<Briefcase className="h-5 w-5" />}
              label="Cost Center"
              value={viewCostCenter ? `${viewCostCenter.costCenterCode} - ${viewCostCenter.costCenterName}` : viewBudget.costCenterId}
            />
            <DetailRow
              icon={<Briefcase className="h-5 w-5" />}
              label="Department"
              value={viewCostCenter ? resolveDepartmentName(viewCostCenter.departmentUuid) : "—"}
            />
            <DetailRow icon={<Calendar className="h-5 w-5" />} label="Fiscal Year" value={viewBudget.fiscalYear} />
            <DetailRow icon={<Wallet className="h-5 w-5" />} label="Budget Amount" value={formatAmount(viewBudget.budgetAmount)} />
            <DetailRow icon={<PiggyBank className="h-5 w-5" />} label="Available Budget" value={formatAmount(viewBudget.availableBudget)} />
            <DetailRow icon={<TrendingDown className="h-5 w-5" />} label="Consumed Budget" value={formatAmount(viewConsumed)} />
            <DetailRow
              icon={<Calendar className="h-5 w-5" />}
              label="Created Date"
              value={formatDate(viewBudget.createdDate || viewBudget.createdAt)}
            />
            <DetailRow
              icon={<Calendar className="h-5 w-5" />}
              label="Updated Date"
              value={formatDate(viewBudget.updatedDate || viewBudget.updatedAt)}
            />
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete Cost Center Budget"
        message={`Are you sure you want to delete the budget for "${
          resolveCostCenter(budgetToDelete?.costCenterId)?.costCenterName || budgetToDelete?.costCenterId
        }" (${budgetToDelete?.fiscalYear})? This action cannot be undone.`}
        confirmText="Delete Budget"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setBudgetToDelete(null);
        }}
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}
