import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, AlertCircle, FolderKanban, Hash, CalendarRange, MapPin, Mail, Phone } from "lucide-react";

import FormInput from "../../../../components/forms/FormInput";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import SearchableSelect from "../common/SearchableSelect";
import { showStatusToast } from "../../../../components/toastfy/toast";
import {
  getBillingConfigurationClients,
  getAvailableProjectsForBillingConfiguration,
} from "../../services/billingConfigService";

function FieldCell({ icon, label, value }) {
  return (
    <div className="min-w-0 px-4 py-3">
      <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {icon}
        {label}
      </span>
      <span className="mt-1 block break-words text-[13px] font-medium text-slate-700">{value}</span>
    </div>
  );
}

// Combines countryCode + phoneNumber into a single display value without
// leaving a stray leading/trailing space when either half is missing.
function formatPhoneNumber(countryCode, phoneNumber) {
  return [countryCode, phoneNumber].filter(Boolean).join(" ") || "—";
}

const EMPTY_PROJECT_FIELDS = {
  projectId: "",
  projectName: "",
  projectCode: "",
  projectDuration: "",
  currency: "",
  projectBudget: "",
  projectBudgetCurrency: "",
  primaryLocation: "",
  countryCode: "",
  email: "",
  phoneNumber: "",
  startDate: "",
  endDate: "",
};

