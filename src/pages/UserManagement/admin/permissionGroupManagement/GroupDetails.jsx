import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { KeyRound, Layers } from "lucide-react";

import AppCard from "../../../../components/Cards/AppCard";
import DynamicCardGrid from "../../../../components/Cards/DynamicCardGrid";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";

const PERMISSION_GRID_CONFIG = {
  layoutMode: "grid",
  columnMode: "auto",
  cardsPerRow: 3,
  cardsPerPage: 6,
  minCardWidth: "240px",
  gapClassName: "gap-4",
  gridClassName: "items-stretch",
  paginationWrapperClassName: "mt-6 flex justify-center",
};

export default function GroupDetails() {
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const axiosInstance = useMemo(() => {
    const instance = axios.create({
      baseURL: window.__APP_CONFIG__.USER_MANAGEMENT_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    instance.interceptors.request.use((config) => {
      const latestToken = localStorage.getItem("token");

      if (latestToken) {
        config.headers.Authorization = `Bearer ${latestToken}`;
      }

      return config;
    });

    return instance;
  }, []);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);

        const [groupRes, permissionRes] = await Promise.all([
          axiosInstance.get(`/admin/groups/${groupId}`),
          axiosInstance.get(`/admin/groups/${groupId}/permissions`),
        ]);

        setGroup(groupRes.data);
        setPermissions(Array.isArray(permissionRes.data) ? permissionRes.data : []);
      } catch (err) {
        console.error("Failed to fetch group details:", err);
        setGroup(null);
        setPermissions([]);
        showStatusToast("Failed to load group details.", "error");
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchGroup();
    }
  }, [groupId, axiosInstance]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6">
        <div className="rounded-xl border border-gray-200 bg-white py-16">
          <LoadingSpinner text="Loading group details..." />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-10 text-center text-sm text-red-700">
          Group not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6">
      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0A0082]/10 text-[#0A0082]">
            <Layers className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h2 className={Fonts.heading3}>Permissions in Group</h2>

            <p className={Fonts.paragraphMuted}>
              Group:{" "}
              <span className="font-semibold text-[#0A0082]">
                {group.group_name || group.name || "Selected Group"}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        {permissions.length > 0 ? (
          <DynamicCardGrid
            data={permissions}
            getKey={(permission, index) =>
              permission.permission_uuid || permission.code || index
            }
            wrapperClassName="w-full min-w-0"
            emptyMessage="No permissions assigned."
            {...PERMISSION_GRID_CONFIG}
            renderCard={(permission) => {
              const code =
                permission.permission_code ||
                permission.code ||
                "UNKNOWN_PERMISSION";

              return (
                <AppCard
                  icon={<KeyRound className="h-4 w-4" />}
                  title={code?.toUpperCase().replace(/ /g, "_")}
                  subtitle={permission.description || "No description available."}
                  className="h-full min-h-[135px] border-gray-200 p-4 hover:border-[#0A0082]/40"
                />
              );
            }}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
            No permissions assigned.
          </div>
        )}
      </div>
    </div>
  );
}