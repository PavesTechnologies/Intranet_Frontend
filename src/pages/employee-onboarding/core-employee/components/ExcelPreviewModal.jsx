import React from "react";

export default function ExcelPreviewModal({
  showPreview,
  excelPreview,
  onClose,
  onSend
}) {

  if (!showPreview) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white w-[90%] max-w-6xl rounded-xl shadow-xl p-6">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Excel Preview</h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

      <div className="grid grid-cols-2 gap-4 mb-4">

  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
    <p className="text-sm text-blue-600">
      New Employees
    </p>

    <h2 className="text-2xl font-bold text-blue-700">
      {
        excelPreview.filter(
          (e) =>
            e.exportType === "NEW"
        ).length
      }
    </h2>
  </div>

  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
    <p className="text-sm text-red-600">
      Failed Retry
    </p>

    <h2 className="text-2xl font-bold text-red-700">
      {
        excelPreview.filter(
          (e) =>
            e.exportType ===
            "FAILED RETRY"
        ).length
      }
    </h2>
  </div>

</div>
        {/* TABLE PREVIEW */}
<div className="max-h-[400px] overflow-auto border rounded-lg">

  <table className="min-w-max w-full text-sm border-collapse">

    <thead className="bg-gray-100 sticky top-0 z-10">
      <tr>
        {excelPreview.length > 0 &&
          Object.keys(excelPreview[0]).map((key) => (
            <th
              key={key}
              className={`px-4 py-3 text-left font-semibold whitespace-nowrap
                ${key === "user_uuid" ? "min-w-[320px]" : ""}
              `}
            >
              {key}
            </th>
          ))}
      </tr>
    </thead>

    <tbody>
      {excelPreview.map((row, index) => (
        <tr key={index} className="border-t">

          {Object.entries(row).map(([key, val], i) => (
            <td
              key={i}
              className={`px-4 py-3 align-top
                ${key === "user_uuid"
                  ? "min-w-[320px] whitespace-nowrap break-normal"
                  : "whitespace-nowrap"
                }
              `}
            >
              {val}
            </td>
          ))}

        </tr>
      ))}
    </tbody>

  </table>

</div>

        {/* FOOTER */}
        <div className="flex justify-end gap-3 mt-4">

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={onSend}
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            Send
          </button>

        </div>

      </div>

    </div>
  );
}