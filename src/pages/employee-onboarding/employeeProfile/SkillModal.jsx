import React, { useState, useEffect, Fragment, useMemo } from "react";
import { X, Plus, Trash2, ChevronDown, Search, Check, Loader2, AlertCircle, Briefcase, List, Award } from "lucide-react";
import { Combobox, Transition } from "@headlessui/react";
import { skillService } from "../../../services/skillService";
import { showStatusToast } from "../../../components/toastfy/toast";

/* ===================== SEARCHABLE SELECT COMPONENT ===================== */

const SearchableSelect = ({ label, value, onChange, options, placeholder, disabled, icon: Icon = Search }) => {
  const [query, setQuery] = useState("");
  const buttonRef = React.useRef(null);

  const filteredOptions = query === ""
    ? options
    : options.filter((opt) =>
      (opt.name || opt.levelName || "").toLowerCase().includes(query.toLowerCase())
    );

  const selectedOption = options.find((opt) => String(opt.id || opt.proficiencyId) === String(value));

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>
      )}
      <Combobox
        value={value}
        onChange={(val) => {
          onChange(val);
          setQuery("");
        }}
        disabled={disabled}
      >
        {({ open }) => {
          // Calculate dropdown position when open
          const getDropdownStyle = () => {
            if (!buttonRef.current) return {};
            const rect = buttonRef.current.getBoundingClientRect();
            return {
              position: 'fixed',
              top: `${rect.bottom + 8}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`,
              zIndex: 10000
            };
          };

          return (
            <div className="relative">
              <Combobox.Button ref={buttonRef} as="div" className={`relative w-full cursor-pointer overflow-hidden rounded-xl border bg-white shadow-sm transition ${disabled ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50' : 'border-slate-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10'}`}>
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Icon className={`h-4 w-4 ${open ? 'text-indigo-500' : 'text-slate-400'} transition-colors duration-200`} />
                </div>
                <Combobox.Input
                  className="w-full border-none bg-transparent py-2 pl-9 pr-10 text-sm text-slate-900 outline-none focus:ring-0 font-medium"
                  displayValue={() => selectedOption?.name || selectedOption?.levelName || ""}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={placeholder}
                  autoComplete="off"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-500' : ''}`} />
                </div>
              </Combobox.Button>

              <Transition
                as={Fragment}
                show={open}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-100"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
                afterLeave={() => setQuery("")}
              >
                <Combobox.Options style={getDropdownStyle()} className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl focus:outline-none">
                  {filteredOptions.length === 0 && query !== "" ? (
                    <div className="rounded-lg bg-slate-50 px-3 py-4 text-center text-sm text-slate-500 italic">
                      No results found for "{query}"
                    </div>
                  ) : (
                    <div className="p-0.5">
                      {filteredOptions.map((opt) => (
                        <Combobox.Option
                          key={opt.id || opt.proficiencyId}
                          value={opt.id || opt.proficiencyId}
                          className={({ active, selected }) =>
                            `relative cursor-pointer select-none rounded-lg py-2 pl-9 pr-4 text-sm transition-all duration-150 mb-0.5 last:mb-0 ${active ? "bg-indigo-50 text-indigo-700 font-semibold" :
                              selected ? "bg-indigo-600 text-white font-semibold shadow-sm" : "text-slate-700"
                            }`
                          }
                        >
                          {({ selected, active }) => (
                            <>
                              <span className="block truncate">{opt.name || opt.levelName}</span>
                              {selected && (
                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-indigo-600' : 'text-white'}`}>
                                  <Check className={`h-4 w-4 stroke-[3px]`} />
                                </span>
                              )}
                            </>
                          )}
                        </Combobox.Option>
                      ))}
                    </div>
                  )}
                </Combobox.Options>
              </Transition>
            </div>
          );
        }}
      </Combobox>
    </div>
  );
};

/* ===================== MODE BUTTON HELPER ===================== */

