"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { ViewIcon } from "../../../components/icons/ActionIcons";
import axios from "axios";
import { useNavigate, Navigate } from "react-router-dom";
import Pagination from "../../../components/Pagination/pagination";
import { useAuth } from "../../../contexts/AuthContext";
import { KPICard } from "../../../components/kpi/KPI";
import FilterListbox from "../../../components/filter/FilterListbox";
import {
  getNormalizedStatus,
  formatOfferStatusLabel,
} from "../components/offerStatus";

const PAGE_SIZE = 10;

export default function AdminOfferLettersDashboard() {
  const navigate = useNavigate();
  const { loading: authLoading, hasRole } = useAuth();

  const isAdmin = hasRole(["ADMIN", "Super_Admin"]);

  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  useEffect(() => {
    if (!isAdmin) return;
    const fetchOfferLetters = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/offerletters/`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setData(res.data || []);
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to load offer letters", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOfferLetters();
  }, [BASE_URL, isAdmin]);

  if (!authLoading && !isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  const total = data.length;
  const completedCount = data.filter(
    (d) => getNormalizedStatus(d.status) === "COMPLETED"
  ).length;
  const submittedCount = data.filter(
    (d) => getNormalizedStatus(d.status) === "SUBMITTED"
  ).length;
  const verifiedCount = data.filter(
    (d) => getNormalizedStatus(d.status) === "VERIFIED"
  ).length;
  const rejectedCount = data.filter(
    (d) => getNormalizedStatus(d.status) === "REJECTED"
  ).length;

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const name =
        `${row.first_name} ${row.middle_name ? row.middle_name + " " : ""}${row.last_name}`.toLowerCase();
      const email = row.mail?.toLowerCase() || "";
      const designation = row.designation?.toLowerCase() || "";

      const matchesSearch =
        name.includes(searchTerm.toLowerCase()) ||
        email.includes(searchTerm.toLowerCase()) ||
        designation.includes(searchTerm.toLowerCase());

      const rowStatus = getNormalizedStatus(row.status);
      const matchesStatus =
        statusFilter === "ALL" || rowStatus === statusFilter;
      const matchesType =
        typeFilter === "ALL" || row.employee_type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [data, searchTerm, statusFilter, typeFilter]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const employeeTypes = [
    "ALL",
    ...new Set(data.map((d) => d.employee_type).filter(Boolean)),
  ];

  return (
    <div className="p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total"
          value={total}
          icon={Users}
          onClick={() => {
            setStatusFilter("ALL");
            setCurrentPage(1);
          }}
        />
        <StatCard
          title="Completed"
          value={completedCount}
          icon={CheckCircle}
          color="text-green-600"
          onClick={() => {
            setStatusFilter("COMPLETED");
            setCurrentPage(1);
          }}
        />
        <StatCard
          title="Submitted"
          value={submittedCount}
          icon={Clock}
          color="text-blue-600"
          onClick={() => {
            setStatusFilter("SUBMITTED");
            setCurrentPage(1);
          }}
        />
        <StatCard
          title="Verified"
          value={verifiedCount}
          icon={FileText}
          color="text-indigo-600"
          onClick={() => {
            setStatusFilter("VERIFIED");
            setCurrentPage(1);
          }}
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          icon={XCircle}
          color="text-red-600"
          onClick={() => {
            setStatusFilter("REJECTED");
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name, email, or designation..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full md:w-1/3 px-3 py-2 border rounded-lg"
        />
        <FilterListbox
          options={[
            { value: "ALL", label: "All Status" },
            { value: "COMPLETED", label: "Completed" },
            { value: "SUBMITTED", label: "Submitted" },
            { value: "VERIFIED", label: "Verified" },
            { value: "REJECTED", label: "Rejected" },
            { value: "JOINING", label: "Joining" },
            { value: "JOINING_PENDING", label: "Joining Pending" },
            { value: "RESCHEDULED", label: "Rescheduled" },
          ]}
          value={statusFilter}
          onChange={(val) => {
            setStatusFilter(val);
            setCurrentPage(1);
          }}
        />
        <FilterListbox
          options={employeeTypes.map((t) => ({
            value: t,
            label: t === "ALL" ? "All Types" : t,
          }))}
          value={typeFilter}
          onChange={(val) => {
            setTypeFilter(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-indigo-900 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Candidate Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Designation</th>
              <th className="px-4 py-3 text-center">Type</th>
              <th className="px-4 py-3 text-center">Joining Date</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="py-10 text-center">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin text-indigo-600" />
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-10 text-center text-gray-500">
                  No offer letters found
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr
                  key={row.user_uuid}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="px-4 py-3 font-medium">
                    {row.first_name}
                    {row.middle_name ? ` ${row.middle_name}` : ""}{" "}
                    {row.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {row.mail}
                  </td>
                  <td className="px-4 py-3">{row.designation}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                      {row.employee_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {row.joining_date || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={getNormalizedStatus(row.status)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/employee-onboarding/admin/offer/${row.user_uuid}`
                        )
                      }
                      className="rounded-md bg-gray-100 p-1.5 text-gray-700 transition hover:bg-gray-200 hover:text-gray-900"
                      aria-label="View offer"
                      title="View offer"
                    >
                      <ViewIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        />
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color = "text-gray-700",
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40"
    >
      <KPICard
        label={title}
        value={value}
        icon={<Icon className="h-5 w-5" />}
        color={`bg-slate-100 ${color}`}
        className="h-full w-full bg-white border-black/20 shadow-sm hover:shadow-xl"
      />
    </button>
  );
}

function StatusBadge({ status }) {
  const styles = {
    COMPLETED: "bg-green-100 text-green-700",
    SUBMITTED: "bg-blue-100 text-blue-700",
    VERIFIED: "bg-indigo-100 text-indigo-700",
    REJECTED: "bg-red-100 text-red-700",
    JOINING: "bg-teal-100 text-teal-700",
    JOINING_PENDING: "bg-orange-100 text-orange-700",
    RESCHEDULED: "bg-yellow-100 text-yellow-700",
  };
  const style = styles[status] || "bg-gray-100 text-gray-700";
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>
      {formatOfferStatusLabel(status)}
    </span>
  );
}
