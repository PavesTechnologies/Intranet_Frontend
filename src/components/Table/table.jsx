import React from "react";
import LoadingSpinner from "../LoadingSpinner";

const GenericTable = ({
  headers = [],
  rows = [],
  columns = [],
  loading = false,
}) => {
  const hasData = rows.length > 0;

  return (
    <div
      className={`inline-block min-w-full align-middle relative overflow-visible ${
        hasData ? "border border-gray-200" : ""
      }`}
      style={{
        background: "#fff",
        borderRadius: "10px",
        boxShadow: hasData
          ? "0 2px 10px rgba(0,0,0,0.08)"
          : "none",
      }}
    >
      {loading ? (
        <LoadingSpinner text="Loading data..." />
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500 py-6 italic font-semibold">
          No records found.
        </div>
      ) : (
        <table className="w-full table-auto border-collapse rounded-lg shadow-sm">
          
          {/* TABLE HEADER */}
          <thead>
            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white text-sm">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={`px-2 py-3 ${idx === 0 ? "text-left" : "text-center"} align-middle font-semibold`}
                >
                  <div className={`flex ${idx === 0 ? "justify-start" : "justify-center"} items-center w-full`}>
                    {header}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* TABLE BODY */}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={row.onRowClick}
                className={`transition ${
                  row.rowClass
                    ? `${row.rowClass} hover:!bg-blue-50`
                    : `${
                        rowIndex % 2 === 0
                          ? "bg-white"
                          : "bg-gray-50"
                      } hover:bg-blue-50`
                }`}
              >
                {columns.map((col, colIndex) => (
                  <td
                    key={colIndex}
                    className={`p-2 px-2 text-gray-700 font-medium ${colIndex === 0 ? "text-left" : "text-center"} align-middle relative overflow-visible`}
                  >
                    <div className={`flex ${colIndex === 0 ? "justify-start" : "justify-center"} items-center w-full`}>
                      {row[col]}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>

        </table>
      )}
    </div>
  );
};

export default GenericTable;