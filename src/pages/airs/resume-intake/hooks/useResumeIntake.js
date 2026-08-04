import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getAllResumes, activeCampaigns } from "../../service/resumeIntake";
import { extractErrorMessage } from "../intake/utils/intakeUtils.jsx";
import { RESUME_LIST_PAGE_SIZE } from "../constants/resumeIntakeConstants";

const DEFAULT_SORT_VALUE = "created_at:desc";

export default function useResumeIntake() {
  // Kept in the URL (not plain useState) so navigating away to a candidate
  // scorecard and back restores the exact filters/page you had, instead of
  // resetting to defaults on remount — same pattern as the tab in
  // ResumeIntakePage.
  const [searchParams, setSearchParams] = useSearchParams();

  const campaignFilter = searchParams.get("campaign") || "";
  const statusFilter = searchParams.get("status") || "";
  const sourceFilter = searchParams.get("source") || "";
  const sortValue = searchParams.get("sort") || DEFAULT_SORT_VALUE;
  const currentPage = Number(searchParams.get("page")) || 1;
  const [refreshToken, setRefreshToken] = useState(0);

  const [campaigns, setCampaigns] = useState([]);

  const [files, setFiles] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState("");

  useEffect(() => {
    activeCampaigns()
      .then((res) => setCampaigns(res?.data || []))
      .catch(() => setCampaigns([]));
  }, []);

  // Reset the page inline, in the same searchParams update as the filter
  // change, instead of via a separate effect reacting to the filter — a
  // separate effect would fire the fetch-resumes effect once with the *old*
  // page (still mid-flight) and again once the page resets, causing a
  // duplicate request per filter change and a visible flash of mismatched
  // data.
  const changeFilter = (key) => (value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        next.set("page", "1");
        return next;
      },
      { replace: true }
    );
  };
  const handleCampaignFilterChange = changeFilter("campaign");
  const handleStatusFilterChange = changeFilter("status");
  const handleSourceFilterChange = changeFilter("source");
  const handleSortValueChange = changeFilter("sort");

  const handleCurrentPageChange = (page) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("page", String(page));
        return next;
      },
      { replace: true }
    );
  };

  const [sortBy, sortDir] = sortValue.split(":");

  useEffect(() => {
    let cancelled = false;

    const fetchResumes = async () => {
      setIsLoading(true);
      setListError("");
      try {
        const res = await getAllResumes({
          campaign_id: campaignFilter || undefined,
          parse_status: statusFilter || undefined,
          source: sourceFilter || undefined,
          page: currentPage,
          size: RESUME_LIST_PAGE_SIZE,
          sort_by: sortBy,
          sort_dir: sortDir,
        });
        if (cancelled) return;
        setFiles(res?.data?.items || []);
        setTotalResults(res?.data?.total || 0);
      } catch (err) {
        if (cancelled) return;
        const message = extractErrorMessage(err, "Failed to load resumes.");
        setListError(message);
        toast.error(message);
        setFiles([]);
        setTotalResults(0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchResumes();
    return () => {
      cancelled = true;
    };
  }, [campaignFilter, statusFilter, sourceFilter, sortBy, sortDir, currentPage, refreshToken]);

  const campaignOptions = useMemo(
    () => [{ label: "All Campaigns", value: "" }, ...campaigns.map((c) => ({ label: c.name, value: c.id }))],
    [campaigns]
  );

  const totalPages = Math.max(1, Math.ceil(totalResults / RESUME_LIST_PAGE_SIZE));

  return {
    files,
    totalResults,
    isLoading,
    listError,
    campaignOptions,
    campaignFilter,
    setCampaignFilter: handleCampaignFilterChange,
    statusFilter,
    setStatusFilter: handleStatusFilterChange,
    sourceFilter,
    setSourceFilter: handleSourceFilterChange,
    sortValue,
    setSortValue: handleSortValueChange,
    currentPage,
    setCurrentPage: handleCurrentPageChange,
    totalPages,
    refreshResumes: () => setRefreshToken((t) => t + 1),
  };
}
