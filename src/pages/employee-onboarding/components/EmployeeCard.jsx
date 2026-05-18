import React, { useState } from "react";
import { Eye, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Button from "../../../components/Button/Button";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { Fonts } from "../../../components/Fonts/Fonts";
import EmployeeProfileModal from "./EmployeeProfileModal";

const colors = [
  "bg-teal-400",
  "bg-orange-500",
  "bg-blue-400",
  "bg-green-400",
  "bg-indigo-400",
  "bg-pink-500",
  "bg-purple-400",
];

const getSafeColor = (index) => {
  if (index === 0) return colors[0];

  const previousColor = colors[(index - 1) % colors.length];
  let currentColor = colors[index % colors.length];

  if (currentColor === previousColor) {
    currentColor = colors[(index + 1) % colors.length];
  }

  return currentColor;
};

const getInitials = (name) => {
  if (!name) return "";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const EmployeeCard = ({ employee, index }) => {
  const [open, setOpen] = useState(false);
  const navigation = useNavigate();
  const bgColor = getSafeColor(index);

  return (
    <>
      <PageCard className="relative h-full border-slate-200 transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg">
        <PageCardContent className="flex h-full flex-col p-6">
          <div
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            className="absolute right-3 top-3"
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-xl bg-gray-100 hover:bg-gray-200"
              aria-label={`View ${employee.name}`}
            >
              <Eye className="h-5 w-5 text-gray-700" />
            </Button>
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold text-white ${bgColor}`}>
                {getInitials(employee.name)}
              </div>
              <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-green-600" />
            </div>
          </div>

          <div className="mt-4 text-center">
            <h3 className={Fonts.heading4}>{employee.name}</h3>
            <p className="mt-1 font-medium text-indigo-800">{employee.role}</p>
          </div>

          <div className="my-5 h-px bg-slate-200" />

          <div className="grid gap-3 text-sm text-gray-800">
            <InfoRow label="Department" value={employee.department} />
            <InfoRow label="Location" value={employee.location} />
            <InfoRow label="Email" value={employee.email} breakAll />
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Button
              className="flex-1"
              onClick={() => navigation(`/employee-onboarding/employeeProfile/${employee.employee_uuid}`)}
            >
              View Profile
            </Button>

            <a
              href={`mailto:${employee.email}`}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-indigo-50 text-indigo-800 transition hover:bg-indigo-100"
              aria-label={`Email ${employee.name}`}
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        </PageCardContent>
      </PageCard>

      {open && <EmployeeProfileModal employee={employee} onClose={() => setOpen(false)} />}
    </>
  );
};

function InfoRow({ label, value, breakAll = false }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className={`text-sm font-medium text-slate-800 ${breakAll ? "break-all" : ""}`}>
        {value || "N/A"}
      </div>
    </div>
  );
}

export default EmployeeCard;
