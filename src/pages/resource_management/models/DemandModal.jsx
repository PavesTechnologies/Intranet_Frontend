import { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, Transition, Listbox, Switch, Combobox } from "@headlessui/react";
import {
  CheckIcon,
  ChevronUpDownIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/20/solid";
import { createDemand, updateDemandStatus } from "../services/projectService";
import { handleDMDecision, handleRMDecision } from "../services/demandService";
import { getRoleExpectations } from "../services/workforceService";
import { fetchResourcesByProjectId } from "../services/resource";
import * as demandService from "../services/demandService";
import { toast } from "react-toastify";

import { useEnums } from "@/pages/resource_management/hooks/useEnums";

/* -------------------- Shared Components -------------------- */

const FormField = ({ id, label, error, note, required, children, className = "" }) => (
  <div className={`w-full ${className}`} id={id}>
    <label className="text-[11px] text-slate-500 mb-1.5 block font-semibold uppercase tracking-wider">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    <div className="h-5">
      {error ? (
        <Transition
          show={!!error}
          enter="transition-all duration-200"
          enterFrom="opacity-0 -translate-y-1"
          enterTo="opacity-100 translate-y-0"
          leave="transition-all duration-150"
          leaveFrom="opacity-100 translate-y-0"
          leaveTo="opacity-0 -translate-y-1"
        >
          <p className="text-red-500 text-[10px] mt-1 font-medium">{error}</p>
        </Transition>
      ) : note ? (
        <p className="text-red-500 text-[10px] mt-1 font-medium italic">{note}</p>
      ) : null}
    </div>
  </div>
);

const SearchableListboxField = ({ id, label, value, onChange, options, error, required = true, placeholder = "Search and select...", disabled = false, emptyMessage = "Nothing found." }) => {
  const [query, setQuery] = useState("");

  const filteredOptions = query === ""
    ? options
    : options.filter((opt) => {
      const optLabel = typeof opt === "string" ? opt : opt.label;
      return optLabel.toLowerCase().includes(query.toLowerCase());
    });

  const selectedOption = options.find((opt) => {
    const optValue = typeof opt === "string" ? opt : opt.value;
    return String(optValue) === String(value);
  });
  const displayLabel = typeof selectedOption === "string"
    ? selectedOption
    : (selectedOption?.label || (typeof value === "string" ? value : ""));

  return (
    <FormField id={id} label={label} error={error} required={required}>
      <Combobox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Combobox.Button as="div" className={`relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-sm border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all ${disabled ? "bg-slate-50 cursor-not-allowed" : ""}`}>
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
            <Combobox.Input
              className={`w-full border-none py-2.5 pl-9 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 ${error ? "bg-red-50/30" : "bg-white"} ${disabled ? "bg-slate-50 cursor-not-allowed text-slate-400" : ""}`}
              displayValue={() => displayLabel}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              autoComplete="off"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronUpDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
          </Combobox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <Combobox.Options className="absolute z-[100] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm border border-slate-100">
              {filteredOptions.length === 0 ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700 italic">
                  {query !== "" ? "Nothing found." : emptyMessage}
                </div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const optValue = typeof opt === "string" ? opt : opt.value;
                  const optLabel = typeof opt === "string" ? opt : opt.label;
                  return (
                    <Combobox.Option
                      key={idx}
                      value={optValue}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2.5 pl-10 pr-4 transition-colors ${active ? "bg-blue-600 text-white" : "text-gray-900"
                        }`
                      }
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`block truncate ${selected ? "font-semibold" : "font-normal"}`}>
                            {optLabel}
                          </span>
                          {selected ? (
                            <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? "text-white" : "text-blue-600"}`}>
                              <CheckIcon className="h-4 w-4" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  );
                })
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </FormField>
  );
};

