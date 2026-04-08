"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Table from "../../../components/Table/table";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import EmployeeCreateModal from "../components/employee-create-modal/EmployeeCreateModal";
import ExcelPreviewModal from "./components/ExcelPreviewModal";
import * as XLSX from "xlsx";
import { showStatusToast } from "../../../components/toastfy/toast";

const PAGE_SIZE = 5;

function ActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="px-2 py-1 text-xl font-bold text-gray-600 hover:text-gray-900"
      >
        &#8942;
      </button>

      {open && (
        <div className="absolute right-full mr-2 top-0 w-32 bg-white border rounded-md shadow-lg z-50">
          <button
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function EmployeeOnboardingPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUserUuid, setSelectedUserUuid] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [editEmployeeUuid, setEditEmployeeUuid] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [excelPreview, setExcelPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  const [exportedEmails, setExportedEmails] = useState([]);
  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [failedRecords, setFailedRecords] = useState([]);

  

  /* ============================
     FETCH EMPLOYEES
  ============================ */

  const fetchEmployees = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      setEmployees(data || []);
    } catch (err) {
      console.error("Failed to fetch employees", err);
    } finally {
      setLoading(false);
    }
  };

  /* ============================
     FETCH DEPARTMENTS
  ============================ */

  const fetchDepartments = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    setDepartments(Array.isArray(data) ? data : data.data || []);

  } catch (error) {
    console.error("Failed to fetch departments", error);
  }
};

