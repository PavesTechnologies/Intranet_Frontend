import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Boxes, Layers, Settings2, Tag, X } from "lucide-react";
import { notify, getResourceManagementErrorMessage } from "../../utils/notify";
import BulkUploadTab from "./BulkUploadTab";
import SkillTaxonomyTab from "./SkillTaxonomyTab";
import { modalTabs } from "./mockData";
import { skillService } from "../../../../services/skillService";

const normalize = (value) => `${value || ""}`.trim().toLowerCase();

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const isTemporaryId = (id) =>
  !id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const cloneTaxonomy = (taxonomy) =>
  taxonomy.map((category) => ({
    ...category,
    skills: (category.skills || []).map((skill) => ({
      ...skill,
      subSkills: (skill.subSkills || []).map((subSkill) => ({ ...subSkill })),
    })),
  }));

const mapCategoryDto = (category) => ({
  id: category.id,
  name: category.name,
  description: category.description || "",
  isActive: category.active ?? true,
  skills: [],
});

const mapSkillDto = (skill) => ({
  id: skill.id,
  name: skill.name,
  description: skill.description || "",
  isActive: skill.active ?? true,
  subSkills: [],
});

const mapSubSkillDto = (subSkill) => ({
  id: subSkill.id,
  name: subSkill.name,
  description: subSkill.description || "",
  isActive: subSkill.active ?? true,
});

const mapCategoryToRequest = (category) => ({
  id: isTemporaryId(category.id) ? null : category.id,
  name: category.name,
  description: category.description || "",
  active: category.isActive ?? true,
  skills: (category.skills || []).map((skill) => ({
    id: isTemporaryId(skill.id) ? null : skill.id,
    name: skill.name,
    description: skill.description || "",
    active: skill.isActive ?? true,
    subSkills: (skill.subSkills || []).map((subSkill) => ({
      id: isTemporaryId(subSkill.id) ? null : subSkill.id,
      name: subSkill.name,
      description: subSkill.description || "",
      active: subSkill.isActive ?? true,
    })),
  })),
});

const mapSavedCategory = (category) => ({
  id: category.id,
  name: category.name,
  description: category.description || "",
  isActive: category.active ?? true,
  operation: category.operation,
  skills: (category.skills || []).map((skill) => ({
    id: skill.id,
    name: skill.name,
    description: skill.description || "",
    isActive: skill.active ?? true,
    operation: skill.operation,
    subSkills: (skill.subSkills || []).map((subSkill) => ({
      id: subSkill.id,
      name: subSkill.name,
      description: subSkill.description || "",
      isActive: subSkill.active ?? true,
      operation: subSkill.operation,
    })),
  })),
});

const mergeSavedCategory = (existingCategory, savedCategory) => {
  if (!existingCategory) return savedCategory;

  const nextSkills = [...(existingCategory.skills || [])];
  (savedCategory.skills || []).forEach((savedSkill) => {
    const skillIndex = nextSkills.findIndex(
      (skill) =>
        String(skill.id) === String(savedSkill.id) ||
        normalize(skill.name) === normalize(savedSkill.name),
    );

    if (skillIndex >= 0) {
      const existingSkill = nextSkills[skillIndex];
      const nextSubSkills = [...(existingSkill.subSkills || [])];

      (savedSkill.subSkills || []).forEach((savedSubSkill) => {
        const subSkillIndex = nextSubSkills.findIndex(
          (subSkill) =>
            String(subSkill.id) === String(savedSubSkill.id) ||
            normalize(subSkill.name) === normalize(savedSubSkill.name),
        );

        if (subSkillIndex >= 0) {
          nextSubSkills[subSkillIndex] = savedSubSkill;
        } else {
          nextSubSkills.push(savedSubSkill);
        }
      });

      nextSkills[skillIndex] = {
        ...existingSkill,
        ...savedSkill,
        subSkills: nextSubSkills,
      };
    } else {
      nextSkills.push(savedSkill);
    }
  });

  return {
    ...existingCategory,
    ...savedCategory,
    skills: nextSkills,
  };
};

/* ─── Stat pill ───────────────────────────────────────────────────── */
const StatPill = ({ icon: Icon, label, count }) => (
  <div className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5">
    <Icon className="h-3.5 w-3.5 text-gray-500" />
    <span className="text-xs font-semibold text-gray-700">{count}</span>
    <span className="text-xs text-gray-500">{label}</span>
  </div>
);

