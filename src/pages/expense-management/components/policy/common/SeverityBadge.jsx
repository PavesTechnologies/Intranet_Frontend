import React from "react";
import { AlertTriangle, Ban } from "lucide-react";

export default function SeverityBadge({ severity, size = "sm" }) {
  const isBlock = (severity || "").toString().toUpperCase().includes("BLOCK");
  const sizeClass = size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ${sizeClass} ${
        isBlock ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {isBlock ? <Ban size={11} /> : <AlertTriangle size={11} />}
      {isBlock ? "Block" : "Warn"}
    </span>
  );
}
