import { useEffect, useMemo, useRef, useState } from "react";

import FormDatePicker from "../../../../components/forms/FormDatePicker";
import { Fonts } from "../../../../components/Fonts/Fonts";
import SearchableSelect from "../SearchableSelect";
import { getApiErrorMessage, getBillingConfigurationClients, getBillingConfigurationProjectsByClient } from "../../services/billingConfigurationService";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { BILLING_TYPE_LABELS, BILLING_MODE_LABELS, BILLING_FREQUENCIES } from "../../data/wizardOptions";

function frequencyLabel(value) {
  return BILLING_FREQUENCIES.find((option) => option.value === value)?.label || value;
}

export default function EnterpriseProjectSelectionStep({ value = {}, onChange }) {
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const isMounted = useRef(true);

  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  useEffect(() => {
    const loadClients = async () => {
      setLoadingClients(true);
      try {
        const clientList = await getBillingConfigurationClients();
        if (!isMounted.current) return;
        setClients(clientList);
      } catch (error) {
        if (!isMounted.current) return;
        showStatusToast(getApiErrorMessage(error, "Failed to load clients."), "error");
        setClients([]);
      } finally {
        if (isMounted.current) setLoadingClients(false);
      }
    };

    loadClients();
  }, []);

  useEffect(() => {
    if (!value.clientId) {
      setProjects([]);
      return;
    }

    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const projectList = await getBillingConfigurationProjectsByClient(value.clientId);
        if (!isMounted.current) return;
        setProjects(projectList);
      } catch (error) {
        if (!isMounted.current) return;
        showStatusToast(getApiErrorMessage(error, "Failed to load projects for the selected client."), "error");
        setProjects([]);
      } finally {
        if (isMounted.current) setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [value.clientId]);

  // --- Cascading option lists: each tier only offers values consistent with prior selections ---
  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.clientId, label: client.clientName })),
    [clients]
  );

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: project.projectName })),
    [projects]
  );

  const matchedProject = useMemo(
    () => projects.find((project) => project.id === value.projectId) || null,
    [projects, value.projectId]
  );

  const projectCodeOptions = useMemo(
    () => (matchedProject ? [{ value: matchedProject.projectCode, label: matchedProject.projectCode }] : []),
    [matchedProject]
  );

  const isCodeConfirmed = Boolean(value.projectCode) && matchedProject?.projectCode === value.projectCode;

  const currencyOptions = useMemo(
    () => (isCodeConfirmed ? [{ value: matchedProject.currency, label: matchedProject.currency }] : []),
    [isCodeConfirmed, matchedProject]
  );

  const billingTypeOptions = useMemo(
    () =>
      isCodeConfirmed
        ? [
            {
              value: matchedProject.billingType,
              label: BILLING_TYPE_LABELS[matchedProject.billingType] || matchedProject.billingType,
            },
          ]
        : [],
    [isCodeConfirmed, matchedProject]
  );

  const billingModeOptions = useMemo(
    () =>
      isCodeConfirmed
        ? [
            {
              value: matchedProject.billingMode,
              label: BILLING_MODE_LABELS[matchedProject.billingMode] || matchedProject.billingMode,
            },
          ]
        : [],
    [isCodeConfirmed, matchedProject]
  );

  const billingFrequencyOptions = useMemo(
    () =>
      isCodeConfirmed
        ? [{ value: matchedProject.billingFrequency, label: frequencyLabel(matchedProject.billingFrequency) }]
        : [],
    [isCodeConfirmed, matchedProject]
  );

  // --- Handlers: each selection clears any downstream fields that depended on it ---
  const handleClientChange = (event) => {
    const clientId = event.target.value;
    const clientName = clientOptions.find((option) => option.value === clientId)?.label || "";
    onChange({ clientId, clientName });
  };

  const handleProjectChange = (event) => {
    const projectId = event.target.value;
    const project = projects.find((item) => item.id === projectId);
    onChange({
      clientId: value.clientId,
      clientName: value.clientName,
      projectId,
      projectName: project?.projectName || "",
    });
  };

  const handleProjectCodeChange = (event) => {
    onChange({
      clientId: value.clientId,
      clientName: value.clientName,
      projectId: value.projectId,
      projectName: value.projectName,
      projectCode: event.target.value,
    });
  };

  const handleLeafFieldChange = (field) => (event) => {
    onChange({ ...value, [field]: event.target.value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Project Information</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select project information and billing details from enterprise records.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SearchableSelect
          label="Client Name"
          name="clientId"
          value={value.clientId || ""}
          onChange={handleClientChange}
          options={clientOptions}
          placeholder={loadingClients ? "Loading clients..." : "Select client"}
          disabled={loadingClients}
        />
        <SearchableSelect
          label="Project Name"
          name="projectId"
          value={value.projectId || ""}
          onChange={handleProjectChange}
          options={projectOptions}
          placeholder={loadingProjects ? "Loading projects..." : value.clientId ? "Select project" : "Select client first"}
          disabled={loadingClients || loadingProjects || !value.clientId}
        />

        <SearchableSelect
          label="Project Code"
          name="projectCode"
          value={value.projectCode || ""}
          onChange={handleProjectCodeChange}
          options={projectCodeOptions}
          placeholder={value.projectId ? "Select project code" : "Select project first"}
          disabled={!value.projectId}
        />
        <SearchableSelect
          label="Currency"
          name="currency"
          value={value.currency || ""}
          onChange={handleLeafFieldChange("currency")}
          options={currencyOptions}
          placeholder={isCodeConfirmed ? "Select currency" : "Select project code first"}
          disabled={!isCodeConfirmed}
        />

        <SearchableSelect
          label="Billing Type"
          name="billingType"
          value={value.billingType || ""}
          onChange={handleLeafFieldChange("billingType")}
          options={billingTypeOptions}
          placeholder={isCodeConfirmed ? "Select billing type" : "Select project code first"}
          disabled={!isCodeConfirmed}
        />
        <SearchableSelect
          label="Billing Mode"
          name="billingMode"
          value={value.billingMode || ""}
          onChange={handleLeafFieldChange("billingMode")}
          options={billingModeOptions}
          placeholder={isCodeConfirmed ? "Select billing mode" : "Select project code first"}
          disabled={!isCodeConfirmed}
        />

        <SearchableSelect
          label="Billing Frequency"
          name="billingFrequency"
          value={value.billingFrequency || ""}
          onChange={handleLeafFieldChange("billingFrequency")}
          options={billingFrequencyOptions}
          placeholder={isCodeConfirmed ? "Select billing frequency" : "Select project code first"}
          disabled={!isCodeConfirmed}
        />
        <FormDatePicker
          label="Project Start Date"
          name="startDate"
          value={value.startDate || ""}
          onChange={handleLeafFieldChange("startDate")}
          min={isCodeConfirmed ? matchedProject.startDate : undefined}
          max={isCodeConfirmed ? matchedProject.startDate : undefined}
          disabled={!isCodeConfirmed}
        />

        <FormDatePicker
          label="Project End Date"
          name="endDate"
          value={value.endDate || ""}
          onChange={handleLeafFieldChange("endDate")}
          min={isCodeConfirmed ? matchedProject.endDate : undefined}
          max={isCodeConfirmed ? matchedProject.endDate : undefined}
          disabled={!isCodeConfirmed}
        />
      </div>
    </div>
  );
}
