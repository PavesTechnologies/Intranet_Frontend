"use client";

import React, { useState } from "react";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import Button from "../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { Fonts } from "../../../components/Fonts/Fonts";

export default function BulkUpload() {
  const { user } = useAuth();

  const rawRoles = user?.roles || "";
  const userRoles = Array.isArray(rawRoles)
    ? rawRoles
    : rawRoles.split(",").map((r) => r.trim());

  const isHR = userRoles.includes("HR");
  const canUpload = isHR;

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    const validExtensions = ["xlsx", "xls", "csv"];
    const ext = selected.name.split(".").pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      toast.error("Invalid file format. Upload .xlsx / .xls / .csv only.");
      return;
    }

    setFile(selected);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        setPreviewData(jsonRows);
        setResult(null);
      } catch (err) {
        toast.error("Failed to read file for preview");
      }
    };
    reader.readAsArrayBuffer(selected);
  };

  const handleUpload = async () => {
    if (!canUpload) {
      toast.error("You do not have the required role to perform bulk uploads.");
      return;
    }

    if (!file) {
      toast.error("No valid file found to upload");
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/bulk_create`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const resData = response.data;
      setResult({
        total_rows: resData.total_rows,
        processed_rows: resData.processed_rows,
        successful_count: resData.successful_count,
        failed_count: resData.failed_count,
        failed_offers: resData.failed_offers,
        skipped_rows: resData.skipped_rows,
      });

      if (resData.failed_count > 0 && resData.successful_count === 0) {
        toast.error("Bulk upload failed for all rows.", { autoClose: 2000 });
      } else if (resData.failed_count > 0) {
        toast.warning(`Completed with ${resData.failed_count} errors.`, {
          autoClose: 2500,
        });
      } else {
        toast.success("Bulk upload completed successfully!", {
          autoClose: 1500,
        });
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred during bulk upload.");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setPreviewData(null);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        first_name: "",
        middle_name: "",
        last_name: "",
        mail: "",
        country_code: "",
        contact_number: "",
        designation: "",
        employee_type: "",
        total_ctc: "",
        currency: "",
        cc_emails: "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 10 },
      { wch: 30 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Offers_Template");
    XLSX.writeFile(workbook, "Offer_Bulk_Upload_Template.xlsx");
  };

  return (
    <PageCard className="mx-auto max-w-4xl border-slate-200">
      <PageCardContent className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className={Fonts.heading3}>Bulk Upload Offer Letters</h1>
            <p className="mt-2 text-sm text-slate-500">
              Upload an Excel file (`.xlsx`, `.xls`, `.csv`) to create multiple offers at once.
            </p>
          </div>
          <Button onClick={downloadTemplate} variant="outline" size="small">
            <Download size={16} />
            Download Template
          </Button>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
            id="fileUpload"
          />

          <label htmlFor="fileUpload" className="block cursor-pointer">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              {file ? <FileSpreadsheet size={24} /> : <UploadCloud size={24} />}
            </div>
            <p className="text-sm font-semibold text-slate-900">
              {file ? file.name : "Click to choose an Excel file"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Drag-and-drop is not enabled here. Use the file picker to select your sheet.
            </p>
          </label>
        </div>

        {previewData && previewData.length > 0 && (
          <PageCard className="overflow-hidden border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Previewing {previewData.length} Records
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-white text-left">
                  <tr className="text-slate-500">
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Designation</th>
                    <th className="px-4 py-3 text-right font-semibold">Annual CTC</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 5).map((row, idx) => (
                    <tr
                      key={idx}
                      className={idx !== Math.min(previewData.length, 5) - 1 ? "border-b border-slate-100" : ""}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {row["first_name"] || "-"} {row["last_name"] || ""}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row["mail"] || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{row["designation"] || "-"}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        Rs {Number(row["total_ctc"] || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {previewData.length > 5 && (
                    <tr className="bg-slate-50/70">
                      <td
                        colSpan="4"
                        className="px-4 py-3 text-center text-xs font-medium text-slate-500"
                      >
                        + {previewData.length - 5} more records ready for upload
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PageCard>
        )}

        <div className="flex flex-wrap justify-end gap-3">
          <Button onClick={resetForm} variant="outline" size="medium">
            Reset
          </Button>

          {canUpload ? (
            <Button
              onClick={handleUpload}
              variant="primary"
              size="medium"
              disabled={uploading}
              loading={uploading}
              loadingText="Uploading..."
            >
              Upload
            </Button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-500">
              Access Restricted: Only HR can perform bulk uploads.
            </div>
          )}
        </div>

        {result && (
          <PageCard className="border-slate-200 bg-slate-50/70">
            <PageCardContent className="p-6">
              <h2 className={Fonts.heading4}>Upload Summary</h2>

              <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-slate-700 md:grid-cols-2">
                <p>
                  Total Rows: <strong>{result.total_rows}</strong>
                </p>
                <p>
                  Processed Rows: <strong>{result.processed_rows}</strong>
                </p>
                <p>
                  Success Count: <strong className="text-green-600">{result.successful_count}</strong>
                </p>
                <p>
                  Failed Count: <strong className="text-red-600">{result.failed_count}</strong>
                </p>
                <p>
                  Skipped Rows: <strong>{result.skipped_rows}</strong>
                </p>
              </div>

              {result.failed_offers?.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 font-semibold text-red-600">Failed Entries</h3>
                  <div className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white">
                    <ul className="text-sm text-slate-700">
                      {result.failed_offers.map((fail, idx) => (
                        <li
                          key={idx}
                          className={`px-4 py-3 ${
                            idx !== result.failed_offers.length - 1
                              ? "border-b border-slate-100"
                              : ""
                          }`}
                        >
                          Row {fail.row}: {fail.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </PageCardContent>
          </PageCard>
        )}
      </PageCardContent>
    </PageCard>
  );
}
