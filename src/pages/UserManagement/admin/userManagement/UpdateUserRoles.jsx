import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, Pencil } from "lucide-react";

import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchInput from "../../../../components/filter/Searchbar";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import { Fonts } from "../../../../components/Fonts/Fonts";

const ITEMS_PER_PAGE = 10;

const SORT_DIRECTIONS = {
  ASC: "asc",
  DESC: "desc",
};

export default function UpdateUserRole() {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [sortDirection, setSortDirection] = useState(
    SORT_DIRECTIONS.ASC
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser_uuId, setSelectedUser_uuId] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  const axiosInstance = useMemo(() => {
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return axios.create({
      baseURL: window.__APP_CONFIG__.USER_MANAGEMENT_URL,
      headers,
    });
  }, [token]);

  useEffect(() => {
    if (!token) {
      showStatusToast("Session expired. Please login again.", "warning");
      navigate("/");
    }
  }, [token, navigate]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const res = await axiosInstance.get("/admin/users/roles", {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm || "",
        },
      });

      setUsers(res.data.users || []);
      setTotalUsers(res.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch users with roles:", err);

      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message ||
        "Failed to load user roles.";

      showStatusToast(msg, "error");

      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [
    axiosInstance,
    currentPage,
    searchTerm,
    navigate,
  ]);

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
    setCurrentPage((prev) =>
      Math.min(prev + 1, totalPages)
    );
  }, [totalPages]);

  const toggleSort = () => {
    setSortDirection((prev) =>
      prev === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC
    );

    setUsers((prev) => [...prev].reverse());
  };

  const headers = [
    "S.no",
    <span
      key="name"
      className="cursor-pointer select-none"
      onClick={toggleSort}
    >
      Name{" "}
      {sortDirection === SORT_DIRECTIONS.ASC
        ? "▲"
        : "▼"}
    </span>,
    "Email",
    "Assigned Roles",
    "Actions",
  ];

  const columns = [
    "serial_no",
    "name",
    "mail",
    "roles",
    "actions",
  ];

  const tableRows = users.map((user, index) => ({
    serial_no: (
      (currentPage - 1) * ITEMS_PER_PAGE +
      index +
      1
    ).toString(),

    name: user.name || "N/A",

    mail: user.mail || (
      <span className="italic text-gray-400">
        N/A
      </span>
    ),

    roles:
      user.roles?.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role, idx) => (
            <StatusBadge
              key={idx}
              label={role}
              size="sm"
            />
          ))}
        </div>
      ) : (
        <StatusBadge label="General" size="sm" />
      ),

    actions: (
      <Button
        type="button"
        variant="link"
        size="icon"
        title="Edit"
        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800"
        onClick={() => {
          setSelectedUser_uuId(user.user_uuid);
          setIsModalOpen(true);
        }}
      >
        <Pencil size={17} />
      </Button>
    ),
  }));

  const handleRolesSaved = (
    userUuid,
    updatedRoleNames
  ) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.user_uuid === userUuid
          ? {
              ...u,
              roles: updatedRoleNames,
            }
          : u
      )
    );
  };

  return (
    <div className="w-full min-w-0 px-4 py-4 sm:px-6">
      <div className="mb-5 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className={Fonts.heading3}>Update User Roles</h2>

          <p className={Fonts.paragraphMuted}>
            Assign and manage roles for users.
          </p>
        </div>

        <Button
          variant="secondary"
          size="medium"
          onClick={() => navigate("/user-management/users")}
          className="w-full sm:w-auto"
        >
          <ArrowLeft size={15} />
          Back
        </Button>
      </div>

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="w-full lg:max-w-md">
          <SearchInput
            onSearch={handleSearch}
            placeholder="Search by name, email or role..."
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading user roles..." />
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

      {isModalOpen && selectedUser_uuId && (
        <EditUserRoleModal
          user_uuId={selectedUser_uuId}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser_uuId(null);
          }}
          axiosInstance={axiosInstance}
          onSaved={(updatedRoleNames) =>
            handleRolesSaved(
              selectedUser_uuId,
              updatedRoleNames
            )
          }
        />
      )}
    </div>
  );
}

