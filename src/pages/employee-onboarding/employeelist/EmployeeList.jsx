import { useState, useMemo, useEffect } from "react";
import api from "../../../api/axiosInstance";
import EmployeeTable from "./components/EmployeeTable";
import { fetchEmployees } from "./api/employeelist";
import Pagination from "../../../components/Pagination/pagination";
import { Fonts } from "../../../components/Fonts/Fonts";
import SearchInput from "../../../components/filter/Searchbar";
import FilterListbox from "../../../components/filter/FilterListbox";

const filterButtonClassName =
  "w-full cursor-default rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20 focus:border-[#0A0082]";

function buildFilterOptions(defaultLabel, options) {
  return [
    { value: "", label: defaultLabel },
    ...options.map((option) => ({ value: option, label: option })),
  ];
}

export default function EmployeeListPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [employees, setEmployees] = useState([]);
  const [deptMap, setDeptMap] = useState({});
  const [designationMap, setDesignationMap] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredData = useMemo(() => {
    return (employees || []).filter((emp) => {
      const matchSearch =
        emp.name.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.id.includes(search) ||
        emp.username.toLowerCase().includes(search.toLowerCase());

      const matchDept = department
        ? emp.department.toLowerCase().includes(department.toLowerCase())
        : true;

      const matchStatus = status ? emp.emailStatus === status : true;

      const matchLocation = locationSearch
        ? emp.location?.toLowerCase().includes(locationSearch.toLowerCase())
        : true;

      return matchSearch && matchDept && matchStatus && matchLocation;
    });
  }, [employees, search, department, status, locationSearch]);
  const loadDepartments = async () => {

    const res = await api.get(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    const map = {};
    (res.data || []).forEach((d) => {
      map[d.department_uuid] = d.department_name;
    });

    setDeptMap(map);
  };
  const loadDesignations = async () => {
    try {

      const res = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/designations/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const list = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.results || [];

      const map = {};
      list.forEach((d) => {
        map[d.designation_uuid] = d.designation_name;
      });

      setDesignationMap(map);
    } catch (err) {
      console.error("Designation error:", err);
    }
  };
  useEffect(() => {
    const init = async () => {
      await loadDepartments();
      await loadDesignations();
    };

    init();
  }, []);

  useEffect(() => {
    if (Object.keys(deptMap).length && Object.keys(designationMap).length) {
      loadEmployees();
    }
  }, [deptMap, designationMap]);

  /* Reset page when filters/search change */
  useEffect(() => {
    setCurrentPage(1);
  }, [search, department, status, locationSearch]);

  /* Pagination logic */
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;

  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const loadEmployees = async () => {
    const data = await fetchEmployees();

    const formatted = data.map((emp) => ({
      id: emp.employee_id,

      name: `${emp.first_name} ${emp.last_name}`,
      username: emp.work_email.split("@")[0],

      department: deptMap[emp.department_uuid] || "N/A",
      location: emp.location,
      workmode: emp.work_mode,

      email: emp.work_email,
      emailStatus: emp.employment_status === "Active" ? "Active" : "Inactive",
      employmentStatus: emp.employment_status,

      designation: designationMap[emp.designation_uuid] || "N/A",

      manager: emp.reporting_manager_name || emp.reporting_manager || (() => {
        const manager = data.find(m => m.employee_id === emp.reporting_manager_uuid || m.employee_uuid === emp.reporting_manager_uuid);
        return manager ? `${manager.first_name} ${manager.last_name}` : emp.reporting_manager_uuid;
      })() || "N/A",
      reporting_manager_uuid: emp.reporting_manager_name || emp.reporting_manager || (() => {
        const manager = data.find(m => m.employee_id === emp.reporting_manager_uuid || m.employee_uuid === emp.reporting_manager_uuid);
        return manager ? `${manager.first_name} ${manager.last_name}` : emp.reporting_manager_uuid;
      })() || "N/A",

      doj: formatDate(emp.joining_date),

      employeeType: emp.employment_type,

      experience: calculateExperience(emp.joining_date),

      
    }));

    setEmployees(formatted);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const calculateExperience = (joiningDate) => {
    const years =
      (new Date() - new Date(joiningDate)) / (1000 * 60 * 60 * 24 * 365);

    if (years < 1) return "0-1 Years";
    return `${Math.floor(years)} Years`;
  };

  return (
    <div style={{ padding: 20 }}>
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 h-14 w-1.5 shrink-0 rounded-full bg-indigo-600" />
          <div className="min-w-0">
            <h1 className={Fonts.heading3}>Member Records</h1>
            <p className="mt-1 text-sm text-slate-500">Manage and browse member records across the onboarding workflow.</p>
          </div>
        </div>
      </div>

      {/* 🔎 Search + Filters */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="w-full md:w-80">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, id, username..."
            className="h-[42px]"
          />
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          <div className="w-full sm:w-56">
            <FilterListbox
              buttonClassName={filterButtonClassName}
              options={buildFilterOptions(
                "All Departments",
                Object.values(deptMap).sort((a, b) => a.localeCompare(b))
              )}
              value={department}
              onChange={setDepartment}
            />
          </div>
          <div className="w-full sm:w-48">
            <SearchInput
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search location..."
              className="h-[42px]"
            />
          </div>
        </div>
      </div>

      {/* 📋 Table */}
      <div
        style={{
          background: "white",
          borderRadius: 8,
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        }}
      >
        {/* Horizontal Scroll Wrapper */}
        <div
          style={{
            overflowX: "auto",
            overflowY: "hidden",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
          className="hide-scrollbar"
        >
          <EmployeeTable data={paginatedData} />
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
        onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
      />
    </div>
  );
}
