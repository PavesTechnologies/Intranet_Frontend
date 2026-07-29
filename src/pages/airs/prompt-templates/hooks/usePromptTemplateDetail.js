import { useCallback, useEffect, useState } from "react";
import { getPromptTemplate } from "../services/promptTemplateService";

// Fetch-by-id hook for the View/Edit pages — mirrors
// src/pages/airs/skill-ontology/hooks/useSkillDetail.js.
export default function usePromptTemplateDetail(id) {
  const [promptTemplate, setPromptTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPromptTemplate = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getPromptTemplate(id);
      setPromptTemplate(res?.data || null);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPromptTemplate();
  }, [fetchPromptTemplate]);

  return {
    promptTemplate,
    isLoading,
    error,
    refresh: fetchPromptTemplate,
  };
}
