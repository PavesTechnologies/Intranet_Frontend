"use client";

import { useEffect, useState, useMemo } from "react";
import { FileEdit, Send, Users, ShieldCheck, XCircle, FileText, Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
// import Button from "../../components/Button/Button";
import EmpTable from "./components/EmpTable";
import axios from "axios";
import AdminApprovalDashboard from "./admin/AdminApprovalDashboard";
import {
  getNormalizedStatus,
  getOfferDisplayStatus,
} from "./components/offerStatus";
import { fetchOfferDetailsList } from "./components/fetchOfferDetails";


export default function EmployeeOnboardingDashboard() {
  const navigate = useNavigate();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeUserIds, setEmployeeUserIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

const { user } = useAuth();
const rawRoles = user?.roles || "";

const userRoles = useMemo(() => {
  return Array.isArray(rawRoles) 
    ? rawRoles 
    : typeof rawRoles === 'string' ? rawRoles.split(',').map(r => r.trim()) : [];
}, [rawRoles]);

const isHR = userRoles.includes("HR");
const isManager = userRoles.includes("Manager");
const isAdmin = userRoles.includes("Admin");

// Determine if the "Admin View" (Manager Portal) should even be an option
const hasApprovalPrivileges = isManager || isAdmin;

// State to control which view is currently active
const [viewRole, setViewRole] = useState(hasApprovalPrivileges && !isHR ? "ADMIN" : "HR");

  const handleKpiClick = (status) => {
    setStatusFilter(status);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");

    const fetchOffers = async () => {
      const detailedOffers = await fetchOfferDetailsList(
        import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL,
        token
      );

      setOffers(detailedOffers);
    };

    const fetchCoreEmployees = async () => {
      const res = await axios.get(
        `${import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setEmployeeUserIds((res.data || []).map((employee) => employee.user_uuid));
    };

    const fetchData = async () => {
      try {
        await Promise.all([fetchOffers(), fetchCoreEmployees()]);
      } catch (error) {
        console.error("Failed to fetch onboarding data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const acceptCount = offers.filter((o) => getNormalizedStatus(o.status) === "ACCEPTED").length;
  const sentCount = offers.filter((o) => getNormalizedStatus(o.status) === "OFFERED").length;
  const draftCount = offers.filter((o) => getNormalizedStatus(o.status) === "CREATED").length;
  const submittedCount = offers.filter((o) => getOfferDisplayStatus(o, employeeUserIds) === "SUBMITTED").length;
  const verifiedCount = offers.filter((o) => getOfferDisplayStatus(o, employeeUserIds) === "VERIFIED").length;
  const joiningCount = offers.filter((o) => getOfferDisplayStatus(o, employeeUserIds) === "JOINING").length;
  const joiningPendingCount = offers.filter((o) => getOfferDisplayStatus(o, employeeUserIds) === "JOINING_PENDING").length;
  const completedCount = offers.filter((o) => getOfferDisplayStatus(o, employeeUserIds) === "COMPLETED").length;
  const rejectedCount = offers.filter((o) => getOfferDisplayStatus(o, employeeUserIds) === "REJECTED").length;

  // ✅ Filter offers based on search term (case-insensitive)
  const filteredOffers = useMemo(() => {
    return offers.filter((offer) => {
      const fullName =
        `${offer.first_name || ""} ${offer.middle_name || ""} ${offer.last_name || ""}`.toLowerCase();
      const Role = `${offer.designation || ""}`.toLowerCase();

      const matchesName =
        fullName.includes(searchTerm.toLowerCase()) ||
        Role.includes(searchTerm.toLowerCase());
      const displayStatus = getOfferDisplayStatus(offer, employeeUserIds);
      const matchesStatus =
        statusFilter === "ALL" ||
        displayStatus === getNormalizedStatus(statusFilter);

      return matchesName && matchesStatus;
    });
  }, [offers, searchTerm, statusFilter, employeeUserIds]);

 return (
  <div className="p-1 space-y-6">
    {/* Header Section */}
    <div className="flex justify-between items-center px-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {viewRole === "HR" ? "Employee Onboarding" : "Manager Approval Portal"}
        </h1>
        <p className="text-gray-500">
          {viewRole === "HR" 
            ? "Manage offer letters and onboarding workflow" 
            : "Review and action pending offer letters"}
        </p>
      </div>

      {/* THE TOGGLE: Only shows if user has BOTH HR and (Manager or Admin) roles */}
      {isHR && hasApprovalPrivileges && (
        <div className="flex rounded-lg border border-gray-300 overflow-hidden shadow-sm">
          <button
            onClick={() => setViewRole("HR")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewRole === "HR" ? "bg-blue-700 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            HR View
          </button>
          <button
            onClick={() => setViewRole("ADMIN")}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              viewRole === "ADMIN" ? "bg-blue-700 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            Admin View
          </button>
        </div>
      )}
    </div>

    {/* CONTENT AREA */}
    {viewRole === "ADMIN" ? (
      /* This calls the Manager endpoint inside this component */
      <AdminApprovalDashboard /> 
    ) : (
      <>
        {/* STAT CARDS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-4">
           <StatCard title="Total Offers" value={offers.length} icon={Users} onClick={() => handleKpiClick("ALL")} />
           {/* ... Keep all your existing StatCards here ... */}
           <StatCard
              title="Sent Offers"
              value={sentCount}
              icon={Users}
              color="text-blue-600"
              onClick={() => handleKpiClick("OFFERED")}
            />
           <StatCard
              title="Rejected Offers"
              value={rejectedCount}
              icon={XCircle}
              color="text-red-600"
              onClick={() => handleKpiClick("REJECTED")}
            />
            <StatCard
              title="Accepted Offers"
              value={acceptCount}
              icon={Users}
              color="text-green-600"
              onClick={() => handleKpiClick("ACCEPTED")}
            />
            <StatCard
              title="Draft Offers"
              value={draftCount}
              icon={Users}
              color="text-blue-600"
              onClick={() => handleKpiClick("CREATED")}
            />
            <StatCard
              title="Submitted Offers"
              value={submittedCount}
              icon={Users}
              color="text-blue-600"
              onClick={() => handleKpiClick("SUBMITTED")}
            />
            <StatCard
              title="Verified Offers"
              value={verifiedCount}
              icon={Users}
              color="text-blue-600"
              onClick={() => handleKpiClick("VERIFIED")}
            />
            <StatCard
              title="Joining Offers"
              value={joiningCount}
              icon={Users}
              color="text-blue-600"
              onClick={() => handleKpiClick("JOINING")}
            />
            <StatCard
              title="Joining Pending Offers"
              value={joiningPendingCount}
              icon={Users}
              color="text-blue-600"
              onClick={() => handleKpiClick("JOINING_PENDING")}
            />
            <StatCard
              title="Completed Offers"
              value={completedCount}
              icon={Users}
              color="text-blue-600"
              onClick={() => handleKpiClick("COMPLETED")}
            />
        </div>

        {/* SEARCH & TABLE SECTION */}
        <div className="px-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <input
              type="text"
              placeholder="Search by candidate name... or Role"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full md:w-1/3 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {/* ... Keep your existing Status Select dropdown here ... */}
          </div>

          <EmpTable
            key={`${searchTerm}-${statusFilter}`}
            offers={filteredOffers}
            employeeUserIds={employeeUserIds}
            loading={loading}
            stage="HR_VIEW"
          />
        </div>
      </>
    )}
  </div>
);
}
/* Reusable Stat Card */
function StatCard({ title, value, icon: Icon, color = "text-gray-700", onClick }) {
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
