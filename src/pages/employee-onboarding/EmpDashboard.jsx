"use client";

import { useEffect, useState, useMemo } from "react";
import { FileEdit, Send, Users, ShieldCheck, XCircle, FileText, Handshake, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useLocation } from "react-router-dom";
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
  const isManager = userRoles.includes("Reporting_Manager");
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
        window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL,
        token,
      );

      setOffers(detailedOffers);
    };

    const fetchCoreEmployees = async () => {
      const res = await axios.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      setEmployeeUserIds(
        (res.data || []).map((employee) => employee.user_uuid),
      );
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

  const acceptCount = offers.filter(
    (o) => getNormalizedStatus(o.status) === "ACCEPTED",
  ).length;
  const sentCount = offers.filter(
    (o) => getNormalizedStatus(o.status) === "OFFERED",
  ).length;
  const draftCount = offers.filter(
    (o) => getNormalizedStatus(o.status) === "CREATED",
  ).length;
  const submittedCount = offers.filter(
    (o) => getOfferDisplayStatus(o, employeeUserIds) === "SUBMITTED",
  ).length;
  const verifiedCount = offers.filter(
    (o) => getOfferDisplayStatus(o, employeeUserIds) === "VERIFIED",
  ).length;
  const joiningCount = offers.filter(
    (o) => getOfferDisplayStatus(o, employeeUserIds) === "JOINING",
  ).length;
  const joiningPendingCount = offers.filter(
    (o) => getOfferDisplayStatus(o, employeeUserIds) === "JOINING_PENDING",
  ).length;
  const completedCount = offers.filter(
    (o) => getOfferDisplayStatus(o, employeeUserIds) === "COMPLETED",
  ).length;
  const rejectedCount = offers.filter(
    (o) => getOfferDisplayStatus(o, employeeUserIds) === "REJECTED",
  ).length;

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

  const hasActiveFilters = searchTerm !== "" || statusFilter !== "ALL";

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-8 font-sans transition-colors duration-300">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 px-2">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {viewRole === "HR" ? "Employee Onboarding" : "Manager Approval Portal"}
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            {viewRole === "HR"
              ? "Manage offer letters and onboarding workflow"
              : "Review and action pending offer letters"}
          </p>
        </div>

        {/* THE TOGGLE: Only shows if user has BOTH HR and (Manager or Admin) roles */}
        {isHR && hasApprovalPrivileges && (
          <div className="flex bg-slate-200/50 p-1 rounded-xl shadow-sm border border-slate-200/50">
            <button
              onClick={() => setViewRole("HR")}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${viewRole === "HR" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
            >
              HR View
            </button>
            <button
              onClick={() => setViewRole("ADMIN")}
              className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${viewRole === "ADMIN" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
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
        <div className="space-y-8">
          {/* STAT CARDS SECTION */}
          <div className="flex flex-wrap gap-3">
            <StatCard
              title="Total"
              value={offers.length}
              icon={Users}
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              isActive={statusFilter === "ALL"}
              onClick={() => handleKpiClick("ALL")}
            />
            <StatCard
              title="Draft"
              value={draftCount}
              icon={FileEdit}
              iconBg="bg-slate-100"
              iconColor="text-slate-600"
              isActive={statusFilter === "CREATED"}
              onClick={() => handleKpiClick("CREATED")}
            />
            <StatCard
              title="Sent"
              value={sentCount}
              icon={Send}
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
              isActive={statusFilter === "OFFERED"}
              onClick={() => handleKpiClick("OFFERED")}
            />
            <StatCard
              title="Accepted"
              value={acceptCount}
              icon={Users}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              isActive={statusFilter === "ACCEPTED"}
              onClick={() => handleKpiClick("ACCEPTED")}
            />
            <StatCard
              title="Rejected"
              value={rejectedCount}
              icon={XCircle}
              iconBg="bg-red-50"
              iconColor="text-red-600"
              isActive={statusFilter === "REJECTED"}
              onClick={() => handleKpiClick("REJECTED")}
            />
            {/* Additional KPIs */}
            <StatCard
              title="Submitted"
              value={submittedCount}
              icon={FileText}
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
              isActive={statusFilter === "SUBMITTED"}
              onClick={() => handleKpiClick("SUBMITTED")}
            />
            <StatCard
              title="Verified"
              value={verifiedCount}
              icon={ShieldCheck}
              iconBg="bg-green-50"
              iconColor="text-green-600"
              isActive={statusFilter === "VERIFIED"}
              onClick={() => handleKpiClick("VERIFIED")}
            />
            <StatCard
              title="Joining Pending"
              value={joiningPendingCount}
              icon={Handshake}
              iconBg="bg-amber-50"
              iconColor="text-amber-600"
              isActive={statusFilter === "JOINING_PENDING"}
              onClick={() => handleKpiClick("JOINING_PENDING")}
            />
            <StatCard
              title="Joining"
              value={joiningCount}
              icon={Handshake}
              iconBg="bg-teal-50"
              iconColor="text-teal-600"
              isActive={statusFilter === "JOINING"}
              onClick={() => handleKpiClick("JOINING")}
            />
            <StatCard
              title="Completed"
              value={completedCount}
              icon={ShieldCheck}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
              isActive={statusFilter === "COMPLETED"}
              onClick={() => handleKpiClick("COMPLETED")}
            />
          </div>

          {/* SEARCH & TABLE SECTION */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="bg-slate-50/50 border-b border-slate-200 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by candidate name... or Role"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 text-slate-900 text-sm rounded-xl shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              {/* Optional Reset Filters Button */}
              {hasActiveFilters && (
                <button
                  onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); }}
                  className="text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Table Content */}
            {!loading && filteredOffers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">No offers found</h3>
                <p className="text-slate-500 text-sm mb-6 max-w-sm">
                  We couldn't find any offers matching your current search and filters.
                </p>
                <button
                  onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); }}
                  className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-all hover:-translate-y-0.5 shadow-sm"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <EmpTable
                key={`${searchTerm}-${statusFilter}`}
                offers={filteredOffers}
                employeeUserIds={employeeUserIds}
                loading={loading}
                stage="HR_VIEW"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* Reusable Stat Card */
function StatCard({ title, value, icon: Icon, iconBg, iconColor, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white shrink-0 min-w-[140px] flex-1 rounded-xl px-4 py-3 border shadow-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer flex items-center gap-3 ${isActive
          ? "border-indigo-500 ring-1 ring-indigo-500/20 shadow-md bg-indigo-50/10"
          : "border-slate-200 hover:border-slate-300 hover:shadow-md"
        }`}
    >
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5 truncate">{title}</p>
        <p className="text-lg font-bold text-slate-900 leading-none">{value}</p>
      </div>
    </div>
  );
}
