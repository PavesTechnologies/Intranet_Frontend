"use client";

import { useEffect, useState, useMemo } from "react";
import { FileEdit, Send, Users, ShieldCheck, XCircle, FileText, Handshake, RefreshCw, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/Button/Button";
import EmpTable from "./components/EmpTable";
import api from "../../api/axiosInstance";
import AdminApprovalDashboard from "./admin/AdminApprovalDashboard";
import {
  getNormalizedStatus,
  getOfferDisplayStatus,
} from "./components/offerStatus";
import { fetchOfferDetailsList } from "./components/fetchOfferDetails";
import { PageCard } from "../../components/Cards/PageCard";
import PageHeader from "../../components/ui/PageHeader";
import GroupedKPISection from "./components/GroupedKPISection";

const CATEGORY_GROUPS = [
  {
    key: "OfferManagement",
    title: "Offer Management",
    statusDefs: [
      { status: "CREATED",  label: "Draft",          icon: FileEdit,  iconBg: "bg-slate-100",   iconColor: "text-slate-600"  },
      { status: "OFFERED",  label: "Sent",           icon: Send,      iconBg: "bg-indigo-50",   iconColor: "text-indigo-600" },
      { status: "ACCEPTED", label: "Accepted",       icon: Users,     iconBg: "bg-emerald-50",  iconColor: "text-emerald-600"},
      { status: "REJECTED", label: "Rejected",       icon: XCircle,   iconBg: "bg-red-50",      iconColor: "text-red-600"    },
    ],
  },
  {
    key: "EmployeeOnboarding",
    title: "Employee Onboarding",
    statusDefs: [
      { status: "SUBMITTED", label: "Submitted", icon: FileText,   iconBg: "bg-blue-50",    iconColor: "text-blue-600"   },
      { status: "VERIFIED",  label: "Verified",  icon: ShieldCheck, iconBg: "bg-green-50",  iconColor: "text-green-600"  },
      { status: "COMPLETED", label: "Completed", icon: ShieldCheck, iconBg: "bg-emerald-50",iconColor: "text-emerald-600"},
    ],
  },
  {
    key: "JoiningProcess",
    title: "Joining Process",
    statusDefs: [
      { status: "JOINING",         label: "Joining",         icon: Handshake,  iconBg: "bg-teal-50",   iconColor: "text-teal-600"   },
      { status: "JOINING_PENDING", label: "Joining Pending", icon: Handshake,  iconBg: "bg-amber-50",  iconColor: "text-amber-600"  },
      { status: "RESCHEDULED",     label: "Rescheduled",     icon: RefreshCw,  iconBg: "bg-orange-50", iconColor: "text-orange-600" },
    ],
  },
];



export default function EmployeeOnboardingDashboard() {
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

    const fetchOffers = async () => {
      const detailedOffers = await fetchOfferDetailsList(
        window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL,

        localStorage.getItem("token"),
      );

      setOffers(detailedOffers);
    };

    const fetchCoreEmployees = async () => {
      const res = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
        {
          headers: { Authorization: `Bearer ${ localStorage.getItem("token")}` },
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

  const categoryData = useMemo(() => {
    const getStatus = (o) => getOfferDisplayStatus(o, employeeUserIds);
    return CATEGORY_GROUPS.map((group) => ({
      key: group.key,
      title: group.title,
      cards: group.statusDefs.map((def) => ({
        status:    def.status,
        label:     def.label,
        count:     offers.filter((o) => getStatus(o) === def.status).length,
        icon:      def.icon,
        iconBg:    def.iconBg,
        iconColor: def.iconColor,
      })),
    }));
  }, [offers, employeeUserIds]);

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
    <div className="min-h-screen bg-slate-50/50 p-6 space-y-4 font-sans transition-colors duration-300">
      {/* Header Section */}
      <PageHeader
        title={viewRole === "HR" ? "Employee Onboarding" : "Manager Approval Portal"}
        subtitle={
          viewRole === "HR"
            ? "Manage offer letters and onboarding workflow"
            : "Review and action pending offer letters"
        }
        actions={
          /* THE TOGGLE: Only shows if user has BOTH HR and (Manager or Admin) roles */
          isHR && hasApprovalPrivileges ? (
            <div className="flex bg-slate-200/50 p-1 rounded-xl shadow-sm border border-slate-200/50">
              <Button
                onClick={() => setViewRole("HR")}
                variant={viewRole === "HR" ? "outline" : "ghost"}
                size="medium"
                className={`${viewRole === "HR" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200 border-slate-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent shadow-none"
                  }`}
              >
                HR View
              </Button>
              <Button
                onClick={() => setViewRole("ADMIN")}
                variant={viewRole === "ADMIN" ? "outline" : "ghost"}
                size="medium"
                className={`${viewRole === "ADMIN" ? "bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200 border-slate-200" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border-transparent shadow-none"
                  }`}
              >
                Admin View
              </Button>
            </div>
          ) : null
        }
      />

      {/* CONTENT AREA */}
      {viewRole === "ADMIN" ? (
        /* This calls the Manager endpoint inside this component */
        <AdminApprovalDashboard />
      ) : (
        <div className="space-y-8">
          {/* GROUPED KPI SECTION */}
          <GroupedKPISection
            groups={categoryData}
            statusFilter={statusFilter}
            onStatusClick={handleKpiClick}
          />

          {/* SEARCH & TABLE SECTION */}
          <PageCard className="overflow-hidden rounded-2xl border-slate-200">
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
                <Button
                  onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); }}
                  variant="link"
                  size="small"
                  className="text-slate-600 hover:text-indigo-600"
                >
                  Clear Filters
                </Button>
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
                <Button
                  onClick={() => { setSearchTerm(""); setStatusFilter("ALL"); }}
                  variant="primary"
                  size="medium"
                >
                  Reset Filters
                </Button>
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
          </PageCard>
        </div>
      )}
    </div>
  );
}

