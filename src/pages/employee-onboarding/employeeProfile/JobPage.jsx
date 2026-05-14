"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Briefcase, Building2, Clock, FileText } from "lucide-react";

export default function JobPage({ user_uuid, coreData = {}, hrData = {} }) {
  const { employee_uuid } = useParams();

  const [jobData, setJobData] = useState(null);
  const [organizationData, setOrganizationData] = useState(null);
  const [timeData, setTimeData] = useState(null);
  const [otherData, setOtherData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use pre-fetched data from parent — no API calls needed

    /* ---- Map to Job Details ---- */
    setJobData({
      employee_number: coreData.employee_id || "NA",
      date_of_joining: coreData.joining_date || hrData.offer?.joining_date || "NA",
      primary_job: coreData.resolved_designation_name || coreData.designation_uuid || "NA",
      employment_type: coreData.employment_type || hrData.offer?.employment_type || "NA",
      time_type: coreData.time_type || "Full Time",
      notice_period: coreData.notice_period || hrData.offer?.notice_period || "NA",
      contract_status: coreData.contract_status || "Not Applicable",
    });

    /* ---- Map to Organization ---- */
    setOrganizationData({
      business_unit: coreData.business_unit || "NA",
      department: coreData.resolved_department_name || coreData.department_uuid || "NA",
      location: coreData.location || hrData.offer?.location || "Not Updated",
      cost_center: coreData.cost_center || "NA",
      legal_entity: coreData.legal_entity || hrData.offer?.legal_entity || "NA",
      reports_to: coreData.reports_to || "NA",
      manager: coreData.reporting_manager_uuid || "NA",
      direct_reports: coreData.direct_reports || "0 Employees",
    });

    /* ---- Map to Employee Time ---- */
    setTimeData({
      shift: coreData.shift || hrData.offer?.shift || "NA",
      weekly_policy: coreData.weekly_off_policy || "NA",
      leave_plan: coreData.leave_plan || "NA",
      holiday_calendar: coreData.holiday_calendar || "NA",
      attendance_number: coreData.attendance_number || coreData.employee_id || "NA",
      attendance_policy: coreData.attendance_policy || "NA",
      overtime: coreData.overtime || "NA",
    });

    /* ---- Map to Other ---- */
    setOtherData({
      expense_policy: coreData.expense_policy || "NA",
      loan_policy: coreData.loan_policy || "NA",
      ar_ticket_policy: coreData.ar_ticket_policy || "NA",
    });

    setLoading(false);
  }, [coreData, hrData]);

  if (loading) return <div>Loading job details...</div>;

  return (
    <div className="space-y-6">

      {/* ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
        <Card title="Job Details" color="#263383" iconBg="#eff6ff" Icon={Briefcase}>
          <Row label="Employee Number" value={jobData?.employee_number || "NA"} />
          <Row label="Date of Joining" value={jobData?.date_of_joining || "NA"} />
          <Row label="Designation" value={jobData?.primary_job || "NA"} />
          <Row label="Employment Type" value={jobData?.employment_type || "NA"} />
          <Row label="Time Type" value={jobData?.time_type || "NA"} />
          <Row label="Notice Period" value={jobData?.notice_period || "NA"} />
          <Row label="Contract Status" value={jobData?.contract_status || "NA"} />
        </Card>

        <Card title="Organization" color="#059669" iconBg="#ecfdf5" Icon={Building2}>
          <Row label="Business Unit" value={organizationData?.business_unit || "NA"} />
          <Row label="Department" value={organizationData?.department || "NA"} />
          <Row label="Location" value={organizationData?.location || "NA"} />
          <Row label="Cost Center" value={organizationData?.cost_center || "NA"} />
          <Row label="Legal Entity" value={organizationData?.legal_entity || "NA"} />
          <Row label="Reports To" value={organizationData?.reports_to || "NA"} />
          <Row label="Manager" value={organizationData?.manager || "NA"} />
          <Row label="Direct Reports" value={organizationData?.direct_reports || "NA"} />
        </Card>
      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
        <Card title="Employee Time" color="#ea580c" iconBg="#fff7ed" Icon={Clock}>
          <Row label="Shift" value={timeData?.shift || "NA"} />
          <Row label="Weekly Off Policy" value={timeData?.weekly_policy || "NA"} />
          <Row label="Leave Plan" value={timeData?.leave_plan || "NA"} />
          <Row label="Holiday Calendar" value={timeData?.holiday_calendar || "NA"} />
          <Row label="Attendance Number" value={timeData?.attendance_number || "NA"} />
          <Row label="Attendance Policy" value={timeData?.attendance_policy || "NA"} />
          <Row label="Overtime" value={timeData?.overtime || "NA"} />
        </Card>

        <Card title="Other" color="#7c3aed" iconBg="#faf5ff" Icon={FileText}>
          <Row label="Expense Policy" value={otherData?.expense_policy || "NA"} />
          <Row label="Loan Policy" value={otherData?.loan_policy || "NA"} />
          <Row label="AR Ticket Policy" value={otherData?.ar_ticket_policy || "NA"} />
        </Card>
      </div>
    </div>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

const Card = ({ title, children, color = "#263383", iconBg = "#eff6ff", Icon }) => (
  <div className="bg-white rounded-xl border border-[#e4e8f2] overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(8,21,52,0.06)", borderLeft: `3px solid ${color}` }}>
    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#e4e8f2]">
      {Icon && (
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color }}>
          <Icon size={13} />
        </div>
      )}
      <h3 className="text-[11px] font-bold text-[#081534] uppercase tracking-[0.06em]">{title}</h3>
    </div>
    <div className="px-5 py-1">
      {children}
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="grid grid-cols-[42%_1fr] gap-3 items-baseline py-2.5 border-b border-[#f4f6fc] last:border-0">
    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.05em]">{label}</span>
    <span className="text-[13px] font-medium text-[#1e293b] break-words">
      {value || <span className="text-gray-300">—</span>}
    </span>
  </div>
);