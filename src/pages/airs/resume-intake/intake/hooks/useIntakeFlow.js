import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  PARSE_STAGE_ORDER,
  createMockIntake,
  finalizeMockIntake,
  getResumeById,
  getParsedJsonByResumeId,
  getCandidateSkillsByResumeId,
} from "../mock/intakeMockData";
import { MOCK_POLL_INTERVAL_MS } from "../constants/intakeConstants";

// Weighted mock outcome — mirrors the real pipeline's occasional AI_EXTRACTION
// failure on scanned/low-quality documents.
function rollOutcome() {
  return Math.random() < 0.82 ? "SUCCESS" : "FAILURE";
}

// Drives the upload -> processing -> review wizard. In a real integration,
// `submit` becomes a POST to the intake endpoint and the stage-advance timer
// becomes a `setInterval` poll of GET /resumes/{id}/status — everything
// downstream (the `status`/`resume` shape consumers see) stays identical.
export default function useIntakeFlow() {
  const [step, setStep] = useState("upload"); // "upload" | "accepted" | "processing" | "review"
  const [resume, setResume] = useState(null);
  const [status, setStatus] = useState(null);
  const pollRef = useRef(null);
  const acceptedTimeoutRef = useRef(null);
  const outcomeRef = useRef("SUCCESS");

  useEffect(() => {
    return () => {
      clearInterval(pollRef.current);
      clearTimeout(acceptedTimeoutRef.current);
    };
  }, []);

  const submit = (formValues) => {
    const { resume: newResume, status: newStatus } = createMockIntake(formValues);
    setResume(newResume);
    setStatus(newStatus);
    setStep("accepted");
    outcomeRef.current = rollOutcome();

    acceptedTimeoutRef.current = setTimeout(() => {
      setStep("processing");
      beginPolling(newResume.resume_id);
    }, 1400);
  };

  const beginPolling = (resumeId) => {
    let stageIndex = 0;
    setStatus((prev) => ({ ...prev, overall_status: "RUNNING", current_stage: PARSE_STAGE_ORDER[0] }));

    pollRef.current = setInterval(() => {
      const failingHere = outcomeRef.current === "FAILURE" && stageIndex === 2; // AI_EXTRACTION
      setStatus((prev) => {
        const stages = prev.stages.map((s, i) => {
          if (i < stageIndex) return s;
          if (i === stageIndex) {
            return failingHere
              ? {
                  ...s,
                  status: "FAILED",
                  duration_ms: 1400 + Math.floor(Math.random() * 600),
                  error_message:
                    "LLM extraction returned malformed JSON after 3 retries. Source text density suggests a scanned/image-based PDF with low OCR confidence.",
                }
              : { ...s, status: "SUCCESS", duration_ms: 300 + Math.floor(Math.random() * 1600) };
          }
          return s;
        });

        if (failingHere) {
          return { ...prev, overall_status: "FAILURE", current_stage: PARSE_STAGE_ORDER[stageIndex], stages, error_message: stages[stageIndex].error_message };
        }

        const isLastStage = stageIndex === PARSE_STAGE_ORDER.length - 1;
        return {
          ...prev,
          overall_status: isLastStage ? "SUCCESS" : "RUNNING",
          current_stage: isLastStage ? null : PARSE_STAGE_ORDER[stageIndex + 1],
          stages,
        };
      });

      if (failingHere) {
        clearInterval(pollRef.current);
        finalizeMockIntake(resumeId, "FAILURE");
        setResume(getResumeById(resumeId));
        toast.error("Resume parsing failed. See the processing screen for details.");
        return;
      }

      if (stageIndex === PARSE_STAGE_ORDER.length - 1) {
        clearInterval(pollRef.current);
        finalizeMockIntake(resumeId, "SUCCESS");
        setResume(getResumeById(resumeId));
        toast.success("Resume parsed successfully.");
        return;
      }

      stageIndex += 1;
    }, MOCK_POLL_INTERVAL_MS);
  };

  const retry = () => {
    if (!resume) return;
    outcomeRef.current = Math.random() < 0.95 ? "SUCCESS" : "FAILURE";
    setStatus((prev) => ({
      ...prev,
      overall_status: "RUNNING",
      error_message: null,
      stages: prev.stages.map((s) => ({ ...s, status: "PENDING", duration_ms: null, error_message: null })),
    }));
    beginPolling(resume.resume_id);
  };

  const goToReview = () => setStep("review");
  const reset = () => {
    clearInterval(pollRef.current);
    clearTimeout(acceptedTimeoutRef.current);
    setResume(null);
    setStatus(null);
    setStep("upload");
  };

  const parsedJson = resume ? getParsedJsonByResumeId(resume.resume_id) : null;
  const candidateSkills = resume ? getCandidateSkillsByResumeId(resume.resume_id) : [];

  return {
    step,
    resume,
    status,
    parsedJson,
    candidateSkills,
    submit,
    goToReview,
    retry,
    reset,
  };
}
