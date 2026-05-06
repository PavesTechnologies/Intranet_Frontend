import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Pencil,
  Filter,
  Calendar,
  Target,
} from "lucide-react";
import { toast } from "react-toastify";
import { getProjects, getProjectKPIs } from "../../services/projectService";
import ProjectKPIs from "../../components/ProjectKPIs";
import Pagination from "../../../../components/Pagination/pagination";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import UpdateProjectStatusModal from "../../models/UpdateProjectStatusModal";
import { formatCurrency } from "../../services/clientservice";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";

const RMSProjectList = () => {
  const { getEnumValues } = useEnums();
  const READINESS_STATUSES = getEnumValues("StaffingReadinessStatus");
  const PROJECT_STATUSES = getEnumValues("ProjectStatus");
  const RISK_LEVELS = getEnumValues("RiskLevel");

  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const size = 6;
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState({
    readinessStatus: "",
    projectStatus: "",
    riskLevel: "",
  });
  const [openMenuId, setOpenMenuId] = useState(null);
  const [statusUpdateModal, setStatusUpdateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const menuRef = useRef(null);

  const [kpiStats, setKpiStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    highRisk: 0,
    avgUtilization: "0%",
  });

  const fetchKPIs = async () => {
    try {
      const res = await getProjectKPIs();
      if (res?.data) {
        const data = res.data;
        let util = data.avgResourceUtil ?? data.avgUtilization ?? 0;

        if (typeof util === 'number') {
          util = `${Math.round(util)}%`;
        } else if (typeof util === 'string') {
          const parsed = parseFloat(util);
          if (!isNaN(parsed)) {
            util = `${Math.round(parsed)}%`;
          } else {
            util = util.includes('%') ? util : `${util}%`;
          }
        }

        setKpiStats({
          totalProjects: data.totalProjects || 0,
          activeProjects: data.activeProjects || 0,
          highRisk: data.highRiskProjects ?? data.highRisk ?? 0,
          avgUtilization: util,
        });
      }
    } catch (err) {
      console.error("Failed to fetch KPIs", err);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, []);

  // debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchProjects();
  }, [page, debouncedSearch, filters]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest("[data-menu-root]")) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await getProjects({
        page,
        size,
        search: debouncedSearch,
        filters,
      });

      setProjects(res.data.content || []);
      setTotalPages(res.data.totalPages || 0);
    } catch (err) {
      console.error("Failed to load projects", err);
      const message = err.response?.data?.message || "Failed to load projects";
      setErrorMsg(message);
      setProjects([]);
      setTotalPages(0);

      // Only show toast if it's a real error, not just "no projects found"
      if (err.response?.status !== 400 || !message.includes("No Projects Found")) {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  // const appliedFiltersCount = Object.values(filters).filter(Boolean).length;

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "APPROVED":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ARCHIVED":
        return "bg-slate-50 text-slate-700 border-slate-200";
      case "PLANNING":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "COMPLETED":
        return "bg-gray-50 text-gray-700 border-gray-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  // if (loading)
  //   return (
  //     <div className="flex justify-center items-center h-screen">
  //       <LoadingSpinner text="Loading projects..." />
  //     </div>
  //   );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#081534]">
            Resource Project Management
          </h1>
          <p className="text-sm text-gray-500">Live PMS Integration</p>
        </div>

        {/* <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Filters Applied:
          </span>
          <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
            {appliedFiltersCount}
          </span>
        </div> */}
      </div>

      <ProjectKPIs stats={kpiStats} />

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row flex-wrap gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search project / client..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[160px] cursor-pointer text-gray-700 hover:border-gray-300 transition-colors"
            value={filters.readinessStatus}
            onChange={(e) =>
              handleFilterChange("readinessStatus", e.target.value)
            }
          >
            <option value="">All Readiness</option>
            {READINESS_STATUSES.map((val) => (
              <option key={val} value={val}>
                {val.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          <select
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[140px] cursor-pointer text-gray-700 hover:border-gray-300 transition-colors"
            value={filters.projectStatus}
            onChange={(e) => handleFilterChange("projectStatus", e.target.value)}
          >
            <option value="">All Status</option>
            {PROJECT_STATUSES.map((val) => (
              <option key={val} value={val}>
                {val.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>

          <select
            className="border border-gray-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-w-[140px] cursor-pointer text-gray-700 hover:border-gray-300 transition-colors"
            value={filters.riskLevel}
            onChange={(e) => handleFilterChange("riskLevel", e.target.value)}
          >
            <option value="">All Risk</option>
            {RISK_LEVELS.map((val) => (
              <option key={val} value={val}>
                {val.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* PROJECTS */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner text="Loading Projects..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length > 0 ? (
            projects.map((project) => (
              <div
                key={project.projectId}
                onClick={() =>
                  navigate(`/resource-management/projects/${project.projectId}`)
                }
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full overflow-hidden"
              >
                <div className="p-4 flex-1 min-w-0 flex flex-col">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full border ${getStatusStyles(project.projectStatus)}`}>
                        {project.projectStatus?.replace(/_/g, ' ') || 'UNKNOWN'}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full border ${project.riskLevel === "HIGH"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : project.riskLevel === "MEDIUM"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-teal-50 text-teal-700 border-teal-200"
                          }`}
                      >
                        {project.riskLevel} Risk
                      </span>

                      {/* 🔴 OVERLAP WARNING ICON */}
                      {project.hasOverlap && (
                        <div className="flex items-center gap-1 bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          <AlertTriangle className="h-3 w-3" />
                          Overlap
                        </div>
                      )}
                    </div>

                    <div className="relative shrink-0" data-menu-root>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project.projectId ? null : project.projectId);
                        }}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>

                      {openMenuId === project.projectId && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setSelectedProject(project.projectId);
                              setStatusUpdateModal(true);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                          >
                            <Pencil size={12} />
                            Update Status
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 text-base group-hover:text-blue-700 line-clamp-2 leading-tight mb-1 break-words">
                    {project.projectName}
                  </h3>
                  <p className="text-xs text-gray-500 truncate mb-4">{project.clientName}</p>

                  <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 text-xs text-gray-600">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Target className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      <span className="capitalize truncate">{project.lifecycleStage?.toLowerCase() || 'Initiation'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{formatDate(project.startDate)} - {formatDate(project.endDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-2 text-xs">
                  <div className="flex items-center gap-1.5 font-medium">
                    {project.readinessStatus === "READY" && (
                      <><CheckCircle2 className="h-4 w-4 text-emerald-600" /><span className="text-emerald-700">Staffing</span></>
                    )}
                    {project.readinessStatus === "NOT_READY" && (
                      <><XCircle className="h-4 w-4 text-red-600" /><span className="text-red-700">Staffing</span></>
                    )}
                    {project.readinessStatus === "UPCOMING" && (
                      <><AlertTriangle className="h-4 w-4 text-amber-500" /><span className="text-amber-600">Staffing Upcoming</span></>
                    )}
                  </div>
                  <div className="font-bold text-gray-800">
                    USD {formatCurrency(project.projectBudget)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 bg-white rounded-lg border border-dashed border-gray-300">
              {errorMsg ? (
                <>
                  {/* <div className="p-4 bg-amber-50 rounded-full mb-4">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div> */}
                  <p className="text-gray-600 font-medium text-lg">{errorMsg}</p>
                  <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or search criteria.</p>
                </>
              ) : (
                <p className="text-gray-500">No projects available.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* PAGINATION */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page + 1}
          totalPages={totalPages}
          onPrevious={() => setPage((p) => Math.max(p - 1, 0))}
          onNext={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
        />
      )}

      <UpdateProjectStatusModal
        open={statusUpdateModal}
        onClose={() => setStatusUpdateModal(false)}
        pmsProjectId={selectedProject}
        onSuccess={() => fetchProjects()}
      />
    </div>
  );
};

export default RMSProjectList;