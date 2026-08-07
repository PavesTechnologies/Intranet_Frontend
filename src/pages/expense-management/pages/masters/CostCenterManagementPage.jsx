import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Building2,
  CheckCircle2,
  XCircle,
  Layers,
  Hash,
  Briefcase,
  User,
  FileText,
  Calendar,
  AlertCircle,
  Wallet,
  PiggyBank,
  TrendingDown,
  RefreshCw,
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
import StatusBadge from "@/components/status/statusbadge";
import LoadingSpinner from "@/components/LoadingSpinner";
import FormInput from "@/components/forms/FormInput";
import FormTextArea from "@/components/forms/FormTextArea";
import FormSelect from "@/components/forms/FormSelect";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import api from "@/api/axiosInstance";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";
const EMPLOYEE_ONBOARDING_URL = window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL || "";

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const costCenterService = {
  getAll: (params) => {
    return api.get("/xms/admin/cost-centers", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: authHeaders(),
    });
  },
  getById: (id) => {
    return api.get(`/xms/admin/cost-centers/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
  },
  create: (payload) => {
    return api.post("/xms/admin/cost-centers", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
  },
  update: (id, payload) => {
    return api.put(`/xms/admin/cost-centers/${id}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
  },
  delete: (id) => {
    return api.delete(`/xms/admin/cost-centers/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: authHeaders(),
    });
  },
};

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

const departmentService = {
  getAll: () => {
    return api.get(`${EMPLOYEE_ONBOARDING_URL}/masters/departments/`, {
      headers: authHeaders(),
    });
  },
};

const employeeService = {
  getAll: () => {
    return api.get(`${EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`, {
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

export default function CostCenterManagementPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["Admin", "Super_Admin"]);

  const [activeTab, setActiveTab] = useState("costCenters"); // "costCenters" | "budgets"

  // Shared lookups data
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dropdownCostCenters, setDropdownCostCenters] = useState([]);

  // ----------------------------------------------------
  // COST CENTERS TAB STATE
  // ----------------------------------------------------
  const [costCenters, setCostCenters] = useState([]);
  const [allCostCenters, setAllCostCenters] = useState([]);
  const [isCcServerPaginated, setIsCcServerPaginated] = useState(false);
  const [totalCcItems, setTotalCcItems] = useState(0);
  const [ccLoading, setCcLoading] = useState(true);
  const [ccLoadError, setCcLoadError] = useState(false);
  const [statsCostCenters, setStatsCostCenters] = useState([]);

  const [ccCurrentPage, setCcCurrentPage] = useState(1);
  const [ccSearchTerm, setCcSearchTerm] = useState("");
  const [ccDepartmentFilter, setCcDepartmentFilter] = useState("");
  const [ccStatusFilter, setCcStatusFilter] = useState("");

  const [isCcModalOpen, setIsCcModalOpen] = useState(false);
  const [currentCostCenter, setCurrentCostCenter] = useState(null);
  const [ccFormData, setCcFormData] = useState({
    costCenterCode: "",
    costCenterName: "",
    departmentUuid: "",
    description: "",
    ownerEmployeeId: "",
    status: "ACTIVE",
  });
  const [ccFormErrors, setCcFormErrors] = useState({});
  const [isCcViewOpen, setIsCcViewOpen] = useState(false);
  const [viewCostCenter, setViewCostCenter] = useState(null);

  // ----------------------------------------------------
  // BUDGETS TAB STATE
  // ----------------------------------------------------
  const [budgets, setBudgets] = useState([]);
  const [allBudgets, setAllBudgets] = useState([]);
  const [isBudgetServerPaginated, setIsBudgetServerPaginated] = useState(false);
  const [totalBudgetItems, setTotalBudgetItems] = useState(0);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetLoadError, setBudgetLoadError] = useState(false);
  const [statsBudgets, setStatsBudgets] = useState([]);

  const [budgetCurrentPage, setBudgetCurrentPage] = useState(1);
  const [budgetSearchTerm, setBudgetSearchTerm] = useState("");
  const [budgetDepartmentFilter, setBudgetDepartmentFilter] = useState("");
  const [budgetFiscalYearFilter, setBudgetFiscalYearFilter] = useState("");

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [currentBudget, setCurrentBudget] = useState(null);
  const [availableBudgetTouched, setAvailableBudgetTouched] = useState(false);
  const [budgetFormData, setBudgetFormData] = useState({
    costCenterId: "",
    fiscalYear: "",
    budgetAmount: "",
    availableBudget: "",
  });
  const [budgetFormErrors, setBudgetFormErrors] = useState({});
  const [isBudgetViewOpen, setIsBudgetViewOpen] = useState(false);
  const [viewBudget, setViewBudget] = useState(null);

  // ----------------------------------------------------
  // COMMON MODAL/CONFIRMATION STATE
  // ----------------------------------------------------
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'cc' | 'budget', data: any }
  const [submitting, setSubmitting] = useState(false);

  // Helpers
  const getDepartmentList = useCallback(() => {
    if (Array.isArray(departments)) return departments;
    if (departments && typeof departments === "object") return departments.content || departments.data || [];
    return [];
  }, [departments]);

  const getEmployeeList = useCallback(() => {
    if (Array.isArray(employees)) return employees;
    if (employees && typeof employees === "object") return employees.content || employees.data || [];
    return [];
  }, [employees]);

  const getCostCenterList = useCallback(() => {
    if (Array.isArray(dropdownCostCenters)) return dropdownCostCenters;
    if (dropdownCostCenters && typeof dropdownCostCenters === "object") {
      return dropdownCostCenters.costCenters || dropdownCostCenters.content || dropdownCostCenters.data || [];
    }
    return [];
  }, [dropdownCostCenters]);

  const resolveDepartmentName = useCallback(
    (departmentUuid, fallbackName) => {
      if (fallbackName) return fallbackName;
      const dept = getDepartmentList().find((d) => d.department_uuid === departmentUuid);
      return dept?.department_name || departmentUuid || "N/A";
    },
    [getDepartmentList]
  );

  const resolveOwnerName = useCallback(
    (ownerEmployeeId, fallbackName) => {
      if (fallbackName) return fallbackName;
      const emp = getEmployeeList().find((e) => String(e.employee_id) === String(ownerEmployeeId));
      if (!emp) return ownerEmployeeId || "N/A";
      const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ");
      return `${fullName} (${emp.employee_id})`;
    },
    [getEmployeeList]
  );

  const resolveCostCenter = useCallback(
    (costCenterId) => getCostCenterList().find((cc) => cc.costCenterId === costCenterId),
    [getCostCenterList]
  );

  // Fetch API handlers
  const fetchDepartments = async () => {
    try {
      const res = await departmentService.getAll();
      setDepartments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeService.getAll();
      setEmployees(res.data || []);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchDropdownCostCenters = async () => {
    try {
      const res = await costCenterService.getAll({ page: 1, limit: STATS_LIMIT });
      const items = Array.isArray(res.data)
        ? res.data
        : res.data?.costCenters || res.data?.content || res.data?.data || [];
      setDropdownCostCenters(items || []);
    } catch (err) {
      console.error("Failed to fetch cost centers for dropdown:", err);
    }
  };

  const fetchCcStats = useCallback(async () => {
    try {
      const res = await costCenterService.getAll({ page: 1, limit: STATS_LIMIT });
      const items = Array.isArray(res.data)
        ? res.data
        : res.data?.costCenters || res.data?.content || res.data?.data || [];
      setStatsCostCenters(items || []);
    } catch (err) {
      console.error("Failed to fetch cost center stats:", err);
    }
  }, []);

  const fetchBudgetStats = useCallback(async () => {
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

  const fetchCostCenters = useCallback(async () => {
    try {
      setCcLoading(true);
      setCcLoadError(false);
      const params = {
        page: ccCurrentPage,
        limit: ITEMS_PER_PAGE,
        search: ccSearchTerm,
        department: ccDepartmentFilter || undefined,
        status: ccStatusFilter || undefined,
      };

      const res = await costCenterService.getAll(params);

      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        const items = res.data.costCenters || res.data.content || res.data.data || [];
        const total = res.data.total !== undefined ? res.data.total : res.data.totalElements ?? items.length ?? 0;
        setCostCenters(items);
        setTotalCcItems(total);
        setIsCcServerPaginated(true);
      } else if (Array.isArray(res.data)) {
        setAllCostCenters(res.data);
        setIsCcServerPaginated(false);
      } else {
        setCostCenters([]);
        setTotalCcItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch Cost Centers:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch Cost Centers.";
      showStatusToast(errMsg, "error");
      setCostCenters([]);
      setTotalCcItems(0);
      setCcLoadError(true);
    } finally {
      setCcLoading(false);
    }
  }, [ccCurrentPage, ccSearchTerm, ccDepartmentFilter, ccStatusFilter]);

  const fetchBudgets = useCallback(async () => {
    try {
      setBudgetLoading(true);
      setBudgetLoadError(false);
      const params = {
        page: budgetCurrentPage,
        limit: ITEMS_PER_PAGE,
        search: budgetSearchTerm,
        department: budgetDepartmentFilter || undefined,
        fiscalYear: budgetFiscalYearFilter || undefined,
      };

      const res = await budgetService.getAll(params);

      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        const items = res.data.budgets || res.data.content || res.data.data || [];
        const total = res.data.total !== undefined ? res.data.total : res.data.totalElements ?? items.length ?? 0;
        setBudgets(items);
        setTotalBudgetItems(total);
        setIsBudgetServerPaginated(true);
      } else if (Array.isArray(res.data)) {
        setAllBudgets(res.data);
        setIsBudgetServerPaginated(false);
      } else {
        setBudgets([]);
        setTotalBudgetItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch Cost Center Budgets:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch Cost Center Budgets.";
      showStatusToast(errMsg, "error");
      setBudgets([]);
      setTotalBudgetItems(0);
      setBudgetLoadError(true);
    } finally {
      setBudgetLoading(false);
    }
  }, [budgetCurrentPage, budgetSearchTerm, budgetDepartmentFilter, budgetFiscalYearFilter]);

  // Initial load
  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchDropdownCostCenters();
    fetchCcStats();
    fetchBudgetStats();
  }, [fetchCcStats, fetchBudgetStats]);

  // Tab switching load
  useEffect(() => {
    if (activeTab === "costCenters") {
      fetchCostCenters();
    } else {
      fetchBudgets();
    }
  }, [activeTab, fetchCostCenters, fetchBudgets]);

  // Client-side filtering logic
  const matchesCcFilters = useCallback(
    (cc) => {
      const code = (cc.costCenterCode || "").toLowerCase();
      const name = (cc.costCenterName || "").toLowerCase();
      const desc = (cc.description || "").toLowerCase();
      const q = ccSearchTerm.toLowerCase();
      const matchesSearch = !q || code.includes(q) || name.includes(q) || desc.includes(q);
      const matchesDept = !ccDepartmentFilter || cc.departmentUuid === ccDepartmentFilter;
      const matchesStatus = !ccStatusFilter || (cc.status || "").toUpperCase() === ccStatusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    },
    [ccSearchTerm, ccDepartmentFilter, ccStatusFilter]
  );

  const matchesBudgetFilters = useCallback(
    (b) => {
      const cc = resolveCostCenter(b.costCenterId);
      const code = (cc?.costCenterCode || "").toLowerCase();
      const name = (cc?.costCenterName || "").toLowerCase();
      const fiscalYear = (b.fiscalYear || "").toLowerCase();
      const q = budgetSearchTerm.toLowerCase();
      const matchesSearch = !q || code.includes(q) || name.includes(q) || fiscalYear.includes(q);
      const matchesDept = !budgetDepartmentFilter || cc?.departmentUuid === budgetDepartmentFilter;
      const matchesFiscalYear = !budgetFiscalYearFilter || b.fiscalYear === budgetFiscalYearFilter;
      return matchesSearch && matchesDept && matchesFiscalYear;
    },
    [budgetSearchTerm, budgetDepartmentFilter, budgetFiscalYearFilter, resolveCostCenter]
  );

  const displayedCostCenters = isCcServerPaginated
    ? costCenters
    : (() => {
        const filtered = allCostCenters.filter(matchesCcFilters);
        const start = (ccCurrentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const displayedBudgets = isBudgetServerPaginated
    ? budgets
    : (() => {
        const filtered = allBudgets.filter(matchesBudgetFilters);
        const start = (budgetCurrentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const ccTotalCount = isCcServerPaginated ? totalCcItems : allCostCenters.filter(matchesCcFilters).length;
  const ccTotalPages = Math.ceil(ccTotalCount / ITEMS_PER_PAGE) || 0;

  const budgetTotalCount = isBudgetServerPaginated ? totalBudgetItems : allBudgets.filter(matchesBudgetFilters).length;
  const budgetTotalPages = Math.ceil(budgetTotalCount / ITEMS_PER_PAGE) || 0;

  const totalCostCentersCount = statsCostCenters.length;
  const activeCostCentersCount = statsCostCenters.filter((c) => (c.status || "").toUpperCase() === "ACTIVE").length;
  const inactiveCostCentersCount = statsCostCenters.filter((c) => (c.status || "").toUpperCase() === "INACTIVE").length;

  const getConsumed = (b) => {
    if (b.consumedBudget !== undefined && b.consumedBudget !== null) return Number(b.consumedBudget);
    return Number(b.budgetAmount || 0) - Number(b.availableBudget || 0);
  };

  const totalBudgetsCount = statsBudgets.length;
  const totalAllocatedBudget = statsBudgets.reduce((sum, b) => sum + Number(b.budgetAmount || 0), 0);
  const totalAvailableBudget = statsBudgets.reduce((sum, b) => sum + Number(b.availableBudget || 0), 0);
  const totalConsumedBudget = statsBudgets.reduce((sum, b) => sum + getConsumed(b), 0);

  const fiscalYearOptions = Array.from(new Set(statsBudgets.map((b) => b.fiscalYear).filter(Boolean))).sort();

  // Filter actions
  const handleCcSearch = useCallback((value) => {
    setCcSearchTerm(value || "");
    setCcCurrentPage(1);
  }, []);

  const handleCcDepartmentFilterChange = (e) => {
    setCcDepartmentFilter(e.target.value);
    setCcCurrentPage(1);
  };

  const handleCcStatusFilterChange = (e) => {
    setCcStatusFilter(e.target.value);
    setCcCurrentPage(1);
  };

  const handleClearCcFilters = () => {
    setCcSearchTerm("");
    setCcDepartmentFilter("");
    setCcStatusFilter("");
    setCcCurrentPage(1);
  };

  const handleBudgetSearch = useCallback((value) => {
    setBudgetSearchTerm(value || "");
    setBudgetCurrentPage(1);
  }, []);

  const handleBudgetDepartmentFilterChange = (e) => {
    setBudgetDepartmentFilter(e.target.value);
    setBudgetCurrentPage(1);
  };

  const handleBudgetFiscalYearFilterChange = (e) => {
    setBudgetFiscalYearFilter(e.target.value);
    setBudgetCurrentPage(1);
  };

  const handleClearBudgetFilters = () => {
    setBudgetSearchTerm("");
    setBudgetDepartmentFilter("");
    setBudgetFiscalYearFilter("");
    setBudgetCurrentPage(1);
  };

  // Form inputs change
  const handleCcInputChange = (e) => {
    const { name, value } = e.target;
    setCcFormData((prev) => ({ ...prev, [name]: value }));
    if (ccFormErrors[name]) {
      setCcFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleCcSelectChange = (name, value) => {
    setCcFormData((prev) => ({ ...prev, [name]: value }));
    if (ccFormErrors[name]) {
      setCcFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBudgetInputChange = (e) => {
    const { name, value } = e.target;
    setBudgetFormData((prev) => ({ ...prev, [name]: value }));
    if (budgetFormErrors[name]) {
      setBudgetFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBudgetSelectChange = (name, value) => {
    setBudgetFormData((prev) => ({ ...prev, [name]: value }));
    if (budgetFormErrors[name]) {
      setBudgetFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleBudgetAmountChange = (e) => {
    const { value } = e.target;
    setBudgetFormData((prev) => {
      const next = { ...prev, budgetAmount: value };
      if (!currentBudget && !availableBudgetTouched) {
        next.availableBudget = value;
      }
      return next;
    });
    if (budgetFormErrors.budgetAmount) {
      setBudgetFormErrors((prev) => ({ ...prev, budgetAmount: "" }));
    }
  };

  const handleAvailableBudgetChange = (e) => {
    setAvailableBudgetTouched(true);
    handleBudgetInputChange(e);
  };

  // Validation
  const validateCcForm = () => {
    const errors = {};
    const trimmedCode = ccFormData.costCenterCode.trim();
    const trimmedName = ccFormData.costCenterName.trim();

    if (!trimmedCode) {
      errors.costCenterCode = "Cost center code is required.";
    } else if (trimmedCode.length < 2 || trimmedCode.length > 50) {
      errors.costCenterCode = "Code must be between 2 and 50 characters.";
    } else if (!/^[a-zA-Z0-9-_]+$/.test(trimmedCode)) {
      errors.costCenterCode = "Only alphanumeric characters, hyphens, and underscores are allowed.";
    }

    if (!trimmedName) {
      errors.costCenterName = "Cost center name is required.";
    } else if (trimmedName.length < 3 || trimmedName.length > 100) {
      errors.costCenterName = "Name must be between 3 and 100 characters.";
    }

    if (!ccFormData.departmentUuid) {
      errors.departmentUuid = "Department is required.";
    }

    if (!ccFormData.ownerEmployeeId) {
      errors.ownerEmployeeId = "Owner employee is required.";
    }

    if (ccFormData.description && ccFormData.description.length > 250) {
      errors.description = "Description cannot exceed 250 characters.";
    }

    setCcFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateBudgetForm = () => {
    const errors = {};

    if (!budgetFormData.costCenterId) {
      errors.costCenterId = "Cost center is required.";
    }

    if (!budgetFormData.fiscalYear.trim()) {
      errors.fiscalYear = "Fiscal year is required.";
    } else if (!/^\d{4}-\d{4}$/.test(budgetFormData.fiscalYear.trim())) {
      errors.fiscalYear = "Use the format YYYY-YYYY, e.g. 2026-2027.";
    } else {
      const [start, end] = budgetFormData.fiscalYear.trim().split("-").map(Number);
      if (end !== start + 1) {
        errors.fiscalYear = "Fiscal year must span two consecutive years, e.g. 2026-2027.";
      }
    }

    const budgetAmount = Number(budgetFormData.budgetAmount);
    if (budgetFormData.budgetAmount === "" || Number.isNaN(budgetAmount) || budgetAmount <= 0) {
      errors.budgetAmount = "Budget amount must be greater than 0.";
    }

    const availableBudget = Number(budgetFormData.availableBudget);
    if (budgetFormData.availableBudget === "" || Number.isNaN(availableBudget) || availableBudget < 0) {
      errors.availableBudget = "Available budget must be 0 or greater.";
    } else if (!Number.isNaN(budgetAmount) && availableBudget > budgetAmount) {
      errors.availableBudget = "Available budget cannot exceed the budget amount.";
    }

    setBudgetFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Dialog openers
  const openCreateCostCenterModal = () => {
    if (!isAdmin) return;
    setCurrentCostCenter(null);
    setCcFormData({
      costCenterCode: "",
      costCenterName: "",
      departmentUuid: "",
      description: "",
      ownerEmployeeId: "",
      status: "ACTIVE",
    });
    setCcFormErrors({});
    setIsCcModalOpen(true);
  };

  const handleCcEditClick = (cc) => {
    if (!isAdmin) return;
    setCurrentCostCenter(cc);
    setCcFormData({
      costCenterCode: cc.costCenterCode || "",
      costCenterName: cc.costCenterName || "",
      departmentUuid: cc.departmentUuid || "",
      description: cc.description || "",
      ownerEmployeeId: cc.ownerEmployeeId != null ? String(cc.ownerEmployeeId) : "",
      status: cc.status || "ACTIVE",
    });
    setCcFormErrors({});
    setIsCcModalOpen(true);
  };

  const handleCcViewClick = (cc) => {
    setViewCostCenter(cc);
    setIsCcViewOpen(true);
  };

  const handleCcDeleteClick = (cc) => {
    if (!isAdmin) return;
    setDeleteTarget({ type: "cc", data: cc });
    setIsConfirmOpen(true);
  };

  const openCreateBudgetModal = () => {
    if (!isAdmin) return;
    setCurrentBudget(null);
    setAvailableBudgetTouched(false);
    setBudgetFormData({ costCenterId: "", fiscalYear: "", budgetAmount: "", availableBudget: "" });
    setBudgetFormErrors({});
    setIsBudgetModalOpen(true);
  };

  const handleBudgetEditClick = (b) => {
    if (!isAdmin) return;
    setCurrentBudget(b);
    setAvailableBudgetTouched(true);
    setBudgetFormData({
      costCenterId: b.costCenterId || "",
      fiscalYear: b.fiscalYear || "",
      budgetAmount: b.budgetAmount != null ? String(b.budgetAmount) : "",
      availableBudget: b.availableBudget != null ? String(b.availableBudget) : "",
    });
    setBudgetFormErrors({});
    setIsBudgetModalOpen(true);
  };

  const handleBudgetViewClick = (b) => {
    setViewBudget(b);
    setIsBudgetViewOpen(true);
  };

  const handleBudgetDeleteClick = (b) => {
    if (!isAdmin) return;
    setDeleteTarget({ type: "budget", data: b });
    setIsConfirmOpen(true);
  };

  // Save/Submit API logic
  const handleCcFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateCcForm()) return;

    const payload = {
      costCenterCode: ccFormData.costCenterCode.trim(),
      costCenterName: ccFormData.costCenterName.trim(),
      departmentUuid: ccFormData.departmentUuid,
      description: ccFormData.description ? ccFormData.description.trim() : "",
      ownerEmployeeId: ccFormData.ownerEmployeeId,
      status: ccFormData.status,
    };

    try {
      setSubmitting(true);
      if (currentCostCenter) {
        await costCenterService.update(currentCostCenter.costCenterId, payload);
        showStatusToast("Cost Center updated successfully!", "success");
      } else {
        await costCenterService.create(payload);
        showStatusToast("Cost Center created successfully!", "success");
        setCcCurrentPage(1);
      }

      setIsCcModalOpen(false);
      fetchCostCenters();
      fetchDropdownCostCenters();
      fetchCcStats();
    } catch (err) {
      console.error("Error saving Cost Center:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save Cost Center.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBudgetFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateBudgetForm()) return;

    const payload = {
      costCenterId: budgetFormData.costCenterId,
      fiscalYear: budgetFormData.fiscalYear.trim(),
      budgetAmount: Number(budgetFormData.budgetAmount),
      availableBudget: Number(budgetFormData.availableBudget),
    };

    try {
      setSubmitting(true);
      if (currentBudget) {
        await budgetService.update(currentBudget.budgetId, payload);
        showStatusToast("Cost Center Budget updated successfully!", "success");
      } else {
        await budgetService.create(payload);
        showStatusToast("Cost Center Budget created successfully!", "success");
        setBudgetCurrentPage(1);
      }

      setIsBudgetModalOpen(false);
      fetchBudgets();
      fetchBudgetStats();
    } catch (err) {
      console.error("Error saving Cost Center Budget:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save Cost Center Budget.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setSubmitting(true);
      if (deleteTarget.type === "cc") {
        await costCenterService.delete(deleteTarget.data.costCenterId);
        showStatusToast("Cost Center deleted successfully!", "success");

        setIsConfirmOpen(false);
        setDeleteTarget(null);

        if (displayedCostCenters.length === 1 && ccCurrentPage > 1) {
          setCcCurrentPage((prev) => prev - 1);
        } else {
          fetchCostCenters();
        }
        fetchDropdownCostCenters();
        fetchCcStats();
      } else {
        await budgetService.delete(deleteTarget.data.budgetId);
        showStatusToast("Cost Center Budget deleted successfully!", "success");

        setIsConfirmOpen(false);
        setDeleteTarget(null);

        if (displayedBudgets.length === 1 && budgetCurrentPage > 1) {
          setBudgetCurrentPage((prev) => prev - 1);
        } else {
          fetchBudgets();
        }
        fetchBudgetStats();
      }
    } catch (err) {
      console.error(`Error deleting ${deleteTarget.type === "cc" ? "Cost Center" : "Cost Center Budget"}:`, err);
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.detail ||
        `Failed to delete ${deleteTarget.type === "cc" ? "Cost Center" : "Cost Center Budget"}.`;
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Rendering table configurations
  const renderTableSkeleton = (columnsCount) => {
    return [...Array(5)].map((_, index) => (
      <tr key={index} className="animate-pulse border-b border-gray-100">
        {[...Array(columnsCount)].map((_, cellIndex) => (
          <td key={cellIndex} className="px-6 py-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </td>
        ))}
      </tr>
    ));
  };

  const ccHeaders = [
    "S.No",
    "Cost Center Code",
    "Cost Center Name",
    "Department",
    "Owner Employee",
    "Status",
    "Description",
    "Created Date",
    "Actions",
  ];

  const ccColumns = [
    "serial_no",
    "costCenterCode",
    "costCenterName",
    "department",
    "owner",
    "status",
    "description",
    "createdDate",
    "actions",
  ];

  const ccTableRows = displayedCostCenters.map((cc, index) => {
    const statusVal = (cc.status || "INACTIVE").toUpperCase();

    return {
      serial_no: ((ccCurrentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
      costCenterCode: cc.costCenterCode || "N/A",
      costCenterName: cc.costCenterName || "N/A",
      department: resolveDepartmentName(cc.departmentUuid, cc.departmentName),
      owner: resolveOwnerName(cc.ownerEmployeeId, cc.ownerEmployeeName),
      status: <StatusBadge label={statusVal === "ACTIVE" ? "Active" : "Inactive"} size="sm" />,
      description: cc.description || "—",
      createdDate: formatDate(cc.createdDate || cc.createdAt),
      actions: (
        <div className="flex items-center gap-1 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="View Cost Center"
            aria-label="View Cost Center"
            className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition rounded-md"
            onClick={() => handleCcViewClick(cc)}
          >
            <Eye size={16} />
          </Button>

          {isAdmin && (
            <>
              <Button
                type="button"
                variant="link"
                size="icon"
                title="Edit Cost Center"
                aria-label="Edit Cost Center"
                className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
                onClick={() => handleCcEditClick(cc)}
              >
                <Pencil size={16} />
              </Button>

              <Button
                type="button"
                variant="link"
                size="icon"
                title="Delete Cost Center"
                aria-label="Delete Cost Center"
                className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
                onClick={() => handleCcDeleteClick(cc)}
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      ),
    };
  });

  const budgetHeaders = [
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

  const budgetColumns = [
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

  const budgetTableRows = displayedBudgets.map((b, index) => {
    const cc = resolveCostCenter(b.costCenterId);
    const consumed = getConsumed(b);
    const utilizationPercent = Number(b.budgetAmount) > 0 ? (consumed / Number(b.budgetAmount)) * 100 : 0;

    return {
      serial_no: ((budgetCurrentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
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
            onClick={() => handleBudgetViewClick(b)}
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
                onClick={() => handleBudgetEditClick(b)}
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
                onClick={() => handleBudgetDeleteClick(b)}
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      ),
    };
  });

  // Select Options formatting
  const departmentOptions = getDepartmentList().map((d) => ({
    value: d.department_uuid,
    label: d.department_name,
  }));
  const selectedDepartmentOption = departmentOptions.find((o) => o.value === ccFormData.departmentUuid) || null;

  const employeeOptions = getEmployeeList().map((e) => {
    const fullName = [e.first_name, e.last_name].filter(Boolean).join(" ") || "Unnamed Employee";
    return {
      value: String(e.employee_id),
      label: `${fullName} (${e.employee_id})`,
      name: fullName,
      empId: e.employee_id,
      email: e.work_email || "N/A",
    };
  });
  const selectedOwnerOption = employeeOptions.find((o) => o.value === ccFormData.ownerEmployeeId) || null;

  const ccDepartmentFilterOptions = [{ label: "All Departments", value: "" }, ...departmentOptions];
  const ccStatusFilterOptions = [
    { label: "All Statuses", value: "" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  const costCenterOptions = getCostCenterList().map((cc) => ({
    value: cc.costCenterId,
    label: `${cc.costCenterCode} - ${cc.costCenterName} (${resolveDepartmentName(cc.departmentUuid)})`,
  }));
  const selectedCostCenterOption = costCenterOptions.find((o) => o.value === budgetFormData.costCenterId) || null;
  const selectedCostCenterForForm = resolveCostCenter(budgetFormData.costCenterId);

  const budgetDepartmentFilterOptions = [
    { label: "All Departments", value: "" },
    ...getDepartmentList().map((d) => ({ value: d.department_uuid, label: d.department_name })),
  ];
  const budgetFiscalYearFilterOptions = [
    { label: "All Fiscal Years", value: "" },
    ...fiscalYearOptions.map((fy) => ({ label: fy, value: fy })),
  ];

  const viewCostCenterForBudget = viewBudget ? resolveCostCenter(viewBudget.costCenterId) : null;
  const viewConsumed = viewBudget ? getConsumed(viewBudget) : 0;

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Masters", to: "/expense-management/masters/expense-categories" },
    { label: "Cost Center Management" },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      {/* Top Header Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">Cost Center Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage cost centers, department ownership, and budgets allocated across fiscal years.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-2 sm:flex-row sm:w-auto w-full">
            {activeTab === "costCenters" ? (
              <Button
                onClick={openCreateCostCenterModal}
                variant="primary"
                size="medium"
                className="w-full sm:w-auto shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Create Cost Center
              </Button>
            ) : (
              <Button
                onClick={openCreateBudgetModal}
                variant="primary"
                size="medium"
                className="w-full sm:w-auto shadow-sm whitespace-nowrap"
              >
                <Plus size={16} />
                Create Budget
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modern Tabs Selector */}
      <div className="border-b border-gray-200 bg-white rounded-xl p-2 shadow-sm flex items-center justify-between">
        <div className="flex space-x-1 p-1 bg-gray-50 rounded-lg">
          <button
            onClick={() => setActiveTab("costCenters")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "costCenters"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Building2 size={16} />
            Cost Centers
          </button>
          <button
            onClick={() => setActiveTab("budgets")}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-md transition ${
              activeTab === "budgets"
                ? "bg-white text-blue-600 shadow-sm border-gray-200"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            <Wallet size={16} />
            Cost Center Budgets
          </button>
        </div>

        <button
          onClick={activeTab === "costCenters" ? fetchCostCenters : fetchBudgets}
          title="Reload current tab data"
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-md transition mr-1"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* KPI Cards Panel */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {activeTab === "costCenters" ? (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Cost Centers</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalCostCentersCount}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4 sm:col-span-1">
              <div className="p-3 bg-green-50 text-green-600 rounded-lg">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Cost Centers</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{activeCostCentersCount}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4 sm:col-span-1">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg">
                <XCircle size={24} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inactive Cost Centers</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{inactiveCostCentersCount}</p>
              </div>
            </div>
          </>
        ) : (
          <>
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
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Allocated</p>
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
          </>
        )}
      </div>

      {/* Search & Filtering Panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {activeTab === "costCenters" ? (
          <div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <SearchInput
                  value={ccSearchTerm}
                  onSearch={handleCcSearch}
                  placeholder="Search by cost center code or name..."
                />
              </div>

              <FormSelect
                label="Department"
                name="ccDepartmentFilter"
                value={ccDepartmentFilter}
                onChange={handleCcDepartmentFilterChange}
                options={ccDepartmentFilterOptions}
              />

              <FormSelect
                label="Status"
                name="ccStatusFilter"
                value={ccStatusFilter}
                onChange={handleCcStatusFilterChange}
                options={ccStatusFilterOptions}
              />
            </div>

            <div className="mt-3 flex justify-end">
              <Button type="button" variant="outline" size="small" onClick={handleClearCcFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <SearchInput
                  value={budgetSearchTerm}
                  onSearch={handleBudgetSearch}
                  placeholder="Search by fiscal year or cost center..."
                />
              </div>

              <FormSelect
                label="Department"
                name="budgetDepartmentFilter"
                value={budgetDepartmentFilter}
                onChange={handleBudgetDepartmentFilterChange}
                options={budgetDepartmentFilterOptions}
              />

              <FormSelect
                label="Fiscal Year"
                name="budgetFiscalYearFilter"
                value={budgetFiscalYearFilter}
                onChange={handleBudgetFiscalYearFilterChange}
                options={budgetFiscalYearFilterOptions}
              />
            </div>

            <div className="mt-3 flex justify-end">
              <Button type="button" variant="outline" size="small" onClick={handleClearBudgetFilters}>
                Clear Filters
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Table / Data Grid Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {activeTab === "costCenters" ? (
          ccLoading ? (
            <div className="w-full overflow-x-auto rounded-lg">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                  <tr>
                    {ccHeaders.map((h, i) => (
                      <th key={i} className="px-6 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderTableSkeleton(ccHeaders.length)}</tbody>
              </table>
            </div>
          ) : ccLoadError ? (
            <PageCard>
              <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                <AlertCircle className="h-10 w-10 text-red-300 mb-3" />
                <h2 className="text-sm font-semibold text-gray-700">Failed to load Cost Centers</h2>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  Something went wrong while fetching data. Please try again.
                </p>
                <Button variant="outline" size="small" className="mt-4" onClick={fetchCostCenters}>
                  Retry
                </Button>
              </PageCardContent>
            </PageCard>
          ) : displayedCostCenters.length === 0 ? (
            <PageCard>
              <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
                <Layers className="h-10 w-10 text-gray-300 mb-3" />
                <h2 className="text-sm font-semibold text-gray-700">No Cost Centers Found</h2>
                <p className="text-xs text-gray-400 mt-1 max-w-sm">
                  {ccSearchTerm || ccDepartmentFilter || ccStatusFilter
                    ? "No cost centers match the selected search and filters."
                    : "Start by creating a new cost center for expense allocation."}
                </p>
              </PageCardContent>
            </PageCard>
          ) : (
            <>
              <div className="w-full overflow-x-auto rounded-lg">
                <GenericTable headers={ccHeaders} rows={ccTableRows} columns={ccColumns} />
              </div>

              {ccTotalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={ccCurrentPage}
                    totalPages={ccTotalPages}
                    onPrevious={() => setCcCurrentPage((p) => Math.max(p - 1, 1))}
                    onNext={() => setCcCurrentPage((p) => Math.min(p + 1, ccTotalPages))}
                  />
                </div>
              )}
            </>
          )
        ) : budgetLoading ? (
          <div className="w-full overflow-x-auto rounded-lg">
            <table className="w-full text-left text-sm text-gray-500">
              <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold border-b border-gray-200">
                <tr>
                  {budgetHeaders.map((h, i) => (
                    <th key={i} className="px-6 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{renderTableSkeleton(budgetHeaders.length)}</tbody>
            </table>
          </div>
        ) : budgetLoadError ? (
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
                {budgetSearchTerm || budgetDepartmentFilter || budgetFiscalYearFilter
                  ? "No budgets match the selected search and filters."
                  : "Start by allocating a new budget to a cost center."}
              </p>
            </PageCardContent>
          </PageCard>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable headers={budgetHeaders} rows={budgetTableRows} columns={budgetColumns} />
            </div>

            {budgetTotalPages > 1 && (
              <div className="mt-4 flex justify-center">
                <Pagination
                  currentPage={budgetCurrentPage}
                  totalPages={budgetTotalPages}
                  onPrevious={() => setBudgetCurrentPage((p) => Math.max(p - 1, 1))}
                  onNext={() => setBudgetCurrentPage((p) => Math.min(p + 1, budgetTotalPages))}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Add / Edit Cost Center Dialog */}
      <Modal
        isOpen={isCcModalOpen}
        onClose={() => setIsCcModalOpen(false)}
        title={currentCostCenter ? "Edit Cost Center" : "Create Cost Center"}
        subtitle={
          currentCostCenter
            ? "Modify the selected cost center's properties."
            : "Register a new cost center for expense allocation."
        }
        size="lg"
        fullScreenMobile
        closeOnBackdrop={false}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCcModalOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="cost-center-form"
              variant="primary"
              loading={submitting}
              loadingText="Saving..."
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Save Cost Center
            </Button>
          </div>
        }
      >
        <form id="cost-center-form" onSubmit={handleCcFormSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Cost Center Code"
              name="costCenterCode"
              placeholder="e.g. ENG-BE"
              value={ccFormData.costCenterCode}
              onChange={handleCcInputChange}
              requiredMark
              disabled={submitting}
              error={ccFormErrors.costCenterCode}
            />

            <FormInput
              label="Cost Center Name"
              name="costCenterName"
              placeholder="e.g. Backend Development"
              value={ccFormData.costCenterName}
              onChange={handleCcInputChange}
              requiredMark
              disabled={submitting}
              error={ccFormErrors.costCenterName}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <Select
              options={departmentOptions}
              value={selectedDepartmentOption}
              onChange={(opt) => handleCcSelectChange("departmentUuid", opt ? opt.value : "")}
              placeholder="Search and select department..."
              isSearchable
              isClearable
              styles={customSelectStyles}
              isDisabled={submitting}
            />
            {ccFormErrors.departmentUuid && (
              <span className="text-xs text-red-600 block mt-1">{ccFormErrors.departmentUuid}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Owner Employee <span className="text-red-500">*</span>
            </label>
            <Select
              options={employeeOptions}
              value={selectedOwnerOption}
              onChange={(opt) => handleCcSelectChange("ownerEmployeeId", opt ? opt.value : "")}
              placeholder="Search by name, user ID, or email..."
              isSearchable
              isClearable
              styles={customSelectStyles}
              isDisabled={submitting}
              formatOptionLabel={(option) => (
                <div className="flex flex-col py-0.5">
                  <span className="text-sm font-medium text-gray-900">{option.name}</span>
                  <span className="text-xs text-gray-500">
                    ID: {option.empId} &bull; {option.email}
                  </span>
                </div>
              )}
            />
            {ccFormErrors.ownerEmployeeId && (
              <span className="text-xs text-red-600 block mt-1">{ccFormErrors.ownerEmployeeId}</span>
            )}
          </div>

          <FormTextArea
            label="Description"
            name="description"
            placeholder="Optional description of this cost center..."
            value={ccFormData.description}
            onChange={handleCcInputChange}
            disabled={submitting}
            error={ccFormErrors.description}
          />

          <FormSelect
            label="Status"
            name="status"
            value={ccFormData.status}
            onChange={handleCcInputChange}
            options={[
              { label: "Active", value: "ACTIVE" },
              { label: "Inactive", value: "INACTIVE" },
            ]}
          />
        </form>
      </Modal>

      {/* Add / Edit Budget Dialog */}
      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
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
              onClick={() => setIsBudgetModalOpen(false)}
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
        <form id="cost-center-budget-form" onSubmit={handleBudgetFormSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Cost Center <span className="text-red-500">*</span>
            </label>
            <Select
              options={costCenterOptions}
              value={selectedCostCenterOption}
              onChange={(opt) => handleBudgetSelectChange("costCenterId", opt ? opt.value : "")}
              placeholder="Search and select cost center..."
              isSearchable
              isClearable
              styles={customSelectStyles}
              isDisabled={submitting}
            />
            {budgetFormErrors.costCenterId && (
              <span className="text-xs text-red-600 block mt-1">{budgetFormErrors.costCenterId}</span>
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
            value={budgetFormData.fiscalYear}
            onChange={handleBudgetInputChange}
            requiredMark
            disabled={submitting}
            error={budgetFormErrors.fiscalYear}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Budget Amount"
              name="budgetAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500000"
              value={budgetFormData.budgetAmount}
              onChange={handleBudgetAmountChange}
              requiredMark
              disabled={submitting}
              error={budgetFormErrors.budgetAmount}
            />

            <FormInput
              label="Available Budget"
              name="availableBudget"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 500000"
              value={budgetFormData.availableBudget}
              onChange={handleAvailableBudgetChange}
              requiredMark
              disabled={submitting}
              error={budgetFormErrors.availableBudget}
            />
          </div>
          {!currentBudget && (
            <p className="text-xs text-gray-400 -mt-2">
              Available budget defaults to the budget amount unless you change it manually.
            </p>
          )}
        </form>
      </Modal>

      {/* Read-only details view Cost Center */}
      <Modal
        isOpen={isCcViewOpen}
        onClose={() => setIsCcViewOpen(false)}
        title="Cost Center Details"
        subtitle="Read-only summary of the selected cost center."
        size="lg"
        fullScreenMobile
      >
        {viewCostCenter && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetailRow icon={<Hash className="h-5 w-5" />} label="Cost Center Code" value={viewCostCenter.costCenterCode} />
            <DetailRow icon={<Building2 className="h-5 w-5" />} label="Cost Center Name" value={viewCostCenter.costCenterName} />
            <DetailRow
              icon={<Briefcase className="h-5 w-5" />}
              label="Department"
              value={resolveDepartmentName(viewCostCenter.departmentUuid, viewCostCenter.departmentName)}
            />
            <DetailRow
              icon={<User className="h-5 w-5" />}
              label="Owner Employee"
              value={resolveOwnerName(viewCostCenter.ownerEmployeeId, viewCostCenter.ownerEmployeeName)}
            />
            <DetailRow
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Status"
              value={(viewCostCenter.status || "").toUpperCase() === "ACTIVE" ? "Active" : "Inactive"}
            />
            <DetailRow
              icon={<Calendar className="h-5 w-5" />}
              label="Created Date"
              value={formatDate(viewCostCenter.createdDate || viewCostCenter.createdAt)}
            />
            <div className="sm:col-span-2">
              <DetailRow
                icon={<FileText className="h-5 w-5" />}
                label="Description"
                value={viewCostCenter.description || "—"}
                breakAll
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Read-only details view Budget */}
      <Modal
        isOpen={isBudgetViewOpen}
        onClose={() => setIsBudgetViewOpen(false)}
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
              value={viewCostCenterForBudget ? `${viewCostCenterForBudget.costCenterCode} - ${viewCostCenterForBudget.costCenterName}` : viewBudget.costCenterId}
            />
            <DetailRow
              icon={<Briefcase className="h-5 w-5" />}
              label="Department"
              value={viewCostCenterForBudget ? resolveDepartmentName(viewCostCenterForBudget.departmentUuid) : "—"}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title={deleteTarget?.type === "cc" ? "Delete Cost Center" : "Delete Cost Center Budget"}
        message={
          deleteTarget?.type === "cc"
            ? `Are you sure you want to delete the cost center "${deleteTarget.data?.costCenterCode} - ${deleteTarget.data?.costCenterName}"? This action cannot be undone.`
            : `Are you sure you want to delete the budget for "${
                resolveCostCenter(deleteTarget?.data?.costCenterId)?.costCenterName || deleteTarget?.data?.costCenterId
              }" (${deleteTarget?.data?.fiscalYear})? This action cannot be undone.`
        }
        confirmText={deleteTarget?.type === "cc" ? "Delete Cost Center" : "Delete Budget"}
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeleteTarget(null);
        }}
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}