const ListboxField = ({ id, label, value, onChange, options, error, note, required = true, placeholder = "Select", disabled = false }) => {
  const selectedOption = options.find((opt) => {
    const optValue = typeof opt === "string" ? opt : opt.value;
    return String(optValue) === String(value);
  });
  const displayLabel = typeof selectedOption === "string"
    ? selectedOption
    : (selectedOption?.label || (typeof value === "string" && value ? value : placeholder));

  return (
    <FormField id={id} label={label} error={error} note={note} required={required}>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <Listbox.Button
            className={`w-full rounded-lg border bg-white py-2.5 pl-3 pr-10 text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
              ${error ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}
              ${disabled ? "bg-slate-50 cursor-not-allowed text-slate-400" : "text-slate-900"}
            `}
          >
            <span className={`block truncate ${!value ? "text-slate-400" : ""}`}>
              {displayLabel}
            </span>
            <ChevronUpDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </Listbox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute z-[60] mt-1 w-full rounded-lg bg-white shadow-xl border border-slate-200 max-h-60 overflow-auto focus:outline-none py-1">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-400 text-center italic">
                  No options available
                </div>
              ) : (
                options.map((opt, idx) => {
                  const optValue = typeof opt === "string" ? opt : opt.value;
                  const optLabel = typeof opt === "string" ? opt : opt.label;
                  return (
                    <Listbox.Option
                      key={idx}
                      value={optValue}
                      className={({ active }) =>
                        `cursor-pointer select-none px-3 py-2 text-sm transition-colors ${active ? "bg-blue-50 text-blue-700" : "text-slate-700"
                        }`
                      }
                    >
                      {({ selected }) => (
                        <div className="flex items-center justify-between">
                          <span className={`block truncate ${selected ? "font-bold" : "font-normal"}`}>
                            {optLabel}
                          </span>
                          {selected && <CheckIcon className="h-4 w-4 text-blue-600" />}
                        </div>
                      )}
                    </Listbox.Option>
                  );
                })
              )}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </FormField>
  );
};

/* -------------------- Initial State (PascalCase) -------------------- */

const emptyForm = {
  id: "",
  demandId: "",
  projectId: "",
  demandName: "",
  deliveryRole: "",
  demandType: "NET_NEW",
  outgoingResourceId: "",
  demandStartDate: "",
  demandEndDate: "",
  allocationPercentage: "",
  resourcesRequired: 1,
  minExp: "",
  deliveryModel: "",
  demandStatus: "DRAFT",
  demandPriority: "MEDIUM",
  demandCommitment: "CONFIRMED",
  requiresAdditionalApproval: false,
  demandJustification: "",
  rejectionReason: "",
};

const toDateInputValue = (date) => {
  if (!date) return "";

  if (typeof date === "string") {
    const trimmedDate = date.trim();
    const matchedDate = trimmedDate.match(/^(\d{4}-\d{2}-\d{2})/);
    if (matchedDate) {
      return matchedDate[1];
    }
  }

  try {
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) {
      return "";
    }
    return parsedDate.toISOString().split("T")[0];
  } catch (error) {
    console.error("Date parsing error:", error, date);
    return "";
  }
};

/* -------------------- Modal -------------------- */

