import React, { useCallback, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  AlertTriangle,
  Loader2,
  XCircle,
} from "lucide-react";
import { notify } from "../../utils/notify";
import UploadDropzone from "./UploadDropzone";
import { skillService } from "../../../../services/skillService";

const REQUIRED_COLUMNS = [
  "Category Name",
  "Category Description",
  "Category Active",
  "Skill Name",
  "Skill Description",
  "Skill Active",
  "SubSkill Name",
  "SubSkill Description",
  "SubSkill Active",
];

const normalize = (value) => `${value || ""}`.trim().toLowerCase();
const ACCEPTED_EXTENSIONS = ["xlsx", "xls", "csv"];

const toPascalCase = (value) => {
  if (!value) return "";
  return String(value)
    .trim()
    .replace(/[_\-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

const normalizeRowKeys = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [String(key).trim(), value]),
  );

const getUploadData = (response) => response?.data?.data || response?.data || {};

const toBoolean = (value, fallback = true) => {
  const normalized = normalize(value);
  if (!normalized) return fallback;
  if (["true", "yes", "y", "1", "active"].includes(normalized)) return true;
  if (["false", "no", "n", "0", "inactive"].includes(normalized)) return false;
  return fallback;
};

const buildUploadSummary = (uploadData) => ({
  totalRows: Number(uploadData.totalRows) || 0,
  validRows: Number(uploadData.validRows) || 0,
  invalidRows: Number(uploadData.invalidRows) || 0,
  duplicateRows: Number(uploadData.duplicateRows) || 0,
  existingRows: Number(uploadData.existingRows) || 0,
});

const getFailedCount = (summary) =>
  (summary?.invalidRows || 0) + (summary?.duplicateRows || 0);

const buildTaxonomyPayload = (parsedRows) => {
  const categoryMap = new Map();

  parsedRows.forEach((row) => {
    const rawCategoryName = `${row["Category Name"] || ""}`.trim();
    const rawSkillName = `${row["Skill Name"] || ""}`.trim();
    const rawSubSkillName = `${row["SubSkill Name"] || ""}`.trim();

    // Convert display names to PascalCase once on upload
    const categoryName = toPascalCase(rawCategoryName);
    const skillName = toPascalCase(rawSkillName);
    const subSkillName = toPascalCase(rawSubSkillName);

    if (!categoryName || !skillName) return;

    const categoryKey = normalize(categoryName);
    const skillKey = normalize(skillName);
    const subSkillKey = normalize(subSkillName);

    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        name: categoryName,
        description: row["Category Description"] || "",
        active: toBoolean(row["Category Active"]),
        skills: [],
        skillMap: new Map(),
      });
    }

    const category = categoryMap.get(categoryKey);

    if (!category.skillMap.has(skillKey)) {
      const skill = {
        name: skillName,
        description: row["Skill Description"] || "",
        active: toBoolean(row["Skill Active"]),
        subSkills: [],
        subSkillKeys: new Set(),
      };

      category.skillMap.set(skillKey, skill);
      category.skills.push(skill);
    }

    if (subSkillName) {
      const skill = category.skillMap.get(skillKey);
      if (!skill.subSkillKeys.has(subSkillKey)) {
        skill.subSkillKeys.add(subSkillKey);
        skill.subSkills.push({
          name: subSkillName,
          description: row["SubSkill Description"] || "",
          active: toBoolean(row["SubSkill Active"]),
        });
      }
    }
  });

  return {
    categories: Array.from(categoryMap.values()).map(
      ({ skillMap, ...category }) => ({
        ...category,
        skills: category.skills.map(({ subSkillKeys, ...skill }) => skill),
      }),
    ),
  };
};

