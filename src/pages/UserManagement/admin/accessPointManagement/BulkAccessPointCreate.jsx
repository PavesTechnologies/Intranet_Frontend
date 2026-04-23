import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Button from "../../../../components/Button/Button";
import Navbar from "../../../../components/Navbar/Navbar";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";

/* ==========================================================
   Inline FileUpload Component (formerly separate file)
   ========================================================== */
const FileUpload = React.forwardRef(
  ({ label, name, onChange, accept, ...props }, ref) => {
    return (
      <div className="flex flex-col space-y-2">
        {label && (
          <label htmlFor={name} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <input
          ref={ref}
          type="file"
          id={name}
          name={name}
          accept={accept}
          onChange={onChange}
          className="border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          {...props}
        />
      </div>
    );
  },
);

FileUpload.displayName = "FileUpload";

/* ==========================================================
   Main BulkAccessPointCreate Component
   ========================================================== */
const BulkAccessPointCreate = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null); // ✅ Reference to reset file input

  // ✅ Navbar Items
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

  // ✅ Handle Cancel Button (reset file input + clear state)
  const handleCancel = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset file input visually
    }
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

    try {
      setIsUploading(true);
      // showStatusToast(
      //   "Uploading file and processing access points...",
      //   "success"
      // );

      const response = await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/access-points/bulk-access-points-create`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      console.log({ r: response.data });
      const { successful, failed } = response.data.summary;

      if (failed === 0) {
        showStatusToast(
          `✅ ${successful} access points created successfully.`,
          "success",
        );
      } else {
        showStatusToast(
          `⚠️ ${successful} access points created, ${failed} failed.`,
          "error",
        );
      }

      // Reset form after successful upload
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (typeof onSuccess === "function") onSuccess();
    } catch (error) {
      console.error(error);
      showStatusToast("An error occurred while uploading the file.", "error");
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
            Bulk Access Point Creation
          </h2>

          <p className="text-sm text-gray-600 text-center mb-4">
            Upload an Excel file (<strong>.xlsx</strong>) containing access
            point details. Ensure your file follows the required format.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <FileUpload
              ref={fileInputRef} // ✅ Forwarded ref
              label="Select Excel File (.xlsx)"
              name="accessPointsFile"
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
              <ul className="list-disc m-2 space-y-1">
                <li>
                  Accepted format: <strong>.xlsx</strong>
                </li>
                <li>
                  Ensure all required columns endpoint_path, method and module
                  are filled correctly.
                </li>
                <li>Duplicate entries will be skipped automatically.</li>
              </ul>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default BulkAccessPointCreate;