const DemandModal = ({ open, onClose, onSuccess, initialData = null, projectDetails, mode = "create", userRole = "" }) => {
  const { getEnumValues } = useEnums();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetchingResources, setFetchingResources] = useState(false);
  const [projectResources, setProjectResources] = useState([]);

  // Master Data
  const DEMAND_TYPES = getEnumValues("DemandType").length > 0 ? getEnumValues("DemandType") : [
    { label: "Net New", value: "NET_NEW" },
    { label: "Replacement", value: "REPLACEMENT" }
  ];
  const DEMAND_STATUSES = getEnumValues("DemandStatus");
  const PRIORITIES = getEnumValues("PriorityLevel").length > 0 ? getEnumValues("PriorityLevel") : [
    { label: "High", value: "HIGH" },
    { label: "Medium", value: "MEDIUM" },
    { label: "Low", value: "LOW" }
  ];
  const DELIVERY_MODELS = getEnumValues("DeliveryModel").length > 0 ? getEnumValues("DeliveryModel") : [
    { label: "Offshore", value: "OFFSHORE" },
    { label: "Onsite", value: "ONSITE" },
    { label: "Hybrid", value: "HYBRID" }
  ];
  const COMMITMENT_TYPES = getEnumValues("DemandCommitment").length > 0 ? getEnumValues("DemandCommitment") : [
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Soft", value: "SOFT" }
  ];

  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);

  const activeStatuses = DEMAND_STATUSES.length > 0 ? DEMAND_STATUSES : fallbackStatuses;

  const normalizedRole = String(userRole || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const isManagerOrPM = ["PROJECTMANAGER", "MANAGER"].includes(normalizedRole);

  const normalizeStatusOptions = (statuses = []) =>
    statuses
      .map((s) => (typeof s === "string" ? { label: s, value: s } : s))
      .filter((s) => s && s.value);

  const computedEditStatuses = (() => {
    if (normalizedRole === "DELIVERYMANAGER") {
      return [
        { label: "Accepted", value: "APPROVED" },
        { label: "Rejected", value: "REJECTED" }
      ];
    }
    if (isManagerOrPM) {
      return [
        { label: "Draft", value: "DRAFT" },
        { label: "Requested", value: "REQUESTED" },
        { label: "Cancelled", value: "CANCELLED" }
      ];
    }
    if (normalizedRole === "RESOURCEMANAGER") {
      return [
        { label: "Fulfilled", value: "FULFILLED" },
        { label: "Rejected", value: "REJECTED" }
      ];
    }
    return [
      { label: "FULFILLED", value: "FULFILLED" },
      { label: "REJECTED", value: "REJECTED" }
    ];
  })();


  const startDateRef = useRef(null);
  const scrollRef = useRef(null);

  const fetchRoles = async () => {
    try {
      const rolesRes = await getRoleExpectations();
      setRoles(rolesRes.data);
    } catch (err) {
      console.error("Failed to fetch master data", err);
    }
  };

  const getAllResources = async (pId) => {
    if (!pId) return;
    setFetchingResources(true);
    try {
      const res = await fetchResourcesByProjectId(pId);
      setProjectResources(res.data || []);
    } catch (err) {
      console.error("Failed to fetch resources for project", err);
      setProjectResources([]);
    } finally {
      setFetchingResources(false);
    }
  };

  const formatDate = (date) => {
    return toDateInputValue(date);
  };

  /* -------- Effects -------- */

  useEffect(() => {
    if (!open) return;
    fetchRoles();
    const pId = projectDetails?.pmsProjectId || projectDetails?.projectId || projectDetails?._id || initialData?.projectId || initialData?.ProjectId || initialData?.pmsProjectId || "";
    if (pId) {
      getAllResources(pId);
    }
  }, [open, projectDetails, initialData]);

  useEffect(() => {
    if (open) {
      const isEdit = mode === "edit";

      const pId = projectDetails?.pmsProjectId || projectDetails?.projectId || projectDetails?._id || initialData?.projectId || initialData?.ProjectId || initialData?.pmsProjectId || "";
      const sDate = (isEdit && initialData?.demandStartDate)
        ? toDateInputValue(initialData.demandStartDate)
        : (projectDetails?.startDate ? toDateInputValue(projectDetails.startDate) : (initialData?.demandStartDate ? toDateInputValue(initialData.demandStartDate) : (initialData?.slaCreatedAt ? toDateInputValue(initialData.slaCreatedAt) : "")));
      const eDate = (isEdit && initialData?.demandEndDate)
        ? toDateInputValue(initialData.demandEndDate)
        : (projectDetails?.endDate ? toDateInputValue(projectDetails.endDate) : (initialData?.demandEndDate ? toDateInputValue(initialData.demandEndDate) : (initialData?.slaDueAt ? toDateInputValue(initialData.slaDueAt) : "")));

      if (isEdit && initialData) {
        console.log("[DemandModal] Edit Mode Prefilling with:", initialData);

        const getVal = (paths, fallback = "") => {
          for (const key of paths) {
            const val = initialData[key];
            if (val !== undefined && val !== null) return val;
          }
          return fallback;
        };

        const rawAlloc = getVal(['allocationPercentage', 'Allocation', 'allocation_percentage'], initialData.allocation?.percentage || initialData.allocation || "");
        let allocation = parseFloat(rawAlloc);
        if (!isNaN(allocation) && allocation > 0 && allocation <= 1) {
          allocation = allocation * 100; // Convert decimal to percentage
        }

        // Search for deliveryRole ID by name if missing
        let roleIdFromData = getVal(['deliveryRole', 'dev_role_id', 'roleId', 'role_id', 'RoleID', 'delivery_role_id', 'delivery_role_uuid']);
        if (!roleIdFromData && (initialData.role || initialData.demandName)) {
          const rName = initialData.role || initialData.demandName;
          const found = roles.find(r => r.role === rName || r.name === rName);
          if (found) roleIdFromData = found.dev_role_id || found.id;
        }

        const mappedData = {
          ...emptyForm,
          id: getVal(['id', 'demandId', 'demand_id']),
          demandId: getVal(['demandId', 'id', 'demand_id']),
          projectId: pId,
          demandName: getVal(['demandName', 'role', 'demand_name', 'Name', 'demandRole', 'roleName']),
          demandStartDate: sDate || toDateInputValue(getVal(['demandStartDate', 'startDate', 'start_date', 'demand_start_date', 'slaCreatedAt'])),
          demandEndDate: eDate || toDateInputValue(getVal(['demandEndDate', 'endDate', 'end_date', 'demand_end_date', 'slaDueAt'])),
          allocationPercentage: isNaN(allocation) ? "" : Math.round(allocation),
          deliveryRole: roleIdFromData,
          demandStatus: String(getVal(['demandStatus', 'lifecycleState', 'status', 'LifecycleState', 'demand_status'], "DRAFT")).toUpperCase().trim(),
          demandType: String(getVal(['demandType', 'type', 'type_of_demand', 'DemandType', 'demand_type'], "NET_NEW")).toUpperCase().replace(/ /g, "_"),
          demandPriority: String(getVal(['demandPriority', 'priority', 'Priority', 'demand_priority'], "MEDIUM")).toUpperCase().trim(),
          demandCommitment: String(getVal(['demandCommitment', 'commitment', 'Commitment', 'demand_commitment'], "CONFIRMED")).toUpperCase().trim(),
          resourcesRequired: parseInt(getVal(['resourcesRequired', 'resourceRequired'], 1)),
          minExp: getVal(['minExp', 'experience', 'min_experience', 'MinExperience', 'experience_required', 'min_experience']),
          deliveryModel: String(getVal(['deliveryModel', 'model', 'DeliveryModel', 'delivery_model'], "OFFSHORE")).toUpperCase().trim(),
          demandJustification: getVal(['demandJustification', 'justification', 'Justification', 'demand_justification', 'reason', 'demandJustification']),
          requiresAdditionalApproval: !!getVal(['requiresAdditionalApproval', 'additionalApproval', 'RequiresAdditionalApproval', 'additional_approval'], false),
          outgoingResourceId: getVal(['outgoingResourceId', 'outgoing_resource_id', 'replaced_resource_id', 'replacedResourceId']) || initialData?.outgoingResource?.resourceId || "",
        };

        setForm(mappedData);


      } else {
        setForm({
          ...emptyForm,
          projectId: pId,
          demandStartDate: sDate,
          demandEndDate: eDate,
          ...initialData,
        });
      }

      // if (pId) fetchProjectResources(pId);
      setErrors({});
    }
  }, [open, initialData, projectDetails, mode]);

  // Conditional Logic Reset
  useEffect(() => {
    if (form.demandType !== "REPLACEMENT") {
      setForm(p => ({ ...p, outgoingResourceId: "" }));
    }
  }, [form.demandType]);

  const update = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[k];
        return newErrors;
      });
    }
  };

  /* -------------------- Validation -------------------- */

  const validateForm = () => {
    const e = {};

    if (mode === "edit" && !isManagerOrPM) {
      const allowedEditStatuses = computedEditStatuses.map((s) => String(s.value).toUpperCase());
      const selectedStatus = String(form.demandStatus || "").toUpperCase();
      if (!selectedStatus) {
        e.demandStatus = "Status is required";
      } else if (!allowedEditStatuses.includes(selectedStatus)) {
        e.demandStatus = "Select a valid status";
      }

      if ((normalizedRole === "DELIVERYMANAGER" || normalizedRole === "RESOURCEMANAGER") && selectedStatus === "REJECTED" && !form.rejectionReason?.trim()) {
        e.rejectionReason = "Reason for rejection is required";
      }
      // In edit mode for non-managers, we only validate the status and rejection reason as other fields are read-only
      return e;
    }

    if (!form.projectId) e.projectId = "Project selection is required";
    if (!form.demandName?.trim()) e.demandName = "Demand name is required";
    if (!form.deliveryRole) e.deliveryRole = "Role is required";
    if (!form.demandType) e.demandType = "Demand type is required";

    if (mode !== "edit" && form.demandType === "REPLACEMENT" && !form.outgoingResourceId) {
      e.outgoingResourceId = "Outgoing resource is required";
    }

    if (!form.demandStartDate) e.demandStartDate = "Start date is required";
    if (!form.demandEndDate) e.demandEndDate = "End date is required";
    if (form.demandStartDate && form.demandEndDate && form.demandEndDate < form.demandStartDate) {
      e.demandEndDate = "End date cannot be before start date";
    }

    const alloc = parseFloat(form.allocationPercentage);
    if (isNaN(alloc) || alloc < 1 || alloc > 100) {
      e.allocationPercentage = "Allocation must be 1-100";
    }

    const resReq = parseInt(form.resourcesRequired);
    if (isNaN(resReq) || resReq < 1) {
      e.resourcesRequired = "At least 1 resource is required";
    }

    if (!form.minExp) e.minExp = "Minimum experience is required";
    if (!form.deliveryModel) e.deliveryModel = "Delivery model is required";
    if (!form.demandStatus) e.demandStatus = "Status is required";
    if (!form.demandPriority) e.demandPriority = "Priority is required";
    if (!form.demandCommitment) e.demandCommitment = "Commitment type is required";

    if (!form.demandJustification?.trim()) e.demandJustification = "Justification is required";

    return e;
  };

  /* -------------------- Submit -------------------- */

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.warning("Please correct the errors in the form");

      const firstErrorKey = Object.keys(validationErrors)[0];
      const errorElement = document.getElementById(`field-${firstErrorKey}`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setLoading(true);
    try {
      if (mode === "edit") {
        const id = form.demandId || form.id || initialData?.demandId || initialData?.id;

        if (normalizedRole === "DELIVERYMANAGER") {
          const dmPayload = {
            demandId: id,
            decision: form.demandStatus,
            rejectionReason: form.demandStatus === "REJECTED"
              ? form.rejectionReason.trim()
              : null
          };
          const res = await handleDMDecision(dmPayload);
          toast.success(res?.message || "Decision submitted successfully");
          if (onSuccess) onSuccess();
          onClose();
          return;
        }

        if (normalizedRole === "RESOURCEMANAGER") {
          const rmPayload = {
            demandId: id,
            decision: form.demandStatus,
            rejectionReason: form.demandStatus === "REJECTED"
              ? form.rejectionReason.trim()
              : null
          };
          const res = await handleRMDecision(rmPayload);
          toast.success(res?.message || "Decision submitted successfully");
          if (onSuccess) onSuccess();
          onClose();
          return;
        }

        // Default path for RM and others
        // Append time components to satisfy java.time.LocalDateTime requirement
        const submissionData = {
          ...form,
          id,
          demandId: id,
          demandStartDate: form.demandStartDate ? (form.demandStartDate.includes('T') ? form.demandStartDate : `${form.demandStartDate}T00:00:00`) : null,
          demandEndDate: form.demandEndDate ? (form.demandEndDate.includes('T') ? form.demandEndDate : `${form.demandEndDate}T23:59:59`) : null,
        };
        const res = await updateDemandStatus(submissionData);
        toast.success(res.message || "Demand updated successfully");
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      // Append time components to satisfy java.time.LocalDateTime requirement
      const submissionData = {
        ...form,
        demandStartDate: form.demandStartDate ? `${form.demandStartDate}T00:00:00` : null,
        demandEndDate: form.demandEndDate ? `${form.demandEndDate}T23:59:59` : null,
      };

      const res = await createDemand(submissionData);
      toast.success(res.message || "Demand saved successfully");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save demand");
    } finally {
      setLoading(false);
    }
  };

  /* -------------------- UI -------------------- */

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel
                className="
                  w-full
                  max-w-2xl
                  overflow-hidden
                  rounded-2xl
                  bg-white
                  shadow-2xl
                  flex flex-col
                  max-h-[90vh]
                "
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
                  <div>
                    <Dialog.Title className="text-lg font-bold text-slate-900">
                      {mode === "edit" || initialData ? "Update Demand" : "Create New Demand"}
                    </Dialog.Title>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure staffing requirements for your project
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">

                    {/* Project */}
                    {/* {(!!projectDetails || !!initialData) ? (
                      <FormField id="field-ProjectName" label="Project" required>
                        <input
                          type="text"
                          value={projectDetails?.name || projectDetails?.projectName || initialData?.projectName || initialData?.ProjectName || "Loading..."}
                          disabled
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-500 cursor-not-allowed font-medium"
                        />
                      </FormField>
                    ) : (
                      <ListboxField
                        id="field-projectId"
                        label="Project"
                        value={form.projectId}
                        onChange={(v) => update("projectId", v)}
                        options={projects.map((p) => ({ label: p.projectName || p.name, value: p.projectId || p.pmsProjectId || p._id }))}
                        error={errors.projectId}
                        placeholder="Select Project"
                        required
                        disabled={mode === "edit"}
                      />
                    )} */}
                    <FormField id="field-ProjectName" label="Project" required>
                      <input
                        type="text"
                        value={projectDetails?.name || projectDetails?.projectName || initialData?.projectName || initialData?.ProjectName || "Loading..."}
                        disabled
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-500 cursor-not-allowed font-medium"
                      />
                    </FormField>

                    {/* Demand Name */}
                    <FormField id="field-demandName" label="Demand Name" error={errors.demandName} required>
                      <input
                        type="text"
                        placeholder="e.g. Senior Frontend Dev"
                        value={form.demandName}
                        onChange={(e) => update("demandName", e.target.value)}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.demandName ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                      />
                    </FormField>

                    {/* Role -> Delivery Role */}
                    <SearchableListboxField
                      id="field-deliveryRole"
                      label="Delivery Role"
                      value={form.deliveryRole}
                      onChange={(v) => update("deliveryRole", v)}
                      options={roles.map((r) => ({ label: r.role, value: r.dev_role_id }))}
                      error={errors.deliveryRole}
                      placeholder="Search and Select Role"
                      required
                      disabled={mode === "edit" && !isManagerOrPM}
                    />

                    {/* Demand Type */}
                    <ListboxField
                      id="field-demandType"
                      label="Demand Type"
                      value={form.demandType}
                      onChange={(v) => update("demandType", v)}
                      options={DEMAND_TYPES}
                      error={errors.demandType}
                      placeholder="Select Type"
                      required
                      disabled={mode === "edit" && !isManagerOrPM}
                    />

                    {/* Conditional: Outgoing Resource (for REPLACEMENT) */}
                    {form.demandType === "REPLACEMENT" && (
                      <div className="md:col-span-2">
                        <SearchableListboxField
                          id="field-outgoingResourceId"
                          label="Outgoing Resource"
                          value={form.outgoingResourceId}
                          onChange={(v) => update("outgoingResourceId", v)}
                          options={projectResources.map((r) => ({ label: `${r.resourceName} (${r.resourceRole})`, value: r.resourceId }))}
                          error={errors.outgoingResourceId}
                          placeholder={fetchingResources ? "Loading resources..." : "Search and select resource to replace"}
                          required={mode !== "edit"}
                          disabled={fetchingResources || (mode === "edit" && !isManagerOrPM)}
                          emptyMessage="No Resources Allocated to the Project."
                        />
                      </div>
                    )}

                    {/* Start Date -> Demand Start Date */}
                    <FormField id="field-demandStartDate" label="Demand Start Date" error={errors.demandStartDate} required>
                      <input
                        type="date"
                        value={form.demandStartDate}
                        min={formatDate(projectDetails?.startDate)}
                        max={formatDate(projectDetails?.endDate)}
                        onChange={(e) => update("demandStartDate", e.target.value)}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.demandStartDate ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                      />
                    </FormField>

                    {/* End Date -> Demand End Date */}
                    <FormField id="field-demandEndDate" label="Demand End Date" error={errors.demandEndDate} required>
                      <input
                        type="date"
                        value={form.demandEndDate}
                        min={form.demandStartDate || formatDate(projectDetails?.startDate)}
                        max={formatDate(projectDetails?.endDate)}
                        onChange={(e) => update("demandEndDate", e.target.value)}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.demandEndDate ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                      />
                    </FormField>

                    {/* Allocation % */}
                    <FormField id="field-allocationPercentage" label="Allocation %" error={errors.allocationPercentage} required>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="1 - 100"
                          value={form.allocationPercentage}
                          onChange={(e) => update("allocationPercentage", e.target.value)}
                          disabled={mode === "edit" && !isManagerOrPM}
                          className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.allocationPercentage ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium">%</span>
                      </div>
                    </FormField>

                    {/* Resources Required */}
                    <FormField id="field-resourcesRequired" label="Resources Required" error={errors.resourcesRequired} required>
                      <input
                        type="number"
                        min="1"
                        placeholder="min 1"
                        value={form.resourcesRequired}
                        onChange={(e) => update("resourcesRequired", e.target.value)}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.resourcesRequired ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                      />
                    </FormField>

                    {/* Min Experience */}
                    <FormField id="field-minExp" label="Min Experience (Yrs)" error={errors.minExp} required>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 5"
                        value={form.minExp}
                        onChange={(e) => update("minExp", e.target.value)}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.minExp ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                      />
                    </FormField>

                    {/* Delivery Model */}
                    <ListboxField
                      id="field-deliveryModel"
                      label="Delivery Model"
                      value={form.deliveryModel}
                      onChange={(v) => update("deliveryModel", v)}
                      options={DELIVERY_MODELS}
                      error={errors.deliveryModel}
                      placeholder="Select Model"
                      required
                      disabled={mode === "edit" && !isManagerOrPM}
                    />

                    {/* Demand Status */}
                    <ListboxField
                      id="field-demandStatus"
                      label="Demand Status"
                      value={form.demandStatus}
                      onChange={(v) => update("demandStatus", v)}
                      options={mode === "edit" ? computedEditStatuses : normalizeStatusOptions(activeStatuses)}
                      error={errors.demandStatus}
                      placeholder="Select Status"
                      required
                    />

                    {/* Rejection Reason for DM/RM */}
                    {mode === "edit" && (normalizedRole === "DELIVERYMANAGER" || normalizedRole === "RESOURCEMANAGER") && form.demandStatus === "REJECTED" && (
                      <FormField id="field-rejectionReason" label="Rejection Reason" error={errors.rejectionReason} required className="md:col-span-2">
                        <textarea
                          rows={2}
                          placeholder="Explain why this demand is being rejected..."
                          value={form.rejectionReason}
                          onChange={(e) => update("rejectionReason", e.target.value)}
                          className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.rejectionReason ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"}`}
                        />
                      </FormField>
                    )}

                    {/* Priority */}
                    <ListboxField
                      id="field-demandPriority"
                      label="Priority Level"
                      value={form.demandPriority}
                      onChange={(v) => update("demandPriority", v)}
                      options={PRIORITIES}
                      error={errors.demandPriority}
                      placeholder="Select Priority"
                      required
                      disabled={mode === "edit" && !isManagerOrPM}
                    />

                    <ListboxField
                      id="field-demandCommitment"
                      label="Demand Commitment"
                      value={form.demandCommitment}
                      onChange={(v) => update("demandCommitment", v)}
                      options={COMMITMENT_TYPES}
                      error={errors.demandCommitment}
                      note={form.demandCommitment === "SOFT" ? "Note: This Demand will expire in 30 days" : ""}
                      placeholder="Select Commitment"
                      required
                      disabled={mode === "edit" && !isManagerOrPM}
                    />

                    {/* Additional Approval Checkbox */}
                    <div className="md:col-span-2 flex items-center gap-3 py-3 px-1">
                      <Switch
                        checked={form.requiresAdditionalApproval}
                        onChange={(v) => update("requiresAdditionalApproval", v)}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`${form.requiresAdditionalApproval ? 'bg-blue-600' : 'bg-slate-200'
                          } relative inline-flex h-5 w-10 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white/75 ${mode === "edit" && !isManagerOrPM ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                      >
                        <span className="sr-only">Additional Approval</span>
                        <span
                          aria-hidden="true"
                          className={`${form.requiresAdditionalApproval ? 'translate-x-5' : 'translate-x-0'
                            } pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                        />
                      </Switch>
                      <label className={`text-sm font-medium text-slate-700 select-none ${mode === "edit" && !isManagerOrPM ? "cursor-not-allowed" : "cursor-pointer"}`} onClick={() => (mode !== "edit" || isManagerOrPM) && update("requiresAdditionalApproval", !form.requiresAdditionalApproval)}>
                        Requires Additional Leadership Approval
                      </label>
                    </div>

                    {/* Justification */}
                    <FormField id="field-demandJustification" label="Demand Justification" error={errors.demandJustification} required className="md:col-span-2">
                      <textarea
                        rows={3}
                        placeholder="Explain why this resource is needed..."
                        value={form.demandJustification}
                        onChange={(e) => update("demandJustification", e.target.value)}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.demandJustification ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                      />
                    </FormField>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-2xl">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="
                      min-w-[140px]
                      px-6 py-2
                      bg-blue-600 hover:bg-blue-700
                      disabled:bg-slate-300 disabled:cursor-not-allowed
                      text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-600/20
                      transition-all active:scale-[0.98]
                      flex items-center justify-center gap-2
                    "
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      mode === "edit" || initialData ? "Update Demand" : "Create Demand"
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default DemandModal;
