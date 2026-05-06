import React, { useState } from "react";
import { X, Mail, ExternalLink } from "lucide-react";

const EmployeeProfileModal = ({ employee, onClose }) => {
  const [activeTab, setActiveTab] = useState("profile");

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/20 flex items-start justify-center pt-20 z-50">
      
      {/* Modal */}
      <div className="bg-white w-[620px] min-h-[400px] max-h-[60vh] rounded-lg shadow-2xl border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-400 flex items-center justify-center text-white font-semibold">
              {getInitials(employee.name)}
            </div>
            <h2 className="font-semibold text-lg text-gray-800">
              {employee.name}
            </h2>
          </div>

          <div className="flex items-center gap-4 text-gray-500">
            {/* <ExternalLink className="w-5 h-5 cursor-pointer hover:text-gray-700" /> */}
            <X
              className="w-5 h-5 cursor-pointer hover:text-gray-700"
              onClick={onClose}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`px-6 py-2 text-sm font-medium ${
              activeTab === "profile"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>

          <button
            className={`px-6 py-2 text-sm font-medium ${
              activeTab === "job"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600"
            }`}
            onClick={() => setActiveTab("job")}
          >
            Job
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* PROFILE TAB */}
          {activeTab === "profile" && (
            <div className="grid grid-cols-2 gap-8">

            <div>
                <p className="text-xs text-gray-500 uppercase">EmployeeID</p>
                <p className="text-gray-800">{employee.employeeId}</p>
            </div>  

            <div>
                <p className="text-gray-500  mb-1 uppercase text-sm">Email</p>
                <p className="flex items-center gap-3 text-gray-600 text-sm mb-1">
                  <Mail className="w-5 h-5 text-gray-600 uppercase" />
                  <p className="text-gray-800">{employee.email}</p>
                </p>
            </div>

             <div>
                <p className="text-xs text-gray-500 uppercase">Contact</p>
                <p className="text-gray-800">{employee.contact}</p>
              </div> 

            <div>
               <p className="text-gray-500  mb-1 uppercase text-sm">Gender</p>
                <p className="text-gray-800">{employee.gender}</p>
            </div>
 
            <div>
               <p className="text-gray-500  mb-1 uppercase text-sm">
                    Department
                </p>
                <p className="text-gray-800">{employee.department}</p>
            </div>
           </div>  
            
          )}

          {/* JOB TAB */}
          {activeTab === "job" && (
            <div className="grid grid-cols-2 gap-8">

              
              <div>
                <p className="text-xs text-gray-500 uppercase">Job Title</p>
                <p className="text-gray-800">{employee.role}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Department</p>
                <p className="text-gray-800">{employee.department}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Employee Type</p>
                <p className="text-gray-800">{employee.employeeType}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Location</p>
                <p className="text-gray-800">{employee.location}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">DateOfJoining</p>
                <p className="text-gray-800">{employee.dateOfJoining}</p>
              </div>

              <div>
                <p className="text-xs text-gray-500 uppercase">Reporting Manager</p>
                <p className="text-gray-800">{employee.reportingManager}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfileModal;
