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

  return (
    <section className="rounded-lg border border-gray-200 bg-gray-50/70 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-600">
        <UserRound size={14} aria-hidden="true" />
        Your details (from your employee record)
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex gap-2">
            <dt className="w-32 shrink-0 text-gray-500">{label}</dt>
            <dd className="min-w-0 truncate font-medium text-gray-900">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
