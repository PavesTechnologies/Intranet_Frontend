import { useEffect, useState, useCallback, useRef } from "react";
import { getBulkUploadJobs, getBulkUploadProgress } from "../../service/resumeIntake";

const POLL_INTERVAL_MS = 4000;

// The full BulkUploadStatus enum (API reference §2) — a job sitting in any of
// these is done, even if some files failed or were cancelled along the way.
// Missing PARTIAL_FAILURE/CANCELLED here meant those jobs were permanently
// misread as "still in flight," so the poll loop never stopped.
const TERMINAL_BULK_STATUSES = ["COMPLETED", "PARTIAL_FAILURE", "FAILED", "CANCELLED"];

function isJobInFlight(job) {
  if (!job) return false;
  const status = String(job.status || job.progress?.status || "").toUpperCase();
  return !TERMINAL_BULK_STATUSES.includes(status);
}

export default function useBulkUploadJobs({ campaignFilter, enabled = true } = {}) {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const isFetchingRef = useRef(false);
  const timerRef = useRef(null);
  const isMountedRef = useRef(true);

  // GET /bulk-uploads requires campaign_id (unlike GET /resumes, where it's
  // optional) — there is no "all campaigns" bulk-upload listing on the
  // backend, so this tab can't run without a specific campaign selected.
  const canFetch = enabled && Boolean(campaignFilter);

  const fetchJobsWithProgress = useCallback(
    async (isFirstLoad = false) => {
      // Guard against overlapping concurrent requests
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (isFirstLoad) setIsLoading(true);

      try {
        const res = await getBulkUploadJobs({ campaign_id: campaignFilter });
        if (!isMountedRef.current) return;

        const rawJobs = res?.data?.items || res?.data || (Array.isArray(res) ? res : []);
        const jobList = Array.isArray(rawJobs) ? rawJobs : [];

        // Fetch progress in parallel for any active/in-flight job
        const updatedJobs = await Promise.all(
          jobList.map(async (job) => {
            const jobId = job.bulk_upload_job_id || job.id || job.task_id;
            if (!jobId) return job;

            const inFlight = isJobInFlight(job);
            if (inFlight || !job.progress) {
              try {
                const progressRes = await getBulkUploadProgress(jobId);
                if (progressRes?.data) {
                  return {
                    ...job,
                    progress: progressRes.data,
                    status: progressRes.data.status || job.status,
                  };
                }
              } catch (pErr) {
                // Ignore single progress fetch error, retain last known status
              }
            }
            return job;
          })
        );

        if (!isMountedRef.current) return;

        setJobs(updatedJobs);
        setTotalResults(res?.data?.total || updatedJobs.length);

        // Schedule next poll ONLY after response returns, only while this tab
        // is actually the active one, AND only if there are jobs in-flight.
        const hasActiveJobs = updatedJobs.some(isJobInFlight);
        if (canFetch && hasActiveJobs) {
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            fetchJobsWithProgress(false);
          }, POLL_INTERVAL_MS);
        }
      } catch (err) {
        // Schedule retry after delay on error, but stop once this tab isn't active
        // or there's no campaign selected to retry against.
        if (isMountedRef.current && canFetch) {
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            fetchJobsWithProgress(false);
          }, POLL_INTERVAL_MS);
        }
      } finally {
        isFetchingRef.current = false;
        if (isMountedRef.current && isFirstLoad) setIsLoading(false);
      }
    },
    [campaignFilter, canFetch]
  );

  useEffect(() => {
    if (!canFetch) {
      setJobs([]);
      setTotalResults(0);
      return undefined;
    }

    isMountedRef.current = true;
    fetchJobsWithProgress(true);

    return () => {
      isMountedRef.current = false;
      clearTimeout(timerRef.current);
    };
  }, [fetchJobsWithProgress, canFetch]);

  const refreshBulkJobs = () => {
    if (!canFetch) return;
    clearTimeout(timerRef.current);
    isFetchingRef.current = false;
    fetchJobsWithProgress(false);
  };

  const addLocalJob = (jobData) => {
    if (!jobData) return;
    const newJob = {
      bulk_upload_job_id: jobData.bulk_upload_job_id || jobData.id || jobData.task_id,
      task_id: jobData.task_id,
      campaign_name: jobData.campaign_name || "Campaign",
      original_filename: jobData.original_filename || "archive.zip",
      status: jobData.status || "IN_PROGRESS",
      created_at: new Date().toISOString(),
      progress: {
        bulk_upload_job_id: jobData.bulk_upload_job_id,
        status: jobData.status || "IN_PROGRESS",
        total_files: 0,
        processed_count: 0,
        failed_count: 0,
        duplicate_count: 0,
        remaining_count: 0,
        percent_complete: 0,
      },
    };
    setJobs((prev) => [newJob, ...prev.filter((j) => (j.bulk_upload_job_id || j.id) !== newJob.bulk_upload_job_id)]);
    refreshBulkJobs();
  };

  return { jobs, isLoading, totalResults, refreshBulkJobs, addLocalJob };
}
