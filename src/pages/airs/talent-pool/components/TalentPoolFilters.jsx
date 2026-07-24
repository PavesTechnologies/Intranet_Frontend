import React from "react";
import { Search, Sparkles } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../components/Button/Button";
import { TALENT_POOL_TAGS } from "../constants/talentPoolConstants";

export default function TalentPoolFilters({ search, setSearch, tags, toggleTag }) {
  return (
    <div className="space-y-3 mb-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 min-w-[240px] flex-1">
          <Search size={15} className="text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Semantic search — e.g. "backend engineer with fintech exposure"'
            className="outline-none text-[13px] w-full bg-transparent text-slate-900"
          />
        </div>
        <Button
          variant="outline"
          size="small"
          onClick={() => toast.info("AI recommendations are not available in this environment yet.")}
          className="!border-blue-200 !text-blue-700 !bg-blue-50 shrink-0"
        >
          <Sparkles className="h-4 w-4 mr-1.5" /> AI recommend
        </Button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {TALENT_POOL_TAGS.map((t) => {
          const active = tags.includes(t);
          return (
            <button
              key={t}
              onClick={() => toggleTag(t)}
              className="px-2.5 py-1 rounded-full text-[11.5px] font-semibold border transition-colors"
              style={{
                borderColor: active ? "#2563EB" : "#E6E9F0",
                background: active ? "#EAF0FD" : "#fff",
                color: active ? "#2563EB" : "#5B6472",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>
    </div>
  );
}
