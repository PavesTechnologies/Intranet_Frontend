import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getSkillHierarchy, getSkillChildren } from "../services/skillOntologyService";

// Lazy-loading tree state: root nodes fetch on mount (GET .../hierarchy),
// children fetch on first expand (GET .../{skill_id}/children) and are cached
// so re-collapsing/re-expanding doesn't re-fetch.
export default function useHierarchy() {
  const [rootNodes, setRootNodes] = useState([]);
  const [isLoadingRoot, setIsLoadingRoot] = useState(false);
  const [rootError, setRootError] = useState(null);

  const [childrenById, setChildrenById] = useState({});
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loadingIds, setLoadingIds] = useState(new Set());

  const fetchRoot = useCallback(async () => {
    setIsLoadingRoot(true);
    setRootError(null);
    try {
      const res = await getSkillHierarchy();
      setRootNodes(res?.data?.items || res?.items || res?.data || []);
    } catch (err) {
      setRootError(err);
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to load the skill hierarchy.");
    } finally {
      setIsLoadingRoot(false);
    }
  }, []);

  useEffect(() => {
    fetchRoot();
  }, [fetchRoot]);

  const toggleExpand = useCallback(
    async (nodeId) => {
      if (expandedIds.has(nodeId)) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
        return;
      }

      setExpandedIds((prev) => new Set(prev).add(nodeId));

      if (childrenById[nodeId]) return; // already cached

      setLoadingIds((prev) => new Set(prev).add(nodeId));
      try {
        const res = await getSkillChildren(nodeId);
        const children = res?.data?.items || res?.items || res?.data || [];
        setChildrenById((prev) => ({ ...prev, [nodeId]: children }));
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to load child skills.");
      } finally {
        setLoadingIds((prev) => {
          const next = new Set(prev);
          next.delete(nodeId);
          return next;
        });
      }
    },
    [expandedIds, childrenById]
  );

  return {
    rootNodes,
    isLoadingRoot,
    rootError,
    refreshRoot: fetchRoot,
    childrenById,
    expandedIds,
    loadingIds,
    toggleExpand,
  };
}
