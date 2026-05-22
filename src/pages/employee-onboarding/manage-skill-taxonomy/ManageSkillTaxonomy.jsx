import React, { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Loader2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
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

/* ─── Small reusable UI atoms ─────────────────────────────────────── */

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
      active
        ? "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20"
        : "bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-400/20"
    }`}
  >
    <span
      className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-gray-400"}`}
    />
    {active ? "Active" : "Inactive"}
  </span>
);

const ActionButton = ({ onClick, icon: Icon, variant = "edit", label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className={`rounded-md p-1.5 transition-colors ${
      variant === "edit"
        ? "text-gray-400 hover:bg-indigo-50 hover:text-indigo-600"
        : "text-gray-400 hover:bg-rose-50 hover:text-rose-600"
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);

const InlineSpinner = ({ message }) => (
  <div className="flex items-center gap-2 py-5 text-sm text-gray-500">
    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
    <span>{message}</span>
  </div>
);

const EmptyPane = ({ message }) => (
  <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-8 text-center">
    <FolderOpen className="h-6 w-6 text-gray-300" />
    <p className="text-sm text-gray-400">{message}</p>
  </div>
);

const SearchInput = ({ value, onChange, placeholder, onClear }) => (
  <div className="relative">
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-8 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
    />
    {value ? (
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear search"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    ) : null}
  </div>
);

/* ─── Main component ──────────────────────────────────────────────── */

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
      location.pathname.startsWith(
        "/employee-onboarding/manage-skill-taxonomy/requests",
      )
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
            if (category.skillsLoaded) return category;
            try {
              const response = await skillService.getSkillsByCategoryDto(category.id);
              if (!response?.success) throw new Error(response?.error || "Unable to load skills.");
              return {
                ...category,
                skills: Array.isArray(response.data) ? response.data.map(mapSkillDto) : [],
                skillsLoaded: true,
                skillsLoading: false,
              };
            } catch (error) {
              notify.error(error, `Unable to load skills for ${category.name}.`);
              return { ...category, skillsLoading: false };
            }
          }),
        );

        const fullyHydratedCategories = await Promise.all(
          categoriesWithSkills.map(async (category) => {
            const nextSkills = await Promise.all(
              (category.skills || []).map(async (skill) => {
                if (skill.subSkillsLoaded) return skill;
                try {
                  const response = await skillService.getSubSkillsBySkillDto(skill.id);
                  if (!response?.success) throw new Error(response?.error || "Unable to load subskills.");
                  return {
                    ...skill,
                    subSkills: Array.isArray(response.data) ? response.data.map(mapSubSkillDto) : [],
                    subSkillsLoaded: true,
                    subSkillsLoading: false,
                  };
                } catch (error) {
                  notify.error(error, `Unable to load subskills for ${skill.name}.`);
                  return { ...skill, subSkillsLoading: false };
                }
              }),
            );
            return { ...category, skills: nextSkills };
          }),
        );

        if (!cancelled) setCategories(fullyHydratedCategories);
      } finally {
        if (!cancelled) setSearchHydrating(false);
      }
    };

    hydrateTaxonomyForSearch();
    return () => { cancelled = true; };
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

    updateCategory(category.id, (c) => ({ ...c, skillsLoading: true }));
    try {
      const response = await skillService.getSkillsByCategoryDto(category.id);
      if (!response?.success) throw new Error(response?.error || "Unable to load skills.");
      updateCategory(category.id, (c) => ({
        ...c,
        skills: Array.isArray(response.data) ? response.data.map(mapSkillDto) : [],
        skillsLoaded: true,
        skillsLoading: false,
      }));
    } catch (error) {
      notify.error(error, `Unable to load skills for ${category.name}.`);
      updateCategory(category.id, (c) => ({ ...c, skillsLoading: false }));
    }
  };

  const handleSkillToggle = async (categoryId, skill) => {
    const skillKey = `${categoryId}-${skill.id}`;
    const willExpand = !expandedSkills[skillKey];
    setExpandedSkills(willExpand ? { [skillKey]: true } : {});
    if (!willExpand || skill.subSkillsLoaded || skill.subSkillsLoading) return;

    updateSkill(categoryId, skill.id, (s) => ({ ...s, subSkillsLoading: true }));
    try {
      const response = await skillService.getSubSkillsBySkillDto(skill.id);
      if (!response?.success) throw new Error(response?.error || "Unable to load subskills.");
      updateSkill(categoryId, skill.id, (s) => ({
        ...s,
        subSkills: Array.isArray(response.data) ? response.data.map(mapSubSkillDto) : [],
        subSkillsLoaded: true,
        subSkillsLoading: false,
      }));
    } catch (error) {
      notify.error(error, `Unable to load subskills for ${skill.name}.`);
      updateSkill(categoryId, skill.id, (s) => ({ ...s, subSkillsLoading: false }));
    }
  };

  const fetchSkillDtos = async (categoryId) => {
    const response = await skillService.getSkillsByCategoryDto(categoryId);
    if (!response?.success) throw new Error(response?.error || "Unable to load skills.");
    return Array.isArray(response.data) ? response.data.map(mapSkillDto) : [];
  };

  const fetchSubSkillDtos = async (skillId) => {
    const response = await skillService.getSubSkillsBySkillDto(skillId);
    if (!response?.success) throw new Error(response?.error || "Unable to load subskills.");
    return Array.isArray(response.data) ? response.data.map(mapSubSkillDto) : [];
  };

  const ensureCategoryHydrated = async (category) => {
    let nextCategory = category;
    if (!nextCategory.skillsLoaded) {
      const nextSkills = await fetchSkillDtos(nextCategory.id);
      nextCategory = { ...nextCategory, skills: nextSkills, skillsLoaded: true, skillsLoading: false };
    }
    const nextSkills = await Promise.all(
      (nextCategory.skills || []).map(async (skill) => {
        if (skill.subSkillsLoaded) return skill;
        const subSkills = await fetchSubSkillDtos(skill.id);
        return { ...skill, subSkills, subSkillsLoaded: true, subSkillsLoading: false };
      }),
    );
    const hydratedCategory = { ...nextCategory, skills: nextSkills };
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
      if (!matchedSkill) throw new Error("Unable to locate the selected skill.");
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
      if (!matchedSkill || !matchedSubSkill) throw new Error("Unable to locate the selected subskill.");
      openDraftEditor({
        scope: "subskill",
        categoryId: hydratedCategory.id,
        categoryName: hydratedCategory.name,
        isCategoryActive: hydratedCategory.active,
        skills: [
          {
            ...matchedSkill,
            isActive: matchedSkill.active,
            subSkills: [{ ...matchedSubSkill, isActive: matchedSubSkill.active }],
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

  /* ─── Render ────────────────────────────────────────────────────── */

  return (
    <div className="space-y-5 p-6">
      {/* Page header */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-200 pb-4">
  
  {/* Top Section */}
  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
    
    {/* Left Content */}
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
        Manage Skill Taxonomy
      </h1>
    </div>

    {/* Right Actions */}
    {activeTab === "taxonomy" && (
      <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row lg:w-auto lg:items-center lg:justify-end">
        
        {/* Search Input */}
        <div className="relative flex-1 sm:w-80 lg:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search skill taxonomy..."
            className="h-11 w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-9 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:shadow-sm"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Action Button */}
        <Button
          variant="primary"
          size="medium"
          onClick={() => setOpenSkillManagement(true)}
          className="h-11 px-5"
        >
          <Briefcase className="h-4 w-4" />
          Skill Management
        </Button>
      </div>
    )}
  </div>

  {/* Description */}
  <p className="max-w-3xl text-sm leading-relaxed text-gray-500">
    {tabDescriptions[activeTab]}
  </p>
</div>

        {/* Search hydrating notice */}
        {searchHydrating && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm text-indigo-700">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            <span>Loading skills and subskills for deeper search results…</span>
          </div>
        )}
      </div>

      {/* Taxonomy tab content */}
      {activeTab === "taxonomy" ? (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Result count strip */}
          {!loadingCategories && !searchHydrating && searchTerm && (
            <div className="border-b border-gray-100 bg-gray-50 px-5 py-2.5">
              <span className="text-xs text-gray-500">
                {filteredCategories.length === 0
                  ? "No results found"
                  : `${filteredCategories.length} categor${filteredCategories.length === 1 ? "y" : "ies"} matched`}
              </span>
            </div>
          )}

          {loadingCategories ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
              <span>Loading skill categories…</span>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-10">
              <EmptyPane
                message={
                  searchTerm
                    ? "No skill taxonomy data matched your search."
                    : "No skill taxonomy data found."
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCategories.map((category) => {
                const categoryExpanded = Boolean(expandedCategories[category.id]);

                return (
                  <div
                    key={category.id}
                    className={`bg-white transition-colors ${
                      categoryExpanded ? "border-l-2 border-l-indigo-400" : "border-l-2 border-l-transparent"
                    }`}
                  >
                    {/* Category row */}
                    <button
                      type="button"
                      onClick={() => handleCategoryToggle(category)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-gray-50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="shrink-0 text-gray-400">
                          {categoryExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); handleEditCategory(category); }}
                          icon={Pencil}
                          variant="edit"
                          label={`Edit ${category.name}`}
                        />
                        <ActionButton
                          onClick={(e) => { e.stopPropagation(); handleTrashClick(`category ${category.name}`); }}
                          icon={Trash2}
                          variant="delete"
                          label={`Delete ${category.name}`}
                        />
                        <StatusBadge active={category.active} />
                      </div>
                    </button>

                    {/* Skills panel */}
                    {categoryExpanded && (
                      <div className="border-t border-gray-100 bg-gray-50/70 px-5 pb-4 pt-3">
                        {category.skillsLoading ? (
                          <InlineSpinner message="Loading skills…" />
                        ) : category.skills.length === 0 ? (
                          <EmptyPane message="No skills mapped under this category." />
                        ) : (
                          <div className="space-y-3">
                            {/* Skill filter */}
                            <SearchInput
                              value={skillFilters[category.id] || ""}
                              onChange={(e) =>
                                setSkillFilters((current) => ({
                                  ...current,
                                  [category.id]: e.target.value,
                                }))
                              }
                              placeholder="Search skills in this category…"
                              onClear={() =>
                                setSkillFilters((current) => ({
                                  ...current,
                                  [category.id]: "",
                                }))
                              }
                            />

                            {/* Skill list */}
                            {(() => {
                              const filteredSkills = category.skills.filter((skill) => {
                                const query = normalize(skillFilters[category.id]);
                                if (!query) return true;
                                if (`${skill.name} ${skill.description}`.toLowerCase().includes(query)) return true;
                                return skill.subSkills.some((sub) =>
                                  `${sub.name} ${sub.description}`.toLowerCase().includes(query),
                                );
                              });

                              if (filteredSkills.length === 0) {
                                return <EmptyPane message="No skills or subskills matched this search." />;
                              }

                              return filteredSkills.map((skill) => {
                                const skillKey = `${category.id}-${skill.id}`;
                                const skillExpanded = Boolean(expandedSkills[skillKey]);

                                return (
                                  <div
                                    key={skill.id}
                                    className={`overflow-hidden rounded-lg border bg-white transition-colors ${
                                      skillExpanded
                                        ? "border-indigo-100"
                                        : "border-gray-200 hover:border-gray-300"
                                    }`}
                                  >
                                    {/* Skill row */}
                                    <button
                                      type="button"
                                      onClick={() => handleSkillToggle(category.id, skill)}
                                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-gray-50"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <span className="shrink-0 text-gray-400">
                                          {skillExpanded ? (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                          ) : (
                                            <ChevronRight className="h-3.5 w-3.5" />
                                          )}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="truncate text-sm font-medium text-gray-800">
                                            {skill.name}
                                          </p>
                                          {skill.description && (
                                            <p className="mt-0.5 truncate text-xs text-gray-500">
                                              {skill.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex shrink-0 items-center gap-1.5">
                                        <ActionButton
                                          onClick={(e) => { e.stopPropagation(); handleEditSkill(category, skill); }}
                                          icon={Pencil}
                                          variant="edit"
                                          label={`Edit ${skill.name}`}
                                        />
                                        <ActionButton
                                          onClick={(e) => { e.stopPropagation(); handleTrashClick(`skill ${skill.name}`); }}
                                          icon={Trash2}
                                          variant="delete"
                                          label={`Delete ${skill.name}`}
                                        />
                                        <StatusBadge active={skill.active} />
                                      </div>
                                    </button>

                                    {/* SubSkills panel */}
                                    {skillExpanded && (
                                      <div className="border-t border-gray-100 bg-gray-50/60 px-4 pb-3 pt-2.5">
                                        {skill.subSkillsLoading ? (
                                          <InlineSpinner message="Loading subskills…" />
                                        ) : skill.subSkills.length === 0 ? (
                                          <EmptyPane message="No subskills mapped under this skill." />
                                        ) : (
                                          <div className="space-y-2">
                                            {/* SubSkill filter */}
                                            <SearchInput
                                              value={subSkillFilters[skillKey] || ""}
                                              onChange={(e) =>
                                                setSubSkillFilters((current) => ({
                                                  ...current,
                                                  [skillKey]: e.target.value,
                                                }))
                                              }
                                              placeholder="Search subskills…"
                                              onClear={() =>
                                                setSubSkillFilters((current) => ({
                                                  ...current,
                                                  [skillKey]: "",
                                                }))
                                              }
                                            />

                                            {/* SubSkill list */}
                                            {(() => {
                                              const filteredSubs = skill.subSkills.filter((sub) => {
                                                const query = normalize(subSkillFilters[skillKey]);
                                                if (!query) return true;
                                                return `${sub.name} ${sub.description}`
                                                  .toLowerCase()
                                                  .includes(query);
                                              });

                                              if (filteredSubs.length === 0) {
                                                return (
                                                  <EmptyPane message="No subskills matched this search." />
                                                );
                                              }

                                              return filteredSubs.map((subSkill) => (
                                                <div
                                                  key={subSkill.id}
                                                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-white px-3 py-2.5 hover:border-gray-200"
                                                >
                                                  <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium text-gray-800">
                                                      {subSkill.name}
                                                    </p>
                                                    {subSkill.description && (
                                                      <p className="mt-0.5 truncate text-xs text-gray-500">
                                                        {subSkill.description}
                                                      </p>
                                                    )}
                                                  </div>
                                                  <div className="flex shrink-0 items-center gap-1.5">
                                                    <ActionButton
                                                      onClick={() => handleEditSubSkill(category, skill, subSkill)}
                                                      icon={Pencil}
                                                      variant="edit"
                                                      label={`Edit ${subSkill.name}`}
                                                    />
                                                    <ActionButton
                                                      onClick={() => handleTrashClick(`subskill ${subSkill.name}`)}
                                                      icon={Trash2}
                                                      variant="delete"
                                                      label={`Delete ${subSkill.name}`}
                                                    />
                                                    <StatusBadge active={subSkill.active} />
                                                  </div>
                                                </div>
                                              ));
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Requests tab placeholder */
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-10 text-center">
          <FolderOpen className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Skill taxonomy requests</p>
          <p className="mt-1 max-w-sm mx-auto text-sm text-gray-500">
            Track incoming skill taxonomy requests and review pending changes from employees or
            administrators.
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
