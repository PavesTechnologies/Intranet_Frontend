import React from "react";
import { useEmployeeDirectory } from "../hooks/useEmployeeDirectory";

/**
 * Renders a resolved employee name wherever the backend only gives us an employeeId - falls back
 * to the raw id (never blank) while the directory is loading or if the id isn't found in it, so
 * this is always safe to drop in place of a bare `{employeeId}`.
 */
export default function EmployeeLabel({ employeeId, className = "", showIdSubtext = false }) {
  const { data: directory } = useEmployeeDirectory();

  if (!employeeId) return <span className={className}>—</span>;

  const entry = directory?.get(employeeId);
  const name = entry?.name;

  if (showIdSubtext && name) {
    return (
      <span className={className} title={employeeId}>
        <span className="font-medium">{name}</span>
        <span className="block text-xs text-gray-400 font-normal">{employeeId}</span>
      </span>
    );
  }

  return (
    <span className={className} title={name ? employeeId : undefined}>
      {name || employeeId}
    </span>
  );
}