/* ─── Main component ──────────────────────────────────────────────── */

const SkillManagementModal = ({ open, onClose, initialDraft = null, initialDraftKey = "" }) => {
  const [activeTab, setActiveTab] = useState("taxonomy");
  const [taxonomy, setTaxonomy] = useState([]);
  const [initialTaxonomy, setInitialTaxonomy] = useState([]);
  const [stagedCategories, setStagedCategories] = useState([]);
  const loadedCategoryIdsRef = useRef(new Set());

  const stats = useMemo(
    () => ({
      categories: taxonomy.length,
      skills: taxonomy.reduce((sum, category) => sum + category.skills.length, 0),
      subSkills: taxonomy.reduce(
        (sum, category) =>
          sum + category.skills.reduce((skillSum, skill) => skillSum + skill.subSkills.length, 0),
        0,
      ),
    }),
    [taxonomy],
  );

  const fetchCategorySkillsTree = async (categoryId) => {
    const response = await skillService.getSkillsByCategoryDto(categoryId);
    if (!response?.success) {
      throw new Error(response?.error || "Failed to retrieve skills.");
    }

    const skills = Array.isArray(response.data) ? response.data : [];
    const subSkillEntries = await Promise.all(
      skills.map(async (skill) => {
        try {
          const subSkillResponse = await skillService.getSubSkillsBySkillDto(skill.id);
          if (!subSkillResponse?.success) {
            throw new Error(
              subSkillResponse?.error || `Failed to retrieve subskills for ${skill.name}.`,
            );
          }
          return [
            skill.id,
            Array.isArray(subSkillResponse.data)
              ? subSkillResponse.data.map(mapSubSkillDto)
              : [],
          ];
        } catch (error) {
          notify.error(error, `Unable to load subskills for ${skill.name}.`);
          return [skill.id, []];
        }
      }),
    );

    const subSkillMap = new Map(subSkillEntries);
    return skills.map((skill) => ({
      ...mapSkillDto(skill),
      subSkills: subSkillMap.get(skill.id) || [],
    }));
  };

  useEffect(() => {
    if (!open) return;

    const fetchCategories = async () => {
      const toastId = notify.loading("Loading skill categories...");

      try {
        const response = await skillService.getCategoryDtos();
        if (!response?.success) {
          throw new Error(response?.error || "Failed to retrieve categories.");
        }

        let nextTaxonomy = Array.isArray(response.data)
          ? response.data.map(mapCategoryDto)
          : [];

        if (initialDraft?.categoryId) {
          try {
            const nextSkills = await fetchCategorySkillsTree(initialDraft.categoryId);
            nextTaxonomy = nextTaxonomy.map((category) =>
              String(category.id) === String(initialDraft.categoryId)
                ? { ...category, skills: nextSkills }
                : category,
            );
            loadedCategoryIdsRef.current = new Set([initialDraft.categoryId]);
          } catch (error) {
            loadedCategoryIdsRef.current = new Set();
            notify.error(error, "Unable to fully hydrate the selected taxonomy item for editing.");
          }
        } else {
          loadedCategoryIdsRef.current = new Set();
        }

        setTaxonomy(nextTaxonomy);
        setInitialTaxonomy(cloneTaxonomy(nextTaxonomy));
        setStagedCategories([]);

        notify.complete(toastId, response?.message || "Categories retrieved successfully.", "success");
      } catch (error) {
        loadedCategoryIdsRef.current = new Set();
        setTaxonomy([]);
        setInitialTaxonomy([]);
        setStagedCategories([]);

        notify.complete(
          toastId,
          getResourceManagementErrorMessage(error, "Unable to load skill categories."),
          "error",
        );
      }
    };

    fetchCategories();
  }, [initialDraft?.categoryId, open]);

  const loadCategoryDetails = async (categoryId) => {
    if (!categoryId || loadedCategoryIdsRef.current.has(categoryId)) return;

    const toastId = `skill-category-${categoryId}`;
    notify.loading("Loading skills and subskills...", toastId);

    try {
      const nextSkills = await fetchCategorySkillsTree(categoryId);

      const mergeCategorySkills = (currentTaxonomy) =>
        currentTaxonomy.map((category) =>
          String(category.id) === String(categoryId)
            ? { ...category, skills: nextSkills }
            : category,
        );

      loadedCategoryIdsRef.current.add(categoryId);
      setTaxonomy((current) => mergeCategorySkills(current));
      setInitialTaxonomy((current) => mergeCategorySkills(current));

      notify.complete(toastId, "Skills retrieved successfully.", "success");
    } catch (error) {
      notify.complete(
        toastId,
        getResourceManagementErrorMessage(error, "Unable to load skills for the selected category."),
        "error",
      );
    }
  };

  const mergeSavedCategories = (savedCategories) => {
    if (!savedCategories.length) return;

    setTaxonomy((current) => {
      const next = cloneTaxonomy(current);

      savedCategories.forEach((savedCategory) => {
        const saved = mapSavedCategory(savedCategory);
        const existingIndex = next.findIndex(
          (category) =>
            String(category.id) === String(saved.id) ||
            normalize(category.name) === normalize(saved.name),
        );

        if (existingIndex >= 0) {
          next[existingIndex] = mergeSavedCategory(next[existingIndex], saved);
        } else {
          next.push(saved);
        }
      });

      return next;
    });
  };

  const saveTaxonomy = async (categories, successFallback = "Skill taxonomy processed successfully.") => {
    const categoriesToSave = categories.filter((category) => category.name?.trim());

    if (!categoriesToSave.length) {
      notify.error("No taxonomy changes to save.");
      return false;
    }

    const toastId = notify.loading("Saving skill taxonomy...");

    try {
      const response = await skillService.saveSkillTaxonomy({
        categories: categoriesToSave.map(mapCategoryToRequest),
      });

      if (!response?.success) {
        throw new Error(response?.error || "Skill taxonomy save failed.");
      }

      const savedCategories = Array.isArray(response?.data?.categories)
        ? response.data.categories
        : [];

      mergeSavedCategories(savedCategories);
      setStagedCategories([]);
      setInitialTaxonomy((current) => {
        const next = cloneTaxonomy(current);
        savedCategories.map(mapSavedCategory).forEach((saved) => {
          const existingIndex = next.findIndex(
            (category) =>
              String(category.id) === String(saved.id) ||
              normalize(category.name) === normalize(saved.name),
          );
          if (existingIndex >= 0) {
            next[existingIndex] = mergeSavedCategory(next[existingIndex], saved);
          } else {
            next.push(saved);
          }
        });
        return next;
      });

      notify.complete(toastId, response?.message || successFallback, "success");
      return true;
    } catch (error) {
      notify.complete(
        toastId,
        getResourceManagementErrorMessage(error, "Unable to save skill taxonomy."),
        "error",
      );
      return false;
    }
  };

  const stageTaxonomy = ({
    categoryId,
    categoryName,
    categoryDescription = "",
    isCategoryActive,
    skills,
  }) => {
    const buildStagedCategory = (current = []) => {
      const existingCategory = current.find(
        (category) =>
          (categoryId && String(category.id) === String(categoryId)) ||
          normalize(category.name) === normalize(categoryName),
      );

      return {
        ...(existingCategory || {}),
        id: categoryId || existingCategory?.id || createId("cat"),
        name: categoryName,
        description: categoryDescription || existingCategory?.description || "",
        isActive: isCategoryActive,
        skills,
      };
    };

    setStagedCategories((current) => {
      const next = cloneTaxonomy(current);
      const category = buildStagedCategory(taxonomy);
      const existingIndex = next.findIndex(
        (item) =>
          String(item.id) === String(category.id) ||
          normalize(item.name) === normalize(category.name),
      );

      if (existingIndex >= 0) {
        next[existingIndex] = category;
      } else {
        next.push(category);
      }

      return next;
    });

    setTaxonomy((current) => {
      const next = cloneTaxonomy(current);
      const existingIndex = next.findIndex(
        (category) =>
          (categoryId && String(category.id) === String(categoryId)) ||
          normalize(category.name) === normalize(categoryName),
      );

      const category = {
        ...(existingIndex >= 0 ? next[existingIndex] : {}),
        id: categoryId || (existingIndex >= 0 ? next[existingIndex].id : createId("cat")),
        name: categoryName,
        description:
          categoryDescription || (existingIndex >= 0 ? next[existingIndex].description || "" : ""),
        isActive: isCategoryActive,
        skills,
      };

      if (existingIndex >= 0) {
        next[existingIndex] = category;
      } else {
        next.push(category);
      }

      return next;
    });
  };

  const applyUploadRows = (rows) => {
    setTaxonomy((current) => {
      const next = cloneTaxonomy(current);

      rows.forEach((row, index) => {
        let category = next.find((item) => normalize(item.name) === normalize(row.Category));
        if (!category) {
          category = {
            id: createId(`cat-upload-${index}`),
            name: row.Category,
            isActive: true,
            skills: [],
          };
          next.push(category);
        }

        let skill = category.skills.find((item) => normalize(item.name) === normalize(row.Skill));
        if (!skill) {
          skill = {
            id: createId(`skill-upload-${index}`),
            name: row.Skill,
            isActive: true,
            subSkills: [],
          };
          category.skills.push(skill);
        }

        if (row.SubSkill) {
          const hasSubSkill = skill.subSkills.some(
            (item) => normalize(item.name) === normalize(row.SubSkill),
          );
          if (!hasSubSkill) {
            skill.subSkills.push({
              id: createId(`sub-upload-${index}`),
              name: row.SubSkill,
              isActive: true,
            });
          }
        }
      });

      return next;
    });
  };

  const handleReset = () => {
    setTaxonomy(cloneTaxonomy(initialTaxonomy));
    setStagedCategories([]);
    setActiveTab("taxonomy");
    notify.info("Skill Management reset to loaded category data.");
  };

  const handleSave = async () => {
    const saved = await saveTaxonomy(stagedCategories);
    if (saved) {
      onClose();
    }
  };

  const hasPendingChanges = stagedCategories.length > 0;

  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[1200]" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="translate-y-4 scale-[0.98] opacity-0"
              enterTo="translate-y-0 scale-100 opacity-100"
              leave="ease-in duration-150"
              leaveFrom="translate-y-0 scale-100 opacity-100"
              leaveTo="translate-y-4 scale-[0.98] opacity-0"
            >
              <Dialog.Panel className="flex h-[88vh] w-[80vw] min-w-[320px] max-w-[1280px] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">

                {/* ── Modal header ─────────────────────────────────── */}
                <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-indigo-100 p-2.5 text-indigo-700">
                        <Settings2 className="h-5 w-5" />
                      </div>
                      <div>
                        <Dialog.Title className="text-base font-semibold text-gray-900">
                          Skill Management
                        </Dialog.Title>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Build and maintain the skill taxonomy hierarchy
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close modal"
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Tab + stats row */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    {/* Tab strip */}
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                      {modalTabs.map((tab) => {
                        const isActive = tab.id === activeTab;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
                              isActive
                                ? "bg-white text-indigo-700 shadow-sm"
                                : "text-gray-500 hover:text-gray-800"
                            }`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Taxonomy stats */}
                    <div className="flex flex-wrap items-center gap-2">
                      <StatPill icon={Boxes} label="Categories" count={stats.categories} />
                      <StatPill icon={Layers} label="Skills" count={stats.skills} />
                      <StatPill icon={Tag} label="SubSkills" count={stats.subSkills} />
                    </div>
                  </div>
                </div>

                {/* ── Modal body ───────────────────────────────────── */}
                <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/30 p-6">
                  {activeTab === "taxonomy" ? (
                    <SkillTaxonomyTab
                      taxonomy={taxonomy}
                      onStageTaxonomy={stageTaxonomy}
                      onLoadCategoryDetails={loadCategoryDetails}
                      initialDraft={initialDraft}
                      initialDraftKey={initialDraftKey}
                    />
                  ) : (
                    <BulkUploadTab onApplyRows={applyUploadRows} />
                  )}
                </div>

                {/* ── Modal footer ─────────────────────────────────── */}
                <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-3.5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-400">
                      {hasPendingChanges ? (
                        <span className="font-medium text-amber-600">
                          {stagedCategories.length} unsaved change{stagedCategories.length !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        "No pending changes"
                      )}
                    </p>

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default SkillManagementModal;
