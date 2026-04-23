import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "../../../../components/Button/Button";
import FileUpload from "../../../../components/forms/FileUpload";
import Navbar from "../../../../components/Navbar/Navbar";
import axios from "axios";
import { toast } from "react-toastify";
import { showStatusToast } from "../../../../components/toastfy/toast";

/**
 * BulkPermissionMapping
 * - Allows bulk permission mapping from Excel (.xlsx)
 * - Mirrors BulkAccessPointCreate layout and functionality
 */
const BulkPermissionMapping = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // ✅ Navbar Items (same as AccessPointManagement)
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

  // ✅ Handle File Selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // ✅ Handle Cancel Button
  const handleCancel = () => {
    setFile(null);
    if (typeof onClose === "function") onClose();
  };

  // ✅ Handle Upload Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      showStatusToast("Please select a file before submitting.", "error");
      return;
    }

    if (!file.name.endsWith(".xlsx")) {
      showStatusToast("Only .xlsx Excel files are allowed.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    let toastId;
    try {
      setIsUploading(true);
      toastId = toast("Uploading file and mapping permissions...");

      // 🔗 API endpoint for bulk permission mapping
      const response = await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/access-points/access-point-map-permission-bulk`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const { mapped_count, failed_count } = response.data;

      if (failed_count === 0) {
        toast.update(toastId, {
          render: `✅ ${mapped_count} permissions mapped successfully.`,
          type: "success",
          isLoading: false,
          autoClose: 4000,
        });
      } else {
        toast.update(toastId, {
          render: `⚠️ ${mapped_count} mapped, ${failed_count} failed.`,
          type: "warning",
          isLoading: false,
          autoClose: 5000,
        });
      }

      setFile(null);
      if (typeof onSuccess === "function") onSuccess();
    } catch (error) {
      console.error(error);
      toast.update(toastId, {
        render: `❌ Upload failed: ${
          error.response?.data?.detail || error.message
        }`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ✅ Shared Navbar */}
      <Navbar logo="Access Points" navItems={navItems} />

      {/* ✅ Centered Upload Form */}
      <main className="flex-grow flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
            Bulk Permission Mapping
          </h2>

          <p className="text-sm text-gray-600 text-center mb-4">
            Upload an Excel file (<strong>.xlsx</strong>) containing Access
            Point–Permission mapping details. Ensure your file follows the
            required format.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FileUpload
              label="Select Excel File (.xlsx)"
              name="permissionMappingFile"
              onChange={handleFileChange}
              accept=".xlsx"
            />

            {file && (
              <div className="text-sm text-gray-600 text-center">
                Selected file:{" "}
                <span className="font-medium text-blue-600">{file.name}</span>
              </div>
            )}

            <div className="flex justify-between gap-4">
              <Button
                type="submit"
                variant="primary"
                size="medium"
                disabled={isUploading}
                className="w-1/2"
              >
                {isUploading ? "Uploading..." : "Upload"}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="medium"
                onClick={handleCancel}
                disabled={isUploading}
                className="w-1/2"
              >
                Cancel
              </Button>
            </div>

            {/* ✅ Helpful Notes */}
            <div className="mt-4 bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg p-3">
              <p className="font-semibold mb-1">Instructions:</p>
              <ul className="list-disc  space-y-1 list m-2">
                <li>
                  Accepted format: <strong>.xlsx</strong>
                </li>
                <li>
                  Ensure Access Point IDs and Permission IDs match existing
                  records.
                </li>
                <li>
                  Duplicate or invalid mappings will be skipped automatically.
                </li>
                <li>
                  Download a sample file from the admin panel for reference.
                </li>
              </ul>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BulkPermissionMapping;
