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
const IN_PROCESS_PAGE_SIZE = 12;

export default function useInProcessingResumes({ campaignFilter, statusFilter, sourceFilter, sortValue, enabled = true }) {
  const [files, setFiles] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [sortBy, sortDir] = sortValue.split(":");
  const statusesToFetch = statusFilter ? [statusFilter] : IN_PROCESS_STATUSES;

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let isFetching = false;
    let timerId = null;

    const baseParams = {
      campaign_id: campaignFilter || undefined,
      source: sourceFilter || undefined,
      page: 1,
      size: IN_PROCESS_PAGE_SIZE,
      sort_by: sortBy,
      sort_dir: sortDir,
    };

    const fetchInProcessing = async (isFirstLoad) => {
      if (isFetching || cancelled) return;
      isFetching = true;
      if (isFirstLoad) setIsLoading(true);

      let itemCount = 0;

      try {
        const responses = await Promise.all(
          statusesToFetch.map((parse_status) => getAllResumes({ ...baseParams, parse_status }))
        );
        if (cancelled) return;

        const items = responses.flatMap((res) => res?.data?.items || []);
        itemCount = items.length;
        items.sort((a, b) => {
          const dir = sortDir === "asc" ? 1 : -1;
          if (sortBy === "parse_status") return a.parse_status.localeCompare(b.parse_status) * dir;
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
        });

        setFiles(items);
        setTotalResults(responses.reduce((sum, res) => sum + (res?.data?.total || 0), 0));
      } catch (err) {
        // Transient failures keep the last known list rather than clearing it.
      } finally {
        isFetching = false;
        if (!cancelled && isFirstLoad) setIsLoading(false);

        // Schedule next poll ONLY after response returns and if there are active in-progress items
        if (!cancelled && itemCount > 0) {
          clearTimeout(timerId);
          timerId = setTimeout(() => fetchInProcessing(false), 8000);
        }
      }
    };

    fetchInProcessing(true);

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [campaignFilter, statusFilter, sourceFilter, sortBy, sortDir, enabled]);

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
