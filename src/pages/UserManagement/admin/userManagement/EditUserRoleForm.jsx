import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../../../../contexts/AuthContext";
import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchInput from "../../../../components/filter/Searchbar";

export default function EditUserRoleForm() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { admin } = useAuth();

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");
  const authHeader = {
    headers: { Authorization: `Bearer ${token}` },
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchUser(), fetchAllRoles(), fetchAssignedRoles()]);
    } catch (err) {
      console.error("Initialization failed", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUser = async () => {
    const res = await axios.get(
      `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/${userId}`,
      authHeader,
    );
    setUser(res.data);
  };

  const fetchAllRoles = async () => {
    const res = await axios.get(
      `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/roles`,
      authHeader,
    );
    setRoles(res.data);
  };

  const fetchAssignedRoles = async () => {
    const res = await axios.get(
      `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/${userId}/roles`,
      authHeader,
    );
    setSelectedRoleIds(res.data.map((r) => r.role_id));
  };

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSave = async () => {
    try {
      await axios.put(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/${userId}/role`,
        { role_ids: selectedRoleIds },
        authHeader,
      );
      showStatusToast("Roles updated successfully!", "success");
      navigate(`/user-management/users/roles`);
    } catch (err) {
      console.error("Failed to update roles", err);
      showStatusToast("Update failed.", "error");
    }
  };

  // Filter roles by search term
  const filteredRoles = roles.filter((role) =>
    role.role_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-64 text-blue-600 text-lg font-medium">
        Loading user information...
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        {/* Modal Header */}
        <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Edit Roles for gadu
          <span className="text-blue-600">
            {user.first_name} {user.last_name} {"gadu"}
          </span>
        </h2>
        <p className="mb-4 text-gray-500 text-center">
          Assign or unassign user roles below:
        </p>

        {/* ✅ Search Bar - clearly visible at the top */}

        {/* Roles List */}
        <div className="grid grid-cols-2 gap-3 mb-6 max-h-[300px] overflow-y-auto pr-2">
          {filteredRoles.length > 0 ? (
            filteredRoles.map((role) => (
              <label
                key={role.role_id}
                className="flex items-center gap-3 text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.role_id)}
                  onChange={() => toggleRole(role.role_id)}
                  className="accent-blue-600 w-4 h-4"
                />
                <span>{role.role_name}</span>
              </label>
            ))
          ) : (
            <p className="text-gray-400 col-span-2 text-center py-4">
              No roles found.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl shadow-md"
          >
            Save Changes
          </button>
          <button
            onClick={() => navigate(`/user-management/users/roles`)}
            className="text-gray-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
