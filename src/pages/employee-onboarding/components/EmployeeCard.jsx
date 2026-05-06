import React, { use } from "react";
import { Mail, MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import EmployeeProfileModal from "./EmployeeProfileModal";
import { useNavigate } from "react-router-dom";


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

  const prevColor = colors[(index - 1) % colors.length];
  let currentColor = colors[index % colors.length];

  // If same as previous → shift by 1
  if (currentColor === prevColor) {
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
    const navigation = useNavigate();
     const bgColor = getSafeColor(index);
  return (
    <>
    <div className=" relative bg-white rounded-2xl shadow-md border border-gray-200 p-6 w-[350px]
    transition-all duration-300 ease-in-out
    hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02]
    active:scale-[0.98] active:shadow-lg
    cursor-pointer">

      {/*3Dots Menu */} 
        <button
        onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
        }}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 opacity-100">
        
        <MoreHorizontalIcon className="w-5 h-5 text-gray-700" />
        </button>

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-semibold ${bgColor}`}>
            {getInitials(employee.name)}
        </div>
          <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-600 border-2 border-white rounded-full"></span>
        </div>
      </div>

      {/* Name & Role */}
      <div className="text-center mt-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {employee.name}
        </h3>
        <p className="text-indigo-800 font-medium">
          {employee.role}
        </p>
      </div>

      <hr className="my-4" />

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
          <p className="break-all">
          <span className="text-gray-600 text-sm ">Email :</span>{" "}
          {employee.email}
        </p>
      </div>

      {/* Actions */}
      <div className="mt-5 flex items-center gap-3">
        <button className="flex-1 bg-blue-800 hover:bg-blue-900 text-white py-2 rounded-lg font-medium transition"
        onClick={() => navigation(`/employee-onboarding/employeeProfile/${employee.employee_uuid}`)}>
          View Profile
        </button>

        <a
          href={`mailto:${employee.email}`}
          className="p-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
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

export default EmployeeCard;
