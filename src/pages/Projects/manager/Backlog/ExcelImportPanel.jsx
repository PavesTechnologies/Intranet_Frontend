import React, { useEffect, useRef, useState } from "react";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { saveAs } from "file-saver";
import {
  FileSpreadsheet,
  Upload,
  Download,
  Info,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
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
const MAX_LIST_FORMULA_LENGTH = 255; // Excel's hard limit for an inline data-validation list

// Backends spell row/field/message keys differently (and FastAPI-style
// validation errors use {loc, msg} instead) — normalize whatever comes back
// into one shape so the result modal can render it consistently.
const normalizeErrorItem = (e) => {
  if (typeof e === "string") return { message: e };
  if (e && typeof e === "object") {
    const row = e.row ?? e.rowNumber ?? e.row_number ?? e.rowIndex ?? null;
    const field =
      e.field ??
      e.column ??
      e.fieldName ??
      (Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : null);
    const message = e.message ?? e.msg ?? e.error ?? e.detail ?? JSON.stringify(e);
    return { row, field, message };
  }
  return { message: String(e) };
};

const normalizeErrorList = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(normalizeErrorItem);
  return [normalizeErrorItem(raw)];
};

// Builds a "result" object (same shape the success path uses) out of a
// failed axios request, so an outright upload failure gets the same
// well-explained modal treatment as a partial/validation failure instead
// of a single toast line.
const extractUploadError = (err) => {
  const data = err.response?.data;
  const status = err.response?.status;

  let message;
  if (typeof data === "string" && data.trim()) {
    message = data;
  } else if (typeof data?.message === "string" && data.message) {
    message = data.message;
  } else if (typeof data?.error === "string" && data.error) {
    message = data.error;
  } else if (typeof data?.detail === "string" && data.detail) {
    message = data.detail;
  } else if (!err.response) {
    message = "Could not reach the server. Check your connection and try again.";
  } else if (status === 413) {
    message = "This file is too large to upload.";
  } else {
    message = err.message || "Failed to upload Excel file";
  }

  const rawList =
    data?.errors ??
    data?.rowErrors ??
    data?.violations ??
    (Array.isArray(data?.detail) ? data.detail : null) ??
    null;

  return {
    status: "FAILED",
    message,
    errors: normalizeErrorList(rawList),
  };
};

const EPIC_NAME_NOTE =
  "Leave this blank on the rows below to keep adding stories under the SAME epic. " +
  "Only type the epic name again when you're starting a NEW epic — repeating it creates a duplicate epic.";
const STORY_TITLE_NOTE =
  "Leave this blank on the rows below to keep adding tasks under the SAME story. " +
  "Only type the story title again when you're starting a NEW story — repeating it creates a duplicate story.";

