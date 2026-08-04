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
  const [step, setStep] = useState("upload"); // "upload" | "processing" | "review"
  const [resume, setResume] = useState(null);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const pollRef = useRef(null);

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
    setStep("processing");
    beginPolling(newResume.resume_id, newStatus.task_id);
  };

  const beginPolling = (resumeId, taskId) => {
    clearTimeout(pollRef.current);
    let isFetching = false;

    const poll = async () => {
      if (isFetching) return;
      isFetching = true;
      let isTerminal = false;

      try {
        const res = await pipelineStatus(taskId);
        const data = res?.data;
        if (data) {
          setStatus(data);
          setStatusError(null);

          const overall = String(data.overall_status || "").toUpperCase();
          if (TERMINAL_STATUSES.includes(overall)) {
            isTerminal = true;
            const outcome = overall === "SUCCESS" ? "SUCCESS" : "FAILURE";
            finalizeMockIntake(resumeId, outcome);
            setResume(getResumeById(resumeId));
            if (outcome === "SUCCESS") toast.success("Resume parsed successfully.");
            else toast.error("Resume parsing failed. See the processing screen for details.");
          }
        }
      } catch (err) {
        setStatusError(extractErrorMessage(err, "Failed to fetch processing status."));
      } finally {
        isFetching = false;
        if (!isTerminal) {
          clearTimeout(pollRef.current);
          pollRef.current = setTimeout(poll, STATUS_POLL_INTERVAL_MS);
        }
      }
    };

    poll();
  };

  // Re-checks the current task's status — used when the last poll failed to
  // reach the server (network/validation error), not to restart a pipeline
  // that has already reported a real FAILURE.
  const retryStatusCheck = () => {
    if (!status?.task_id || !resume?.resume_id) return;
    beginPolling(resume.resume_id, status.task_id);
  };

  const loadExistingResume = (existingResume) => {
    if (!existingResume) return;
    const resumeId = existingResume.id || existingResume.resume_id;
    const taskId = existingResume.task_id || existingResume.task_id_ref || resumeId;
    const loadedResume = {
      resume_id: resumeId,
      candidate_id: existingResume.candidate_id || existingResume.campaign_candidate_id,
      candidate_name: existingResume.candidate_full_name || existingResume.candidate_name || "Candidate",
      candidate_email_masked: maskEmail(existingResume.candidate_email || ""),
      file_format: existingResume.file_format || "PDF",
      version_number: existingResume.version_number || 1,
      parse_status: existingResume.parse_status || "PARSING",
      parse_confidence_score: existingResume.parse_confidence_score || null,
      parser_version: existingResume.parser_version || "—",
      parse_duration_ms: existingResume.parse_duration_ms || null,
      created_at: existingResume.created_at || new Date().toISOString(),
      campaign_name: existingResume.campaign_name || "—",
      pipeline_stage: existingResume.pipeline_stage,
    };

    const initialStatus = {
      task_id: taskId,
      overall_status: existingResume.parse_status === "PENDING" ? "QUEUED" : "RUNNING",
      current_stage: null,
      stages: buildStages(),
      error_message: null,
    };

    registerMockIntake(loadedResume, initialStatus);
    setResume(loadedResume);
    setStatus(initialStatus);
    setStatusError(null);
    setStep("processing");
    beginPolling(resumeId, taskId);
  };

  const goToReview = () => setStep("review");
  const reset = () => {
    clearInterval(pollRef.current);
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
    loadExistingResume,
    goToReview,
    retryStatusCheck,
    reset,
  };
}
