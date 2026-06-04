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
  EditIcon,
  DeleteIcon,
  EmployeeIcon,
  LeaveIcon,
  AddIcon,
  ViewIcon,
} from "../../../components/icons";
import LoadingSpinner from "../../../components/LoadingSpinner";
import FilterListbox from "../../../components/filter/FilterListbox";
import SearchInput from "../../../components/filter/Searchbar";
import StatusBadge from "../../../components/status/statusbadge";
import AppCard from "../../../components/Cards/AppCard";


// -------------------- INLINE ICON ACTIONS --------------------
const ProjectMenu = ({ project, onView, onEdit, onDelete, canEdit }) => (
  <div className="flex items-center gap-1">
    <button
      title="View Details"
      onClick={(e) => { e.stopPropagation(); onView(project.project); }}
      className="p-1 rounded hover:bg-indigo-50 transition-colors"
    >
      <ViewIcon size={15} className="text-indigo-500" />
    </button>

    {canEdit && (
      <>
        <button
          title="Edit"
          onClick={(e) => { e.stopPropagation(); onEdit(project.project); }}
          className="p-1 rounded hover:bg-blue-50 transition-colors"
        >
          <EditIcon size={15} className="text-blue-500" />
        </button>
        <button
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(project.project.id); }}
          className="p-1 rounded hover:bg-red-50 transition-colors"
        >
          <DeleteIcon size={15} className="text-red-500" />
        </button>
      </>
    )}
  </div>
);

// -------------------- PROJECT DETAIL DRAWER --------------------
const DetailRow = ({ label, value }) => (
  value ? (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-slate-700 break-words">{value}</span>
    </div>
  ) : null
);

// helpers for the drawer
const getInitials = (name) => {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
];
const avatarColor = (str) => AVATAR_COLORS[(str?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];

const ROLE_COLORS = {
  indigo:  "bg-indigo-50 text-indigo-700 border border-indigo-200",
  violet:  "bg-violet-50 text-violet-700 border border-violet-200",
  blue:    "bg-blue-50 text-blue-700 border border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  default: "bg-slate-100 text-slate-500 border border-slate-200",
};

const PersonRow = ({ role, name, email, subtitle, roleColor }) => {
  if (!name) return null;
  const badgeCls = ROLE_COLORS[roleColor] ?? ROLE_COLORS.default;
  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(name)}`}>
        {getInitials(name)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
        <p className="text-xs text-slate-400 truncate">{email || subtitle || ""}</p>
      </div>
      {role && (
        <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${badgeCls}`}>
          {role}
        </span>
      )}
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{children}</p>
);

