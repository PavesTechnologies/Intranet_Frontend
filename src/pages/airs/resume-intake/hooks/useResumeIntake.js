import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { MOCK_UPLOAD_HISTORY, generateMockUpload } from "../mock/resumeIntakeMockData";
import { RESUME_INTAKE_PAGE_SIZE, MOCK_UPLOAD_TICK_MS, MOCK_UPLOAD_STEP_PERCENT } from "../constants/resumeIntakeConstants";
import { filterUploads, sortUploads, paginate, computeUploadStats } from "../utils/resumeIntakeUtils.jsx";

const STORAGE_KEY = "airs_resume_intake_uploads";

const readStored = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : MOCK_UPLOAD_HISTORY;
  } catch {
    return MOCK_UPLOAD_HISTORY;
  }
};

const persist = (files) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
  } catch {
    // Ignore storage quota errors.
  }
};

// Weighted mock outcome once a simulated upload reaches 100%.
const rollFinalStatus = () => {
  const r = Math.random();
  if (r < 0.72) return "Parsed";
  if (r < 0.87) return "Duplicate flagged";
  return "Failed";
};

export default function useResumeIntake() {
  const [files, setFiles] = useState(readStored);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortValue, setSortValue] = useState("uploadedAt:desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsFile, setDetailsFile] = useState(null);
  const sequenceRef = useRef(1100);
  const intervalsRef = useRef({});

  useEffect(() => {
    persist(files);
  }, [files]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sortValue]);

  useEffect(() => {
    return () => {
      Object.values(intervalsRef.current).forEach(clearInterval);
    };
  }, []);

  const runSimulation = (fileId, fileName) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(100, progress + MOCK_UPLOAD_STEP_PERCENT);
      const isDone = progress >= 100;
      const finalStatus = isDone ? rollFinalStatus() : "Parsing";

      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, progress, status: finalStatus } : f)));

      if (isDone) {
        clearInterval(interval);
        delete intervalsRef.current[fileId];
        if (finalStatus === "Parsed") toast.success(`${fileName} parsed successfully.`);
        else if (finalStatus === "Duplicate flagged") toast.warning(`${fileName} flagged as a possible duplicate.`);
        else toast.error(`${fileName} failed to parse. You can retry the upload.`);
      }
    }, MOCK_UPLOAD_TICK_MS);
    intervalsRef.current[fileId] = interval;
  };

  const simulateUpload = (kind, file) => {
    sequenceRef.current += 1;
    const newFile = generateMockUpload(kind, sequenceRef.current, file);
    setFiles((prev) => [newFile, ...prev]);
    toast.info(`${newFile.name} added to the parsing queue.`);
    runSimulation(newFile.id, newFile.name);
  };

  const retryUpload = (fileId) => {
    const target = files.find((f) => f.id === fileId);
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, status: "Queued", progress: 0 } : f)));
    runSimulation(fileId, target?.name || "File");
  };

  const deleteUpload = (fileId) => {
    if (intervalsRef.current[fileId]) {
      clearInterval(intervalsRef.current[fileId]);
      delete intervalsRef.current[fileId];
    }
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    if (detailsFile?.id === fileId) setDetailsFile(null);
    toast.success("Upload removed from history.");
  };

  const filteredSorted = useMemo(
    () => sortUploads(filterUploads(files, { search, status: statusFilter }), sortValue),
    [files, search, statusFilter, sortValue]
  );

  const { pageItems, totalPages, currentPage: safePage } = useMemo(
    () => paginate(filteredSorted, currentPage, RESUME_INTAKE_PAGE_SIZE),
    [filteredSorted, currentPage]
  );

  const stats = useMemo(() => computeUploadStats(files), [files]);

  return {
    files: pageItems,
    totalResults: filteredSorted.length,
    stats,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortValue,
    setSortValue,
    currentPage: safePage,
    setCurrentPage,
    totalPages,
    detailsFile,
    openDetails: setDetailsFile,
    closeDetails: () => setDetailsFile(null),
    simulateUpload,
    retryUpload,
    deleteUpload,
  };
}