export default function ProjectStep({ value = {}, onChange }) {
  const [projects, setProjects] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    // Load clients list from backend; project list is loaded when a client is selected
    getBillingConfigurationClients()
      .then((clients) => {
        if (!isMounted.current) return;
        setClientOptions(
          Array.isArray(clients)
            ? Array.from(new Map(clients.map((c) => [c.clientId || c.id, c.clientName || c.name])), ([val, label]) => ({ value: val, label }))
            : []
        );
      })
      .catch(() => {
        if (!isMounted.current) return;
        setClientOptions([]);
        showStatusToast("Failed to load clients. Please try again.", "error");
      })
      .finally(() => {
        if (!isMounted.current) return;
        setLoadingClients(false);
      });
  }, []);

  // Single source of truth for fetching a client's available projects — fires
  // on initial load (editing an existing configuration with a preselected
  // client) and whenever the user picks a different client. Previously
  // `handleClientSelect` also fetched directly, duplicating this call; that
  // redundant fetch has been removed so a client change only hits the API once.
  useEffect(() => {
    if (!value.clientId) {
      setProjects([]);
      setLoadingProjects(false);
      return undefined;
    }

    let cancelled = false;
    setLoadingProjects(true);
    setProjects([]);

    getAvailableProjectsForBillingConfiguration(value.clientId)
      .then((projectList) => {
        if (!isMounted.current || cancelled) return;
        setProjects(Array.isArray(projectList) ? projectList : []);
      })
      .catch(() => {
        if (!isMounted.current || cancelled) return;
        setProjects([]);
        showStatusToast("Failed to load projects for this client. Please try again.", "error");
      })
      .finally(() => {
        if (!isMounted.current || cancelled) return;
        setLoadingProjects(false);
      });

    return () => {
      cancelled = true;
    };
  }, [value.clientId]);

  // Internal projectSource defaults to ENTERPRISE if not set
  const projectSource = value.projectSource || "ENTERPRISE";

  // `projects` is already exactly the set of projects eligible for a new
  // Billing Configuration (see getAvailableProjectsForBillingConfiguration) —
  // the backend is the sole source of truth for that eligibility, so no
  // further filtering happens here.
  //
  // When editing an existing configuration, its own project may be absent
  // from that eligibility list (e.g. it's already configured, so it no longer
  // qualifies as available for a NEW configuration). Rather than treat that as
  // "no projects found", fall back to the project data already carried on the
  // configuration itself (`value`) so it stays selectable/displayed here —
  // this never affects the New Billing Configuration list or its API.
  const displayProjects = useMemo(() => {
    if (!value.projectId) return projects;
    const alreadyListed = projects.some(
      (project) => String(project.projectId || project.id || "") === String(value.projectId)
    );
    if (alreadyListed) {
      // The available-projects API entry may not carry primaryLocation/contact
      // fields (it's a slim "eligible for a new configuration" DTO) — never
      // let a missing/null value from it clobber what's already known from
      // the configuration being edited.
      return projects.map((project) =>
        String(project.projectId || project.id || "") === String(value.projectId)
          ? {
              ...project,
              primaryLocation: value.primaryLocation || project.primaryLocation,
              countryCode: project.countryCode || value.countryCode,
              email: project.email || value.email,
              phoneNumber: project.phoneNumber || value.phoneNumber,
            }
          : project
      );
    }
    return [
      ...projects,
      {
        projectId: value.projectId,
        projectName: value.projectName,
        projectCode: value.projectCode,
        projectDuration: value.projectDuration,
        projectBudget: value.projectBudget,
        projectBudgetCurrency: value.projectBudgetCurrency,
        currency: value.currency,
        primaryLocation: value.primaryLocation,
        countryCode: value.countryCode,
        email: value.email,
        phoneNumber: value.phoneNumber,
        startDate: value.startDate,
        endDate: value.endDate,
      },
    ];
  }, [
    projects,
    value.projectId,
    value.projectName,
    value.projectCode,
    value.projectDuration,
    value.projectBudget,
    value.projectBudgetCurrency,
    value.currency,
    value.primaryLocation,
    value.countryCode,
    value.email,
    value.phoneNumber,
    value.startDate,
    value.endDate,
  ]);

  const projectOptions = useMemo(() => {
    if (!value.clientId) return [];
    return displayProjects.map((project) => {
      const id = String(project.projectId || project.id || "");
      const label = project.projectCode ? `${project.projectCode} — ${project.projectName}` : project.projectName;
      return { value: id, label };
    });
  }, [displayProjects, value.clientId]);

  // Selected enterprise project details
  const matchedProject = useMemo(() => {
    if (!value.projectId) return null;
    return (
      displayProjects.find((project) => String(project.projectId || project.id || "") === String(value.projectId)) || null
    );
  }, [displayProjects, value.projectId]);

  // A Draft billing configuration can come back from the backend without its
  // project-derived fields (e.g. projectCode) persisted — once the client's
  // project list loads, backfill anything missing from the matched project so
  // the summary card and step validation don't see a false "missing" field.
  useEffect(() => {
    if (!matchedProject) return;
    if (value.projectCode && value.projectDuration) return;

    onChange({
      ...value,
      projectName: value.projectName || matchedProject.projectName,
      projectCode: value.projectCode || matchedProject.projectCode,
      projectDuration: value.projectDuration || matchedProject.projectDuration,
      currency: value.currency || matchedProject.projectBudgetCurrency || matchedProject.currency || "",
      projectBudget: value.projectBudget ?? matchedProject.projectBudget ?? "",
      projectBudgetCurrency:
        value.projectBudgetCurrency || matchedProject.projectBudgetCurrency || matchedProject.currency || "",
      primaryLocation: value.primaryLocation || matchedProject.primaryLocation || "",
      countryCode: value.countryCode || matchedProject.countryCode || "",
      email: value.email || matchedProject.email || "",
      phoneNumber: value.phoneNumber || matchedProject.phoneNumber || "",
      startDate: value.startDate || matchedProject.startDate,
      endDate: value.endDate || matchedProject.endDate,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedProject]);

  const getProjectDurationLabel = (projectData) => {
    if (projectData?.projectDuration) return projectData.projectDuration;
    if (projectData?.startDate || projectData?.endDate) {
      return `${projectData.startDate || "—"} to ${projectData.endDate || "Ongoing"}`;
    }
    return "—";
  };

  // Handlers
  const handleClientSelect = (clientId) => {
    const clientName = clientOptions.find((opt) => opt.value === clientId)?.label || "";

    onChange({
      ...value,
      projectSource: "ENTERPRISE",
      clientId,
      clientName,
      ...EMPTY_PROJECT_FIELDS,
    });
  };

  const handleProjectSelect = (event) => {
    const projectId = event.target.value;
    const project = displayProjects.find((p) => String(p.projectId || p.id || "") === String(projectId));
    if (project) {
      onChange({
        ...value,
        projectSource: "ENTERPRISE",
        clientId: value.clientId,
        clientName: value.clientName,
        projectId,
        projectName: project.projectName,
        projectCode: project.projectCode,
        projectDuration: project.projectDuration,
        currency: project.projectBudgetCurrency || project.currency || "",
        projectBudget: project.projectBudget ?? "",
        projectBudgetCurrency: project.projectBudgetCurrency || project.currency || "",
        primaryLocation: project.primaryLocation || "",
        countryCode: project.countryCode || "",
        email: project.email || "",
        phoneNumber: project.phoneNumber || "",
        startDate: project.startDate,
        endDate: project.endDate,
      });
    } else {
      onChange({
        ...value,
        ...EMPTY_PROJECT_FIELDS,
        projectId: "",
      });
    }
  };

  const switchToStandalone = (queryText = "") => {
    onChange({
      ...value,
      projectSource: "STANDALONE",
      clientId: "",
      clientName: queryText,
      ...EMPTY_PROJECT_FIELDS,
    });
  };

  const switchToEnterprise = () => {
    onChange({
      ...value,
      projectSource: "ENTERPRISE",
      clientId: "",
      clientName: "",
      ...EMPTY_PROJECT_FIELDS,
    });
  };

  const handleFieldChange = (event) => {
    const { name, value: fieldValue } = event.target;
    onChange({ ...value, [name]: fieldValue });
  };

  const handleDateChange = (name) => (event) => {
    onChange({ ...value, [name]: event.target.value });
  };

  const projectSelectorPlaceholder = loadingClients
    ? "Loading clients..."
    : !value.clientId
    ? "Select client first"
    : loadingProjects
    ? "Loading projects..."
    : projectOptions.length === 0
    ? "No projects found"
    : "Select project";

  return (
    <div className="space-y-5">
      {projectSource === "STANDALONE" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={switchToEnterprise}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Search Enterprise Projects
          </button>
        </div>
      )}

      {/* Inputs Section */}
      <div className="space-y-5">

        {projectSource === "ENTERPRISE" ? (
          /* ENTERPRISE FLOW */
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Client Searchable Dropdown */}
              <SearchableSelect
                label="Client Name"
                requiredMark
                name="clientId"
                options={clientOptions}
                value={value.clientId || ""}
                onChange={(event) => handleClientSelect(event.target.value)}
                placeholder={loadingClients ? "Loading clients..." : "Search client..."}
                disabled={loadingClients}
                anchor
                emptyState={(query) =>
                  query ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-slate-500 mb-2">No matching client found.</p>
                      <button
                        type="button"
                        onClick={() => switchToStandalone(query)}
                        className="w-full inline-flex justify-center items-center gap-1.5 rounded-md bg-[#0A0082] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#080066]"
                      >
                        Create standalone client &amp; project
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-sm text-slate-500">No clients available.</div>
                  )
                }
              />

              {/* Project Name dropdown */}
              <div className="space-y-1 w-full min-w-0">
                <SearchableSelect
                  label="Project Name"
                  requiredMark
                  name="projectId"
                  options={projectOptions}
                  value={value.projectId || ""}
                  onChange={handleProjectSelect}
                  placeholder={projectSelectorPlaceholder}
                  disabled={loadingClients || !value.clientId || loadingProjects}
                  anchor
                  noMatchesMessage="No matching project found."
                />
                {value.clientId && !loadingProjects && projectOptions.length === 0 && (
                  <p className="text-xs text-slate-500">No available projects found for this client.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* STANDALONE FLOW */
          <div className="space-y-5">
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500" />
              <p>
                No matching client found. Form switched to <strong className="font-semibold">Standalone Project</strong> mode.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormInput
                label="Client Name"
                requiredMark
                name="clientName"
                value={value.clientName || ""}
                onChange={handleFieldChange}
                placeholder="e.g. Meridian Financial Group"
              />

              <FormInput
                label="Project Name"
                requiredMark
                name="projectName"
                value={value.projectName || ""}
                onChange={handleFieldChange}
                placeholder="e.g. Core Banking Platform Upgrade"
              />

              <FormInput
                label="Project Code"
                requiredMark
                name="projectCode"
                value={value.projectCode || ""}
                onChange={handleFieldChange}
                placeholder="e.g. MAN-1004"
              />

              <FormDatePicker
                label="Project Start Date *"
                name="startDate"
                value={value.startDate || ""}
                onChange={handleDateChange("startDate")}
              />

              <FormDatePicker
                label="Project End Date *"
                name="endDate"
                value={value.endDate || ""}
                onChange={handleDateChange("endDate")}
                min={value.startDate || undefined}
              />
            </div>
          </div>
        )}
      </div>

      {/* Synced information (Only for Enterprise, when a project is selected) */}
      {projectSource === "ENTERPRISE" && value.projectId && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5">
            <h3 className="text-[13px] font-semibold text-slate-700">Synced Information</h3>
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <RefreshCw className="h-3 w-3" strokeWidth={1.75} />
              Synced from RMS &amp; PMS
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              <FieldCell
                icon={<FolderKanban className="h-3 w-3" strokeWidth={1.75} />}
                label="Project Name"
                value={value.projectName || "—"}
              />
              <FieldCell
                icon={<Hash className="h-3 w-3" strokeWidth={1.75} />}
                label="Project Code"
                value={value.projectCode || "—"}
              />
            </div>
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              <FieldCell
                icon={<CalendarRange className="h-3 w-3" strokeWidth={1.75} />}
                label="Project Duration"
                value={getProjectDurationLabel(value)}
              />
              <FieldCell
                icon={<MapPin className="h-3 w-3" strokeWidth={1.75} />}
                label="Primary Location"
                value={value.primaryLocation || matchedProject?.primaryLocation || "—"}
              />
            </div>
            <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
              <FieldCell icon={<Mail className="h-3 w-3" strokeWidth={1.75} />} label="Email" value={value.email || "—"} />
              <FieldCell
                icon={<Phone className="h-3 w-3" strokeWidth={1.75} />}
                label="Phone Number"
                value={formatPhoneNumber(value.countryCode, value.phoneNumber)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
