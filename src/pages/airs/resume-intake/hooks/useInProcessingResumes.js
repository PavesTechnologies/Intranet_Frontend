import { useEffect, useState } from "react";
import { getAllResumes } from "../../service/resumeIntake";

// Backs the "In Processing" tab beside Resume Upload History, using the same
// real GET /resumes endpoint as the history tab — there is no separate
// "in-flight resumes" endpoint. The API only accepts one `parse_status` value
// per call, so when no status filter is chosen we fetch PENDING and PARSING
// in parallel and merge them; when the user picks a specific status via the
// shared filter bar, that single status is fetched directly.
const IN_PROCESS_STATUSES = ["PENDING", "PARSING"];

// No pagination UI on this tab yet, so each status is capped at a page big
// enough to cover realistic in-flight volume rather than left unbounded.
const IN_PROCESS_PAGE_SIZE = 50;

// Lighter cadence than the 3s single-resume status poll (STATUS_POLL_INTERVAL_MS)
// since this refetches a list rather than one task.
const LIST_POLL_INTERVAL_MS = 10000;

export default function useInProcessingResumes({ campaignFilter, statusFilter, sourceFilter, sortValue }) {
  const [files, setFiles] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [sortBy, sortDir] = sortValue.split(":");
  const statusesToFetch = statusFilter ? [statusFilter] : IN_PROCESS_STATUSES;

  useEffect(() => {
    let cancelled = false;

    const baseParams = {
      campaign_id: campaignFilter || undefined,
      source: sourceFilter || undefined,
      page: 1,
      size: IN_PROCESS_PAGE_SIZE,
      sort_by: sortBy,
      sort_dir: sortDir,
    };

    const fetchInProcessing = async (isFirstLoad) => {
      if (isFirstLoad) setIsLoading(true);
      try {
        const responses = await Promise.all(
          statusesToFetch.map((parse_status) => getAllResumes({ ...baseParams, parse_status }))
        );
        if (cancelled) return;

        const items = responses.flatMap((res) => res?.data?.items || []);
        items.sort((a, b) => {
          const dir = sortDir === "asc" ? 1 : -1;
          if (sortBy === "parse_status") return a.parse_status.localeCompare(b.parse_status) * dir;
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
        });

        setFiles(items);
        setTotalResults(responses.reduce((sum, res) => sum + (res?.data?.total || 0), 0));
      } catch (err) {
        // Transient poll failures keep the last known list rather than clearing it.
      } finally {
        if (!cancelled && isFirstLoad) setIsLoading(false);
      }
    };

    const triggerRefetch = () => fetchInProcessing(false);

    fetchInProcessing(true);
    const intervalId = setInterval(() => fetchInProcessing(false), LIST_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [campaignFilter, statusFilter, sourceFilter, sortBy, sortDir]);

  const refreshInProcessing = async () => {
    const baseParams = {
      campaign_id: campaignFilter || undefined,
      source: sourceFilter || undefined,
      page: 1,
      size: IN_PROCESS_PAGE_SIZE,
      sort_by: sortBy,
      sort_dir: sortDir,
    };
    try {
      const responses = await Promise.all(
        statusesToFetch.map((parse_status) => getAllResumes({ ...baseParams, parse_status }))
      );
      const items = responses.flatMap((res) => res?.data?.items || []);
      items.sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        if (sortBy === "parse_status") return a.parse_status.localeCompare(b.parse_status) * dir;
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      });
      setFiles(items);
      setTotalResults(responses.reduce((sum, res) => sum + (res?.data?.total || 0), 0));
    } catch (err) {}
  };

  return { files, totalResults, isLoading, refreshInProcessing };
}
