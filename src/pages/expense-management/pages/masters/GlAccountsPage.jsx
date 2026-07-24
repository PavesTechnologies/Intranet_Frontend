
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
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

const glAccountService = {
  getAll: (params) => {
    return api.get("/xms/admin/gl-accounts", {
      baseURL: EXPENSE_API_BASE,
      params,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  getActive: () => {
    return api.get("/xms/admin/gl-accounts/active", {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  create: (payload) => {
    return api.post("/xms/admin/gl-accounts", payload, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  update: (id, payload) => {
    return api.put(`/xms/admin/gl-accounts/${id}`, payload, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
  delete: (id) => {
    return api.delete(`/xms/admin/gl-accounts/${id}`, {
      baseURL: EXPENSE_API_BASE,
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
  },
};
import { Fonts } from "@/components/Fonts/Fonts";

const ITEMS_PER_PAGE = 10;

export default function GlAccountsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole(["Admin", "Super_Admin"]);

  const [glAccounts, setGlAccounts] = useState([]);
  const [allGlAccounts, setAllGlAccounts] = useState([]); // local fallback for non-paginated endpoints
  const [isServerPaginated, setIsServerPaginated] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAccount, setCurrentAccount] = useState(null);
  const [formData, setFormData] = useState({
    glAccountCode: "",
    glAccountName: "",
    accountType: "",
    description: "",
    status: "ACTIVE",
  });
  const [formErrors, setFormErrors] = useState({});

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGlAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: searchTerm,
      };

      const res = await glAccountService.getAll(params);

      if (res.data && typeof res.data === "object" && !Array.isArray(res.data)) {
        // Server-side paginated structure
        const items = res.data.glAccounts || res.data.content || res.data.data || [];
        const total = res.data.total !== undefined ? res.data.total : (res.data.totalElements || items.length || 0);
        setGlAccounts(items);
        setTotalItems(total);
        setIsServerPaginated(true);
      } else if (Array.isArray(res.data)) {
        // Fallback for flat array response
        setAllGlAccounts(res.data);
        setIsServerPaginated(false);
      } else {
        setGlAccounts([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error("Failed to fetch GL Accounts:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to fetch GL Accounts.";
      showStatusToast(errMsg, "error");
      setGlAccounts([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    fetchGlAccounts();
  }, [fetchGlAccounts]);

  // Compute local search & pagination if API returned flat array
  const displayedAccounts = isServerPaginated
    ? glAccounts
    : (() => {
        const filtered = allGlAccounts.filter((acc) => {
          const code = (acc.glAccountCode || "").toLowerCase();
          const name = (acc.glAccountName || "").toLowerCase();
          const type = (acc.accountType || "").toLowerCase();
          const desc = (acc.description || "").toLowerCase();
          const q = searchTerm.toLowerCase();
          return code.includes(q) || name.includes(q) || type.includes(q) || desc.includes(q);
        });
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
      })();

  const totalCount = isServerPaginated
    ? totalItems
    : allGlAccounts.filter((acc) => {
        const code = (acc.glAccountCode || "").toLowerCase();
        const name = (acc.glAccountName || "").toLowerCase();
        const type = (acc.accountType || "").toLowerCase();
        const desc = (acc.description || "").toLowerCase();
        const q = searchTerm.toLowerCase();
        return code.includes(q) || name.includes(q) || type.includes(q) || desc.includes(q);
      }).length;

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

  // Form Handlers
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

  const validateForm = () => {
    const errors = {};
    const trimmedCode = formData.glAccountCode.trim();
    const trimmedName = formData.glAccountName.trim();
    const trimmedType = formData.accountType.trim();

    if (!trimmedCode) {
      errors.glAccountCode = "Account code is required.";
    } else if (trimmedCode.length < 3 || trimmedCode.length > 50) {
      errors.glAccountCode = "Account code must be between 3 and 50 characters.";
    } else if (!/^[a-zA-Z0-9-_]+$/.test(trimmedCode)) {
      errors.glAccountCode = "Only alphanumeric characters, hyphens, and underscores are allowed.";
    }

    if (!trimmedName) {
      errors.glAccountName = "Account name is required.";
    } else if (trimmedName.length < 3 || trimmedName.length > 100) {
      errors.glAccountName = "Account name must be between 3 and 100 characters.";
    }

    if (!trimmedType) {
      errors.accountType = "Account type is required.";
    } else if (trimmedType.length < 2 || trimmedType.length > 50) {
      errors.accountType = "Account type must be between 2 and 50 characters.";
    }

    if (formData.description && formData.description.length > 250) {
      errors.description = "Description cannot exceed 250 characters.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreateModal = () => {
    if (!isAdmin) return;
    setCurrentAccount(null);
    setFormData({
      glAccountCode: "",
      glAccountName: "",
      accountType: "",
      description: "",
      status: "ACTIVE",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleEditClick = (account) => {
    if (!isAdmin) return;
    setCurrentAccount(account);
    setFormData({
      glAccountCode: account.glAccountCode || "",
      glAccountName: account.glAccountName || "",
      accountType: account.accountType || "",
      description: account.description || "",
      status: account.status || "ACTIVE",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleDeleteClick = (account) => {
    if (!isAdmin) return;
    setAccountToDelete(account);
    setIsConfirmOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      glAccountCode: formData.glAccountCode.trim(),
      glAccountName: formData.glAccountName.trim(),
      accountType: formData.accountType.trim(),
      description: formData.description ? formData.description.trim() : "",
      status: formData.status,
    };

    try {
      setSubmitting(true);
      if (currentAccount) {
        await glAccountService.update(currentAccount.glAccountId, payload);
        showStatusToast("GL Account updated successfully!", "success");
      } else {
        await glAccountService.create(payload);
        showStatusToast("GL Account created successfully!", "success");
        setCurrentPage(1);
      }

      setIsModalOpen(false);
      fetchGlAccounts();
    } catch (err) {
      console.error("Error saving GL Account:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to save GL Account.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;

    try {
      setSubmitting(true);
      await glAccountService.delete(accountToDelete.glAccountId);
      showStatusToast("GL Account deleted successfully!", "success");

      setIsConfirmOpen(false);
      setAccountToDelete(null);

      // Handle page boundary when deleting the last item on the page
      if (displayedAccounts.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      } else {
        fetchGlAccounts();
      }
    } catch (err) {
      console.error("Error deleting GL Account:", err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || "Failed to delete GL Account.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Masters", to: "/expense-management/masters/expense-categories" },
    { label: "GL Accounts" },
  ];

  // Table Configuration
  const headers = isAdmin
    ? ["S.No", "Account Code", "Account Name", "Account Type", "Description", "Status", "Actions"]
    : ["S.No", "Account Code", "Account Name", "Account Type", "Description", "Status"];

  const columns = isAdmin
    ? ["serial_no", "glAccountCode", "glAccountName", "accountType", "description", "status", "actions"]
    : ["serial_no", "glAccountCode", "glAccountName", "accountType", "description", "status"];

  const tableRows = displayedAccounts.map((account, index) => {
    const statusVal = account.status || "INACTIVE";
    const rowObj = {
      serial_no: ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
      glAccountCode: account.glAccountCode || "N/A",
      glAccountName: account.glAccountName || "N/A",
      accountType: account.accountType || "N/A",
      description: account.description || "—",
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
            title="Edit GL Account"
            aria-label="Edit GL Account"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
            onClick={() => handleEditClick(account)}
          >
            <Pencil size={16} />
          </Button>

          <Button
            type="button"
            variant="link"
            size="icon"
            title="Delete GL Account"
            aria-label="Delete GL Account"
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800 transition rounded-md"
            onClick={() => handleDeleteClick(account)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      );
    }

    return rowObj;
  });

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">GL Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage GL account mappings for corporate expense postings.
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
              Add GL Account
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="w-full lg:max-w-md">
          <SearchInput
            onSearch={handleSearch}
            placeholder="Search GL accounts by code, name, description..."
          />
        </div>
      </div>

      {/* Data Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading GL Accounts..." />
          </div>
        ) : displayedAccounts.length === 0 ? (
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center text-center py-16">
              <Layers className="h-10 w-10 text-gray-300 mb-3" />
              <h2 className="text-sm font-semibold text-gray-700">No GL Accounts Found</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-sm">
                {searchTerm
                  ? `No GL accounts match the search term "${searchTerm}".`
                  : "Start by adding a new General Ledger mapping."}
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
        title={currentAccount ? "Edit GL Account" : "Add GL Account"}
        subtitle={
          currentAccount
            ? "Modify the selected General Ledger account properties."
            : "Register a new General Ledger account mapping."
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
              form="gl-account-form"
              variant="primary"
              loading={submitting}
              loadingText="Saving..."
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Save Account
            </Button>
          </div>
        }
      >
        <form id="gl-account-form" onSubmit={handleFormSubmit} className="space-y-4 py-2">
          <FormInput
            label="GL Account Code"
            name="glAccountCode"
            placeholder="e.g. GL-101000"
            value={formData.glAccountCode}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.glAccountCode}
          />

          <FormInput
            label="Account Name"
            name="glAccountName"
            placeholder="e.g. Office Supplies & Expenses"
            value={formData.glAccountName}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.glAccountName}
          />

          <FormInput
            label="Account Type"
            name="accountType"
            placeholder="e.g. Expense, Asset, Liability"
            value={formData.accountType}
            onChange={handleInputChange}
            requiredMark
            disabled={submitting}
            error={formErrors.accountType}
          />

          <FormTextArea
            label="Description"
            name="description"
            placeholder="Optional description of cost mapping..."
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isConfirmOpen}
        title="Delete GL Account Mapping"
        message={`Are you sure you want to delete the GL Account "${accountToDelete?.glAccountCode} - ${accountToDelete?.glAccountName}"? This action cannot be undone.`}
        confirmText="Delete Account"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsConfirmOpen(false);
          setAccountToDelete(null);
        }}
        isLoading={submitting}
        variant="danger"
      />
    </div>
