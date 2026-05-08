import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import CreateProjectModal from "./CreateProjectModal";
import Button from "../../../components/Button/Button";
import Pagination from "../../../components/Pagination/pagination";
import { showStatusToast } from "../../../components/toastfy/toast";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import {
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Calendar,
  Target,
} from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import FilterListbox from "../../../components/filter/FilterListbox";
import SearchInput from "../../../components/filter/Searchbar";
import StatusBadge from "../../../components/status/statusbadge";

// -------------------- 3 DOTS MENU --------------------
const ProjectMenu = ({ project, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute top-3 right-3">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="p-1 rounded-full hover:bg-gray-100"
      >
        <MoreVertical className="h-5 w-5 text-gray-600" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(project.project);
              setOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Edit
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project.project.id);
              setOpen(false);
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

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

  const { user } = useAuth();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const userRole = user?.roles?.includes("Project_Manager")
    ? "MANAGER"
    : user?.roles?.includes("Admin")
      ? "ADMIN"
      : "EMPLOYEE";

  const canManageProjects = userRole === "MANAGER" || userRole === "ADMIN";
  const canmywork = userRole === "EMPLOYEE";

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

      const { data } = await axios.get(url, { headers });
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
      await axios.delete(
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
            >
                My Work
              </Button>
          )}
          {canManageProjects && (
            <>

                <Button
                onClick={() => navigate("/my-work")}
                variant="secondary"
                size="medium"
              >
                My Work
              </Button>
              <Button
                onClick={() => navigate(`/block-leave-dates/${user?.user_id}`)}
                variant="secondary"
                size="medium"
              >
                Manage Leave Blocks
              </Button>

              <Button
                variant="primary"
                size="medium"
                onClick={() => {
                  setEditingProjectId(null);
                  setIsCreateModalOpen(true);
                }}
              >
                + Create Project
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PROJECT SECTION */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-4">All Projects</h2>

        {/* SEARCH + FILTER */}
        <div className="flex justify-between items-center mb-6">
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or key"
            className="w-64"
          />

          <div className="flex items-center gap-3">
            <div className="w-40">
              <FilterListbox
                options={[
                  { value: "All", label: "All" },
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
                <div
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group flex flex-col h-full overflow-hidden"
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

                      {item.canEdit && item.canDelete ? (
                        <div className="shrink-0">
                          <ProjectMenu
                            project={item}
                            onEdit={startEdit}
                            onDelete={handleDelete}
                          />
                        </div>
                      ) : (
                        <div className="shrink-0 opacity-40 cursor-not-allowed">
                          <MoreVertical className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* TITLE & KEY */}
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-700 line-clamp-2 leading-tight mb-0.5 break-words">
                      {p.name}
                    </h3>
                    <p className="text-xs text-gray-500 truncate mb-4">
                      {p.projectKey}
                    </p>

                    {/* DESCRIPTION (OPTIONAL, BUT GOOD FOR DASHBOARD) */}
                    {/* {p.description && (
                      <p className="text-gray-600 text-xs line-clamp-2 mb-4">
                        {p.description}
                      </p>
                    )} */}

                    {/* MIDDLE INFO */}
                    <div className="mt-auto grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-3 text-[11px] text-gray-600">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Target className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="capitalize truncate">
                          {p.currentStage?.toLowerCase()?.replace(/_/g, " ") || "Initiation"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {formatDate(p.startDate)} - {formatDate(p.endDate)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex justify-between items-center gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700">Staffing</span>
                    </div>
                    <div className="font-bold text-gray-800">
                      {formatCurrency(p.projectBudget, p.projectBudgetCurrency)}
                    </div>
                  </div>
                </div>
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

    </div>
  );
};

export default ProjectDashboard;
