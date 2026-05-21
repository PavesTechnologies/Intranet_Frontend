import React, { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { notify } from "../../utils/notify";
import DraftPreviewPanel from "./DraftPreviewPanel";
import SearchableSelect from "./SearchableSelect";
import SkillCard from "./SkillCard";

const normalize = (value) => `${value || ""}`.trim().toLowerCase();

const createTemporaryId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createDraftItem = ({ id, name, description = "", isActive = true, prefix }) => ({
  id: id || createTemporaryId(prefix),
  name: name.trim(),
  description,
  isActive,
});

const modeButtonClass = (isActive) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-indigo-600 text-white shadow-sm"
      : "bg-white text-slate-600 hover:bg-slate-100"
  }`;

const SkillTaxonomyTab = ({ taxonomy, onStageTaxonomy, onLoadCategoryDetails }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryDraftId, setNewCategoryDraftId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCategoryActive, setIsCategoryActive] = useState(true);

  const [skills, setSkills] = useState([]);
  const [showAddSkillForm, setShowAddSkillForm] = useState(false);

  const [isNewSkill, setIsNewSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [isSkillActive, setIsSkillActive] = useState(true);

  const categoryOptions = useMemo(
    () => taxonomy.map((category) => ({ id: category.id, name: category.name })),
    [taxonomy]
  );

  const activeCategory = taxonomy.find(
    (category) => category.id === selectedCategoryId
  );

  const skillOptions = useMemo(
    () =>
      (activeCategory?.skills || []).map((skill) => ({
        id: skill.id,
        name: skill.name,
      })),
    [activeCategory]
  );

  const activeCategoryName = isNewCategory
    ? newCategoryName.trim()
    : activeCategory?.name || "";

  const previewCategory = activeCategoryName
    ? {
        id: selectedCategoryId || "draft-category",
        name: activeCategoryName,
        isActive: isCategoryActive,
        skills,
      }
    : null;

  const categoryReady = Boolean(activeCategoryName);

  const resetDraft = () => {
    setSelectedCategoryId("");
    setIsNewCategory(false);
    setNewCategoryDraftId("");
    setNewCategoryName("");
    setIsCategoryActive(true);

    setSkills([]);

    setShowAddSkillForm(false);

    setIsNewSkill(false);
    setSelectedSkillId("");
    setNewSkillName("");
    setIsSkillActive(true);
  };

  const syncStagedTaxonomy = (nextSkills, overrides = {}) => {
    const nextCategoryName =
      overrides.categoryName ??
      (overrides.isNewCategory ?? isNewCategory
        ? overrides.newCategoryName ?? newCategoryName.trim()
        : activeCategory?.name || "");

    if (nextCategoryName) {
      onStageTaxonomy({
        categoryId:
          overrides.categoryId ??
          ((overrides.isNewCategory ?? isNewCategory) ? newCategoryDraftId : selectedCategoryId),
        categoryName: nextCategoryName,
        isCategoryActive: overrides.isCategoryActive ?? isCategoryActive,
        skills: nextSkills,
      });
    }
  };

  const stageTaxonomy = (nextSkills) => {
    setSkills(nextSkills);
    syncStagedTaxonomy(nextSkills);
  };

  const updateSkill = (skillId, updater) => {
    setSkills((current) => {
      const next = current.map((skill) =>
        skill.id === skillId ? updater(skill) : skill
      );
      syncStagedTaxonomy(next);
      return next;
    });
  };

  const addSkill = () => {
    const rawValue = isNewSkill
      ? newSkillName
      : skillOptions.find(
          (skill) => skill.id === selectedSkillId
        )?.name || "";

    if (!rawValue.trim()) {
      notify.error("Choose or enter a skill name first.");
      return;
    }

    if (
      skills.some(
        (skill) => normalize(skill.name) === normalize(rawValue)
      )
    ) {
      notify.error("That skill is already staged.");
      return;
    }

    const selectedExistingSkill = isNewSkill
      ? null
      : activeCategory?.skills?.find(
          (skill) => String(skill.id) === String(selectedSkillId)
        );

    stageTaxonomy([
      ...skills,
      {
        ...createDraftItem({
          id: selectedExistingSkill?.id,
          name: rawValue,
          description: selectedExistingSkill?.description || "",
          isActive: selectedExistingSkill?.isActive ?? isSkillActive,
          prefix: "skill",
        }),

        subSkills: [],

        isAddingSubSkill: false,

        isNewSubSkill: false,

        selectedExistingSubSkillId: "",

        newSubSkillName: "",

        isSubSkillActive: true,
      },
    ]);

    setSelectedSkillId("");
    setNewSkillName("");
    setIsSkillActive(true);
    setShowAddSkillForm(false);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
      <div className="space-y-6">

        {/* CATEGORY SECTION */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                1. Choose Category
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Select existing or create new category
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setIsNewCategory(false);
                  setNewCategoryDraftId("");
                  setNewCategoryName("");
                }}
                className={modeButtonClass(!isNewCategory)}
              >
                Existing
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsNewCategory(true);
                  setNewCategoryDraftId((current) => current || createTemporaryId("cat"));
                  setSelectedCategoryId("");
                }}
                className={modeButtonClass(isNewCategory)}
              >
                New
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr),auto] lg:items-end">

            {isNewCategory ? (
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Category Name
                </label>

                <input
                  value={newCategoryName}
                  onChange={(e) => {
                    const value = e.target.value;
                    const draftId = newCategoryDraftId || createTemporaryId("cat");
                    if (!newCategoryDraftId) {
                      setNewCategoryDraftId(draftId);
                    }
                    setNewCategoryName(value);
                    syncStagedTaxonomy(skills, {
                      categoryId: draftId,
                      categoryName: value.trim(),
                      isNewCategory: true,
                    });
                  }}
                  placeholder="Enter category name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                />
              </div>
            ) : (
              <SearchableSelect
                label="Category"
                value={selectedCategoryId}
                onChange={async (value) => {
                  setSelectedCategoryId(value);

                  const matched = taxonomy.find(
                    (item) => String(item.id) === String(value)
                  );

                  const selectedSkills = matched?.skills || [];
                  setIsCategoryActive(matched?.isActive ?? true);
                  setSkills(selectedSkills);
                  setShowAddSkillForm(false);
                  setSelectedSkillId("");
                  setNewSkillName("");
                  setIsNewSkill(false);

                  if (value && onLoadCategoryDetails) {
                    await onLoadCategoryDetails(value);
                  }
                }}
                options={categoryOptions}
                placeholder="Search category"
              />
            )}

            <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isCategoryActive}
                onChange={(e) => {
                  setIsCategoryActive(e.target.checked);
                  syncStagedTaxonomy(skills, {
                    isCategoryActive: e.target.checked,
                  });
                }}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Active
            </label>
          </div>
        </div>

        {/* SKILLS SECTION */}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                2. Add Skills
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Each skill manages subskills
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
              {skills.length} staged
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {skills.map((skill) => {
              const matchedExistingSkill =
                activeCategory?.skills?.find(
                  (item) =>
                    normalize(item.name) ===
                    normalize(skill.name)
                );

              const existingSubSkillOptions =
                (matchedExistingSkill?.subSkills || []).map(
                  (subSkill) => ({
                    id: subSkill.id,
                    name: subSkill.name,
                    description: subSkill.description || "",
                    isActive: subSkill.isActive ?? true,
                  })
                );

              return (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  existingSubSkillOptions={
                    existingSubSkillOptions
                  }

                  onRemoveSkill={() =>
                    stageTaxonomy(
                      skills.filter((item) => item.id !== skill.id)
                    )
                  }

                  onRemoveSubSkill={(subSkillId) =>
                    updateSkill(skill.id, (currentSkill) => ({
                      ...currentSkill,
                      subSkills:
                        currentSkill.subSkills.filter(
                          (item) =>
                            item.id !== subSkillId
                        ),
                    }))
                  }

                  onOpenSubSkillForm={() =>
                    updateSkill(skill.id, (currentSkill) => ({
                      ...currentSkill,
                      isAddingSubSkill:
                        !currentSkill.isAddingSubSkill,
                    }))
                  }

                  onToggleNewSubSkill={(checked) =>
                    updateSkill(skill.id, (currentSkill) => ({
                      ...currentSkill,
                      isNewSubSkill: checked,
                    }))
                  }

                  onExistingSubSkillChange={(value) =>
                    updateSkill(skill.id, (currentSkill) => ({
                      ...currentSkill,
                      selectedExistingSubSkillId: value,
                    }))
                  }

                  onNewSubSkillNameChange={(value) =>
                    updateSkill(skill.id, (currentSkill) => ({
                      ...currentSkill,
                      newSubSkillName: value,
                    }))
                  }

                  onAddSubSkill={() => {
                    const currentSkill = skills.find(
                      (item) => item.id === skill.id
                    );

                    const rawValue =
                      currentSkill?.isNewSubSkill
                        ? currentSkill?.newSubSkillName || ""
                        : existingSubSkillOptions.find(
                            (item) =>
                              String(item.id) ===
                              String(
                                currentSkill?.selectedExistingSubSkillId
                              )
                          )?.name || "";

                    if (!rawValue.trim()) {
                      notify.error(
                        "Choose or enter subskill name"
                      );
                      return;
                    }

                    if (
                      currentSkill.subSkills.some(
                        (item) => normalize(item.name) === normalize(rawValue)
                      )
                    ) {
                      notify.error("That subskill is already added to this skill.");
                      return;
                    }

                    const selectedExistingSubSkill =
                      currentSkill?.isNewSubSkill
                        ? null
                        : existingSubSkillOptions.find(
                            (item) =>
                              String(item.id) ===
                              String(
                                currentSkill?.selectedExistingSubSkillId
                              )
                          );

                    updateSkill(skill.id, (draftSkill) => ({
                      ...draftSkill,

                      subSkills: [
                        ...draftSkill.subSkills,
                        createDraftItem({
                          id: selectedExistingSubSkill?.id,
                          name: rawValue,
                          description: selectedExistingSubSkill?.description || "",
                          isActive:
                            selectedExistingSubSkill?.isActive ??
                            draftSkill.isSubSkillActive,
                          prefix: "subskill",
                        }),
                      ],

                      selectedExistingSubSkillId: "",
                      newSubSkillName: "",
                      isAddingSubSkill: false,
                    }));
                  }}
                />
              );
            })}
          </div>

          <div className="mt-4 border-t border-slate-200 pt-4">

            {!showAddSkillForm ? (
              <button
                type="button"
                onClick={() =>
                  setShowAddSkillForm(true)
                }
                disabled={!categoryReady}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Skill
              </button>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">

                <div className="mb-3 inline-flex rounded-xl bg-slate-100 p-1">

                  <button
                    type="button"
                    onClick={() => {
                      setIsNewSkill(false);
                      setNewSkillName("");
                    }}
                    className={modeButtonClass(!isNewSkill)}
                  >
                    Existing Skill
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsNewSkill(true);
                      setSelectedSkillId("");
                    }}
                    className={modeButtonClass(isNewSkill)}
                  >
                    New Skill
                  </button>
                </div>

                {isNewSkill ? (
                  <input
                    value={newSkillName}
                    onChange={(e) =>
                      setNewSkillName(e.target.value)
                    }
                    placeholder="Enter skill name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  />
                ) : (
                  <SearchableSelect
                    label="Skill"
                    value={selectedSkillId}
                    onChange={setSelectedSkillId}
                    options={skillOptions}
                    placeholder="Search skill"
                  />
                )}

                <div className="mt-4 flex items-center justify-between">

                  <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={isSkillActive}
                      onChange={(e) =>
                        setIsSkillActive(
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    Active
                  </label>

                  <button
                    type="button"
                    onClick={addSkill}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Add Skill
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <DraftPreviewPanel
        currentDraft={previewCategory}
        taxonomy={taxonomy}
      />
    </div>
  );
};

export default SkillTaxonomyTab;
