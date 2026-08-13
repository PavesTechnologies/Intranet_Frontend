import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button/Button";
import FilterListbox from "@/components/filter/FilterListbox";
import { INTERVIEW_MODE_OPTIONS, INTERVIEWER_OPTIONS } from "../interviewMock";

function FieldLabel({ children, required }) {
  return (
    <label className="text-[12px] font-semibold text-slate-600 block mb-1">
      {children}
      {required && <span className="text-rose-500 ml-0.5">*</span>}
    </label>
  );
}

const inputClass = (hasError) =>
  `w-full px-3 py-2.5 rounded-lg border text-[13px] outline-none focus:ring-2 focus:ring-blue-500 ${
    hasError ? "border-rose-400" : "border-slate-200"
  }`;

// Schedule + Reschedule share one form — Epic 4 treats a reschedule as the
// same fields as a fresh schedule, just appended to interview_schedule_history
// instead of replacing it (Option B, append-only). onSubmit's caller decides
// which of those two things happens with the returned values.
export default function InterviewScheduleModal({ mode, schedule, onClose, onSubmit }) {
  const isReschedule = mode === "reschedule";

  const [scheduledAt, setScheduledAt] = useState(schedule.scheduled_at ? new Date(schedule.scheduled_at) : null);
  const [durationMinutes, setDurationMinutes] = useState(schedule.duration_minutes || 30);
  const [interviewer, setInterviewer] = useState(schedule.interviewer_names?.[0] || INTERVIEWER_OPTIONS[0].value);
  const [interviewMode, setInterviewMode] = useState(schedule.mode || "VIDEO");
  const [meetingLink, setMeetingLink] = useState(schedule.meeting_link || "");
  const [location, setLocation] = useState(schedule.location || "");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  const handleSubmit = () => {
    const nextErrors = {};
    if (!scheduledAt) nextErrors.scheduledAt = "Date & time is required.";
    if (isReschedule && !reason.trim()) nextErrors.reason = "A reason is required to reschedule.";
    if (interviewMode === "ONSITE" && !location.trim()) nextErrors.location = "Location is required for an onsite interview.";
    if (interviewMode !== "ONSITE" && !meetingLink.trim()) nextErrors.meetingLink = "A meeting link is required.";

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    onSubmit({ scheduledAt, durationMinutes, interviewer, mode: interviewMode, meetingLink, location, reason });
  };

  return (
    <Modal isOpen onClose={onClose} title={isReschedule ? "Reschedule Interview" : "Schedule Interview"} width="480px">
      <div className="space-y-4">
        <div>
          <FieldLabel required>Date &amp; Time</FieldLabel>
          <DatePicker
            selected={scheduledAt}
            onChange={setScheduledAt}
            showTimeSelect
            dateFormat="MMMM d, yyyy h:mm aa"
            minDate={new Date()}
            placeholderText="Select date & time"
            className={inputClass(errors.scheduledAt)}
            wrapperClassName="w-full"
          />
          {errors.scheduledAt && <p className="text-[11px] text-rose-600 mt-1">{errors.scheduledAt}</p>}
        </div>

        <div>
          <FieldLabel>Duration (minutes)</FieldLabel>
          <input
            type="number"
            min={15}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className={inputClass(false)}
          />
        </div>

        <div>
          <FieldLabel required>Interviewer</FieldLabel>
          <FilterListbox options={INTERVIEWER_OPTIONS} value={interviewer} onChange={setInterviewer} />
        </div>

        <div>
          <FieldLabel required>Mode</FieldLabel>
          <FilterListbox options={INTERVIEW_MODE_OPTIONS} value={interviewMode} onChange={setInterviewMode} />
        </div>

        {interviewMode === "ONSITE" ? (
          <div>
            <FieldLabel required>Location</FieldLabel>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bengaluru Office, 4th Floor"
              className={inputClass(errors.location)}
            />
            {errors.location && <p className="text-[11px] text-rose-600 mt-1">{errors.location}</p>}
          </div>
        ) : (
          <div>
            <FieldLabel required>Meeting Link</FieldLabel>
            <input
              type="text"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.example.com/..."
              className={inputClass(errors.meetingLink)}
            />
            {errors.meetingLink && <p className="text-[11px] text-rose-600 mt-1">{errors.meetingLink}</p>}
          </div>
        )}

        {isReschedule && (
          <div>
            <FieldLabel required>Reason for Reschedule</FieldLabel>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this interview being rescheduled?"
              className={inputClass(errors.reason)}
            />
            {errors.reason && <p className="text-[11px] text-rose-600 mt-1">{errors.reason}</p>}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="small" onClick={handleSubmit}>
            {isReschedule ? "Reschedule" : "Schedule"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
