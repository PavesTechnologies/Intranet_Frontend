import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { CheckCircle2, Download, FileSpreadsheet, AlertTriangle, XCircle } from "lucide-react";
import { notify } from "../../utils/notify";
import UploadDropzone from "./UploadDropzone";

const REQUIRED_COLUMNS = ["Category", "Skill", "SubSkill"];

const normalize = (value) => `${value || ""}`.trim().toLowerCase();

const BulkUploadTab = ({ onApplyRows }) => {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);

  const duplicateIndexes = useMemo(() => {
    const seen = new Set();
    return new Set(
      rows
        .map((row, index) => ({
          index,
          key: `${normalize(row.Category)}::${normalize(row.Skill)}::${normalize(row.SubSkill)}`,
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
          .filter(({ row }) => !row.Category || !row.Skill || !Object.keys(row).some((key) => REQUIRED_COLUMNS.includes(key)))
          .map(({ index }) => index),
      ),
    [rows],
  );

  const validCount = rows.filter((_, index) => !duplicateIndexes.has(index) && !invalidIndexes.has(index)).length;

  const parseFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
    setRows(data);
    setFileName(file.name);
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      { Category: "Frontend", Skill: "React", SubSkill: "Hooks" },
      { Category: "Frontend", Skill: "React", SubSkill: "Redux" },
      { Category: "Backend", Skill: "Java", SubSkill: "Spring Boot" },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "skill-taxonomy-template.xlsx");
  };

  const handleApply = () => {
    if (!rows.length) {
      notify.error("Upload a file first.");
      return;
    }

    const firstRow = rows[0] || {};
    const missingColumns = REQUIRED_COLUMNS.filter((column) => !(column in firstRow));
    if (missingColumns.length > 0) {
      notify.error(`Missing required columns: ${missingColumns.join(", ")}`);
      return;
    }

    if (duplicateIndexes.size > 0 || invalidIndexes.size > 0) {
      notify.error("Resolve duplicate and invalid rows before applying.");
      return;
    }

    onApplyRows(rows);
    notify.success("Bulk upload applied to local mock state.");
    setRows([]);
    setFileName("");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">Bulk Upload</p>
          <p className="mt-1 text-sm text-slate-500">Import skill taxonomy rows in one clean pass.</p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Download Template
        </button>
      </div>

      <UploadDropzone onFilesSelected={parseFile} />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <p className="text-sm font-semibold">Valid Rows</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{validCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm font-semibold">Duplicate Rows</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{duplicateIndexes.size}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-rose-700">
            <XCircle className="h-4 w-4" />
            <p className="text-sm font-semibold">Invalid Rows</p>
          </div>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{invalidIndexes.size}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-semibold text-slate-900">Upload Preview</p>
          </div>
          {fileName ? <p className="text-xs text-slate-500">{fileName}</p> : null}
        </div>

        <div className="max-h-[280px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-left text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Skill</th>
                <th className="px-4 py-3">SubSkill</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                    No upload preview yet.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const isDuplicate = duplicateIndexes.has(index);
                  const isInvalid = invalidIndexes.has(index);
                  const statusClass = isInvalid
                    ? "bg-rose-100 text-rose-700"
                    : isDuplicate
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700";
                  const statusLabel = isInvalid ? "Invalid" : isDuplicate ? "Duplicate" : "Valid";

                  return (
                    <tr key={`${row.Category}-${row.Skill}-${row.SubSkill}-${index}`} className={isInvalid ? "bg-rose-50/40" : isDuplicate ? "bg-amber-50/40" : ""}>
                      <td className="px-4 py-3 text-slate-700">{row.Category || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.Skill || "-"}</td>
                      <td className="px-4 py-3 text-slate-700">{row.SubSkill || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass}`}>
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

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleApply}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          Apply Upload
        </button>
      </div>
    </div>
  );
};

export default BulkUploadTab;
