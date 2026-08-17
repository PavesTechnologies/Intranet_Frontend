import React, { useEffect, useState, useRef } from "react";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import Pagination from "../../../components/Pagination/pagination";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { Plus, Pencil } from "lucide-react";
import LeaveUploadWizard from "./LeaveUploadWizard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import DataTable from "../../../components/patterns/DataTable";
import FormSelect from "../../../components/forms/FormSelect";
import BackButton from "../../../components/patterns/BackButton";

export const YearDropdown = ({ value, onChange }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="w-32">
      <FormSelect
        name="year"
        options={years.map((y) => ({ value: y, label: String(y) }))}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// ─────────────────────────────────────────────
// Pure fetch function — used by React Query
// ─────────────────────────────────────────────
const fetchLeaveBalances = async ({ query, year, page, rowsPerPage }) => {
  const pageIndex = page - 1;

  const url =
    query === ""
      ? `${BASE_URL}/api/leave-balance/leave-balance?year=${year}&page=${pageIndex}&size=${rowsPerPage}`
      : `${BASE_URL}/api/leave-balance/search/${year}?query=${encodeURIComponent(query)}&page=${pageIndex}&size=${rowsPerPage}`;

  const response = await api.get(url, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const employeeMap = {};
  const leaveTypeCollection = {};

  // ✅ Case 1: Paginated grouped → { data: [{employeeId, employeeName, leaves:[]}], totalPages }
  if (!Array.isArray(response.data) && response.data?.data) {
    const employees = response.data.data;

    employees.forEach((emp) => {
      if (!emp.employeeId) return;

      employeeMap[emp.employeeId] = {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        employeeGender: emp.gender || null,
        balances: {},
      };

      (emp.leaves || []).forEach(
        ({ leaveTypeId, leaveTypeName, remainingLeaves }) => {
          if (!leaveTypeName || !leaveTypeId) return;

          employeeMap[emp.employeeId].balances[leaveTypeName] = {
            leaveTypeId,
            remainingLeaves: remainingLeaves ?? 0,
            year: emp.year,
            leaveType: { maxDaysPerYear: null },
          };

          if (!leaveTypeCollection[leaveTypeName]) {
            leaveTypeCollection[leaveTypeName] = { leaveTypeName, leaveTypeId };
          }
        },
      );
    });

    return {
      data: Object.values(employeeMap),
      leaveTypes: Object.values(leaveTypeCollection),
      totalPages: response.data.totalPages || 1,
    };
  }

  // ✅ Case 2: Flat array → [{employee:{}, leaveType:{}, remainingLeaves}]
  const raw = Array.isArray(response.data) ? response.data : [];

  raw.forEach((entry) => {
    const empId = entry.employee?.employeeId;
    const leaveTypeName = entry.leaveType?.leaveName;
    const leaveTypeId = entry.leaveType?.leaveTypeId;
    const remainingLeaves = entry.remainingLeaves ?? 0;
    const maxDaysPerYear = entry.leaveType?.maxDaysPerYear ?? null;

    if (!empId || !leaveTypeName || !leaveTypeId) return;

    if (!employeeMap[empId]) {
      employeeMap[empId] = {
        employeeId: empId,
        employeeName:
          `${entry.employee?.firstName ?? ""} ${entry.employee?.lastName ?? ""}`.trim(),
        employeeGender: entry.employee?.gender || null,
        balances: {},
      };
    }

    employeeMap[empId].balances[leaveTypeName] = {
      leaveTypeId,
      remainingLeaves,
      year: entry.year,
      leaveType: { maxDaysPerYear },
    };

    if (!leaveTypeCollection[leaveTypeName]) {
      leaveTypeCollection[leaveTypeName] = { leaveTypeName, leaveTypeId };
    }
  });

  const result = Object.values(employeeMap);

  return {
    data: result,
    leaveTypes: Object.values(leaveTypeCollection),
    totalPages: Math.ceil(result.length / rowsPerPage) || 1,
  };
};

// Helper to convert snake_case/camelCase to Pascal Case with spaces
const formatLeaveTypeName = (name) => {
  if (!name) return "";
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
const EmployeeLeaveBalances = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showUploadWizard, setShowUploadWizard] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 10;
  const wrapperRef = useRef(null);

  // ─── Query Key — uniquely identifies this request in the cache ───
  const queryKey = ["leaveBalances", debouncedQuery, currentYear, currentPage];

  // ─── useQuery — fetches & caches data per unique key ───
  const {
    data: queryResult,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: () =>
      fetchLeaveBalances({
        query: debouncedQuery,
        year: currentYear,
        page: currentPage,
        rowsPerPage,
      }),
    keepPreviousData: true, // ✅ show stale data while fetching next page
    staleTime: 1000 * 60 * 2, // ✅ cache fresh for 2 minutes
    cacheTime: 1000 * 60 * 5, // ✅ cache kept in memory for 5 minutes
    onError: () => toast.error("Failed to fetch leave balances"),
  });

  const data = queryResult?.data ?? [];
  const leaveTypes = queryResult?.leaveTypes ?? [];
  const totalPages = queryResult?.totalPages ?? 1;

  // ─── useMutation — PUT update + invalidate cache on success ───
  const updateMutation = useMutation({
    mutationFn: (payload) =>
      api.put(`${BASE_URL}/api/leave-balance/update`, payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    onSuccess: (res) => {
      toast.success(res.data?.message || "Leave balances updated successfully");
      setIsEditModalOpen(false);
      // ✅ Bust all leaveBalances cache pages so fresh data loads
      queryClient.invalidateQueries({ queryKey: ["leaveBalances"] });
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to update leave balances",
      );
    },
  });

  const isSubmitting = updateMutation.isPending;

  // ─── Close suggestions on outside click ───
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [wrapperRef]);

  // ─── Close suggestions on Escape ───
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setShowSuggestions(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ─── Debounce search + reset page ───
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // ─── Prefetch next page while user is on current page ───
  useEffect(() => {
    if (currentPage < totalPages) {
      queryClient.prefetchQuery({
        queryKey: [
          "leaveBalances",
          debouncedQuery,
          currentYear,
          currentPage + 1,
        ],
        queryFn: () =>
          fetchLeaveBalances({
            query: debouncedQuery,
            year: currentYear,
            page: currentPage + 1,
            rowsPerPage,
          }),
        staleTime: 1000 * 60 * 2,
      });
    }
  }, [currentPage, totalPages, debouncedQuery, currentYear]);

  // ─── Autocomplete ───
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      try {
        const res = await api.get(
          `${BASE_URL}/api/leave-balance/autocomplete?query=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        setSuggestions(res.data);
        setShowSuggestions(true);
      } catch (err) {
        console.error("Error fetching suggestions", err);
      }
    };
    fetchSuggestions();
  }, [searchQuery]);

  const handleSubmit = () => {
    const gender = selectedEmployee?.employeeGender?.toLowerCase();

    const filteredBalances = leaveTypes
      .filter(({ leaveTypeName }) => {
        if (!leaveTypeName) return false;
        const lowerName = leaveTypeName.toLowerCase();
        const isMaternity = lowerName.includes("maternity");
        const isPaternity = lowerName.includes("paternity");
        if (
          (isMaternity && gender === "male") ||
          (isPaternity && gender === "female") ||
          ((isMaternity || isPaternity) && !gender)
        )
          return false;
        return true;
      })
      .map(({ leaveTypeName, leaveTypeId }) => ({
        leaveTypeId,
        remainingLeaves:
          selectedEmployee.balances[leaveTypeName]?.remainingLeaves ?? 0,
        year:
          selectedEmployee.balances[leaveTypeName]?.year ??
          new Date().getFullYear(),
      }));

    updateMutation.mutate({
      employeeId: selectedEmployee.employeeId,
      balances: filteredBalances,
      year: new Date().getFullYear(),
    });
  };

  const handleEdit = (employee) => {
    setSelectedEmployee({ ...employee });
    setIsEditModalOpen(true);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setDebouncedQuery(suggestion);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handlePrevious = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNext = () =>
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  const yearOptions = Array.from(
    { length: 3 },
    (_, i) => new Date().getFullYear() - i,
  ).map((y) => ({ value: y, label: String(y) }));

  return (
    <div className="p-6 overflow-auto">
      {/* Loading Spinner Overlay */}
      {(isLoading || isFetching) && (
        <div className="absolute inset-0 bg-white/70 flex justify-center items-center z-50`">
          <LoadingSpinner text="Loading Leave Balances" />
        </div>
      )}

      {/* Title & Back Button */}
      <div className="flex items-center gap-3 px-6 mb-4">
        <BackButton onClick={() => navigate(-1)} />
        <h2 className="text-xl font-bold text-gray-800">
          Employee Leave Balances
        </h2>
      </div>

      {/* Search Bar + Year + Add Button */}
      <div className="flex items-center gap-3 mb-4">
        <div ref={wrapperRef} className="relative w-full max-w-md">
          <FormInput
            type="text"
            name="employeeLeaveBalanceSearch"
            placeholder="Search by Employee ID or Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
          />

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute bg-white border rounded w-full shadow-md mt-1 max-h-48 overflow-y-auto z-20">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                >
                  {s}
                </li>
              ))}
            </ul>
          )}

          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSearchQuery("");
                setDebouncedQuery("");
                setSuggestions([]);
              }}
              className="absolute right-2 top-2 text-gray-500 hover:text-black"
              aria-label="Clear search"
            >
              ✕
            </Button>
          )}
        </div>

        <div className="w-32">
          <FormSelect
            name="tableYear"
            options={yearOptions}
            value={currentYear}
            onChange={(e) => {
              setCurrentYear(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <Button
          onClick={() => setShowUploadWizard(true)}
          variant="primary"
          size="medium"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Leave Balance
        </Button>
      </div>

      {/* Table */}
      <div>
        {data.length === 0 && !isLoading ? (
          <p className="text-gray-500 italic font-semibold text-center mt-5">
            No leave balances found.
          </p>
        ) : (
          <DataTable
            getRowKey={(emp) => emp.employeeId}
            rows={data}
            loading={isLoading}
            columns={[
              {
                key: "employeeId",
                header: "Employee Id",
                className: "text-center",
              },
              {
                key: "employeeName",
                header: "Employee Name",
                className: "text-center",
              },
              ...leaveTypes.map(({ leaveTypeName, leaveTypeId }) => ({
                key: String(leaveTypeId || leaveTypeName),
                header: formatLeaveTypeName(leaveTypeName),
                className: "text-center",
                render: (emp) =>
                  emp.balances[leaveTypeName]?.remainingLeaves ?? "-",
              })),
              {
                key: "actions",
                header: "Actions",
                className: "text-center",
                render: (emp) => (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(emp)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                    aria-label="Edit"
                  >
                    <Pencil size={16}></Pencil>
                  </Button>
                ),
              },
            ]}
          />
        )}

        {showUploadWizard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowUploadWizard(false)}
            />
            <div className="relative z-10 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
              <LeaveUploadWizard onClose={() => setShowUploadWizard(false)} />
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={handlePrevious}
          onNext={handleNext}
        />
      )}

      {/* Spinner during submit */}
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <LoadingSpinner />
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          {isSubmitting && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-white"></div>
            </div>
          )}

          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
            <h3 className="text-xl font-bold mb-6">
              Edit Leave Balances – {selectedEmployee.employeeName}
            </h3>

            <div className="space-y-4">
              {leaveTypes.map(({ leaveTypeId, leaveTypeName }) => {
                if (!leaveTypeName) return null;

                const gender = selectedEmployee?.employeeGender?.toLowerCase();
                const totalLeaves =
                  selectedEmployee.balances[leaveTypeName]?.leaveType
                    ?.maxDaysPerYear ?? "N/A";
                const currentValue =
                  selectedEmployee.balances[leaveTypeName]?.remainingLeaves ??
                  "";

                const isMaternity = leaveTypeName
                  .toLowerCase()
                  .includes("maternity");
                const isPaternity = leaveTypeName
                  .toLowerCase()
                  .includes("paternity");

                const isDisabled =
                  (isMaternity && gender === "male") ||
                  (isPaternity && gender === "female") ||
                  ((isMaternity || isPaternity) && !gender);

                return (
                  <div
                    key={leaveTypeId || leaveTypeName}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <label className="font-medium min-w-[150px]">
                      {leaveTypeName}
                    </label>
                    <div className="flex items-center gap-2 w-full sm:w-[300px]">
                      <FormInput
                        name={`leave-balance-${leaveTypeName}`}
                        type="number"
                        disabled={isDisabled}
                        inputClassName={`shadow-sm ${isDisabled
                          ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                          : ""
                          }`}
                        value={isDisabled ? 0 : currentValue}
                        onChange={(e) => {
                          if (isDisabled) return;
                          const updated = { ...selectedEmployee };
                          if (!updated.balances[leaveTypeName])
                            updated.balances[leaveTypeName] = {};
                          updated.balances[leaveTypeName].remainingLeaves =
                            parseFloat(e.target.value);
                          setSelectedEmployee(updated);
                        }}
                      />
                      <span className="text-sm text-gray-500 whitespace-nowrap">
                        Total: {totalLeaves}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSubmitting}
                className="bg-gray-500 text-white hover:bg-gray-600"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeLeaveBalances;
