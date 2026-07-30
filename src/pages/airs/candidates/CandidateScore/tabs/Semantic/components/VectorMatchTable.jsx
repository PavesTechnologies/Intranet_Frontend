import React from "react";
import GenericTable from "@/components/Table/table";

const HEADERS = ["JD Skill", "Candidate Skill", "Cosine Similarity", "Embedding Model", "Vector Distance"];
const COLUMNS = ["jdSkill", "candidateSkill", "cosineSimilarity", "embeddingModel", "vectorDistance"];

// Vector Match Details table for the Semantic Score tab.
export default function VectorMatchTable({ items }) {
  const rows = items.map((r, i) => ({
    id: i,
    jdSkill: <span className="font-semibold text-slate-900">{r.jdSkill}</span>,
    candidateSkill: r.candidateSkill,
    cosineSimilarity: r.cosineSimilarity.toFixed(2),
    embeddingModel: <span className="text-[11px] text-slate-500">{r.embeddingModel}</span>,
    vectorDistance: r.vectorDistance.toFixed(3),
  }));

  return (
    <div className="overflow-x-auto rounded-xl">
      <GenericTable headers={HEADERS} columns={COLUMNS} rows={rows} />
    </div>
  );
}
