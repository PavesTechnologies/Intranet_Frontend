import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import CreateProjectModal from "./CreateProjectModal";
import Button from "../../../components/Button/Button";
import Pagination from "../../../components/Pagination/pagination";
import { showStatusToast } from "../../../components/toastfy/toast";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { MoreVertical } from "lucide-react";
import LoadingSpinner from "../../../components/LoadingSpinner";
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
  const canmywork= userRole === "EMPLOYEE";


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
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border w-40 h-10 px-3 py-2 rounded-xl"
            >
              <option value="All">All</option>
              <option value="ACTIVE">Active</option>
              <option value="PLANNING">Planning</option>
              <option value="ARCHIVED">Archived</option>
              <option value="COMPLETED">Completed</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="border w-40 h-10 px-3 py-2 rounded-xl"
            >
              <option value="ALL">All</option>
              <option value="OWNER">Managed by me</option>
              <option value="MEMBER">I am a member</option>
            </select>
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
                  className="relative bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100 flex flex-col justify-between"
                >
                  {item.canEdit && item.canDelete ? (
                    <ProjectMenu
                      project={item}
                      onEdit={startEdit}
                      onDelete={handleDelete}
                    />
                  ) : (
                    <div className="absolute top-3 right-3 opacity-40 cursor-not-allowed">
                      <MoreVertical className="h-5 w-5 text-gray-400" />
                    </div>
                  )}

                  <h3 className="text-xl font-semibold text-indigo-700 mb-1">
                    {p.name}
                  </h3>

                  <p className="text-sm text-gray-500 mb-3">
                    Key: {p.projectKey}
                  </p>

                  <p className="text-gray-700 text-sm line-clamp-3">
                    {p.description || "No description available."}
                  </p>

                  <div className="mt-4 flex justify-between items-center">
                    <StatusBadge label={p.status} size="sm" />
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
