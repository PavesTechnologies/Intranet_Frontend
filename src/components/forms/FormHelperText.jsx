import React from "react";

export default function FormHelperText({ children, className = "" }) {
  if (!children) return null;
  return <p className={`text-xs text-gray-500 ${className}`.trim()}>{children}</p>;
}