const fetchDesignations = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/masters/designations/`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setDesignations(data || []);

  } catch (err) {
    console.error("Failed to fetch designations", err);
  }
};
const handleBulkUpload = async (event) => {
  try {

    const file = event.target.files[0];

    if (!file) return;

    const token = localStorage.getItem("token");

    const formData = new FormData();
    formData.append("file", file);

    setUploadLoading(true);

    const response = await fetch(
      `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/bulk-direct-upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      }
    );

    const data = await response.json();

    if (response.ok) {

      // Success toast
      if (data.success_count > 0) {
        showStatusToast(
          `${data.success_count} employees uploaded successfully`,
          "success"
        );
      }

      // Error toasts
      if (data.failed_records?.length > 0) {

        data.failed_records.forEach((item) => {

          showStatusToast(
            `Row ${item.row}: ${formatError(item.reason)}`,
            "error"
          );

        });

      }

      fetchEmployees();

    } else {

      showStatusToast("Upload failed", "error");

    }

  } catch (error) {

    console.error(error);
    showStatusToast("Upload failed", "error");

  } finally {

    setUploadLoading(false);

  }
};

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchDesignations();
    handleBulkUpload;
  }, []);
  
   /* ============================
     CREATE UUID → NAME MAPS
  ============================ */
   const departmentMap = Object.fromEntries(
    departments.map((d) => [d.department_uuid, d.department_name])
    );
  const designationMap = Object.fromEntries(
      designations.map((d) => [d.designation_uuid, d.designation_name])
    );


  const handleCloseModal = () => {
    setIsCreateOpen(false);
    setSelectedUserUuid(null);
    setEditEmployeeUuid(null);
    fetchEmployees();
  };

  /* ============================
     SUMMARY CARDS
  ============================ */

  const totalEmployees = employees.length;

  const probation = employees.filter(
    (e) => e.employment_status === "Probation"
  ).length;

  const active = employees.filter(
    (e) => e.employment_status === "Active"
  ).length;

  const noticePeriod = employees.filter(
    (e) => e.employment_status === "Notice Period"
  ).length;

  /* ============================
     FILTER LOGIC
  ============================ */

  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const name =
        `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();

      const email = (emp.work_email || "").toLowerCase();

      const empId = (emp.employee_id || "").toLowerCase();

      const matchesSearch =
        name.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase()) ||
        empId.includes(searchTerm.toLowerCase());

      const status = (emp.employment_status || "").toUpperCase();

      const statusMatch =
        statusFilter === "ALL" || status === statusFilter;

      const departmentMatch =
        departmentFilter === "ALL" ||
        departmentMap[emp.department_uuid] === departmentFilter;

      return matchesSearch && statusMatch && departmentMatch;
    });
  }, [employees, searchTerm, statusFilter, departmentFilter,]);

const handleExportPreview = async () => {
  setExportLoading(true);

  try {

    // const excelData = filteredEmployees.map(emp => ({
    //   "Employee ID": emp.employee_id,
    //   "Name": `${emp.first_name} ${emp.last_name}`,
    //   "Email": emp.work_email,
    //   "Contact": emp.contact_number,
    //   "Department": departmentMap[emp.department_uuid],
    //   "Designation": designationMap[emp.designation_uuid],
    //   "Joining Date": emp.joining_date,
    //   "Status": emp.employment_status
    // }));

  const newEmployees = filteredEmployees.filter(
  emp => !exportedEmails.includes(emp.work_email?.toLowerCase())
); 

if (newEmployees.length === 0) {
  showStatusToast("No new employees to export", "info");
  setExportLoading(false);
  return;
}

const excelData = newEmployees.map(emp => ({
  "Employee ID": emp.employee_id,
  "Name": `${emp.first_name} ${emp.last_name}`,
  "Email": emp.work_email,
  "Contact": emp.contact_number,
  "Department": departmentMap[emp.department_uuid],
  "Designation": designationMap[emp.designation_uuid],
  "Joining Date": emp.joining_date,
  "Status": emp.employment_status
}));
    setExcelPreview(excelData);
    setShowPreview(true);

  } catch (error) {
    console.error("Excel preview error", error);
  } finally {
    setExportLoading(false);
  }
};

const downloadExcel = () => {

  const worksheet = XLSX.utils.json_to_sheet(excelPreview);

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Employees");

  // Auto column width
  const cols = Object.keys(excelPreview[0]).map(() => ({ wch: 25 }));
  worksheet["!cols"] = cols;

  XLSX.writeFile(workbook, "Employee_Report.xlsx");

  const newEmails = excelPreview.map(emp => emp.Email.toLowerCase());
  setExportedEmails(prev => [
  ...new Set([...prev, ...newEmails])
]);

  setShowPreview(false);
};
  /* ============================
     TABLE CONFIG
  ============================ */

  const headers = [
    "Employee ID",
    "Name",
    "Email",
    "Contact",
    "Department",
    "Designation",
    "Joining Date",
    "Status",
    "Action",
  ];

  const columns = [
    "employee_id",
    "name",
    "email",
    "contact",
    "department",
    "designation",
    "doj",
    "status",
    "action",
  ];

  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE);

  const rows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredEmployees
      .slice(startIndex, startIndex + PAGE_SIZE)
      .map((emp) => ({

        employee_id: emp.employee_id || "—",

        name:
          `${emp.first_name || ""} ${emp.middle_name || ""} ${emp.last_name || ""}`
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase()),

        email: emp.work_email || "—",

        contact: emp.contact_number || "—",

        department: departmentMap[emp.department_uuid] || "—",

        designation: designationMap[emp.designation_uuid] || "—",

        doj: emp.joining_date || "—",

        status: emp.employment_status ? (
          <StatusBadge label={emp.employment_status} size="sm" />
        ) : (
          "—"
        ),

        action: (
          <ActionMenu
            onEdit={() =>
            {
              setEditEmployeeUuid(emp.employee_uuid);
              setSelectedUserUuid(emp.user_uuid);
              setIsCreateOpen(true);
            }
            }
            onDelete={() => handleDelete(emp.employee_uuid)}
          />
        ),
      }));

  }, [employees, currentPage, filteredEmployees, departments, designations, designationMap]);

  return (
    <div className="p-6 space-y-6">

      {/* HEADER */}

      <div className="flex justify-between items-center">

      <div>
        <h1 className="text-2xl font-bold">
          Employee Dashboard
        </h1>

        <p className="text-gray-500">
          Manage employee records
        </p>
      </div>


      {/* Buttons Section */}
      <div className="flex gap-3">
        {/* Upload Button */}
  <button
    onClick={() => fileInputRef.current.click()}
    className="px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700"
  >
    {uploadLoading ? "Uploading..." : "Upload Excel"}
  </button>

  <input
    type="file"
    accept=".xlsx, .xls"
    ref={fileInputRef}
    onChange={handleBulkUpload}
    hidden
  />

        <button
        onClick={handleExportPreview}
        disabled={exportLoading}
        className={`px-4 py-2 rounded-lg shadow-sm text-white flex items-center gap-2
          ${exportLoading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
      >
        {exportLoading ? (
          <>
            <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
            Exporting...
          </>
        ) : (
          "Export Excel"
        )}
      </button>
      {failedRecords.length > 0 && (
  <div className="mt-4 border rounded-lg p-4 bg-red-50">
    <h3 className="font-semibold text-red-600 mb-2">
      Failed Records
    </h3>

    <table className="w-full text-sm">
      <thead>
        <tr className="border-b">
          <th className="text-left p-2">Row</th>
          <th className="text-left p-2">Reason</th>
        </tr>
      </thead>

      <tbody>
        {failedRecords.map((item, index) => (
          <tr key={index} className="border-b">
            <td className="p-2">{item.row}</td>
            <td className="p-2">{formatError(item.reason)}</td>
          </tr>
        ))}
      </tbody>

    </table>

  </div>
)}

      </div>

    </div>
    {/* SUMMARY CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <StatCard title="Total Employees" value={totalEmployees} icon={Users} />

        <StatCard title="Probation" value={probation} icon={Clock} />

        <StatCard title="Active" value={active} icon={CheckCircle} />

        <StatCard title="Notice Period" value={noticePeriod} icon={AlertCircle} />

      </div>

      {/* SEARCH + FILTERS */}

      <div className="flex flex-col md:flex-row gap-4">

        <input
          placeholder="Search by Name, Email or Employee ID..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-1/3 px-3 py-2 border rounded-lg"
        />

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-48 px-3 py-2 border rounded-lg bg-white"
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="PROBATION">Probation</option>
          <option value="NOTICE PERIOD">Notice Period</option>
        </select>

        <select
          value={departmentFilter}
          onChange={(e) => {
            setDepartmentFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-48 px-3 py-2 border rounded-lg bg-white"
        >
          <option value="ALL">All Departments</option>

          {departments.map((dept) => (
          <option key={dept.department_uuid} value={dept.department_name}>
            {dept.department_name}
          </option>
        ))}
        </select>
      </div>

      {/* TABLE */}

      <div className="bg-white rounded-xl shadow-sm relative overflow-visible">

        <Table
          headers={headers}
          columns={columns}
          rows={rows}
          loading={loading}
        />

        {filteredEmployees.length > PAGE_SIZE && (
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredEmployees.length / PAGE_SIZE)}
            onPrevious={() =>
              setCurrentPage((p) => Math.max(p - 1, 1))
            }
            onNext={() =>
              setCurrentPage((p) =>
                Math.min(p + 1, Math.ceil(employees.length / PAGE_SIZE))
              )
            }
          />
        )}

      </div>

      {/* ============================
   EXCEL PREVIEW
============================ */}

<ExcelPreviewModal
  showPreview={showPreview}
  excelPreview={excelPreview}
  onClose={() => setShowPreview(false)}
  onSend={downloadExcel}
/>

      {/* MODAL */}

      <EmployeeCreateModal
        isOpen={isCreateOpen}
        onClose={handleCloseModal}
        userUuid={selectedUserUuid}
        employeeUuid={editEmployeeUuid}
      />

    </div>
  );
}

/* ============================
   STAT CARD
============================ */
const formatError = (error) => {

  if (!error) return "Unknown error";

  if (error.includes("Duplicate entry")) {
    return "Email already exists";
  }

  if (error.includes("IntegrityError")) {
    return "Duplicate record found";
  }

  if (error.includes("NOT NULL")) {
    return "Required field missing";
  }

  return "Upload failed";
};

function StatCard({ title, value, icon: Icon }) {
  return (
    <div
      className="bg-white p-4 rounded-xl border border-black/20 shadow-sm 
                 flex gap-4 transition-all duration-300 
                 hover:-translate-y-1 hover:shadow-xl"
    >
      <Icon className="text-indigo-600" />

      <div>
        <p className="text-sm text-gray-500">
          {title}
        </p>

        <p className="text-xl font-semibold text-gray-900">
          {value}
        </p>
      </div>
    </div>
  );
}