function EditUserRoleModal({ user_uuId, onClose, axiosInstance, onSaved }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");

  const authHeader = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    if (!user_uuId) return;

    let mounted = true;

    const loadData = async () => {
      setLoading(true);

      try {
        const [userRes, rolesRes, assignedRes] = await Promise.all([
          axiosInstance.get(`/admin/users/uuid/${user_uuId}`, authHeader),
          axiosInstance.get(`/admin/roles`, authHeader),
          axiosInstance.get(`/admin/users/uuid/${user_uuId}/roles`, authHeader),
        ]);

        if (!mounted) return;

        setUser(userRes.data);
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);

        let assignedIds = [];

        if (
          assignedRes.data?.roles &&
          Array.isArray(assignedRes.data.roles)
        ) {
          const roleNameToId =
            rolesRes.data.reduce((acc, r) => {
              acc[r.role_name] = r.role_uuid;
              return acc;
            }, {});

          assignedIds = assignedRes.data.roles
            .map(
              (roleName) =>
                roleNameToId[roleName]
            )
            .filter(Boolean);
        }

        setSelectedRoleIds(assignedIds);
      } catch (err) {
        console.error("Failed to load roles", err);
        showStatusToast("Unable to fetch user role data.", "error");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [user_uuId, axiosInstance]);

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    if (!user_uuId) return;

    setSaving(true);

    try {
      const response = await axiosInstance.put(
        `/admin/users/uuid/${user_uuId}/role`,
        {
          role_ids: selectedRoleIds,
        },
        authHeader
      );

      const updatedRoleNames = roles
        .filter((r) =>
          selectedRoleIds.includes(r.role_uuid)
        )
        .map((r) => r.role_name);

      showStatusToast(
        response?.data?.message || "Roles updated successfully!",
        "success"
      );

      if (typeof onSaved === "function") {
        onSaved(updatedRoleNames);
      }

      onClose();
    } catch (err) {
      console.error("Failed to update roles", err);
      showStatusToast("Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    if (!term) return roles;

    return roles.filter((r) =>
      r.role_name
        .toLowerCase()
        .includes(term)
    );
  }, [roles, searchTerm]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Edit User Roles"
      subtitle={
        user
          ? `User: ${user.first_name || ""} ${user.last_name || ""}`.trim()
          : "Assign or remove roles for the selected user."
      }
      size="2xl"
      fullScreenMobile
      maxHeight="max-h-[92vh]"
      bodyClassName="p-0 overflow-hidden"
      scrollable={false}
      closeOnBackdrop={!saving}
      footer={
        !loading && (
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSave}
              variant="primary"
              loading={saving}
              loadingText="Saving..."
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </div>
        )
      }
    >
      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Loading role data..." />
        </div>
      ) : (
        <div className="flex max-h-[calc(92vh-190px)] flex-col overflow-hidden">
          <div className="shrink-0 border-b border-gray-100 p-4 sm:p-5">
            <p className="text-sm text-gray-500">
              Select or deselect roles below.
            </p>

            <div className="mt-4">
              <SearchInput
                placeholder="Search roles..."
                onSearch={(val) => setSearchTerm(val || "")}
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => (
                  <label
                    key={role.role_uuid}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                      selectedRoleIds.includes(role.role_uuid)
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.role_uuid)}
                      onChange={() => toggleRole(role.role_uuid)}
                      className="h-4 w-4 shrink-0 accent-[#0A0082]"
                    />

                    <span className="min-w-0 truncate text-sm font-medium text-gray-700">
                      {role.role_name}
                    </span>
                  </label>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm italic text-gray-400 sm:col-span-2">
                  No roles found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}