const ProjectDetailDrawer = ({ projectId, onClose, navigate, getStatusStyles, formatDate, formatCurrency, canSeeFinancials }) => {
  const [detail,  setDetail]  = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    const token   = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    const base    = window.__APP_CONFIG__.PMS_BASE_URL;

    Promise.all([
      api.get(`${base}/api/projects/${projectId}`,                    { headers }),
      api.get(`${base}/api/projects/${projectId}/members-with-owner`, { headers }),
    ])
      .then(([projRes, membersRes]) => {
        setDetail(projRes.data);
        setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      })
      .catch(() => showStatusToast("Failed to load project details.", "error"))
      .finally(() => setLoading(false));
  }, [projectId]);

  const p = detail;

  // look up a member object by numeric ID (covers both id and userId fields)
  const findMember = (id) =>
    id ? members.find((m) => m.id === id || m.userId === id) : null;

  // resolve display name from a member object or a nested person object
  const resolveName = (obj) =>
    obj?.name ?? (obj?.firstName ? `${obj.firstName} ${obj.lastName ?? ""}`.trim() : null);

  // prefer nested objects (full API), fall back to ID-based member lookup
  const pmObj           = p?.projectManager ?? p?.owner ?? p?.projectOwner ?? findMember(p?.ownerId);
  const projectManager  = resolveName(pmObj);
  const pmEmail         = pmObj?.email;

  const rmObj           = p?.resourceManager ?? p?.rm ?? findMember(p?.rmId);
  const resourceManager = resolveName(rmObj);
  const rmEmail         = rmObj?.email;

  const doObj           = p?.deliveryOwner ?? p?.deliveryManager ?? findMember(p?.deliveryOwnerId);
  const deliveryOwner   = resolveName(doObj);
  const doEmail         = doObj?.email;

  const clientName      = p?.client?.clientName ?? p?.clientName ?? p?.client?.name;
  const clientEmail     = p?.client?.email ?? p?.clientEmail;

  // exclude key-role people from the generic team members list
  const keyIds = new Set([
    p?.ownerId, p?.rmId, p?.deliveryOwnerId,
    pmObj?.id, pmObj?.userId,
    rmObj?.id, rmObj?.userId,
    doObj?.id, doObj?.userId,
  ].filter(Boolean));

  const teamMembers = members.filter((m) => !keyIds.has(m.id) && !keyIds.has(m.userId));

  const CloseIcon = () => (
    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Project Details</h2>
            {p && <p className="text-xs text-slate-400 font-mono mt-0.5">{p.projectKey}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5"><LoadingSpinner text="Loading details..." /></div>
          ) : !p ? (
            <p className="p-5 text-sm text-slate-400">No data available.</p>
          ) : (
            <div className="divide-y divide-slate-100">

              {/* ── Identity ── */}
              <div className="px-5 py-4 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{p.name}</h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.status && (
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full border ${getStatusStyles(p.status)}`}>
                      {p.status.replace(/_/g, " ")}
                    </span>
                  )}
                  {p.riskLevel && (
                    <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full border ${
                      p.riskLevel === "HIGH"   ? "bg-red-50 text-red-700 border-red-200" :
                      p.riskLevel === "MEDIUM" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                                "bg-teal-50 text-teal-700 border-teal-200"}`}>
                      {p.riskLevel} Risk
                    </span>
                  )}
                  {(p.priority ?? p.priorityLevel) && (
                    <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full border bg-violet-50 text-violet-700 border-violet-200">
                      {p.priority ?? p.priorityLevel}
                    </span>
                  )}
                </div>
                {p.description && (
                  <p className="text-sm text-slate-500 leading-relaxed whitespace-pre-wrap">{p.description}</p>
                )}
              </div>

              {/* ── Timeline & Delivery ── */}
              <div className="px-5 py-4">
                <SectionTitle>Timeline & Delivery</SectionTitle>
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
                  <DetailRow label="Start Date"   value={formatDate(p.startDate)} />
                  <DetailRow label="End Date"     value={formatDate(p.endDate)} />
                  <DetailRow label="Stage"        value={p.currentStage?.replace(/_/g, " ")} />
                  <DetailRow label="Methodology"  value={p.deliveryModel ?? p.methodology} />
                  <DetailRow label="Location"     value={p.primaryLocation} />
                  <DetailRow label="Created"      value={formatDate(p.createdAt)} />
                </div>
              </div>

              {/* ── Team Members ── */}
              {(members.length > 0 || projectManager || deliveryOwner || resourceManager) && (
                <div className="px-5 py-4">
                  <SectionTitle>Team Members</SectionTitle>
                  <div className="mt-1">
                    <PersonRow role="Project Manager"  name={projectManager}  email={pmEmail} roleColor="indigo" />
                    <PersonRow role="Delivery Owner"   name={deliveryOwner}   email={doEmail} roleColor="violet" />
                    <PersonRow role="Resource Manager" name={resourceManager} email={rmEmail} roleColor="blue" />
                    {members.filter((m) => !keyIds.has(m.id) && !keyIds.has(m.userId)).map((m, i) => {
                      const name = resolveName(m) ?? m.email ?? `Member ${i + 1}`;
                      const role = m.role ?? m.designation ?? m.projectRole ?? m.memberRole;
                      return <PersonRow key={m.id ?? m.userId ?? i} name={name} email={m.email} role={role} />;
                    })}
                  </div>
                </div>
              )}

              {/* ── Client Details ── */}
              {(clientName || p.organizationName || clientEmail) && (
                <div className="px-5 py-4">
                  <SectionTitle>Client</SectionTitle>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
                    <DetailRow label="Client Name"   value={clientName} />
                    <DetailRow label="Organization"  value={p.organizationName} />
                    <DetailRow label="Client Email"  value={clientEmail} />
                  </div>
                </div>
              )}

              {/* ── Budget (managers only) ── */}
              {canSeeFinancials && (p.projectBudget != null || p.projectBudgetCurrency) && (
                <div className="px-5 py-4">
                  <SectionTitle>Budget</SectionTitle>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
                    <DetailRow label="Amount"      value={formatCurrency(p.projectBudget, p.projectBudgetCurrency)} />
                    <DetailRow label="Currency"    value={p.projectBudgetCurrency} />
                    <DetailRow label="Budget Type" value={p.projectBudgetType} />
                  </div>
                </div>
              )}

              {/* ── Tags ── */}
              {p.tags?.length > 0 && (
                <div className="px-5 py-4">
                  <SectionTitle>Tags</SectionTitle>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {p.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer */}
        {p && (
          <div className="px-5 py-4 border-t border-slate-200 shrink-0">
            <button
              onClick={() => { navigate(`/projects/${p.id}`); onClose(); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
            >
              Open Project
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </>
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
              <Button
                onClick={() => navigate(`/block-leave-dates/${user?.user_id}`)}
                variant="secondary"
                size="medium"
                className="flex items-center gap-2"
              >
                <LeaveIcon size={16} />
                Manage Leave Blocks
              </Button>

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
