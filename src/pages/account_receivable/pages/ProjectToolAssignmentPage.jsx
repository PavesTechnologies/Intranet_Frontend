import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Ban, RotateCcw, ChevronRight, Layers } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import FilterCard from "../../../components/ui/FilterCard";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import SearchInput from "../../../components/filter/Searchbar";
import FormSelect from "../../../components/forms/FormSelect";
import GenericTable from "../../../components/Table/table";
import Pagination from "../../../components/Pagination/pagination";
import StatusBadge from "../../../components/status/statusbadge";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { showStatusToast } from "../../../components/toastfy/toast";
import ActionMenu from "../components/common/ActionMenu";
import SearchableSelect from "../components/common/SearchableSelect";
import ProjectToolAssignmentFormDialog from "../components/project-tool-assignment/ProjectToolAssignmentFormDialog";
import { BILLING_BASIS_OPTIONS, TOOL_STATUS_FILTER_OPTIONS } from "../data/toolCatalogOptions";
import { formatDisplayDate } from "../utils/format";
import { fetchActiveEnterpriseProjects } from "../services/billingConfigService";
import * as projectToolAssignmentService from "../services/projectToolAssignmentService";

const INITIAL_FILTERS = { search: "", projectId: "", toolId: "", status: "" };
const PAGE_SIZE = 6;

const TABLE_HEADERS = [
  "Project",
  "Tool Code",
  "Tool Name",
  "Billing Basis",
  "Quantity",
  "Start Date",
  "End Date",
  "Status",
  "Actions",
];
const TABLE_COLUMNS = [
  "project",
  "toolCode",
  "toolName",
  "billingBasis",
  "quantity",
  "startDate",
  "endDate",
  "status",
  "actions",
];

const BILLING_BASIS_LABELS = BILLING_BASIS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const BREADCRUMB_ITEMS = [
  { label: "Account Receivable", to: "/account-receivable/dashboard" },
  { label: "Project Billing Setup", to: "/account-receivable/project-billing-setup/overview" },
  { label: "Tool Billing", to: null },
  { label: "Project Tool Assignments", to: null },
];

