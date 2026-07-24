import React, { useState } from "react";
import Button from "../../../../../components/Button/Button";

export default function CandidateCommentsTab({ candidate, onAddComment }) {
  const [draft, setDraft] = useState("");

  const handlePost = () => {
    if (!draft.trim()) return;
    onAddComment(draft.trim());
    setDraft("");
  };

  return (
    <div className="space-y-3">
      {candidate.comments.map((c, i) => (
        <div key={i} className="flex gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
            {c.author.split(" ").map((x) => x[0]).join("")}
          </div>
          <div className="flex-1 p-2.5 rounded-xl bg-slate-50">
            <div className="text-[12px] font-semibold text-slate-900">{c.author}</div>
            <div className="text-[12px] mt-0.5 text-slate-500">{c.text}</div>
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handlePost()}
          placeholder="Add a comment..."
          className="flex-1 px-3 py-2 rounded-xl border border-slate-200 outline-none text-[12.5px] focus:ring-2 focus:ring-blue-500"
        />
        <Button size="small" onClick={handlePost}>
          Post
        </Button>
      </div>
    </div>
  );
}
