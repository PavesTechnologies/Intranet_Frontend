"use client";

import { useEffect, useState, useMemo } from "react";
import FilterListbox from "../../../components/filter/FilterListbox";
import {
  Users,
  CheckCircle,
  XCircle,
  PauseCircle,
  Clock,
} from "lucide-react";
import { ViewIcon } from "../../../components/icons/ActionIcons";
import { useNavigate, Navigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import Pagination from "../../../components/Pagination/pagination";
import {useAuth} from "../../../contexts/AuthContext";
import { KPICard } from "../../../components/kpi/KPI";
import FilterCard from "../../../components/ui/FilterCard";
import SearchInput from "../../../components/filter/Searchbar";
import GenericTable from "../../../components/Table/table";
import Button from "../../../components/Button/Button";
import StatusBadge from "../../../components/status/statusbadge";

const filterButtonClassName =
  "w-full cursor-default rounded-lg border border-gray-300 bg-white py-2.5 pl-4 pr-10 text-left text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20 focus:border-[#0A0082]";

/* ============================
   ADMIN APPROVAL DASHBOARD
   (Single API Optimized)
============================ */
export default function AdminApprovalDashboard() {
  const navigate = useNavigate();

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
        const res = await api.get(`${BASE_URL}/offer-approval/my-actions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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
  }, [BASE_URL, localStorage.getItem("token"), isAuthorizedManager]);
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

  const tableHeaders = [
    "Candidate Name",
    "Email",
    "Role",
    "Approval Status",
    "Requested By",
    "Action",
  ];
  const tableColumns = ["name", "email", "role", "status", "requestedBy", "action"];
  const tableRows = paginatedData.map((row) => ({
    name: `${row.first_name}${row.middle_name ? ` ${row.middle_name}` : ""} ${row.last_name}`,
    email: row.mail,
    role: row.designation,
    status: <StatusBadge label={getStatus(row)} size="sm" />,
    requestedBy: row.requested_by_name,
    action: (
      <Button
        variant="outline"
        size="small"
        onClick={() => navigate(`/employee-onboarding/admin/offer/${row.user_uuid}`)}
        aria-label="View offer"
        title="View offer"
      >
        <ViewIcon className="h-4 w-4" />
      </Button>
    ),
  }));

  return (
    <div className="px-6 pb-6 space-y-6">
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
      <FilterCard description="Narrow approval requests by candidate name, role, or status.">
        <div className="w-full md:w-80">
          <SearchInput
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by candidate name... or Role"
            className="h-[42px]"
          />
        </div>
        <div className="w-full sm:w-56">
          <FilterListbox
            buttonClassName={filterButtonClassName}
            options={[{value:"ALL",label:"All Status"},{value:"PENDING",label:"Pending"},{value:"APPROVED",label:"Approved"},{value:"REJECTED",label:"Rejected"},{value:"ON_HOLD",label:"On Hold"}]}
            value={statusFilter}
            onChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
          />
        </div>
      </FilterCard>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="w-full overflow-x-auto">
          <GenericTable
            headers={tableHeaders}
            rows={tableRows}
            columns={tableColumns}
            loading={loading}
          />
        </div>
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
