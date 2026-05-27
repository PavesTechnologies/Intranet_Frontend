"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import FilterListbox from "../../../components/filter/FilterListbox";
import { Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Table from "../../../components/Table/table";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import { DeleteIcon, EditIcon } from "../../../components/icons/ActionIcons";
import EmployeeCreateModal from "../components/employee-create-modal/EmployeeCreateModal";
import ExcelPreviewModal from "./components/ExcelPreviewModal";
import * as XLSX from "xlsx";
import { showStatusToast } from "../../../components/toastfy/toast";
import { KPICard } from "../../../components/kpi/KPI";
import api from "../../../api/axiosInstance";

const PAGE_SIZE = 5;

function ActionMenu({ onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md bg-amber-50 p-1.5 text-amber-700 transition hover:bg-amber-100 hover:text-amber-800"
        aria-label="Edit employee"
        title="Edit employee"
      >
        <EditIcon className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={onDelete}
        className="rounded-md bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100 hover:text-red-800"
        aria-label="Delete employee"
        title="Delete employee"
      >
        <DeleteIcon className="h-4 w-4" />
      </button>
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
  const [editEmployee, setEditEmployee] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);

  const [excelPreview, setExcelPreview] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  const fileInputRef = useRef(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  
 const failedCount = useMemo(() => {

  return excelPreview.filter(
    (emp) =>
      emp.export_status === "FAILED"
  ).length;

}, [excelPreview]);
  

  /* ============================
     FETCH EMPLOYEES
  ============================ */

  const fetchEmployees = async () => {
  try {

    setLoading(true);

    const response = await api.get(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`
    );

    console.log(
      "Employees API Response:",
      response.data
    );

    const data = response.data;

    setEmployees(
      Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : []
    );

  } catch (err) {

    console.error(
      "Failed to fetch employees",
      err
    );

    setEmployees([]);

  } finally {

    setLoading(false);

  }
};
  /* ============================
     FETCH DEPARTMENTS
  ============================ */

  const fetchDepartments = async () => {
    try {
    
      const response = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = await response.json();

      setDepartments(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    }
  };

  const fetchDesignations = async () => {
    try {


      const res = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/designations/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      // const data = await res.json();
      // setDesignations(data || []);

      const data = await res.json();

      console.log("Designations API Response:", data);

      setDesignations(
        Array.isArray(data)
          ? data
          : Array.isArray(data.data)
            ? data.data
            : []
      );

    } catch (err) {
      console.error("Failed to fetch designations", err);
    }
  };

  const handleBulkUpload = async (event) => {
  try {
    const file = event.target.files[0];

    if (!file) return;

    const formData = new FormData();

    formData.append("file", file);

    setUploadLoading(true);

    const response = await api.post(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/bulk-direct-upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const data = response.data;

    if (response.status === 200) {

      if (data.success_count > 0) {
        showStatusToast(
          `${data.success_count} employees uploaded successfully`,
          "success"
        );
      }

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
    departments.map((d) => [d.department_uuid, d.department_name]),
  );
  // const designationMap = Object.fromEntries(
  //   designations.map((d) => [d.designation_uuid, d.designation_name]),
  // );
  const designationMap = Object.fromEntries(
  (Array.isArray(designations) ? designations : []).map((d) => [
    d.designation_uuid,
    d.designation_name,
  ]),
);

  const handleCloseModal = () => {
    setIsCreateOpen(false);
    setSelectedUserUuid(null);
    setEditEmployeeUuid(null);
    setEditEmployee(null);
    fetchEmployees();
  };

  /* ============================
     SUMMARY CARDS
  ============================ */

  const totalEmployees = employees.length;

  const probation = employees.filter(
    (e) => e.employment_status === "Probation",
  ).length;

  const active = employees.filter(
    (e) => e.employment_status === "Active",
  ).length;

  const noticePeriod = employees.filter(
    (e) => e.employment_status === "Notice Period",
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

      const statusMatch = statusFilter === "ALL" || status === statusFilter;

      const departmentMatch =
        departmentFilter === "ALL" ||
        departmentMap[emp.department_uuid] === departmentFilter;

      return matchesSearch && statusMatch && departmentMatch;
    });
  }, [employees, searchTerm, statusFilter, departmentFilter]);


const handleExportPreview = async () => {

  try {

    setExportLoading(true);

    const response = await api.get(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/api/employees/export-preview`
    );

    console.log(
      "Export Preview Response:",
      response.data
    );

    const result = response.data;

    const previewData =
      result.data || [];

    if (previewData.length === 0) {

      showStatusToast(
        "No employees available for export",
        "info"
      );

      return;
    }

    const formattedData =
      previewData.map((emp) => ({

        user_uuid: emp.employee_uuid,

        employee_id: emp.employee_id,

        first_name: emp.first_name,

        last_name: emp.last_name,

        mail: emp.mail,

        contact: emp.contact,

        Department:
          departmentMap[
            emp.department_uuid
          ] || "—",

        Designation:
          designationMap[
            emp.designation_uuid
          ] || "—",

        Status:
          emp.employment_status,

        export_status:
          emp.export_status,

        export_error:
          emp.export_error

      }));

    setExcelPreview(
      formattedData
    );

    setShowPreview(true);

  } catch (error) {

    console.error(error);

    showStatusToast(
      "Failed to fetch export preview",
      "error"
    );

  } finally {

    setExportLoading(false);

  }
};
const downloadExcel = async () => {
console.log(
  "calling ums api"
);
  try {

 

    // =========================
    // REMOVE BACKEND META FIELDS
    // =========================

    const exportData = excelPreview.map(
      ({
        export_status,
        export_error,
        ...rest
      }) => rest
    );

    // =========================
    // CREATE EXCEL
    // =========================

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportData
      );

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Employees"
    );

    const excelBuffer =
      XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
console.log(
  "calling ums api"
);
    const blob = new Blob(
      [excelBuffer],
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    const file = new File(
      [blob],
      "Employee_Report.xlsx",
      {
        type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }
    );

    // =========================
    // CREATE FORM DATA
    // =========================

    const formData = new FormData();

    formData.append("file", file);

    // =========================
    // SEND TO UMS
    // =========================

    const response = await api.post(

      `${window.__APP_CONFIG__.USER_MANAGEMENT_URL}/admin/users/multiple-users`,

      formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
    );
    

    const data = await response.json();

    // =========================
    // UPDATE EXPORT STATUS
    // =========================

    await api.get(

      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/api/employees/update-export-status`,

      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${localStorage.getItem("token")}`,
        },

        body: JSON.stringify(data),
      }
    );

    // =========================
    // SUCCESS UI
    // =========================

    if (response.ok) {

      showStatusToast(

        data.message ||
        "Employees exported successfully",

        "success"
      );

      setShowPreview(false);

      // Refresh latest employees
      fetchEmployees();

      // Refresh preview queue
      setExcelPreview([]);

    } else {

      showStatusToast(
        "Export failed",
        "error"
      );
    }

  } catch (error) {

    console.error(error);

    showStatusToast(
      "Failed to send excel",
      "error"
    );
  }
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

        name: `${emp.first_name || ""} ${emp.middle_name || ""} ${emp.last_name || ""}`
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
            onEdit={() => {
              setEditEmployee(emp);
              setEditEmployeeUuid(emp.employee_uuid);
              setSelectedUserUuid(emp.user_uuid);
              setIsCreateOpen(true);
            }}
            onDelete={() => handleDelete(emp.employee_uuid)}
          />
        ),
      }));
  }, [
    employees,
    currentPage,
    filteredEmployees,
    departments,
    designations,
    designationMap,
  ]);

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Employee Dashboard</h1>

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
      {failedCount > 0 && (

  <button
    onClick={handleExportPreview}
    className="
      px-4 py-2
      bg-red-600
      hover:bg-red-700
      text-white
      rounded-lg
      shadow-sm
      flex items-center gap-2
    "
  >

    Retry Failed

    <span
      className="
        bg-white
        text-red-600
        px-2 py-0.5
        rounded-full
        text-xs
        font-semibold
      "
    >
      {failedCount}
    </span>

  </button>
)}

      </div>

    </div>
    {/* SUMMARY CARDS */}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total Employees" value={totalEmployees} icon={Users} />

        <StatCard title="Probation" value={probation} icon={Clock} />

        <StatCard title="Active" value={active} icon={CheckCircle} />

        <StatCard
          title="Notice Period"
          value={noticePeriod}
          icon={AlertCircle}
        />
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

        <FilterListbox
          options={[{value:"ALL",label:"All Status"},{value:"ACTIVE",label:"Active"},{value:"PROBATION",label:"Probation"},{value:"NOTICE PERIOD",label:"Notice Period"}]}
          value={statusFilter}
          onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
        />

        <FilterListbox
          options={[{value:"ALL",label:"All Departments"}, ...departments.map((dept) => ({value: dept.department_name, label: dept.department_name}))]}
          value={departmentFilter}
          onChange={(val) => { setDepartmentFilter(val); setCurrentPage(1); }}
        />
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
            onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            onNext={() =>
              setCurrentPage((p) =>
                Math.min(p + 1, Math.ceil(employees.length / PAGE_SIZE)),
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
        initialEmployee={editEmployee}
        initialDepartments={departments}
        initialDesignations={designations}
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
    <KPICard
      label={title}
      value={value}
      icon={<Icon className="h-5 w-5" />}
      color="bg-indigo-50 text-indigo-600"
      className="bg-white border-black/20 shadow-sm hover:-translate-y-1 hover:shadow-xl"
    />
  );
}
