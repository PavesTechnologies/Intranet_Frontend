import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "@headlessui/react";
import { Check, ChevronDown, RefreshCw, AlertCircle } from "lucide-react";
import classNames from "classnames";

import FormInput from "../../../../components/forms/FormInput";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import { Fonts } from "../../../../components/Fonts/Fonts";
import {
  getBillingConfigurationClients,
  getBillingConfigurationProjectsByClient,
} from "../../services/billingConfigService";

export default function ProjectStep({ value = {}, onChange }) {
  const [projects, setProjects] = useState([]);
  const [clientOptions, setClientOptions] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
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
        setProjects([]);
        setClientOptions(
          Array.isArray(clients)
            ? Array.from(new Map(clients.map((c) => [c.clientId || c.id, c.clientName || c.name])), ([val, label]) => ({ value: val, label }))
            : []
        );
      })
      .catch(() => {
        if (!isMounted.current) return;
        setProjects([]);
        setClientOptions([]);
      })
      .finally(() => {
        if (!isMounted.current) return;
        setLoadingClients(false);
      });
  }, []);

  // Internal projectSource defaults to ENTERPRISE if not set
  const projectSource = value.projectSource || "ENTERPRISE";

  // clientOptions are loaded from backend via `getBillingConfigurationClients`

  // Projects filtered by selected client
  const projectOptions = useMemo(() => {
    if (!value.clientId) return [];
    return projects.map((project) => ({ value: String(project.projectId || project.id || ""), label: project.projectName }));
  }, [projects, value.clientId]);

  // Selected enterprise project details
  const matchedProject = useMemo(() => {
    if (!value.projectId) return null;
    return projects.find((project) => String(project.id) === String(value.projectId)) || null;
  }, [projects, value.projectId]);

  // Filter client list based on search query
  const filteredClientOptions = useMemo(() => {
    if (clientQuery === "") return clientOptions;
    return clientOptions.filter((option) =>
      option.label.toLowerCase().includes(clientQuery.toLowerCase())
    );
  }, [clientOptions, clientQuery]);

  const showClientNotFound = clientQuery !== "" && filteredClientOptions.length === 0;

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
    setLoadingProjects(true);
    setProjects([]);

    getBillingConfigurationProjectsByClient(clientId)
      .then((projectList) => {
        if (!isMounted.current) return;
        setProjects(Array.isArray(projectList) ? projectList : []);
      })
      .catch(() => {
        if (!isMounted.current) return;
        setProjects([]);
      })
      .finally(() => {
        if (!isMounted.current) return;
        setLoadingProjects(false);
      });

    onChange({
      ...value,
      projectSource: "ENTERPRISE",
      clientId,
      clientName,
      projectId: "",
      projectName: "",
      projectCode: "",
      projectDuration: "",
      currency: "",
      projectBudget: "",
      projectBudgetCurrency: "",
      startDate: "",
      endDate: "",
    });
  };

  const handleProjectSelect = (event) => {
    const projectId = event.target.value;
    const project = projects.find((p) => String(p.id) === String(projectId));
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
        startDate: project.startDate,
        endDate: project.endDate,
      });
    } else {
      onChange({
        ...value,
        projectId: "",
        projectName: "",
        projectCode: "",
        projectDuration: "",
        currency: "",
        projectBudget: "",
        projectBudgetCurrency: "",
        startDate: "",
        endDate: "",
      });
    }
  };

  const switchToStandalone = () => {
    onChange({
      ...value,
      projectSource: "STANDALONE",
      clientId: "",
      clientName: clientQuery,
      projectId: "",
      projectName: "",
      projectCode: "",
      currency: "",
      projectBudget: "",
      projectBudgetCurrency: "",
      startDate: "",
      endDate: "",
    });
    setClientQuery("");
  };

  const switchToEnterprise = () => {
    onChange({
      ...value,
      projectSource: "ENTERPRISE",
      clientId: "",
      clientName: "",
      projectId: "",
      projectName: "",
      projectCode: "",
      currency: "",
      projectBudget: "",
      projectBudgetCurrency: "",
      startDate: "",
      endDate: "",
    });
    setClientQuery("");
  };

  const handleFieldChange = (event) => {
    const { name, value: fieldValue } = event.target;
    onChange({ ...value, [name]: fieldValue });
  };

  const handleDateChange = (name) => (event) => {
    onChange({ ...value, [name]: event.target.value });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className={Fonts.heading3}>Project Selection</h2>
          <p className="mt-1 text-sm text-slate-500">
            Select an existing enterprise project or configure a standalone project.
          </p>
        </div>
        {projectSource === "STANDALONE" && (
          <button
            type="button"
            onClick={switchToEnterprise}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Search Enterprise Projects
          </button>
        )}
      </div>

      {/* Inputs Section */}
      <div className="space-y-5">

        {projectSource === "ENTERPRISE" ? (
          /* ENTERPRISE FLOW */
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {/* Client Searchable Dropdown */}
              <div className="space-y-1 w-full min-w-0">
              <label className="block text-sm font-medium text-slate-700">
                Client Name <span className="text-red-500">*</span>
              </label>
              <Combobox value={value.clientId || null} onChange={handleClientSelect}>
                <div className="relative min-w-0">
                  <Combobox.Input
                    className="w-full min-w-0 px-4 py-2 border border-slate-300 rounded-lg shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:cursor-not-allowed disabled:bg-slate-50 text-sm"
                    displayValue={() => value.clientName || ""}
                    onChange={(event) => setClientQuery(event.target.value)}
                    placeholder={loadingClients ? "Loading clients..." : "Search client..."}
                    disabled={loadingClients}
                  />
                  <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </Combobox.Button>

                  <Combobox.Options className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                    {filteredClientOptions.length > 0 &&
                      filteredClientOptions.map((option) => (
                        <Combobox.Option
                          key={option.value}
                          value={option.value}
                          className={({ active }) =>
                            classNames(
                              "relative cursor-pointer select-none py-2 px-4",
                              active ? "bg-blue-50 text-blue-900 font-medium" : "text-slate-900"
                            )
                          }
                        >
                          {({ selected }) => (
                            <div className="flex justify-between items-center gap-2">
                              <span>{option.label}</span>
                              {selected && <Check className="w-4 h-4 text-blue-600" />}
                            </div>
                          )}
                        </Combobox.Option>
                      ))}
                    {showClientNotFound && (
                      <div className="p-4 text-center">
                        <p className="text-sm text-slate-500 mb-2">No matching client found.</p>
                        <button
                          type="button"
                          onClick={switchToStandalone}
                          className="w-full inline-flex justify-center items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                        >
                          Create standalone client &amp; project
                        </button>
                      </div>
                    )}
                  </Combobox.Options>
                </div>
              </Combobox>
            </div>

            {/* Project Name dropdown */}
            <div className="space-y-1 w-full min-w-0">
              <label className="block text-sm font-medium text-slate-700">
                Project Name <span className="text-red-500">*</span>
              </label>
              <select
                name="projectId"
                value={value.projectId || ""}
                onChange={handleProjectSelect}
                disabled={loadingClients || !value.clientId}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:cursor-not-allowed disabled:bg-slate-50 text-sm"
              >
                <option value="">
                  {loadingClients
                    ? "Loading clients..."
                    : !value.clientId
                    ? "Select client first"
                    : loadingProjects
                    ? "Loading projects..."
                    : projectOptions.length === 0
                    ? "No projects found"
                    : "Select project"}
                </option>
                {projectOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              </div>
            </div>

          </div>
        ) : (
          /* STANDALONE FLOW */
          <div className="space-y-5">
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-4 text-sm text-amber-800 border border-amber-200">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p>
                No matching client found. Form switched to <strong>Standalone Project</strong> mode.
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

      {/* Card 2: Project summary (Only for Enterprise, when selected) */}
      {projectSource === "ENTERPRISE" && value.projectId && (
        <div className="rounded-2xl border border-slate-100 p-6 bg-slate-50/60 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
            <h3 className={Fonts.subheading}>
              Project summary
            </h3>
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
              Synced from PMS
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Project Code</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">{value.projectCode || "—"}</span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Project Duration</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">
                {getProjectDurationLabel(value)}
              </span>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Project Source</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">Enterprise (PMS)</span>
            </div>
            {matchedProject && (
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Project Manager</span>
                <span className="text-sm font-bold text-slate-800 mt-1 block">
                  {matchedProject.projectManagerName || matchedProject.projectManagerId || "—"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
