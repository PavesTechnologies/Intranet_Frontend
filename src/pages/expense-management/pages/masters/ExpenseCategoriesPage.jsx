
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
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
import { Fonts } from "@/components/Fonts/Fonts";

const EXPENSE_API_BASE = window.__APP_CONFIG__?.EXPENSE_MANAGEMENT_URL || "";

const expenseCategoryService = {
  getAll: (params) => {
    return api.get("/xms/admin/expense-categories", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  getById: (id) => {
    return api.get(`/xms/admin/expense-categories/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  create: (payload) => {
    return api.post("/xms/admin/expense-categories", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  update: (id, payload) => {
    return api.put(`/xms/admin/expense-categories/${id}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  delete: (id) => {
    return api.delete(`/xms/admin/expense-categories/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  getActive: () => {
    return api.get("/xms/admin/expense-categories/active", {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
};

const glAccountService = {
  getActive: async () => {
    try {
      // First try /xms/admin/gl-accounts/active which is the mapped backend endpoint
      return await api.get("/xms/admin/gl-accounts/active", {
        baseURL: EXPENSE_API_BASE,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    } catch (e) {
      console.warn("Primary endpoint /xms/admin/gl-accounts/active failed, trying fallback /api/v1/gl-accounts/active...");
      return await api.get("/api/v1/gl-accounts/active", {
        baseURL: EXPENSE_API_BASE,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    }
  },
};

const ITEMS_PER_PAGE = 10;

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

export default function ExpenseCategoriesPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["Admin", "Super_Admin"]);

  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [activeGlAccounts, setActiveGlAccounts] = useState([]);
  const [isServerPaginated, setIsServerPaginated] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    categoryCode: "",
    categoryName: "",
    glAccountId: "",
    description: "",
    receiptRequired: true,
    maxLimit: 0,
    taxCode: "",
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    status: "ACTIVE",
  });
  const [formErrors, setFormErrors] = useState({});

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const getGlAccountsList = useCallback(() => {
    if (Array.isArray(activeGlAccounts)) return activeGlAccounts;
    if (activeGlAccounts && typeof activeGlAccounts === "object") {
      return activeGlAccounts.glAccounts || activeGlAccounts.content || activeGlAccounts.data || [];
    }
    return [];
  }, [activeGlAccounts]);

  const fetchActiveGlAccounts = async () => {
    try {
      const res = await glAccountService.getActive();
      setActiveGlAccounts(res.data || []);
    } catch (err) {
      console.error("Failed to fetch active GL accounts:", err);
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await expenseCategoryService.getAll();

      let items = [];
      if (res.data) {
        if (Array.isArray(res.data)) {
          items = res.data;
        } else if (res.data.data && Array.isArray(res.data.data)) {
          items = res.data.data;
        } else {
          items = res.data.expenseCategories || res.data.content || [];
        }
      }

      setAllCategories(items);
      setIsServerPaginated(false);
      setCategories([]);
      setTotalItems(0);
    } catch (err) {
      console.error("Failed to fetch expense categories:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch expense categories.";
      showStatusToast(errMsg, "error");
      setCategories([]);
      setAllCategories([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveGlAccounts();
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const displayedCategories = isServerPaginated
    ? (categories || [])
    : (() => {
        const list = Array.isArray(allCategories) ? allCategories : [];
        const filtered = list.filter((cat) => {
          const code = (cat.categoryCode || "").toLowerCase();
          const name = (cat.categoryName || "").toLowerCase();
          const desc = (cat.description || "").toLowerCase();
          const tax = (cat.taxCode || "").toLowerCase();
          const q = searchTerm.toLowerCase();
          return code.includes(q) || name.includes(q) || desc.includes(q) || tax.includes(q);
        });

        // Retrieve active GL Accounts list for sorting
        const glAccounts = getGlAccountsList();
        const glMap = new Map(glAccounts.map((acc) => [acc.glAccountId, acc]));

        // Sort by GL Account ID / Code (ascending)
        const sorted = [...filtered].sort((a, b) => {
          const glA = glMap.get(a.glAccountId);
          const glB = glMap.get(b.glAccountId);

          const displayA = glA
            ? `${glA.glAccountCode} - ${glA.glAccountName}`
            : (a.glAccountId || "").toString();
          const displayB = glB
            ? `${glB.glAccountCode} - ${glB.glAccountName}`
            : (b.glAccountId || "").toString();

          return displayA.localeCompare(displayB, undefined, { numeric: true, sensitivity: "base" });
        });

        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return sorted.slice(start, start + ITEMS_PER_PAGE);
      })();

  const totalCount = isServerPaginated
    ? totalItems
    : (() => {
        const list = Array.isArray(allCategories) ? allCategories : [];
        return list.filter((cat) => {
          const code = (cat.categoryCode || "").toLowerCase();
          const name = (cat.categoryName || "").toLowerCase();
          const desc = (cat.description || "").toLowerCase();
          const tax = (cat.taxCode || "").toLowerCase();
          const q = searchTerm.toLowerCase();
          return code.includes(q) || name.includes(q) || desc.includes(q) || tax.includes(q);
        }).length;
      })();

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
    setCurrentPage(1);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

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

  const validateForm = () => {
    const errors = {};
    const trimmedCode = formData.categoryCode.trim();
    const trimmedName = formData.categoryName.trim();

    if (!trimmedCode) {
      errors.categoryCode = "Category code is required.";
    } else if (trimmedCode.length < 3 || trimmedCode.length > 50) {
      errors.categoryCode = "Category code must be between 3 and 50 characters.";
    } else if (!/^[a-zA-Z0-9-_]+$/.test(trimmedCode)) {
      errors.categoryCode = "Only alphanumeric characters, hyphens, and underscores are allowed.";
    }

    if (!trimmedName) {
      errors.categoryName = "Category name is required.";
    } else if (trimmedName.length < 3 || trimmedName.length > 100) {
      errors.categoryName = "Category name must be between 3 and 100 characters.";
    }

    if (!formData.glAccountId) {
      errors.glAccountId = "GL Account mapping is required.";
    }

    if (formData.maxLimit === undefined || formData.maxLimit === "" || Number(formData.maxLimit) < 0) {
      errors.maxLimit = "Max limit must be a positive number.";
    }

    if (!formData.effectiveFrom) {
      errors.effectiveFrom = "Effective From date is required.";
    }

    if (formData.description && formData.description.length > 250) {
      errors.description = "Description cannot exceed 250 characters.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    if (!isAdmin) return;
    setCurrentCategory(null);
    setFormData({
      categoryCode: "",
      categoryName: "",
      glAccountId: "",
      description: "",
      receiptRequired: true,
      maxLimit: 0,
      taxCode: "",
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      status: "ACTIVE",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditClick = (cat) => {
    if (!isAdmin) return;
    setCurrentCategory(cat);
    setFormData({
      categoryCode: cat.categoryCode || "",
      categoryName: cat.categoryName || "",
      glAccountId: cat.glAccountId || "",
      description: cat.description || "",
      receiptRequired: cat.receiptRequired !== undefined ? cat.receiptRequired : true,
      maxLimit: cat.maxLimit || 0,
      taxCode: cat.taxCode || "",
      effectiveFrom: cat.effectiveFrom || "",
      effectiveTo: cat.effectiveTo || "",
      status: cat.status || "ACTIVE",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteClick = (cat) => {
    if (!isAdmin) return;
    setCategoryToDelete(cat);
    setIsConfirmOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      categoryCode: formData.categoryCode.trim(),
      categoryName: formData.categoryName.trim(),
      glAccountId: formData.glAccountId,
      description: formData.description ? formData.description.trim() : "",
      receiptRequired: !!formData.receiptRequired,
      maxLimit: Number(formData.maxLimit),
      taxCode: formData.taxCode ? formData.taxCode.trim() : "",
      effectiveFrom: formData.effectiveFrom,
      effectiveTo: formData.effectiveTo || null,
      status: formData.status,
    };

    try {
      setSubmitting(true);
      if (currentCategory) {
        await expenseCategoryService.update(currentCategory.categoryId, payload);
        showStatusToast("Expense Category updated successfully!", "success");
      } else {
        await expenseCategoryService.create(payload);
        showStatusToast("Expense Category created successfully!", "success");
        setCurrentPage(1);
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      console.error("Error saving Expense Category:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save Expense Category.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      setSubmitting(true);
      await expenseCategoryService.delete(categoryToDelete.categoryId);
      showStatusToast("Expense Category deleted successfully!", "success");

      setIsConfirmOpen(false);
      setCategoryToDelete(null);

      if (displayedCategories.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
      fetchCategories();
    } catch (err) {
      console.error("Error deleting Expense Category:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete Expense Category.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Masters", to: "/expense-management/masters/expense-categories" },
    { label: "Expense Categories" },
  ];

  const headers = isAdmin
    ? ["S.No", "Category Code", "Category Name", "GL Account", "Max Limit", "Receipt Req.", "Status", "Actions"]
    : ["S.No", "Category Code", "Category Name", "GL Account", "Max Limit", "Receipt Req.", "Status"];

  const columns = isAdmin
    ? ["serial_no", "categoryCode", "categoryName", "glAccount", "maxLimit", "receiptRequired", "status", "actions"]
    : ["serial_no", "categoryCode", "categoryName", "glAccount", "maxLimit", "receiptRequired", "status"];

  const tableRows = displayedCategories.map((cat, index) => {
    const statusVal = cat.status || "INACTIVE";
    const glAccountObj = getGlAccountsList().find((a) => a.glAccountId === cat.glAccountId);
    const glAccountDisplay = glAccountObj
      ? `${glAccountObj.glAccountCode} - ${glAccountObj.glAccountName}`
      : cat.glAccountId || "N/A";

    const rowObj = {
      serial_no: ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
      categoryCode: cat.categoryCode || "N/A",
      categoryName: cat.categoryName || "N/A",
      glAccount: glAccountDisplay,
      maxLimit: cat.maxLimit !== undefined ? `${cat.maxLimit}` : "—",
      receiptRequired: (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            cat.receiptRequired ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"
          }`}
        >
          {cat.receiptRequired ? "Required" : "Not Required"}
        </span>
      ),
      status: (
        <StatusBadge label={statusVal === "ACTIVE" || statusVal === "active" ? "Active" : "Inactive"} size="sm" />
      ),
    };

    if (isAdmin) {
      rowObj.actions = (
        <div className="flex items-center gap-2 justify-center">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Edit Expense Category"
            aria-label="Edit Expense Category"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => handleEditClick(cat)}
          >
            <Pencil size={16} />
          </Button>

          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete Expense Category"
            aria-label="Delete Expense Category"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => handleDeleteClick(cat)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      );
    }

    return rowObj;
  });

  const glAccountOptions = [...getGlAccountsList()]
    .sort((a, b) => {
      const codeA = (a.glAccountCode || "").toString();
      const codeB = (b.glAccountCode || "").toString();
      return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: "base" });
    })
    .map((acc) => ({
      value: acc.glAccountId,
      label: `${acc.glAccountCode} - ${acc.glAccountName}`,
      code: acc.glAccountCode,
      name: acc.glAccountName,
    }));

  const selectedGlOption = glAccountOptions.find((opt) => opt.value === formData.glAccountId) || null;

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">Expense Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage corporate expense categories and configuration limits.
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
              Add Category
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="w-full lg:max-w-md">
          <SearchInput
            onSearch={handleSearch}
            placeholder="Search categories by code, name, description..."
          />
        </div>
      </div>

      {/* Data Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading Expense Categories..." />
          </div>
        ) : displayedCategories.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Layers className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No Expense Categories Found</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                {searchTerm
                  ? `No expense categories match the search term "${searchTerm}".`
                  : "Start by registering a new corporate expense category."}
              </p>
            </PageCardContent>
          </PageCard>
        ) : (
          <>
            <div className="w-full overflow-x-auto rounded-lg">
              <GenericTable
                headers={headers}
                rows={tableRows}
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={currentCategory ? "Edit Expense Category" : "Add Expense Category"}
        subtitle={
          currentCategory
            ? "Modify the configurations of the selected expense category."
            : "Define a new corporate expense category with rules and limits."
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
              form="expense-category-form"
              variant="primary"
              loading={submitting}
              loadingText="Saving..."
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Save Category
            </Button>
          </div>
        }
      >
        <form id="expense-category-form" onSubmit={handleFormSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Category Code"
              name="categoryCode"
              placeholder="e.g. EC-MEALS"
              value={formData.categoryCode}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.categoryCode}
            />

            <FormInput
              label="Category Name"
              name="categoryName"
              placeholder="e.g. Business Meals"
              value={formData.categoryName}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.categoryName}
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              GL Account Mapping <span className="text-red-500">*</span>
            </label>
            <Select
              options={glAccountOptions}
              value={selectedGlOption}
              onChange={(opt) => handleSelectChange("glAccountId", opt ? opt.value : "")}
              placeholder="Search and select GL Account..."
              isSearchable
              styles={customSelectStyles}
              isDisabled={submitting}
              filterOption={(option, rawInput) => {
                const input = rawInput.toLowerCase();
                const data = option.data;
                const id = (data.value || "").toLowerCase();
                const code = (data.code || "").toLowerCase();
                const name = (data.name || "").toLowerCase();
                const label = (option.label || "").toLowerCase();
                return id.includes(input) || code.includes(input) || name.includes(input) || label.includes(input);
              }}
            />
            {formErrors.glAccountId && (
              <span className="text-xs text-red-600 block mt-1">{formErrors.glAccountId}</span>
            )}
          </div>

          <FormTextArea
            label="Description"
            name="description"
            placeholder="Describe policy details, allowed expenses..."
            value={formData.description}
            onChange={handleInputChange}
            disabled={submitting}
            error={formErrors.description}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormSelect
              label="Receipt Required?"
              name="receiptRequired"
              value={formData.receiptRequired}
              onChange={(e) => handleSelectChange("receiptRequired", e.target.value)}
              options={[
                { label: "Yes", value: true },
                { label: "No", value: false },
              ]}
              disabled={submitting}
            />

            <FormInput
              label="Max Limit"
              name="maxLimit"
              type="number"
              min="0"
              placeholder="0 (Unlimited)"
              value={formData.maxLimit}
              onChange={handleInputChange}
              requiredMark
              disabled={submitting}
              error={formErrors.maxLimit}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput
              label="Tax Code"
              name="taxCode"
              placeholder="e.g. GST-18"
              value={formData.taxCode}
              onChange={handleInputChange}
              disabled={submitting}
            />

            <FormSelect
              label="Status"
              name="status"
              value={formData.status}
              onChange={(e) => handleSelectChange("status", e.target.value)}
              options={[
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive", value: "INACTIVE" },
              ]}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete Expense Category"
        message={`Are you sure you want to delete the Expense Category "${categoryToDelete?.categoryCode} - ${categoryToDelete?.categoryName}"? This action cannot be undone.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setCategoryToDelete(null);
        }}
        isLoading={submitting}
        variant="danger"
      />
    </div>
  );
}
