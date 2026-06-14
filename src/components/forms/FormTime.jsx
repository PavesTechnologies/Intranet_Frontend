import React from "react";

const FormTime = ({
  label,
  name,
  value,
  onChange,
  className = "",
  inputClassName = "",
}) => (
  <div className={`space-y-1 ${className}`.trim()}>
    {label && (
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
    )}
    <input
      id={name}
      type="time"
      name={name}
      value={value}
      onChange={onChange}
      className={`w-full min-w-[130px] px-3 py-2 pr-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition ${inputClassName}`.trim()}
    />
  </div>
);

export default FormTime;
