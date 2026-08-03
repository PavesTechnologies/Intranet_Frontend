import React, { useState } from "react";
import { Mail } from "lucide-react";
import { ViewIcon } from "../../../components/icons/ActionIcons";
import { Fonts } from "../../../components/Fonts/Fonts";
import EmployeeViewModal from "./EmployeeViewModal";
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
  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }
  return (
    parts[0][0] + parts[parts.length - 1][0]
  ).toUpperCase();
};
const EmployeeCard = ({ employee, index }) => {
  const bgColor = getSafeColor(index);
  const [isViewOpen, setIsViewOpen] = useState(false);
  return (
    <>
      <div
        className="
          relative w-full max-w-[360px] mx-auto
          bg-white rounded-2xl shadow-md border border-gray-200 p-5
          transition-all duration-300 ease-in-out
          hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]
          active:scale-[0.98] active:shadow-lg
        "
      >
        {/* View Icon — opens a read-only Personal/Job details modal */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsViewOpen(true);
          }}
          className="
            absolute top-3 right-3
            p-1.5 rounded-md
            bg-gray-100 hover:bg-gray-200
            transition
          "
        >
          <ViewIcon className="w-5 h-5 text-gray-700" />
        </button>
        {/* Avatar */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              className={`
                w-16 h-16 rounded-full
                flex items-center justify-center
                text-white text-2xl font-semibold
                ${bgColor}
              `}
            >
              {getInitials(employee.name)}
            </div>
            <span
              className="
                absolute bottom-1 right-1
                w-3 h-3
                bg-green-600
                border-2 border-white
                rounded-full
              "
            />
          </div>
        </div>
        {/* Name & Role */}
        <div className="mt-4 text-center">
          <h3 className={Fonts.heading4}>
            {employee.name}
          </h3>
          <p className="mt-1 font-medium text-indigo-800">
            {employee.role}
          </p>
        </div>
        <hr className="my-4" />
        {/* Details */}
        <div className="space-y-2 text-sm text-gray-800">
          <p>
            <span className="text-gray-600">
              Department :
            </span>{" "}
            {employee.department}
          </p>
          <p>
            <span className="text-gray-600">
              Location :
            </span>{" "}
            {employee.location}
          </p>
          {/* Email */}
          <div className="flex items-start gap-1">
            <span className="text-gray-600 shrink-0">
              Email :
            </span>
            <p
              title={employee.email}
              className="
                flex-1 truncate overflow-hidden whitespace-nowrap
                text-gray-800 cursor-pointer
              "
            >
              {employee.email}
            </p>
          </div>
        </div>
        {/* Actions */}
        <div className="mt-5 flex items-center gap-2 w-full">
          <a
            href={`mailto:${employee.email}`}
            className="
              flex-1 flex items-center justify-center gap-2 py-2.5
              bg-indigo-50 hover:bg-indigo-100
              rounded-lg transition text-sm font-medium text-indigo-800
            "
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        </div>
      </div>

      <EmployeeViewModal open={isViewOpen} employee={employee} onClose={() => setIsViewOpen(false)} />
    </>
  );
};
export default EmployeeCard;
