"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Users,
  X,
  XCircle,
  ShieldCheck,
  Clock,
  MailCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { showStatusToast } from "../../../components/toastfy/toast";
import Button from "../../../components/Button/Button";
import Table from "../../../components/Table/table";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import EmployeeCreateModal from "../components/employee-create-modal/EmployeeCreateModal";
import {
  formatOfferStatusLabel,
  getNormalizedStatus,
  getOfferDisplayStatus,
  persistJoiningStatus,
} from "../components/offerStatus";
import { fetchOfferDetailsList } from "../components/fetchOfferDetails";

const PAGE_SIZE = 5;
const DEPARTMENTS = [
  "Engineering",
  "HR",
  "Finance",
  "Marketing",
  "Sales",
  "Operations",
  "Admin",
];

const ALLOWED_STATUSES = ["SUBMITTED", "VERIFIED", "REJECTED", "JOINING"];

function JoinModal({
  open,
  onClose,
  onSubmit,
  loading,
  form,
  setForm,
  managerOptions,
  loadingManagers,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] p-6 relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          Send Joining Details
        </h2>

        <div className="space-y-4 overflow-y-auto pr-2 flex-1">
          <InputField
            label="Joining Date *"
            type="date"
            value={form.joining_date}
            onChange={(v) =>
              setForm({ ...form, joining_date: v })
            }
          />

          <InputField
            label="Reporting Time *"
            type="time"
            value={form.reporting_time}
            onChange={(v) =>
              setForm({ ...form, reporting_time: v })
            }
          />

          <InputField
            label="Location *"
            type="text"
            value={form.location}
            onChange={(v) =>
              setForm({ ...form, location: v })
            }
          />

          <SelectField
            label="Department *"
            value={form.department}
            options={DEPARTMENTS}
            onChange={(v) =>
              setForm({ ...form, department: v })
            }
          />

          <SearchableSelect
            label="Reporting Manager *"
            value={form.reporting_manager}
            options={managerOptions}
            loading={loadingManagers}
            disabled={loadingManagers}
            placeholder="Search manager"
            onChange={(v) =>
              setForm({ ...form, reporting_manager: v })
            }
          />

          <TextAreaField
            label="Additional Content"
            value={form.custom_message}
            onChange={(v) =>
              setForm({ ...form, custom_message: v })
            }
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button
            varient="secondary"
            size="small"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            varient="primary"
            size="small"
            onClick={onSubmit}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({ onView, onCreate, showCreate }) {
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
              onView();
              setOpen(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            View
          </button>

          {showCreate && (
            <button
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
            >
              Create
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function HrOnboardingDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;

  const [data, setData] = useState([]);
  const [employeeUserIds, setEmployeeUserIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [bulkJoinMode, setBulkJoinMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [managerOptions, setManagerOptions] = useState([]);
  const [loadingManagers, setLoadingManagers] = useState(false);

  const [joinForm, setJoinForm] = useState({
    joining_date: "",
    reporting_time: "",
    location: "",
    department: "",
    reporting_manager: "",
    custom_message: "",
  });

  const handleKpiClick = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const offers = await fetchOfferDetailsList(BASE_URL, token);
      setData(offers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCoreEmployees = async () => {
    try {
      const res = await axios.get(
        `${BASE_URL}/permanent-employee/core-employee-details/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const ids = (res.data || []).map((e) => e.user_uuid);
      setEmployeeUserIds(ids);
    } catch (err) {
      console.error("Failed to fetch core employees", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchCoreEmployees();
  }, []);

  const handleOpenCreateModal = (employee) => {
    setSelectedEmployee({
      userUuid: employee.user_uuid,
      firstName: employee.first_name,
      middleName: employee.middle_name,
      lastName: employee.last_name,
    });
    setIsCreateOpen(true);
  };

  const handleCloseCreateModal = () => {
    setIsCreateOpen(false);
    setSelectedEmployee(null);
    setCurrentPage(1);
    fetchCoreEmployees();
    fetchEmployees();
  };

  const fetchManagers = async () => {
    setLoadingManagers(true);

    try {
      const res = await axios.get(
        `${BASE_URL}/offer-approval/admin-users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const managers = (res.data || []).map((u) => ({
        value: u.name,
        label: `${u.name} (${u.mail})`,
      }));

      setManagerOptions(managers);
    } catch (err) {
      console.error("Failed to load managers:", err);
    }

    setLoadingManagers(false);
  };

  useEffect(() => {
    fetchManagers();
  }, []);

  const pageData = useMemo(() => {
    return data.filter((emp) =>
      ALLOWED_STATUSES.includes(getNormalizedStatus(emp.status))
    );
  }, [data]);

  const filteredData = useMemo(() => {
    return pageData.filter((emp) => {
      const searchText = `${emp.first_name} ${emp.last_name} ${emp.designation}`
        .toLowerCase();

      const matchesSearch = searchText.includes(
        searchTerm.toLowerCase()
      );

      const status = getOfferDisplayStatus(emp, employeeUserIds);
      const filter = statusFilter.trim().toUpperCase();

      if (filter === "ALL") {
        return matchesSearch;
      }

      return matchesSearch && status === filter;
    });
  }, [pageData, searchTerm, statusFilter, employeeUserIds]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  };

  const resetBulk = () => {
    setBulkJoinMode(false);
    setSelectedIds([]);
    setShowModal(false);
    setJoinForm({
      joining_date: "",
      reporting_time: "",
      location: "",
      department: "",
      reporting_manager: "",
      custom_message: "",
    });
  };

  const handleSendJoinEmail = async () => {
    const {
      joining_date,
      reporting_time,
      location,
      department,
      reporting_manager,
    } = joinForm;

    if (
      !joining_date ||
      !reporting_time ||
      !location ||
      !department ||
      !reporting_manager
    ) {
      showStatusToast("Please fill all required fields");
      return;
    }

    const selectedEmployees = filteredData.filter((e) =>
      selectedIds.includes(e.user_uuid)
    );

    const emails = selectedEmployees
      .map((e) => e.mail)
      .filter(Boolean);

    if (emails.length === 0) {
      showStatusToast("No valid emails found");
      return;
    }

    const payload = {
      user_emails_list: emails,
      ...joinForm,
    };

    try {
      setSending(true);

      await axios.post(`${BASE_URL}/hr/offerletters/bulk-join`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setData((prev) =>
        prev.map((emp) =>
          selectedIds.includes(emp.user_uuid)
            ? {
                ...emp,
                ...joinForm,
                status:
                  getNormalizedStatus(emp.status) === "VERIFIED"
                    ? "JOINING"
                    : emp.status,
              }
            : emp
        )
      );

      selectedEmployees.forEach((employee) =>
        persistJoiningStatus({
          ...employee,
          ...joinForm,
          status: "JOINING",
        })
      );

      showStatusToast("Joining emails sent");
      resetBulk();
    } catch (err) {
      console.log("JOIN ERROR FULL:", err.response?.data);
      console.log("JOIN ERROR DETAIL:", err.response?.data?.detail);
      console.log("JOIN PAYLOAD:", payload);
      console.error(err);

      showStatusToast("Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  const headers = [
    bulkJoinMode ? "Select" : null,
    "Name",
    "Email",
    "Contact",
    "Role",
    "Status",
    "Action",
  ].filter(Boolean);

  const columns = [
    bulkJoinMode ? "select" : null,
    "name",
    "mail",
    "contact",
    "designation",
    "status",
    "action",
  ].filter(Boolean);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  useEffect(() => {
    if (totalPages === 0) {
      setCurrentPage(1);
      return;
    }

    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const rows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return filteredData
      .slice(startIndex, startIndex + PAGE_SIZE)
      .map((emp) => {
        const displayStatus = getOfferDisplayStatus(emp, employeeUserIds);
        const isEmployeeCreated = displayStatus === "COMPLETED";
        const isVerified = displayStatus === "VERIFIED";
        const isJoining = displayStatus === "JOINING";

        return {
          rowClass: isEmployeeCreated ? "bg-green-100" : "",
          ...(bulkJoinMode && {
            select: (
              <input
                type="checkbox"
                disabled={!isVerified}
                checked={selectedIds.includes(emp.user_uuid)}
                onChange={() =>
                  isVerified &&
                  toggleSelect(emp.user_uuid)
                }
                className={`h-4 w-4 ${
                  isVerified
                    ? "cursor-pointer"
                    : "opacity-40 cursor-not-allowed"
                }`}
              />
            ),
          }),
          name: `${emp.first_name} ${emp.last_name}`,
          mail: emp.mail || "—",
          contact: emp.contact_number || "—",
          designation: emp.designation || "—",
          status: (
            <StatusBadge
              label={formatOfferStatusLabel(displayStatus)}
              size="sm"
            />
          ),
          action: (
            <ActionMenu
              onView={() =>
                navigate(`/employee-onboarding/hr/profile/${emp.user_uuid}`)
              }
              onCreate={() => handleOpenCreateModal(emp)}
              showCreate={(isVerified || isJoining) && !isEmployeeCreated}
            />
          ),
        };
      });
  }, [
    filteredData,
    currentPage,
    bulkJoinMode,
    selectedIds,
    navigate,
    employeeUserIds,
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          HR Onboarding Dashboard
        </h1>

        <p className="text-gray-500">
          Verify employee documents & profiles
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Profiles"
          value={loading ? "0" : pageData.length}
          icon={Users}
          onClick={() => handleKpiClick("ALL")}
        />

        <StatCard
          title="Verified"
          value={
            loading
              ? "0"
              : pageData.filter(
                  (e) =>
                    getOfferDisplayStatus(e, employeeUserIds) ===
                    "VERIFIED"
                ).length
          }
          icon={ShieldCheck}
          onClick={() => handleKpiClick("VERIFIED")}
        />

        <StatCard
          title="Joining"
          value={
            loading
              ? "0"
              : pageData.filter(
                  (e) =>
                    getOfferDisplayStatus(e, employeeUserIds) ===
                    "JOINING"
                ).length
          }
          icon={MailCheck}
          onClick={() => handleKpiClick("JOINING")}
        />

        <StatCard
          title="Completed"
          value={
            loading
              ? "0"
              : pageData.filter(
                  (e) =>
                    getOfferDisplayStatus(e, employeeUserIds) ===
                    "COMPLETED"
                ).length
          }
          icon={Clock}
          onClick={() => handleKpiClick("COMPLETED")}
        />

        <StatCard
          title="Rejected"
          value={
            loading
              ? "0"
              : pageData.filter(
                  (e) =>
                    getOfferDisplayStatus(e, employeeUserIds) ===
                    "REJECTED"
                ).length
          }
          icon={XCircle}
          onClick={() => handleKpiClick("REJECTED")}
        />
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <input
          placeholder="Search by candidate name... or Role"
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
          <option value="SUBMITTED">Submitted</option>
          <option value="VERIFIED">Verified</option>
          <option value="JOINING">Joining</option>
          <option value="COMPLETED">Completed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm flex justify-between">
        <h2 className="font-semibold text-gray-700">
          Recent Offer Letters
        </h2>

        {!bulkJoinMode ? (
          <Button
            varient="primary"
            size="small"
            onClick={() => {
              const hasVerified = filteredData.some(
                (e) =>
                  getOfferDisplayStatus(e, employeeUserIds) ===
                  "VERIFIED"
              );

              if (!hasVerified) {
                showStatusToast(
                  "No verified candidates available for bulk join"
                );
                return;
              }

              setBulkJoinMode(true);
            }}
          >
            Bulk Join
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button
              varient="primary"
              size="small"
              disabled={selectedIds.length === 0}
              onClick={() => setShowModal(true)}
            >
              Send ({selectedIds.length})
            </Button>

            <Button
              varient="secondary"
              size="small"
              onClick={resetBulk}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm relative overflow-visible">
        <Table
          headers={headers}
          columns={columns}
          rows={rows}
          loading={loading}
        />

        {filteredData.length > PAGE_SIZE && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() =>
              setCurrentPage((p) =>
                Math.max(p - 1, 1)
              )
            }
            onNext={() =>
              setCurrentPage((p) =>
                Math.min(p + 1, totalPages)
              )
            }
          />
        )}
      </div>

      <JoinModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleSendJoinEmail}
        loading={sending}
        form={joinForm}
        setForm={setJoinForm}
        managerOptions={managerOptions}
        loadingManagers={loadingManagers}
      />

      <EmployeeCreateModal
        isOpen={isCreateOpen}
        onClose={handleCloseCreateModal}
        userUuid={selectedEmployee?.userUuid}
        firstName={selectedEmployee?.firstName}
        middleName={selectedEmployee?.middleName}
        lastName={selectedEmployee?.lastName}
      />
    </div>
  );
}

function InputField({ label, type, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border rounded-lg"
      />
    </div>
  );
}

function TextAreaField({ label, value, onChange }) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>
      <textarea
        rows="3"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 px-3 py-2 border rounded-lg"
      />
    </div>
  );
}

function StatCard({ title, value, icon: Icon, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-xl border border-black/20 shadow-sm 
                 flex gap-4 transition-all duration-300 
                 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
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

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
  loading = false,
}) {
  return (
    <div>
      <label className="text-sm font-medium">
        {label}
      </label>

      <select
        disabled={disabled || loading}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full mt-1 px-3 py-2 border rounded-lg bg-white
          ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <option value="">
          {loading ? "Loading..." : `Select ${label}`}
        </option>

        {options.map((opt) => {
          if (typeof opt === "string") {
            return (
              <option key={opt} value={opt}>
                {opt}
              </option>
            );
          }

          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function SearchableSelect({
  label,
  value,
  options,
  onChange,
  disabled = false,
  placeholder = "Search...",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const selectedLabel =
    options.find((o) => o.value === value)?.label || "";

  return (
    <div className="relative">
      <label className="text-sm font-medium">
        {label}
      </label>

      <input
        disabled={disabled}
        value={open ? query : selectedLabel}
        onFocus={() => setOpen(true)}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className={`w-full mt-1 px-3 py-2 border rounded-lg
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />

      {open && !disabled && (
        <div className="absolute z-50 w-full bg-white border rounded-lg shadow max-h-48 overflow-y-auto mt-1">
          {filtered.length === 0 && (
            <div className="p-2 text-gray-500 text-sm">
              No results
            </div>
          )}

          {filtered.map((opt) => (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
                setQuery("");
              }}
              className="px-3 py-2 cursor-pointer hover:bg-indigo-50"
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
