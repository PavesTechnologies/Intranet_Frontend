import React from "react";
import Pagination from "../../../components/Pagination/pagination";
import useCandidateRanking from "./hooks/useCandidateRanking";
import CandidateStats from "./components/CandidateStats";
import CandidateFilters from "./components/CandidateFilters";
import CandidateTable from "./components/CandidateTable";
import CandidateDetailDrawer from "./components/detail/CandidateDetailDrawer";

export default function CandidateRankingPage() {
  const {
    candidates,
    totalResults,
    stats,
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    sortValue,
    setSortValue,
    currentPage,
    setCurrentPage,
    totalPages,
    toggleStar,
    addComment,
    detailCandidate,
    openCandidate,
    closeCandidate,
  } = useCandidateRanking();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Candidates & Ranking</h1>
        <p className="text-xs text-slate-500 mt-1">
          Composite ranking blends deterministic rules, semantic match, and AI evaluation.
        </p>
      </div>

      <CandidateStats stats={stats} />

      <CandidateFilters
        search={search}
        setSearch={setSearch}
        stageFilter={stageFilter}
        setStageFilter={setStageFilter}
        sortValue={sortValue}
        setSortValue={setSortValue}
      />

      <div className="mb-4">
        <CandidateTable candidates={candidates} onView={(c) => openCandidate(c.id)} onToggleStar={toggleStar} />
      </div>

      {totalResults > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage(currentPage - 1)}
          onNext={() => setCurrentPage(currentPage + 1)}
        />
      )}

      <CandidateDetailDrawer candidate={detailCandidate} onClose={closeCandidate} onAddComment={addComment} />
    </div>
  );
}
