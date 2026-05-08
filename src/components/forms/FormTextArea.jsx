import React from "react";
import { Fonts } from "../Fonts/Fonts";

const FormTextArea = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
  disabled = false,
}) => (
  <div className="space-y-1">
    {label && (
      <label htmlFor={name} className={Fonts.label}>
        {label}
      </label>
    )}

    <textarea
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      required={required}
      disabled={disabled}
      className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 disabled:bg-gray-100 disabled:cursor-not-allowed"
    />
  </div>
);

export default FormTextArea;