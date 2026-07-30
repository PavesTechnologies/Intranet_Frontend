import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import Pagination from "../../../components/Pagination/pagination";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/ui/Modal";
import useResumeIntake from "./hooks/useResumeIntake";
import useInProcessingResumes from "./hooks/useInProcessingResumes";
import BulkUploadPanel from "./components/BulkUploadPanel";
import ResumeIntakeFilters from "./components/ResumeIntakeFilters";
import ResumeUploadHistoryList from "./components/ResumeUploadHistoryList";
import InProcessingList from "./components/InProcessingList";
import UploadStep from "./intake/components/UploadStep";

export default function ResumeIntakePage() {
  const navigate = useNavigate();
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("single");
  const [activeListTab, setActiveListTab] = useState("history");
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
    refreshResumes,
  } = useResumeIntake();

  const {
    files: inProcessingFiles,
    totalResults: inProcessingTotal,
    isLoading: inProcessingLoading,
  } = useInProcessingResumes({ campaignFilter, statusFilter, sourceFilter, sortValue });

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Resume Intake</h1>
          <p className="text-xs text-slate-500 mt-1">Monitor and filter resumes uploaded across campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="medium" onClick={() => setIsIntakeModalOpen(true)}>
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> Upload Resumes
          </Button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveListTab("history")}
          className={`py-2 px-4 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors mr-2 ${activeListTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
          Upload History
        </button>
        <button
          type="button"
          onClick={() => setActiveListTab("processing")}
          className={`py-2 px-4 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 ${activeListTab === "processing"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
          In Processing
          {inProcessingTotal > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
              {inProcessingTotal}
            </span>
          )}
        </button>
      </div>

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

      {activeListTab === "history" ? (
        <>
          <ResumeUploadHistoryList files={files} isLoading={isLoading} />

          {totalResults > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage(currentPage - 1)}
              onNext={() => setCurrentPage(currentPage + 1)}
            />
          )}
        </>
      ) : (
        <InProcessingList files={inProcessingFiles} isLoading={inProcessingLoading} />
      )}

      <Modal
        isOpen={isIntakeModalOpen}
        onClose={() => {
          setIsIntakeModalOpen(false);
          setActiveModalTab("single");
        }}
        title="New Structured Intake"
        width="760px"
      >
        <div className="flex border-b border-slate-200 mb-4 pb-0 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModalTab("single")}
            className={`py-2 px-4 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors mr-2 ${activeModalTab === "single"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
          >
            Single Candidate
          </button>
          <button
            type="button"
            onClick={() => setActiveModalTab("bulk")}
            className={`py-2 px-4 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors ${activeModalTab === "bulk"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
          >
            Bulk ZIP Batch
          </button>
        </div>

        {activeModalTab === "single" ? (
          <UploadStep
            bare
            onSubmit={(uploadResult) => {
              setIsIntakeModalOpen(false);
              navigate("/airs/resume-intake/new", { state: { uploadResult } });
            }}
          />
        ) : (
          <BulkUploadPanel
            bare
            onUploaded={() => {
              setIsIntakeModalOpen(false);
              refreshResumes();
            }}
          />
        )}
      </Modal>
    </div>
  );
}
