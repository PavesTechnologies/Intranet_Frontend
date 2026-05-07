import React, { useEffect, useState } from "react";
import {
  getAccessPoint,
  updateAccessPoint,
  listModules,
} from "../../../../services/accessPointService";

import { useParams, useNavigate } from "react-router-dom";

import {
  Link,
  Settings,
  Package,
  Globe,
  Shield,
  Trash2,
  ArrowLeft,
} from "lucide-react";

import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import AppCard from "../../../../components/Cards/AppCard";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";

import { toast } from "react-toastify";

const AccessPointEdit = () => {
  const { access_uuid } = useParams();

  const [form, setForm] = useState(null);
  const [modules, setModules] = useState([]);
  const [accessPointData, setAccessPointData] = useState(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const methodOptions = [
    { label: "GET", value: "GET" },
    { label: "POST", value: "POST" },
    { label: "PUT", value: "PUT" },
    { label: "DELETE", value: "DELETE" },
    { label: "PATCH", value: "PATCH" },
  ];

  const validateEndpointPath = (path) => {
    const regex = /^\/[a-zA-Z0-9\-_\/{}:]*$/;
    return regex.test(path.trim());
  };

  const validateModuleName = (name) => {
    const regex = /^[A-Za-z\s\-_]+$/;
    return regex.test(name.trim());
  };

  const showUniqueToast = (message, type) => {
    toast.dismiss();
    showStatusToast(message, type, { toastId: "unique-toast" });
  };

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const modulesRes = await listModules();

        if (isMounted) {
          setModules(modulesRes.data || []);
        }

        const accessPointRes = await getAccessPoint(access_uuid);

        if (isMounted) {
          setAccessPointData(accessPointRes.data);

          setForm({
            endpoint_path: accessPointRes.data.endpoint_path || "",
            method: accessPointRes.data.method || "GET",
            module: accessPointRes.data.module || "",
            is_public: accessPointRes.data.is_public || false,
          });
        }
      } catch (error) {
        showUniqueToast("Failed to load access point data", "error");
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [access_uuid]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.endpoint_path.trim()) {
      return showUniqueToast("Enter the Endpoint Path", "error");
    }

    if (!form.module.trim()) {
      return showUniqueToast("Enter the Module", "error");
    }

    if (!validateEndpointPath(form.endpoint_path)) {
      return showUniqueToast(
        "Endpoint path must start with '/' and contain valid URL characters",
        "error"
      );
    }

    if (!validateModuleName(form.module)) {
      return showUniqueToast(
        "Module name can only contain letters, spaces, hyphens, and underscores",
        "error"
      );
    }

    setLoading(true);

    try {
      const formDataToUpdate = {
        ...form,
        endpoint_path: form.endpoint_path.trim(),
        module: form.module.trim(),
      };

      await updateAccessPoint(access_uuid, formDataToUpdate);

      showUniqueToast("Access point updated successfully!", "success");

      setTimeout(() => {
        navigate("/user-management/access-points");
      }, 1000);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update access point";

      showUniqueToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePermission = async () => {
    if (!accessPointData?.permission_uuid) return;

    setIsDeleting(true);

    try {
      const response = await fetch(
        `${
          window.__APP_CONFIG__.USER_MANAGEMENT_URL
        }/admin/access-points/${access_uuid}/unmap-permission/${
          accessPointData.permission_uuid
        }`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const updatedData = await getAccessPoint(access_uuid);

        setAccessPointData(updatedData.data);

        showUniqueToast("Permission unmapped successfully", "success");
      } else {
        const errorData = await response.json();

        showUniqueToast(
          errorData?.detail || "Failed to unmap permission",
          "error"
        );
      }
    } catch (error) {
      showUniqueToast("Error unmapping permission", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!form) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingSpinner text="Loading access point..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        {/* HEADER */}
        <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Shield className="h-5 w-5" />
            </div>

            <div>
              <h2 className={Fonts.heading3}>
                Edit Access Point
              </h2>

              <p className={`${Fonts.paragraphMuted} mt-1`}>
                Update access point configuration and permissions.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/user-management/access-points")}
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* FORM */}
          <div className="xl:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <FormInput
                    label="Endpoint Path"
                    name="endpoint_path"
                    value={form.endpoint_path}
                    onChange={handleChange}
                    placeholder="/api/resource"
                    required
                  />

                  <p className="mt-1 text-sm text-gray-500">
                    Must start with '/' and contain valid URL characters.
                  </p>
                </div>

                <FormSelect
                  label="Method"
                  name="method"
                  value={form.method}
                  onChange={handleChange}
                  options={methodOptions}
                  required
                />

                <div>
                  <FormSelect
                    label="Module"
                    name="module"
                    value={form.module}
                    onChange={handleChange}
                    options={[
                      { label: "Select Module", value: "" },
                      ...modules.map((mod) => ({
                        label: mod,
                        value: mod,
                      })),
                    ]}
                    required
                  />

                  <p className="mt-1 text-sm text-gray-500">
                    Letters, spaces, hyphens, and underscores only.
                  </p>
                </div>

                {/* PUBLIC */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="is_public"
                      checked={form.is_public}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      id="is_public_edit"
                    />

                    <div className="min-w-0">
                      <label
                        htmlFor="is_public_edit"
                        className="cursor-pointer text-sm font-semibold text-gray-700"
                      >
                        Public Access Point
                      </label>

                      <p className="mt-1 text-sm text-gray-500">
                        Public access points don't require authentication.
                      </p>
                    </div>
                  </div>
                </div>

                {/* MAPPED PERMISSION */}
                {accessPointData?.permission_code && (
                  <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700">
                          Mapped Permission
                        </h4>

                        <p className="mt-1 text-sm text-gray-500">
                          Currently assigned permission.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-xl bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <span className="break-all text-sm font-medium text-gray-800">
                        {accessPointData.permission_code}
                      </span>

                      <Button
                        type="button"
                        variant="danger"
                        size="small"
                        onClick={handleDeletePermission}
                        disabled={isDeleting}
                        loading={isDeleting}
                        loadingText="Unmapping..."
                        className="w-full sm:w-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                        Unmap
                      </Button>
                    </div>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      navigate("/user-management/access-points")
                    }
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    loading={loading}
                    loadingText="Updating..."
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    <Shield className="h-4 w-4" />
                    Update Access Point
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* PREVIEW */}
          <div className="xl:col-span-1">
            <AppCard
              className="sticky top-24 border-gray-200"
              title="Preview"
              subtitle="Live access point details"
              icon={<Globe className="h-5 w-5" />}
              renderBody={() => (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                    <Link className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Endpoint
                      </p>

                      <p className="mt-1 break-all text-sm font-medium text-gray-800">
                        {form.endpoint_path || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                    <Settings className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Method
                      </p>

                      <span className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                        {form.method}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                    <Package className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Module
                      </p>

                      <p className="mt-1 break-words text-sm font-medium text-gray-800">
                        {form.module || "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                    <Globe className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />

                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Access Type
                      </p>

                      <span
                        className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          form.is_public
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {form.is_public ? "Public" : "Private"}
                      </span>
                    </div>
                  </div>

                  {accessPointData?.permission_code && (
                    <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />

                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          Permission
                        </p>

                        <p className="mt-1 break-all text-sm font-medium text-gray-800">
                          {accessPointData.permission_code}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessPointEdit;