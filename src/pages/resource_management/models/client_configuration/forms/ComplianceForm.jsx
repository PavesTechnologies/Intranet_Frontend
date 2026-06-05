import React, { useEffect, useState } from "react";
import { getSkills, getCertificates } from "../../../services/clientservice";
import { notify } from "../../../utils/notify";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";
import FilterListbox from "../../../../../components/filter/FilterListbox";

const ComplianceForm = ({ formData, setFormData }) => {
  const { getEnumValues } = useEnums();
  const REQUIREMENT_TYPES = getEnumValues("RequirementType");

  const [skills, setSkills] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);

  const isSkillRequirement = formData.requirementType === "SKILL";
  const isCertificationRequirement = formData.requirementType === "CERTIFICATION";
  const hasFixedRequirementName = isSkillRequirement || isCertificationRequirement;

  const getSelectedSkillName = (skillId) =>
    skills.find((skill) => String(skill.id) === String(skillId))?.name ||
    formData.skill?.name ||
    "";

  const getSelectedCertificateName = (certificateId) =>
    certificates.find((cert) => String(cert.certificateId) === String(certificateId))
      ?.certificateName ||
    formData.certificate?.certificateName ||
    "";

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const res = await getSkills();
      setSkills(res.data);
    } catch (error) {
      notify.error("Failed To Fetch Skills");
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
      notify.error("Failed To Fetch Certificates");
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
    if (isSkillRequirement) {
      fetchSkills();
    }
    if (isCertificationRequirement) {
      fetchCertificates();
    }
  }, [formData.requirementType]);

  useEffect(() => {
    if (!hasFixedRequirementName) return;

    const fixedRequirementName = isSkillRequirement
      ? getSelectedSkillName(formData.skill?.id)
      : getSelectedCertificateName(formData.certificate?.certificateId);

    if ((formData.requirementName || "") !== fixedRequirementName) {
      setFormData((prev) => ({
        ...prev,
        requirementName: fixedRequirementName,
      }));
    }
  }, [
    hasFixedRequirementName,
    isSkillRequirement,
    formData.skill?.id,
    formData.certificate?.certificateId,
    skills,
    certificates,
  ]);

  // Updated handler to shape the data based on the input name
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "skill") {
      const requirementName = getSelectedSkillName(value);

      setFormData((prev) => ({
        ...prev,
        skill: { id: value },
        requirementName,
      }));
    } else if (name === "certificate") {
      const requirementName = getSelectedCertificateName(value);

      setFormData((prev) => ({
        ...prev,
        certificate: { certificateId: value },
        requirementName,
      }));
    } else if (name === "requirementType") {
      setFormData((prev) => {
        const { skill, certificate, ...rest } = prev;
        return {
          ...rest,
          [name]: value,
          requirementName: "",
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
              { value: "", label: "Select Type" },
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
          {isSkillRequirement ? (
            <>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Skills *
              </label>
              <FilterListbox
                options={[
                  { value: "", label: "Select A Skill" },
                  ...skills.map((skill) => ({ value: skill.id, label: skill.name.toUpperCase() })),
                ]}
                value={formData.skill?.id || ""}
                onChange={(val) => handleChange({ target: { name: "skill", value: val } })}
                disabled={loading}
              />
            </>
          ) : isCertificationRequirement ? (
            <>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">
                Certificate *
              </label>
              <FilterListbox
                options={[
                  { value: "", label: "Select A Certificate" },
                  ...certificates.map((cert) => ({ value: cert.certificateId, label: cert.certificateName})),
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
            placeholder={
              hasFixedRequirementName
                ? "Auto-filled from selected skill/certificate"
                : "e.g. ISO 27001"
            }
            value={formData.requirementName || ""}
            onChange={hasFixedRequirementName ? undefined : handleChange}
            readOnly={hasFixedRequirementName}
            className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-[13px] transition-all outline-none ${
              hasFixedRequirementName
                ? "bg-gray-100 text-slate-500 cursor-not-allowed"
                : "bg-gray-50/50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            }`}
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