const BulkUploadTab = ({ registerApply, registerStatus }) => {
  const [fileName, setFileName] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [existingRows, setExistingRows] = useState([]);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const uploadInFlightRef = React.useRef(false);
  const saveInFlightRef = React.useRef(false);

  const duplicateIndexes = useMemo(() => {
    const seen = new Set();
    return new Set(
      rows
        .map((row, index) => ({
          index,
          key: `${normalize(row["Category Name"])}::${normalize(row["Skill Name"])}::${normalize(row["SubSkill Name"])}`,
        }))
        .filter((entry) => {
          if (entry.key === "::") return false;
          if (seen.has(entry.key)) return true;
          seen.add(entry.key);
          return false;
        })
        .map((entry) => entry.index),
    );
  }, [rows]);

  const invalidIndexes = useMemo(
    () =>
      new Set(
        rows
          .map((row, index) => ({ row, index }))
          .filter(({ row }) => !row["Category Name"] || !row["Skill Name"])
          .map(({ index }) => index),
      ),
    [rows],
  );

  const validCount = rows.filter(
    (_, index) => !duplicateIndexes.has(index) && !invalidIndexes.has(index),
  ).length;

  const uploadFile = useCallback(async (file, parsedRows = rows) => {
    if (uploadInFlightRef.current) return null;

    if (!file) {
      notify.error("Please upload a file.");
      return null;
    }

    if (!parsedRows.length) {
      notify.error("Uploaded file does not contain any rows.");
      return null;
    }

    const firstRow = parsedRows[0] || {};
    const missingColumns = REQUIRED_COLUMNS.filter(
      (column) => !(column in firstRow),
    );

    if (missingColumns.length > 0) {
      notify.error(`Missing required columns: ${missingColumns.join(", ")}`);
      return null;
    }

    const toastId = notify.loading("Uploading skill taxonomy...");
    uploadInFlightRef.current = true;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await skillService.uploadSkillTaxonomy(formData);

      if (response?.success === false || response?.data?.success === false) {
        throw response;
      }

      const uploadData = getUploadData(response);

      setExistingRows(
        Array.isArray(uploadData.existingRecords)
          ? uploadData.existingRecords
          : [],
      );
      setUploadSummary(buildUploadSummary(uploadData));

      notify.complete(
        toastId,
        response?.message || "Excel processed successfully.",
        "success",
      );
      return uploadData;
    } catch (error) {
      notify.complete(toastId, "Upload failed.", "error");
      throw error;
    } finally {
      uploadInFlightRef.current = false;
      setIsUploading(false);
    }
  }, [rows]);

  const parseFile = async (file) => {
    if (uploadInFlightRef.current || saveInFlightRef.current) return;
    if (!file) return;

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      notify.error("Upload only .xlsx, .xls, or .csv files.");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        notify.error("The selected Excel file does not contain any sheets.");
        return;
      }

      const firstSheet = workbook.Sheets[firstSheetName];
      const data = XLSX.utils
        .sheet_to_json(firstSheet, { defval: "", raw: false })
        .map(normalizeRowKeys);

      setRows(data);
      setFileName(file.name);
      setUploadedFile(file);
      setExistingRows([]);
      setUploadSummary(null);

      await uploadFile(file, data);
    } catch (error) {
      notify.error(error, "Unable to process the selected Excel file.");
    }
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(worksheet, [REQUIRED_COLUMNS], { origin: "A1" });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Skill Taxonomy");
    XLSX.writeFile(workbook, "skill-taxonomy-template.xlsx");
  };

  const handleApply = async () => {
    if (uploadInFlightRef.current || saveInFlightRef.current) return null;

    let saveToastId = null;

    try {
      let summary = uploadSummary;
      if (!summary) {
        summary = await uploadFile(uploadedFile, rows);
      }

      const payload = buildTaxonomyPayload(rows);

      if (!payload.categories.length) {
        notify.error("No valid taxonomy rows to save.");
        return null;
      }

      saveToastId = notify.loading("Saving uploaded skill taxonomy...");
      saveInFlightRef.current = true;
      setIsSaving(true);

      const response = await skillService.saveSkillTaxonomy(payload);

      if (!response?.success) {
        throw new Error(response?.error || "Skill taxonomy save failed.");
      }

      notify.complete(
        saveToastId,
        response?.message || "Skill taxonomy saved successfully.",
        "success",
      );

      return response?.data || summary;
    } catch (error) {
      if (saveToastId) {
        notify.complete(
          saveToastId,
          "Unable to save uploaded taxonomy.",
          "error",
        );
      } else {
        notify.error(error, "Unable to save uploaded taxonomy.");
      }
      throw error;
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    if (typeof registerApply === "function") {
      registerApply(handleApply);
      return () => registerApply(null);
    }
    return undefined;
  }, [registerApply, handleApply]);

  React.useEffect(() => {
    if (typeof registerStatus !== "function") return undefined;

    registerStatus({
      canApply: Boolean(uploadedFile && rows.length),
      isBusy: isUploading || isSaving,
      isUploading,
      isSaving,
    });

    return () => registerStatus({ canApply: false, isBusy: false });
  }, [isSaving, isUploading, registerStatus, rows.length, uploadedFile]);

  const isBusy = isUploading || isSaving;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">Bulk Upload</p>
          <p className="mt-1 text-sm text-slate-500">
            Import skill taxonomy rows in one clean pass.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={isBusy}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
      </div>

      <UploadDropzone onFilesSelected={parseFile} disabled={isBusy} fileName={fileName} />

      {uploadedFile ? (
        <div className="flex flex-col gap-3 rounded-xl border border-indigo-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{uploadedFile.name}</p>
              <p className="text-xs text-slate-500">
                {(uploadedFile.size / 1024).toFixed(1)} KB · {rows.length} preview row{rows.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          {isUploading ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading...
            </div>
          ) : uploadSummary ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Upload complete
            </div>
          ) : null}
        </div>
      ) : null}

      {isBusy ? (
        <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isSaving ? "Saving taxonomy..." : "Uploading..."}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm font-semibold">Valid Rows</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {uploadSummary?.validRows ?? validCount}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Duplicate Rows</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {uploadSummary?.duplicateRows ?? duplicateIndexes.size}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-blue-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Existing Rows</p>
          </div>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {uploadSummary?.existingRows ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-rose-700">
            <XCircle className="h-4 w-4" />
            <p className="text-sm font-semibold">Invalid Rows</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {uploadSummary?.invalidRows ?? invalidIndexes.size}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-semibold text-slate-900">
              Upload Preview
            </p>
          </div>
          {fileName ? (
            <p className="text-xs text-slate-500">{fileName}</p>
          ) : null}
        </div>

        <div className="max-h-[280px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3">Category Name</th>
                <th className="px-4 py-3">Skill Name</th>
                <th className="px-4 py-3">SubSkill Name</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No upload preview yet.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const isDuplicate = duplicateIndexes.has(index);
                  const isInvalid = invalidIndexes.has(index);
                  const isExisting = existingRows.some(
                    (item) => item.rowNumber === index + 2,
                  );

                  const statusClass = isInvalid
                    ? "bg-rose-100 text-rose-700"
                    : isDuplicate
                      ? "bg-amber-100 text-amber-700"
                      : isExisting
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700";

                  const statusLabel = isInvalid
                    ? "Invalid"
                    : isDuplicate
                      ? "Duplicate"
                      : isExisting
                        ? "Existing"
                        : "Valid";

                  return (
                    <tr
                      key={`${row["Category Name"]}-${row["Skill Name"]}-${row["SubSkill Name"]}-${index}`}
                      className={
                        isInvalid
                          ? "bg-rose-50/40"
                          : isDuplicate
                            ? "bg-amber-50/40"
                            : ""
                      }
                    >
                      <td className="px-4 py-3 text-slate-700">
                        {row["Category Name"] || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row["Skill Name"] || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row["SubSkill Name"] || "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply button removed; upload is triggered from the Skill Management modal */}
    </div>
  );
};

export default BulkUploadTab;
