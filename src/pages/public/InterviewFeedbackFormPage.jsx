import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Button from "../../components/Button/Button";
import { getFeedbackFormContext, submitFeedback } from "./services/publicFeedbackService";

const RECOMMENDATION_OPTIONS = [
  { value: "ADVANCE", label: "Advance" },
  { value: "SELECT", label: "Select" },
  { value: "REJECT", label: "Reject" },
  { value: "HOLD", label: "Hold" },
];

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6">{children}</div>
    </div>
  );
}

function CalmState({ icon: Icon, iconClassName, title, message }) {
  return (
    <div className="flex flex-col items-center text-center gap-3 py-4">
      <Icon className={iconClassName} size={40} />
      <h1 className="text-base font-semibold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">{message}</p>
    </div>
  );
}

// Standalone, unauthenticated route — no app shell (sidebar/header), no
// AuthContext dependency. The person here clicked a link from an email;
// they have no account and no session. Security is the signed, expiring
// token in the URL, not anything this page checks itself.
export default function InterviewFeedbackFormPage() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState(null);
  const [invalid, setInvalid] = useState(false);

  const [recommendation, setRecommendation] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitState, setSubmitState] = useState(null); // null | "success" | "duplicate"

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getFeedbackFormContext(token);
        if (!cancelled) setContext(data);
      } catch {
        // 404/410 (invalid or expired) and anything else all land on the
        // same calm "can't use this link" state — the token itself is the
        // only thing being validated here.
        if (!cancelled) setInvalid(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async () => {
    if (!recommendation) {
      setFormError("Please select a recommendation.");
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      await submitFeedback(token, { recommendation, notes: notes.trim() });
      setSubmitState("success");
    } catch (err) {
      if (err?.response?.status === 409) {
        // Not a failure from the interviewer's perspective — they already
        // did the thing they came here to do.
        setSubmitState("duplicate");
      } else {
        setFormError(err?.response?.data?.message || "Couldn't submit feedback. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Shell>
        <p className="text-center text-sm text-slate-500 py-8">Loading...</p>
      </Shell>
    );
  }

  if (invalid) {
    return (
      <Shell>
        <CalmState
          icon={AlertCircle}
          iconClassName="text-slate-300"
          title="This link has expired or is invalid"
          message="Please contact the recruiter or hiring manager if you still need to submit feedback for this interview."
        />
      </Shell>
    );
  }

  if (submitState === "success") {
    return (
      <Shell>
        <CalmState
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
          title="Thank you for your feedback"
          message="Your feedback has been recorded."
        />
      </Shell>
    );
  }

  if (submitState === "duplicate") {
    return (
      <Shell>
        <CalmState
          icon={CheckCircle2}
          iconClassName="text-emerald-500"
          title="You've already submitted feedback"
          message="Feedback for this interview has already been recorded — there's nothing further to do here."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-5">
        <h1 className="text-base font-bold text-slate-900">Interview Feedback</h1>
        <p className="text-sm text-slate-500 mt-1">
          {context?.candidateName}
          {context?.interviewType && <> · {context.interviewType}</>}
          {context?.date && <> · {context.date}</>}
        </p>
        {context?.interviewerName && <p className="text-xs text-slate-400 mt-1">Submitting as {context.interviewerName}</p>}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Recommendation</label>
          <div className="grid grid-cols-2 gap-2">
            {RECOMMENDATION_OPTIONS.map((opt) => {
              const isSelected = recommendation === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    setRecommendation(opt.value);
                    setFormError("");
                  }}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium text-center transition-colors ${
                    isSelected ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700 hover:border-blue-200"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Share your assessment..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {formError && <p className="text-xs text-rose-600">{formError}</p>}

        <Button variant="primary" onClick={handleSubmit} loading={submitting} loadingText="Submitting..." className="w-full justify-center">
          Submit Feedback
        </Button>
      </div>
    </Shell>
  );
}
