import React, { useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";
import { AlertTriangle, Check, CheckCircle2, Plus, X } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button/Button";
import { getMicrosoftStatus, connectMicrosoft, getGoogleStatus, connectGoogle } from "@/pages/airs/settings/services/oauthService";
import {
  INTERVIEW_TYPE_LABEL,
  PLATFORM_OPTIONS,
  PLATFORM_LABEL,
  getAvailabilityMock,
  formatDateLabel,
  formatTimeLabel,
} from "../interviewMock";

// Platform values that need a calendar connection to auto-generate a real
// meeting link — keyed the same way SettingsIntegrations.jsx keys its own
// provider list, so status/connect responses mean the same thing in both
// places.
const CALENDAR_PROVIDERS = {
  TEAMS: { key: "microsoft", label: "Microsoft Calendar", getStatus: getMicrosoftStatus, connect: connectMicrosoft },
  MEET: { key: "google", label: "Google Calendar", getStatus: getGoogleStatus, connect: connectGoogle },
};
const POLL_INTERVAL_MS = 2500;

const STEPS = [
  { id: 1, label: "Details" },
  { id: 2, label: "Schedule" },
  { id: 3, label: "Platform" },
  { id: 4, label: "Review" },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function dateToKey(date) {
  if (!date) return null;
  // toISOString() converts to UTC first — for any timezone ahead of UTC
  // (e.g. IST), local midnight on the selected day falls on the *previous*
  // UTC day, silently shifting the date back one. Building the string from
  // local getters instead keeps it exactly the day that was clicked.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesBetween(start, end) {
  return timeToMinutes(end) - timeToMinutes(start);
}

function addMinutesToTime(time, minutesToAdd) {
  const total = ((timeToMinutes(time) + minutesToAdd) % (24 * 60) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Manually-entered start/end times aren't tied to the mock availability
// grid's fixed slots, so a "conflict" is any fixed slot that (a) overlaps
// the chosen time window and (b) has an interviewer marked unavailable.
function findConflicts(availabilitySlots, startTime, endTime) {
  const startM = timeToMinutes(startTime);
  const endM = timeToMinutes(endTime);
  const names = new Set();

  availabilitySlots.forEach((slot) => {
    const overlaps = timeToMinutes(slot.start) < endM && timeToMinutes(slot.end) > startM;
    if (overlaps && !slot.available) {
      slot.unavailableInterviewers.forEach((i) => names.add(i.name));
    }
  });

  return Array.from(names);
}

// Displays a legacy enum interview_type (from the seeded mock rounds) with
// its friendly label, or falls back to whatever free text was typed in for
// interview types created through this form.
function interviewTypeDisplay(value) {
  return INTERVIEW_TYPE_LABEL[value] || value;
}

// Schedule + Reschedule share one 4-step wizard — Epic 4 treats a reschedule
// as the same fields as a fresh schedule, just appended to
// interview_schedule_history instead of replacing it (Option B, append-only).
// onSubmit's caller decides which of those two things happens with the
// returned values.
//
// Interview type and interviewers are free-form here — there's no backend
// interview-type catalogue or interviewer directory yet, so both are typed
// in manually rather than picked from a predefined list.
export default function InterviewScheduleModal({ mode, round, isSubmitting, onClose, onSubmit }) {
  const isReschedule = mode === "reschedule";

  const [step, setStep] = useState(1);
  const [interviewType, setInterviewType] = useState(round?.interview_type || "");
  const [interviewers, setInterviewers] = useState(round?.interviewers || []);
  const [interviewerName, setInterviewerName] = useState("");
  const [interviewerEmail, setInterviewerEmail] = useState("");
  const [interviewerFormError, setInterviewerFormError] = useState("");
  const [date, setDate] = useState(round ? new Date(`${round.date}T00:00:00`) : null);
  const [startTime, setStartTime] = useState(round?.start_time || "");
  const [endTime, setEndTime] = useState(round?.end_time || "");
  const [platform, setPlatform] = useState(round?.platform || null);
  const [location, setLocation] = useState(round?.location || "");
  const [notes, setNotes] = useState(round?.notes || "");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  // Inline calendar connect (Platform step) — null = status not loaded yet,
  // so the Connect button only appears once we're sure the provider is
  // actually disconnected, never flashes on for an instant while loading.
  const [connectionStatus, setConnectionStatus] = useState({ microsoft: null, google: null });
  const [connectingProvider, setConnectingProvider] = useState(null); // "microsoft" | "google" | null
  const pollRef = useRef(null);

  useEffect(() => {
    Object.values(CALENDAR_PROVIDERS).forEach(async (provider) => {
      try {
        const connected = await provider.getStatus();
        setConnectionStatus((s) => ({ ...s, [provider.key]: connected }));
      } catch {
        setConnectionStatus((s) => ({ ...s, [provider.key]: false }));
      }
    });
  }, []);

  // Stop polling if the wizard is closed/unmounted mid-connect — otherwise
  // the interval keeps hitting /status after there's no one left to update.
  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
  }, []);

  // Opens the OAuth consent screen in a popup instead of navigating this
  // tab away (which would discard everything typed into steps 1-2). The
  // popup runs the exact same flow as the Settings page; since /status
  // can't push a notification back to us, we poll it every few seconds
  // while the popup is open and again once it's closed, to catch a
  // connection that finished right as the user closed the window.
  const handleConnectCalendar = async (provider) => {
    setConnectingProvider(provider.key);
    try {
      const authUrl = await provider.connect();
      if (!authUrl) throw new Error("No auth URL returned");

      const popup = window.open(authUrl, "calendar-connect", "width=500,height=650");
      if (!popup) {
        toast.error(`Couldn't open the ${provider.label} connect window. Please allow popups and try again.`);
        setConnectingProvider(null);
        return;
      }

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const wasClosed = popup.closed;
        try {
          const connected = await provider.getStatus();
          if (connected) {
            clearInterval(pollRef.current);
            pollRef.current = null;
            setConnectionStatus((s) => ({ ...s, [provider.key]: true }));
            setConnectingProvider(null);
            if (!wasClosed) popup.close();
            return;
          }
        } catch {
          // Transient — keep polling until the popup closes rather than
          // giving up on one failed status check.
        }
        if (wasClosed) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          setConnectingProvider(null);
        }
      }, POLL_INTERVAL_MS);
    } catch {
      toast.error(`Couldn't start the ${provider.label} connection. Please try again.`);
      setConnectingProvider(null);
    }
  };

  const dateKey = dateToKey(date);
  const availabilitySlots = useMemo(
    () => (dateKey && interviewers.length ? getAvailabilityMock(interviewers, dateKey) : []),
    [dateKey, interviewers]
  );
  const conflicts = useMemo(
    () => (startTime && endTime ? findConflicts(availabilitySlots, startTime, endTime) : []),
    [availabilitySlots, startTime, endTime]
  );
  const durationMinutes = startTime && endTime ? minutesBetween(startTime, endTime) : 0;

  // Field errors only get set by validateStep (on Next/Confirm) — clear the
  // relevant one as soon as the field is edited so a fixed field's error
  // doesn't stay stuck on screen until the next button click.
  const clearError = (key) => {
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleAddInterviewer = () => {
    const name = interviewerName.trim();
    const email = interviewerEmail.trim();

    if (!name || !email) {
      setInterviewerFormError("Please enter the interviewer's name and email.");
      return;
    }
    if (!EMAIL_PATTERN.test(email)) {
      setInterviewerFormError("Please enter a valid email address.");
      return;
    }
    if (interviewers.some((i) => i.email.toLowerCase() === email.toLowerCase())) {
      setInterviewerFormError("This interviewer has already been added.");
      return;
    }

    setInterviewers((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, name, email }]);
    setInterviewerName("");
    setInterviewerEmail("");
    setInterviewerFormError("");
    clearError("interviewers");
  };

  const handleRemoveInterviewer = (id) => setInterviewers((prev) => prev.filter((i) => i.id !== id));

  // Defaults the end time to 30 minutes after whatever start time was just
  // picked — the scheduler can still adjust it, but never below the start
  // time (enforced both by the input's min attribute and by validation).
  const handleStartTimeChange = (value) => {
    setStartTime(value);
    setEndTime(value ? addMinutesToTime(value, 30) : "");
    clearError("startTime");
    clearError("endTime");
  };

  const validateStep = (current) => {
    const nextErrors = {};
    if (current === 1) {
      if (!interviewType.trim()) nextErrors.interviewType = "Please enter an interview type.";
      if (!interviewers.length) nextErrors.interviewers = "Please add at least one interviewer.";
    }
    if (current === 2) {
      if (!date) nextErrors.date = "Please select an interview date.";
      if (!startTime) nextErrors.startTime = "Please select a start time.";
      if (!endTime) nextErrors.endTime = "Please select an end time.";
      if (startTime && endTime && minutesBetween(startTime, endTime) <= 0) {
        nextErrors.endTime = "End time must be after the start time.";
      }
    }
    if (current === 3) {
      if (!platform) nextErrors.platform = "Please select a meeting platform.";
      if (platform === "ONSITE" && !location.trim()) nextErrors.location = "Location is required for an onsite interview.";
      if (isReschedule && !reason.trim()) nextErrors.reason = "A reason is required to reschedule.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleConfirm = () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      // Jump back to whichever step is actually incomplete instead of just
      // failing silently on Review.
      if (!interviewType.trim() || !interviewers.length) setStep(1);
      else if (!date || !startTime || !endTime || minutesBetween(startTime, endTime) <= 0) setStep(2);
      else setStep(3);
      return;
    }

    onSubmit({
      interviewType: interviewType.trim(),
      interviewers,
      date: dateKey,
      startTime,
      endTime,
      durationMinutes,
      platform,
      meetingLink: null, // generated by the caller on confirm
      location: platform === "ONSITE" ? location.trim() : null,
      notes,
      reason,
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isReschedule ? "Reschedule Interview" : "Schedule Interview"}
      width="560px"
    >
      <div className="space-y-5">
        <ol className="flex items-center gap-2">
          {STEPS.map((s, idx) => (
            <li key={s.id} className="flex items-center gap-2 flex-1">
              <span
                className={`flex items-center justify-center h-6 w-6 rounded-full text-[11px] font-bold shrink-0 ${
                  step > s.id
                    ? "bg-emerald-500 text-white"
                    : step === s.id
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-400"
                }`}
              >
                {step > s.id ? <Check size={13} /> : s.id}
              </span>
              <span className={`text-[11.5px] font-semibold ${step === s.id ? "text-slate-900" : "text-slate-400"}`}>
                {s.label}
              </span>
              {idx < STEPS.length - 1 && <span className="flex-1 h-px bg-slate-200" />}
            </li>
          ))}
        </ol>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <FieldLabel required>Interview Type</FieldLabel>
              <input
                type="text"
                value={interviewType}
                onChange={(e) => {
                  setInterviewType(e.target.value);
                  clearError("interviewType");
                }}
                placeholder="e.g. Technical Interview"
                className={inputClass(errors.interviewType)}
              />
              {errors.interviewType && <p className="text-[11px] text-rose-600 mt-1">{errors.interviewType}</p>}
            </div>

            <div>
              <FieldLabel required>Interviewers</FieldLabel>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={interviewerName}
                  onChange={(e) => {
                    setInterviewerName(e.target.value);
                    if (interviewerFormError) setInterviewerFormError("");
                  }}
                  placeholder="Interviewer name"
                  className={inputClass(false) + " flex-1"}
                />
                <input
                  type="email"
                  value={interviewerEmail}
                  onChange={(e) => {
                    setInterviewerEmail(e.target.value);
                    if (interviewerFormError) setInterviewerFormError("");
                  }}
                  placeholder="Interviewer email"
                  className={inputClass(false) + " flex-1"}
                />
                <Button type="button" variant="outline" size="small" onClick={handleAddInterviewer} className="shrink-0">
                  <Plus size={14} /> Add
                </Button>
              </div>
              {interviewerFormError && <p className="text-[11px] text-rose-600 mt-1">{interviewerFormError}</p>}
              {errors.interviewers && <p className="text-[11px] text-rose-600 mt-1">{errors.interviewers}</p>}

              {interviewers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {interviewers.map((i) => (
                    <span
                      key={i.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 text-[12px] font-medium text-slate-700 pl-2.5 pr-1.5 py-1"
                    >
                      {i.name}
                      <span className="text-slate-400 font-normal">({i.email})</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterviewer(i.id)}
                        className="text-slate-400 hover:text-rose-600"
                        aria-label={`Remove ${i.name}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <FieldLabel required>Date</FieldLabel>
              <DatePicker
                selected={date}
                onChange={(nextDate) => {
                  setDate(nextDate);
                  clearError("date");
                }}
                dateFormat="d MMMM yyyy"
                minDate={new Date()}
                placeholderText="Select interview date"
                className={inputClass(errors.date)}
                wrapperClassName="w-full"
              />
              {errors.date && <p className="text-[11px] text-rose-600 mt-1">{errors.date}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Start Time</FieldLabel>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className={inputClass(errors.startTime)}
                />
                {errors.startTime && <p className="text-[11px] text-rose-600 mt-1">{errors.startTime}</p>}
              </div>
              <div>
                <FieldLabel required>End Time</FieldLabel>
                <input
                  type="time"
                  value={endTime}
                  min={startTime || undefined}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    clearError("endTime");
                  }}
                  className={inputClass(errors.endTime)}
                />
                {errors.endTime && <p className="text-[11px] text-rose-600 mt-1">{errors.endTime}</p>}
              </div>
            </div>

            {durationMinutes > 0 && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                <div className="text-[10.5px] text-slate-400">Duration</div>
                <div className="text-[13px] font-bold text-slate-900 mt-1">{durationMinutes} minutes</div>
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 flex items-start gap-2">
                <AlertTriangle size={15} className="text-rose-500 shrink-0 mt-0.5" />
                <p className="text-[12px] text-rose-700">
                  <span className="font-semibold">Scheduling Conflict.</span> {conflicts.join(", ")}{" "}
                  {conflicts.length > 1 ? "are" : "is"} unavailable during {formatTimeLabel(startTime)} - {formatTimeLabel(endTime)} on{" "}
                  {formatDateLabel(dateKey)}. You can still proceed, but consider picking another time.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <FieldLabel required>Platform</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                {PLATFORM_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = platform === option.value;
                  return (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => {
                        setPlatform(option.value);
                        clearError("platform");
                      }}
                      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        isSelected ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-200"
                      }`}
                    >
                      <Icon size={16} className={isSelected ? "text-blue-600" : "text-slate-400"} />
                      <span>
                        <span className={`block text-[12.5px] font-semibold ${isSelected ? "text-blue-700" : "text-slate-800"}`}>
                          {option.label}
                        </span>
                        <span className="block text-[11px] text-slate-400">{option.subtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {errors.platform && <p className="text-[11px] text-rose-600 mt-1">{errors.platform}</p>}

              {/* ONSITE/PHONE have no connection concept, so they always get
                  the plain static note. TEAMS/MEET replace it with a message
                  driven by the *viewer's own* connection status below —
                  previously this note showed unconditionally even for an
                  already-connected user, wrongly implying nothing was set up. */}
              {platform && !CALENDAR_PROVIDERS[platform] && (
                <p className="text-[11.5px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-2">
                  {PLATFORM_OPTIONS.find((p) => p.value === platform)?.note}
                </p>
              )}

              {CALENDAR_PROVIDERS[platform] && (() => {
                const provider = CALENDAR_PROVIDERS[platform];
                const status = connectionStatus[provider.key];
                const meetingLabel = platform === "TEAMS" ? "Microsoft Teams" : "Google Meet";

                if (status === true) {
                  return (
                    <p className="flex items-start gap-1.5 text-[11.5px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 mt-2">
                      <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      A {meetingLabel} link will be created automatically when you schedule this interview.
                    </p>
                  );
                }

                if (status === false) {
                  return (
                    <div className="mt-2 space-y-2">
                      <p className="text-[11.5px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                        Connect your {provider.label} to auto-generate a {meetingLabel} link for this interview.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="small"
                        onClick={() => handleConnectCalendar(provider)}
                        loading={connectingProvider === provider.key}
                        loadingText="Waiting for connection..."
                      >
                        Connect {provider.label}
                      </Button>
                    </div>
                  );
                }

                // Status hasn't resolved yet — fall back to the neutral
                // generic note rather than guessing connected/not-connected.
                return (
                  <p className="text-[11.5px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5 mt-2">
                    {PLATFORM_OPTIONS.find((p) => p.value === platform)?.note}
                  </p>
                );
              })()}
            </div>

            {platform === "ONSITE" && (
              <div>
                <FieldLabel required>Location</FieldLabel>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    clearError("location");
                  }}
                  placeholder="e.g. Bengaluru Office, 4th Floor"
                  className={inputClass(errors.location)}
                />
                {errors.location && <p className="text-[11px] text-rose-600 mt-1">{errors.location}</p>}
              </div>
            )}

            <div>
              <FieldLabel>Interview Notes</FieldLabel>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the interviewers should know ahead of time..."
                className={inputClass(false)}
              />
            </div>

            {isReschedule && (
              <div>
                <FieldLabel required>Reason for Reschedule</FieldLabel>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    clearError("reason");
                  }}
                  placeholder="Why is this interview being rescheduled?"
                  className={inputClass(errors.reason)}
                />
                {errors.reason && <p className="text-[11px] text-rose-600 mt-1">{errors.reason}</p>}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-[12.5px] font-bold text-slate-900">Review Interview</p>
            <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">
              {[
                ["Interview Type", interviewTypeDisplay(interviewType)],
                ["Interviewers", interviewers.map((i) => `${i.name} (${i.email})`).join(", ")],
                ["Date", formatDateLabel(dateKey)],
                ["Time", startTime && endTime ? `${formatTimeLabel(startTime)} - ${formatTimeLabel(endTime)}` : "-"],
                ["Duration", durationMinutes > 0 ? `${durationMinutes} minutes` : "-"],
                ["Platform", PLATFORM_LABEL[platform] || "-"],
                ...(platform === "ONSITE" ? [["Location", location]] : []),
                ...(notes ? [["Notes", notes]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4 px-3.5 py-2.5">
                  <span className="text-[11.5px] text-slate-400 shrink-0">{label}</span>
                  <span className="text-[12.5px] font-semibold text-slate-900 text-right">{value || "-"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          {step > 1 && (
            <Button variant="outline" size="small" onClick={goBack} disabled={isSubmitting}>
              Back
            </Button>
          )}
          <Button variant="outline" size="small" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {step < 4 ? (
            <Button variant="primary" size="small" onClick={goNext}>
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="small"
              onClick={handleConfirm}
              loading={isSubmitting}
              loadingText={isReschedule ? "Rescheduling..." : "Scheduling..."}
            >
              {isReschedule ? "Confirm Reschedule" : "Confirm Schedule"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
