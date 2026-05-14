import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Pencil, UserX, UserCheck, Plus, Upload } from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";

import { useAuth } from "../../../../contexts/AuthContext";
import { showStatusToast } from "../../../../components/toastfy/toast";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import Modal from "../../../../components/Modal/modal";
import StatusBadge from "../../../../components/status/statusbadge";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";

const CreateUserForm = React.lazy(() => import("./CreateUser"));
const EditUserForm = React.lazy(() => import("./EditUser"));
const BulkUserUpload = React.lazy(() => import("./BulkUser"));

const ITEMS_PER_PAGE = 10;

export default function UsersTable() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [totalUsers, setTotalUsers] = useState(0);

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [userBulkUploadModalOpen, setUserBulkUploadModalOpen] = useState(false);

  const [selectedUseruuId, setSelectedUseruuId] = useState(null);

  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [actionType, setActionType] = useState("");
  const [confirming, setConfirming] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const accessDeniedShownRef = useRef(false);
  const { logout } = useAuth();

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  useEffect(() => {
    if (!token) {
      showStatusToast("Session expired. Please login again.", "warning");
      logout();
    }
  }, [token, logout]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);

      const res = await axios.get(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users`,
        {
          params: {
            page: currentPage,
            limit: ITEMS_PER_PAGE,
            search: searchTerm,
          },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      setUsers(res.data.users || []);
      setTotalUsers(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch users:", err);

      if (err.response?.status === 403) {
        if (!accessDeniedShownRef.current) {
          showStatusToast("Access denied. Admins only.", "error");
          accessDeniedShownRef.current = true;
        }
        navigate("/dashboard");
      } else if (err.response?.status === 401) {
        showStatusToast("Token tampered.", "error");
        logout();
      } else {
        showStatusToast("Failed to load users.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate, currentPage, searchTerm, logout]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const handleUserCreated = () => {
    setCreateModalOpen(false);
    showStatusToast("User created successfully!", "success");
    fetchUsers();
  };

  const handleUserUpdated = () => {
    setEditModalOpen(false);
    setSelectedUseruuId(null);
    showStatusToast("User updated successfully!", "success");
    fetchUsers();
  };

  const handleEditClick = (useruuId) => {
    setSelectedUseruuId(useruuId);
    setEditModalOpen(true);
  };

  const handleEditClose = () => {
    setEditModalOpen(false);
    setSelectedUseruuId(null);
  };

  const handleToggleClick = (useruuId, currentStatus) => {
    setUserToToggle(useruuId);
    setActionType(currentStatus ? "deactivate" : "activate");
    setConfirmModalOpen(true);
  };

  const closeConfirmModal = () => {
    if (confirming) return;

    setConfirmModalOpen(false);
    setUserToToggle(null);
    setActionType("");
  };

  const confirmToggle = async () => {
    if (!userToToggle) return;

    try {
      setConfirming(true);

      if (actionType === "deactivate") {
        await axios.delete(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/uuid/${userToToggle}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
        );

        showStatusToast("User deactivated successfully.", "success");
      } else {
        await axios.patch(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/uuid/${userToToggle}/activate`,
          {},
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
        );

        showStatusToast("User activated successfully.", "success");
      }

      await fetchUsers();
      closeConfirmModal();
    } catch (err) {
      console.error(`${actionType} failed:`, err);
      showStatusToast(`Failed to ${actionType} user.`, "error");
    } finally {
      setConfirming(false);
    }
  };

  const headers = ["S.no", "Name", "Email", "Contact", "Status", "Actions"];
  const columns = ["serial_no", "name", "mail", "contact", "status", "actions"];

  const tableData = users.map((user, index) => {
    let formattedContact = user.contact || "N/A";

    if (user.contact) {
      const phoneNumber = parsePhoneNumberFromString(
        "+" + user.contact.replace(/\D/g, ""),
      );

      if (phoneNumber) {
        formattedContact = phoneNumber.formatInternational();
      }
    }

    return {
      serial_no: ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
      name: `${user.first_name || ""} ${user.last_name || ""}`.trim() || "N/A",
      mail: user.mail || "N/A",
      contact: formattedContact,
      status: (
        <StatusBadge label={user.is_active ? "Active" : "Inactive"} size="sm" />
      ),
      actions: (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="link"
            size="icon"
            title="Edit"
            aria-label="Edit user"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
            onClick={() => handleEditClick(user.user_uuid)}
          >
            <Pencil size={17} />
          </Button>

          {user.is_active ? (
            <Button
              type="button"
              variant="link"
              size="icon"
              title="Deactivate"
              aria-label="Deactivate user"
              className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-800"
              onClick={() => handleToggleClick(user.user_uuid, true)}
            >
              <UserX size={17} />
            </Button>
          ) : (
            <Button
              type="button"
              variant="link"
              size="icon"
              title="Activate"
              aria-label="Activate user"
              className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-800"
              onClick={() => handleToggleClick(user.user_uuid, false)}
            >
              <UserCheck size={17} />
            </Button>
          )}
        </div>
      ),
    };
  });

  return (
    <div className="w-full min-w-0 px-4 py-4 sm:px-6">
      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className={Fonts.heading3}>Users</h2>
          <p className={Fonts.paragraphMuted}>
            Manage user creation, bulk upload, roles, and activation status.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Button
            onClick={() => setUserBulkUploadModalOpen(true)}
            variant="primary"
            size="medium"
            className="w-full whitespace-nowrap sm:w-auto"
          >
            <Upload size={16} />
            Bulk Upload
          </Button>

          <Button
            onClick={() => setCreateModalOpen(true)}
            variant="primary"
            size="medium"
            className="w-full whitespace-nowrap sm:w-auto"
          >
            <Plus size={16} />
            Add User
          </Button>

          <Button
            onClick={() => navigate("/user-management/users/roles")}
            variant="secondary"
            size="medium"
            className="w-full whitespace-nowrap sm:w-auto"
          >
            User Roles
          </Button>
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="w-full lg:max-w-md">
          <SearchInput
            onSearch={handleSearch}
            placeholder="Search users by name, email, or contact..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading users..." />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            {searchTerm
              ? `No users found matching "${searchTerm}".`
              : "No users found."}
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <GenericTable
                headers={headers}
                rows={tableData}
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

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New User"
        subtitle="Fill out the form to add a new user to the system."
        size="3xl"
        fullScreenMobile
        maxHeight="max-h-[92vh]"
        bodyClassName="p-0 overflow-visible"
        scrollable={false}
        closeOnBackdrop={false}
      >
        <Suspense fallback={<LoadingSpinner text="Loading create form..." />}>
          <CreateUserForm
            onSuccess={handleUserCreated}
            onClose={() => setCreateModalOpen(false)}
          />
        </Suspense>
      </Modal>

      <Modal
        isOpen={userBulkUploadModalOpen}
        onClose={() => setUserBulkUploadModalOpen(false)}
        title="Bulk Upload Users"
        subtitle="Upload Excel with first_name, last_name, mail, and contact columns."
        size="xl"
        fullScreenMobile
        maxHeight="max-h-[92vh]"
        bodyClassName="p-0 overflow-visible"
        scrollable={false}
        closeOnBackdrop={false}
      >
        <Suspense fallback={<LoadingSpinner text="Loading bulk upload..." />}>
          <BulkUserUpload
            onClose={() => setUserBulkUploadModalOpen(false)}
            onSuccess={fetchUsers}
          />
        </Suspense>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={handleEditClose}
        title="Edit User"
        subtitle="Update the user information below."
        size="3xl"
        fullScreenMobile
        maxHeight="max-h-[92vh]"
        bodyClassName="p-0 overflow-visible"
        scrollable={false}
        closeOnBackdrop={false}
      >
        {selectedUseruuId && (
          <Suspense fallback={<LoadingSpinner text="Loading edit form..." />}>
            <EditUserForm
              userId={selectedUseruuId}
              onSuccess={handleUserUpdated}
              onClose={handleEditClose}
            />
          </Suspense>
        )}
      </Modal>

      <Modal
        isOpen={isConfirmModalOpen}
        onClose={closeConfirmModal}
        title={
          actionType === "deactivate"
            ? "Confirm Deactivation"
            : "Confirm Activation"
        }
        subtitle={
          actionType === "deactivate"
            ? "Are you sure you want to deactivate this user?"
            : "Are you sure you want to activate this user?"
        }
        size="md"
        closeOnBackdrop={!confirming}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeConfirmModal}
              disabled={confirming}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant={actionType === "deactivate" ? "danger" : "success"}
              onClick={confirmToggle}
              loading={confirming}
              loadingText={
                actionType === "deactivate"
                  ? "Deactivating..."
                  : "Activating..."
              }
              disabled={confirming}
              className="w-full sm:w-auto"
            >
              {actionType === "deactivate" ? "Deactivate" : "Activate"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-gray-600">
          This action will update the selected user status.
        </p>
      </Modal>
    </div>
  );
}
