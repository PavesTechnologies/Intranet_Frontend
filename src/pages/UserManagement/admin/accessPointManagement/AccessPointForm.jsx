import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { createAccessPoint } from "../../../../services/accessPointService";
import {
  Link,
  Settings,
  Package,
  Globe,
  Shield,
  RotateCcw,
  Eye,
} from "lucide-react";

import Button from "../../../../components/Button/Button";
import Navbar from "../../../../components/Navbar/Navbar";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import AppCard from "../../../../components/Cards/AppCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";

import { toast } from "react-toastify";

const AccessPointForm = () => {
  const [form, setForm] = useState({
    endpoint_path: "",
    method: "GET",
    module: "",
    is_public: false,
  });

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      name: "Access Points",
      onClick: () => navigate("/user-management/access-points"),
      isActive: location.pathname === "/user-management/access-points",
    },
    {
      name: "Add New",
      onClick: () => navigate("/user-management/access-points/create"),
      isActive: location.pathname === "/user-management/access-points/create",
    },
    {
      name: "Permission Mapping",
      onClick: () =>
        navigate("/user-management/access-points/admin/access-point-mapping"),
      isActive:
        location.pathname ===
        "/user-management/access-points/admin/access-point-mapping",
    },
    {
      name: "Access Point Create Bulk",
      onClick: () => navigate("/user-management/access-points/create-bulk"),
      isActive:
        location.pathname === "/user-management/access-points/create-bulk",
    },
    {
      name: "Access Permission Mapping Bulk",
      onClick: () =>
        navigate("/user-management/access-point-map-permission-bulk"),
      isActive:
        location.pathname ===
        "/user-management/access-point-map-permission-bulk",
    },
  ];

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
        "Endpoint path must start with '/' and contain only valid URL characters",
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
      const formData = {
        ...form,
        endpoint_path: form.endpoint_path.trim(),
        module: form.module.trim(),
      };

      await createAccessPoint(formData);

      showUniqueToast("Access point created successfully!", "success");

      setTimeout(() => {
        navigate("/user-management/access-points");
      }, 1000);
    } catch (error) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create access point";

      showUniqueToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({
      endpoint_path: "",
      method: "GET",
      module: "",
      is_public: false,
    });

    showUniqueToast("Form reset successfully", "info");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar logo="Access Points" navItems={navItems} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* FORM SECTION */}
          <div className="xl:col-span-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-6 flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <Shield className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className={Fonts.heading3}>
                    Create Access Point
                  </h2>

                  <p className={`${Fonts.paragraphMuted} mt-1`}>
                    Create and configure secure application endpoints.
                  </p>
                </div>
              </div>

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
                  <FormInput
                    label="Module"
                    name="module"
                    value={form.module}
                    onChange={handleChange}
                    placeholder="Auth Management"
                    required
                  />

                  <p className="mt-1 text-sm text-gray-500">
                    Letters, spaces, hyphens, and underscores only.
                  </p>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      name="is_public"
                      checked={form.is_public}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      id="is_public"
                    />

                    <div className="min-w-0">
                      <label
                        htmlFor="is_public"
                        className="cursor-pointer text-sm font-semibold text-gray-700"
                      >
                        Public Access Point
                      </label>

                      <p className="mt-1 text-sm text-gray-500">
                        Public access points don't require authentication.
                        Use carefully for publicly accessible APIs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    onClick={handleReset}
                    variant="outline"
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>

                  <Button
                    type="submit"
                    loading={loading}
                    loadingText="Creating..."
                    variant="primary"
                    className="w-full sm:w-auto"
                  >
                    <Shield className="h-4 w-4" />
                    Create Access Point
                  </Button>
                </div>
              </form>
            </div>
          </div>

          {/* PREVIEW SECTION */}
          <div className="xl:col-span-1">
            <AppCard
              className="sticky top-24 border-gray-200"
              title="Preview"
              subtitle="Live access point configuration"
              icon={<Eye className="h-5 w-5" />}
              renderBody={() => (
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                    <Link className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />

                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                        Endpoint
                      </p>

                      <p
                        className="mt-1 break-all text-sm font-medium text-gray-800"
                        title={form.endpoint_path || "Not set"}
                      >
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

                      <p
                        className="mt-1 break-words text-sm font-medium text-gray-800"
                        title={form.module || "Not set"}
                      >
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
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessPointForm;