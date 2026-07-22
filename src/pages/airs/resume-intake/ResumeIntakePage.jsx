import React from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import Pagination from "../../../components/Pagination/pagination";
import Button from "../../../components/Button/Button";
import useResumeIntake from "./hooks/useResumeIntake";
import ResumeIntakeStats from "./components/ResumeIntakeStats";
import ResumeUploadDropzone from "./components/ResumeUploadDropzone";
import ResumeIntakeFilters from "./components/ResumeIntakeFilters";
import ResumeUploadHistoryList from "./components/ResumeUploadHistoryList";
import ResumeFileDetailsDrawer from "./components/ResumeFileDetailsDrawer";

export default function ResumeIntakePage() {
  const navigate = useNavigate();
  const {
    files,
    totalResults,
    stats,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortValue,
    setSortValue,
    currentPage,
    setCurrentPage,
    totalPages,
    detailsFile,
    openDetails,
    closeDetails,
    simulateUpload,
    retryUpload,
    deleteUpload,
  } = useResumeIntake();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Resume Intake</h1>
          <p className="text-xs text-slate-500 mt-1">Upload single resumes or bulk ZIP archives for automatic parsing.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/airs/resume-intake/review/b3f1c2a0-1e4d-4a6b-9c3f-8a2d5e7f10a1")}
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            View sample candidate reviews
          </button>
          <Button variant="primary" size="small" onClick={() => navigate("/airs/resume-intake/new")}>
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> New Structured Intake
          </Button>
        </div>
      </div>

      <ResumeIntakeStats stats={stats} />

      <div className="mb-6">
        <ResumeUploadDropzone onUploadFile={(file) => simulateUpload("file", file)} onUploadZip={(file) => simulateUpload("zip", file)} />
      </div>

      <ResumeIntakeFilters
        search={search}
        setSearch={setSearch}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sortValue={sortValue}
        setSortValue={setSortValue}
      />

      <ResumeUploadHistoryList files={files} onViewDetails={openDetails} onRetry={retryUpload} onDelete={deleteUpload} />

      {totalResults > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage(currentPage - 1)}
          onNext={() => setCurrentPage(currentPage + 1)}
        />
      )}

      <ResumeFileDetailsDrawer file={detailsFile} onClose={closeDetails} />
    </div>
  );
}
