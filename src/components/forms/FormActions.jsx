import React from "react";

export default function FormActions({ children, align = "right", className = "" }) {
  const justify = align === "left" ? "justify-start" : align === "center" ? "justify-center" : "justify-end";
  return (
    <div className={`flex flex-wrap items-center gap-3 border-t border-gray-100 pt-4 ${justify} ${className}`.trim()}>
      {children}
    </div>
  );
}
