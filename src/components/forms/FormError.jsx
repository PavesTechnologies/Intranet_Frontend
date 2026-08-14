import React from "react";

export default function FormError({ children, className = "" }) {
  if (!children) return null;
  return <p className={`text-xs text-danger ${className}`.trim()}>{children}</p>;
}
