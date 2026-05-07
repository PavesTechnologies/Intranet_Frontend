"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { useNavigate, Navigate } from "react-router-dom";
import axios from "axios";
import Pagination from "../../../components/Pagination/pagination";
import {useAuth} from "../../../contexts/AuthContext";

/* ============================
   ADMIN APPROVAL DASHBOARD
   (Single API Optimized)
============================ */
export default function AdminApprovalDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

 /* ---------- ROLE LOGIC ---------- */
const { user, loading: authLoading } = useAuth();

const userRoles = useMemo(() => {
  const rawRoles = user?.roles || [];
  // Handle both Array and comma-separated string formats
  const rolesArray = Array.isArray(rawRoles) 
    ? rawRoles 
    : typeof rawRoles === 'string' ? rawRoles.split(',').map(r => r.trim()) : [];
  
  return rolesArray;
}, [user]);

// Match the casing used in ViewEmpDetails
const isHR = userRoles.includes("HR");
const isAdmin = userRoles.includes("Admin");
const isManager = userRoles.includes("Reporting_Manager");

// Permission flag for this specific page
const isAuthorizedManager = isManager || isAdmin;
  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const PAGE_SIZE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const handleKpiClick = (status) => {
    setStatusFilter(status);
  };

  const getStatus = (row) => {
    return row.action ? row.action.toUpperCase() : "PENDING";
  };

  /* ---------- FETCH DATA (ONE API) ---------- */
  useEffect(() => {
    if (!isAuthorizedManager) return;

    const fetchApprovals = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE_URL}/offer-approval/my-actions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setData(res.data || []);
        setCurrentPage(1);
      } catch (error) {
        console.error("Failed to load admin approvals", error);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, [BASE_URL, token, isAuthorizedManager]);
  // Redirect if not authorized
if (!authLoading && !isAuthorizedManager) {
  return <Navigate to="/unauthorized" replace />;
}

  /* ---------- STATS ---------- */
  const totalRequests = data.length;
  const approvedCount = data.filter((d) => getStatus(d) === "APPROVED").length;
  const rejectedCount = data.filter((d) => getStatus(d) === "REJECTED").length;
  const onHoldCount = data.filter((d) => getStatus(d) === "ON_HOLD").length;
  const pendingCount = data.filter((d) => getStatus(d) === "PENDING").length;

  /* ---------- FILTERED DATA ---------- */
  const filteredData = useMemo(() => {
    return data.filter((row) => {
      const name = `${row.first_name} ${row.middle_name ? row.middle_name + " " : ""}${row.last_name}`.toLowerCase();
      const role = row.designation?.toLowerCase() || "";

      const matchesSearch =
        name.includes(searchTerm.toLowerCase()) ||
        role.includes(searchTerm.toLowerCase());

      const rowStatus = getStatus(row);
      const matchesStatus =
        statusFilter === "ALL" || rowStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);

  const paginatedData = filteredData.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // if (loading) {
  //   return <div className="p-10 text-center">Loading admin approvals...</div>;
  // }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
<div className="flex justify-between items-center">
  

  
</div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Requests"
          value={totalRequests}
          icon={Users}
          onClick={() => handleKpiClick("ALL")}
        />
        <StatCard
          title="Approved"
          value={approvedCount}
          icon={CheckCircle}
          color="text-green-600"
          onClick={() => handleKpiClick("APPROVED")}
        />
        <StatCard
          title="Rejected"
          value={rejectedCount}
          icon={XCircle}
          color="text-red-600"
          onClick={() => handleKpiClick("REJECTED")}
        />
        <StatCard
          title="On Hold"
          value={onHoldCount}
          icon={PauseCircle}
          color="text-yellow-600"
          onClick={() => handleKpiClick("ON_HOLD")}
        />
        <StatCard
          title="Pending"
          value={pendingCount}
          icon={Clock}
          color="text-gray-600"
          onClick={() => handleKpiClick("PENDING")}
        />
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <input
          type="text"
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
          className="w-full md:w-1/4 px-3 py-2 border rounded-lg"
        >
          <option value="ALL">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-indigo-900 text-white">
            <tr>
              <th className="px-4 py-3 text-left">Candidate Name</th>
              <th className="px-4 py-3 text-center">Email</th>
              <th className="px-4 py-3 text-center">Role</th>
              <th className="px-4 py-3 text-center">Approval Status</th>
              <th className="px-4 py-3">requested by</th>
              <th className="px-4 py-3 text-center">Action</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="py-10 text-center">
                  <Loader2 className="h-6 w-6 mx-auto animate-spin text-indigo-600" />
                </td>
              </tr>
            ) : filteredData.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-10 text-center text-gray-500">
                  No approval requests found
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr key={row.id} className="border-b">
                    <td className="px-4 py-3">
                  {row.first_name}{row.middle_name ? ` ${row.middle_name}` : ""} {row.last_name}
                </td>
                <td className="px-4 py-3">{row.mail}</td>
                <td className="px-4 py-3">{row.designation}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={getStatus(row)} />
                </td>
                <td className="px-4 py-3">{row.requested_by_name}</td>
                <td className="px-4 py-3 text-indigo-600 cursor-pointer">
                  <span
                    onClick={() =>
                      navigate(`/employee-onboarding/admin/offer/${row.user_uuid}`)
                    }
                  >
                    View
                  </span>
                </td>
              </tr>
              )
            ))}

            {/* {! loading && filteredData.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-500">
                  No approval requests found
                </td>
              </tr>
            )} */}
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

/* ---------- STAT CARD ---------- */
function StatCard({
  title,
  value,
  icon: Icon,
  color = "text-gray-700",
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl p-4 border border-black/20 shadow-sm 
                 flex items-center gap-4 transition-all duration-300 
                 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
    >
      <Icon className={`h-6 w-6 ${color}`} />
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="text-xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

/* ---------- STATUS BADGE ---------- */
function StatusBadge({ status }) {
  const styles = {
    APPROVED: "bg-green-100 text-green-700",
    REJECTED: "bg-red-100 text-red-700",
    ON_HOLD: "bg-yellow-100 text-yellow-700",
    PENDING: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}
