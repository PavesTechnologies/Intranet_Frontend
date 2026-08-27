import React from "react";

const FormDatePicker = ({ label, name, value, onChange, min, max, required, error = "" }) => (
  <div className="space-y-1">
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      id={name}
      type="date"
      name={name}
      value={value}
      onChange={onChange}
      min={min} // ✅ prevents selecting past dates
      max={max} // ✅ optional future restriction
      required={required}
      aria-invalid={Boolean(error)}
      className={`w-full px-4 py-2 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${
        error ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300"
      }`}
    />
    {error ? <p className="text-xs text-red-500">{error}</p> : null}
  </div>
);

export default FormDatePicker;
