import React, { useState, useEffect } from "react";

import EmployeeCard from "../components/EmployeeCard";
import { Search, Loader2 } from "lucide-react";
import axios from "axios";

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");
  const [departmentsList, setDepartmentsList] = useState([]);
  const [designationsList, setDesignationsList] = useState([]);

  const token = localStorage.getItem("token");
  const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch employees, departments, and designations in parallel
        const [empRes, deptRes, desigRes] = await Promise.all([
          axios.get(`${BASE_URL}/permanent-employee/core-employee-details/`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${BASE_URL}/masters/departments/`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`${BASE_URL}/masters/designations/`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const depts = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data.data || []);
        const desigs = Array.isArray(desigRes.data) ? desigRes.data : (desigRes.data.data || []);

        setDepartmentsList(depts);
        setDesignationsList(desigs);

        const deptMap = Object.fromEntries(depts.map(d => [d.department_uuid, d.department_name]));
        const desigMap = Object.fromEntries(desigs.map(d => [d.designation_uuid, d.designation_name]));

        const mappedEmployees = (Array.isArray(empRes.data) ? empRes.data : (empRes.data.data || [])).map(emp => ({
          ...emp,
          name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
          email: emp.work_email || emp.email || "N/A",
          contact: emp.contact_number || emp.contact || "N/A",
          role: desigMap[emp.designation_uuid] || emp.role || "N/A",
          department: deptMap[emp.department_uuid] || emp.department || "N/A",
          location: emp.location || "Hyderabad Office",
          initials: ((emp.first_name?.[0] || "") + (emp.last_name?.[0] || "")).toUpperCase(),
          // Additional fields for Profile Modal
          employeeId: emp.employee_id || "N/A",
          gender: emp.gender || "N/A",
          employeeType: emp.employment_status || "Full-Time",
          dateOfJoining: emp.joining_date || "N/A",
          reportingManager: emp.reporting_manager || "N/A"
        }));

        setEmployees(mappedEmployees);
        setError(null);
      } catch (err) {
        console.error("Error fetching employee directory data:", err);
        setError("Failed to load employee directory. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [BASE_URL, token]);

  // Departments for the filter chips
  const departments = ["All", ...departmentsList.map(d => d.department_name)];

  // Filter Logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment =
      department === "All" || emp.department === department;

    return matchesSearch && matchesDepartment;
  });


  return (

    <div className="p-0.5 overflow-x-hidden">

      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-4xl font-semibold text-gray-900">
            Employee Directory
          </h2>
          <p className="text-gray-500 text-sm">
            Manage and browse organizational talent.
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">

        {/* Search Bar */}
        <div className="relative flex-1 min-w-[150px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-3/4 pl-9 pr-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Department Filter Dropdown */}
        <div className="min-w-[150px]">
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-700 font-medium cursor-pointer shadow-sm hover:border-gray-400 transition"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === "All" ? "All Departments" : dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-2">
        {loading ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            <p className="text-gray-500 font-medium">Loading employees...</p>
          </div>
        ) : error ? (
          <div className="col-span-full text-center py-20">
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 text-indigo-600 hover:underline font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredEmployees.length > 0 ? (
          filteredEmployees.map((emp, index) => (
            <EmployeeCard key={index} employee={emp} index={index} />
          ))
        ) : (
          <p className="text-gray-500 col-span-full text-center py-20">No employees found.</p>
        )}
      </div>
    </div>
  );

};

export default EmployeeDirectory;

