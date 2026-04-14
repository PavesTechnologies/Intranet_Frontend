import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function GroupDetails() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/groups/${groupId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setGroup(res.data);
        // Fetch permissions for the group
        const permRes = await axios.get(
          `${
            window.__APP_CONFIG__.USER_MANAGEMENT_URL
          }/admin/groups/${groupId}/permissions`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setPermissions(permRes.data);
      } catch (err) {
        setGroup(null);
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId, token]);

  if (loading) return <div className="p-6">Loading group details...</div>;
  if (!group) return <div className="p-6 text-red-600">Group not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Permissions in Group
      </h2>
      <div className="mt-6">
        {permissions.length > 0 ? (
          <ul className="space-y-3">
            {permissions.map((perm) => (
              <li
                key={perm.code}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div
                  className="font-bold text-blue-700 text-base underline uppercase mb-1"
                  style={{ wordBreak: "break-all" }}
                >
                  {perm.code?.toUpperCase().replace(/ /g, "_")}
                </div>
                <div className="text-gray-600 text-sm">
                  {perm.description || "No description available."}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-gray-500 mt-1">No permissions assigned.</div>
        )}
      </div>
    </div>
  );
}
