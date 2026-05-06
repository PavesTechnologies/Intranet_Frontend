import React from "react";

const GenericTable = ({
  headers = [],
  rows = [],
  columns = [],
  loading = false,
}) => {
  return (
    <div
     className="relative overflow-visible"
      style={{
        background: "#fff",
        padding: "16px",
        margin: "16px 0",
        borderRadius: "10px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
      }}
    >
      {loading ? (
        <div className="text-center text-gray-500">Loading data...</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-500">No records found.</div>
      ) : (
        <table className="w-full border-collapse rounded-lg shadow-sm">
          <thead>
            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white text-sm">
              {headers.map((header, idx) => (
                <th key={idx} className="text-center px-3 py-3">
                  {header}
                </th> 
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className={`transition ${
                    row.rowClass
                      ? `${row.rowClass} hover:!bg-green-100`
                      : `${rowIndex % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50`
                  }`}
                >
                {columns.map((col, colIndex) => (
                  // 
                  <td
                  key={colIndex}
                  className="p-3 text-gray-700 font-medium relative overflow-visible"
                >
                 {row[col]}
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
