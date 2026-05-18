
import React from "react";
import { Mail, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import EmployeeProfileModal from "./EmployeeProfileModal";
import React, { useState } from "react";
import { Eye, Mail } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { ViewIcon } from "../../../components/icons/ActionIcons";
import Button from "../../../components/Button/Button";

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
    const [open,setOpen] = useState(false);
     const bgColor = getSafeColor(index);
  return (
    <>
   <div className="relative w-full max-w-[360px] mx-auto bg-white rounded-2xl shadow-md border border-gray-200 p-5
      transition-all duration-300 ease-in-out
      hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]
      active:scale-[0.98] active:shadow-lg">

      {/*3Dots Menu */} 
        <button
        onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 opacity-100">
        
        <ViewIcon className="w-5 h-5 text-gray-700" />
        </button>

          <div className="mt-4 text-center">
            <h3 className={Fonts.heading4}>{employee.name}</h3>
            <p className="mt-1 font-medium text-indigo-800">{employee.role}</p>
          </div>

      {/* Name & Role */}
      <div className="text-center mt-3">
        <h3 className="text-lg font-semibold text-gray-900">
          {employee.name}
        </h3>
        <p className="text-indigo-800 font-medium">
          {employee.role}
        </p>
      </div>

      <hr className="my-3" />

      {/* Details */}
      <div className="text-sm text-gray-800 space-y-2">
        <p>
          <span className="text-gray-600 text-sm">Department :</span>{" "}
          {employee.department}
        </p>
        <p>
          <span className="text-gray-600 text-sm ">Location :</span>{" "}
          {employee.location}
        </p>
        <div className="flex items-start gap-1 text-sm">
            <span className="text-gray-600 shrink-0">
              Email :
            </span>

            <p
              title={employee.email}
              className="truncate overflow-hidden whitespace-nowrap text-gray-800 flex-1 cursor-pointer"
            >
              {employee.email}
            </p>
          </div>
          {/* <p className="break-all">
          <span className="text-gray-600 text-sm ">Email :</span>{" "}
          {employee.email}
        </p> */}
      </div>

      {/* Actions */}
        <div className="mt-4 flex items-center gap-2 w-full">
        <Button
          onClick={() => setOpen(true)}
          variant="primary"
          size="medium"
          className="flex-1 py-2"
        >
          View Profile
        </Button>

        <a
          href={`mailto:${employee.email}`}
          className="shrink-0 p-2.5 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
        >
          <Mail className="h-4 w-4 text-indigo-800" />
        </a>
      </div>
    </div>
    {open && (
        <EmployeeProfileModal 
        employee={employee} 
        onClose={() => setOpen(false)} />)}
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
