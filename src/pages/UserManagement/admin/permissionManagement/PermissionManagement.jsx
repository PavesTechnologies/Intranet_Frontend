import Button from "../../../../components/Button/Button";
import Pagination from "../../../../components/Pagination/pagination";
import FormInput from "../../../../components/forms/FormInput";
import { Pencil, Trash } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import SearchInput from "../../../../components/filter/Searchbar";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { showStatusToast } from "../../../../components/toastfy/toast";

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState([]);
  const [filteredPermissions, setFilteredPermissions] = useState([]);
  const [groups, setGroups] = useState([]);
  const [newPermission, setNewPermission] = useState("");
  const [description, setNewDescription] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [editingPermission, setEditingPermission] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editGroup, setEditGroup] = useState("");
  const [mode, setMode] = useState("basic");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [addpermission, setAddPermission] = useState(false);
  const [addPermissionModal, setAddPermissionModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [processing, setProcessing] = useState(false); // for generic cancel/ok actions if needed

  const token = localStorage.getItem("token");

  const axiosInstance = axios.create({
    baseURL: `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}`,
    headers: { Authorization: `Bearer ${token}` },
  });

  useEffect(() => {
    fetchPermissions();
    fetchGroups();
  }, []);

  const fetchPermissions = async () => {
    try {
      const res = await axiosInstance.get("/admin/permissions/");
      setPermissions(res.data);
      setFilteredPermissions(res.data);
    } catch (err) {
      console.error("Failed to fetch permissions", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axiosInstance.get("/admin/groups");
      setGroups(res.data);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  const showSingleToast = (msg, type) => {
    toast.dismiss();
    showStatusToast(msg, type);
  };

  const validatePermissionCode = (code) => {
    if (!code.trim()) {
      showSingleToast("Enter the permission", "error");
      return false;
    }
    if (!/[A-Z]/.test(code)) {
      showSingleToast(
        "Permission code must contain at least one capital letter",
        "error",
      );
      return false;
    }
    const validCharsRegex = /^[A-Za-z\s-_]+$/;
    if (!validCharsRegex.test(code)) {
      showSingleToast(
        "Permission code can only contain letters, spaces, hyphens, and underscores",
        "error",
      );
      return false;
    }
    return true;
  };

  const validateDescription = (desc) => {
    if (!desc.trim()) {
      showSingleToast("Description shouldn't be empty", "error");
      return false;
    }
    const textOnlyRegex = /^[A-Za-z0-9\s.,!?'"()_-]+$/;
    if (!textOnlyRegex.test(desc)) {
      showSingleToast(
        "Description should contain only valid text format",
        "error",
      );
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validatePermissionCode(newPermission)) return;
    if (!validateDescription(description)) return;

    try {
      const payload = {
        permission_code: newPermission,
        description,
        group_uuid: selectedGroup,
      };

      const endpoint = "/admin/permissions/group";

      await axiosInstance.post(endpoint, payload);

      showSingleToast("Permission created successfully!", "success");
      resetForm();
      fetchPermissions();
    } catch (err) {
      console.error("Error creating permission", err);
      const detail =
        err.response?.data?.detail || "Failed to create permission";
      showSingleToast(detail, "error");
    }
  };

  const handleUpdate = async () => {
    if (!validatePermissionCode(editCode)) return;
    if (!validateDescription(editDescription)) return;

    try {
      await axiosInstance.put(
        `/admin/permissions/${editingPermission.permission_uuid}`,
        {
          permission_code: editCode,
          description: editDescription,
        },
      );

      if (mode === "withGroup") {
        await axiosInstance.put(
          `/admin/permissions/${editingPermission.permission_uuid}/group`,
          {
            group_uuid: editGroup,
          },
        );
      }

      showSingleToast("Permission updated successfully!", "success");
      setShowModal(false);
      fetchPermissions();
    } catch (err) {
      console.error("Error updating permission", err);
      const detail =
        err.response?.data?.detail || "Failed to update permission";
      showSingleToast(detail, "error");
    }
  };

  const confirmDelete = async () => {
    try {
      await axiosInstance.delete(`/admin/permissions/${deleteId}`);
      fetchPermissions();
      showSingleToast("Permission deleted successfully!", "success");
    } catch (err) {
      console.error("Failed to delete permission", err);
      showSingleToast("Failed to delete permission", "error");
    } finally {
      setShowDeleteModal(false);
      setDeleteId(null);
    }
  };

  const handlePermissionChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z\s-_]*$/.test(value)) setNewPermission(value);
  };

  const handleDescriptionChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z0-9\s.,!?'"()_-]*$/.test(value)) setNewDescription(value);
  };

  const handleEditPermissionChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z\s-_]*$/.test(value)) setEditCode(value);
  };

  const handleEditDescriptionChange = (e) => {
    const value = e.target.value;
    if (/^[A-Za-z0-9\s.,!?'"()_-]*$/.test(value)) setEditDescription(value);
  };

  const handleEdit = (permission) => {
    setEditingPermission(permission);
    setEditCode(permission.permission_code);
    setEditDescription(permission.description || "");
    setEditGroup(permission.group_uuid || "");
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setNewPermission("");
    setNewDescription("");
    setSelectedGroup("");
  };

  const handleAddPermission = () => {
    setAddPermission(!addpermission);
    setAddPermissionModal(!addPermissionModal);
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPermissions(permissions);
    } else {
      const filtered = permissions.filter((perm) =>
        perm.permission_code.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredPermissions(filtered);
    }
    setCurrentPage(1);
  }, [searchTerm, permissions]);

  const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage);
  const paginatedPermissions = filteredPermissions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Permission Management</h2>
        <Button
          onClick={async () => {
            setAdding(true);
            try {
              await handleAddPermission(); // <-- your existing function
            } finally {
              setAdding(false);
            }
          }}
          disabled={adding}
          className={`px-6 py-2 text-white rounded transition-colors font-medium ${
            adding
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-900 hover:bg-blue-950"
          }`}
        >
          {adding ? "Adding..." : "Add Permission"}
        </Button>
      </div>

      {/* Add Permission Modal */}
      <Modal isOpen={addPermissionModal} onClose={handleAddPermission}>
        {addpermission && (
          <div className="flex flex-col gap-[8px] bg-white p-4 rounded shadow mb-6">
            <h3 className="text-lg font-semibold mb-3">Add New Permission</h3>
            <FormInput
              label="Permission Code"
              name="permission_code"
              value={newPermission}
              onChange={handlePermissionChange}
              placeholder="e.g., READ_USER (must contain capital letters)"
              className="mb-3"
            />
            <FormInput
              type="text"
              label="Description"
              padding="medium"
              placeholder="Enter description (text only)"
              value={description}
              onChange={handleDescriptionChange}
              className="w-full p-2 border rounded mb-3"
            />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(String(e.target.value))}
              className="w-full p-2 border rounded mb-3"
            >
              <option value="">Select Group</option>
              {groups.map((g) => (
                <option key={g.group_uuid} value={g.group_uuid}>
                  {g.group_name}
                </option>
              ))}
            </select>
            <Button
              onClick={handleCreate}
              variant="primary"
              size="medium"
              className="mt-3"
            >
              Add Permission
            </Button>
          </div>
        )}
      </Modal>

      {/* Permission List */}
      <div className="bg-white p-4 rounded shadow">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="text-lg font-semibold">Existing Permissions</h3>
          <SearchInput
            onSearch={(value) => setSearchTerm(value)}
            delay={500}
            placeholder="Search Permissions by code..."
            className="max-w-md"
          />
        </div>

        <ul className="space-y-3">
          {paginatedPermissions.map((perm) => (
            <li
              key={perm.permission_uuid}
              className="flex justify-between items-start border-b pb-3"
            >
              <div className="flex-1 min-w-0">
                <span className="font-semibold break-words text-gray-800">
                  {perm.permission_code}
                </span>
                <p className="text-sm text-gray-600 break-words whitespace-pre-wrap mt-1 leading-relaxed">
                  {perm.description || "No description available."}
                </p>
              </div>

              <div className="flex gap-3 ml-4 flex-shrink-0">
                <button
                  onClick={() => handleEdit(perm)}
                  className="p-2 rounded hover:bg-blue-100 text-blue-900"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(perm.permission_uuid)}
                  className="p-2 rounded hover:bg-red-100 text-red-600"
                  title="Delete"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          onNext={() =>
            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
          }
        />
      </div>

      {/* Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}>
        <h2 className="text-lg font-semibold mb-4">Edit Permission</h2>
        <FormInput
          label="Permission Code"
          name="edit_permission_code"
          value={editCode}
          onChange={handleEditPermissionChange}
          placeholder="e.g., READ_USER (must contain capital letters)"
          className="mb-3"
        />
        <FormInput
          type="text"
          label="Description"
          placeholder="Enter description (text only)"
          value={editDescription}
          onChange={handleEditDescriptionChange}
          className="w-full p-2 border rounded mb-3"
        />
        <div className="flex gap-3 mt-4">
          <Button
            onClick={async () => {
              setUpdating(true);
              try {
                await handleUpdate(); // <-- your existing function
              } finally {
                setUpdating(false);
              }
            }}
            disabled={updating}
            className={`px-6 py-2 text-white rounded transition-colors font-medium ${
              updating
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {updating ? "Updating..." : "Update"}
          </Button>

          <Button
            onClick={() => setShowModal(false)}
            variant="secondary"
            size="medium"
          >
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}>
        <h2 className="text-lg font-semibold mb-4">
          Are you sure you want to delete this permission?
        </h2>
        <div className="flex gap-3 mt-4">
          <Button onClick={confirmDelete} variant="danger" size="medium">
            OK
          </Button>
          <Button
            onClick={() => setShowDeleteModal(false)}
            variant="secondary"
            size="medium"
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
