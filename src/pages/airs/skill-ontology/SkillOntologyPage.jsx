import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import useSkillOntologyList from "./hooks/useSkillOntologyList";
import SkillToolbar from "./components/SkillToolbar";
import SkillFilters from "./components/SkillFilters";
import SkillTable from "./components/SkillTable";
import ErrorState from "./components/ErrorState";
import AddSkillDrawer from "./components/AddSkillDrawer";
import EditSkillModal from "./components/EditSkillModal";
import DeactivateDialog from "./components/DeactivateDialog";
import ReactivateDialog from "./components/ReactivateDialog";
import SimilarSkillDialog from "./components/SimilarSkillDialog";
import BulkImportDrawer from "./components/BulkImportDrawer";
import {
  createSkill,
  updateSkill,
  updateSkillStatus,
  getSkill,
  getSkillUsage,
  getSimilarSkills,
  mergeSkills,
  addAsAlias,
  exportSkills,
  seedOntology,
} from "./services/skillOntologyService";

export default function SkillOntologyPage() {
  const navigate = useNavigate();
  const list = useSkillOntologyList();

  const [addOpen, setAddOpen] = useState(false);
  const [editSkill, setEditSkill] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateUsage, setDeactivateUsage] = useState(null);
  const [reactivateTarget, setReactivateTarget] = useState(null);
  const [similarState, setSimilarState] = useState(null); // { newSkill, similarSkills }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const handleCreate = async (values) => {
    setIsSubmitting(true);
    try {
      const res = await createSkill({
        canonical_name: values.canonicalName,
        category: values.category,
        aliases: values.aliases,
        parent_skill_id: values.parentSkillId || null,
        confidence: values.confidence,
      });
      const newSkill = res?.data || res;
      toast.success(`Skill "${values.canonicalName}" created successfully.`);
      setAddOpen(false);
      list.refresh();

      const similarRes = await getSimilarSkills(newSkill.id).catch(() => null);
      const similarSkills = similarRes?.data || similarRes || [];
      if (similarSkills.length > 0) setSimilarState({ newSkill, similarSkills });
    } catch {
      toast.error("Failed to create skill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = async (skill) => {
    try {
      const res = await getSkill(skill.id);
      setEditSkill(res?.data || res);
    } catch {
      setEditSkill(skill); // fall back to the list row if the detail fetch fails
    }
  };

  const handleUpdate = async (values) => {
    setIsSubmitting(true);
    try {
      await updateSkill(editSkill.id, {
        canonical_name: values.canonicalName,
        category: values.category,
        aliases: values.aliases,
        parent_skill_id: values.parentSkillId || null,
        confidence: values.confidence,
        status: values.status,
      });
      toast.success("Skill updated successfully.");
      setEditSkill(null);
      list.refresh();
    } catch {
      toast.error("Failed to update skill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeactivate = async (skill) => {
    setDeactivateTarget(skill);
    try {
      const res = await getSkillUsage(skill.id);
      setDeactivateUsage(res?.data || res);
    } catch {
      setDeactivateUsage(null);
    }
  };

  const confirmDeactivate = async () => {
    setIsSubmitting(true);
    try {
      await updateSkillStatus(deactivateTarget.id, false);
      toast.success(`"${deactivateTarget.canonicalName}" deactivated.`);
      setDeactivateTarget(null);
      list.refresh();
    } catch {
      toast.error("Failed to deactivate skill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmReactivate = async () => {
    setIsSubmitting(true);
    try {
      await updateSkillStatus(reactivateTarget.id, true);
      toast.success(`"${reactivateTarget.canonicalName}" reactivated.`);
      setReactivateTarget(null);
      list.refresh();
    } catch {
      toast.error("Failed to reactivate skill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimilarAction = async (action, otherSkill) => {
    setIsSubmitting(true);
    try {
      if (action === "merge_existing") {
        await mergeSkills(similarState.newSkill.id, otherSkill.id);
        toast.success(`Merged into "${otherSkill.canonicalName}".`);
      } else if (action === "add_as_alias") {
        await addAsAlias(similarState.newSkill.id, otherSkill.id);
        toast.success(`Added as an alias of "${otherSkill.canonicalName}".`);
      } else {
        toast.success("Kept as a new canonical skill.");
      }
      setSimilarState(null);
      list.refresh();
    } catch {
      toast.error("Failed to resolve similar skill.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await exportSkills({
        search: list.search || undefined,
        category: list.category === "All" ? undefined : list.category,
        confidence: list.confidenceFilter === "All" ? undefined : list.confidenceFilter,
        is_active: list.showInactive ? false : true,
      });
      const blob = new Blob([response.data], { type: response.headers["content-type"] });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "skill_ontology.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Skill ontology exported successfully.");
    } catch {
      toast.error("Failed to export the skill ontology.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await seedOntology();
      toast.success("Skill ontology seeded successfully.");
      list.refresh();
    } catch {
      toast.error("Failed to seed the skill ontology.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <SkillToolbar
        onRefresh={list.refresh}
        onExport={handleExport}
        onAddSkill={() => setAddOpen(true)}
        onBulkImport={() => setBulkImportOpen(true)}
        isRefreshing={list.isLoading}
        isExporting={isExporting}
      />

      <SkillFilters
        search={list.search}
        setSearch={list.setSearch}
        category={list.category}
        setCategory={list.setCategory}
        categoryOptions={list.categoryOptions}
        confidenceFilter={list.confidenceFilter}
        setConfidenceFilter={list.setConfidenceFilter}
        source={list.source}
        setSource={list.setSource}
        showInactive={list.showInactive}
        setShowInactive={list.setShowInactive}
      />

      {list.error ? (
        <ErrorState onRetry={list.refresh} message="We couldn't load the skill ontology. Please try again." />
      ) : (
        <SkillTable
          skills={list.skills}
          isLoading={list.isLoading}
          onView={(skill) => navigate(`/airs/skill-ontology/${skill.id}`)}
          onEdit={openEdit}
          onDeactivate={openDeactivate}
          onReactivate={setReactivateTarget}
          onSeedOntology={handleSeed}
          seeding={isSeeding}
        />
      )}

      {!list.isLoading && !list.error && list.totalCount > 0 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[12px] text-slate-400">
            Page {list.currentPage} of {list.totalPages} · {list.totalCount} skills
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={list.currentPage === 1}
              onClick={() => list.setCurrentPage(list.currentPage - 1)}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              disabled={list.currentPage >= list.totalPages}
              onClick={() => list.setCurrentPage(list.currentPage + 1)}
              className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <AddSkillDrawer
        open={addOpen}
        existingSkills={list.skills}
        onClose={() => setAddOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />

      <EditSkillModal
        open={!!editSkill}
        skill={editSkill}
        existingSkills={list.skills}
        onClose={() => setEditSkill(null)}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
      />

      <DeactivateDialog
        open={!!deactivateTarget}
        skill={deactivateTarget}
        usage={deactivateUsage}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
        isSubmitting={isSubmitting}
      />

      <ReactivateDialog
        open={!!reactivateTarget}
        skill={reactivateTarget}
        onClose={() => setReactivateTarget(null)}
        onConfirm={confirmReactivate}
        isSubmitting={isSubmitting}
      />

      <SimilarSkillDialog
        open={!!similarState}
        newSkill={similarState?.newSkill}
        similarSkills={similarState?.similarSkills}
        onClose={() => setSimilarState(null)}
        onAction={handleSimilarAction}
        isSubmitting={isSubmitting}
      />

      <BulkImportDrawer open={bulkImportOpen} onClose={() => setBulkImportOpen(false)} onImported={list.refresh} />
    </div>
  );
}
