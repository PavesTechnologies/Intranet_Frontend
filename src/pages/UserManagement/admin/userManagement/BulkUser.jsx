import { useState } from "react";
import Button from "../../../../components/Button/Button";
import axios from "axios";
import FileUpload from "../../../../components/forms/FileUpload";
import { toast } from "react-toastify";
import { showStatusToast } from "../../../../components/toastfy/toast";

const BulkUserUpload = ({ onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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
      toastId = toast("Uploading file and reading data...");

      const response = await axios.post(
        `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/multiple-users`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const { created_count, failed_count } = response.data;

      if (failed_count === 0) {
        toast.update(toastId, {
          render: `✅ ${created_count} users created successfully.`,
          type: "success",
          isLoading: false,
          autoClose: 4000,
        });
      } else {
        toast.update(toastId, {
          render: `⚠️ ${created_count} users created, ${failed_count} failed.`,
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
        render: `❌ Upload failed: ${error.response?.data?.detail || error.message}`,
        type: "error",
        isLoading: false,
        autoClose: 5000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-md space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 text-center">
        Bulk User Upload
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FileUpload
          label="Select Excel File (.xlsx)"
          name="userFile"
          onChange={handleFileChange}
        />

        {file && (
          <p className="text-sm text-gray-600">
            Selected file: <span className="font-medium">{file.name}</span>
          </p>
        )}

        <div className="flex justify-between gap-3">
          <Button
            type="submit"
            variant="primary"
            size="small"
            disabled={isUploading}
            className="w-1/2"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={onClose}
            disabled={isUploading}
            className="w-1/2"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BulkUserUpload;
