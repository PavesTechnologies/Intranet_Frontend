import React from "react";
import { Fonts } from "../Fonts/Fonts";

const FormInput = ({
  label,
  name,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  disabled = false,
  error = "",
  className = "",
  inputClassName = "",
  requiredMark = false,
  ...rest
}) => (
  <div className={`space-y-1 ${className}`.trim()}>
    {label && (
      <label htmlFor={name} className={Fonts.label}>
        {label}
        {requiredMark ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
    )}

    <input
      id={name}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={`w-full rounded-lg border px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 disabled:cursor-not-allowed disabled:bg-gray-100 ${
        error ? "border-red-300 focus:border-red-500 focus:ring-red-500/20" : "border-gray-300"
      } ${inputClassName}`.trim()}
      aria-invalid={Boolean(error)}
      {...rest}
    />
    {error ? <p className="text-xs text-red-500">{error}</p> : null}
  </div>
);

export default FormInput;
