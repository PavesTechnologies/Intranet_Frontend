import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

import { showStatusToast } from "../../../../components/toastfy/toast";
import SearchInput from "../../../../components/filter/Searchbar";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";

export default function EditUserRoleForm() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");

  const token = localStorage.getItem("token");

  const authHeader = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${token}` },
    }),
    [token]
  );

  const baseUrl = window.__APP_CONFIG__.USER_MANAGEMENT_URL;

  const loadData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);

    try {
      const [userRes, rolesRes, assignedRolesRes] = await Promise.all([
        axios.get(`${baseUrl}/admin/users/${userId}`, authHeader),
        axios.get(`${baseUrl}/admin/roles`, authHeader),
        axios.get(`${baseUrl}/admin/users/${userId}/roles`, authHeader),
      ]);

      setUser(userRes.data);
      setRoles(Array.isArray(rolesRes.data) ? rolesRes.data : []);

      const assignedRoleIds = Array.isArray(assignedRolesRes.data)
        ? assignedRolesRes.data.map((role) => role.role_id)
        : [];

      setSelectedRoleIds(assignedRoleIds);
    } catch (err) {
      console.error("Initialization failed", err);
      showStatusToast("Unable to load user role data.", "error");
    } finally {
      setLoading(false);
    }
  }, [userId, baseUrl, authHeader]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value || "");
  }, []);

  const toggleRole = (roleId) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      await axios.put(
        `${baseUrl}/admin/users/${userId}/role`,
        { role_ids: selectedRoleIds },
        authHeader
      );

      showStatusToast("Roles updated successfully!", "success");
      navigate("/user-management/users/roles");
    } catch (err) {
      console.error("Failed to update roles", err);
      showStatusToast("Update failed.", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    if (!term) return roles;

    return roles.filter((role) =>
      role.role_name?.toLowerCase().includes(term)
    );
  }, [roles, searchTerm]);

  if (loading || !user) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white py-16">
        <LoadingSpinner text="Loading user information..." />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className={Fonts.heading3}>
              Edit Roles for{" "}
              <span className="text-[#0A0082]">
                {user.first_name} {user.last_name}
              </span>
            </h2>

            <p className={Fonts.paragraphMuted}>
              Assign or remove roles for this user.
            </p>
          </div>

          <Button
            variant="outline"
            size="small"
            onClick={() => navigate("/user-management/users/roles")}
          >
            <ArrowLeft size={15} />
            Back
          </Button>
        </div>

        <div className="mb-4 max-w-md">
          <SearchInput
            onSearch={handleSearch}
            placeholder="Search roles..."
          />
        </div>

        <div className="mb-6 grid max-h-[300px] grid-cols-1 gap-3 overflow-y-auto rounded-xl border border-gray-200 p-4 sm:grid-cols-2">
          {filteredRoles.length > 0 ? (
            filteredRoles.map((role) => (
              <label
                key={role.role_id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-3 text-gray-700 transition hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedRoleIds.includes(role.role_id)}
                  onChange={() => toggleRole(role.role_id)}
                  className="h-4 w-4 accent-[#0A0082]"
                />

                <span className="text-sm font-medium">{role.role_name}</span>
              </label>
            ))
          ) : (
            <p className="col-span-2 py-4 text-center text-sm italic text-gray-400">
              No roles found.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            onClick={() => navigate("/user-management/users/roles")}
            variant="outline"
            size="medium"
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            variant="primary"
            size="medium"
            loading={saving}
            loadingText="Saving..."
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}