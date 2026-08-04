import React, { useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import CreateProjectModal from "./CreateProjectModal";
import Button from "../../../components/Button/Button";
import Pagination from "../../../components/Pagination/pagination";
import { showStatusToast } from "../../../components/toastfy/toast";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import {
  SuccessIcon,
  WarningIcon,
  ErrorIcon,
  CalendarIcon,
  TargetIcon,
  EmployeeIcon,
  LeaveIcon,
  AddIcon,
} from "../../../components/icons";
import LoadingSpinner from "../../../components/LoadingSpinner";
import FilterListbox from "../../../components/filter/FilterListbox";
import SearchInput from "../../../components/filter/Searchbar";
import StatusBadge from "../../../components/status/statusbadge";
import AppCard from "../../../components/Cards/AppCard";
import ProjectMenu from "../../../components/ProjectDashboard/ProjectMenu";
import ProjectDetailDrawer from "../../../components/ProjectDashboard/ProjectDetailDrawer";

// ------------------ MAIN COMPONENT ------------------
const ProjectDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [projectsPerPage] = useState(6);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [projectIdToDelete, setProjectIdToDelete] = useState(null);
  const [viewingProjectId, setViewingProjectId]   = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const userRole = user?.roles?.includes("Project_Manager")
    ? "MANAGER"
    : user?.roles?.includes("Admin")
      ? "ADMIN"
      : user?.roles?.includes("General")
        ? "GENERAL"
        : "EMPLOYEE";

  const canManageProjects = userRole === "MANAGER" || userRole === "ADMIN";
  const canmywork = userRole === "EMPLOYEE" || userRole === "GENERAL";
  const canSeeFinancials = userRole === "MANAGER" || userRole === "ADMIN";

  // ------------------- HELPERS -------------------
  const formatDate = (dateStr) => {
    if (!dateStr) return "TBD";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  const formatCurrency = (amount, currency) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  // ------------------- FETCH PROJECTS -------------------
  const fetchProjects = async (status) => {
    setLoading(true);
    try {
      const base = window.__APP_CONFIG__.PMS_BASE_URL;
      const headers = { Authorization: `Bearer ${token}` };

      let url = `${base}/api/projects/my-projects`;
      if (status && status !== "All") url += `?status=${status}`;

      const { data } = await api.get(url, { headers });
      setProjects(data);
    } catch (error) {
      console.error("❌ Failed to load projects", error);
      showStatusToast("Failed to load projects.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchProjects(filterStatus);
  }, [filterStatus]);

  // ------------------ DELETE PROJECT ------------------
  const handleDelete = (projectId) => {
    setProjectIdToDelete(projectId);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteProject = async () => {
    try {
      await api.delete(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectIdToDelete}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setProjects((prev) => prev.filter((p) => p.project.id !== projectIdToDelete));
      showStatusToast("Project deleted successfully!", "success");
    } catch (err) {
      console.error("❌ Delete failed", err);
      showStatusToast("Failed to delete project.", "error");
    } finally {
      setDeleteConfirmOpen(false);
      setProjectIdToDelete(null);
    }
  };

  // FIX: startEdit no longer builds formData — modal fetches its own data
  const startEdit = (p) => {
    setEditingProjectId(p.id);
    setIsCreateModalOpen(true);
  };

  // ------------------ SEARCH / FILTER ------------------
  const filteredProjects = projects.filter((item) => {
    const p = item.project;

    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectKey?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "All" ? true : p.status === filterStatus;

    let matchesRole = true;
    if (roleFilter === "OWNER") {
      matchesRole = item.canEdit && item.canDelete;
    } else if (roleFilter === "MEMBER") {
      matchesRole = item.canView && !item.canEdit;
    }

    return matchesSearch && matchesStatus && matchesRole;
  });

  const indexOfLast = currentPage * projectsPerPage;
  const indexOfFirst = indexOfLast - projectsPerPage;
  const currentProjects = filteredProjects.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredProjects.length / projectsPerPage);

  // ------------------ RENDER ------------------
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>

        <div className="flex gap-3">
          {canmywork && (
            <Button
              onClick={() => navigate("/my-work")}
              variant="secondary"
              size="medium"
              className="flex items-center gap-2"
            >
              <EmployeeIcon size={16} />
              My Work
            </Button>
          )}
          {canManageProjects && (
            <>
              <Button
                onClick={() => navigate("/my-work")}
                variant="secondary"
                size="medium"
                className="flex items-center gap-2"
              >
                <EmployeeIcon size={16} />
                My Work
              </Button>
              {/* <Button
                onClick={() => navigate(`/block-leave-dates/${user?.user_id}`)}
                variant="secondary"
                size="medium"
                className="flex items-center gap-2"
              >
                <LeaveIcon size={16} />
                Manage Leave Blocks
              </Button> */}

              <Button
                variant="primary"
                size="medium"
                className="flex items-center gap-2 bg-[#0a0a4a] hover:bg-[#1a1a5a]"
                onClick={() => {
                  setEditingProjectId(null);
                  setIsCreateModalOpen(true);
                }}
              >
                <AddIcon size={18} />
                Create Project
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PROJECT SECTION */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 shrink-0">All Projects</h2>
            <p className="text-sm text-gray-500 mt-1">Track and manage all your active and upcoming project portfolio.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 justify-end">
            <div className="w-full sm:w-64">
              <SearchInput
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or key"
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-40">
                <FilterListbox
                  options={[
                    { value: "All", label: "All Status" },
                    { value: "ACTIVE", label: "Active" },
                    { value: "PLANNING", label: "Planning" },
                    { value: "ARCHIVED", label: "Archived" },
                    { value: "COMPLETED", label: "Completed" },
                  ]}
                  value={filterStatus}
                  onChange={setFilterStatus}
                />
              </div>

              <div className="w-40">
                <FilterListbox
                  options={[
                    { value: "ALL", label: "All" },
                    { value: "OWNER", label: "Managed by me" },
                    { value: "MEMBER", label: "I am a member" },
                  ]}
                  value={roleFilter}
                  onChange={setRoleFilter}
                />
              </div>
            </div>
          </div>
        </div>

        {/* PROJECT LIST */}
        {loading ? (
          <LoadingSpinner text="Loading projects..." />
        ) : currentProjects.length === 0 ? (
          <p className="text-gray-600">No projects found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentProjects.map((item) => {
              const p = item.project;

              return (
                <AppCard
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="group hover:border-blue-300 !p-0"
                >
                  <div className="p-4 flex-1 min-w-0 flex flex-col relative">
                    {/* TOP BADGES & MENU */}
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex flex-wrap gap-2">
                        <span className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full border ${getStatusStyles(p.status)}`}>
                          {p.status?.replace(/_/g, " ") || "UNKNOWN"}
                        </span>
                        {p.riskLevel && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase rounded-full border ${p.riskLevel === "HIGH"
                                ? "bg-red-50 text-red-700 border-red-200"
                                : p.riskLevel === "MEDIUM"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-teal-50 text-teal-700 border-teal-200"
                              }`}
                          >
                            {p.riskLevel} Risk
                          </span>
                        )}
                      </div>

                      <div className="shrink-0 -mr-2 -mt-1">
                        <ProjectMenu
                          project={item}
                          canEdit={item.canEdit && item.canDelete}
                          onView={(proj) => setViewingProjectId(proj.id)}
                          onEdit={startEdit}
                          onDelete={handleDelete}
                        />
                      </div>
                    </div>

                    {/* TITLE & KEY */}
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-700 line-clamp-2 leading-tight mb-0.5 break-words">
                      {p.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mb-4">
                      {p.projectKey}
                    </p>

                    {/* MIDDLE INFO */}
                    <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 text-[11px] text-gray-600">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <TargetIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="capitalize truncate">
                          {p.currentStage?.toLowerCase()?.replace(/_/g, " ") || "Initiation"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <CalendarIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {formatDate(p.startDate)} - {formatDate(p.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                </AppCard>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          />
        )}
      </div>

      {/* MODALS */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingProjectId(null);
        }}
        editingProjectId={editingProjectId}
        onProjectCreated={(newProject) => {
          fetchProjects(filterStatus);
          // FIX: guard newProject?.id — edit mode calls this with no argument
          if (newProject?.id) {
            setSelectedProjectId(newProject.id);
            setIsStatusModalOpen(true);
          }
          setIsCreateModalOpen(false);
          setEditingProjectId(null);
        }}
      />

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        onConfirm={executeDeleteProject}
        onCancel={() => { setDeleteConfirmOpen(false); setProjectIdToDelete(null); }}
        confirmText="Delete"
        variant="danger"
      />

      {/* PROJECT DETAIL DRAWER */}
      {viewingProjectId && (
        <ProjectDetailDrawer
          projectId={viewingProjectId}
          onClose={() => setViewingProjectId(null)}
          navigate={navigate}
          getStatusStyles={getStatusStyles}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          canSeeFinancials={canSeeFinancials}
        />
      )}
    </div>
  );
};

export default ProjectDashboard;
