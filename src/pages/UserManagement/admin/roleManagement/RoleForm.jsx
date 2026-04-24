import { useEffect, useState } from "react";
import { Pencil, Trash } from "lucide-react";
import axios from "axios";
import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import SearchInput from "../../../../components/filter/Searchbar";
import { showStatusToast } from "../../../../components/toastfy/toast";

export default function RoleForm({
  roles,
  setRoles,
  onRoleUpdate,
  refreshRoles,
}) {
  const [localRoles, setLocalRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [newRoleName, setNewRoleName] = useState("");
  const [editRole, setEditRole] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token") || "";
  const axiosInstance = axios.create({
    baseURL: `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}`,
    headers: { Authorization: `Bearer ${token}` },
  });

  useEffect(() => {
    if (roles?.length) {
      setLocalRoles(roles);
      setFilteredRoles(roles);
    }
  }, [roles]);

  useEffect(() => {
    setFilteredRoles(
      searchTerm
        ? localRoles.filter((r) =>
            r.role_name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
        : localRoles,
    );
    setCurrentPage(1);
  }, [searchTerm, localRoles]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const paginatedRoles = filteredRoles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/admin/roles");
      setLocalRoles(res.data);
      setFilteredRoles(res.data);
      if (setRoles) setRoles(res.data);
      if (onRoleUpdate) onRoleUpdate(res.data);
    } catch (err) {
      console.error("Error fetching roles", err);
      showStatusToast("Failed to load roles", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      showStatusToast("Role name cannot be empty", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await axiosInstance.post("/admin/roles", {
        role_name: newRoleName,
      });
      if (res.status === 201 || res.status === 200) {
        showStatusToast("Role created successfully!", "success");
        setAddModalOpen(false);
        setNewRoleName("");
        await fetchRoles();
        if (refreshRoles) refreshRoles();
      }
    } catch (err) {
      console.error("Error creating role", err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to create role";
      showStatusToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEditRole = async () => {
    if (!editRole?.role_name?.trim()) {
      showStatusToast("Role name cannot be empty", "error");
      return;
    }

    const mandatoryRoles = ["Admin", "HR", "HR-Manager"];
    if (mandatoryRoles.includes(editRole.original_name)) {
      showStatusToast(
        `Role '${editRole.original_name}' is mandatory and cannot be renamed`,
        "error",
      );
      setEditModalOpen(false);
      return;
    }

    setSaving(true);
    try {
      const res = await axiosInstance.put(
        `/admin/roles/uuid/${editRole.role_uuid}`,
        { role_name: editRole.role_name },
      );

      if (res.status === 200) {
        showStatusToast("Role updated successfully!", "success");
        setEditModalOpen(false);
        await fetchRoles();
        if (refreshRoles) refreshRoles();
      }
    } catch (err) {
      console.error("Error updating role", err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to update role";
      showStatusToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    try {
      const roleToDelete = localRoles.find((r) => r.role_uuid === deleteId);
      if (["Admin", "HR", "HR-Manager"].includes(roleToDelete?.role_name)) {
        showStatusToast(
          `Role '${roleToDelete.role_name}' is mandatory and cannot be deleted`,
          "error",
        );
        setDeleteModalOpen(false);
        return;
      }

      await axiosInstance.delete(`/admin/roles/uuid/${deleteId}`);
      showStatusToast("Role deleted successfully!", "success");
      setDeleteModalOpen(false);
      await fetchRoles();
      if (refreshRoles) refreshRoles();
    } catch (err) {
      console.error("Error deleting role", err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        "Failed to delete role";
      showStatusToast(msg, "error");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold">Role Management</h2>
          <p className="text-sm text-gray-600">
            Create, edit, and manage roles
          </p>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>Add Role</Button>
      </div>

      {/* Add Role Modal */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)}>
        <h3 className="text-lg font-semibold mb-3">Add New Role</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FormInput
              label="Role Name"
              name="role_name"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="e.g., Admin"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddRole} disabled={saving}>
              {saving ? "Saving..." : "Add Role"}
            </Button>
            <Button variant="secondary" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Roles List */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-semibold">Existing Roles</h3>
          <SearchInput
            onSearch={(value) => setSearchTerm(value)}
            delay={300}
            placeholder="Search Roles by name..."
            className="max-w-md"
          />
        </div>

        {loading ? (
          <p className="text-gray-500">Loading roles...</p>
        ) : filteredRoles.length === 0 ? (
          <p className="text-gray-500">No roles found.</p>
        ) : (
          <ul className="space-y-3">
            {paginatedRoles.map((role) => (
              <li
                key={role.role_uuid}
                className="flex justify-between items-center border-b pb-3"
              >
                <span className="font-semibold text-gray-800">
                  {role.role_name}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setEditRole({ ...role, original_name: role.role_name });
                      setEditModalOpen(true);
                    }}
                    className="p-2 rounded hover:bg-blue-100 text-blue-900"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(role.role_uuid);
                      setDeleteModalOpen(true);
                    }}
                    className="p-2 rounded hover:bg-red-100 text-red-600"
                    title="Delete"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          onNext={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
        />
      </div>

      {/* Edit Role Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <h3 className="text-lg font-semibold mb-3">Edit Role</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <FormInput
              label="Role Name"
              name="edit_role_name"
              value={editRole?.role_name || ""}
              onChange={(e) =>
                setEditRole((prev) => ({ ...prev, role_name: e.target.value }))
              }
              placeholder="e.g., Manager"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEditRole} disabled={saving}>
              {saving ? "Updating..." : "Update"}
            </Button>
            <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
        <h3 className="text-lg font-semibold mb-3">
          Are you sure you want to delete this role?
        </h3>
        <div className="flex gap-3 mt-4">
          <Button onClick={handleDeleteRole} variant="danger">
            Delete
          </Button>
          <Button onClick={() => setDeleteModalOpen(false)} variant="secondary">
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
