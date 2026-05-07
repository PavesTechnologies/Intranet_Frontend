import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import {
  UploadCloud,
  FileSpreadsheet,
  Info,
  CheckCircle2,
} from "lucide-react";

import Button from "../../../../components/Button/Button";
import FileUpload from "../../../../components/forms/FileUpload";
import Navbar from "../../../../components/Navbar/Navbar";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";

const BulkPermissionMapping = ({ onClose, onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const navItems = [
    {
      name: "Access Points",
      onClick: () => navigate("/user-management/access-points"),
      isActive: location.pathname === "/user-management/access-points",
    },
    {
      name: "Add New",
      onClick: () => navigate("/user-management/access-points/create"),
      isActive:
        location.pathname === "/user-management/access-points/create",
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
      onClick: () =>
        navigate("/user-management/access-points/create-bulk"),
      isActive:
        location.pathname ===
        "/user-management/access-points/create-bulk",
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

    if (typeof onClose === "function") {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      showStatusToast(
        "Please select an Excel file before submitting.",
        "error"
      );
      return;
    }

    if (!file.name.endsWith(".xlsx")) {
      showStatusToast("Only .xlsx files are allowed.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    let toastId;

    try {
      setIsUploading(true);

      toastId = toast.loading(
        "Uploading file and mapping permissions..."
      );

      const response = await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/access-points/access-point-map-permission-bulk`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const { mapped_count, failed_count } = response.data;

      if (failed_count === 0) {
        toast.update(toastId, {
          render: `✅ ${mapped_count} permission mappings created successfully.`,
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

      if (typeof onSuccess === "function") {
        onSuccess();
      }
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
    <div className="min-h-screen bg-gray-50">
      <Navbar logo="Access Points" navItems={navItems} />

      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <div className="mb-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                  <UploadCloud className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <h2 className={Fonts.heading4}>
                    Bulk Permission Mapping
                  </h2>

                  <p className={Fonts.paragraphMuted}>
                    Upload Excel files to map permissions with access
                    points in bulk.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            {isUploading ? (
              <div className="py-12">
                <LoadingSpinner text="Uploading and processing file..." />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Upload Section */}
                <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50/40 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-blue-700" />

                    <h3 className="font-semibold text-gray-800">
                      Upload Excel File
                    </h3>
                  </div>

                  <FileUpload
                    label="Select Excel File (.xlsx)"
                    name="permissionMappingFile"
                    onChange={handleFileChange}
                    accept=".xlsx"
                  />

                  {file && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />

                      <span className="truncate font-medium">
                        {file.name}
                      </span>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-blue-700" />

                    <h4 className="text-sm font-semibold text-blue-800">
                      Instructions
                    </h4>
                  </div>

                  <ul className="space-y-2 pl-5 text-sm text-blue-700">
                    <li className="list-disc">
                      Accepted format:{" "}
                      <strong>.xlsx</strong>
                    </li>

                    <li className="list-disc">
                      Access Point IDs and Permission IDs must
                      already exist.
                    </li>

                    <li className="list-disc">
                      Invalid or duplicate mappings are skipped
                      automatically.
                    </li>

                    <li className="list-disc">
                      Use the provided sample template for best
                      results.
                    </li>
                  </ul>
                </div>

                {/* Actions */}
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

export default BulkPermissionMapping;