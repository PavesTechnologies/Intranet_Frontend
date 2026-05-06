import React, { useState, useEffect, Fragment } from "react";
import { X, Plus, Trash2, Edit2, ChevronDown, Search, Check, Loader2, AlertCircle } from "lucide-react";
import { Combobox, Transition } from "@headlessui/react";
import { skillService } from "../../../services/skillService";
import { showStatusToast } from "../../../components/toastfy/toast";


import { Briefcase, List } from "lucide-react";
/* ===================== SEARCHABLE SELECT COMPONENT ===================== */

const SearchableSelect = ({ label, value, onChange, options, placeholder, disabled, icon: Icon = Search }) => {
  const [query, setQuery] = useState("");

  const filteredOptions = query === ""
    ? options
    : options.filter((opt) =>
      (opt.name || opt.levelName || "").toLowerCase().includes(query.toLowerCase())
    );

  const selectedOption = options.find((opt) => String(opt.id || opt.proficiencyId) === String(value));

  return (
    <div className="w-full">
      {label && <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>}
      <Combobox
        value={value}
        onChange={(val) => {
          onChange(val);
          setQuery("");
        }}
        disabled={disabled}
      >
        {({ open }) => (
          <div className="relative">
            <Combobox.Button as="div" className={`relative w-full cursor-pointer overflow-hidden rounded-xl bg-white text-left border border-gray-200 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all duration-300 shadow-sm sm:text-sm ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}>
              <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Icon className={`h-4 w-4 ${open ? 'text-indigo-500' : 'text-gray-400'} transition-colors duration-200`} />
              </div>
              <Combobox.Input
                className="w-full border-none py-3 pl-10 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 outline-none disabled:bg-transparent bg-transparent placeholder:text-gray-400 font-medium"
                displayValue={() => selectedOption?.name || selectedOption?.levelName || ""}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                autoComplete="off"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-500' : ''}`} />
              </div>
            </Combobox.Button>

            <Transition
              as={Fragment}
              show={open}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-1 scale-95"
              afterLeave={() => setQuery("")}
            >
              <Combobox.Options
                static
                className="absolute z-[100] mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1.5 text-base shadow-2xl ring-1 ring-black/5 focus:outline-none sm:text-sm border border-gray-100"
              >
                {filteredOptions.length === 0 && query !== "" ? (
                  <div className="relative cursor-default select-none py-4 px-4 text-gray-500 italic text-center text-sm bg-gray-50 m-2 rounded-lg">
                    No results found for "{query}"
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredOptions.map((opt) => (
                      <Combobox.Option
                        key={opt.id || opt.proficiencyId}
                        value={opt.id || opt.proficiencyId}
                        className={({ active, selected }) =>
                          `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-all duration-150 rounded-lg mb-0.5 last:mb-0 ${active ? "bg-indigo-50 text-indigo-700 font-semibold" :
                            selected ? "bg-indigo-600 text-white font-semibold shadow-md z-10" : "text-gray-700 hover:bg-gray-50"
                          }`
                        }
                      >
                        {({ selected, active }) => (
                          <>
                            <span className="block">{opt.name || opt.levelName}</span>
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
        )}
      </Combobox>
    </div>
  );
};

const SearchableMultiSelect = ({ label, value = [], onChange, options, placeholder, disabled, icon: Icon = Search }) => {
  const [query, setQuery] = useState("");

  const filteredOptions = query === ""
    ? options
    : options.filter((opt) => opt.name.toLowerCase().includes(query.toLowerCase()));

  const selectedOptions = options.filter(opt => value.includes(String(opt.id)));

  const handleSelect = (val) => {
    const strVal = String(val);
    if (!value.includes(strVal)) {
      onChange([...value, strVal]);
    }
    setQuery("");
  };

  const removeOption = (idToRemove) => {
    onChange(value.filter(id => id !== String(idToRemove)));
  };

  return (
    <div className="w-full">
      {label && <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>}
      <Combobox value="" onChange={handleSelect} disabled={disabled}>
        {({ open }) => (
          <div className="relative">
            <Combobox.Button as="div" className={`relative w-full overflow-hidden rounded-xl bg-white text-left border border-gray-200 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all duration-300 shadow-sm sm:text-sm ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}>

              <div className="flex flex-wrap items-center gap-1.5 p-1.5 min-h-[46px] pl-10">
                <div className="absolute top-[13px] left-3.5 flex items-center pointer-events-none">
                  <Icon className={`h-4 w-4 ${open ? 'text-indigo-500' : 'text-gray-400'} transition-colors duration-200`} />
                </div>

                {selectedOptions.map(opt => (
                  <span key={opt.id} className="inline-flex items-center gap-1.5 whitespace-nowrap bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-lg border border-indigo-100 shadow-sm transition-all hover:bg-indigo-100 animate-in zoom-in-95 duration-200">
                    {opt.name}
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeOption(opt.id); }}
                      className="text-indigo-400 hover:text-indigo-700 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}

                <Combobox.Input
                  className="flex-1 w-full min-w-[120px] border-none py-1.5 text-sm text-gray-900 focus:ring-0 outline-none disabled:bg-transparent bg-transparent placeholder:text-gray-400 font-medium"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={selectedOptions.length === 0 ? placeholder : ""}
                  autoComplete="off"
                />
              </div>

              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-500' : ''}`} />
              </div>
            </Combobox.Button>

            <Transition
              as={Fragment}
              show={open}
              enter="transition ease-out duration-200"
              enterFrom="opacity-0 translate-y-1 scale-95"
              enterTo="opacity-100 translate-y-0 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0 scale-100"
              leaveTo="opacity-0 translate-y-1 scale-95"
              afterLeave={() => setQuery("")}
            >
              <Combobox.Options static className="absolute z-[100] mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1.5 text-base shadow-2xl ring-1 ring-black/5 focus:outline-none sm:text-sm border border-gray-100">
                {filteredOptions.length === 0 && query !== "" ? (
                  <div className="relative py-4 px-4 text-gray-500 italic text-center text-sm bg-gray-50 m-2 rounded-lg">No results found for "{query}"</div>
                ) : (
                  <div className="p-1">
                    {filteredOptions.map((opt) => {
                      const isSelected = value.includes(String(opt.id));
                      if (isSelected) return null;
                      return (
                        <Combobox.Option
                          key={opt.id}
                          value={opt.id}
                          className={({ active }) => `relative cursor-pointer select-none py-2.5 pl-4 pr-4 transition-all duration-150 rounded-lg mb-0.5 last:mb-0 ${active ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}
                        >
                          <span className="block">{opt.name}</span>
                        </Combobox.Option>
                      );
                    })}
                  </div>
                )}
              </Combobox.Options>
            </Transition>
          </div>
        )}
      </Combobox>
    </div>
  );
};

/* ===================== MAIN MODAL ===================== */

export default function SkillModal({ employeeId, selectedSkill, onClose, onSaveSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [tree, setTree] = useState([]);
  const [proficiencies, setProficiencies] = useState([]);

  const [availableSkills, setAvailableSkills] = useState([]);
  const [availableSubSkills, setAvailableSubSkills] = useState([]);
  const [isHydrating, setIsHydrating] = useState(false);

  const [draftSkills, setDraftSkills] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  const [formState, setFormState] = useState({
    categoryId: "",
    skillId: "",
    skillProficiencyId: "",
    otherSkillName: "",
    subSkills: []
  });

 
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, profRes] = await Promise.all([
          skillService.getSkillTree(),
          skillService.getProficiencies()
        ]);

        // 1. Map Categories
        const categories = catRes?.data || [];
        setTree(categories);

        // 2. Map Proficiencies
        const profData = profRes?.data || [];
        setProficiencies(
          profData.map(p => ({
            id: String(p.proficiencyId),
            name: p.proficiencyName
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

  useEffect(() => {
    if (!selectedSkill || !tree.length || !proficiencies.length) return;

    setIsHydrating(true);

    setFormState({
      categoryId: String(selectedSkill.categoryId || ""),
      skillId: String(selectedSkill.skillId || ""),
      skillProficiencyId: String(selectedSkill.skillProficiencyId || ""),
      subSkills: (selectedSkill.subSkills || []).map(ss => ({
        subSkillId: String(ss.id),
        proficiencyId: String(ss.proficiencyId || "")
      }))
    });

    setTimeout(() => setIsHydrating(false), 500);


  }, [selectedSkill, tree, proficiencies]);
  useEffect(() => {
    const fetchSkills = async () => {
      if (!formState.categoryId) {
        setAvailableSkills([]);
        return;
      }
      try {
        const res = await skillService.getSkillsByCategory(formState.categoryId);
        const skillsData = res?.data || res || [];
        const mappedSkills = Array.isArray(skillsData) ? skillsData : [];
        // Append "Other" option
        setAvailableSkills([...mappedSkills, { id: "OTHER", name: "Other", subSkills: [] }]);

        // Clear skill if it's not in the new list (ONLY if not hydrating and list is not empty)
        if (!isHydrating && mappedSkills.length > 0 && !mappedSkills.find(s => String(s.id) === String(formState.skillId)) && formState.skillId !== "OTHER") {
          setFormState(prev => ({ ...prev, skillId: "", skillProficiencyId: "", subSkills: [] }));
        }
      } catch (err) {
        console.error("Error fetching skills by category:", err);
      }
    };
    fetchSkills();
  }, [formState.categoryId]);

  useEffect(() => {
    const skill = availableSkills.find(s => String(s.id) === String(formState.skillId));
    const rawSubs = skill?.subSkills || skill?.sub_skills || [];
    setAvailableSubSkills([...rawSubs, { id: "OTHER", name: "Other" }]);

    // ✅ ONLY RESET WHEN USER CHANGES (NOT PREFILL)
    if (!isHydrating && formState.skillId && editingIndex === null) {
      setFormState(prev => ({ ...prev, subSkills: [] }));
    }
  }, [formState.skillId, availableSkills, isHydrating]);

  const addSubSkillRow = () => {
    setFormState(prev => ({
      ...prev,
      subSkills: [...prev.subSkills, { subSkillId: "", otherSubSkillName: "", proficiencyId: "" }]
    }));
  };

  const removeSubSkillRow = (index) => {
    setFormState(prev => ({
      ...prev,
      subSkills: prev.subSkills.filter((_, i) => i !== index)
    }));
  };

  const updateSubSkillRow = (index, field, value) => {
    setFormState(prev => ({
      ...prev,
      subSkills: prev.subSkills.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    }));
  };

  const handleAddToDraft = () => {
    setError(null);
    if (!formState.categoryId || !formState.skillId || !formState.skillProficiencyId) {
      setError("Please fill all required fields marked with *");
      return;
    }

    const categoryObj = tree.find(c => String(c.id) === String(formState.categoryId));
    const skillObj = availableSkills.find(s => String(s.id) === String(formState.skillId));
    const profObj = proficiencies.find(p => String(p.id) === String(formState.skillProficiencyId));

    // Filter out incomplete rows and map names
    const subSkillNamesList = formState.subSkills
      .filter(ss => (ss.subSkillId && ss.proficiencyId))
      .map(ss => {
        const found = availableSubSkills.find(s => String(s.id) === String(ss.subSkillId));
        const isOther = ss.subSkillId === "OTHER";
        return {
          id: isOther ? null : ss.subSkillId,
          name: isOther ? ss.otherSubSkillName : (found?.name || ""),
          isCustom: isOther
        };
      });

    const isOtherSkill = formState.skillId === "OTHER";
    const newDraftItem = {
      ...formState,
      categoryName: categoryObj?.name || "",
      skillName: isOtherSkill ? formState.otherSkillName : (skillObj?.name || ""),
      skillId: isOtherSkill ? null : formState.skillId,
      isCustomSkill: isOtherSkill,
      proficiencyName: profObj?.name || "",
      subSkillNames: subSkillNamesList
    };

    if (editingIndex !== null) {
      setDraftSkills(prev => prev.map((item, i) => i === editingIndex ? newDraftItem : item));
      setEditingIndex(null);
    } else {
      setDraftSkills(prev => [...prev, newDraftItem]);
    }

    setFormState({
      categoryId: "",
      skillId: "",
      skillProficiencyId: "",
      subSkills: []
    });
  };

  const handleEditDraft = (index) => {
    setIsHydrating(true);
    const item = draftSkills[index];
    setFormState({
      categoryId: item.categoryId,
      skillId: item.skillId || "OTHER",
      skillProficiencyId: item.skillProficiencyId,
      otherSkillName: item.isCustomSkill ? item.skillName : "",
      subSkills: item.subSkills || []
    });
    setEditingIndex(index);
    // Release the hydration lock after state has been set
    setTimeout(() => setIsHydrating(false), 500);
  };

  const handleRemoveFromDraft = (index) => {
    setDraftSkills(prev => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        resourceId: Number(employeeId),
        skills: draftSkills.map(item => ({
          skillId: item.skillId === "OTHER" ? null : item.skillId,
          skillName: item.skillId === "OTHER" ? item.skillName : null,
          proficiencyId: item.skillProficiencyId,
          subSkills: (item.subSkillNames || []).map((ss, idx) => ({
            subSkillId: ss.id === "OTHER" || !ss.id ? null : ss.id,
            subSkillName: ss.isCustom ? ss.name : null,
            proficiencyId: item.subSkills[idx]?.proficiencyId
          }))
        }))
      };
      console.log("Saving Skill Payload:", JSON.stringify(payload, null, 2));
      await skillService.saveBulkSkills(payload);
      showStatusToast("Skills saved to profile successfully", "success");
      onSaveSuccess();
    } catch (err) {
      showStatusToast(err.message || "Failed to save skills", "error");
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-xl flex flex-col border border-gray-100">
        {/* Header */}
        <div className="flex justify-between items-center px-10 py-7 border-b border-gray-100 bg-white/50 sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Manage Skillset</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Employee Profile Configuration</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-2xl transition-all duration-300 group"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden flex-1">

          {/* LEFT: FORM */}
          <div className="lg:col-span-6 p-10 overflow-y-auto border-r border-gray-100 space-y-8 bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Skill Configuration</h3>
            </div>

            <div className="space-y-6">
              <SearchableSelect
                label="Category *"
                placeholder="Search category (e.g. Backend, Frontend)"
                value={formState.categoryId}
                options={tree}
                onChange={(val) => setFormState(p => ({ ...p, categoryId: val }))}
                icon={Briefcase}
              />

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <SearchableSelect
                    label="Skill *"
                    placeholder="Select core skill"
                    value={formState.skillId}
                    options={availableSkills}
                    disabled={!formState.categoryId}
                    onChange={(val) => setFormState(p => ({ ...p, skillId: val }))}
                    icon={Plus}
                  />
                  {formState.skillId === "OTHER" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-[10px] font-bold text-indigo-500 mb-1.5 uppercase tracking-wider ml-1">Other Skill Name *</label>
                      <input
                        type="text"
                        placeholder="Enter custom skill name"
                        value={formState.otherSkillName}
                        onChange={(e) => setFormState(p => ({ ...p, otherSkillName: e.target.value }))}
                        className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-gray-300"
                      />
                    </div>
                  )}
                </div>

                <SearchableSelect
                  label="Skill Proficiency *"
                  value={formState.skillProficiencyId}
                  options={proficiencies}
                  disabled={!formState.skillId || (formState.skillId === "OTHER" && !formState.otherSkillName)}
                  onChange={(val) =>
                    setFormState(p => ({ ...p, skillProficiencyId: val }))
                  }
                  icon={Check}
                />
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Sub Skills Configuration
                  </label>
                  <button
                    type="button"
                    onClick={addSubSkillRow}
                    disabled={!formState.skillId}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={14} />
                    Add Sub-skill
                  </button>
                </div>

                {formState.subSkills.length === 0 ? (
                  <div className="py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <List size={24} className="opacity-20" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Sub-skills added yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formState.subSkills.map((row, index) => {
                      // Filter options to exclude already selected sub-skills (except current row)
                      const selectedIds = formState.subSkills.map(s => String(s.subSkillId)).filter(id => id !== "" && id !== "OTHER");
                      const rawFiltered = availableSubSkills.filter(opt =>
                        !selectedIds.includes(String(opt.id)) || String(opt.id) === String(row.subSkillId)
                      );

                      return (
                        <div key={index} className="space-y-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="grid grid-cols-12 gap-4 items-end">
                            <div className="col-span-5">
                              <SearchableSelect
                                label="Select Sub-skill"
                                placeholder="Choose sub-skill"
                                options={rawFiltered}
                                value={row.subSkillId}
                                onChange={(val) => updateSubSkillRow(index, "subSkillId", val)}
                                icon={List}
                              />
                            </div>
                            <div className="col-span-5">
                              <SearchableSelect
                                label="Proficiency"
                                placeholder="Select level"
                                options={proficiencies}
                                value={row.proficiencyId}
                                disabled={!row.subSkillId || (row.subSkillId === "OTHER" && !row.otherSubSkillName)}
                                onChange={(val) => updateSubSkillRow(index, "proficiencyId", val)}
                                icon={Check}
                              />
                            </div>
                            <div className="col-span-2 pb-1 text-right">
                              <button
                                onClick={() => removeSubSkillRow(index)}
                                className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all duration-200"
                                title="Remove sub-skill"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>

                          {row.subSkillId === "OTHER" && (
                            <div className="animate-in fade-in slide-in-from-left-2 duration-300 pl-2 border-l-2 border-indigo-200 ml-1">
                              <label className="block text-[10px] font-bold text-indigo-500 mb-1 uppercase tracking-wider">Other Sub-skill Name *</label>
                              <input
                                type="text"
                                placeholder="Enter custom sub-skill name"
                                value={row.otherSubSkillName}
                                onChange={(e) => updateSubSkillRow(index, "otherSubSkillName", e.target.value)}
                                className="w-full bg-white border border-indigo-100 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-400/5 transition-all font-medium"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 ...">
                <AlertCircle size={18} className="shrink-0" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            <button
              onClick={handleAddToDraft}
              className={`w-full py-4 rounded-2xl text-sm font-black tracking-wide transition-all duration-300 flex justify-center items-center gap-3 shadow-[0_12px_24px_-8px_rgba(79,70,229,0.3)]
                ${editingIndex !== null
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98]"}`}
            >
              {editingIndex !== null ? <><Edit2 size={18} /> Update Item in Draft</> : <><Plus size={18} /> Add Skill to Draft</>}
            </button>
          </div>

          {/* RIGHT: DRAFT PREVIEW */}
          <div className="lg:col-span-6 p-10 bg-gray-50/70 overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-8 h-fit">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Skillset Draft Preview</h3>
              </div>
              <span className="bg-indigo-600 text-white py-1 px-3 rounded-full text-[10px] font-black tracking-widest uppercase shadow-lg shadow-indigo-200">
                {draftSkills.length} SKILLS
              </span>
            </div>

            <div className="space-y-4 flex-1">
              {draftSkills.length === 0 ? (
                <div className="h-full ...">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 border border-gray-100">
                    <Plus className="text-gray-300 w-8 h-8" />
                  </div>
                  <p className="text-gray-400 text-sm font-bold tracking-wide">No skills mapped yet</p>
                  <p className="text-xs text-gray-300 mt-1 max-w-[200px]">Configure a skill on the left to start building your draft.</p>
                </div>
              ) : (
                draftSkills.map((skill, idx) => (
                  <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-xl transition-all duration-300 group relative ">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest">{skill.categoryName}</span>
                          <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                          <span className="text-[10px] font-bold text-gray-400">{skill.experienceYears} Yrs</span>
                        </div>
                        <h4 className="text-lg font-black text-gray-900 leading-none">{skill.skillName}</h4>

                        {skill.subSkillNames.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {skill.subSkillNames.map(ss => (
                              <span key={ss.id} className="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-gray-100">
                                {ss.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditDraft(idx)}
                          className="p-2.5 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-300"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleRemoveFromDraft(idx)}
                          className="p-2.5 bg-gray-50 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                        <Check size={14} className="text-emerald-500 stroke-[3px]" />
                        <span className="text-[11px] font-black text-gray-600 tracking-wide uppercase">{skill.proficiencyName}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-10 py-6 border-t border-gray-100 bg-white flex justify-end items-center gap-4">
          <button
            disabled={saving}
            onClick={onClose}
            className="px-8 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl text-sm font-black hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            disabled={saving || draftSkills.length === 0}
            onClick={handleSave}
            className={`px-10 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black tracking-wide shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 flex items-center gap-3 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none
              ${saving || draftSkills.length === 0 ? "grayscale cursor-not-allowed" : ""}`}
          >
            {saving ? <><Loader2 size={18} className="animate-spin" /> Saving Changes...</> : "Finalize & Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
