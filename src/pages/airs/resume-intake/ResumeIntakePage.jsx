import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardCheck, FileArchive } from "lucide-react";
import Pagination from "../../../components/Pagination/pagination";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/ui/Modal";
import useResumeIntake from "./hooks/useResumeIntake";
import useInProcessingResumes from "./hooks/useInProcessingResumes";
import useBulkUploadJobs from "./hooks/useBulkUploadJobs";
import BulkUploadPanel from "./components/BulkUploadPanel";
import ResumeIntakeFilters from "./components/ResumeIntakeFilters";
import ResumeUploadHistoryList from "./components/ResumeUploadHistoryList";
import InProcessingList from "./components/InProcessingList";
import BulkUploadJobsList from "./components/BulkUploadJobsList";
import BulkJobDetailModal from "./components/BulkJobDetailModal";
import UploadStep from "./intake/components/UploadStep";

export default function ResumeIntakePage() {
  const navigate = useNavigate();
  const [isIntakeModalOpen, setIsIntakeModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState("single");

  // Kept in the URL (not plain useState) so navigating away to a candidate
  // scorecard and back with browser "back" restores the tab you were on,
  // instead of remounting fresh onto the "history" default every time.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeListTab = searchParams.get("tab") || "history"; // "history" | "processing" | "bulk-batches"
  const setActiveListTab = (tab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", tab);
        return next;
      },
      { replace: true }
    );
  };

  const [selectedBulkJob, setSelectedBulkJob] = useState(null);
  const [isBulkJobDetailOpen, setIsBulkJobDetailOpen] = useState(false);

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
    refreshInProcessing,
  } = useInProcessingResumes({
    campaignFilter,
    statusFilter,
    sourceFilter,
    sortValue,
    enabled: activeListTab === "processing",
  });

  const {
    jobs: bulkJobs,
    isLoading: isBulkJobsLoading,
    refreshBulkJobs,
    addLocalJob,
  } = useBulkUploadJobs({ campaignFilter, enabled: activeListTab === "bulk-batches" });

  const handleSingleUploaded = () => {
    setIsIntakeModalOpen(false);
    setActiveListTab("processing");
    refreshInProcessing?.();
    refreshResumes?.();
  };

  const handleBulkUploaded = (jobData) => {
    setIsIntakeModalOpen(false);
    setActiveListTab("bulk-batches");
    if (jobData) {
      addLocalJob(jobData);
    }
    refreshBulkJobs?.();
    refreshResumes?.();
  };

  const handleOpenJobDetail = (job) => {
    setSelectedBulkJob(job);
    setIsBulkJobDetailOpen(true);
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Resume Intake</h1>
          <p className="text-xs text-slate-500 mt-1">Monitor and filter resumes uploaded across campaigns.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="primary" size="medium" onClick={() => setIsIntakeModalOpen(true)}>
             Upload Resumes
          </Button>
        </div>
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

      <div className="flex border-b border-slate-200 mb-6">
        <button
          type="button"
          onClick={() => setActiveListTab("history")}
          className={`py-2 px-4 border-b-2 font-bold text-xs tracking-wider transition-colors mr-2 ${activeListTab === "history"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
          Upload History
        </button>
        <button
          type="button"
          onClick={() => setActiveListTab("processing")}
          className={`py-2 px-4 border-b-2 font-bold text-xs tracking-wider transition-colors flex items-center gap-1.5 mr-2 ${activeListTab === "processing"
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
        <button
          type="button"
          onClick={() => setActiveListTab("bulk-batches")}
          className={`py-2 px-4 border-b-2 font-bold text-xs tracking-wider transition-colors flex items-center gap-1.5 ${activeListTab === "bulk-batches"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-700"
            }`}
        >
           Bulk Batches
          {bulkJobs.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
              {bulkJobs.length}
            </span>
          )}
        </button>
      </div>

      {activeListTab === "history" ? (
        <>
          <ResumeUploadHistoryList
            files={files}
            isLoading={isLoading}
            onRetried={() => {
              refreshResumes?.();
              refreshInProcessing?.();
            }}
          />

          {totalResults > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage(currentPage - 1)}
              onNext={() => setCurrentPage(currentPage + 1)}
            />
          )}
        </>
      ) : activeListTab === "processing" ? (
        <InProcessingList files={inProcessingFiles} isLoading={inProcessingLoading} />
      ) : campaignFilter ? (
        <BulkUploadJobsList jobs={bulkJobs} isLoading={isBulkJobsLoading} onSelectJob={handleOpenJobDetail} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <FileArchive className="h-10 w-10 mx-auto stroke-1 mb-2" />
          Select a specific campaign above to view its bulk upload batches.
          <p className="text-[11px] text-slate-400 mt-1">Bulk upload jobs can only be listed one campaign at a time.</p>
        </div>
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
            onSubmit={handleSingleUploaded}
          />
        ) : (
          <BulkUploadPanel
            bare
            onUploaded={handleBulkUploaded}
          />
        )}
      </Modal>

      {selectedBulkJob && (
        <BulkJobDetailModal
          job={selectedBulkJob}
          isOpen={isBulkJobDetailOpen}
          onClose={() => {
            setIsBulkJobDetailOpen(false);
            setSelectedBulkJob(null);
          }}
        />
      )}
    </div>
  );
}
