import React from "react";

export default function FormSelect({
  label,
  name,
  value,
  onChange,
  options = [],
  disabled = false,
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
      >
        <option value="">Select</option>

        {options.map((option, index) => {
          if (typeof option === "string") {
            return (
              <option key={index} value={option}>
                {option}
              </option>
            );
          }

          return (
            <option key={option.value || index} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
    </div>
  );
}
