import React from "react";
import { Fonts } from "../Fonts/Fonts";

const FileUpload = ({ label, name, onChange, accept, required = false, disabled = false }) => (
  <div className="space-y-1">
    {label && (
      <label htmlFor={name} className={Fonts.label}>
        {label}
      </label>
    )}

    <input
      id={name}
      type="file"
      name={name}
      accept={accept}
      required={required}
      disabled={disabled}
      onChange={onChange}
      className="block w-full rounded-lg border border-gray-300 bg-white text-sm text-gray-700 shadow-sm cursor-pointer file:mr-4 file:border-0 file:bg-[#0A0082] file:px-4 file:py-2 file:text-white hover:file:bg-[#080066] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:file:cursor-not-allowed"
    />
  </div>
);

export default FileUpload;