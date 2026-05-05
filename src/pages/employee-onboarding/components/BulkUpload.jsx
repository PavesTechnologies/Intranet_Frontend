"use client";

import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { Download } from "lucide-react";

export default function BulkUpload() {
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  // ---------------------------
  // File Select Handler
  // ---------------------------
  const handleFileChange = (e) => {
    const selected = e.target.files[0];

    if (!selected) return;

    const validExtensions = ["xlsx", "xls", "csv"];
    const ext = selected.name.split(".").pop().toLowerCase();

    if (!validExtensions.includes(ext)) {
      toast.error("❌ Invalid file format. Upload .xlsx / .xls / .csv only.");
      return;
    }

    setFile(selected);

    // Parse for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        setPreviewData(jsonRows);
        setResult(null); // Clear any previous result
      } catch (err) {
        toast.error("Failed to read file for preview");
      }
    };
    reader.readAsArrayBuffer(selected);
  };

  // ---------------------------
  // Submit File to API (Client-side translation)
  // ---------------------------
  const handleUpload = async () => {
    if (!previewData || previewData.length === 0) {
      toast.error("No valid data found in file to upload");
      return;
    }

    setUploading(true);
    setResult(null);

    let successCount = 0;
    let failedCount = 0;
    const failedOffers = [];

    for (let i = 0; i < previewData.length; i++) {
      const row = previewData[i];

      // 1. All unknown columns are treated as Compensation Components
      const standardColumns = new Set([
        "First Name",
        "Middle Name",
        "Last Name",
        "Email",
        "Country Code",
        "Contact Number",
        "Designation",
        "Employee Type",
        "CC Mails",
        "Annual CTC",
      ]);

      const compensation_components = [];

      for (const key of Object.keys(row)) {
        if (!standardColumns.has(key)) {
          const val = row[key];
          // Only process if they entered a valid number
          if (val !== "" && val !== null && !isNaN(Number(val))) {
            let cName = key.trim();
            let cType = "Fixed";
            let cFreq = "Monthly";

            // Support advanced syntax like "Bonus (Variable, Yearly)"
            const match = cName.match(/^(.*?)\s*\((.*?),\s*(.*?)\)$/i);
            if (match) {
              cName = match[1].trim();
              cType = match[2].trim();
              cFreq = match[3].trim();
            }

            compensation_components.push({
              name: String(cName),
              type: cType,
              frequency: cFreq,
              amount: Number(val),
            });
          }
        }
      }

      // Validate Employee Type before hitting the backend
      const empType = row["Employee Type"] || "Full-Time";
      const validTypes = ["Full-Time", "Part-Time", "Contractor", "Intern"];
      if (!validTypes.includes(empType)) {
        failedCount++;
        failedOffers.push({
          row: i + 2,
          error: `Invalid Employee Type '${empType}'. Must be exactly: ${validTypes.join(", ")}`,
        });
        continue;
      }

      // 2. Build the exact payload schema that /offerletters/create expects
      const payload = {
        first_name: row["First Name"] || "",
        middle_name: row["Middle Name"] || "",
        last_name: row["Last Name"] || "",
        mail: row["Email"] || "",
        country_code: row["Country Code"] ? String(row["Country Code"]) : "+91",
        contact_number: row["Contact Number"]
          ? String(row["Contact Number"])
          : "",
        designation: row["Designation"] || "",
        employee_type: empType,
        cc_mails: row["CC Mails"]
          ? String(row["CC Mails"])
              .split(",")
              .map((m) => m.trim())
              .filter(Boolean)
          : [],
        total_ctc: Number(row["Annual CTC"] || 0),
        compensation_components: compensation_components,
      };

      try {
        await axios.post(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/create`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        successCount++;
      } catch (err) {
        failedCount++;

        let rawError =
          err.response?.data?.detail?.[0]?.msg ||
          err.response?.data?.detail ||
          "Failed to create";
        if (typeof rawError !== "string") rawError = JSON.stringify(rawError);

        // User-friendly error translations
        let friendlyError = rawError;
        if (rawError.includes("Data truncated for column 'employee_type'")) {
          friendlyError =
            "Invalid Employee Type. Check for typos (Use Full-Time, Part-Time, Contractor, Intern).";
        } else if (rawError.includes("Duplicate entry")) {
          friendlyError =
            "An offer with this Email or Details already exists in the system.";
        } else if (rawError.includes("not a valid email")) {
          friendlyError = "Invalid Email Address format.";
        } else if (rawError.includes("Field required")) {
          friendlyError =
            "A required field is missing. Please ensure all mandatory fields are filled.";
        } else if (rawError.includes("Data truncated for column")) {
          const fieldMatch = rawError.match(/column '(.+?)'/);
          friendlyError = `The text entered for '${fieldMatch ? fieldMatch[1] : "a field"}' is too long or invalid.`;
        } else if (rawError.includes("FOREIGN KEY constraint failed")) {
          friendlyError =
            "Invalid reference. Please check fields like Country Code.";
        }

        failedOffers.push({
          row: i + 2,
          error: friendlyError,
        });
      }
    }

    const resData = {
      total_rows: previewData.length,
      processed_rows: successCount + failedCount,
      successful_count: successCount,
      failed_count: failedCount,
      failed_offers: failedOffers,
      skipped_rows: 0,
    };
    setResult(resData);

    if (failedCount > 0 && successCount === 0) {
      toast.error("Bulk upload failed for all rows.", { autoClose: 2000 });
    } else if (failedCount > 0) {
      toast.warning(`Completed with ${failedCount} errors.`, {
        autoClose: 2500,
      });
    } else {
      toast.success("✔ Bulk upload completed successfully!", {
        autoClose: 1500,
      });
    }

    setUploading(false);
  };

  const resetForm = () => {
    setFile(null);
    setResult(null);
    setPreviewData(null);
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        "First Name": "",
        "Middle Name": "",
        "Last Name": "",
        Email: "",
        "Country Code": "",
        "Contact Number": "",
        Designation: "",
        "Employee Type": "",
        "CC Mails": "",
        "Annual CTC": "",
        "Basic Pay": "",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Add some styling or adjust column widths to make it readable
    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 15 },
      { wch: 15 },
      { wch: 20 },
      { wch: 15 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Offers_Template");
    XLSX.writeFile(workbook, "Offer_Bulk_Upload_Template.xlsx");
  };

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-xl p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-2">
            Bulk Upload Offer Letters
          </h1>
          <p className="text-gray-600">
            Upload an Excel file (.xlsx / .xls / .csv) to create multiple offers
            at once.
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors border border-blue-200"
        >
          <Download size={16} />
          Download Template
        </button>
      </div>

      {/* File Upload Box */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
        <input
          type="file"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="hidden"
          id="fileUpload"
        />

        <label
          htmlFor="fileUpload"
          className="cursor-pointer text-blue-600 hover:underline"
        >
          {file ? (
            <span className="text-green-600 font-semibold">{file.name}</span>
          ) : (
            "Click to choose an Excel file"
          )}
        </label>
      </div>

      {/* Preview Table */}
      {previewData && previewData.length > 0 && (
        <div className="mt-6 border rounded-xl overflow-x-auto shadow-sm">
          <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
            <h3 className="font-medium text-gray-700">
              Previewing {previewData.length} Records
            </h3>
          </div>
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 uppercase bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3 text-right">Annual CTC</th>
              </tr>
            </thead>
            <tbody>
              {previewData.slice(0, 5).map((row, idx) => (
                <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">
                    {row["First Name"] || "-"} {row["Last Name"] || ""}
                  </td>
                  <td className="px-4 py-2">{row["Email"] || "-"}</td>
                  <td className="px-4 py-2">{row["Designation"] || "-"}</td>
                  <td className="px-4 py-2 text-right">
                    ₹ {Number(row["Annual CTC"] || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {previewData.length > 5 && (
                <tr className="bg-gray-50">
                  <td
                    colSpan="4"
                    className="px-4 py-3 text-center text-gray-500 text-xs font-medium"
                  >
                    + {previewData.length - 5} more records ready for upload
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={resetForm}
          className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300  active:translate-y-[1px]
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
        >
          Reset
        </button>

        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-5 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400  active:translate-y-[1px]
        disabled:opacity-60 disabled:cursor-not-allowed
        flex items-center justify-center gap-2"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </div>

      {/* Results Summary */}
      {result && (
        <div className="mt-8 p-6 bg-gray-50 rounded-xl border">
          <h2 className="text-xl font-semibold mb-3">Upload Summary</h2>

          <div className="grid grid-cols-2 gap-4 text-gray-800">
            <p>
              Total Rows: <strong>{result.total_rows}</strong>
            </p>
            <p>
              Processed Rows: <strong>{result.processed_rows}</strong>
            </p>
            <p>
              Success Count:{" "}
              <strong className="text-green-600">
                {result.successful_count}
              </strong>
            </p>
            <p>
              Failed Count:{" "}
              <strong className="text-red-600">{result.failed_count}</strong>
            </p>
            <p>
              Skipped Rows: <strong>{result.skipped_rows}</strong>
            </p>
          </div>

          {/* Failed List */}
          {result.failed_offers?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold text-red-600 mb-2">
                Failed Entries
              </h3>
              <ul className="text-sm text-gray-700 bg-white p-3 rounded-lg border max-h-40 overflow-auto">
                {result.failed_offers.map((fail, idx) => (
                  <li key={idx} className="py-1 border-b last:border-0">
                    Row {fail.row}: {fail.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
