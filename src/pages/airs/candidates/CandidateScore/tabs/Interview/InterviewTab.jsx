import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/Button/Button";
import { useAuth } from "@/contexts/AuthContext";
import { textOrDash } from "../../../utils/candidateDataUtils";
import { getInterviewScheduleMock, getInterviewHistoryMock, INTERVIEW_MODE_LABEL } from "./interviewMock";
import InterviewScheduleModal from "./components/InterviewScheduleModal";
import CancelInterviewModal from "./components/CancelInterviewModal";
import InterviewHistoryTimeline from "./components/InterviewHistoryTimeline";

// Interview tab (Epic 4 preview) — mock data only, no backend calls.
// interview_schedules/interview_schedule_history don't exist yet; this tab
// previews the UI so E04's backend has a known target once it's built.
// Every action here mutates local component state only (never a module-
// level mock singleton), so one candidate's preview edits can never leak
// into another candidate's view, and reschedules always append to history
// rather than overwrite it — mirroring the append-only design (Option B)
// the real interview_schedule_history table will enforce.
const STATUS_TONE = {
  NOT_SCHEDULED: "bg-slate-100 text-slate-600 border-slate-200",
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-100",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-800 border-rose-200",
  NO_SHOW: "bg-amber-50 text-amber-700 border-amber-100",
};

const STATUS_LABEL = {
  NOT_SCHEDULED: "Not Scheduled",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

function renderInterviewStatusBadge(status) {
  const tone = STATUS_TONE[status] || STATUS_TONE.NOT_SCHEDULED;
  return <Badge className={`${tone} font-bold px-3 py-1 text-xs`}>{STATUS_LABEL[status] || status}</Badge>;
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
      <div className="text-[10.5px] text-slate-400">{label}</div>
      <div className="text-[13px] font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

export default function InterviewTab({ candidate }) {
  const { user } = useAuth();
  const actingUserName = user?.name || user?.email || "You";

  const [schedule, setSchedule] = useState(() => getInterviewScheduleMock(candidate));
  const [history, setHistory] = useState(() => getInterviewHistoryMock(candidate));
  const [modalMode, setModalMode] = useState(null); // null | "schedule" | "reschedule"
  const [cancelOpen, setCancelOpen] = useState(false);

  // Re-seed the preview when navigating from one candidate to another — this
  // component instance can be reused across route param changes, and each
  // candidate must get its own fresh mock rather than inheriting a sibling's.
  useEffect(() => {
    setSchedule(getInterviewScheduleMock(candidate));
    setHistory(getInterviewHistoryMock(candidate));
  }, [candidate?.id]);

  const applyScheduleFields = (values) => ({
    campaign_candidate_id: candidate?.id ?? null,
    status: "SCHEDULED",
    scheduled_at: values.scheduledAt.toISOString(),
    duration_minutes: values.durationMinutes,
    interviewer_names: [values.interviewer],
    mode: values.mode,
    meeting_link: values.mode === "ONSITE" ? null : values.meetingLink,
    location: values.mode === "ONSITE" ? values.location : null,
    notes: schedule.notes || "",
  });

  const handleScheduleSubmit = (values) => {
    setSchedule(applyScheduleFields(values));
    setModalMode(null);
    toast.success("Interview scheduled — preview only, not saved to a backend record yet.");
  };

  const handleRescheduleSubmit = (values) => {
    setHistory((prev) => [
      ...prev,
      {
        id: `${candidate?.id ?? "mock"}-hist-${prev.length + 1}`,
        old_scheduled_at: schedule.scheduled_at,
        new_scheduled_at: values.scheduledAt.toISOString(),
        rescheduled_by: actingUserName,
        reason: values.reason,
        changed_at: new Date().toISOString(),
      },
    ]);
    setSchedule(applyScheduleFields(values));
    setModalMode(null);
    toast.success("Interview rescheduled — preview only, not saved to a backend record yet.");
  };

  const handleCancelConfirm = (reason) => {
    setSchedule((prev) => ({ ...prev, status: "CANCELLED", notes: reason }));
    setCancelOpen(false);
    toast.success("Interview cancelled — preview only, not saved to a backend record yet.");
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-slate-900">
            <CalendarClock size={14} className="text-blue-500" /> Interview
          </span>
          {renderInterviewStatusBadge(schedule.status)}
        </div>

        {schedule.status !== "NOT_SCHEDULED" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <DetailTile label="Date & Time" value={new Date(schedule.scheduled_at).toLocaleString()} />
            <DetailTile label="Duration" value={schedule.duration_minutes ? `${schedule.duration_minutes} min` : "-"} />
            <DetailTile
              label="Interviewer(s)"
              value={schedule.interviewer_names?.length ? schedule.interviewer_names.join(", ") : "-"}
            />
            <DetailTile label="Mode" value={schedule.mode ? INTERVIEW_MODE_LABEL[schedule.mode] : "-"} />
          </div>
        )}

        {schedule.status !== "NOT_SCHEDULED" && (schedule.meeting_link || schedule.location) && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mb-4 text-[12px]">
            {schedule.mode === "ONSITE" ? (
              <>
                <span className="text-slate-400">Location: </span>
                <span className="font-medium text-slate-900">{textOrDash(schedule.location)}</span>
              </>
            ) : (
              <>
                <span className="text-slate-400">Meeting link: </span>
                <a
                  href={schedule.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-blue-600 hover:underline break-all"
                >
                  {schedule.meeting_link}
                </a>
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {schedule.status === "NOT_SCHEDULED" && (
            <Button size="small" onClick={() => setModalMode("schedule")}>
              Schedule Interview
            </Button>
          )}
          {schedule.status === "SCHEDULED" && (
            <>
              <Button size="small" variant="outline" onClick={() => setModalMode("reschedule")}>
                Reschedule
              </Button>
              <Button size="small" variant="danger" onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <span className="text-[12.5px] font-bold text-slate-900 block mb-4">Reschedule History</span>
        <InterviewHistoryTimeline history={history} />
      </div>

      {modalMode && (
        <InterviewScheduleModal
          mode={modalMode}
          schedule={schedule}
          onClose={() => setModalMode(null)}
          onSubmit={modalMode === "reschedule" ? handleRescheduleSubmit : handleScheduleSubmit}
        />
      )}

      {cancelOpen && <CancelInterviewModal onClose={() => setCancelOpen(false)} onConfirm={handleCancelConfirm} />}
    </div>
  );
}