const ExcelImportPanel = ({ projectId, projectName, disabled, onImported }) => {
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [formatGuideOpen, setFormatGuideOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

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
      // Statuses are only used to build the optional status dropdown — a
      // project with no statuses yet (or a statuses endpoint hiccup)
      // shouldn't block the template download itself.
      let statusNames = [];
      try {
        statusNames = await fetchProjectStatuses();
      } catch (statusErr) {
        statusNames = [];
      }
      if (statusNames.length === 0) {
        showStatusToast(
          "No statuses configured for this project yet — downloading template without a status dropdown",
          "warn",
        );
      }

      const workbook = new ExcelJS.Workbook();

      // Single sheet only — status dropdown uses an inline list formula so we
      // don't need a second (hidden) sheet just to hold the option values.
      const listFormula = `"${statusNames.join(",")}"`;
      const statusValidation =
        statusNames.length > 0 && listFormula.length <= MAX_LIST_FORMULA_LENGTH
          ? {
              type: "list",
              allowBlank: true,
              formulae: [listFormula],
              showErrorMessage: true,
              errorStyle: "warning",
              errorTitle: "Invalid status",
              error: `Value must be one of: ${statusNames.join(", ")}`,
            }
          : null;

      const sheet = workbook.addWorksheet("Backlog Import");
      sheet.columns = TEMPLATE_COLUMNS;
      sheet.getRow(1).font = { bold: true };
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      sheet.getCell("A1").note = EPIC_NAME_NOTE;
      sheet.getCell("E1").note = STORY_TITLE_NOTE;

      // ── Example rows: show that Epic Name / Story Title are only filled
      // in on the FIRST row of that epic/story — the merged, blank cells
      // below them are how you continue adding stories/tasks to the same
      // parent without retyping (and without the backend creating duplicates).
      const s0 = statusNames[0] || "";
      const s1 = statusNames.length > 0 ? statusNames[Math.min(1, statusNames.length - 1)] : "";
      const exampleRows = [
        ["Authentication Module", "Login & signup flows", "HIGH", s0, "Login Page", "Build login UI", "HIGH", 5, "User sees an error on invalid credentials", s0, "Create login form", "HTML/CSS form", "MEDIUM", s0],
        ["", "", "", "", "", "", "", "", "", "", "Add client-side validation", "Validate email/password fields", "LOW", s0],
        ["", "", "", "", "Signup Page", "Build signup UI", "MEDIUM", 8, "User receives a confirmation email", s1, "Create signup form", "HTML/CSS form", "MEDIUM", s0],
        ["", "", "", "", "", "", "", "", "", "", "Send confirmation email", "Trigger email on signup", "LOW", s0],
      ];
      sheet.addRows(exampleRows);
      for (let i = 0; i < exampleRows.length; i++) {
        sheet.getRow(2 + i).font = { italic: true, color: { argb: "FF6B7280" } };
      }
      sheet.mergeCells("A2:A5"); // Epic Name spans the whole "Authentication Module" group
      sheet.mergeCells("E2:E3"); // Story Title spans the "Login Page" task rows
      sheet.mergeCells("E4:E5"); // Story Title spans the "Signup Page" task rows

      const lastDataRow = TEMPLATE_DATA_ROWS + 1;
      if (statusValidation) {
        for (let row = 2; row <= lastDataRow; row++) {
          STATUS_COLUMNS.forEach((col) => {
            sheet.getCell(`${col}${row}`).dataValidation = statusValidation;
          });
        }
      }

      // ── Statuses legend: lists every status configured for this project, in
      // order, so it's visible right in the sheet — not just inside a dropdown
      // you have to click into. Placed a column past the last used column (N)
      // so it never collides with the Epic/Story/Task data columns.
      sheet.getColumn(16).width = 10; // P
      sheet.getColumn(17).width = 26; // Q
      sheet.mergeCells("P1:Q1");
      const legendTitleCell = sheet.getCell("P1");
      legendTitleCell.value = "Valid values for Status columns (D, J, N)";
      legendTitleCell.font = { bold: true };
      legendTitleCell.alignment = { wrapText: true, vertical: "middle" };

      sheet.getCell("P2").value = "Order";
      sheet.getCell("Q2").value = "Status Name";
      sheet.getRow(2).font = { bold: true };

      if (statusNames.length > 0) {
        statusNames.forEach((name, idx) => {
          sheet.getCell(`P${idx + 3}`).value = idx + 1;
          sheet.getCell(`Q${idx + 3}`).value = name;
        });
      } else {
        sheet.mergeCells("P3:Q3");
        const emptyCell = sheet.getCell("P3");
        emptyCell.value = "No statuses configured for this project yet";
        emptyCell.font = { italic: true, color: { argb: "FF9CA3AF" } };
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

    // Enforce "one sheet per workbook" up front for modern .xlsx files so the
    // user finds out immediately instead of waiting on a round trip to the
    // server. Legacy .xls files can't be read by ExcelJS client-side, so those
    // fall through to backend validation instead.
    if (/\.xlsx$/i.test(file.name)) {
      try {
        const buffer = await file.arrayBuffer();
        const probeWorkbook = new ExcelJS.Workbook();
        await probeWorkbook.xlsx.load(buffer);
        if (probeWorkbook.worksheets.length > 1) {
          showStatusToast(
            `This file has ${probeWorkbook.worksheets.length} sheets. Only one sheet per Excel file can be uploaded — remove the extra sheets and try again.`,
            "error",
          );
          return;
        }
      } catch (probeErr) {
        // Not a well-formed .xlsx (or unreadable) — let the backend report the error.
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post(`${BASE}/api/excel-import/upload`, formData, {
        params: { projectId },
        headers,
      });

      const data = { ...res.data, errors: normalizeErrorList(res.data.errors) };
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
      // Show the same well-explained result modal for an outright failure
      // (bad file, validation error, network issue) instead of just a toast.
      const failureResult = extractUploadError(err);
      setResult(failureResult);
      setResultOpen(true);
      showStatusToast(failureResult.message, "error");
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

      <div className="relative" ref={menuRef}>
        <Button
          size="small"
          variant="outline"
          className="flex items-center gap-2"
          loading={downloadingTemplate || uploading}
          loadingText={downloadingTemplate ? "Preparing..." : "Uploading..."}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <FileSpreadsheet size={16} />
          Excel
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
          />
        </Button>

        {menuOpen && (
          <div
            className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
          >
            <div className="py-1">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  handleDownloadTemplate();
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download size={16} className="flex-shrink-0" />
                Download Excel Template
              </button>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  setFormatGuideOpen(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Info size={16} className="flex-shrink-0" />
                Format Guide
              </button>

              <button
                onClick={() => {
                  if (disabled) return;
                  setMenuOpen(false);
                  handleTriggerUpload();
                }}
                disabled={disabled}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 ${
                  disabled ? "cursor-not-allowed opacity-50" : ""
                }`}
              >
                <Upload size={16} className="flex-shrink-0" />
                Import Excel
              </button>
            </div>
          </div>
        )}
      </div>

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

            {result.message && (
              <p className="text-sm text-gray-600">{result.message}</p>
            )}

            {"epicsCreated" in result && (
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
            )}

            {result.errors?.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-red-600">
                  Errors ({result.errors.length})
                </h3>
                <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-red-100 bg-red-50/50 p-3 text-sm text-red-700">
                  {result.errors.map((err, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <XCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
                      <span>
                        {(err.row != null || err.field) && (
                          <span className="mr-1.5 inline-flex items-center gap-1 align-middle">
                            {err.row != null && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                                Row {err.row}
                              </span>
                            )}
                            {err.field && (
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-semibold text-red-700">
                                {err.field}
                              </span>
                            )}
                          </span>
                        )}
                        {err.message}
                      </span>
                    </li>
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

      <Modal
        isOpen={formatGuideOpen}
        onClose={() => setFormatGuideOpen(false)}
        title="Excel Import Format Guide"
        className="max-w-xl"
      >
        <div className="space-y-4 text-sm text-gray-700">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="font-semibold text-amber-800">Only one sheet per Excel file</p>
            <p className="mt-1 text-amber-700">
              Each uploaded workbook must contain exactly one sheet. If your file has
              multiple sheets (tabs), delete the extra ones before uploading — files
              with more than one sheet will be rejected.
            </p>
          </div>

          <div>
            <p className="font-semibold text-gray-900">Epic → Story → Task structure</p>
            <p className="mt-1">
              Each row represents one Task. Tasks are grouped under a Story, and
              Stories are grouped under an Epic, using these columns:
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li><span className="font-medium">Epic:</span> Epic Name, Epic Description, Epic Priority, Epic Status</li>
              <li><span className="font-medium">Story:</span> Story Title, Story Description, Story Priority, Story Points, Acceptance Criteria, Story Status</li>
              <li><span className="font-medium">Task:</span> Task Title, Task Description, Task Priority, Task Status</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-900">How to group rows</p>
            <ul className="mt-2 ml-4 list-disc space-y-1">
              <li>
                Fill in <span className="font-medium">Epic Name</span> only on the first
                row of that epic. Leave it blank on the rows below to keep adding
                stories/tasks under the same epic — repeating the name creates a
                duplicate epic.
              </li>
              <li>
                Fill in <span className="font-medium">Story Title</span> only on the
                first row of that story. Leave it blank on the rows below to keep
                adding tasks under the same story — repeating the title creates a
                duplicate story.
              </li>
              <li>
                <span className="font-medium">Task Title</span> must be filled in on
                every row — each row is one task.
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-500">
            Tip: use "Download Excel Template" from the Excel menu above — it
            already has the correct columns, an example Epic/Story/Task group,
            a dropdown for the status columns, and a "Valid values for Status
            columns" legend (columns P/Q) listing every status configured for
            this project, in order, so you can see the exact allowed values
            without opening a dropdown.
          </p>

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={() => setFormatGuideOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ExcelImportPanel;
