import { Fragment, useEffect, useRef, useState, useMemo } from "react";
import { Dialog, Transition, Listbox, Combobox } from "@headlessui/react";
import {
  CheckIcon,
  ChevronDownIcon,
  CloseIcon,
  SearchIcon,
} from "@/components/icons";
import { createDemand, updateDemandStatus } from "../services/projectService";
import { handleDMDecision, handleRMDecision } from "../services/demandService";
import { getRoleExpectations } from "../services/workforceService";

import * as demandService from "../services/demandService";
import { notify } from "../utils/notify";
import {
  canProjectManagerEditDemand,
  PM_EDITABLE_DEMAND_MESSAGE,
} from "../demand/utils/demandPermissions";

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

const SearchableListboxField = ({ id, label, value, onChange, options, error, required = true, placeholder = "Search And Select...", disabled = false, emptyMessage = "Nothing Found." }) => {
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
              <SearchIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
            </div>
            <Combobox.Input
              className={`w-full border-none py-2.5 pl-9 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 ${error ? "bg-red-50/30" : "bg-white"} ${disabled ? "bg-slate-50 cursor-not-allowed text-slate-400" : ""}`}
              displayValue={() => displayLabel}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              autoComplete="off"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <ChevronDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
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
                  {query !== "" ? "Nothing Found." : emptyMessage}
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
            <ChevronDownIcon className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                  No Options Available
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
  demandType: "",
  demandStartDate: "",
  demandEndDate: "",
  allocationPercentage: "",
  resourcesRequired: "",
  minExp: "",
  deliveryModel: "",
  demandStatus: "",
  demandPriority: "",
  demandCommitment: "",
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

const toNumberOrNull = (value) => {
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const toLongOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const getRoleId = (role = {}) =>
  role.role_id ||
  role.deliveryRoleId ||
  role.roleId ||
  role.role_id ||
  role.id ||
  "";

const getRoleName = (role = {}) =>
  role.role ||
  role.name ||
  role.roleName ||
  role.deliveryRole ||
  "";

const resolveRoleId = (value, roles = []) => {
  if (!value) return "";
  const valueText = String(value).trim();
  const valueKey = valueText.toLowerCase();

  const matchedById = roles.find((role) => String(getRoleId(role)).trim() === valueText);
  if (matchedById) return getRoleId(matchedById);

  const matchedByName = roles.find((role) => String(getRoleName(role)).trim().toLowerCase() === valueKey);
  return matchedByName ? getRoleId(matchedByName) : value;
};

const buildUpdateDemandPayload = (form, id) => {
  const allocationPercentage = toNumberOrNull(form.allocationPercentage);
  const resourcesRequired = parseInt(form.resourcesRequired, 10);
  const minExp = toNumberOrNull(form.minExp);

  return {
    demandId: id,
    demandType: form.demandType,
    demandName: form.demandName,
    minExp,
    deliveryRole: form.deliveryRole,

    demandJustification: form.demandJustification,
    demandStartDate: form.demandStartDate || null,
    demandEndDate: form.demandEndDate || null,
    allocationPercentage,
    deliveryModel: form.deliveryModel,
    demandPriority: form.demandPriority,
    demandStatus: form.demandStatus,
    lifecycleState: form.demandStatus,
    status: form.demandStatus,
    demandCommitment: form.demandCommitment,
    resourcesRequired,
    modifiedBy: form.modifiedBy || null,
  };
};


const buildCreateDemandPayload = (form, id) => {
  const payload = {
    ...buildUpdateDemandPayload(form, id),
    projectId: form.projectId,
  };

  if (!id) {
    delete payload.demandId;
  }

  return payload;
};

const normalizeStatusOptions = (statuses = []) =>
  statuses
    .map((s) => (typeof s === "string" ? { label: s, value: s } : s))
    .filter((s) => s && s.value);

/* -------------------- Modal -------------------- */

const DemandModal = ({ open, onClose, onSuccess, initialData = null, projectDetails, mode = "create", userRole = "" }) => {
  const { getEnumValues } = useEnums();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const startDateRef = useRef(null);

  const scrollRef = useRef(null);

  const [roles, setRoles] = useState([]);
  const [locations, setLocations] = useState([]);

  // Memoized Master Data
  const DEMAND_TYPES = useMemo(() => {
    const vals = getEnumValues("DemandType");
    const statuses = normalizeStatusOptions(vals);
    const hiddenDemandTypes = new Set(["REPLACEMENT", "BACK_FILL", "BACKFILL"]);
    const filtered = statuses.filter((s) => {
      const value = String(s.value || "").toUpperCase().replace(/[\s-]+/g, "_");
      return !hiddenDemandTypes.has(value);
    });
    return filtered.length > 0 ? filtered : [{ label: "Net New", value: "NET_NEW" }];
  }, [getEnumValues]);



  const DEMAND_STATUSES = useMemo(() => {
    const vals = getEnumValues("DemandStatus");
    const statuses = normalizeStatusOptions(vals);
    return statuses.filter(s => s.value !== "CANCELLED");
  }, [getEnumValues]);


  const PRIORITIES = useMemo(() => {
    const vals = getEnumValues("PriorityLevel");
    const titleCase = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return vals.length > 0
      ? vals.map(v => ({ label: titleCase(String(v)), value: String(v).toUpperCase() }))
      : [
        { label: "High", value: "HIGH" },
        { label: "Medium", value: "MEDIUM" },
        { label: "Low", value: "LOW" }
      ];
  }, [getEnumValues]);

  const DELIVERY_MODELS = useMemo(() => {
    const vals = getEnumValues("DeliveryModel");
    return vals.length > 0 ? normalizeStatusOptions(vals) : [
      { label: "Offshore", value: "OFFSHORE" },
      { label: "Onsite", value: "ONSITE" },
      { label: "Hybrid", value: "HYBRID" }
    ];
  }, [getEnumValues]);

  const COMMITMENT_TYPES = useMemo(() => {
    const vals = getEnumValues("DemandCommitment");
    return vals.length > 0 ? normalizeStatusOptions(vals) : [
      { label: "Confirmed", value: "CONFIRMED" },
      { label: "Soft", value: "SOFT" }
    ];
  }, [getEnumValues]);

  const activeStatuses = DEMAND_STATUSES.length > 0 ? DEMAND_STATUSES : [
    { label: "Draft", value: "DRAFT" },
    { label: "Requested", value: "REQUESTED" }
  ];

  const normalizedRole = String(userRole || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  const isManagerOrPM = ["PROJECTMANAGER", "MANAGER"].includes(normalizedRole);


  const computedEditStatuses = useMemo(() => {
    if (normalizedRole === "DELIVERYMANAGER") {
      return [
        { label: "Accepted", value: "APPROVED" },
        { label: "Rejected", value: "REJECTED" }
      ];
    }
    if (isManagerOrPM) {
      return [
        { label: "Draft", value: "DRAFT" },
        { label: "Requested", value: "REQUESTED" }
      ];
    }
    if (normalizedRole === "RESOURCEMANAGER") {
      return [
        { label: "Fulfilled", value: "FULFILLED" },
        { label: "Rejected", value: "REJECTED" }
      ];
    }
    return [
      { label: "Fulfilled", value: "FULFILLED" },
      { label: "Rejected", value: "REJECTED" }
    ];
  }, [normalizedRole, isManagerOrPM]);


  const fetchRoles = async () => {
    try {
      const rolesRes = await getRoleExpectations();
      setRoles(rolesRes.data);
    } catch (err) {
      console.error("Failed to fetch master data", err);
    }
  };

  const formatDate = (date) => {

    return toDateInputValue(date);
  };

  /* -------- Effects -------- */

  useEffect(() => {
    if (!open) return;
    fetchRoles();
  }, [open, projectDetails, initialData]);


  const isInitialized = useRef(false);

  useEffect(() => {
    if (!open) {
      isInitialized.current = false;
      return;
    }
    if (isInitialized.current) return;

    const isEdit = mode === "edit";

    const pId = projectDetails?.pmsProjectId || projectDetails?.projectId || projectDetails?._id || initialData?.projectId || initialData?.ProjectId || initialData?.pmsProjectId || "";
    const sDate = (isEdit && initialData?.demandStartDate)
      ? toDateInputValue(initialData.demandStartDate)
      : (projectDetails?.startDate ? toDateInputValue(projectDetails.startDate) : (initialData?.demandStartDate ? toDateInputValue(initialData.demandStartDate) : (initialData?.slaCreatedAt ? toDateInputValue(initialData.slaCreatedAt) : "")));
    const eDate = (isEdit && initialData?.demandEndDate)
      ? toDateInputValue(initialData.demandEndDate)
      : (projectDetails?.endDate ? toDateInputValue(projectDetails.endDate) : (initialData?.demandEndDate ? toDateInputValue(initialData.demandEndDate) : (initialData?.slaDueAt ? toDateInputValue(initialData.slaDueAt) : "")));

    if (isEdit && initialData) {
      // console.log("[DemandModal] Edit Mode Prefilling with:", initialData);

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

      const getRoleValue = () => {
        const rawRole = initialData.deliveryRole || initialData.role || initialData.demandRole || initialData.deliveryRoleName || initialData.roleName || "";
        if (rawRole && typeof rawRole === 'object') {
          return getRoleId(rawRole) || getRoleName(rawRole) || "";
        }
        return getVal(['roleId', 'role_id']);
      };

      const roleValueFromData = getRoleValue();
      const roleNameFromData = (typeof initialData.deliveryRole === 'object') ? getRoleName(initialData.deliveryRole) : getVal(['deliveryRoleName', 'deliveryRole', 'roleName', 'role_name', 'role']);
      const resolvedRoleId = resolveRoleId(roleValueFromData, roles);

      const mappedData = {
        ...emptyForm,
        id: getVal(['id', 'demandId', 'demand_id']),
        demandId: getVal(['demandId', 'id', 'demand_id']),
        projectId: pId,
        demandName: getVal(['demandName', 'role', 'demand_name', 'Name', 'demandRole', 'roleName']),
        demandStartDate: sDate || toDateInputValue(getVal(['demandStartDate', 'startDate', 'start_date', 'demand_start_date', 'slaCreatedAt'])),
        demandEndDate: eDate || toDateInputValue(getVal(['demandEndDate', 'endDate', 'end_date', 'demand_end_date', 'slaDueAt'])),
        allocationPercentage: isNaN(allocation) ? "" : Math.round(allocation),
        deliveryRole: resolvedRoleId || roleValueFromData || "",
        deliveryRoleName: roleNameFromData,
        demandStatus: String(getVal(['demandStatus', 'lifecycleState', 'status', 'LifecycleState', 'demand_status'])).toUpperCase().trim(),
        demandType: String(getVal(['demandType', 'type', 'type_of_demand', 'DemandType', 'demand_type'])).toUpperCase().replace(/ /g, "_"),
        demandPriority: String(getVal(['demandPriority', 'priority', 'Priority', 'demand_priority'])).toUpperCase().trim(),
        demandCommitment: String(getVal(['demandCommitment', 'commitment', 'Commitment', 'demand_commitment'])).toUpperCase().trim(),
        resourcesRequired: getVal(['resourcesRequired', 'resourceRequired', 'resource_required', 'requiredResources', 'ResourcesRequired']),
        minExp: getVal(['minExp', 'experience', 'minimumExperience', 'min_experience', 'MinExperience', 'experience_required', 'min_experience', 'MinExp']),
        deliveryModel: String(getVal(['deliveryModel', 'model', 'DeliveryModel', 'delivery_model', 'Delivery_Model'])).toUpperCase().trim(),
        demandJustification: getVal(['demandJustification', 'justification', 'Justification', 'demand_justification', 'reason', 'demandJustification', 'DemandJustification']),
      };


      setForm(mappedData);
    } else {
      // Merge initialData but normalize common keys for pre-fill
      const baseData = {
        ...emptyForm,
        projectId: pId,
        demandStartDate: sDate,
        demandEndDate: eDate,
      };

      if (initialData) {
        Object.keys(initialData).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey === 'priority' || lowerKey === 'demandpriority') baseData.demandPriority = String(initialData[key]).toUpperCase();
          if (lowerKey === 'status' || lowerKey === 'lifecyclestate' || lowerKey === 'demandstatus') baseData.demandStatus = String(initialData[key]).toUpperCase();
          if (lowerKey === 'role' || lowerKey === 'deliveryrole' || lowerKey === 'demandname') baseData.demandName = initialData[key];
        });
      }

      setForm({ ...baseData, ...initialData });
    }

    setErrors({});
    isInitialized.current = true;
  }, [open, initialData, projectDetails, mode]);




  useEffect(() => {
  if (!open || mode !== "edit" || roles.length === 0 || !initialData) return;

  const sourceRole =
    initialData.deliveryRoleId ||
    initialData.roleId ||
    initialData.role_id ||
    initialData.deliveryRole ||
    initialData.role ||
    initialData.roleName;

  const resolvedRoleId = resolveRoleId(sourceRole, roles);

  if (resolvedRoleId) {
    setForm((prev) => ({
      ...prev,
      deliveryRole: resolvedRoleId,
    }));
  }
}, [open, mode, roles, initialData]);

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

    // For non-manager/PM users in edit mode, only validate status and rejection reason
    if (mode === "edit" && !isManagerOrPM) {
      const allowedEditStatuses = computedEditStatuses.map((s) => String(s.value).toUpperCase());
      const selectedStatus = String(form.demandStatus || "").toUpperCase();
      if (!selectedStatus) {
        e.demandStatus = "Status Is Required";
      } else if (!allowedEditStatuses.includes(selectedStatus)) {
        e.demandStatus = "Select A Valid Status";
      }

      if ((normalizedRole === "DELIVERYMANAGER" || normalizedRole === "RESOURCEMANAGER") && selectedStatus === "REJECTED" && !form.rejectionReason?.trim()) {
        e.rejectionReason = "Reason For Rejection Is Required";
      }
      // In edit mode for non-managers, we only validate the status and rejection reason as other fields are read-only
      return e;
    }

    // For create mode OR edit mode with manager/PM, validate all fields
    if (!form.projectId) e.projectId = "Project Selection Is Required";
    if (!form.demandName?.trim()) e.demandName = "Demand Name Is Required";
    if (!form.deliveryRole) e.deliveryRole = "Role Is Required";
    if (!form.demandType) e.demandType = "Demand Type Is Required";



    if (!form.demandStartDate) {
      e.demandStartDate = "Start Date Is Required";
    } else {
      // Check if start date is today or future (only for create mode)
      if (mode !== "edit") {
        const today = new Date().toISOString().split("T")[0];
        if (form.demandStartDate < today) {
          e.demandStartDate = "Start Date Must Be Today Or A Future Date";
        }
      }

      // Check if start date is within project date range (for both create and edit)
      const projectStartDate = toDateInputValue(projectDetails?.startDate);
      const projectEndDate = toDateInputValue(projectDetails?.endDate);

      if (projectStartDate && form.demandStartDate < projectStartDate) {
        e.demandStartDate = "Start Date Cannot Be Before Project Start Date";
      }
      if (projectEndDate && form.demandStartDate > projectEndDate) {
        e.demandStartDate = "Start Date Cannot Be After Project End Date";
      }
    }

    if (!form.demandEndDate) {
      e.demandEndDate = "End Date Is Required";
    } else {
      // Check if end date is within project date range
      const projectEndDate = toDateInputValue(projectDetails?.endDate);
      const projectStartDate = toDateInputValue(projectDetails?.startDate);

      if (projectStartDate && form.demandEndDate < projectStartDate) {
        e.demandEndDate = "End Date Cannot Be Before Project Start Date";
      }
      if (projectEndDate && form.demandEndDate > projectEndDate) {
        e.demandEndDate = "End Date Cannot Be After Project End Date";
      }
    }

    if (form.demandStartDate && form.demandEndDate && form.demandEndDate <= form.demandStartDate) {
      e.demandEndDate = "End Date Must Be After Start Date";
    }

    const alloc = parseFloat(form.allocationPercentage);
    if (isNaN(alloc) || alloc < 1 || alloc > 100) {
      e.allocationPercentage = "Allocation Must Be 1-100";
    }

    const resReq = parseInt(form.resourcesRequired);
    if (isNaN(resReq) || resReq < 1) {
      e.resourcesRequired = "At Least 1 Resource Is Required";
    }

    if (!form.minExp) e.minExp = "Minimum Experience Is Required";
    if (!form.deliveryModel) e.deliveryModel = "Delivery Model Is Required";
    if (!form.demandStatus) e.demandStatus = "Status Is Required";
    if (!form.demandPriority) e.demandPriority = "Priority Is Required";
    if (!form.demandCommitment) e.demandCommitment = "Commitment Type Is Required";

    if (!form.demandJustification?.trim()) e.demandJustification = "Justification Is Required";

    return e;
  };

  /* -------------------- Submit -------------------- */

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      notify.warning("Please Correct The Errors In The Form");

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
        const normalizedForm = {
          ...form,
          deliveryRole: resolveRoleId(form.deliveryRole, roles),
        };

        if (isManagerOrPM && !canProjectManagerEditDemand(initialData || form)) {
          notify.error(PM_EDITABLE_DEMAND_MESSAGE);
          return;
        }

        if (normalizedRole === "DELIVERYMANAGER") {
          const dmPayload = {
            demandId: id,
            decision: form.demandStatus,
            rejectionReason: form.demandStatus === "REJECTED"
              ? form.rejectionReason.trim()
              : null
          };
          const res = await handleDMDecision(dmPayload);
          notify.success(res?.message || "Decision Submitted Successfully");
          if (onSuccess) await onSuccess(res, dmPayload);
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
          notify.success(res?.message || "Decision Submitted Successfully");
          if (onSuccess) await onSuccess(res, rmPayload);
          onClose();
          return;
        }

        const submissionData = buildUpdateDemandPayload(normalizedForm, id);
        const res = await updateDemandStatus(submissionData);
        notify.success(res.message || "Demand Updated Successfully");
        if (onSuccess) await onSuccess(res, submissionData);
        onClose();
        return;
      }

      const normalizedForm = {
        ...form,
        deliveryRole: resolveRoleId(form.deliveryRole, roles),
      };
      const submissionData = buildCreateDemandPayload(normalizedForm, form.demandId || form.id || undefined);

      const res = await createDemand(submissionData);
      notify.success(res.message || "Demand Saved Successfully");
      if (onSuccess) await onSuccess(res, submissionData);
      onClose();
    } catch (err) {
      notify.error(err, "Failed To Save Demand");
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
                  max-w-3xl
                  overflow-hidden
                  rounded-xl
                  bg-white
                  shadow-2xl
                  flex flex-col
                  max-h-[90vh]
                "
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                  <div>
                    <Dialog.Title className="text-lg font-bold text-slate-900">
                      {mode === "edit" || initialData ? "Update Demand" : "Create New Demand"}
                    </Dialog.Title>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Configure Staffing Requirements For Your Project
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Body */}
                <div
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-6 space-y-5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-2">

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
                        value={projectDetails?.projectName || "Loading..."}
                        disabled
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm text-slate-500 cursor-not-allowed font-medium"
                      />
                    </FormField>

                    {/* Demand Name */}
                    <FormField id="field-demandName" label="Demand Name" error={errors.demandName} required>
                      <input
                        type="text"
                        placeholder="E.g. Senior Frontend Dev"
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
                      options={roles.map((r) => ({ label: getRoleName(r), value: getRoleId(r) }))}
                      error={errors.deliveryRole}
                      placeholder="Search And Select Role"
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
                      placeholder="Select Demand Type"
                      required
                      disabled={mode === "edit" && !isManagerOrPM}
                    />



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
                          onWheel={(e) => e.currentTarget.blur()}
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
                        placeholder="Enter Resources Required"
                        value={form.resourcesRequired}
                        onChange={(e) => update("resourcesRequired", e.target.value)}
                        onWheel={(e) => e.target.blur()}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.resourcesRequired ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                      />
                    </FormField>

                    {/* Min Experience */}
                    <FormField id="field-minExp" label="Min Experience (Yrs)" error={errors.minExp} required>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="E.g. 5"
                        value={form.minExp}
                        onChange={(e) => update("minExp", e.target.value)}
                        onWheel={(e) => e.target.blur()}
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
                      placeholder="Select Delivery Model"
                      required
                      disabled={mode === "edit" && !isManagerOrPM}
                    />

                    {/* Demand Status */}
                    <ListboxField
                      id="field-demandStatus"
                      label="Demand Status"
                      value={form.demandStatus}
                      onChange={(v) => update("demandStatus", v)}
                      options={computedEditStatuses || normalizeStatusOptions(activeStatuses)}

                      error={errors.demandStatus}
                      placeholder="Select Demand Status"
                      required
                    />

                    {/* Rejection Reason for DM/RM */}
                    {mode === "edit" && (normalizedRole === "DELIVERYMANAGER" || normalizedRole === "RESOURCEMANAGER") && form.demandStatus === "REJECTED" && (
                      <FormField id="field-rejectionReason" label="Rejection Reason" error={errors.rejectionReason} required className="md:col-span-2">
                        <textarea
                          rows={2}
                          placeholder="Explain Why This Demand Is Being Rejected..."
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
                      note={form.demandCommitment === "SOFT" ? "Note: This Demand Will Expire In 30 Days" : ""}
                      placeholder="Select Commitment"
                      required
                      disabled={mode === "edit" && !isManagerOrPM}
                    />

                    {/* Justification */}
                    <FormField id="field-demandJustification" label="Demand Justification" error={errors.demandJustification} required className="md:col-span-2">
                      <textarea
                        rows={3}
                        placeholder="Explain Why This Resource Is Needed..."
                        value={form.demandJustification}
                        onChange={(e) => update("demandJustification", e.target.value)}
                        disabled={mode === "edit" && !isManagerOrPM}
                        className={`w-full rounded-lg border py-2 px-3 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${errors.demandJustification ? "border-red-500 bg-red-50/30" : "border-slate-200 hover:border-slate-300"} ${mode === "edit" && !isManagerOrPM ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}`}
                      />
                    </FormField>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-xl">
                  <button
                    onClick={onClose}
                    className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-all"
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
                      text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-600/20
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
