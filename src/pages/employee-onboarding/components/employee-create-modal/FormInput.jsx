import React from "react";

export default function FormInput({
  label,
  required = false,
  disabled = false,
  className = "",
  ...props
}) {
  return (
    <div>
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label} {required && "*"}
        </label>
      )}

      <input
        {...props}
        disabled={disabled}
        className={`
          w-full mt-1
          px-3 py-2
          border border-gray-300
          rounded-lg
          bg-white
          text-sm
          focus:outline-none
          focus:border-gray-400
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${className}
        `}
      />
    </div>
  );
}
