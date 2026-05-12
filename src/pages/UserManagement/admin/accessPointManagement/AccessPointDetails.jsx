import React, { useEffect, useState } from "react";
import { getAccessPoint } from "../../../../services/accessPointService";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Link,
  Settings,
  Package,
  Globe,
  Shield,
} from "lucide-react";

import Button from "../../../../components/Button/Button";
import AppCard from "../../../../components/Cards/AppCard";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";

const DetailRow = ({ icon, label, value, breakAll = false }) => (
  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
    <div className="mt-0.5 shrink-0 text-blue-700">{icon}</div>

    <div className="min-w-0 flex-1">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 text-sm font-medium text-gray-800 ${
          breakAll ? "break-all" : "break-words"
        }`}
        title={value}
      >
        {value || "N/A"}
      </p>
    </div>
  </div>
);

const AccessPointDetails = () => {
  const { access_uuid } = useParams();
  const navigate = useNavigate();

  const [ap, setAp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccessPoint = async () => {
      try {
        setLoading(true);

        const res = await getAccessPoint(access_uuid);
        setAp(res.data);
      } catch (err) {
        console.error("Failed to load access point:", err);
        showStatusToast("Failed to load access point details.", "error");
        setAp(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessPoint();
  }, [access_uuid]);

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-gray-50 px-4">
        <LoadingSpinner text="Loading access point details..." />
      </div>
    );
  }

  if (!ap) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          Access point not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Search className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className={Fonts.heading3}>Access Point Details</h2>

              <p className={`${Fonts.paragraphMuted} mt-1 break-all`}>
                {access_uuid}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="medium"
            onClick={() => navigate("/user-management/access-points")}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <AppCard
          className="border-gray-200 bg-white"
          title="Access Point Information"
          subtitle="Endpoint, method, module, visibility, and mapped permission."
          icon={<Shield className="h-5 w-5" />}
          renderBody={() => (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DetailRow
                icon={<Link className="h-5 w-5" />}
                label="Path"
                value={ap.endpoint_path}
                breakAll
              />

              <DetailRow
                icon={<Settings className="h-5 w-5" />}
                label="Method"
                value={ap.method}
              />

              <DetailRow
                icon={<Package className="h-5 w-5" />}
                label="Module"
                value={ap.module}
              />

              <DetailRow
                icon={<Globe className="h-5 w-5" />}
                label="Public"
                value={ap.is_public ? "Yes" : "No"}
              />

              <div className="sm:col-span-2">
                <DetailRow
                  icon={<Shield className="h-5 w-5" />}
                  label="Permission"
                  value={ap.permission_code || "N/A"}
                  breakAll
                />
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
};

export default AccessPointDetails;