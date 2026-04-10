import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import Button from "../../../../components/Button/Button";
import SearchInput from "../../../../components/filter/Searchbar";
import Modal from "../../../../components/Modal/modal";
import { Pencil, UserX, UserCheck } from "lucide-react";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useAuth } from "../../../../contexts/AuthContext";
import LoadingSpinner from "../../../../components/LoadingSpinner";

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
  const [selectedUseruuId, setSelectedUseruuId] = useState(null);
  const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState(null);
  const [actionType, setActionType] = useState("");
  const [userBulkUploadModalOpen, setUserBulkUploadModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false); // ✅ moved inside component

  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const accessDeniedShownRef = useRef(false);
  const { logout } = useAuth();

  useEffect(() => {
    if (!token) {
      showStatusToast("Session expired. Please login again.", "warning");
      logout();
    }
  }, [token, navigate]);

  // ✅ Fetch from backend with pagination & search
  const fetchUsers = useCallback(async () => {
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
          headers: { Authorization: `Bearer ${token}` },
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
        showStatusToast("Token tampered", "error");
        logout();
      } else {
        showStatusToast("Failed to load users.", "error");
      }
    } finally {
      setLoading(false);
    }
  }, [token, navigate, currentPage, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  const confirmToggle = async () => {
    if (!userToToggle) return;
    try {
      if (actionType === "deactivate") {
        await axios.delete(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/uuid/${userToToggle}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        showStatusToast("User deactivated successfully.", "success");
      } else {
        await axios.patch(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/uuid/${userToToggle}/activate`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
        showStatusToast("User activated successfully.", "success");
      }
      fetchUsers();
    } catch (err) {
      console.error(`${actionType} failed:`, err);
      showStatusToast(`Failed to ${actionType} user.`, "error");
    } finally {
      setConfirmModalOpen(false);
      setUserToToggle(null);
      setActionType("");
    }
  };

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  const headers = ["ID", "Name", "Email", "Contact", "Status", "Actions"];
  const columns = ["user_id", "name", "mail", "contact", "status", "actions"];

  const tableData = users.map((user) => {
    let formattedContact = user.contact;
    if (user.contact) {
      const phoneNumber = parsePhoneNumberFromString(
        "+" + user.contact.replace(/\D/g, ""),
      );
      if (phoneNumber) {
        formattedContact = phoneNumber.formatInternational();
      }
    }

    return {
      user_id: user.user_id,
      name: `${user.first_name} ${user.last_name}`,
      mail: user.mail,
      contact: formattedContact,
      status: user.is_active ? "Active" : "Inactive",
      actions: (
        <div className="flex gap-4 items-center">
          <span
            className="cursor-pointer text-blue-600 hover:text-blue-800"
            onClick={() => handleEditClick(user.user_uuid)}
            title="Edit"
          >
            <Pencil size={18} />
          </span>

          {user.is_active ? (
            <span
              className="cursor-pointer text-red-600 hover:text-red-800"
              onClick={() => handleToggleClick(user.user_uuid, true)}
              title="Deactivate"
            >
              <UserX size={18} />
            </span>
          ) : (
            <span
              className="cursor-pointer text-green-600 hover:text-green-800"
              onClick={() => handleToggleClick(user.user_uuid, false)}
              title="Activate"
            >
              <UserCheck size={18} />
            </span>
          )}
        </div>
      ),
    };
  });

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-2xl font-semibold text-gray-800">Users</h2>
        <div className="space-x-3 flex flex-wrap gap-2">
          <Button
            onClick={() => setUserBulkUploadModalOpen(true)}
            variant="primary"
            size="medium"
          >
            + Add User Bulk
          </Button>
          <Button
            onClick={() => setCreateModalOpen(true)}
            variant="primary"
            size="medium"
          >
            + Add User
          </Button>
          <Button
            onClick={() => navigate("/user-management/users/roles")}
            variant="secondary"
            size="medium"
          >
            User Roles
          </Button>
        </div>
      </div>

      <SearchInput
        onSearch={(value) => {
          setSearchTerm(value);
          setCurrentPage(1);
        }}
        placeholder="Search users by name, email, or contact..."
        className="mb-4 max-w-md"
      />

      <GenericTable
        headers={headers}
        rows={tableData}
        columns={columns}
        loading={loading}
      />

      {!loading && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          onNext={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
        />
      )}

      {/* --- Modals --- */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New User"
        subtitle="Fill out the form to add a new user to the system."
        className="!mt-16 !max-h-[calc(100vh-8rem)] overflow-y-auto"
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
        subtitle="Excel should contain 4 columns: first_name, last_name, mail, and contact (as headers)."
        className="!mt-16 !max-h-[calc(100vh-8rem)] !overflow-hidden"
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
        className="!mt-16 !max-h-[calc(100vh-8rem)] overflow-hidden"
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
        onClose={() => setConfirmModalOpen(false)}
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
        className="!mt-16 !max-h-[calc(100vh-8rem)] !overflow-hidden"
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button
            onClick={() => setConfirmModalOpen(false)}
            variant="secondary"
            size="medium"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              setConfirming(true);
              try {
                await confirmToggle();
              } finally {
                setConfirming(false);
              }
            }}
            variant={actionType === "deactivate" ? "danger" : "success"}
            size="medium"
            disabled={confirming}
          >
            {confirming
              ? actionType === "deactivate"
                ? "Deactivating..."
                : "Activating..."
              : "Confirm"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
