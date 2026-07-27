import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { getAllResumes, getResumeById, activeCampaigns } from "../../service/resumeIntake";
import { extractErrorMessage } from "../intake/utils/intakeUtils.jsx";
import { RESUME_LIST_PAGE_SIZE } from "../constants/resumeIntakeConstants";

export default function useResumeIntake() {
  const [campaignFilter, setCampaignFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [sortValue, setSortValue] = useState("created_at:desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshToken, setRefreshToken] = useState(0);

  const [campaigns, setCampaigns] = useState([]);

  const [files, setFiles] = useState([]);
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState("");

  const [detailsFile, setDetailsFile] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  useEffect(() => {
    activeCampaigns()
      .then((res) => setCampaigns(res?.data || []))
      .catch(() => setCampaigns([]));
  }, []);

  // Reset the page inline, in the same handler as the filter change, instead
  // of via a separate effect reacting to the filter — a separate effect would
  // fire the fetch-resumes effect once with the *old* page (still mid-flight)
  // and again once the page resets, causing a duplicate request per filter
  // change and a visible flash of mismatched data.
  const changeFilter = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };
  const handleCampaignFilterChange = changeFilter(setCampaignFilter);
  const handleStatusFilterChange = changeFilter(setStatusFilter);
  const handleSourceFilterChange = changeFilter(setSourceFilter);
  const handleSortValueChange = changeFilter(setSortValue);

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

  const openDetails = async (file) => {
    setDetailsFile(file);
    setDetailsData(null);
    setDetailsError("");
    setIsDetailsLoading(true);
    try {
      const res = await getResumeById(file.id);
      setDetailsData(res?.data || null);
    } catch (err) {
      setDetailsError(extractErrorMessage(err, "Failed to load resume details."));
    } finally {
      setIsDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsFile(null);
    setDetailsData(null);
    setDetailsError("");
  };

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
    setCurrentPage,
    totalPages,
    detailsFile,
    detailsData,
    isDetailsLoading,
    detailsError,
    openDetails,
    closeDetails,
    refreshResumes: () => setRefreshToken((t) => t + 1),
  };
}
