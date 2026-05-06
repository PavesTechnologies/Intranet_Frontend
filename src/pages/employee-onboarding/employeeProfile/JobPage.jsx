"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

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
        <Card title="Job Details">
          <Row label="Employee Number" value={jobData?.employee_number || "NA"} />
          <Row label="Date of Joining" value={jobData?.date_of_joining || "NA"} />
          <Row label="Designation" value={jobData?.primary_job || "NA"} />
          <Row label="Employment Type" value={jobData?.employment_type || "NA"} />
          <Row label="Time Type" value={jobData?.time_type || "NA"} />
          <Row label="Notice Period" value={jobData?.notice_period || "NA"} />
          <Row label="Contract Status" value={jobData?.contract_status || "NA"} />
        </Card>

        <Card title="Organization">
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
        <Card title="Employee Time">
          <Row label="Shift" value={timeData?.shift || "NA"} />
          <Row label="Weekly Off Policy" value={timeData?.weekly_policy || "NA"} />
          <Row label="Leave Plan" value={timeData?.leave_plan || "NA"} />
          <Row label="Holiday Calendar" value={timeData?.holiday_calendar || "NA"} />
          <Row label="Attendance Number" value={timeData?.attendance_number || "NA"} />
          <Row label="Attendance Policy" value={timeData?.attendance_policy || "NA"} />
          <Row label="Overtime" value={timeData?.overtime || "NA"} />
        </Card>

        <Card title="Other">
          <Row label="Expense Policy" value={otherData?.expense_policy || "NA"} />
          <Row label="Loan Policy" value={otherData?.loan_policy || "NA"} />
          <Row label="AR Ticket Policy" value={otherData?.ar_ticket_policy || "NA"} />
        </Card>
      </div>
    </div>
  );
}

/* ---------------- UI COMPONENTS ---------------- */

const Card = ({ title, children }) => (
  <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md border border-indigo-100 overflow-hidden">
    <div className="px-6 py-4 border-b border-indigo-100 bg-indigo-50/60">
      <h3 className="text-sm font-semibold text-indigo-800">{title}</h3>
    </div>
    <div className="p-6 space-y-3 text-sm">
      {children}
    </div>
  </div>
);

const Row = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm min-w-0">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="text-gray-900 font-medium sm:text-right break-words min-w-0">
      {value}
    </span>
  </div>
);