export default function ProjectToolAssignmentPage() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tools, setTools] = useState([]);
  const [toolsLoading, setToolsLoading] = useState(true);

  const [dialogState, setDialogState] = useState(null); // { mode: 'create'|'edit'|'view'|'renew', assignment? }
  const [saving, setSaving] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateLoading, setDeactivateLoading] = useState(false);

  const loadAssignments = useCallback(() => {
    setLoading(true);
    return projectToolAssignmentService
      .getAll()
      .then((result) => setAssignments(Array.isArray(result) ? result : []))
      .catch(() => {
        showStatusToast("Unable to load project tool assignments. Please try again.", "error");
        setAssignments([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    let isMounted = true;
    setProjectsLoading(true);

    fetchActiveEnterpriseProjects()
      .then((result) => {
        if (isMounted) setProjects(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (isMounted) {
          showStatusToast("Unable to load the project lookup.", "error");
          setProjects([]);
        }
      })
      .finally(() => {
        if (isMounted) setProjectsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    setToolsLoading(true);

    projectToolAssignmentService
      .getActiveTools()
      .then((result) => {
        if (isMounted) setTools(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (isMounted) {
          showStatusToast("Unable to load the active Tool Catalog.", "error");
          setTools([]);
        }
      })
      .finally(() => {
        if (isMounted) setToolsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const projectsById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const toolsById = useMemo(() => new Map(tools.map((tool) => [tool.id, tool])), [tools]);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: `${project.projectCode} — ${project.projectName}` })),
    [projects]
  );
  const toolOptions = useMemo(
    () => tools.map((tool) => ({ value: tool.id, label: `${tool.toolCode} — ${tool.toolName}` })),
    [tools]
  );

  // Filter dropdowns need an explicit "All" option to clear back to; the required Project/Tool
  // selects inside the create/edit dialog use the plain option lists above instead.
  const projectFilterOptions = useMemo(() => [{ value: "", label: "All Projects" }, ...projectOptions], [
    projectOptions,
  ]);
  const toolFilterOptions = useMemo(() => [{ value: "", label: "All Tools" }, ...toolOptions], [toolOptions]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    setCurrentPage(1);
  };

  const handleSearch = (value) => {
    setFilters((prev) => ({ ...prev, search: value }));
    setCurrentPage(1);
  };

  const filteredAssignments = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const project = projectsById.get(assignment.projectId);
      const tool = toolsById.get(assignment.toolId);

      const matchesSearch =
        !search ||
        (project?.projectName || "").toLowerCase().includes(search) ||
        (project?.projectCode || "").toLowerCase().includes(search) ||
        (tool?.toolCode || "").toLowerCase().includes(search) ||
        (tool?.toolName || "").toLowerCase().includes(search) ||
        (assignment.remarks || "").toLowerCase().includes(search);
      const matchesProject = !filters.projectId || assignment.projectId === filters.projectId;
      const matchesTool = !filters.toolId || assignment.toolId === filters.toolId;
      const matchesStatus =
        !filters.status || (filters.status === "ACTIVE" ? assignment.active : !assignment.active);

      return matchesSearch && matchesProject && matchesTool && matchesStatus;
    });
  }, [assignments, filters, projectsById, toolsById]);

  const totalPages = Math.ceil(filteredAssignments.length / PAGE_SIZE) || 1;
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const handleAdd = () => setDialogState({ mode: "create" });
  const handleView = (assignment) => setDialogState({ mode: "view", assignment });
  const handleEdit = (assignment) => setDialogState({ mode: "edit", assignment });
  const handleRenew = (assignment) => setDialogState({ mode: "renew", assignment });
  const closeDialog = () => setDialogState(null);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      if (dialogState?.mode === "edit" && dialogState.assignment) {
        await projectToolAssignmentService.update(dialogState.assignment.id, payload);
        showStatusToast("Assignment updated successfully.", "success");
      } else if (dialogState?.mode === "renew" && dialogState.assignment) {
        await projectToolAssignmentService.renew(dialogState.assignment.id, payload);
        showStatusToast("Assignment renewed successfully.", "success");
      } else {
        await projectToolAssignmentService.create(payload);
        showStatusToast("Assignment created successfully.", "success");
      }
      closeDialog();
      await loadAssignments();
    } catch (error) {
      // Backend is the source of truth for overlap validation — surface whatever message
      // it returns (400) rather than duplicating overlap logic on the frontend.
      const status = error?.response?.status;
      const message =
        status === 400
          ? error.response?.data?.message || "Please check the assignment details and try again."
          : "Something went wrong while saving the assignment.";
      showStatusToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivateTarget) return;

    setDeactivateLoading(true);
    try {
      await projectToolAssignmentService.deleteById(deactivateTarget.id);
      showStatusToast("Assignment deactivated successfully.", "success");
      setDeactivateTarget(null);
      await loadAssignments();
    } catch (error) {
      // e.g. backend rejects with "Assignment already billed" — surface its message via the
      // existing toast and leave the row (and the confirmation dialog) untouched.
      const message = error?.response?.data?.message || "Unable to deactivate the assignment. Please try again.";
      showStatusToast(message, "error");
    } finally {
      setDeactivateLoading(false);
    }
  };

  const tableRows = useMemo(
    () =>
      paginatedAssignments.map((assignment) => {
        const project = projectsById.get(assignment.projectId);
        const tool = toolsById.get(assignment.toolId);

        return {
          project: (
            <div className="text-left">
              <div className="font-semibold text-slate-900">{project?.projectName || "—"}</div>
              <div className="text-xs text-slate-400">{project?.projectCode || assignment.projectId}</div>
            </div>
          ),
          toolCode: tool?.toolCode || assignment.toolId,
          toolName: tool?.toolName || "—",
          billingBasis: BILLING_BASIS_LABELS[assignment.billingBasis] || assignment.billingBasis,
          quantity: assignment.quantity,
          startDate: formatDisplayDate(assignment.startDate),
          endDate: formatDisplayDate(assignment.endDate),
          status: <StatusBadge label={assignment.active ? "Active" : "Inactive"} size="sm" />,
          actions: (
            <ActionMenu
              items={[
                { label: "View", icon: <Eye className="h-4 w-4" />, onClick: () => handleView(assignment) },
                { label: "Edit", icon: <Pencil className="h-4 w-4" />, onClick: () => handleEdit(assignment) },
                {
                  label: "Deactivate",
                  icon: <Ban className="h-4 w-4" />,
                  hidden: !assignment.active,
                  danger: true,
                  onClick: () => setDeactivateTarget(assignment),
                },
                { label: "Renew", icon: <RotateCcw className="h-4 w-4" />, onClick: () => handleRenew(assignment) },
              ]}
            />
          ),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paginatedAssignments, projectsById, toolsById]
  );

  return (
    <div className="space-y-6 p-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
        {BREADCRUMB_ITEMS.map((item, index) => (
          <span key={item.label} className="flex items-center gap-2">
            {item.to ? (
              <Link to={item.to} className="hover:text-slate-800">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900">{item.label}</span>
            )}
            {index < BREADCRUMB_ITEMS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
          </span>
        ))}
      </nav>

      <PageHeader
        title="Project Tool Assignments"
        subtitle="Assign catalog tools to projects for tool and software billing."
        actions={
          <Button variant="primary" onClick={handleAdd}>
            + Add Assignment
          </Button>
        }
      />

      <FilterCard title="Filters" description="Search and narrow down project tool assignments.">
        <div className="w-full md:w-64">
          <SearchInput
            value={filters.search}
            onChange={handleFilterChange}
            onSearch={handleSearch}
            placeholder="Search by project, tool or remarks..."
          />
        </div>
        <div className="w-full sm:w-56">
          <SearchableSelect
            label="Project"
            name="projectId"
            value={filters.projectId}
            onChange={handleFilterChange}
            options={projectFilterOptions}
            placeholder={projectsLoading ? "Loading projects..." : "All projects"}
            disabled={projectsLoading}
          />
        </div>
        <div className="w-full sm:w-56">
          <SearchableSelect
            label="Tool"
            name="toolId"
            value={filters.toolId}
            onChange={handleFilterChange}
            options={toolFilterOptions}
            placeholder={toolsLoading ? "Loading tools..." : "All tools"}
            disabled={toolsLoading}
          />
        </div>
        <div className="w-full sm:w-48">
          <FormSelect
            label="Status"
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            options={TOOL_STATUS_FILTER_OPTIONS}
          />
        </div>
      </FilterCard>

      <PageCard>
        <PageCardContent className="p-6">
          {!loading && filteredAssignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Layers className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-900">No Assignments Found</h3>
              <p className="text-xs text-slate-500">Try adjusting your filters, or add a new assignment.</p>
            </div>
          ) : (
            <>
              <div className="w-full overflow-x-auto">
                <GenericTable headers={TABLE_HEADERS} columns={TABLE_COLUMNS} rows={tableRows} loading={loading} />
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPrevious={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                onNext={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              />
            </>
          )}
        </PageCardContent>
      </PageCard>

      <ProjectToolAssignmentFormDialog
        isOpen={Boolean(dialogState)}
        mode={dialogState?.mode}
        initialValue={dialogState?.assignment}
        projectOptions={projectOptions}
        projectsLoading={projectsLoading}
        toolOptions={toolOptions}
        toolsLoading={toolsLoading}
        saving={saving}
        onClose={closeDialog}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(deactivateTarget)}
        title="Deactivate Assignment"
        message={
          deactivateTarget
            ? `Are you sure you want to deactivate this tool assignment? It will no longer be used for tool billing.`
            : ""
        }
        confirmText="Deactivate"
        variant="danger"
        isLoading={deactivateLoading}
        onCancel={() => setDeactivateTarget(null)}
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  );
}
