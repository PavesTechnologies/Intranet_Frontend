import React, { useRef, useState } from "react";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";
import { Upload, Download, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import api from "../../../../api/axiosInstance";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";

const TEMPLATE_COLUMNS = [
  { header: "Epic Name", key: "epicName", width: 22 },
  { header: "Epic Description", key: "epicDesc", width: 28 },
  { header: "Epic Priority", key: "epicPriority", width: 14 },
  { header: "Epic Status", key: "epicStatus", width: 16 },
  { header: "Story Title", key: "storyTitle", width: 22 },
  { header: "Story Description", key: "storyDesc", width: 28 },
  { header: "Story Priority", key: "storyPriority", width: 14 },
  { header: "Story Points", key: "storyPoints", width: 12 },
  { header: "Acceptance Criteria", key: "acceptanceCriteria", width: 28 },
  { header: "Story Status", key: "storyStatus", width: 16 },
  { header: "Task Title", key: "taskTitle", width: 22 },
  { header: "Task Description", key: "taskDesc", width: 28 },
  { header: "Task Priority", key: "taskPriority", width: 14 },
  { header: "Task Status", key: "taskStatus", width: 16 },
];

const STATUS_COLUMNS = ["D", "J", "N"]; // Epic Status, Story Status, Task Status
const TEMPLATE_DATA_ROWS = 200;

const ExcelImportPanel = ({ projectId, projectName, disabled, onImported }) => {
  const fileInputRef = useRef(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const BASE = window.__APP_CONFIG__.PMS_BASE_URL;

  const fetchProjectStatuses = async () => {
    const res = await api.get(`${BASE}/api/projects/${projectId}/statuses`, { headers });
    const list = Array.isArray(res.data) ? res.data : res.data?.content || [];
    return list
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((s) => s.name || s.statusName)
      .filter(Boolean);
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const statusNames = await fetchProjectStatuses();
      if (statusNames.length === 0) {
        showStatusToast("No statuses configured for this project yet", "warn");
        return;
      }

      const workbook = new ExcelJS.Workbook();

      const statusSheet = workbook.addWorksheet("StatusOptions");
      statusSheet.state = "hidden";
      statusNames.forEach((name, idx) => {
        statusSheet.getCell(`A${idx + 1}`).value = name;
      });
      const statusRange = `StatusOptions!$A$1:$A$${statusNames.length}`;

      const sheet = workbook.addWorksheet("Backlog Import");
      sheet.columns = TEMPLATE_COLUMNS;
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      for (let row = 2; row <= TEMPLATE_DATA_ROWS + 1; row++) {
        STATUS_COLUMNS.forEach((col) => {
          sheet.getCell(`${col}${row}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [statusRange],
            showErrorMessage: true,
            errorStyle: "warning",
            errorTitle: "Invalid status",
            error: `Value must be one of: ${statusNames.join(", ")}`,
          };
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const safeName = (projectName || "project").replace(/[^a-z0-9]+/gi, "_");
      saveAs(blob, `backlog_import_template_${safeName}.xlsx`);
    } catch (err) {
      showStatusToast(
        err.response?.data?.message || "Failed to generate Excel template",
        "error",
      );
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleTriggerUpload = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post(`${BASE}/api/excel-import/upload`, formData, {
        params: { projectId },
        headers,
      });

      const data = res.data;
      setResult(data);
      setResultOpen(true);

      if (data.status === "SUCCESS") {
        showStatusToast("Excel imported successfully", "success");
      } else if (data.status === "PARTIAL") {
        showStatusToast("Excel imported with some errors — see details", "warn");
      } else {
        showStatusToast("Excel import failed — see details", "error");
      }

      if ((data.epicsCreated || 0) + (data.storiesCreated || 0) + (data.tasksCreated || 0) > 0) {
        onImported?.();
      }
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Failed to upload Excel file";
      showStatusToast(message, "error");
    } finally {
      setUploading(false);
    }
  };

  const statusMeta = {
    SUCCESS: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Success" },
    PARTIAL: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Partial Success" },
    FAILED: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Failed" },
  };
  const meta = statusMeta[result?.status] || statusMeta.FAILED;
  const StatusIcon = meta.icon;

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        size="small"
        variant="outline"
        className="flex items-center gap-2"
        loading={downloadingTemplate}
        loadingText="Preparing..."
        onClick={handleDownloadTemplate}
      >
        <Download size={16} /> Excel Template
      </Button>

      <Button
        size="small"
        variant="outline"
        className={`flex items-center gap-2 ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        disabled={disabled}
        loading={uploading}
        loadingText="Uploading..."
        onClick={handleTriggerUpload}
      >
        <Upload size={16} /> Import Excel
      </Button>

      <Modal
        isOpen={resultOpen}
        onClose={() => setResultOpen(false)}
        title="Excel Import Result"
        className="max-w-xl"
      >
        {result && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${meta.bg}`}>
              <StatusIcon size={18} className={meta.color} />
              <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-lg font-bold text-indigo-900">{result.epicsCreated}</p>
                <p className="text-xs text-gray-500">Epics Created</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-lg font-bold text-indigo-900">{result.storiesCreated}</p>
                <p className="text-xs text-gray-500">Stories Created</p>
              </div>
              <div className="rounded-lg border border-gray-200 p-3">
                <p className="text-lg font-bold text-indigo-900">{result.tasksCreated}</p>
                <p className="text-xs text-gray-500">Tasks Created</p>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-red-600">
                  Errors ({result.errors.length})
                </h3>
                <ul className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm text-red-700">
                  {result.errors.map((err, idx) => (
                    <li key={idx} className="list-disc ml-4">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setResultOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default ExcelImportPanel;