const modeButtonClass = (isActive) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-indigo-600 text-white shadow-sm"
      : "bg-white text-slate-600 hover:bg-slate-100"
  }`;

/* ===================== MAIN MODAL ===================== */

export default function SkillModal({ employeeId, selectedSkill, onClose, onSaveSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [categories, setCategories] = useState([]);
  const [proficiencies, setProficiencies] = useState([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const [availableSkills, setAvailableSkills] = useState([]);
  const [availableSubSkills, setAvailableSubSkills] = useState([]);

  const [draftSkills, setDraftSkills] = useState([]);
  const [activeSkillId, setActiveSkillId] = useState("");

  const [showAddSkillForm, setShowAddSkillForm] = useState(false);
  const [isNewSkill, setIsNewSkill] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [selectedSkillProficiencyId, setSelectedSkillProficiencyId] = useState("");

  const [showAddSubSkillForm, setShowAddSubSkillForm] = useState(false);
  const [isNewSubSkill, setIsNewSubSkill] = useState(false);
  const [selectedSubSkillId, setSelectedSubSkillId] = useState("");
  const [newSubSkillName, setNewSubSkillName] = useState("");
  const [selectedSubSkillProficiencyId, setSelectedSubSkillProficiencyId] = useState("");

  const isEditMode = Boolean(selectedSkill);

  // Load categories & proficiencies on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [catRes, profRes] = await Promise.all([
          skillService.getCategoryDtos(),
          skillService.getProficiencies()
        ]);

        const categoriesData = Array.isArray(catRes?.data) ? catRes.data : [];
        setCategories(categoriesData.map(cat => ({
          id: String(cat.id),
          name: cat.name,
          description: cat.description || ""
        })));

        const profData = Array.isArray(profRes?.data) ? profRes.data : [];
        setProficiencies(
          profData.map(p => ({
            id: String(p.proficiencyId || p.id || p.proficiencyCode || ""),
            name: p.proficiencyName || p.name || p.levelName || ""
          }))
        );

      } catch (err) {
        console.error("Error fetching initial modal data:", err);
        setError("Failed to load skill data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [employeeId]);

  // Hydrate edit mode
  useEffect(() => {
    if (!selectedSkill || !categories.length || !proficiencies.length) return;

    const catId = String(selectedSkill.categoryId || "");
    setSelectedCategoryId(catId);
    setIsNewCategory(false);

    // Helper to resolve proficiency ID from name (API returns proficiency as name like "ADVANCED")
    const resolveProficiencyId = (profValue) => {
      if (!profValue) return "";
      const profStr = String(profValue);

      // Check if it's already a UUID (has dashes)
      if (profStr.includes("-")) return profStr;

      // Otherwise, it's a name - look up the ID
      const match = proficiencies.find(p =>
        p.name.toUpperCase() === profStr.toUpperCase()
      );
      return match ? match.id : profStr;
    };

    // API already provides all UUIDs, just map the structure and resolve proficiency names to UUIDs
    const mappedSubSkills = (selectedSkill.subSkills || []).map((ss, idx) => {
      const profValue = ss.proficiencyName || ss.proficiency || "";
      return {
        id: ss.subSkillId || ss.id || "",
        name: ss.name || ss.subSkillName || "",
        proficiencyId: resolveProficiencyId(profValue),
        index: idx
      };
    });

    const skillProfValue = selectedSkill.proficiencyName || selectedSkill.proficiency || "";
    const pId = resolveProficiencyId(skillProfValue);

    const skillItem = {
      id: String(selectedSkill.skillId || `draft-skill-${Date.now()}`),
      categoryId: catId,
      skillId: selectedSkill.skillId || "",
      skillName: selectedSkill.skillName || "",
      skillProficiencyId: pId,
      subSkills: mappedSubSkills
    };

    setDraftSkills([skillItem]);
    setActiveSkillId(skillItem.id);
  }, [selectedSkill, categories, proficiencies]);

  // Fetch skills when category changes
  useEffect(() => {
    const fetchSkills = async () => {
      if (isNewCategory || !selectedCategoryId) {
        setAvailableSkills([]);
        return;
      }
      try {
        const res = await skillService.getSkillsByCategoryDto(selectedCategoryId);
        const skillsData = res?.data || [];
        setAvailableSkills(
          (Array.isArray(skillsData) ? skillsData : []).map(skill => ({
            id: String(skill.id),
            name: skill.name,
            subSkills: Array.isArray(skill.subSkills) ? skill.subSkills : []
          }))
        );
      } catch (err) {
        console.error("Error fetching skills by category:", err);
        setError("Failed to load skills for the selected category.");
        setAvailableSkills([]);
      }
    };
    fetchSkills();
  }, [selectedCategoryId, isNewCategory]);

  // Fetch subskills for active skill
  const activeSkill = useMemo(() => {
    return draftSkills.find(item => String(item.id) === String(activeSkillId)) || null;
  }, [draftSkills, activeSkillId]);

  useEffect(() => {
    const fetchSubSkills = async () => {
      if (!activeSkill || !activeSkill.skillId) {
        setAvailableSubSkills([]);
        return;
      }

      try {
        const skill = availableSkills.find(s => String(s.id) === String(activeSkill.skillId));
        const inlineSubs = skill?.subSkills || [];
        const subSkills = inlineSubs.length
          ? inlineSubs
          : (await skillService.getSubSkillsBySkillDto(activeSkill.skillId))?.data || [];

        setAvailableSubSkills(
          subSkills.map(ss => ({
            id: String(ss.id),
            name: ss.name
          }))
        );
      } catch (err) {
        console.error("Error fetching subskills by skill:", err);
        setError("Failed to load related subskills for the selected skill.");
        setAvailableSubSkills([]);
      }
    };

    fetchSubSkills();
  }, [activeSkillId, activeSkill?.skillId, availableSkills]);

  const categoryReady = isNewCategory ? newCategoryName.trim().length > 0 : selectedCategoryId.length > 0;

  const handleAddSkill = () => {
    setError(null);
    const skillName = isNewSkill
      ? newSkillName.trim()
      : availableSkills.find(s => String(s.id) === String(selectedSkillId))?.name || "";

    if (!categoryReady) {
      setError("Please choose or enter a category first.");
      return;
    }
    if (!skillName) {
      setError("Please enter or select a skill.");
      return;
    }
    if (!selectedSkillProficiencyId) {
      setError("Please select a proficiency level for the skill.");
      return;
    }

    const normalize = (s) => (s || "").trim().toLowerCase();
    const isDuplicate = draftSkills.some(item => normalize(item.skillName) === normalize(skillName));
    if (isDuplicate) {
      setError(`Skill "${skillName}" is already added.`);
      return;
    }

    const tempSkillId = isNewSkill ? `draft-skill-${Date.now()}` : selectedSkillId;

    const newSkillItem = {
      id: tempSkillId,
      categoryId: isNewCategory ? null : selectedCategoryId,
      skillId: isNewSkill ? null : selectedSkillId,
      skillName,
      skillProficiencyId: selectedSkillProficiencyId,
      subSkills: []
    };

    setDraftSkills(prev => [...prev, newSkillItem]);
    setActiveSkillId(tempSkillId);

    setSelectedSkillId("");
    setNewSkillName("");
    setSelectedSkillProficiencyId("");
    setShowAddSkillForm(false);
  };

  const handleRemoveSkill = (skillIdToRemove) => {
    setDraftSkills(prev => prev.filter(item => String(item.id) !== String(skillIdToRemove)));
    if (String(activeSkillId) === String(skillIdToRemove)) {
      setActiveSkillId("");
    }
  };

  const handleAddSubSkill = () => {
    setError(null);
    if (!activeSkill) return;

    const subSkillName = isNewSubSkill
      ? newSubSkillName.trim()
      : availableSubSkills.find(s => String(s.id) === String(selectedSubSkillId))?.name || "";

    if (!subSkillName) {
      setError("Please enter or select a subskill.");
      return;
    }
    if (!selectedSubSkillProficiencyId) {
      setError("Please select a proficiency level for the subskill.");
      return;
    }

    const normalize = (s) => (s || "").trim().toLowerCase();
    const isDuplicate = activeSkill.subSkills.some(ss =>
      normalize(ss.name) === normalize(subSkillName)
    );
    if (isDuplicate) {
      setError(`Sub-skill "${subSkillName}" is already added to this skill.`);
      return;
    }

    setDraftSkills(prev => prev.map(item => {
      if (String(item.id) === String(activeSkillId)) {
        const newRow = {
          id: isNewSubSkill ? "" : selectedSubSkillId,
          name: subSkillName,
          proficiencyId: selectedSubSkillProficiencyId,
          index: item.subSkills.length // Add index for new subskill
        };
        return {
          ...item,
          subSkills: [...item.subSkills, newRow]
        };
      }
      return item;
    }));

    setSelectedSubSkillId("");
    setNewSubSkillName("");
    setSelectedSubSkillProficiencyId("");
    setShowAddSubSkillForm(false);
  };

  const handleRemoveSubSkill = (subSkillIndex) => {
    if (!activeSkill) return;

    setDraftSkills(prev => prev.map(item => {
      if (String(item.id) === String(activeSkillId)) {
        return {
          ...item,
          subSkills: item.subSkills.filter((ss, idx) => idx !== subSkillIndex).map((ss, idx) => ({
            ...ss,
            index: idx // Re-index after removal
          }))
        };
      }
      return item;
    }));
  };

  const updateSubSkillProficiency = (subSkillIndex, profId) => {
    if (!activeSkill) return;
    setDraftSkills(prev => prev.map(item => {
      if (String(item.id) === String(activeSkillId)) {
        return {
          ...item,
          subSkills: item.subSkills.map((ss, idx) => {
            if (idx === subSkillIndex) {
              return { ...ss, proficiencyId: profId };
            }
            return ss;
          })
        };
      }
      return item;
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isEditMode) {
        if (!activeSkill) throw new Error("No active skill to update.");

        const catName =
          selectedSkill?.categoryName ||
          categories.find(c => c.id === activeSkill.categoryId)?.name ||
          "";

        const payload = {
          resourceId: String(employeeId),
          skills: [
            {
              categoryId: activeSkill.categoryId || selectedSkill?.categoryId || null,
              categoryName: catName,
              categoryActive: true,
              skillId: activeSkill.skillId || null,
              skillName: activeSkill.skillName,
              proficiencyId: activeSkill.skillProficiencyId,
              status: "ACTIVE",
              subSkills: activeSkill.subSkills.map(ss => ({
                subSkillId: ss.id || null,
                subSkillName: ss.name,
                proficiencyId: ss.proficiencyId,
                status: "ACTIVE",
              })),
            },
          ],
        };

        await skillService.saveEmployeeSkills(payload);

        const newSubCount = activeSkill.subSkills.filter(ss => !ss.id).length;
        if (newSubCount > 0) {
          showStatusToast(`Skill updated. ${newSubCount} new subskill(s) sent for admin approval`, "success");
        } else {
          showStatusToast("Skill mastery updated successfully", "success");
        }
      } else {
        const catName = isNewCategory
          ? newCategoryName.trim()
          : categories.find(c => c.id === selectedCategoryId)?.name || "";

        const payload = {
          resourceId: String(employeeId),
          skills: draftSkills.map(item => ({
            categoryId: item.categoryId || null,
            categoryName: catName,
            categoryActive: true,
            skillId: item.skillId || null,
            skillName: item.skillName,
            proficiencyId: item.skillProficiencyId,
            status: "ACTIVE",
            subSkills: item.subSkills.map(ss => ({
              subSkillId: ss.id || null,
              subSkillName: ss.name,
              proficiencyId: ss.proficiencyId,
              status: "ACTIVE",
            })),
          })),
        };

        await skillService.saveEmployeeSkills(payload);

        const newSkillCount = draftSkills.filter(s => !s.skillId).length;
        const newSubSkillCount = draftSkills.reduce((acc, s) => acc + s.subSkills.filter(ss => !ss.id).length, 0);
        const pendingCount = newSkillCount + newSubSkillCount;
        const mappedCount = draftSkills.filter(s => s.skillId).length;

        if (pendingCount > 0 && mappedCount > 0) {
          showStatusToast(`${mappedCount} skill(s) mapped, ${pendingCount} item(s) sent for admin approval`, "success");
        } else if (pendingCount > 0) {
          showStatusToast(`${pendingCount} item(s) sent for admin approval`, "success");
        } else {
          showStatusToast("Skills saved to profile successfully", "success");
        }
      }

      setDraftSkills([]);
      setActiveSkillId("");
      setSelectedCategoryId("");
      await onSaveSuccess?.();
      onClose?.();
    } catch (err) {
      showStatusToast(err.response?.data?.message || err.message || "Failed to save skills", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-sm">
      <div className="flex h-[88vh] w-[80vw] min-w-[320px] max-w-[1280px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-100 p-2.5 text-indigo-700">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {isEditMode ? "Edit Skill Mastery" : "Manage Skillset"}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {isEditMode ? "Refine your professional record" : "Employee Profile Configuration"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body grid */}
        <div className="min-h-0 flex-1 overflow-y-auto bg-gray-50/30 p-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">

            {/* LEFT Column */}
            <div className="space-y-6">

              {/* 1. CHOOSE CATEGORY */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">1. Choose Category</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {isEditMode ? "Skill category classification" : "Select existing or create new category"}
                    </p>
                  </div>
                  {!isEditMode && (
                    <div className="inline-flex rounded-xl bg-slate-100 p-1">
                      <button
                        type="button"
                        onClick={() => { setIsNewCategory(false); setNewCategoryName(""); }}
                        className={modeButtonClass(!isNewCategory)}
                      >
                        Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsNewCategory(true); setSelectedCategoryId(""); }}
                        className={modeButtonClass(isNewCategory)}
                      >
                        New
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  {isEditMode ? (
                    <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">
                      {selectedSkill?.categoryName || "General"}
                    </div>
                  ) : isNewCategory ? (
                    <div className="space-y-1.5">
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Category Name *</label>
                      <input
                        type="text"
                        placeholder="Enter new category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium placeholder:text-gray-300"
                      />
                    </div>
                  ) : (
                    <SearchableSelect
                      label="Category"
                      placeholder="Search category (e.g. Backend, Frontend)"
                      value={selectedCategoryId}
                      options={categories}
                      onChange={(val) => {
                        setSelectedCategoryId(val);
                        setActiveSkillId("");
                      }}
                      icon={Briefcase}
                    />
                  )}
                </div>
              </div>

              {/* 2. ADD SKILLS */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">2. Add Skills</p>
                    <p className="mt-1 text-xs text-slate-500">Configure skills and subskills</p>
                  </div>
                  {!isEditMode && (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm border border-slate-100">
                      {draftSkills.length} staged
                    </span>
                  )}
                </div>

                {/* Skill pills */}
                {!isEditMode && draftSkills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {draftSkills.map((skill) => {
                      const isActive = String(skill.id) === String(activeSkillId);
                      const isPending = !skill.skillId;
                      return (
                        <button
                          key={skill.id}
                          type="button"
                          onClick={() => setActiveSkillId(skill.id)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                            isActive
                              ? isPending
                                ? "border-amber-300 bg-amber-50 text-amber-700 shadow-sm"
                                : "border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <span>{skill.skillName}</span>
                          {isPending && (
                            <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 leading-none">
                              NEW
                            </span>
                          )}
                          <span
                            role="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSkill(skill.id);
                            }}
                            className="rounded-full p-0.5 hover:bg-rose-100 hover:text-rose-700 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Active Skill Card */}
                {activeSkill && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Skill Details</label>
                        <h4 className="text-sm font-semibold text-slate-800">{activeSkill.skillName}</h4>
                      </div>
                      {!isEditMode && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(activeSkill.id)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Remove Skill"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      {/* Skill Proficiency */}
                      <div className="w-1/2">
                        <SearchableSelect
                          label="Skill Proficiency *"
                          placeholder="Choose level"
                          value={activeSkill.skillProficiencyId}
                          options={proficiencies}
                          onChange={(val) => {
                            setDraftSkills(prev => prev.map(item => {
                              if (String(item.id) === String(activeSkillId)) {
                                return { ...item, skillProficiencyId: val };
                              }
                              return item;
                            }));
                          }}
                          icon={Check}
                        />
                      </div>

                      {/* Subskills */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <label className="block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Subskills Configuration</label>
                          {!showAddSubSkillForm && (
                            <button
                              type="button"
                              onClick={() => setShowAddSubSkillForm(true)}
                              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50"
                            >
                              <Plus size={12} />
                              Add Subskill
                            </button>
                          )}
                        </div>

                        {/* Subskill list */}
                        {activeSkill.subSkills.length > 0 ? (
                          <div className="space-y-2">
                            {activeSkill.subSkills.map((ss, idx) => {
                              const profObj = proficiencies.find(p => String(p.id) === String(ss.proficiencyId));
                              return (
                                <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium text-slate-700">{ss.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <SearchableSelect
                                      placeholder="Level"
                                      value={ss.proficiencyId}
                                      options={proficiencies}
                                      onChange={(val) => updateSubSkillProficiency(idx, val)}
                                      icon={Check}
                                    />
                                    <button
                                      onClick={() => handleRemoveSubSkill(idx)}
                                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-400">
                            No subskills configured.
                          </div>
                        )}

                        {/* Add Subskill Form */}
                        {showAddSubSkillForm && (
                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3.5">
                            <div className="flex justify-between items-center">
                              <h5 className="text-xs font-semibold text-slate-900">Add Sub-skill</h5>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddSubSkillForm(false);
                                  setSelectedSubSkillId("");
                                  setNewSubSkillName("");
                                  setSelectedSubSkillProficiencyId("");
                                }}
                                className="text-slate-400 hover:text-slate-600 p-0.5"
                              >
                                <X size={14} />
                              </button>
                            </div>

                            <div className="inline-flex rounded-xl bg-slate-100 p-1">
                              <button
                                type="button"
                                onClick={() => { setIsNewSubSkill(false); setNewSubSkillName(""); }}
                                className={modeButtonClass(!isNewSubSkill)}
                              >
                                Existing
                              </button>
                              <button
                                type="button"
                                onClick={() => { setIsNewSubSkill(true); setSelectedSubSkillId(""); }}
                                className={modeButtonClass(isNewSubSkill)}
                              >
                                New
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {isNewSubSkill ? (
                                <div className="space-y-1.5">
                                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Sub-skill Name *</label>
                                  <input
                                    type="text"
                                    placeholder="Enter new sub-skill"
                                    value={newSubSkillName}
                                    onChange={(e) => setNewSubSkillName(e.target.value)}
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium placeholder:text-gray-300"
                                  />
                                </div>
                              ) : (
                                <SearchableSelect
                                  label="Sub-skill"
                                  placeholder="Choose sub-skill"
                                  value={selectedSubSkillId}
                                  options={availableSubSkills.filter(opt => !activeSkill.subSkills.some(ss => String(ss.id) === String(opt.id)))}
                                  onChange={setSelectedSubSkillId}
                                  icon={List}
                                />
                              )}

                              <SearchableSelect
                                label="Proficiency *"
                                placeholder="Choose level"
                                value={selectedSubSkillProficiencyId}
                                options={proficiencies}
                                onChange={setSelectedSubSkillProficiencyId}
                                icon={Check}
                              />
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleAddSubSkill}
                                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
                              >
                                Add Subskill
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Add Skill Form */}
                {!isEditMode && (
                  <div className="mt-4 border-t border-slate-200 pt-4">
                    {!showAddSkillForm ? (
                      <button
                        type="button"
                        onClick={() => setShowAddSkillForm(true)}
                        disabled={!categoryReady}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Skill
                      </button>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-semibold text-slate-850">Add Skill</p>
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddSkillForm(false);
                              setSelectedSkillId("");
                              setNewSkillName("");
                              setSelectedSkillProficiencyId("");
                            }}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="inline-flex rounded-xl bg-slate-100 p-1">
                          <button
                            type="button"
                            onClick={() => { setIsNewSkill(false); setNewSkillName(""); }}
                            className={modeButtonClass(!isNewSkill)}
                          >
                            Existing
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIsNewSkill(true); setSelectedSkillId(""); }}
                            className={modeButtonClass(isNewSkill)}
                          >
                            New
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {isNewSkill ? (
                            <div className="space-y-1.5">
                              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Skill Name *</label>
                              <input
                                type="text"
                                placeholder="Enter skill name"
                                value={newSkillName}
                                onChange={(e) => setNewSkillName(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-medium placeholder:text-gray-300"
                              />
                            </div>
                          ) : (
                            <SearchableSelect
                              label="Core Skill"
                              placeholder="Select core skill"
                              value={selectedSkillId}
                              options={availableSkills.filter(opt => !draftSkills.some(s => String(s.skillId) === String(opt.id)))}
                              onChange={setSelectedSkillId}
                              icon={Plus}
                            />
                          )}

                          <SearchableSelect
                            label="Skill Proficiency *"
                            placeholder="Choose level"
                            value={selectedSkillProficiencyId}
                            options={proficiencies}
                            onChange={setSelectedSkillProficiencyId}
                            icon={Check}
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={handleAddSkill}
                            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                          >
                            Add Skill
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-rose-50 p-4 rounded-xl flex items-center gap-3 text-rose-600 border border-rose-100">
                  <AlertCircle size={18} className="shrink-0" />
                  <span className="text-xs font-bold">{error}</span>
                </div>
              )}
            </div>

            {/* RIGHT Column (Draft Preview) */}
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  {isEditMode ? "Selected Skill Summary" : "Draft Summary"}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {isEditMode ? "Review mapped proficiency level and subskills" : "Live summary of drafted skills"}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {draftSkills.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-sm text-slate-400 py-12">
                    No skills drafted yet
                  </div>
                ) : (
                  draftSkills.map((skill, idx) => {
                    const isNewSkillEntry = !skill.skillId;
                    return (
                      <div key={idx} className={`rounded-xl border p-3 space-y-2 ${isNewSkillEntry ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-slate-50"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-slate-800">{skill.skillName}</span>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold bg-indigo-100 text-indigo-700">
                                {proficiencies.find(p => String(p.id) === String(skill.skillProficiencyId))?.name || "Not Set"}
                              </span>
                              {isNewSkillEntry && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                                  ⏳ Pending approval
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {skill.subSkills.length > 0 ? (
                          <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
                            {skill.subSkills.map((ss, ssIdx) => {
                              const isNewSub = !ss.id;
                              return (
                                <div key={ssIdx} className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${isNewSub ? "bg-amber-50 border border-amber-100" : "bg-white"}`}>
                                  <span className="text-xs font-medium text-slate-700">{ss.name}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600">
                                      {proficiencies.find(p => String(p.id) === String(ss.proficiencyId))?.name || ""}
                                    </span>
                                    {isNewSub && (
                                      <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                        ⏳ Pending
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-slate-400 italic">No subskills added.</p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-3.5">
          <div className="flex items-center justify-end gap-2">
            <button
              disabled={saving}
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              disabled={saving || draftSkills.length === 0}
              onClick={handleSave}
              className="inline-flex min-w-[92px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
