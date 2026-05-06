import React, { useState, useEffect, Fragment } from "react";
import { toast } from "react-toastify";
import { X, Plus, Trash2, Edit2, ChevronDown, Search, Check } from "lucide-react";
import { Combobox, Transition } from "@headlessui/react";
import { createRoleExpectation, updateRoleExpectation } from "../services/workforceService";

/* ===================== SEARCHABLE SELECT COMPONENT ===================== */

const SearchableSelect = ({ label, value, onChange, options, placeholder, disabled }) => {
  const [query, setQuery] = useState("");

  const filteredOptions = query === ""
    ? options
    : options.filter((opt) =>
      opt.name.toLowerCase().includes(query.toLowerCase())
    );

  const selectedOption = options.find((opt) => String(opt.id) === String(value));

  return (
    <div className="w-full">
      {label && <label className="block text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">{label}</label>}
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
            <Combobox.Button as="div" className={`relative w-full cursor-pointer overflow-hidden rounded-lg bg-white text-left border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-200 shadow-sm sm:text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <Combobox.Input
                className="w-full border-none py-2.5 pl-9 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 outline-none disabled:bg-gray-50 bg-transparent"
                displayValue={() => selectedOption?.name || ""}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={placeholder}
                autoComplete="off"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180 text-indigo-600' : ''}`} />
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
                        key={opt.id}
                        value={opt.id}
                        className={({ active, selected }) =>
                          `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-all duration-150 rounded-md mb-0.5 last:mb-0 ${active ? "bg-indigo-50 text-indigo-700 font-medium" :
                            selected ? "bg-indigo-600 text-white font-semibold shadow-md z-10" : "text-gray-700 hover:bg-gray-50"
                          }`
                        }
                      >
                        {({ selected, active }) => (
                          <>
                            <span className="block truncate">{opt.name}</span>
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

/* ===================== MAIN MODAL ===================== */

const AddDeliverableRoleModal = ({ open, onClose, categories = [], proficiencyLevels = [], initialData = null }) => {
  const [loading, setLoading] = useState(false);
  const [draftRole, setDraftRole] = useState({
    roleName: "",
    skills: []
  });

  // Load initial data if provided (for updates)
  useEffect(() => {
    if (open && initialData) {
      setDraftRole({
        roleId: initialData.roleId,
        roleName: initialData.roleName,
        skills: initialData.skills || []
      });
    } else if (open) {
      setDraftRole({
        roleName: "",
        skills: []
      });
    }
  }, [open, initialData]);

  const [formState, setFormState] = useState({
    categoryId: "",
    skillId: "",
    skillName: "",
    proficiencyId: "",
    mandatoryFlag: false,
    subSkills: []
  });

  const [stagingSubSkill, setStagingSubSkill] = useState(null); // { subSkillId: "", proficiencyId: "", mandatoryFlag: false }
  const [availableSkills, setAvailableSkills] = useState([]);
  const [availableSubSkills, setAvailableSubSkills] = useState([]);

  // Map proficiencies for consistent SearchableSelect usage
  const mappedProficiencies = proficiencyLevels.map(p => ({
    id: p.id || p.proficiencyId,
    name: p.name || p.proficiencyName
  }));

  // Sync available skills when category changes
  useEffect(() => {
    const category = categories.find(c => String(c.id) === String(formState.categoryId));
    setAvailableSkills(category?.skills || []);
    // Reset skill if not in new category
    if (!category?.skills?.find(s => String(s.id) === String(formState.skillId))) {
      setFormState(prev => ({ ...prev, skillId: "", skillName: "", subSkills: [] }));
    }
  }, [formState.categoryId, categories, formState.skillId]);

  // Sync available subskills when skill changes
  useEffect(() => {
    const skill = availableSkills.find(s => String(s.id) === String(formState.skillId));
    setAvailableSubSkills(skill?.subSkills || []);
  }, [formState.skillId, availableSkills]);

  const handleAddSubSkillToStaging = () => {
    if (!stagingSubSkill.subSkillId || !stagingSubSkill.proficiencyId) {
      return toast.error("Select subskill and proficiency");
    }

    const subSkillName = availableSubSkills.find(s => String(s.id) === String(stagingSubSkill.subSkillId))?.name;
    const proficiencyName = proficiencyLevels.find(p => String(p.id || p.proficiencyId) === String(stagingSubSkill.proficiencyId))?.name || proficiencyLevels.find(p => String(p.id || p.proficiencyId) === String(stagingSubSkill.proficiencyId))?.proficiencyName;

    setFormState(prev => ({
      ...prev,
      subSkills: [...prev.subSkills, { ...stagingSubSkill, subSkillName, proficiencyName, id: Date.now() }]
    }));
    setStagingSubSkill(null);
  };

  const handleRemoveStagedSubSkill = (id) => {
    setFormState(prev => ({
      ...prev,
      subSkills: prev.subSkills.filter(s => s.id !== id)
    }));
  };

  const handleAddSkillToDraft = () => {
    if (!draftRole.roleName || draftRole.roleName.length < 3) {
      return toast.error("Role Name must be at least 3 characters");
    }
    if (!formState.skillId || !formState.proficiencyId) {
      return toast.error("Select skill and proficiency");
    }

    const skillName = availableSkills.find(s => String(s.id) === String(formState.skillId))?.name;
    const proficiencyName = proficiencyLevels.find(p => String(p.id || p.proficiencyId) === String(formState.proficiencyId))?.name || proficiencyLevels.find(p => String(p.id || p.proficiencyId) === String(formState.proficiencyId))?.proficiencyName;

    const existingSkillIndex = draftRole.skills.findIndex(s => String(s.skillId) === String(formState.skillId));

    if (existingSkillIndex > -1) {
      const updatedSkills = [...draftRole.skills];
      const existingSkill = updatedSkills[existingSkillIndex];

      // Merge subskills (avoid duplicates by ID)
      const existingSubSkillIds = new Set(existingSkill.subSkills.map(ss => String(ss.subSkillId)));
      const newSubSkills = formState.subSkills.filter(ss => !existingSubSkillIds.has(String(ss.subSkillId)));

      updatedSkills[existingSkillIndex] = {
        ...formState,
        skillName,
        proficiencyName,
        id: existingSkill.id, // Keep original ID for stability
        subSkills: [...existingSkill.subSkills, ...newSubSkills]
      };
      setDraftRole(prev => ({ ...prev, skills: updatedSkills }));
      toast.success("Skill updated in draft");
    } else {
      setDraftRole(prev => ({
        ...prev,
        skills: [...prev.skills, { ...formState, skillName, proficiencyName, id: Date.now() }]
      }));
      toast.success("Skill added to draft");
    }

    setFormState({
      categoryId: "",
      skillId: "",
      skillName: "",
      proficiencyId: "",
      mandatoryFlag: false,
      subSkills: []
    });
    setStagingSubSkill(null);
  };

  const handleEditSkill = (skill) => {
    // Find category for this skill
    const category = categories.find(c => c.skills?.some(s => String(s.id) === String(skill.skillId)));
    setFormState({
      categoryId: category?.id || "",
      skillId: skill.skillId,
      skillName: skill.skillName,
      proficiencyId: skill.proficiencyId,
      mandatoryFlag: skill.mandatoryFlag,
      subSkills: skill.subSkills || []
    });
  };

  const handleRemoveSkillFromDraft = (skillId) => {
    setDraftRole(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s.skillId !== skillId)
    }));
    toast.success("Skill removed from draft");
  };

  const handleFinalize = async () => {
    if (!draftRole.roleName) return toast.error("Role name required");
    if (draftRole.skills.length === 0) return toast.error("At least one skill required");

    const payload = {
      roleName: draftRole.roleName,
      skills: draftRole.skills.map(s => ({
        skillId: s.skillId,
        mandatoryFlag: s.mandatoryFlag,
        proficiencyId: s.proficiencyId,
        subSkills: s.subSkills.map(ss => ({
          subSkillId: ss.subSkillId,
          proficiencyId: ss.proficiencyId,
          mandatoryFlag: ss.mandatoryFlag
        }))
      }))
    };
    setLoading(true);
    try {
      if (draftRole.roleId) {
        // Update case: PUT /api/admin/role-expectations/{roleId}
        const res = await updateRoleExpectation(draftRole.roleId, payload);
        toast.success(res.message || "Role updated successfully");
      } else {
        // Create case: POST /api/admin/role-expectations
        const res = await createRoleExpectation(payload);
        toast.success(res.message || "Role created successfully");
      }
      onClose();
      // Reset state
      setDraftRole({ roleName: "", skills: [] });
    } catch (err) {
      toast.error(err.response?.data?.message || draftRole.roleId ? "Failed to update role" : "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[70%] max-h-[85vh] overflow-hidden rounded-lg shadow-lg flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Configure Deliverable Role</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-2 gap-6 p-6 overflow-y-auto">
          {/* LEFT: FORM */}
          <div className="space-y-6">
            <section>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Role Name *</label>
              <input
                type="text"
                value={draftRole.roleName}
                onChange={(e) => setDraftRole(p => ({ ...p, roleName: e.target.value }))}
                placeholder="Enter role name"
                className="w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </section>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Skill Configuration</h3>
              <div className="space-y-4">
                <SearchableSelect
                  label="Category"
                  placeholder="Search and select category"
                  value={formState.categoryId}
                  options={categories}
                  onChange={(val) => setFormState(p => ({ ...p, categoryId: val }))}
                />

                <SearchableSelect
                  label="Skill"
                  placeholder="Search and select skill"
                  value={formState.skillId}
                  options={availableSkills}
                  disabled={!formState.categoryId}
                  onChange={(val) => setFormState(p => ({ ...p, skillId: val }))}
                />

                <div className="grid grid-cols-2 gap-4">
                  <SearchableSelect
                    label="Proficiency *"
                    placeholder="Select proficiency"
                    value={formState.proficiencyId}
                    options={mappedProficiencies}
                    onChange={(val) => setFormState(p => ({ ...p, proficiencyId: val }))}
                  />
                  <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formState.mandatoryFlag}
                        onChange={(e) => setFormState(p => ({ ...p, mandatoryFlag: e.target.checked }))}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Mark as Mandatory
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SubSkills section - only if availableSubSkills exists */}
            {availableSubSkills.length > 0 && (
              <div className="border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">SubSkills (Optional)</h3>
                  <button
                    type="button"
                    onClick={() => setStagingSubSkill({ subSkillId: "", proficiencyId: "", mandatoryFlag: false })}
                    disabled={!formState.skillId}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 disabled:text-gray-400"
                  >
                    <Plus size={14} /> Add SubSkill
                  </button>
                </div>

                {stagingSubSkill && (
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mb-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <SearchableSelect
                        label="SubSkill"
                        placeholder="Search subskill"
                        value={stagingSubSkill.subSkillId}
                        options={availableSubSkills}
                        onChange={(val) => setStagingSubSkill(p => ({ ...p, subSkillId: val }))}
                      />
                      <SearchableSelect
                        label="Proficiency"
                        placeholder="Select"
                        value={stagingSubSkill.proficiencyId}
                        options={mappedProficiencies}
                        onChange={(val) => setStagingSubSkill(p => ({ ...p, proficiencyId: val }))}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={stagingSubSkill.mandatoryFlag}
                          onChange={(e) => setStagingSubSkill(p => ({ ...p, mandatoryFlag: e.target.checked }))}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 scale-75"
                        />
                        Mandatory
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStagingSubSkill(null)}
                          className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleAddSubSkillToStaging}
                          className="px-4 py-1.5 text-xs bg-indigo-600 text-white rounded font-semibold hover:bg-indigo-700 shadow-sm"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {formState.subSkills.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Staged SubSkills:</p>
                    <div className="flex flex-wrap gap-2">
                      {formState.subSkills.map(ss => (
                        <div key={ss.id} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-2.5 py-1.5 rounded border border-indigo-100 text-xs font-medium">
                          <span>{ss.subSkillName} | {ss.proficiencyName} | {ss.mandatoryFlag ? "Mand" : "Opt"}</span>
                          <button onClick={() => handleRemoveStagedSubSkill(ss.id)} className="text-indigo-400 hover:text-indigo-600">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleAddSkillToDraft}
              disabled={!draftRole.roleName || !formState.skillId || !formState.proficiencyId}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors mt-4 shadow-sm"
            >
              Add Skill to Draft
            </button>
          </div>

          {/* RIGHT: DRAFT PREVIEW */}
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col h-full overflow-hidden">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 h-fit">Draft Summary</h3>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {draftRole.skills.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm italic">
                  No skills added yet
                </div>
              ) : (
                draftRole.skills.map(skill => (
                  <div key={skill.id} className="bg-white p-4 rounded-md border border-gray-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{skill.skillName}</h4>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">
                            {skill.proficiencyName}
                          </span>
                          {skill.mandatoryFlag && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-medium uppercase">
                              Mandatory
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditSkill(skill)}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleRemoveSkillFromDraft(skill.skillId)}
                          className="p-1 text-gray-400 hover:text-rose-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {skill.subSkills.length > 0 && (
                      <div className="pl-3 border-l-2 border-gray-100 space-y-1">
                        <p className="text-[10px] text-gray-400 uppercase font-black">SubSkills:</p>
                        {skill.subSkills.map(ss => (
                          <div key={ss.id} className="text-[11px] text-gray-600 flex items-center gap-1">
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            {ss.subSkillName} | {ss.proficiencyName} | {ss.mandatoryFlag ? "Mandatory" : "Optional"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            disabled={loading}
            onClick={onClose}
            className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleFinalize}
            className={`px-6 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? "Saving..." : draftRole.roleId ? "Update Role" : "Finalize Role"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDeliverableRoleModal;

