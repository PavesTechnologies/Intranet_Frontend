import { useState, useMemo, useEffect } from "react";
import EmployeeTable from "./components/EmployeeTable";
import SearchBar from "./components/SearchBar";
import FiltersBar from "./components/FiltersBar";
import { fetchEmployees } from "./api/employeelist";
import Pagination from "../../../components/Pagination/pagination";

export default function EmployeeListPage() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");
  const [locations, setLocations] = useState([]);
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

      const matchLocation = locations.length
        ? locations.includes(emp.location)
        : true;

      return matchSearch && matchDept && matchStatus && matchLocation;
    });
  }, [employees, search, department, status, locations]);
  const locationOptions = useMemo(() => {
    const unique = new Set();

    employees.forEach((emp) => {
      if (emp.location) {
        unique.add(emp.location.trim());
      }
    });

    return Array.from(unique);
  }, [employees]);
  const loadDepartments = async () => {

    const res = await api.get(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    const data = await res.json();

    // 🔥 convert to map
    const map = {};
    data.forEach((d) => {
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

      if (!res.ok) {
        console.error("Designation API failed:", res.status);
        return; // 🚨 stop here
      }

      const data = await res.json();

      const list = Array.isArray(data) ? data : data.data || data.results || [];

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
  }, [search, department, status, locations]);

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

      designation: designationMap[emp.designation_uuid] || "N/A",

      manager: "-",

      doj: formatDate(emp.joining_date),

      employeeType: emp.employment_type,

      experience: calculateExperience(emp.joining_date),

      // TEMP (audit logs later)
      loginStatus: "Registered",
      loginDate: formatDate(emp.joining_date),
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
      <h2 style={{ marginBottom: 12 }}>Employees</h2>

      {/* 🔎 Search + Filters */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <SearchBar value={search} onChange={setSearch} />

        <FiltersBar
          department={department}
          setDepartment={setDepartment}
          status={status}
          setStatus={setStatus}
          locations={locations}
          setLocations={setLocations}
          locationOptions={locationOptions}
        />
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
