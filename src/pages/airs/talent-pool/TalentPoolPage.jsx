import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Archive, UserPlus } from "lucide-react";
import Pagination from "@/components/Pagination/pagination";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import Button from "@/components/Button/Button";
import useTalentPool from "./hooks/useTalentPool";
import TalentPoolFilters from "./components/TalentPoolFilters";
import TalentPoolCard from "./components/TalentPoolCard";
import CampaignPickerModal from "./components/CampaignPickerModal";
import BulkAddResultsModal from "./components/BulkAddResultsModal";
import { bulkAddTalentPoolCandidatesToCampaign } from "./services/talentPoolService";
import { formatApiError } from "../campaigns/services/campaignservice";

export default function TalentPoolPage() {
  const navigate = useNavigate();
  const {
    results,
    loading,
    error,
    refetch,
    skills,
    addSkill,
    removeSkill,
    designation,
    setDesignation,
    locations,
    toggleLocation,
    experienceMin,
    setExperienceMin,
    experienceMax,
    setExperienceMax,
    hasActiveFilters,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useTalentPool();

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkPickerOpen, setBulkPickerOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  // Snapshot at request time, not derived live from `results` — refetch()
  // below can replace `results` (candidates may drop off the list once
  // added) while this modal is still open, which would otherwise turn
  // already-shown names back into raw candidate_id strings mid-view.
  const [bulkCandidateNames, setBulkCandidateNames] = useState({});

  const toggleSelect = (candidateId) => {
    setSelectedIds((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId],
    );
  };

  // "Select all" only ever covers the currently-loaded page — selection
  // doesn't carry across server-side pagination.
  const allOnPageSelected =
    results.length > 0 && results.every((item) => selectedIds.includes(item.candidate.candidate_id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(results.map((item) => item.candidate.candidate_id));
    }
  };

  const handleBulkAdd = async (campaignId) => {
    try {
      const nameSnapshot = Object.fromEntries(
        results
          .filter((item) => selectedIds.includes(item.candidate.candidate_id))
          .map((item) => [item.candidate.candidate_id, item.candidate.full_name || item.candidate.candidate_id]),
      );
      const response = await bulkAddTalentPoolCandidatesToCampaign(campaignId, selectedIds);
      const data = response?.data ?? response;
      setBulkPickerOpen(false);
      setBulkCandidateNames(nameSnapshot);
      setBulkResults(data);
      setSelectedIds([]);
      refetch();
    } catch (err) {
      toast.error(formatApiError(err, "Failed to add the selected candidates to the campaign."));
    }
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Talent Pool</h1>
          <p className="text-xs text-slate-500 mt-1">Eligible candidates across every campaign, searchable by skill.</p>
        </div>
        {selectedIds.length > 0 && (
          <Button variant="primary" size="small" onClick={() => setBulkPickerOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add Selected to Campaign ({selectedIds.length})
          </Button>
        )}
      </div>

      <TalentPoolFilters
        skills={skills}
        addSkill={addSkill}
        removeSkill={removeSkill}
        designation={designation}
        setDesignation={setDesignation}
        locations={locations}
        toggleLocation={toggleLocation}
        experienceMin={experienceMin}
        setExperienceMin={setExperienceMin}
        experienceMax={experienceMax}
        setExperienceMax={setExperienceMax}
      />

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="Loading talent pool..." />
        </div>
      ) : error ? (
        <ErrorState
          title="Couldn't load the talent pool"
          message="Something went wrong while loading candidates. Please try again."
          onRetry={refetch}
        />
      ) : results.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <Archive className="h-10 w-10 mx-auto stroke-1 mb-2" />
          {hasActiveFilters ? (
            <>No candidates match the selected filters.</>
          ) : (
            <>No eligible candidates in the Talent Pool yet.</>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                className="accent-indigo-600 h-4 w-4"
                checked={allOnPageSelected}
                onChange={toggleSelectAll}
                aria-label={allOnPageSelected ? "Deselect all candidates on this page" : "Select all candidates on this page"}
              />
              <span className="text-[12px] font-semibold text-slate-600">
                {allOnPageSelected ? "Deselect All" : "Select All"} ({results.length})
              </span>
            </label>
            {selectedIds.length > 0 && (
              <span className="text-[12px] text-slate-400">· {selectedIds.length} selected</span>
            )}
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {results.map((item) => (
              <TalentPoolCard
                key={item.candidate.candidate_id}
                item={item}
                isSelected={selectedIds.includes(item.candidate.candidate_id)}
                onToggleSelect={toggleSelect}
                onAdded={refetch}
                onViewProfile={() =>
                  navigate(`/airs/talent-pool/${item.candidate.candidate_id}`, { state: { item } })
                }
              />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        </>
      )}

      <CampaignPickerModal
        isOpen={bulkPickerOpen}
        onClose={() => setBulkPickerOpen(false)}
        title="Add to Campaign"
        description={`Add ${selectedIds.length} selected candidate${selectedIds.length === 1 ? "" : "s"} to an active campaign.`}
        confirmLabel="Add Selected"
        onConfirm={handleBulkAdd}
      />

      <BulkAddResultsModal
        isOpen={!!bulkResults}
        onClose={() => setBulkResults(null)}
        results={bulkResults}
        candidateNameById={bulkCandidateNames}
      />
    </div>
  );
}
