import React, { useEffect, useState } from "react";
import { AlertTriangle, BellRing, Clock, UserCheck } from "lucide-react";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import StatusBadge from "../../../../components/status/statusbadge";
import Pagination from "../../../../components/Pagination/pagination";

const PAGE_SIZE = 10;

export default function PendingTimesheetsModal({
  isOpen,
  onClose,
  pendingTimesheets = [],
  config,
  onRemindPM,
  reminding = false,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(pendingTimesheets.length / PAGE_SIZE));
  const pageTimesheets = pendingTimesheets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [pendingTimesheets]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  if (!config) return null;

  const totalPendingHours = pendingTimesheets.reduce((acc, t) => acc + Number(t.hours || 0), 0);
  const pmName = config.projectManager || "Alex Morgan (Project Lead)";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pending Timesheet Approvals"
      subtitle={`Blocking billing snapshot acquisition for ${config.projectName} (${config.projectCode})`}
      size="lg"
      footer={
        <div className="flex items-center justify-between gap-3 w-full">
          <div className="text-xs text-slate-500 font-medium">
            Assigned PM: <span className="font-semibold text-slate-800">{pmName}</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                onRemindPM();
              }}
              disabled={reminding}
              className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600"
            >
              <BellRing className={`h-4 w-4 ${reminding ? "animate-spin" : ""}`} />
              {reminding ? "Sending Reminder..." : "Remind Project Manager"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header summary callout */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-amber-900 text-sm">
              {pendingTimesheets.length} Pending Timesheet(s) ({totalPendingHours} hrs)
            </h4>
            <p className="text-amber-800">
              Billing acquisition is blocked until all required timesheets for billing period{" "}
              <strong className="tabular-nums">{config.billingPeriod}</strong> receive manager approval.
            </p>
          </div>
        </div>

        {/* Table of pending timesheets */}
        <div className="rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Work Date</th>
                <th className="px-4 py-3 text-left">Hours</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {pendingTimesheets.length > 0 ? (
                pageTimesheets.map((t, idx) => (
                  <tr key={t.id || idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{t.employee}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-600">{t.workDate}</td>
                    <td className="px-4 py-2.5 text-left font-semibold tabular-nums text-amber-800">{t.hours} hrs</td>
                    <td className="px-4 py-2.5 text-slate-500">{t.role || "Software Engineer"}</td>
                    <td className="px-4 py-2.5 text-center">
                      <StatusBadge label={t.approvalStatus || "Pending Approval"} size="sm" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-500">
                    No pending timesheets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {pendingTimesheets.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, pendingTimesheets.length)} of {pendingTimesheets.length} timesheets
            </p>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((page) => Math.max(page - 1, 1))}
              onNext={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
