import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getSkill, addAlias, removeAlias } from "../services/skillOntologyService";

// Aliases may come back from the backend either as plain strings (form-local,
// unsaved) or as { id, name } objects (persisted, removable by id) — this
// hook normalizes to display strings for AliasEditor and resolves the id
// internally when a removal is requested.
const aliasName = (a) => (typeof a === "object" ? a.name : a);

export default function useSkillDetail(skillId) {
  const [skill, setSkill] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isMutatingAlias, setIsMutatingAlias] = useState(false);

  const fetchSkill = useCallback(async () => {
    if (!skillId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getSkill(skillId);
      setSkill(res?.data || res);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [skillId]);

  useEffect(() => {
    fetchSkill();
  }, [fetchSkill]);

  const handleAddAlias = async (alias) => {
    setIsMutatingAlias(true);
    try {
      await addAlias(skillId, alias);
      toast.success(`Alias "${alias}" added.`);
      await fetchSkill();
    } catch {
      toast.error("Failed to add alias.");
    } finally {
      setIsMutatingAlias(false);
    }
  };

  const handleRemoveAlias = async (alias) => {
    const match = (skill?.aliases || []).find((a) => aliasName(a) === alias);
    const aliasId = typeof match === "object" ? match.id : alias;
    setIsMutatingAlias(true);
    try {
      await removeAlias(skillId, aliasId);
      toast.success("Alias removed.");
      await fetchSkill();
    } catch {
      toast.error("Failed to remove alias.");
    } finally {
      setIsMutatingAlias(false);
    }
  };

  // Instant feedback right after a successful PATCH — applied ahead of the
  // authoritative refresh() (fetchSkill) below.
  const applyUpdate = (updatedSkill) => {
    if (!updatedSkill) return;
    setSkill((prev) => ({ ...prev, ...updatedSkill }));
  };

  return {
    skill,
    isLoading,
    error,
    refresh: fetchSkill,
    applyUpdate,
    aliasNames: (skill?.aliases || []).map(aliasName),
    addAlias: handleAddAlias,
    removeAlias: handleRemoveAlias,
    isMutatingAlias,
  };
}
