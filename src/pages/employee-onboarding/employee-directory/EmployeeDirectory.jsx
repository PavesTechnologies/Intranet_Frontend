import React, { useEffect, useState, useMemo } from "react";
import api from "../../../api/axiosInstance";
import { Search } from "lucide-react";

import Button from "../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import FilterListbox from "../../../components/filter/FilterListbox";
import LoadingSpinner from "../../../components/LoadingSpinner";
import EmployeeCard from "../components/EmployeeCard";
import Pagination from "../../../components/Pagination/pagination";
import PageHeader from "../../../components/ui/PageHeader";

const PAGE_SIZE = 12;

const EmployeeDirectory = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("All");

  const [departmentsList, setDepartmentsList] = useState([]);
  const [designationsList, setDesignationsList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const [empRes, deptRes, desigRes] = await Promise.all([
          api.get(`${BASE_URL}/permanent-employee/core-employee-details/`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),

          api.get(`${BASE_URL}/masters/departments/`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),

          api.get(`${BASE_URL}/masters/designations/`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }),
        ]);

        const depts = Array.isArray(deptRes.data)
          ? deptRes.data
          : deptRes.data.data || [];

        const desigs = Array.isArray(desigRes.data)
          ? desigRes.data
          : desigRes.data.data || [];

        setDepartmentsList(depts);

        const deptMap = Object.fromEntries(
          depts.map((d) => [d.department_uuid, d.department_name])
        );

        const desigMap = Object.fromEntries(
          desigs.map((designation) => [designation.designation_uuid, designation.designation_name])
        );

     const employeeData = Array.isArray(empRes.data)
  ? empRes.data
  : empRes.data.data || [];

const employeeMap = Object.fromEntries(
  employeeData.map((employee) => [
    String(employee.employee_id),
    `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
  ])
);

const mappedEmployees = employeeData.map((emp) => {
  console.log("Raw Employee Data:", emp);

  return {
    ...emp,

    // Employee Card Data
    name: `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),

    email: emp.work_email || emp.email || "N/A",

    contact: emp.contact_number || emp.contact || "N/A",

    role:
      desigMap[emp.designation_uuid] ||
      emp.role ||
      "N/A",

    department:
      deptMap[emp.department_uuid] ||
      emp.department ||
      "N/A",

    location: emp.location || "Hyderabad Office",

    initials: (
      (emp.first_name?.[0] || "") +
      (emp.last_name?.[0] || "")
    ).toUpperCase(),

    // Profile Modal Fields
    employeeId: emp.employee_id || "N/A",

    gender: emp.gender || "N/A",

    employeeType: emp.employment_type || "Full-Time",

    dateOfJoining: emp.joining_date || "N/A",

    // Reporting Manager Name Mapping
    reportingManager:
      employeeMap[String(emp.reporting_manager_uuid)] || "N/A",
  };
});


        
        setEmployees(mappedEmployees);
        setError(null);
      } catch (err) {
        console.error("Error fetching employee directory data:", err);

        setError(
          "Failed to load employee directory. Please try again later."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [BASE_URL]);

  const departments = ["All", ...departmentsList.map((dept) => dept.department_name)];

  const filteredEmployees = useMemo(() => {
    setCurrentPage(1);
    const searchValue = search.toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch =
        employee.name.toLowerCase().includes(searchValue) ||
        employee.role.toLowerCase().includes(searchValue);
      const matchesDepartment =
        department === "All" || employee.department === department;
      return matchesSearch && matchesDepartment;
    });
  }, [employees, search, department]);

  const totalPages = Math.ceil(filteredEmployees.length / PAGE_SIZE);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="p-6">
      <PageHeader
        title="Employee Directory"
        subtitle="Manage and browse organizational talent across the onboarding workflow."
      />

      <PageCard className="border-slate-200">
        <PageCardContent className="space-y-6 p-6 md:p-8">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-end">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="employeeDirectorySearch"
                type="text"
                placeholder="Search by name or role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-12 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
              />
            </div>

            <div className="w-full">
              <FilterListbox
                options={departments.map((dept) => ({
                  value: dept,
                  label: dept === "All" ? "All Departments" : dept,
                }))}
                value={department}
                onChange={setDepartment}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {loading ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 py-20">
                <LoadingSpinner text="Loading employees..." />
              </div>
            ) : error ? (
              <div className="col-span-full rounded-2xl border border-red-100 bg-red-50 px-6 py-16 text-center">
                <p className="font-medium text-red-600">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="medium"
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            ) : filteredEmployees.length > 0 ? (
              paginatedEmployees.map((employee, index) => (
                <EmployeeCard
                  key={employee.employee_uuid || employee.employeeId || index}
                  employee={employee}
                  index={index}
                />
              ))
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-20 text-center text-slate-500">
                No employees found.
              </div>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          />
        </PageCardContent>
      </PageCard>
    </div>
  );
};

export default EmployeeDirectory;