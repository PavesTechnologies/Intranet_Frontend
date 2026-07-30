import { useEffect, useState } from "react";
import {
  getMockInProcessingResumes,
  advanceMockInProcessing,
} from "../intake/mock/inProcessingMockData";

// Polling cadence for the mock "in processing" queue, matched to the same
// STATUS_POLL_INTERVAL_MS used while a single resume is parsing so the tab
// feels consistent with the rest of the intake flow.
const POLL_INTERVAL_MS = 3000;

// Backs the "In Processing" tab beside Resume Upload History. There is no
// backend endpoint yet for resumes currently queued/parsing, so this reads
// from the mock store in intake/mock/inProcessingMockData.js. It accepts the
// same filter values ResumeIntakeFilters already manages on the page (shared
// with useResumeIntake) so both tabs stay in sync when the user changes a
// filter. Swapping in a real endpoint later means replacing the body of
// fetchInProcessing with a service call — the filter contract is unchanged.
export default function useInProcessingResumes({ campaignFilter, statusFilter, sourceFilter, sortValue }) {
  const [files, setFiles] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [sortBy, sortDir] = sortValue.split(":");

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    const fetchInProcessing = async (isFirstLoad) => {
      if (isFirstLoad) setIsLoading(true);
      try {
        const res = await getMockInProcessingResumes({
          campaign_id: campaignFilter || undefined,
          parse_status: statusFilter || undefined,
          source: sourceFilter || undefined,
          sort_by: sortBy,
          sort_dir: sortDir,
        });
        if (cancelled) return;
        setFiles(res?.data?.items || []);
        setTotalResults(res?.data?.total || 0);
      } finally {
        if (!cancelled && isFirstLoad) setIsLoading(false);
      }
    };

    fetchInProcessing(true);
    intervalId = setInterval(() => {
      advanceMockInProcessing();
      fetchInProcessing(false);
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [campaignFilter, statusFilter, sourceFilter, sortBy, sortDir]);

  return { files, totalResults, isLoading };
}
