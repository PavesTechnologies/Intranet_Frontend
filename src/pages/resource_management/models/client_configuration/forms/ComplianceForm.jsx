import React, { useEffect, useState } from "react";
import { getSkills, getCertificates } from "../../../services/clientservice";
import { toast } from "react-toastify";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";
import FilterListbox from "../../../../../components/filter/FilterListbox";

const ComplianceForm = ({ formData, setFormData }) => {
  const { getEnumValues } = useEnums();
  const REQUIREMENT_TYPES = getEnumValues("RequirementType");

  const [skills, setSkills] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await getSkills();
      setSkills(res.data);
    } catch (error) {
      toast.error("Failed to fetch skills");
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const res = await getCertificates();
      setCertificates(res.data);
    } catch (err) {
      toast.error("Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (formData.mandatoryFlag === undefined) {
      setFormData((prev) => ({ ...prev, mandatoryFlag: false }));
    }
  }, []);

  useEffect(() => {
    if (formData.requirementType === "SKILL") {
      fetchSkills();
    }
    if (formData.requirementType === "CERTIFICATION") {
      fetchCertificates();
    }
  }, [formData.requirementType]);

  // Updated handler to shape the data based on the input name
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "skill") {
      setFormData((prev) => ({
        ...prev,
        skill: { id: value },
      }));
    } else if (name === "certificate") {
      setFormData((prev) => ({
        ...prev,
        certificate: { certificateId: value },
      }));
    } else if (name === "requirementType") {
      setFormData((prev) => {
        const { skill, certificate, ...rest } = prev;
        return {
          ...rest,
          [name]: value,
        };
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="space-y-5">
      {/* ===== REQUIREMENT CONFIG (2-COLUMN GRID) ===== */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-5 items-end">
        {/* Requirement Type */}
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Requirement Type *
          </label>
          <FilterListbox
            options={[
              { value: "", label: "SELECT TYPE" },
              ...REQUIREMENT_TYPES.map((type) => ({
                value: type,
                label: type.replace(/_/g, " ").toUpperCase(),
              })),
            ]}
            value={formData.requirementType || ""}
            onChange={(val) => handleChange({ target: { name: "requirementType", value: val } })}
          />
        </div>

        {/* Dynamic Skill/Certificate/Placeholder */}
        <div>
          {formData.requirementType === "SKILL" ? (
            <>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Skills *
              </label>
              <FilterListbox
                options={[
                  { value: "", label: "SELECT A SKILL" },
                  ...skills.map((skill) => ({ value: skill.id, label: skill.name.toUpperCase() })),
                ]}
                value={formData.skill?.id || ""}
                onChange={(val) => handleChange({ target: { name: "skill", value: val } })}
                disabled={loading}
              />
            </>
          ) : formData.requirementType === "CERTIFICATION" ? (
            <>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Certificate *
              </label>
              <FilterListbox
                options={[
                  { value: "", label: "SELECT A CERTIFICATE" },
                  ...certificates.map((cert) => ({ value: cert.certificateId, label: cert.providerName.toUpperCase() })),
                ]}
                value={formData.certificate?.certificateId || ""}
                onChange={(val) => handleChange({ target: { name: "certificate", value: val } })}
                disabled={loading}
              />
            </>
          ) : (
            <div className="h-[38px]" />
          )}
        </div>

        {/* Requirement Name */}
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
            Requirement Name *
          </label>
          <input
            name="requirementName"
            placeholder="e.g. ISO 27001"
            value={formData.requirementName || ""}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-gray-50/50"
          />
        </div>

        {/* Mandatory Flag */}
        <div className="pb-2">
          <label htmlFor="mandatoryFlag" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="mandatoryFlag"
              checked={formData.mandatoryFlag || false}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  mandatoryFlag: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            <span className="ml-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Mandatory Requirement
            </span>
          </label>
        </div>

        {/* Active Status */}
        <div className="pb-2">
          <label htmlFor="activeFlag" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="activeFlag"
              checked={formData.activeFlag || false}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  activeFlag: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest">
              Active Status
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default ComplianceForm;