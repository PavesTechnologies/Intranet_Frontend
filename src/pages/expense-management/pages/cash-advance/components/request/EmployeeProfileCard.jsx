import React from "react";
import { UserRound } from "lucide-react";

// Read-only. Shows only what is known: a field with no value is left out, never shown as an ID or a dash.
export default function EmployeeProfileCard({ profile, loading = false }) {
  if (loading) {
    return <div className="h-14 animate-pulse rounded-lg bg-gray-100" aria-label="Loading your details" />;
  }
  if (!profile) return null;

  const rows = [
    ["Employee", profile.fullName],
    ["Employee ID", profile.employeeId],
    ["Reporting manager", profile.managerName],
    ["Department", profile.departmentName],
    ["Designation", profile.designationName],
  ].filter(([, value]) => value);

  const initials = (profile.fullName || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

  return (
    <section className="flex items-start gap-4 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700"
        aria-hidden="true"
      >
        {initials || <UserRound size={20} />}
      </div>
      <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] uppercase tracking-wide text-gray-500">{label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold text-gray-900" title={value}>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
