import React from "react";
import Pagination from "../../../components/Pagination/pagination";
import useResumeIntake from "./hooks/useResumeIntake";
import ResumeIntakeStats from "./components/ResumeIntakeStats";
import ResumeUploadDropzone from "./components/ResumeUploadDropzone";
import ResumeIntakeFilters from "./components/ResumeIntakeFilters";
import ResumeUploadHistoryList from "./components/ResumeUploadHistoryList";
import ResumeFileDetailsDrawer from "./components/ResumeFileDetailsDrawer";

export default function ResumeIntakePage() {
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
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Resume Intake</h1>
        <p className="text-xs text-slate-500 mt-1">Upload single resumes or bulk ZIP archives for automatic parsing.</p>
      </div>

      <div className="mb-6">
        <ResumeUploadDropzone onUploadFile={() => simulateUpload("file")} onUploadZip={() => simulateUpload("zip")} />
      </div>

      <ResumeIntakeStats stats={stats} />

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
