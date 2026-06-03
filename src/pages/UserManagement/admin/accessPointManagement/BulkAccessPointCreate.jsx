import React, { useMemo, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../../../api/axiosInstance";
import {
  UploadCloud,
  ShieldCheck,
  FileSpreadsheet,
  Info,
  CheckCircle2,
} from "lucide-react";

import Button from "../../../../components/Button/Button";
import Navbar from "../../../../components/Navbar/Navbar";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";

const FileUpload = React.forwardRef(
  ({ label, name, onChange, accept, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-2">
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
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm transition focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20"
          {...props}
        />
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";

const BulkAccessPointCreate = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef(null);

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

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleCancel = () => {
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (typeof onClose === "function") {
      onClose();
    }
  };

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

      const response = await api.post(
        "/admin/access-points/bulk-access-points-create",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const { successful, failed } = response.data.summary;

      if (failed === 0) {
        showStatusToast(
          `✅ ${successful} access point(s) created successfully.`,
          "success"
        );
      } else {
        showStatusToast(`⚠️ ${successful} created, ${failed} failed.`, "warning");
      }

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (typeof onSuccess === "function") {
        onSuccess();
      }
    } catch (error) {
      console.error(error);

      showStatusToast(
        error?.response?.data?.detail ||
          "An error occurred while uploading the file.",
        "error"
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar logo="Access Points" navItems={navItems} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <ShieldCheck className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className={Fonts.heading4}>
                    Bulk Access Point Creation
                  </h2>

                  <p className={Fonts.paragraphMuted}>
                    Upload Excel files to create access points in bulk.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            {isUploading ? (
              <div className="py-14">
                <LoadingSpinner text="Uploading and processing file..." />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-700" />

                    <h3 className="font-semibold text-gray-800">
                      Upload Excel File
                    </h3>
                  </div>

                  <FileUpload
                    ref={fileInputRef}
                    label="Select Excel File (.xlsx)"
                    name="accessPointsFile"
                    onChange={handleFileChange}
                    accept=".xlsx"
                  />

                  {file && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />

                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-700" />

                    <h4 className="text-sm font-semibold text-blue-800">
                      Instructions
                    </h4>
                  </div>

                  <ul className="space-y-2 pl-5 text-sm text-blue-700">
                    <li className="list-disc">
                      Accepted format: <strong>.xlsx</strong>
                    </li>

                    <li className="list-disc">
                      Required columns:{" "}
                      <strong>endpoint_path, method, module</strong>
                    </li>

                    <li className="list-disc">
                      Duplicate entries are skipped automatically.
                    </li>

                    <li className="list-disc">
                      Ensure all endpoint details are valid before upload.
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="medium"
                    onClick={handleCancel}
                    disabled={isUploading}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    disabled={!file || isUploading}
                    className="w-full sm:w-auto"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload File
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkAccessPointCreate;