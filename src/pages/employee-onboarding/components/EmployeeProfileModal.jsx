import React, { useState } from "react";
import { Mail } from "lucide-react";

import { Fonts } from "../../../components/Fonts/Fonts";
import Modal from "../../../components/Modal/modal";

const EmployeeProfileModal = ({ employee, onClose }) => {
  const [activeTab, setActiveTab] = useState("profile");

  const getInitials = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <Modal
      isOpen={Boolean(employee)}
      onClose={onClose}
      size="2xl"
      position="top"
      maxHeight="max-h-[75vh]"
      title=""
      showHeader={false}
      bodyClassName="p-0"
      panelClassName="overflow-hidden"
    >
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-400 font-semibold text-white">
            {getInitials(employee.name)}
          </div>
          <div>
            <h2 className={Fonts.heading4}>{employee.name}</h2>
            <p className="mt-0.5 text-sm text-slate-500">{employee.role}</p>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200">
        {["profile", "job"].map((tab) => (
          <button
            key={tab}
            className={`px-6 py-3 text-sm font-medium transition ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "profile" ? "Profile" : "Job"}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailTile label="Employee ID" value={employee.employeeId} />
            <DetailTile
              label="Email"
              value={
                <span className="flex items-center gap-2 break-all text-slate-800">
                  <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>{employee.email}</span>
                </span>
              }
            />
            <DetailTile label="Contact" value={employee.contact} />
            <DetailTile label="Gender" value={employee.gender} />
            <DetailTile label="Department" value={employee.department} />
          </div>
        )}

        {activeTab === "job" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <DetailTile label="Job Title" value={employee.role} />
            <DetailTile label="Department" value={employee.department} />
            <DetailTile label="Employee Type" value={employee.employeeType} />
            <DetailTile label="Location" value={employee.location} />
            <DetailTile label="Date Of Joining" value={employee.dateOfJoining} />
            <DetailTile label="Reporting Manager" value={employee.reportingManager} />
          </div>
        )}
      </div>
    </Modal>
  );
};

function DetailTile({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-4">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800">{value || "N/A"}</div>
    </div>
  );
}

export default EmployeeProfileModal;
