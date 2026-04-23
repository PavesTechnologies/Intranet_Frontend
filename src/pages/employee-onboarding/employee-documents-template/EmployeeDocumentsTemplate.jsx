import React, { useState } from "react";
import axios from "axios";

const EmployeeDocumentsTemplate = () => {

  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;

  const downloadBulkTemplate = async () => {
    try {

      setLoading(true);

      const response = await axios.get(
        `${BASE_URL}/permanent-employee/core-employee-details/bulk-template/`,
        {
          responseType: "blob",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const url = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "employee_bulk_template.xlsx");

      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (error) {

      console.error("Download error:", error);

    } finally {

      setLoading(false);

    }
  };

  return (
    <div className="p-6">

      <h2 className="text-2xl font-semibold mb-6">
        Employee Document Templates
      </h2>

      <div className="border rounded-lg p-6 w-[350px] shadow-sm bg-white">

        <h3 className="text-lg font-medium mb-2">
          Bulk Employee Upload Template
        </h3>

        <p className="text-gray-500 mb-4">
          Download Excel template to upload employees in bulk
        </p>

        <button
          onClick={downloadBulkTemplate}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
        >
          {loading ? "Downloading..." : "Download Template"}
        </button>

      </div>

    </div>
  );
};

export default EmployeeDocumentsTemplate;