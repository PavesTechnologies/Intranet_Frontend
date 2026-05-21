import React, { useEffect, useMemo, useState } from "react";
import { Briefcase, ChevronDown, ChevronRight, Pencil, Search, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import Button from "../../../components/Button/Button";
import SkillManagementModal from "../../resource_management/models/skill_management/SkillManagementModal";
import { skillService } from "../../../services/skillService";
import { notify } from "../../resource_management/utils/notify";

const normalize = (value) => `${value || ""}`.trim().toLowerCase();

const tabDescriptions = {
  taxonomy:
    "Maintain the master skill taxonomy used across employee profiles, roles, and resource planning.",
  requests:
    "Review requested additions or changes before they become part of the approved skill taxonomy.",
};

const mapCategoryDto = (category) => ({
  id: category.id,
  name: category.name,
  description: category.description || "",
  active: category.active ?? true,
  skills: [],
  skillsLoaded: false,
  skillsLoading: false,
});

const mapSkillDto = (skill) => ({
  id: skill.id,
  name: skill.name,
  description: skill.description || "",
  active: skill.active ?? true,
  subSkills: [],
  subSkillsLoaded: false,
  subSkillsLoading: false,
});

const mapSubSkillDto = (subSkill) => ({
  id: subSkill.id,
  name: subSkill.name,
  description: subSkill.description || "",
  active: subSkill.active ?? true,
});

const StatusBadge = ({ active }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
      active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

const ManageSkillTaxonomy = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [openSkillManagement, setOpenSkillManagement] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSkills, setExpandedSkills] = useState({});
  const [skillFilters, setSkillFilters] = useState({});
  const [subSkillFilters, setSubSkillFilters] = useState({});
  const [searchHydrating, setSearchHydrating] = useState(false);
  const [skillManagementDraft, setSkillManagementDraft] = useState(null);
  const [skillManagementDraftKey, setSkillManagementDraftKey] = useState("");

  const activeTab = useMemo(
    () =>
      location.pathname.startsWith("/employee-onboarding/manage-skill-taxonomy/requests")
        ? "requests"
      : "taxonomy",
    [location.pathname],
  );

  const fetchCategories = async () => {
    setLoadingCategories(true);

    try {
      const response = await skillService.getCategoryDtos();
      if (!response?.success) {
        throw new Error(response?.error || "Unable to load categories.");
      }

      setCategories(Array.isArray(response.data) ? response.data.map(mapCategoryDto) : []);
      setExpandedCategories({});
      setExpandedSkills({});
      setSkillFilters({});
      setSubSkillFilters({});
    } catch (error) {
      notify.error(error, "Unable to load skill categories.");
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (activeTab === "taxonomy") {
      fetchCategories();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "taxonomy" || !searchTerm.trim() || categories.length === 0) return;

    let cancelled = false;

    const hydrateTaxonomyForSearch = async () => {
      const categoriesNeedingSkills = categories.filter(
        (category) => !category.skillsLoaded && !category.skillsLoading,
      );

      if (categoriesNeedingSkills.length === 0) {
        const skillsNeedingSubSkills = categories.flatMap((category) =>
          (category.skills || [])
            .filter((skill) => !skill.subSkillsLoaded && !skill.subSkillsLoading)
            .map((skill) => ({ categoryId: category.id, skill })),
        );

        if (skillsNeedingSubSkills.length === 0) return;
      }

      setSearchHydrating(true);

      try {
        const categoriesWithSkills = await Promise.all(
          categories.map(async (category) => {
            if (category.skillsLoaded) {
              return category;
            }

            try {
              const response = await skillService.getSkillsByCategoryDto(category.id);
              if (!response?.success) {
                throw new Error(response?.error || "Unable to load skills.");
              }

              return {
                ...category,
                skills: Array.isArray(response.data) ? response.data.map(mapSkillDto) : [],
                skillsLoaded: true,
                skillsLoading: false,
              };
            } catch (error) {
              notify.error(error, `Unable to load skills for ${category.name}.`);
              return {
                ...category,
                skillsLoading: false,
              };
            }
          }),
        );

        const fullyHydratedCategories = await Promise.all(
          categoriesWithSkills.map(async (category) => {
            const nextSkills = await Promise.all(
              (category.skills || []).map(async (skill) => {
                if (skill.subSkillsLoaded) {
                  return skill;
                }

                try {
                  const response = await skillService.getSubSkillsBySkillDto(skill.id);
                  if (!response?.success) {
                    throw new Error(response?.error || "Unable to load subskills.");
                  }

                  return {
                    ...skill,
                    subSkills: Array.isArray(response.data) ? response.data.map(mapSubSkillDto) : [],
                    subSkillsLoaded: true,
                    subSkillsLoading: false,
                  };
                } catch (error) {
                  notify.error(error, `Unable to load subskills for ${skill.name}.`);
                  return {
                    ...skill,
                    subSkillsLoading: false,
                  };
                }
              }),
            );

            return {
              ...category,
              skills: nextSkills,
            };
          }),
        );

        if (!cancelled) {
          setCategories(fullyHydratedCategories);
        }
      } finally {
        if (!cancelled) {
          setSearchHydrating(false);
        }
      }
    };

    hydrateTaxonomyForSearch();

    return () => {
      cancelled = true;
    };
  }, [activeTab, categories, searchTerm]);

  const updateCategory = (categoryId, updater) => {
    setCategories((current) =>
      current.map((category) =>
        String(category.id) === String(categoryId) ? updater(category) : category,
      ),
    );
  };

  const updateSkill = (categoryId, skillId, updater) => {
    updateCategory(categoryId, (category) => ({
      ...category,
      skills: category.skills.map((skill) =>
        String(skill.id) === String(skillId) ? updater(skill) : skill,
      ),
    }));
  };

  const handleCategoryToggle = async (category) => {
    const willExpand = !expandedCategories[category.id];
    setExpandedCategories(willExpand ? { [category.id]: true } : {});
    setExpandedSkills({});

    if (!willExpand || category.skillsLoaded || category.skillsLoading) return;

    updateCategory(category.id, (currentCategory) => ({
      ...currentCategory,
      skillsLoading: true,
    }));

    try {
      const response = await skillService.getSkillsByCategoryDto(category.id);
      if (!response?.success) {
        throw new Error(response?.error || "Unable to load skills.");
      }

      updateCategory(category.id, (currentCategory) => ({
        ...currentCategory,
        skills: Array.isArray(response.data) ? response.data.map(mapSkillDto) : [],
        skillsLoaded: true,
        skillsLoading: false,
      }));
    } catch (error) {
      notify.error(error, `Unable to load skills for ${category.name}.`);
      updateCategory(category.id, (currentCategory) => ({
        ...currentCategory,
        skillsLoading: false,
      }));
    }
  };

  const handleSkillToggle = async (categoryId, skill) => {
    const skillKey = `${categoryId}-${skill.id}`;
    const willExpand = !expandedSkills[skillKey];
    setExpandedSkills(willExpand ? { [skillKey]: true } : {});

    if (!willExpand || skill.subSkillsLoaded || skill.subSkillsLoading) return;

    updateSkill(categoryId, skill.id, (currentSkill) => ({
      ...currentSkill,
      subSkillsLoading: true,
    }));

    try {
      const response = await skillService.getSubSkillsBySkillDto(skill.id);
      if (!response?.success) {
        throw new Error(response?.error || "Unable to load subskills.");
      }

      updateSkill(categoryId, skill.id, (currentSkill) => ({
        ...currentSkill,
        subSkills: Array.isArray(response.data) ? response.data.map(mapSubSkillDto) : [],
        subSkillsLoaded: true,
        subSkillsLoading: false,
      }));
    } catch (error) {
      notify.error(error, `Unable to load subskills for ${skill.name}.`);
      updateSkill(categoryId, skill.id, (currentSkill) => ({
        ...currentSkill,
        subSkillsLoading: false,
      }));
    }
  };

  const fetchSkillDtos = async (categoryId) => {
    const response = await skillService.getSkillsByCategoryDto(categoryId);
    if (!response?.success) {
      throw new Error(response?.error || "Unable to load skills.");
    }
    return Array.isArray(response.data) ? response.data.map(mapSkillDto) : [];
  };

  const fetchSubSkillDtos = async (skillId) => {
    const response = await skillService.getSubSkillsBySkillDto(skillId);
    if (!response?.success) {
      throw new Error(response?.error || "Unable to load subskills.");
    }
    return Array.isArray(response.data) ? response.data.map(mapSubSkillDto) : [];
  };

  const ensureCategoryHydrated = async (category) => {
    let nextCategory = category;

    if (!nextCategory.skillsLoaded) {
      const nextSkills = await fetchSkillDtos(nextCategory.id);
      nextCategory = {
        ...nextCategory,
        skills: nextSkills,
        skillsLoaded: true,
        skillsLoading: false,
      };
    }

    const nextSkills = await Promise.all(
      (nextCategory.skills || []).map(async (skill) => {
        if (skill.subSkillsLoaded) {
          return skill;
        }

        const subSkills = await fetchSubSkillDtos(skill.id);
        return {
          ...skill,
          subSkills,
          subSkillsLoaded: true,
          subSkillsLoading: false,
        };
      }),
    );

    const hydratedCategory = {
      ...nextCategory,
      skills: nextSkills,
    };

    setCategories((current) =>
      current.map((item) =>
        String(item.id) === String(category.id) ? hydratedCategory : item,
      ),
    );

    return hydratedCategory;
  };

  const openDraftEditor = (draft) => {
    setSkillManagementDraft(draft);
    setSkillManagementDraftKey(`${draft.scope}-${draft.categoryId || "new"}-${Date.now()}`);
    setOpenSkillManagement(true);
  };

  const handleEditCategory = async (category) => {
    try {
      const hydratedCategory = await ensureCategoryHydrated(category);
      openDraftEditor({
        scope: "category",
        categoryId: hydratedCategory.id,
        categoryName: hydratedCategory.name,
        isCategoryActive: hydratedCategory.active,
        skills: hydratedCategory.skills.map((skill) => ({
          ...skill,
          isActive: skill.active,
          subSkills: (skill.subSkills || []).map((subSkill) => ({
            ...subSkill,
            isActive: subSkill.active,
          })),
        })),
      });
    } catch (error) {
      notify.error(error, `Unable to prepare ${category.name} for editing.`);
    }
  };

  const handleEditSkill = async (category, skill) => {
    try {
      const hydratedCategory = await ensureCategoryHydrated(category);
      const matchedSkill = hydratedCategory.skills.find(
        (item) => String(item.id) === String(skill.id),
      );

      if (!matchedSkill) {
        throw new Error("Unable to locate the selected skill.");
      }

      openDraftEditor({
        scope: "skill",
        categoryId: hydratedCategory.id,
        categoryName: hydratedCategory.name,
        isCategoryActive: hydratedCategory.active,
        skills: [
          {
            ...matchedSkill,
            isActive: matchedSkill.active,
            subSkills: (matchedSkill.subSkills || []).map((subSkill) => ({
              ...subSkill,
              isActive: subSkill.active,
            })),
          },
        ],
      });
    } catch (error) {
      notify.error(error, `Unable to prepare ${skill.name} for editing.`);
    }
  };

  const handleEditSubSkill = async (category, skill, subSkill) => {
    try {
      const hydratedCategory = await ensureCategoryHydrated(category);
      const matchedSkill = hydratedCategory.skills.find(
        (item) => String(item.id) === String(skill.id),
      );
      const matchedSubSkill = matchedSkill?.subSkills?.find(
        (item) => String(item.id) === String(subSkill.id),
      );

      if (!matchedSkill || !matchedSubSkill) {
        throw new Error("Unable to locate the selected subskill.");
      }

      openDraftEditor({
        scope: "subskill",
        categoryId: hydratedCategory.id,
        categoryName: hydratedCategory.name,
        isCategoryActive: hydratedCategory.active,
        skills: [
          {
            ...matchedSkill,
            isActive: matchedSkill.active,
            subSkills: [
              {
                ...matchedSubSkill,
                isActive: matchedSubSkill.active,
              },
            ],
          },
        ],
      });
    } catch (error) {
      notify.error(error, `Unable to prepare ${subSkill.name} for editing.`);
    }
  };

  const handleTrashClick = (label) => {
    notify.info(`Trash UI is ready for ${label}. Delete endpoint will be wired later.`);
  };

  const filteredCategories = useMemo(() => {
    const query = normalize(searchTerm);
    if (!query) return categories;

    return categories.filter((category) => {
      const categoryMatch = `${category.name} ${category.description}`.toLowerCase().includes(query);
      const skillMatch = category.skills.some((skill) => {
        const subSkillMatch = skill.subSkills.some((subSkill) =>
          `${subSkill.name} ${subSkill.description}`.toLowerCase().includes(query),
        );
        return `${skill.name} ${skill.description}`.toLowerCase().includes(query) || subSkillMatch;
      });

      return categoryMatch || skillMatch;
    });
  }, [categories, searchTerm]);

  const handleSkillManagementClose = () => {
    setOpenSkillManagement(false);
    setSkillManagementDraft(null);
    setSkillManagementDraftKey("");
    fetchCategories();
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Manage Skill Taxonomy
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              {tabDescriptions[activeTab]}
            </p>
          </div>

          {activeTab === "taxonomy" ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:justify-end">
              <div className="relative min-w-0 sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search skill taxonomy"
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              <Button
                variant="outline"
                size="medium"
                onClick={() => setOpenSkillManagement(true)}
              >
                <Briefcase className="h-4 w-4" /> Skill Management
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {activeTab === "taxonomy" ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          {loadingCategories ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading skill categories...
            </div>
          ) : searchHydrating ? (
            <div className="border-b border-indigo-100 bg-indigo-50 px-5 py-3 text-sm text-indigo-700">
              Loading skills and subskills for deeper search results...
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No skill taxonomy data found.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCategories.map((category) => {
                const categoryExpanded = Boolean(expandedCategories[category.id]);

                return (
                  <div key={category.id} className="bg-white">
                    <button
                      type="button"
                      onClick={() => handleCategoryToggle(category)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {categoryExpanded ? (
                          <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {category.name}
                          </p>
                          <p className="mt-1 truncate text-xs text-gray-500">
                            {category.description || "No description available"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditCategory(category);
                          }}
                          className="rounded-md border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-indigo-200 hover:text-indigo-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleTrashClick(`category ${category.name}`);
                          }}
                          className="rounded-md border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-rose-200 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                        <StatusBadge active={category.active} />
                      </div>
                    </button>

                    {categoryExpanded ? (
                      <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                        {category.skillsLoading ? (
                          <p className="text-sm text-gray-500">Loading skills...</p>
                        ) : category.skills.length === 0 ? (
                          <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-5 text-center text-sm text-gray-400">
                            No skills mapped under this category.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            <div className="relative">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                              <input
                                value={skillFilters[category.id] || ""}
                                onChange={(event) =>
                                  setSkillFilters((current) => ({
                                    ...current,
                                    [category.id]: event.target.value,
                                  }))
                                }
                                placeholder="Search skills and subskills in this category"
                                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                              />
                            </div>

                            {category.skills
                              .filter((skill) => {
                                const query = normalize(skillFilters[category.id]);
                                if (!query) return true;

                                if (
                                  `${skill.name} ${skill.description}`.toLowerCase().includes(query)
                                ) {
                                  return true;
                                }

                                return skill.subSkills.some((subSkill) =>
                                  `${subSkill.name} ${subSkill.description}`
                                    .toLowerCase()
                                    .includes(query),
                                );
                              })
                              .map((skill) => {
                              const skillKey = `${category.id}-${skill.id}`;
                              const skillExpanded = Boolean(expandedSkills[skillKey]);

                              return (
                                <div
                                  key={skill.id}
                                  className="overflow-hidden rounded-lg border border-gray-200 bg-white"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSkillToggle(category.id, skill)}
                                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-gray-50"
                                  >
                                    <div className="flex min-w-0 items-center gap-3">
                                      {skillExpanded ? (
                                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                                      )}
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-gray-900">
                                          {skill.name}
                                        </p>
                                        <p className="mt-1 truncate text-xs text-gray-500">
                                          {skill.description || "No description available"}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleEditSkill(category, skill);
                                        }}
                                        className="rounded-md border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-indigo-200 hover:text-indigo-700"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          handleTrashClick(`skill ${skill.name}`);
                                        }}
                                        className="rounded-md border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-rose-200 hover:text-rose-700"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                      <StatusBadge active={skill.active} />
                                    </div>
                                  </button>

                                  {skillExpanded ? (
                                    <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                                      {skill.subSkillsLoading ? (
                                        <p className="text-sm text-gray-500">Loading subskills...</p>
                                      ) : skill.subSkills.length === 0 ? (
                                        <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-4 text-center text-sm text-gray-400">
                                          No subskills mapped under this skill.
                                        </p>
                                      ) : (
                                        <div className="space-y-2">
                                          <div className="relative pb-1">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                              value={subSkillFilters[skillKey] || ""}
                                              onChange={(event) =>
                                                setSubSkillFilters((current) => ({
                                                  ...current,
                                                  [skillKey]: event.target.value,
                                                }))
                                              }
                                              placeholder="Search subskills in this skill"
                                              className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                                            />
                                          </div>

                                          {skill.subSkills
                                            .filter((subSkill) => {
                                              const query = normalize(subSkillFilters[skillKey]);
                                              if (!query) return true;

                                              return `${subSkill.name} ${subSkill.description}`
                                                .toLowerCase()
                                                .includes(query);
                                            })
                                            .map((subSkill) => (
                                            <div
                                              key={subSkill.id}
                                              className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-white px-3 py-2.5"
                                            >
                                              <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-gray-800">
                                                  {subSkill.name}
                                                </p>
                                                <p className="mt-1 truncate text-xs text-gray-500">
                                                  {subSkill.description || "No description available"}
                                                </p>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => handleEditSubSkill(category, skill, subSkill)}
                                                  className="rounded-md border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-indigo-200 hover:text-indigo-700"
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleTrashClick(`subskill ${subSkill.name}`)}
                                                  className="rounded-md border border-gray-200 bg-white p-2 text-gray-500 transition hover:border-rose-200 hover:text-rose-700"
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                                <StatusBadge active={subSkill.active} />
                                              </div>
                                            </div>
                                          ))}

                                          {skill.subSkills.length > 0 &&
                                          skill.subSkills.filter((subSkill) => {
                                            const query = normalize(subSkillFilters[skillKey]);
                                            if (!query) return true;

                                            return `${subSkill.name} ${subSkill.description}`
                                              .toLowerCase()
                                              .includes(query);
                                          }).length === 0 ? (
                                            <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-4 text-center text-sm text-gray-400">
                                              No subskills match this search.
                                            </p>
                                          ) : null}
                                        </div>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })}

                            {category.skills.length > 0 &&
                            category.skills.filter((skill) => {
                              const query = normalize(skillFilters[category.id]);
                              if (!query) return true;

                              if (`${skill.name} ${skill.description}`.toLowerCase().includes(query)) {
                                return true;
                              }

                              return skill.subSkills.some((subSkill) =>
                                `${subSkill.name} ${subSkill.description}`
                                  .toLowerCase()
                                  .includes(query),
                              );
                            }).length === 0 ? (
                              <p className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-5 text-center text-sm text-gray-400">
                                No skills or subskills match this search.
                              </p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm font-medium text-gray-700">
            Skill taxonomy requests
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Track incoming skill taxonomy requests and review pending changes from employees or administrators.
          </p>
        </div>
      )}

      <SkillManagementModal
        open={openSkillManagement}
        onClose={handleSkillManagementClose}
        initialDraft={skillManagementDraft}
        initialDraftKey={skillManagementDraftKey}
      />
    </div>
  );
};

export default ManageSkillTaxonomy;
