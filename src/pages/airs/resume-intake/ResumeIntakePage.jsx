import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import Pagination from "../../../components/Pagination/pagination";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/ui/Modal";
import useResumeIntake from "./hooks/useResumeIntake";
import BulkUploadPanel from "./components/BulkUploadPanel";
import ResumeIntakeFilters from "./components/ResumeIntakeFilters";
import ResumeUploadHistoryList from "./components/ResumeUploadHistoryList";
import ResumeFileDetailsDrawer from "./components/ResumeFileDetailsDrawer";
import UploadStep from "./intake/components/UploadStep";

export default function ResumeIntakePage() {
  const navigate = useNavigate();
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const {
    files,
    totalResults,
    isLoading,
    campaignOptions,
    campaignFilter,
    setCampaignFilter,
    statusFilter,
    setStatusFilter,
    sourceFilter,
    setSourceFilter,
    sortValue,
    setSortValue,
    currentPage,
    setCurrentPage,
    totalPages,
    detailsFile,
    detailsData,
    isDetailsLoading,
    detailsError,
    openDetails,
    closeDetails,
    refreshResumes,
  } = useResumeIntake();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Resume Intake</h1>
          <p className="text-xs text-slate-500 mt-1">Monitor and filter resumes uploaded across campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/airs/resume-intake/review/b3f1c2a0-1e4d-4a6b-9c3f-8a2d5e7f10a1")}
            className="text-xs font-semibold text-blue-700 hover:underline"
          >
            View sample candidate reviews
          </button>
          <Button variant="primary" size="small" onClick={() => setIsIntakeModalOpen(true)}>
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> New Structured Intake
          </Button>
        </div>
      </div>

      <BulkUploadPanel onUploaded={refreshResumes} />
      
      <ResumeIntakeFilters
        campaignOptions={campaignOptions}
        campaignFilter={campaignFilter}
        setCampaignFilter={setCampaignFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        sourceFilter={sourceFilter}
        setSourceFilter={setSourceFilter}
        sortValue={sortValue}
        setSortValue={setSortValue}
      />

      <ResumeUploadHistoryList files={files} isLoading={isLoading} onViewDetails={openDetails} />

      {totalResults > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage(currentPage - 1)}
          onNext={() => setCurrentPage(currentPage + 1)}
        />
      )}

      <ResumeFileDetailsDrawer
        file={detailsFile}
        detailsData={detailsData}
        isLoading={isDetailsLoading}
        error={detailsError}
        onClose={closeDetails}
      />

      <Modal
        isOpen={isIntakeModalOpen}
        onClose={() => setIsIntakeModalOpen(false)}
        title="New Structured Intake"
        width="760px"
      >
        <UploadStep
          bare
          onSubmit={(uploadResult) => {
            setIsIntakeModalOpen(false);
            navigate("/airs/resume-intake/new", { state: { uploadResult } });
          }}
        />
      </Modal>
    </div>
  );
}
