import React, { useMemo } from "react";
import Select from "react-select";
import { useEmployeeList, useEmployeeDirectory } from "../hooks/useEmployeeDirectory";

const selectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "42px",
    borderRadius: "0.5rem",
    borderColor: state.isFocused ? "#6366f1" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #6366f1" : "none",
    "&:hover": { borderColor: state.isFocused ? "#6366f1" : "#9ca3af" },
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const formatOption = (option, { context }) => {
  if (context === "value") {
    return (
      <span>
        {option.label}
        {option.label !== option.value && <span className="ml-1.5 text-xs text-gray-400">ID {option.value}</span>}
      </span>
    );
  }
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-900">{option.label}</p>
      <p className="truncate text-xs text-gray-500">{[option.email, `ID ${option.value}`].filter(Boolean).join(" · ")}</p>
    </div>
  );
};

const filterOption = (option, input) => {
  const term = input.trim().toLowerCase();
  if (!term) return true;
  return [option.label, option.data.email, option.value].some((v) => v && String(v).toLowerCase().includes(term));
};

/**
 * Searchable employee picker over the shared Employee Onboarding directory. `value`/`onChange`
 * work in employeeIds - the same identifier delegations and approver assignments store.
 * `excludeIds` hides people who can't be picked here (e.g. the delegator when choosing a delegate).
 */
export default function EmployeeSelect({
  value,
  onChange,
  excludeIds = [],
  placeholder = "Search employees by name, email or ID…",
  isDisabled = false,
  inputId,
}) {
  const { data: employees, isLoading, isError } = useEmployeeList();
  const { data: directory } = useEmployeeDirectory();

  const options = useMemo(
    () =>
      (employees || [])
        .filter((e) => !excludeIds.includes(e.employeeId))
        .map((e) => ({ value: e.employeeId, label: e.name || e.employeeId, email: e.email })),
    [employees, excludeIds]
  );

  // Keep a saved value visible even if that person has since dropped out of the pickable list.
  const selected = value
    ? options.find((o) => o.value === value) || {
        value,
        label: directory?.get(value)?.name || value,
        email: directory?.get(value)?.email,
      }
    : null;

  return (
    <Select
      inputId={inputId}
      options={options}
      value={selected}
      onChange={(option) => onChange(option?.value || "")}
      isLoading={isLoading}
      isDisabled={isDisabled}
      isClearable
      formatOptionLabel={formatOption}
      filterOption={filterOption}
      placeholder={placeholder}
      noOptionsMessage={() =>
        isLoading ? "Loading employees…" : isError ? "Couldn't load employees" : "No matching employees"
      }
      menuPortalTarget={typeof document !== "undefined" ? document.body : null}
      styles={selectStyles}
    />
  );
}
