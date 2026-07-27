import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { pipelineStatus } from "../../../service/resumeIntake";
import {
  buildStages,
  registerMockIntake,
  finalizeMockIntake,
  getResumeById,
  getParsedJsonByResumeId,
  getCandidateSkillsByResumeId,
  maskEmail,
} from "../mock/intakeMockData";
import { STATUS_POLL_INTERVAL_MS } from "../constants/intakeConstants";
import { extractErrorMessage } from "../utils/intakeUtils.jsx";

const TERMINAL_STATUSES = ["SUCCESS", "FAILURE", "FAILED"];

// Drives the upload -> processing -> review wizard. Upload posts the real
// resume to the backend; processing then polls the real
// GET /resumes/processing-status/{taskId} endpoint until the pipeline
// reaches a terminal state. Parsed data / candidate skills have no real
// endpoint yet, so those still come from the mock lookup tables once the
// real pipeline reports SUCCESS.
export default function useIntakeFlow() {
  const [step, setStep] = useState("upload"); // "upload" | "accepted" | "processing" | "review"
  const [resume, setResume] = useState(null);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const pollRef = useRef(null);
  const acceptedTimeoutRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  // `uploadResponse` is the accepted-response `data` payload returned by the
  // real POST /resumes call (resume_id, task_id, campaign_name, ...).
  const submit = ({ uploadResponse, candidateName, candidateEmail, fileFormat }) => {
    const newResume = {
      resume_id: uploadResponse.resume_id,
      candidate_id: uploadResponse.campaign_candidate_id,
      candidate_name: candidateName,
      candidate_email_masked: maskEmail(candidateEmail),
      file_format: fileFormat,
      version_number: 1,
      parse_status: uploadResponse.parse_status || "PENDING",
      parse_confidence_score: null,
      parser_version: "—",
      parse_duration_ms: null,
      created_at: new Date().toISOString(),
      campaign_name: uploadResponse.campaign_name,
      pipeline_stage: uploadResponse.pipeline_stage,
    };

    const newStatus = {
      task_id: uploadResponse.task_id,
      overall_status: "QUEUED",
      current_stage: null,
      stages: buildStages(),
      error_message: null,
    };

    registerMockIntake(newResume, newStatus);
    setResume(newResume);
    setStatus(newStatus);
    setStatusError(null);
    setStep("accepted");

    acceptedTimeoutRef.current = setTimeout(() => {
      setStep("processing");
      beginPolling(newResume.resume_id, newStatus.task_id);
    }, 1400);
  };

  const beginPolling = (resumeId, taskId) => {
    clearInterval(pollRef.current);

    const poll = async () => {
      try {
        const res = await pipelineStatus(taskId);
        const data = res?.data;
        if (!data) return;

        setStatus(data);
        setStatusError(null);

        const overall = String(data.overall_status || "").toUpperCase();
        if (TERMINAL_STATUSES.includes(overall)) {
          clearInterval(pollRef.current);
          const outcome = overall === "SUCCESS" ? "SUCCESS" : "FAILURE";
          finalizeMockIntake(resumeId, outcome);
          setResume(getResumeById(resumeId));
          if (outcome === "SUCCESS") toast.success("Resume parsed successfully.");
          else toast.error("Resume parsing failed. See the processing screen for details.");
        }
      } catch (err) {
        setStatusError(extractErrorMessage(err, "Failed to fetch processing status."));
      }
    };

    poll();
    pollRef.current = setInterval(poll, STATUS_POLL_INTERVAL_MS);
  };

  // Re-checks the current task's status — used when the last poll failed to
  // reach the server (network/validation error), not to restart a pipeline
  // that has already reported a real FAILURE.
  const retryStatusCheck = () => {
    if (!status?.task_id || !resume?.resume_id) return;
    beginPolling(resume.resume_id, status.task_id);
  };

  const goToReview = () => setStep("review");
  const reset = () => {
    clearInterval(pollRef.current);
    clearTimeout(acceptedTimeoutRef.current);
    setResume(null);
    setStatus(null);
    setStatusError(null);
    setStep("upload");
  };

  const parsedJson = resume ? getParsedJsonByResumeId(resume.resume_id) : null;
  const candidateSkills = resume ? getCandidateSkillsByResumeId(resume.resume_id) : [];

  return {
    step,
    resume,
    status,
    statusError,
    parsedJson,
    candidateSkills,
    submit,
    goToReview,
    retryStatusCheck,
    reset,
  };
}
