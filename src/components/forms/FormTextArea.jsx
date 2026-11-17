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
  // Native textarea attribute passthrough — added because every current
  // Leave Management consumer relies on it to cap free-text field length.
  maxLength,
  // Same convention as FormInput: appended after the canonical box classes,
  // for genuine structural needs (e.g. `resize-none`) rather than decorative
  // per-consumer color overrides.
  inputClassName = "",
  // Same convention as FormInput/FormLabel: a purely visual asterisk next to
  // the label. Does not set the native `required` attribute or affect
  // validation — that remains the form layer's responsibility.
  requiredMark = false,
}) => (
  <div className="space-y-1">
    {label && (
      <label htmlFor={name} className={Fonts.label}>
        {label}
        {requiredMark ? <span className="ml-1 text-red-500">*</span> : null}
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
      maxLength={maxLength}
      className={`w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20 disabled:bg-gray-100 disabled:cursor-not-allowed ${inputClassName}`.trim()}
    />
  </div>
);

export default FormTextArea;