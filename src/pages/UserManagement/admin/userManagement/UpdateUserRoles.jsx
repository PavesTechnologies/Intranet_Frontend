import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";

import SearchInput from "../../../../components/filter/Searchbar";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";

const ITEMS_PER_PAGE = 10;
const SORT_DIRECTIONS = { ASC: "asc", DESC: "desc" };

export default function UpdateUserRole() {
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortDirection, setSortDirection] = useState(SORT_DIRECTIONS.ASC);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser_uuId, setSelectedUser_uuId] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const axiosInstance = useMemo(() => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
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

  // ✅ Fetch users from backend with pagination
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/users/roles", {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          search: searchTerm || "",
        },
      });
      if (res.data) {
        setUsers(res.data.users || []);
        setTotalUsers(res.data.total || 0);
      } else {
        setUsers([]);
        setTotalUsers(0);
      }
    } catch (err) {
      console.error("Failed to fetch users with roles:", err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err.message ||
        "Failed to load user roles.";
      showStatusToast(msg, "error");
      if (err.response?.status === 401 || err.response?.status === 403) {
        navigate("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentPage, searchTerm]);

  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);

  const toggleSort = () => {
    setSortDirection((prev) =>
      prev === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC,
    );
    setUsers((prev) => [...prev].reverse());
  };

  const headers = [
    "S.no",
    <span key="name" className="cursor-pointer" onClick={toggleSort}>
      Name {sortDirection === SORT_DIRECTIONS.ASC ? "▲" : "▼"}
    </span>,
    "Email",
    "Assigned Roles",
    "Actions",
  ];
  const columns = ["Serial no", "name", "mail", "roles", "actions"];

  const tableRows = users.map((user, index) => ({
    "Serial no": ((currentPage - 1) * ITEMS_PER_PAGE + index + 1).toString(),
    name: `${user.name || ""}`,
    mail: user.mail || <span className="text-gray-400 italic">N/A</span>,
    roles:
      user.roles?.length > 0 ? (
        user.roles.join(", ")
      ) : (
        <span className="text-gray-700">General</span>
      ),
    actions: (
      <Button
        onClick={() => {
          setSelectedUser_uuId(user.user_uuid);
          setIsModalOpen(true);
        }}
        variant="primary"
        size="small"
      >
        Edit Roles
      </Button>
    ),
  }));

  const handleRolesSaved = (userUuid, updatedRoleNames) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.user_uuid === userUuid ? { ...u, roles: updatedRoleNames } : u,
      ),
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ✅ Top Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <h2 className="text-xl font-semibold text-blue-700">
          Update User Roles
        </h2>
        <Button
          variant="secondary"
          size="small"
          onClick={() => navigate("/user-management/users")}
        >
          ← Back
        </Button>
      </div>

      {/* ✅ Search Bar */}
      <SearchInput
        onSearch={(value) => {
          setSearchTerm(value || "");
          setCurrentPage(1);
        }}
        placeholder="Search by name, email or role..."
        delay={300}
        className="mb-4 max-w-md"
      />

      {/* ✅ Table */}
      <GenericTable
        headers={headers}
        rows={tableRows}
        columns={columns}
        loading={loading}
      />

      {/* ✅ Pagination */}
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

      {/* ✅ Modal */}
      {isModalOpen && selectedUser_uuId && (
        <EditUserRoleModal
          user_uuId={selectedUser_uuId}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedUser_uuId(null);
          }}
          axiosInstance={axiosInstance}
          onSaved={(updatedRoleNames) =>
            handleRolesSaved(selectedUser_uuId, updatedRoleNames)
          }
        />
      )}
    </div>
  );
}

/* ------------------------------
   Modal component (internal)
   ------------------------------ */
function EditUserRoleModal({ user_uuId, onClose, axiosInstance, onSaved }) {
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    console.log("EditUserRoleModal mounted for userId:", user_uuId);
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
        console.log(
          "Fetched user, roles, assigned:",
          userRes,
          rolesRes,
          assignedRes,
        );

        if (!mounted) return;

        setUser(userRes.data);
        setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);

        let assignedIds = [];

        if (assignedRes.data?.roles && Array.isArray(assignedRes.data.roles)) {
          const roleNameToId = rolesRes.data.reduce((acc, r) => {
            acc[r.role_name] = r.role_uuid;
            return acc;
          }, {});
          assignedIds = assignedRes.data.roles
            .map((roleName) => roleNameToId[roleName])
            .filter(Boolean);
        }

        setSelectedRoleIds(assignedIds);
      } catch (err) {
        console.error("Failed to load roles", err);
        showStatusToast("Unable to fetch user role data.", "error");
      } finally {
        if (mounted) setLoading(false);
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
        : [...prev, roleId],
    );
  };

  const handleSave = async () => {
    if (!user_uuId) return;
    setSaving(true);
    try {
      const response = await axiosInstance.put(
        `/admin/users/uuid/${user_uuId}/role`,
        { role_ids: selectedRoleIds },
        authHeader,
      );

      const updatedRoleNames = roles
        .filter((r) => selectedRoleIds.includes(r.role_uuid))
        .map((r) => r.role_name);

      console.log(response);

      showStatusToast(
        response?.data?.message || "Roles updated successfully!",
        "success",
      );
      if (typeof onSaved === "function") onSaved(updatedRoleNames);
      console.log("Updated roles:", updatedRoleNames);
      onClose();
    } catch (err) {
      console.error("Failed to update roles", err);
      showStatusToast("Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  // ✅ Filter roles dynamically using search term
  const filteredRoles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter((r) => r.role_name.toLowerCase().includes(term));
  }, [roles, searchTerm]);

  return (
    <Modal isOpen={true} onClose={onClose}>
      <div className="p-4 max-w-lg">
        {loading ? (
          <div className="text-blue-600">Loading user data...</div>
        ) : (
          <>
            <h2 className="text-xl font-semibold mb-4">
              Edit Roles for{" "}
              <span className="text-blue-600">
                {user?.first_name} {user?.last_name}
              </span>
            </h2>

            <p className="text-gray-500 mb-4">
              Select or deselect roles below:
            </p>

            {/* ✅ Role search input */}
            <SearchInput
              placeholder="Search roles..."
              value={searchTerm}
              onSearch={(val) => setSearchTerm(val)}
              delay={300}
              className="mb-4"
            />

            <div className="grid grid-cols-2 gap-3 mb-6 max-h-40 overflow-y-auto">
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => (
                  <label
                    key={role.role_uuid}
                    className="flex items-center gap-3 text-gray-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(role.role_uuid)}
                      onChange={() => toggleRole(role.role_uuid)}
                      className="accent-blue-600 w-4 h-4"
                    />
                    <span>{role.role_name}</span>
                  </label>
                ))
              ) : (
                <div className="col-span-2 text-gray-400 italic">
                  No roles found.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Button
                onClick={handleSave}
                variant="primary"
                size="medium"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button onClick={onClose} variant="secondary" size="medium">
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
