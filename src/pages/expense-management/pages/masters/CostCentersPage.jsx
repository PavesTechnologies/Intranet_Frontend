
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

export default function CostCentersPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["Admin", "Super_Admin"]);

  const [costCenters, setCostCenters] = useState([]);
  const [allCostCenters, setAllCostCenters] = useState([]);
  const [isServerPaginated, setIsServerPaginated] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [statsCostCenters, setStatsCostCenters] = useState([]);

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCostCenter, setCurrentCostCenter] = useState(null);
  const [formData, setFormData] = useState({
    costCenterCode: "",
    costCenterName: "",
    departmentUuid: "",
    description: "",
    ownerEmployeeId: "",
    status: "ACTIVE",
  });
  const [formErrors, setFormErrors] = useState({});

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [costCenterToDelete, setCostCenterToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewCostCenter, setViewCostCenter] = useState(null);

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

  const fetchStats = useCallback(async () => {
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

  const fetchCostCenters = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm,
        department: departmentFilter || undefined,
        status: statusFilter || undefined,
      };

      const res = await costCenterService.getAll(params);

      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        const items = res.data.costCenters || res.data.content || res.data.data || [];
        const total = res.data.total !== undefined ? res.data.total : res.data.totalElements ?? items.length ?? 0;
        setCostCenters(items);
        setTotalItems(total);
        setIsServerPaginated(true);
      } else if (Array.isArray(res.data)) {
        setAllCostCenters(res.data);
        setIsServerPaginated(false);
      } else {
        setCostCenters([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch Cost Centers:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch Cost Centers.";
      showStatusToast(errMsg, "error");
      setCostCenters([]);
      setTotalItems(0);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, departmentFilter, statusFilter]);

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchCostCenters();
  }, [fetchCostCenters]);

  const matchesFilters = useCallback(
    (cc) => {
      const code = (cc.costCenterCode || "").toLowerCase();
      const name = (cc.costCenterName || "").toLowerCase();
      const desc = (cc.description || "").toLowerCase();
      const q = searchTerm.toLowerCase();
      const matchesSearch = !q || code.includes(q) || name.includes(q) || desc.includes(q);
      const matchesDept = !departmentFilter || cc.departmentUuid === departmentFilter;
      const matchesStatus = !statusFilter || (cc.status || "").toUpperCase() === statusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    },
    [searchTerm, departmentFilter, statusFilter]
  );

  const displayedCostCenters = isServerPaginated
    ? costCenters
    : (() => {
        const filtered = allCostCenters.filter(matchesFilters);
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const totalCount = isServerPaginated ? totalItems : allCostCenters.filter(matchesFilters).length;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 0;

  const totalCostCentersCount = statsCostCenters.length;
  const activeCostCentersCount = statsCostCenters.filter((c) => (c.status || "").toUpperCase() === "ACTIVE").length;
  const inactiveCostCentersCount = statsCostCenters.filter((c) => (c.status || "").toUpperCase() === "INACTIVE").length;

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
    setCurrentPage(1);
  }, []);

  const handleDepartmentFilterChange = (e) => {
    setDepartmentFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("");
    setStatusFilter("");
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

  const validateForm = () => {
    const errors = {};
    const trimmedCode = formData.costCenterCode.trim();
    const trimmedName = formData.costCenterName.trim();

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

    if (!formData.departmentUuid) {
      errors.departmentUuid = "Department is required.";
    }

    if (!formData.ownerEmployeeId) {
      errors.ownerEmployeeId = "Owner employee is required.";
    }

    if (formData.description && formData.description.length > 250) {
      errors.description = "Description cannot exceed 250 characters.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    if (!isAdmin) return;
    setCurrentCostCenter(null);
    setFormData({
      costCenterCode: "",
      costCenterName: "",
      departmentUuid: "",
      description: "",
      ownerEmployeeId: "",
      status: "ACTIVE",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditClick = (cc) => {
    if (!isAdmin) return;
    setCurrentCostCenter(cc);
    setFormData({
      costCenterCode: cc.costCenterCode || "",
      costCenterName: cc.costCenterName || "",
      departmentUuid: cc.departmentUuid || "",
      description: cc.description || "",
      ownerEmployeeId: cc.ownerEmployeeId != null ? String(cc.ownerEmployeeId) : "",
      status: cc.status || "ACTIVE",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleViewClick = (cc) => {
    setViewCostCenter(cc);
    setIsViewOpen(true);
  };

  const handleDeleteClick = (cc) => {
    if (!isAdmin) return;
    setCostCenterToDelete(cc);
    setIsConfirmOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      costCenterCode: formData.costCenterCode.trim(),
      costCenterName: formData.costCenterName.trim(),
      departmentUuid: formData.departmentUuid,
      description: formData.description ? formData.description.trim() : "",
      ownerEmployeeId: formData.ownerEmployeeId,
      status: formData.status,
    };

    try {
      setSubmitting(true);
      if (currentCostCenter) {
        await costCenterService.update(currentCostCenter.costCenterId, payload);
        showStatusToast("Cost Center updated successfully!", "success");
      } else {
        await costCenterService.create(payload);
        showStatusToast("Cost Center created successfully!", "success");
        setCurrentPage(1);
      }

      setIsModalOpen(false);
      fetchCostCenters();
      fetchStats();
    } catch (err) {
      console.error("Error saving Cost Center:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save Cost Center.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!costCenterToDelete) return;

    try {
      setSubmitting(true);
      await costCenterService.delete(costCenterToDelete.costCenterId);
      showStatusToast("Cost Center deleted successfully!", "success");

      setIsConfirmOpen(false);
      setCostCenterToDelete(null);

      if (displayedCostCenters.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchCostCenters();
      }
      fetchStats();
    } catch (err) {
      console.error("Error deleting Cost Center:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete Cost Center.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Masters", to: "/expense-management/masters/expense-categories" },
    { label: "Cost Centers" },
  ];

  const resolveDepartmentName = (departmentUuid, fallbackName) => {
    if (fallbackName) return fallbackName;
    const dept = getDepartmentList().find((d) => d.department_uuid === departmentUuid);
    return dept?.department_name || departmentUuid || "N/A";
  };

  const resolveOwnerName = (ownerEmployeeId, fallbackName) => {
    if (fallbackName) return fallbackName;
    const emp = getEmployeeList().find((e) => String(e.employee_id) === String(ownerEmployeeId));
    if (!emp) return ownerEmployeeId || "N/A";
    const fullName = [emp.first_name, emp.last_name].filter(Boolean).join(" ");
    return `${fullName} (${emp.employee_id})`;
  };

  const headers = [
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
  const columns = [
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

  const tableRows = displayedCostCenters.map((cc, index) => {
    const statusVal = (cc.status || "INACTIVE").toUpperCase();

    return {
      serial_no: ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
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
            onClick={() => handleViewClick(cc)}
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
                onClick={() => handleEditClick(cc)}
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
                onClick={() => handleDeleteClick(cc)}
              >
                <Trash2 size={16} />
              </Button>
            </>
          )}
        </div>
      ),
    };
  });

  const departmentOptions = getDepartmentList().map((d) => ({
    value: d.department_uuid,
    label: d.department_name,
  }));
  const selectedDepartmentOption = departmentOptions.find((o) => o.value === formData.departmentUuid) || null;

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
  const selectedOwnerOption = employeeOptions.find((o) => o.value === formData.ownerEmployeeId) || null;

  const departmentFilterOptions = [{ label: "All Departments", value: "" }, ...departmentOptions];
  const statusFilterOptions = [
    { label: "All Statuses", value: "" },
    { label: "Active", value: "ACTIVE" },
    { label: "Inactive", value: "INACTIVE" },
  ];

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      {/* Page Header */}
      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">Cost Center Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage cost centers used for expense allocation and departmental ownership.
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
              Create Cost Center
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Cost Centers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCostCentersCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Cost Centers</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{activeCostCentersCount}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <XCircle size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Inactive Cost Centers</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{inactiveCostCentersCount}</p>
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
              placeholder="Search by cost center code or name..."
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
            label="Status"
            name="statusFilter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={statusFilterOptions}
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
            <LoadingSpinner text="Loading Cost Centers..." />
          </div>
        ) : loadError ? (
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
                {searchTerm || departmentFilter || statusFilter
                  ? "No cost centers match the selected search and filters."
                  : "Start by creating a new cost center for expense allocation."}
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

      {/* Create / Edit Drawer */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
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
              onClick={() => setIsModalOpen(false)}
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
        <form id="cost-center-form" onSubmit={handleFormSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Cost Center Code"
              name="costCenterCode"
              placeholder="e.g. ENG-BE"
              value={formData.costCenterCode}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.costCenterCode}
            />

            <FormInput
              label="Cost Center Name"
              name="costCenterName"
              placeholder="e.g. Backend Development"
              value={formData.costCenterName}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.costCenterName}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Department <span className="text-red-500">*</span>
            </label>
            <Select
              options={departmentOptions}
              value={selectedDepartmentOption}
              onChange={(opt) => handleSelectChange("departmentUuid", opt ? opt.value : "")}
              placeholder="Search and select department..."
              isSearchable
              isClearable
              styles={customSelectStyles}
              isDisabled={submitting}
            />
            {formErrors.departmentUuid && (
              <span className="text-xs text-red-600 block mt-1">{formErrors.departmentUuid}</span>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Owner Employee <span className="text-red-500">*</span>
            </label>
            <Select
              options={employeeOptions}
              value={selectedOwnerOption}
              onChange={(opt) => handleSelectChange("ownerEmployeeId", opt ? opt.value : "")}
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
            {formErrors.ownerEmployeeId && (
              <span className="text-xs text-red-600 block mt-1">{formErrors.ownerEmployeeId}</span>
            )}
          </div>

          <FormTextArea
            label="Description"
            name="description"
            placeholder="Optional description of this cost center..."
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
        </form>
      </Modal>

      {/* View Cost Center */}
      <Modal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
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

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete Cost Center"
        message={`Are you sure you want to delete the cost center "${costCenterToDelete?.costCenterCode} - ${costCenterToDelete?.costCenterName}"? This action cannot be undone.`}
        confirmText="Delete Cost Center"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setCostCenterToDelete(null);
        }}
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}
