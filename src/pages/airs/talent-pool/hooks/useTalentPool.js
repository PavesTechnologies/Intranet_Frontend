import { useMemo, useState } from "react";
import { MOCK_CANDIDATES } from "../../candidates/mock/candidateMockData";
import { TALENT_POOL_RESULT_LIMIT } from "../constants/talentPoolConstants";

export default function useTalentPool() {
  const [search, setSearch] = useState("");
  const [tags, setTags] = useState([]);

  const toggleTag = (tag) => setTags((ts) => (ts.includes(tag) ? ts.filter((t) => t !== tag) : [...ts, tag]));

  const results = useMemo(() => {
    const term = search.trim().toLowerCase();
    return MOCK_CANDIDATES.filter((c) => {
      const matchesSearch = !term || c.name.toLowerCase().includes(term) || c.role.toLowerCase().includes(term);
      const matchesTags = tags.length === 0 || tags.some((t) => c.matchedSkills.includes(t));
      return matchesSearch && matchesTags;
    }).slice(0, TALENT_POOL_RESULT_LIMIT);
  }, [search, tags]);

  return { search, setSearch, tags, toggleTag, results };
}
