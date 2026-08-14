import React from "react";
import { Fonts } from "../Fonts/Fonts";

export default function FormLabel({ htmlFor, children, required = false, className = "" }) {
  if (!children) return null;
  return (
    <label htmlFor={htmlFor} className={`${Fonts.label} ${className}`.trim()}>
      {children}
      {required ? <span className="ml-1 text-red-500">*</span> : null}
    </label>
  );
}
