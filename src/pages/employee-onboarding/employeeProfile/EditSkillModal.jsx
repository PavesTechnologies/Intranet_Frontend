import React, { useState, useEffect, Fragment } from "react";
import { X, Plus, Trash2, Edit2, ChevronDown, Check, Loader2, AlertCircle, Briefcase, List, Search } from "lucide-react";
import { Combobox, Transition } from "@headlessui/react";
import { skillService } from "../../../services/skillService";
import { showStatusToast } from "../../../components/toastfy/toast";

const SearchableSelect = ({ label, value, options, onChange, placeholder, disabled, icon: Icon = Search }) => {
  const [query, setQuery] = useState("");

  const filteredOptions = query === ""
    ? options
    : options.filter((opt) =>
      (opt.name || "").toLowerCase().includes(query.toLowerCase())
    );

  const selectedOption = options.find((opt) => String(opt.id) === String(value));

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
                displayValue={() => selectedOption?.name || ""}
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
              <Combobox.Options static className="absolute z-[100] mt-2 max-h-60 w-full overflow-auto rounded-xl bg-white py-1.5 text-base shadow-2xl ring-1 ring-black/5 focus:outline-none sm:text-sm border border-gray-100">
                {filteredOptions.length === 0 && query !== "" ? (
                  <div className="relative cursor-default select-none py-4 px-4 text-gray-500 italic text-center text-sm bg-gray-50 m-2 rounded-lg">No results found for "{query}"</div>
                ) : (
                  <div className="p-1">
                    {filteredOptions.map((opt) => (
                      <Combobox.Option
                        key={opt.id}
                        value={opt.id}
                        className={({ active, selected }) =>
                          `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-all duration-150 rounded-lg mb-0.5 last:mb-0 ${active ? "bg-indigo-50 text-indigo-700 font-semibold" :
                            selected ? "bg-indigo-600 text-white font-semibold shadow-md z-10" : "text-gray-700 hover:bg-gray-50"
                          }`
                        }
                      >
                        {({ selected, active }) => (
                          <>
                            <span className="block">{opt.name}</span>
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

export default function EditSkillModal({ employeeId, skillData, onClose, onSaveSuccess }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [tree, setTree] = useState([]);
  const [proficiencies, setProficiencies] = useState([]);
  const [availableSkills, setAvailableSkills] = useState([]);
  const [availableSubSkills, setAvailableSubSkills] = useState([]);
  const [isHydrating, setIsHydrating] = useState(true);

  // Refs to track initial hydrated values and prevent manual change effects from wiping data
  const hydratedCatId = React.useRef("");
  const hydratedSkillId = React.useRef("");

  const [formState, setFormState] = useState({
    categoryId: "",
    skillId: "",
    skillProficiencyId: "",
    otherSkillName: "",
    subSkills: []
  });

  // 1. Initial Data Fetch (Categories & Proficiencies)
  useEffect(() => {
    const initModal = async () => {
      try {
        const [catRes, profRes] = await Promise.all([
          skillService.getSkillTree(),
          skillService.getProficiencies()
        ]);

        const categories = (catRes?.data || catRes || []).map(c => ({
          id: String(c.id || c.categoryId || ""),
          name: c.name || c.categoryName || ""
        }));
        setTree(categories);

        const profLevels = (profRes?.data || profRes || []).map(p => ({
          id: String(p.proficiencyId || p.id || p.proficiencyCode || ""),
          name: p.proficiencyName || p.name || p.levelName || "",
          code: String(p.proficiencyCode || p.proficiencyId || "")
        }));
        setProficiencies(profLevels);

      } catch (err) {
        console.error("EditSkillModal init error:", err);
        setError("Failed to load skill data.");
      } finally {
        setLoading(false);
      }
    };
    initModal();
  }, []);

  useEffect(() => {
    // ✅ Hydrate Logic (Refined)
    if (!tree.length || !skillData) return;

    console.log("🔥 Hydrating with skillData:", skillData);
    setIsHydrating(true);

    let catId = String(skillData.categoryId || skillData.skill?.category?.id || "");
    const sId = String(skillData.skillId || skillData.skill?.id || "");
    const pId = String(skillData.skillProficiencyId || skillData.proficiencyId || skillData.skillProficiencyCode || skillData.proficiency?.proficiencyId || "");

    // Derive category if missing
    if (!catId && skillData.categoryName) {
      const found = tree.find(c => c.name?.toLowerCase() === skillData.categoryName.toLowerCase());
      if (found) catId = String(found.id);
    }

    if (!catId) {
      console.warn("⚠️ No category found during hydration. skillData:", skillData);
      setIsHydrating(false);
      return;
    }

    // Set stable refs for this instance
    hydratedCatId.current = catId;
    hydratedSkillId.current = sId;

    const hydrateForm = async () => {
      try {
        const res = await skillService.getSkillsByCategory(catId);
        const skillsList = res?.data || res || [];
        const mappedSkills = Array.isArray(skillsList) ? skillsList : [];
        setAvailableSkills([...mappedSkills, { id: "OTHER", name: "Other", subSkills: [] }]);

        // Derive skillId if missing
        let finalSkillId = sId;
        if (!finalSkillId && skillData.skillName) {
          const found = skillsList.find(s => s.name?.toLowerCase() === skillData.skillName.toLowerCase());
          if (found) finalSkillId = String(found.id);
        }
        hydratedSkillId.current = finalSkillId;

        const skillObj = skillsList.find(s => String(s.id) === finalSkillId);
        if (skillObj) {
          const normalizedSubSkills = (skillObj.subSkills || skillObj.sub_skills || []).map(s => ({
            id: String(s.id || s.subSkillId),
            name: s.name || s.subSkillName
          }));

          setAvailableSubSkills([...normalizedSubSkills, { id: "OTHER", name: "Other" }]);
        } else {
          setAvailableSubSkills([{ id: "OTHER", name: "Other" }]);
        }

        // Derive canonical proficiency ID from master list (handle L4 vs 4)
        let finalPId = pId;
        const foundProf = proficiencies.find(p =>
          String(p.id) === pId ||
          String(p.code) === pId ||
          p.name?.toLowerCase() === (skillData.proficiencyName || "").toLowerCase()
        );
        if (foundProf) finalPId = String(foundProf.id);

        // Map sub-skills using name matching if ID is missing (common with existing data)
        const mappedSubSkills = (skillData.subSkills || skillData.resourceSubSkills || []).map(ss => {
          let subId = "";

          // 🔥 ALWAYS match by name (NOT ID)
          if ((ss.name || ss.subSkillName) && skillObj) {
            const ssName = (ss.name || ss.subSkillName).toLowerCase();

            const foundSub = (skillObj.subSkills || skillObj.sub_skills || []).find(f =>
              (f.name || f.subSkillName)?.toLowerCase() === ssName
            );

            if (foundSub) {
              subId = String(foundSub.id || foundSub.subSkillId);
            }
          }

          // proficiency remains same
          let subProfId = String(
            ss.proficiencyId ||
            ss.proficiencyCode ||
            ss.proficiency?.proficiencyId ||
            ""
          );

          const subProfObj = proficiencies.find(p =>
            String(p.id) === subProfId ||
            String(p.code) === subProfId ||
            p.name?.toLowerCase() === (ss.proficiencyName || "").toLowerCase()
          );

          if (subProfObj) subProfId = String(subProfObj.id);

          return {
            subSkillId: subId,
            proficiencyId: subProfId
          };
        });

        console.log("✅ Hydration results:", {
          categoryId: catId,
          skillId: finalSkillId,
          skillProficiencyId: finalPId,
          subSkillsCount: mappedSubSkills.length
        });

        setFormState({
          categoryId: catId,
          skillId: finalSkillId || (skillData.skillName ? "OTHER" : ""),
          skillProficiencyId: finalPId,
          otherSkillName: !finalSkillId ? (skillData.skillName || "") : "",
          subSkills: mappedSubSkills
        });
        console.log("✅ AvailableSubSkills (Hydration):", availableSubSkills);
        console.log("✅ FormSubSkills (Hydration):", mappedSubSkills);
      } catch (err) {
        console.error("Hydration failed:", err);
      } finally {
        // Small delay to ensure React processes the state update before releasing the lock
        setTimeout(() => setIsHydrating(false), 100);
      }
    };
    hydrateForm();
  }, [tree, proficiencies, skillData]);

  // ✅ CATEGORY CHANGE EFFECT (Manual only)
  useEffect(() => {
    // Only proceed if not hydrating AND the ID actually changed from the hydrated value
    if (isHydrating || !formState.categoryId || formState.categoryId === hydratedCatId.current) return;

    const fetchSkills = async () => {
      try {
        const res = await skillService.getSkillsByCategory(formState.categoryId);
        const skills = res?.data || res || [];
        setAvailableSkills([...skills, { id: "OTHER", name: "Other", subSkills: [] }]);

        setFormState(p => ({
          ...p,
          skillId: "",
          skillProficiencyId: "",
          subSkills: []
        }));
      } catch (err) { console.error(err); }
    };
    fetchSkills();
  }, [formState.categoryId, isHydrating]);

  // ✅ SKILL CHANGE EFFECT (Manual only)
  useEffect(() => {
    // Only proceed if not hydrating AND the ID actually changed from the hydrated value
    if (isHydrating || !formState.skillId || formState.skillId === hydratedSkillId.current) return;

    const skill = availableSkills.find(
      s => String(s.id || s.skillId) === String(formState.skillId)
    );

    const normalizedSubSkills = (skill?.subSkills || skill?.sub_skills || []).map(s => ({
      id: String(s.id || s.subSkillId),
      name: s.name || s.subSkillName
    }));

    setAvailableSubSkills([...normalizedSubSkills, { id: "OTHER", name: "Other" }]);

    setFormState(p => ({
      ...p,
      subSkills: []
    }));
  }, [formState.skillId, availableSkills, isHydrating]);

    setFormState(p => ({
      ...p,
      subSkills: [...p.subSkills, { subSkillId: "", otherSubSkillName: "", proficiencyId: "" }]
    }));

  const removeSubSkillRow = (index) => {
    setFormState(p => ({ ...p, subSkills: p.subSkills.filter((_, i) => i !== index) }));
  };

  const updateSubSkillRow = (index, field, value) => {
    setFormState(p => ({
      ...p,
      subSkills: p.subSkills.map((row, i) => i === index ? { ...row, [field]: value } : row)
    }));
  };

  const handleUpdate = async () => {
    if (!formState.categoryId || !formState.skillId || !formState.skillProficiencyId) {
      setError("Please fill all required fields marked with *");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        resourceId: Number(employeeId),
        skillId: formState.skillId === "OTHER" ? null : formState.skillId,
        skillName: formState.skillId === "OTHER" ? formState.otherSkillName : null,
        proficiencyId: formState.skillProficiencyId,
        subSkills: formState.subSkills
          .filter(ss => ss.subSkillId && ss.proficiencyId)
          .map(ss => ({
            subSkillId: ss.subSkillId === "OTHER" ? null : ss.subSkillId,
            subSkillName: ss.subSkillId === "OTHER" ? ss.otherSubSkillName : null,
            proficiencyId: ss.proficiencyId
          }))
      };

      await skillService.updateSkill(skillData.id, payload);
      showStatusToast("Skill mastery updated successfully", "success");
      onSaveSuccess();
    } catch (err) {
      console.error("Update failed:", err);
      showStatusToast(err.response?.data?.message || err.message || "Failed to update skill", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]">
        <div className="bg-white p-10 rounded-[32px] flex flex-col items-center gap-4 shadow-2xl">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          <p className="text-sm font-bold text-gray-700 tracking-wide uppercase">Loading Editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[32px] shadow-2xl flex flex-col border border-gray-100">
        <div className="flex justify-between items-center px-8 py-7 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
              <Edit2 className="text-indigo-600" size={24} />
              Edit Skill Mastery
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Refine your professional record</p>
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"><X size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <div className="space-y-6">
            <SearchableSelect label="Category *" placeholder="Search category" value={formState.categoryId} options={tree} onChange={(val) => setFormState(p => ({ ...p, categoryId: val }))} icon={Briefcase} />

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <SearchableSelect label="Skill *" placeholder="Select core skill" value={formState.skillId} options={availableSkills} disabled={!formState.categoryId} onChange={(val) => setFormState(p => ({ ...p, skillId: val }))} icon={Plus} />
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
              <SearchableSelect label="Skill Proficiency *" value={formState.skillProficiencyId} options={proficiencies} disabled={!formState.skillId || (formState.skillId === "OTHER" && !formState.otherSkillName)} onChange={(val) => setFormState(p => ({ ...p, skillProficiencyId: val }))} icon={Check} />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">Sub Skills Configuration</label>
                <button type="button" onClick={addSubSkillRow} disabled={!formState.skillId} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors"><Plus size={14} /> Add Sub-skill</button>
              </div>

              {formState.subSkills.length === 0 ? (
                <div className="py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <List size={24} className="opacity-20" /><p className="text-[10px] font-bold uppercase tracking-widest">No Sub-skills added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formState.subSkills.map((row, index) => (
                    <div key={index} className="space-y-3 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="grid grid-cols-12 gap-4 items-end">
                        <div className="col-span-5">
                          <SearchableSelect label={index === 0 ? "Select Sub-skill" : ""} placeholder="Choose" options={availableSubSkills} value={row.subSkillId} onChange={(val) => updateSubSkillRow(index, "subSkillId", val)} icon={List} />
                        </div>
                        <div className="col-span-5">
                          <SearchableSelect label={index === 0 ? "Proficiency" : ""} placeholder="Level" options={proficiencies} value={row.proficiencyId} disabled={!row.subSkillId || (row.subSkillId === "OTHER" && !row.otherSubSkillName)} onChange={(val) => updateSubSkillRow(index, "proficiencyId", val)} icon={Check} />
                        </div>
                        <div className="col-span-2 pb-1 text-right">
                          <button onClick={() => removeSubSkillRow(index)} className="p-2.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18} /></button>
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
                  ))}
                </div>
              )}
            </div>
          </div>
          {error && <div className="bg-rose-50 p-4 rounded-xl flex items-center gap-3 text-rose-600 border border-rose-100 animate-in shake duration-300"><AlertCircle size={18} className="shrink-0" /><span className="text-xs font-bold">{error}</span></div>}
        </div>

        <div className="px-8 py-6 border-t border-gray-100 bg-white flex justify-end items-center gap-4">
          <button onClick={onClose} className="px-8 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl text-sm font-black hover:bg-gray-50 transition-all">Discard Changes</button>
          <button onClick={handleUpdate} disabled={saving} className={`px-10 py-3.5 bg-indigo-600 text-white rounded-2xl text-sm font-black tracking-wide shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-3 ${saving ? 'opacity-50 grayscale' : ''}`}>
            {saving ? <><Loader2 size={18} className="animate-spin" /> Saving Changes...</> : "Update Skill Mastery"}
          </button>
        </div>
      </div>
    </div>
  );
}
