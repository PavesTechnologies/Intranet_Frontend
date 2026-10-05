import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, AlertCircle, FolderKanban, Hash, CalendarRange, MapPin, Mail, Phone } from "lucide-react";

import FormInput from "../../../../components/forms/FormInput";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import FormTextArea from "../../../../components/forms/FormTextArea";
import SearchableSelect from "../common/SearchableSelect";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { BILLING_CONTEXT_OPTIONS } from "../../data/wizardOptions";
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

// Display-time safety net: a Project Code must never be the project's own
// internal id. A legacy record can have that value persisted (saved before
// this mapping was fixed) or a lookup can fall through to it — either way,
// never show it as the code, here in the dropdown label or in the Synced
// Information card below.
function sanitizeProjectCode(code, projectId) {
  const codeStr = code === null || code === undefined ? "" : String(code).trim();
  if (!codeStr) return "";
  if (projectId === null || projectId === undefined || projectId === "") return codeStr;
  return codeStr === String(projectId).trim() ? "" : codeStr;
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

// Product/Application/Service billing has no project at all — projectId must
// stay null/absent (see buildBillingConfigurationRequestPayload), so switching
// into PRODUCT_SERVICE clears every project-specific field a prior PROJECT
// selection may have left behind.
const EMPTY_PRODUCT_SERVICE_FIELDS = {
  productName: "",
  productDescription: "",
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

  // Billing Context: PROJECT (default — every existing T&M/Fixed Price/
  // Milestone/Recurring flow) vs PRODUCT_SERVICE (Recurring only — a
  // standalone product/application/service with no project at all). This is
  // a distinct concept from projectSource's ENTERPRISE/STANDALONE, which is
  // still about a *project* (synced vs manually-entered) — a PRODUCT_SERVICE
  // configuration never has a project, manually-entered or otherwise.
  const billingContext = value.billingContext || "PROJECT";
  const isProductService = billingContext === "PRODUCT_SERVICE";

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
      const code = sanitizeProjectCode(project.projectCode, project.projectId || project.id);
      const label = code ? `${code} — ${project.projectName}` : project.projectName;
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

  // A Draft billing configuration can come back from the backend with only
  // SOME of its project-derived fields persisted (e.g. projectCode present
  // but projectBudget/primaryLocation/email missing — the flat
  // BillingConfigurationResponseDto is inconsistent about this; see
  // billingConfigurationService.js). Once the matching project is resolved
  // (from the client's project list, or synthesized from `value` itself while
  // that list is still loading — see displayProjects above), backfill every
  // field independently rather than gating the whole patch behind just two of
  // them — otherwise a config that already has projectCode+projectDuration
  // but not projectBudget would stay permanently blank on those other fields.
  // This also makes hydration order-independent: it re-evaluates on every
  // render where matchedProject or value changes, and is a no-op (no onChange
  // call, so no update loop) as soon as nothing is actually missing.
  useEffect(() => {
    if (!matchedProject) return;

    const patch = {};
    const take = (field, source = matchedProject[field]) => {
      const current = value[field];
      const hasCurrent = current !== undefined && current !== null && current !== "";
      const hasSource = source !== undefined && source !== null && source !== "";
      if (!hasCurrent && hasSource) patch[field] = source;
    };

    take("projectName");
    take("projectCode", sanitizeProjectCode(matchedProject.projectCode, matchedProject.projectId || matchedProject.id));
    take("projectDuration");
    take("projectBudget");
    take("projectBudgetCurrency", matchedProject.projectBudgetCurrency || matchedProject.currency);
    take("currency", matchedProject.projectBudgetCurrency || matchedProject.currency);
    take("primaryLocation");
    take("countryCode");
    take("email");
    take("phoneNumber");
    take("startDate");
    take("endDate");

    if (Object.keys(patch).length === 0) return;
    onChange({ ...value, ...patch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedProject, value]);

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
        projectCode: project.projectCode || "",
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

  const handleBillingContextChange = (nextContext) => {
    if (nextContext === billingContext) return;
    if (nextContext === "PRODUCT_SERVICE") {
      onChange({
        ...value,
        billingContext: "PRODUCT_SERVICE",
        ...EMPTY_PROJECT_FIELDS,
      });
    } else {
      onChange({
        ...value,
        billingContext: "PROJECT",
        ...EMPTY_PRODUCT_SERVICE_FIELDS,
      });
    }
  };

  // Client search for Product/Service billing — the same enterprise client
  // list as the PROJECT flow (a client is still required), but never touches
  // projectSource/switchToStandalone: there is no project to fall back to.
  const handleProductServiceClientSelect = (clientId) => {
    const clientName = clientOptions.find((opt) => opt.value === clientId)?.label || "";
    onChange({ ...value, clientId, clientName });
  };

  const useManualClientForProductService = (queryText = "") => {
    onChange({ ...value, clientId: "", clientName: queryText });
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
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Billing Context</label>
        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/60 p-0.5">
          {BILLING_CONTEXT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleBillingContextChange(option.value)}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
                billingContext === option.value
                  ? "bg-white text-[#0A0082] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {isProductService && (
          <p className="text-xs text-slate-500">
            Bill a standalone product, application, or service — no project is required.
          </p>
        )}
      </div>

      {!isProductService && projectSource === "STANDALONE" && (
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

        {isProductService ? (
          /* PRODUCT / SERVICE FLOW — client is still required, but there is
             no project at all: projectId/projectCode/dates stay absent (see
             buildBillingConfigurationRequestPayload). */
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <SearchableSelect
                label="Client Name"
                requiredMark
                name="clientId"
                options={clientOptions}
                value={value.clientId || ""}
                onChange={(event) => handleProductServiceClientSelect(event.target.value)}
                placeholder={loadingClients ? "Loading clients..." : "Search client..."}
                disabled={loadingClients}
                anchor
                emptyState={(query) =>
                  query ? (
                    <div className="p-4 text-center">
                      <p className="text-sm text-slate-500 mb-2">No matching client found.</p>
                      <button
                        type="button"
                        onClick={() => useManualClientForProductService(query)}
                        className="w-full inline-flex justify-center items-center gap-1.5 rounded-md bg-[#0A0082] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#080066]"
                      >
                        Use &quot;{query}&quot; as client name
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-sm text-slate-500">No clients available.</div>
                  )
                }
              />
              {value.clientId === "" && value.clientName && (
                <FormInput
                  label="Client Name"
                  requiredMark
                  name="clientName"
                  value={value.clientName || ""}
                  onChange={handleFieldChange}
                  placeholder="e.g. Meridian Financial Group"
                />
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <FormInput
                label="Product / Application / Service Name"
                requiredMark
                name="productName"
                value={value.productName || ""}
                onChange={handleFieldChange}
                placeholder="e.g. Customer Support Portal"
              />
            </div>

            <FormTextArea
              label="Product / Service Description *"
              name="productDescription"
              value={value.productDescription || ""}
              onChange={handleFieldChange}
              placeholder="Briefly describe what is being billed"
              rows={3}
            />
          </div>
        ) : projectSource === "ENTERPRISE" ? (
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
                  // SearchableSelect matches this against option.value with
                  // strict === (option.value is always String(projectId) — see
                  // projectOptions below). A Draft loaded from the backend can
                  // carry projectId as a number (e.g. 38), which would never
                  // strictly equal the string "38" in projectOptions, leaving
                  // the dropdown stuck on its placeholder even though the
                  // correct project was selected. Stringify here so it always
                  // matches regardless of where projectId came from.
                  value={value.projectId ? String(value.projectId) : ""}
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
                value={sanitizeProjectCode(value.projectCode, value.projectId) || "—"}
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
