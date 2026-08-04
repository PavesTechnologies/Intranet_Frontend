import React, { useState } from "react";
import { User, Briefcase, Mail, Phone, Hash, UserRound, Building2, MapPin, Calendar, Users } from "lucide-react";
import Modal from "../../../components/ui/Modal";

const TABS = [
  { key: "profile", label: "Profile Details" },
  { key: "job", label: "Job Details" },
];

function InfoTile({ icon: Icon, label, value, bg, color }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 border border-slate-100">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color }}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-[13px] font-bold text-slate-800 truncate">{value || "-"}</p>
      </div>
    </div>
  );
}

const PROFILE_FIELDS = [
  { key: "name", label: "Full Name", icon: User, bg: "#ede9fe", color: "#7c3aed" },
  { key: "employeeId", label: "Employee ID", icon: Hash, bg: "#dbeafe", color: "#2563eb" },
  { key: "gender", label: "Gender", icon: UserRound, bg: "#fce7f3", color: "#db2777" },
  { key: "email", label: "Email", icon: Mail, bg: "#d1fae5", color: "#059669" },
  { key: "contact", label: "Contact", icon: Phone, bg: "#ffedd5", color: "#ea580c" },
];

const JOB_FIELDS = [
  { key: "role", label: "Designation", icon: Briefcase, bg: "#dbeafe", color: "#2563eb" },
  { key: "department", label: "Department", icon: Building2, bg: "#ede9fe", color: "#7c3aed" },
  { key: "employeeType", label: "Employment Type", icon: Briefcase, bg: "#d1fae5", color: "#059669" },
  { key: "location", label: "Location", icon: MapPin, bg: "#fce7f3", color: "#db2777" },
  { key: "dateOfJoining", label: "Date of Joining", icon: Calendar, bg: "#ffedd5", color: "#ea580c" },
  { key: "reportingManager", label: "Reporting Manager", icon: Users, bg: "#e0e7ff", color: "#4338ca" },
];

// Read-only Job Details / Personal Details view — opened from the eye icon on
// an Employee Directory card. No edit affordances anywhere in this modal; it
// only ever renders data already fetched for the directory listing.
export default function EmployeeViewModal({ open, employee, onClose }) {
  const [activeTab, setActiveTab] = useState("profile");

  if (!employee) return null;

  const fields = activeTab === "profile" ? PROFILE_FIELDS : JOB_FIELDS;

  return (
    <Modal isOpen={open} onClose={onClose} title="Employee Details" width="520px">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {employee.initials || "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">{employee.name}</p>
            <p className="text-xs text-slate-500 truncate">{employee.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 border-b border-slate-200">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2.5 text-[12.5px] font-semibold transition-colors ${
                  isActive ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-indigo-600" />}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {fields.map((f) => (
            <InfoTile key={f.key} icon={f.icon} label={f.label} value={employee[f.key]} bg={f.bg} color={f.color} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
