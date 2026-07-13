import React, { useState } from "react";
import { Archive } from "lucide-react";
import useTalentPool from "./hooks/useTalentPool";
import TalentPoolFilters from "./components/TalentPoolFilters";
import TalentPoolCard from "./components/TalentPoolCard";
import { MOCK_CANDIDATES } from "../candidates/mock/candidateMockData";
import CandidateDetailDrawer from "../candidates/components/detail/CandidateDetailDrawer";

export default function TalentPoolPage() {
  const { search, setSearch, tags, toggleTag, results } = useTalentPool();
  const [candidatePool, setCandidatePool] = useState(MOCK_CANDIDATES);
  const [viewCandidateId, setViewCandidateId] = useState(null);

  const viewCandidate = candidatePool.find((c) => c.id === viewCandidateId) || null;

  const addComment = (candidateId, text) => {
    setCandidatePool((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, comments: [...c.comments, { author: "You", text }] } : c))
    );
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Talent Pool</h1>
        <p className="text-xs text-slate-500 mt-1">Semantic search across historical and saved candidates for future roles.</p>
      </div>

      <TalentPoolFilters search={search} setSearch={setSearch} tags={tags} toggleTag={toggleTag} />

      {results.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <Archive className="h-10 w-10 mx-auto stroke-1 mb-2" />
          No candidates found matching the criteria.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {results.map((c) => (
            <TalentPoolCard key={c.id} candidate={c} onClick={() => setViewCandidateId(c.id)} />
          ))}
        </div>
      )}

      <CandidateDetailDrawer candidate={viewCandidate} onClose={() => setViewCandidateId(null)} onAddComment={addComment} />
    </div>
  );
}
