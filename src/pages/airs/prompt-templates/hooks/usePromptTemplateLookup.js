import { useEffect, useState } from "react";
import { getJdParsePromptLookup, getResumeParsePromptLookup } from "../services/promptTemplateService";

const LOOKUP_FETCHERS = {
  "jd-parse": getJdParsePromptLookup,
  "resume-parse": getResumeParsePromptLookup,
};

// Shared by the Job Description (JD Parsing Prompt) and Hiring Campaign
// (Resume Parsing Prompt) forms — fetches the active prompt templates for one
// task type and exposes {value, label} options ready for FilterListbox, plus
// isLoading so callers can disable the dropdown until options are ready.
export default function usePromptTemplateLookup(taskTypeSlug) {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetcher = LOOKUP_FETCHERS[taskTypeSlug];
    if (!fetcher) return;

    setIsLoading(true);
    setError(null);
    fetcher()
      .then((res) => {
        if (cancelled) return;
        setOptions(res?.data || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [taskTypeSlug]);

  return { options, isLoading, error };
}
