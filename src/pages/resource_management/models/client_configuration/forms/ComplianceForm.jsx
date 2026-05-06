import React, { useEffect, useState } from "react";
import { getSkills, getCertificates } from "../../../services/clientservice";
import { toast } from "react-toastify";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";

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
    } else if (name === "certificate") { // FIXED: changed from "certification" to "certificate"
      setFormData((prev) => ({
        ...prev,
        certificate: { certificateId: value },
      }));
    } else if (name === "requirementType") {
      // Clean up state when switching types
      setFormData((prev) => {
        // Destructure to remove skill and certificate from state
        const { skill, certificate, ...rest } = prev;

        // Return the clean state with the new requirementType
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
    <div className="border-t pt-4 space-y-5">
      {/* ===== REQUIREMENT DETAILS (RESPONSIVE GRID) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        {/* Requirement Type */}
        <div className="sm:col-span-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Requirement Type *
          </label>
          <select
            name="requirementType"
            value={formData.requirementType || ""}
            onChange={handleChange}
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          >
            <option value="">Select Type</option>
            {REQUIREMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {formData.requirementType === "SKILL" ? (
          <div className="sm:col-span-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Skills *
            </label>
            <select
              name="skill"
              value={formData.skill?.id || ""}
              onChange={handleChange}
              className={`w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none ${loading ? 'opacity-50 cursor-wait' : ''}`}
              disabled={loading}
            >
              <option value="">Select a skill</option>
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>
        ) : formData.requirementType === "CERTIFICATION" ? (
          <div className="sm:col-span-1">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Certificate *
            </label>
            <select
              name="certificate"
              value={formData.certificate?.certificateId || ""}
              onChange={handleChange}
              className={`w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none ${loading ? 'opacity-50 cursor-wait' : ''}`}
              disabled={loading}
            >
              <option value="">Select a certificate</option>
              {certificates.map((cert) => (
                <option key={cert.certificateId} value={cert.certificateId}>
                  {cert.providerName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Requirement Name */}
        <div className={`${formData.requirementType === "SKILL" || formData.requirementType === "CERTIFICATION"
          ? "sm:col-span-2 lg:col-span-1"
          : "sm:col-span-1 lg:col-span-2"
          }`}>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Requirement Name *
          </label>
          <input
            name="requirementName"
            placeholder="e.g. ISO 27001"
            value={formData.requirementName || ""}
            onChange={handleChange}
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          />
        </div>
      </div>

      {/* ===== FLAGS (MODERN TOGGLES) ===== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
        {/* Mandatory */}
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
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
          <span className="ml-3 text-sm font-medium text-gray-700">
            Mandatory Requirement
          </span>
        </label>

        {/* Active */}
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
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          <span className="ml-3 text-sm font-medium text-gray-700">
            Active Status
          </span>
        </label>
      </div>
    </div>
  );
};

export default ComplianceForm;