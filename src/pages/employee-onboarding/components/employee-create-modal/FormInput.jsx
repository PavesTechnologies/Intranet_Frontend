import React from "react";
import { Fonts } from "../../../../components/Fonts/Fonts";

export default function FormInput({
  label,
  required = false,
  disabled = false,
  className = "",
  bgClass = "",
  ...props
}) {
  const isFilled = props.value && props.value.toString().length > 0;
  return (
    <div>
      {label && (
        <label className={Fonts.label}>
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
          ${bgClass || (isFilled ? "bg-blue-50/50" : "bg-white")}
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
