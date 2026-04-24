import React, { useEffect, useState } from "react";
import {
  getAccessPoint,
  updateAccessPoint,
  listModules,
} from "../../../../services/accessPointService";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../../../../components/Button/Button";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { toast } from "react-toastify"; // ✅ Import toast

const AccessPointEdit = () => {
  const { access_uuid } = useParams();
  const [form, setForm] = useState(null); // Keep null initially to show loading
  const [modules, setModules] = useState([]);
  const [accessPointData, setAccessPointData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false); // ✅ Added loading state
  const navigate = useNavigate();

  // ✅ Validation function from AccessPointForm
  const validateEndpointPath = (path) => {
    const regex = /^\/[a-zA-Z0-9\-_\/{}:]*$/;
    return regex.test(path.trim());
  };

  // ✅ Validation function from AccessPointForm
  const validateModuleName = (name) => {
    const regex = /^[A-Za-z\s\-_]+$/;
    return regex.test(name.trim());
  };

  // ✅ Unique toast function from AccessPointForm
  const showUniqueToast = (message, type) => {
    toast.dismiss(); // Dismiss all existing toasts
    showStatusToast(message, type, { toastId: "unique-toast" });
  };

  useEffect(() => {
    let isMounted = true; // Flag to prevent state update on unmounted component
    const fetchData = async () => {
      try {
        // Fetch modules list
        const modulesRes = await listModules();
        if (isMounted) setModules(modulesRes.data);

        // Fetch existing access point data
        const accessPointRes = await getAccessPoint(access_uuid);
        if (isMounted) {
          setAccessPointData(accessPointRes.data);
          setForm({
            endpoint_path: accessPointRes.data.endpoint_path,
            method: accessPointRes.data.method,
            module: accessPointRes.data.module,
            is_public: accessPointRes.data.is_public,
          });
        }
      } catch (error) {
        if (isMounted) {
          showUniqueToast("Failed to load access point data", "error");
          console.error("Error fetching data:", error);
          // Optionally navigate back or show an error state
          // navigate("/user-management/access-points");
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false; // Cleanup function to set flag false when component unmounts
    };
  }, [access_uuid]); // Removed navigate from dependencies as it's stable

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  // ✅ Enhanced handleSubmit with validation, loading, trimming, and specific toasts
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation checks
    if (!form.endpoint_path.trim()) {
      return showUniqueToast("Enter the Endpoint Path", "error");
    }

    if (!form.module.trim()) {
      return showUniqueToast("Enter the Module", "error");
    }

    if (!validateEndpointPath(form.endpoint_path)) {
      return showUniqueToast(
        "Endpoint path must start with '/' and contain only valid URL characters",
        "error",
      );
    }

    if (!validateModuleName(form.module)) {
      return showUniqueToast(
        "Module name can only contain letters, spaces, hyphens, and underscores",
        "error",
      );
    }

    setLoading(true); // Start loading

    try {
      // Prepare form data with trimmed values
      const formDataToUpdate = {
        ...form,
        endpoint_path: form.endpoint_path.trim(),
        module: form.module.trim(),
      };

      await updateAccessPoint(access_uuid, formDataToUpdate);
      showUniqueToast("Access point updated successfully!", "success");

      // Redirect after update
      setTimeout(() => {
        // Keep delay consistent with create form
        navigate("/user-management/access-points");
      }, 1000);
    } catch (error) {
      console.error("Error updating access point:", error);
      // Show backend error message or fallback
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update access point";
      showUniqueToast(errorMessage, "error");
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const handleDeletePermission = async () => {
    if (!accessPointData?.permission_uuid) return;

    // Optional: Add a confirmation dialog here
    // if (!window.confirm("Are you sure you want to unmap this permission?")) {
    //   return;
    // }

    setIsDeleting(true);
    try {
      // Call the unmap permission API
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
        },
      );

      if (response.ok) {
        // Refresh the access point data to reflect the change
        const updatedData = await getAccessPoint(access_uuid);
        setAccessPointData(updatedData.data);
        showUniqueToast("Permission unmapped successfully", "success");
      } else {
        const errorData = await response.json(); // Try to get error details
        const errorMessage =
          errorData?.detail ||
          errorData?.message ||
          "Failed to unmap permission";
        console.error("Failed to delete permission:", errorMessage);
        showUniqueToast(errorMessage, "error");
      }
    } catch (error) {
      console.error("Error deleting permission:", error);
      showUniqueToast("Error unmapping permission", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Keep Loading indicator while form data is being fetched
  if (!form) {
    return (
      <div className="text-center mt-10 text-gray-600 text-lg">Loading...</div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <h2 className="text-3xl font-semibold text-blue-700">
          Edit Access Point
        </h2>
        <Button
          variant="secondary"
          size="medium"
          onClick={() => navigate("/user-management/access-points")}
        >
          ← Back
        </Button>
      </div>

      {/* ✅ Styling adjusted slightly for consistency */}
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-md mt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Endpoint Path <span className="text-red-500">*</span>
            </label>
            <input
              name="endpoint_path"
              value={form.endpoint_path}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 focus:border-blue-500" // Matched create form style
              placeholder="/api/resource (must start with /)"
              onKeyPress={(e) => e.key === "Enter" && e.preventDefault()} // ✅ Prevent Enter submit
            />
            <p className="text-sm text-gray-500 mt-1">
              Must start with '/' and contain only valid URL characters
              (letters, numbers, -, _, /, {}, :)
            </p>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Method <span className="text-red-500">*</span>
            </label>
            <select
              name="method"
              value={form.method}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 focus:border-blue-500" // Matched create form style
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option> {/* ✅ Added PATCH */}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Module <span className="text-red-500">*</span>
            </label>
            <select
              name="module"
              value={form.module}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring focus:ring-blue-300 focus:border-blue-500" // Matched create form style
            >
              <option value="">Select Module</option>
              {modules.map((mod, idx) => (
                <option key={idx} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Can contain letters, spaces, hyphens, and underscores only
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {" "}
            {/* ✅ Matched create form style */}
            <input
              type="checkbox"
              name="is_public"
              checked={form.is_public}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" // Matched create form style
              id="is_public_edit" // ✅ Added unique ID
            />
            <label
              htmlFor="is_public_edit"
              className="text-gray-700 font-medium cursor-pointer"
            >
              {" "}
              {/* ✅ Matched create form style */}
              Public Access Point
            </label>
          </div>

          {/* ✅ Note section like create form */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <strong>Note:</strong> Public access points don't require
            authentication. Use this carefully for endpoints that should be
            accessible without login.
          </div>

          {/* Permission Display with Delete Button */}
          {accessPointData && accessPointData.permission_code && (
            <div className="border-t pt-4">
              <label className="block text-gray-700 font-medium mb-1">
                Mapped Permission
              </label>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                {" "}
                {/* Added border */}
                <span className="font-medium text-gray-800">
                  {accessPointData.permission_code}
                </span>
                <Button
                  type="button"
                  onClick={handleDeletePermission}
                  disabled={isDeleting}
                  variant="danger" // ✅ Use Button component variant
                  size="small" // ✅ Use Button component size
                  className={`transition disabled:opacity-50 disabled:cursor-not-allowed ${isDeleting ? "bg-red-300" : "hover:bg-red-700"}`} // Adjusted hover/disabled
                >
                  {isDeleting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                      Unmapping...
                    </div>
                  ) : (
                    "Unmap" // ✅ Changed text
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ✅ Submit Button styled like create form */}
          <Button
            type="submit"
            disabled={loading}
            className={`w-full py-2 px-4 rounded-lg transition duration-300 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            } text-white`}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Updating...
              </div>
            ) : (
              "Update Access Point"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AccessPointEdit;
