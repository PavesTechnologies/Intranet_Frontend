import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { UploadCloud, FileSpreadsheet } from "lucide-react";

import Button from "../../../../components/Button/Button";
import FileUpload from "../../../../components/forms/FileUpload";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { Fonts } from "../../../../components/Fonts/Fonts";

const BulkUserUpload = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!file) {
      showStatusToast("Please select a file before submitting.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    let toastId;

    try {
      setIsUploading(true);

      toastId = toast.loading("Uploading file and reading data...");

      const response = await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/multiple-users`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const { created_count = 0, failed_count = 0 } = response.data || {};

      if (failed_count === 0) {
        toast.update(toastId, {
          render: `${created_count} users created successfully.`,
          type: "success",
          isLoading: false,
          autoClose: 4000,
        });
      } else {
        toast.update(toastId, {
          render: `${created_count} users created, ${failed_count} failed.`,
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
        render: `Upload failed: ${
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
    <div className="mx-auto w-full max-w-2xl rounded-xl bg-white">
      <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
            <FileSpreadsheet size={22} />
          </div>

          <div>
            <h2 className={Fonts.heading4}>Bulk User Upload</h2>
            <p className={Fonts.paragraphMuted}>
              Upload an Excel file to create multiple users at once.
            </p>
          </div>
        </div>

        <FileUpload
          label="Select Excel File (.xlsx)"
          name="userFile"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
        />

        {file && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">
              Selected file:{" "}
              <span className="font-semibold text-gray-800">{file.name}</span>
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="medium"
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            size="medium"
            loading={isUploading}
            loadingText="Uploading..."
            disabled={isUploading}
          >
            <UploadCloud size={16} />
            Upload
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BulkUserUpload;