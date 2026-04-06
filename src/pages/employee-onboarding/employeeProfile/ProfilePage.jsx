"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Pencil, X, Trash2, AlertTriangle } from "lucide-react";
import { showStatusToast } from "../../../components/toastfy/toast";

export default function ProfilePage({ activeTab, user_uuid, coreData = {}, hrData = {}, refreshData, onTabChange }) {
  const { employee_uuid } = useParams();

  if (activeTab !== "profile") return null;

  const [editSection, setEditSection] = useState(null);

  /* ---------------- PRIMARY STATE ---------------- */

  const [primaryData, setPrimaryData] = useState(null);

  const [loading, setLoading] = useState(true);

  /* ---------------- CONTACT STATE ---------------- */

  const [contactData, setContactData] = useState(null);

  /* ---------------- ADDRESS STATE ---------------- */

  const [addressData, setAddressData] = useState(null);

  /* ---------------- RELATIONS STATE ---------------- */

  const [relationData, setRelationData] = useState([]);

  /* ---------------- EDUCATION STATE ---------------- */

  const [educationData, setEducationData] = useState([]);

  /* ---------------- EXPERIENCE STATE ---------------- */

  const [experienceData, setExperienceData] = useState([]);

  /* ---------------- IDENTITY STATE ---------------- */

  const [identityData, setIdentityData] = useState({
    aadhaar: "XXXX-XXXX-1234",
    pan: "ABCDE1234F",
  });

  /* ---------------- SOCIAL MEDIA STATE ---------------- */

  const [socialData, setSocialData] = useState({
    github: "https://github.com/username",
    linkedin: "https://linkedin.com/in/username",
  });

  useEffect(() => {
    // Use pre-fetched data from parent — no API calls needed
    const data = hrData || {};

    /* PRIMARY */
    setPrimaryData({
      first_name: coreData.first_name || data.offer?.first_name || "",
      last_name: coreData.last_name || data.offer?.last_name || "",
      gender: coreData.gender || data.personal_details?.gender || "",
      dob: coreData.date_of_birth || data.personal_details?.date_of_birth || "",
      marital_status: coreData.marital_status || data.personal_details?.marital_status || "",
      blood_group: coreData.blood_group || data.personal_details?.blood_group || "",
      nationality: data.personal_details?.nationality || "",
    });

    /* CONTACT */
    setContactData({
      work_email: coreData.work_email || "",
      personal_email: data.offer?.email || "",
      country_code: "+91",
      mobile_number: coreData.contact_number || data.offer?.contact_number || "",
      emergency_number:
        data.personal_details?.emergency_contact_phone || "",
    });

    /* RELATIONS */
    const personal = data?.personal_details || {};

    const emergencyName = personal.emergency_contact_name || "Akka";
    const emergencyPhone = personal.emergency_contact_phone || "8765678987";
    const relationType = personal.emergency_contact_relation || "Sister";

    let relationGender = "Not Specified";

    if (["Father", "Brother", "Son", "Husband"].includes(relationType)) {
      relationGender = "Male";
    } else if (
      ["Mother", "Sister", "Daughter", "Wife"].includes(relationType)
    ) {
      relationGender = "Female";
    }

    if (emergencyName) {
      setRelationData([
        {
          id: 1,
          relation: relationType || "Relation",
          first_name: emergencyName,
          mobile: emergencyPhone || "-",
          gender: relationGender,
        },
      ]);
    } else {
      setRelationData([]);
    }

    /* ADDRESS */
    const current = data.addresses?.find(a => a.address_type === "current");
    const permanent = data.addresses?.find(a => a.address_type === "permanent");

    setAddressData({
      current: {
        address_uuid: current?.address_uuid || "",
        country: current?.country || "",
        country_uuid: current?.country_uuid || "",
        line1: current?.address_line1 || "",
        line2: current?.address_line2 || "",
        city: current?.city || "",
        district_or_ward: current?.district_or_ward || "",
        state: current?.state_or_region || "",
        pincode: current?.postal_code || "",
      },
      permanent: {
        address_uuid: permanent?.address_uuid || "",
        country: permanent?.country || "",
        country_uuid: permanent?.country_uuid || "",
        line1: permanent?.address_line1 || "",
        line2: permanent?.address_line2 || "",
        city: permanent?.city || "",
        district_or_ward: permanent?.district_or_ward || "",
        state: permanent?.state_or_region || "",
        pincode: permanent?.postal_code || "",
      },
    });

    /* EDUCATION - show only the most recent record */
    const eduDocs = data.education_documents || [];
    const sortedEdu = [...eduDocs].sort((a, b) => (b.year_of_passing || 0) - (a.year_of_passing || 0));
    const recentEdu = sortedEdu.slice(0, 1).map((doc, idx) => ({
      id: doc.education_document_uuid || `edu-${idx}`,
      degree: doc.degree_name || doc.education_level || "N/A",
      specialization: doc.specialization || "",
      institution: doc.institution_name || "",
      year: doc.year_of_passing || "",
    }));
    setEducationData(recentEdu);

    /* EXPERIENCE - show only one recent record */
    const expDocs = data.experience || [];
    const recentExp = expDocs.slice(0, 1).map((doc, idx) => ({
      id: doc.experience_uuid || `exp-${idx}`,
      company: doc.company_name || "",
      role: doc.role_title || "",
      duration: `${doc.start_date || ""} - ${doc.end_date || "Present"}`,
    }));
    setExperienceData(recentExp);

    /* IDENTITY */
    const aadhaar = data.identity_documents?.find(d =>
      d.identity_type?.toLowerCase().includes("aadhaar")
    );

    const pan = data.identity_documents?.find(d =>
      d.identity_type?.toLowerCase().includes("pan")
    );

    setIdentityData({
      aadhaar: aadhaar?.identity_file_number || "",
      pan: pan?.identity_file_number || "",
    });

    /* SOCIAL MEDIA - Fetch independently from new endpoint */
    const fetchSocialLinks = async () => {
      try {
        const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/employee-details/social-links/${user_uuid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const links = await res.json();
          setSocialData(links.length > 0 ? links : [
            { platform_name: "GitHub", url: "" },
            { platform_name: "LinkedIn", url: "" }
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch social links:", err);
      }
    };
    fetchSocialLinks();

    setLoading(false);
  }, [coreData, hrData]);

  if (loading) return <div>Loading profile...</div>;

  return (
    <div className="space-y-6">

      {/* ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">

        <Section title="Primary Details" onEdit={() => setEditSection("primary")}>
          <Row label="First Name" value={primaryData?.first_name || ""} />
          <Row label="Last Name" value={primaryData?.last_name || ""} />
          <Row label="Gender" value={primaryData?.gender || ""} />
          <Row label="Date of Birth" value={primaryData?.dob || ""} />
          <Row label="Blood Group" value={primaryData?.blood_group || ""} />
          <Row label="Marital Status" value={primaryData?.marital_status || ""} />
          <Row label="Nationality" value={primaryData?.nationality || ""} />
        </Section>

        <Section title="Contact Details" onEdit={() => setEditSection("contact")}>
          <Row label="Work Email" value={contactData?.work_email || ""} />
          <Row label="Personal Email" value={contactData?.personal_email || ""} />
          <Row label="Mobile Number" value={`${contactData?.country_code} ${contactData?.mobile_number || ""}`} />
          <Row label="Emergency Number" value={`${contactData?.country_code} ${contactData?.emergency_number || ""}`} />
        </Section>

      </div>

      {/* ROW 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">

        <Section title="Addresses" onEdit={() => setEditSection("address")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
            {/* CURRENT ADDRESS */}
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Current Address</span>
              {addressData?.current?.line1 ? (
                <>
                  <span className="text-[14px] text-gray-800 leading-relaxed">{addressData.current.line1}</span>
                  {addressData.current.line2 && <span className="text-[14px] text-gray-800 leading-relaxed">{addressData.current.line2}</span>}
                  <span className="text-[14px] text-gray-800 leading-relaxed">
                    {[addressData.current.city, addressData.current.state, addressData.current.country, addressData.current.pincode].filter(Boolean).join('  ')}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">No address added</span>
              )}
            </div>

            {/* PERMANENT ADDRESS */}
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Permanent Address</span>
              {addressData?.permanent?.line1 ? (
                <>
                  <span className="text-[14px] text-gray-800 leading-relaxed">{addressData.permanent.line1}</span>
                  {addressData.permanent.line2 && <span className="text-[14px] text-gray-800 leading-relaxed">{addressData.permanent.line2}</span>}
                  <span className="text-[14px] text-gray-800 leading-relaxed">
                    {[addressData.permanent.city, addressData.permanent.state, addressData.permanent.country, addressData.permanent.pincode].filter(Boolean).join('  ')}
                  </span>
                </>
              ) : (
                <span className="text-sm text-gray-400">No address added</span>
              )}
            </div>
          </div>
        </Section>

        <Section title="Relations" onEdit={() => setEditSection("relations")}>
          {Array.isArray(relationData) && relationData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              {relationData.map((rel, idx) => (
                <div key={rel.id || idx} className="flex flex-col">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1">{rel.relation || "Relation"}</span>
                  {/* <span className="text-[14px] text-gray-800">{(rel.first_name || rel.last_name) ? `${rel.first_name || ""} ${rel.last_name || ""}`.trim() : "-"}</span> */}
                  <span className="text-[14px] text-gray-800">{rel.first_name || "-"}</span>
                  <span className="text-[14px] text-gray-800 mt-0.5"><span className="font-medium text-gray-900">Mobile:</span> {rel.mobile || "-"}</span>
                  <span className="text-[14px] text-gray-800 mt-0.5"><span className="font-medium text-gray-900">Gender:</span> {rel.gender || "-"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No relations added</div>
          )}
        </Section>

      </div>

      {/* ROW 3 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">

        <Section title="Education" onEdit={() => onTabChange("documents", { folder: "education", search: "" })}>
          {educationData.length > 0 ? (
            <div className="space-y-4">
              {educationData.map((edu, idx) => (
                <div key={edu.id || idx} className={idx > 0 ? "pt-4 border-t border-gray-100" : ""}>
                  <Row label="Degree" value={edu.degree || ""} />
                  <Row label="Specialization" value={edu.specialization || ""} />
                  <Row label="Institution/College" value={edu.institution || ""} />
                  <Row label="Year" value={edu.year || ""} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No education records added</div>
          )}
        </Section>

        <Section title="Experience" onEdit={() => onTabChange("documents", { folder: "experience", search: "" })}>
          {experienceData.length > 0 ? (
            <div className="space-y-4">
              {experienceData.map((exp, idx) => (
                <div key={exp.id || idx} className={idx > 0 ? "pt-4 border-t border-gray-100" : ""}>
                  <Row label="Company" value={exp.company || ""} />
                  <Row label="Role" value={exp.role || ""} />
                  <Row label="Duration" value={exp.duration || ""} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No experience records added</div>
          )}
        </Section>

      </div>

      {/* ROW 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">

        <Section title="Identity Information" onEdit={() => onTabChange("documents", { folder: "identity", search: "" })}>
          <Row label="Aadhaar" value={identityData?.aadhaar || ""} />
          <Row label="PAN" value={identityData?.pan || ""} />
        </Section>

        <Section title="Social Media" onEdit={() => setEditSection("social")}>
          {socialData.length > 0 ? (
            <div className="space-y-3">
              {socialData.map((link, idx) => (
                <Row key={idx} label={link.platform_name || "Link"} value={link.url || ""} isLink />
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No social media links added</div>
          )}
        </Section>

      </div>

      {/* MODALS */}
      {editSection === "primary" && <PrimaryModal data={primaryData} setData={setPrimaryData} onClose={() => setEditSection(null)} personalUuid={hrData?.personal_details?.personal_uuid || hrData?.personal_details?.user_uuid} hrData={hrData} refreshData={refreshData} />}
      {editSection === "contact" && <ContactModal data={contactData} setData={setContactData} onClose={() => setEditSection(null)} personalUuid={hrData?.personal_details?.personal_uuid || hrData?.personal_details?.user_uuid} hrData={hrData} refreshData={refreshData} />}
      {editSection === "address" && <AddressModal data={addressData} setData={setAddressData} user_uuid={user_uuid} onClose={() => setEditSection(null)} />}
      {editSection === "relations" && <RelationsModal data={relationData} setData={setRelationData} onClose={() => setEditSection(null)} personalUuid={hrData?.personal_details?.personal_uuid || hrData?.personal_details?.user_uuid} hrData={hrData} refreshData={refreshData} />}
      {editSection === "education" && <EducationModal data={educationData} setData={setEducationData} onClose={() => setEditSection(null)} />}
      {editSection === "experience" && <ExperienceModal data={experienceData} setData={setExperienceData} onClose={() => setEditSection(null)} />}
      {editSection === "identity" && <IdentityModal data={identityData} setData={setIdentityData} onClose={() => setEditSection(null)} />}
      {editSection === "social" && <SocialModal data={socialData} setData={setSocialData} onClose={() => setEditSection(null)} refreshData={refreshData} user_uuid={user_uuid} />}

    </div>
  );
}

/* ---------------- COMMON UI COMPONENTS ---------------- */

const Section = ({ title, children, onEdit }) => (
  <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md border border-indigo-100 overflow-hidden">
    <div className="flex justify-between items-center px-6 py-4 border-b border-indigo-100 bg-indigo-50/60">
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      <button onClick={onEdit} className="flex items-center gap-1 text-xs text-indigo-600">
        <Pencil size={14} /> Edit
      </button>
    </div>
    <div className="p-5 space-y-3">{children}</div>
  </div>
);

const Row = ({ label, value, isLink = false }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm min-w-0">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="text-gray-900 font-medium sm:text-right break-words min-w-0">
      {isLink && value && value !== "NA" ? (
        <a 
          href={value.startsWith("http") ? value : `https://${value}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-indigo-600 hover:underline inline-flex items-center gap-1"
        >
          {value}
        </a>
      ) : (
        value
      )}
    </span>
  </div>
);

const Input = ({ label, name, value, onChange, type = "text", disabled = false, required = false }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
      {label} {required && <span className="text-red-500 ml-1 mt-1 text-lg leading-none">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      placeholder={`Enter ${label.toLowerCase()}`}
      className={`w-full border-gray-300 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all placeholder-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 
      ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white hover:border-gray-400"}`}
    />
  </div>
);

const AddressInput = ({ label, name, value, onChange, type = "text", disabled = false, required = false }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center">
      {label} {required && <span className="text-red-500 ml-1 mt-1 text-lg leading-none">*</span>}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 
      ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white hover:border-gray-400"}`}
    />
  </div>
);

const Select = ({ label, name, value, onChange, options, disabled = false, required = false }) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center">
      {label} {required && <span className="text-red-500 ml-1 mt-1 text-lg leading-none">*</span>}
    </label>
    <select
      name={name}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100
      ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white hover:border-gray-400 cursor-pointer text-gray-900"}`}
    >
      <option value="" disabled className="text-gray-400">Select {label}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

const ModalWrapper = ({ title, onClose, onSubmit, children, saving = false, contentClassName = "px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7 overflow-y-auto bg-gray-50/50" }) => (
  <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
    <form
      onSubmit={onSubmit || ((e) => { e.preventDefault(); onClose(); })}
      className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100"
    >
      <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white shrink-0">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none">
          <X size={20} />
        </button>
      </div>
      <div className={contentClassName}>
        {children}
      </div>
      <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white shrink-0">
        <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all focus:ring-offset-1 ${
            saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  </div>
);

/* ---------------- INDIVIDUAL MODALS ---------------- */

const PrimaryModal = ({ data, setData, onClose, personalUuid, hrData, refreshData }) => {
  const { employee_uuid } = useParams();
  const [localData, setLocalData] = useState({ ...data });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!personalUuid) {
      showStatusToast("Unable to save: employee personal details not found", "error");
      return;
    }

    setSaving(true);
    try {
      const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
      const token = localStorage.getItem("token");
      const personal = hrData?.personal_details || {};
      const core = hrData?.offer || {}; // Actually coreData is passed to ProfilePage

      // 1. Update Personal Details
      const personalPayload = {
        date_of_birth: localData.dob || "",
        gender: localData.gender || "",
        marital_status: localData.marital_status || "",
        blood_group: localData.blood_group || "",
        nationality_country_uuid: personal.nationality_country_uuid || "",
        residence_country_uuid: personal.residence_country_uuid || "",
        emergency_contact_name: personal.emergency_contact_name || "",
        emergency_contact_phone: personal.emergency_contact_phone || "",
        emergency_contact_relation_uuid: personal.emergency_contact_relation_uuid || "",
      };

      const personalTask = fetch(`${BASE_URL}/employee-details/${personalUuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(personalPayload),
      });

      // 2. Update Core Details
      const corePayload = {
        first_name: localData.first_name,
        last_name: localData.last_name,
        date_of_birth: localData.dob,
        gender: localData.gender,
        marital_status: localData.marital_status,
        blood_group: localData.blood_group,
        contact_number: core.contact_number || personal.contact_number || "",
        department_uuid: personal.department_uuid || null,
        designation_uuid: personal.designation_uuid || null,
        location: personal.location || "",
        employment_type: personal.employment_type || "Full-Time",
        joining_date: personal.joining_date || null,
        employment_status: personal.employment_status || "Probation",
        work_mode: personal.work_mode || "Office",
        total_experience: personal.total_experience || 0,
      };

      const coreTask = fetch(`${BASE_URL}/permanent-employee/core-employee-details/${employee_uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(corePayload),
      });

      const [res1, res2] = await Promise.all([personalTask, coreTask]);

      if (!res1.ok || !res2.ok) {
        throw new Error("Failed to update one or more backend records");
      }

      setData(localData);
      showStatusToast("Profile updated successfully", "success");
      if (refreshData) refreshData();
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      showStatusToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Primary Details" onClose={onClose} onSubmit={handleSave} saving={saving}>
      <Input required label="First Name" name="first_name" value={localData.first_name} onChange={(e) => setLocalData({ ...localData, first_name: e.target.value })} />
      <Input required label="Last Name" name="last_name" value={localData.last_name} onChange={(e) => setLocalData({ ...localData, last_name: e.target.value })} />
      <Select label="Gender" name="gender" value={localData.gender} onChange={(e) => setLocalData({ ...localData, gender: e.target.value })} options={["Male", "Female", "Other"]} required />
      <Input required label="Date of Birth" type="date" name="dob" value={localData.dob} onChange={(e) => setLocalData({ ...localData, dob: e.target.value })} />
      <Select label="Blood Group" name="blood_group" value={localData.blood_group} onChange={(e) => setLocalData({ ...localData, blood_group: e.target.value })} options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]} />
      <Select label="Marital Status" name="marital_status" value={localData.marital_status} onChange={(e) => setLocalData({ ...localData, marital_status: e.target.value })} options={["Single", "Married", "Divorced", "Widowed"]} />
      <Input label="Nationality" name="nationality" value={localData.nationality} onChange={(e) => setLocalData({ ...localData, nationality: e.target.value })} />
    </ModalWrapper>
  );
};

const ContactModal = ({ data, setData, onClose, personalUuid, hrData, refreshData }) => {
  const { employee_uuid } = useParams();
  const [localData, setLocalData] = useState({ ...data });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!personalUuid) {
      showStatusToast("Unable to save: employee details not found", "error");
      return;
    }

    setSaving(true);
    try {
      const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
      const token = localStorage.getItem("token");
      const personal = hrData?.personal_details || {};
      const offer = hrData?.offer || {};

      // 1. Update Core Details (Mobile Number)
      // Note: Removed work_email as it is not supported in the core update endpoint schema provided
      const corePayload = {
        first_name: offer.first_name || "",
        last_name: offer.last_name || "",
        contact_number: localData.mobile_number,
        date_of_birth: personal.date_of_birth,
        gender: personal.gender,
        marital_status: personal.marital_status,
        blood_group: personal.blood_group,
        department_uuid: personal.department_uuid || null,
        designation_uuid: personal.designation_uuid || null,
        location: personal.location || "",
        employment_type: personal.employment_type || "Full-Time",
        joining_date: personal.joining_date || null,
        employment_status: personal.employment_status || "Probation",
        work_mode: personal.work_mode || "Office",
        total_experience: personal.total_experience || 0,
      };

      const coreTask = fetch(`${BASE_URL}/permanent-employee/core-employee-details/${employee_uuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(corePayload),
      });

      // 2. Update Personal Details (Emergency Phone)
      const personalPayload = {
        date_of_birth: personal.date_of_birth || "",
        gender: personal.gender || "",
        marital_status: personal.marital_status || "",
        blood_group: personal.blood_group || "",
        nationality_country_uuid: personal.nationality_country_uuid || "",
        residence_country_uuid: personal.residence_country_uuid || "",
        emergency_contact_name: personal.emergency_contact_name || "",
        emergency_contact_phone: localData.emergency_number || "",
        emergency_contact_relation_uuid: personal.emergency_contact_relation_uuid || "",
      };

      const personalTask = fetch(`${BASE_URL}/employee-details/${personalUuid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(personalPayload),
      });

      const [res1, res2] = await Promise.all([coreTask, personalTask]);

      if (!res1.ok || !res2.ok) {
        throw new Error("Failed to update contact records");
      }

      setData(localData);
      showStatusToast("Contact details updated successfully", "success");
      if (refreshData) refreshData();
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      showStatusToast(err.message || "Failed to update contact details", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper title="Contact Details" onClose={onClose} onSubmit={handleSave} saving={saving}>
      <Input required label="Work Email" type="email" name="work_email" value={localData.work_email} onChange={(e) => setLocalData({ ...localData, work_email: e.target.value })} />
      <Input label="Personal Email" type="email" name="personal_email" value={localData.personal_email} onChange={(e) => setLocalData({ ...localData, personal_email: e.target.value })} />
      <Input required label="Mobile Number" name="mobile_number" value={localData.mobile_number} onChange={(e) => setLocalData({ ...localData, mobile_number: e.target.value })} />
      <Input label="Emergency Number" name="emergency_number" value={localData.emergency_number} onChange={(e) => setLocalData({ ...localData, emergency_number: e.target.value })} />
    </ModalWrapper>
  );
};

const AddressModal = ({ data, setData, user_uuid, onClose }) => {
  const [localData, setLocalData] = useState({ ...data });
  const [saving, setSaving] = useState(false);

  const updateCurrent = (field, value) => {
    setLocalData((prev) => {
      const nextData = { ...prev, current: { ...prev.current, [field]: value } };
      if (nextData.sameAsCurrent) {
        nextData.permanent = { ...nextData.permanent, [field]: value };
      }
      return nextData;
    });
  };

  const updatePermanent = (field, value) => {
    setLocalData((prev) => ({ ...prev, permanent: { ...prev.permanent, [field]: value } }));
  };

  const toggleSameAsCurrent = (e) => {
    const checked = e.target.checked;
    setLocalData((prev) => ({
      ...prev,
      sameAsCurrent: checked,
      permanent: checked
        ? { ...prev.current }
        : {
          ...prev.permanent,
          country: "India",
          line1: "",
          line2: "",
          city: "",
          district_or_ward: "",
          state: "",
          pincode: "",
        },
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
      const token = localStorage.getItem("token");

      const updateAddress = async (addr, type) => {
        if (!addr.address_uuid) return;

        const payload = {
          user_uuid: user_uuid,
          address_type: type,
          address_line1: addr.line1,
          address_line2: addr.line2,
          city: addr.city,
          district_or_ward: addr.district_or_ward,
          state_or_region: addr.state,
          postal_code: addr.pincode,
          country_uuid: addr.country_uuid || "019c28d0-d0be-6edc-7adc-2d2e61d5524a", // Fallback to India if missing
        };

        const res = await fetch(`${BASE_URL}/employee-details/address/${addr.address_uuid}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Failed to update ${type} address`);
        }
      };

      // Update both addresses in parallel if IDs exist
      await Promise.all([
        updateAddress(localData.current, "current"),
        updateAddress(localData.permanent, "permanent"),
      ]);

      setData(localData);
      showStatusToast("Address updated successfully", "success");
      onClose();
    } catch (err) {
      console.error("Address update failed:", err);
      showStatusToast(err.message || "Failed to update address", "error");
    } finally {
      setSaving(false);
    }
  };

  const countries = ["India", "USA", "UK", "Australia", "Canada"];
  const states = ["Andhra Pradesh", "Karnataka", "Maharashtra", "Tamil Nadu", "Telangana"];

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <form
        onSubmit={handleSave}
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100"
      >
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Addresses</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none">
            <X size={20} />
          </button>
        </div>
        <div className="px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7 overflow-y-auto bg-gray-50/50">
          <div className="flex flex-col bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1 md:col-span-1">
            <div className="text-gray-900 mb-5 text-sm font-bold border-b border-gray-100 pb-3 uppercase tracking-wider">CURRENT ADDRESS</div>
            <div className="space-y-4">
              <Select required label="Country" value={localData.current.country} onChange={(e) => updateCurrent('country', e.target.value)} options={countries} />
              <AddressInput required label="Address Line 1" value={localData.current.line1} onChange={(e) => updateCurrent('line1', e.target.value)} />
              <AddressInput label="Address Line 2" value={localData.current.line2} onChange={(e) => updateCurrent('line2', e.target.value)} />
              <AddressInput required label="City" value={localData.current.city} onChange={(e) => updateCurrent('city', e.target.value)} />
              <AddressInput required label="District/Ward" value={localData.current.district_or_ward} onChange={(e) => updateCurrent('district_or_ward', e.target.value)} />
              <Select required label="State" value={localData.current.state} onChange={(e) => updateCurrent('state', e.target.value)} options={states} />
              <AddressInput required label="Pincode" value={localData.current.pincode} onChange={(e) => updateCurrent('pincode', e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1 md:col-span-1 relative">
            <div className="text-gray-900 mb-5 text-sm font-bold border-b border-gray-100 pb-3 uppercase tracking-wider">PERMANENT ADDRESS</div>
            <div className="space-y-4 flex-grow">
              <Select required={!localData.sameAsCurrent} label="Country" value={localData.permanent.country} disabled={localData.sameAsCurrent} onChange={(e) => updatePermanent('country', e.target.value)} options={countries} />
              <AddressInput required={!localData.sameAsCurrent} label="Address Line 1" value={localData.permanent.line1} disabled={localData.sameAsCurrent} onChange={(e) => updatePermanent('line1', e.target.value)} />
              <AddressInput label="Address Line 2" value={localData.permanent.line2} disabled={localData.sameAsCurrent} onChange={(e) => updatePermanent('line2', e.target.value)} />
              <AddressInput required={!localData.sameAsCurrent} label="City" value={localData.permanent.city} disabled={localData.sameAsCurrent} onChange={(e) => updatePermanent('city', e.target.value)} />
              <AddressInput required={!localData.sameAsCurrent} label="District/Ward" value={localData.permanent.district_or_ward} disabled={localData.sameAsCurrent} onChange={(e) => updatePermanent('district_or_ward', e.target.value)} />
              <Select required={!localData.sameAsCurrent} label="State" value={localData.permanent.state} disabled={localData.sameAsCurrent} onChange={(e) => updatePermanent('state', e.target.value)} options={states} />
              <AddressInput required={!localData.sameAsCurrent} label="Pincode" value={localData.permanent.pincode} disabled={localData.sameAsCurrent} onChange={(e) => updatePermanent('pincode', e.target.value)} />

              <label className="flex items-center gap-2 mt-5 p-3 bg-gray-50 rounded-lg cursor-pointer text-gray-700 transition-colors hover:bg-gray-100 border border-gray-200">
                <input type="checkbox" checked={localData.sameAsCurrent} onChange={toggleSameAsCurrent} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                <span className="text-sm font-medium">Same as Current Address</span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all focus:ring-offset-1 ${
              saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

const RelationsModal = ({ data, setData, onClose, personalUuid, hrData, refreshData }) => {
  const [relations, setRelations] = useState(Array.isArray(data) ? [...data] : []);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleAdd = () => {
    const newRel = { id: Date.now(), relation: "", gender: "", first_name: "", last_name: "", email: "", mobile: "", profession: "", dob: "" };
    setRelations([...relations, newRel]);
    setSelectedIndex(relations.length);
  };

  const handleDelete = (index) => {
    const newRels = relations.filter((_, i) => i !== index);
    setRelations(newRels);
    if (selectedIndex >= newRels.length) {
      setSelectedIndex(Math.max(0, newRels.length - 1));
    } else if (selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const updateCurrent = (field, value) => {
    const newRels = [...relations];
    newRels[selectedIndex] = { ...newRels[selectedIndex], [field]: value };
    setRelations(newRels);
  };

  const currentRel = relations[selectedIndex] || {};

  const handleSave = async (e) => {
    e.preventDefault();

    if (!personalUuid) {
      showStatusToast("Unable to save: employee personal details not found", "error");
      return;
    }

    setSaving(true);
    try {
      const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
      const token = localStorage.getItem("token");
      const personal = hrData?.personal_details || {};

      // Identify the emergency contact (e.g., the first one or a specific one)
      // For now, we update based on the currently selected relation if it's meant to be the emergency contact
      const payload = {
        date_of_birth: personal.date_of_birth || "",
        gender: personal.gender || "",
        marital_status: personal.marital_status || "",
        blood_group: personal.blood_group || "",
        nationality_country_uuid: personal.nationality_country_uuid || "",
        residence_country_uuid: personal.residence_country_uuid || "",
        emergency_contact_name: currentRel.first_name || personal.emergency_contact_name || "",
        emergency_contact_phone: currentRel.mobile || personal.emergency_contact_phone || "",
        emergency_contact_relation_uuid: personal.emergency_contact_relation_uuid || "", // Need master list to change UUID
      };

      const res = await fetch(
        `${BASE_URL}/employee-details/${personalUuid}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to update relations");
      }

      setData(relations);
      showStatusToast("Relations updated successfully", "success");
      if (refreshData) refreshData();
      onClose();
    } catch (err) {
      console.error("Update failed:", err);
      showStatusToast(err.message || "Failed to update relations", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white shrink-0">
          <h3 className="text-xl font-medium text-gray-800">Edit Relations</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row overflow-hidden bg-white flex-1 min-h-[400px]">
          {/* LEFT SIDEBAR: List of relations */}
          <div className="w-full md:w-1/3 border-r border-gray-100 p-6 overflow-y-auto space-y-4 bg-gray-50/20">
            {relations.map((rel, idx) => (
              <div
                key={rel.id}
                onClick={() => setSelectedIndex(idx)}
                className={`p-5 rounded-md border relative cursor-pointer transition-all ${selectedIndex === idx
                  ? "bg-[#f8f6fb] border-indigo-100 shadow-sm"
                  : "bg-white border-gray-100 hover:border-gray-200"
                  }`}
              >
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{rel.relation || "NEW RELATION"}</div>
                <div className="text-[15px] font-medium text-gray-800 mt-2 leading-tight">
                  {rel.first_name || rel.last_name ? `${rel.first_name} ${rel.last_name}` : ""}
                </div>
                <div className="text-[13px] text-gray-500 mt-1">[{rel.profession || "Profession"}]</div>

                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(idx); }}
                  className="absolute bottom-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} strokeWidth={1.5} />
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={handleAdd}
              className="text-indigo-600 text-sm font-medium hover:underline mt-2 inline-block px-1 tracking-wide"
            >
              + Add new relation
            </button>
          </div>

          {/* RIGHT SIDE: Form */}
          <div className="w-full md:w-2/3 p-10 overflow-y-auto">
            {relations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                <Select label="Relation" value={currentRel.relation} onChange={(e) => updateCurrent('relation', e.target.value)} options={["Father", "Mother", "Spouse", "Brother", "Sister", "Son", "Daughter", "Other"]} required />
                <Select label="Gender" value={currentRel.gender} onChange={(e) => updateCurrent('gender', e.target.value)} options={["Male", "Female", "Other"]} required />

                <Input label="First Name" value={currentRel.first_name} onChange={(e) => updateCurrent('first_name', e.target.value)} required />
                <Input label="Last Name" value={currentRel.last_name} onChange={(e) => updateCurrent('last_name', e.target.value)} required />

                <Input label="Email" type="email" value={currentRel.email} onChange={(e) => updateCurrent('email', e.target.value)} />
                <Input label="Mobile" value={currentRel.mobile} onChange={(e) => updateCurrent('mobile', e.target.value)} required />

                <Input label="Profession" value={currentRel.profession} onChange={(e) => updateCurrent('profession', e.target.value)} />
                <Input label="Date of Birth" type="date" value={currentRel.dob} onChange={(e) => updateCurrent('dob', e.target.value)} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No relations added. Click "+ Add new relation" to begin.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all focus:ring-offset-1 ${
              saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
};

const EducationModal = ({ data, setData, onClose }) => (
  <ModalWrapper title="Education" onClose={onClose}>
    <Input required label="Degree" name="degree" value={data.degree} onChange={(e) => setData({ ...data, degree: e.target.value })} />
    <Input label="Specialization" name="specialization" value={data.specialization} onChange={(e) => setData({ ...data, specialization: e.target.value })} />
    <Input required label="Institution" name="institution" value={data.institution} onChange={(e) => setData({ ...data, institution: e.target.value })} />
  </ModalWrapper>
);

const ExperienceModal = ({ data, setData, onClose }) => (
  <ModalWrapper title="Experience" onClose={onClose}>
    <Input required label="Company" name="company" value={data.company} onChange={(e) => setData({ ...data, company: e.target.value })} />
    <Input required label="Role" name="role" value={data.role} onChange={(e) => setData({ ...data, role: e.target.value })} />
  </ModalWrapper>
);

const IdentityModal = ({ data, setData, onClose }) => (
  <ModalWrapper title="Identity Information" onClose={onClose}>
    <Input required label="Aadhaar Number" name="aadhaar" value={data.aadhaar} onChange={(e) => setData({ ...data, aadhaar: e.target.value })} />
    <Input required label="PAN Number" name="pan" value={data.pan} onChange={(e) => setData({ ...data, pan: e.target.value })} />
  </ModalWrapper>
);

const SocialModal = ({ data, setData, onClose, refreshData, user_uuid }) => {
  const [links, setLinks] = useState(Array.isArray(data) ? [...data] : []);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, index: null });

  const handleAdd = () => {
    setLinks([...links, { platform_name: "", url: "" }]);
  };

  const handleDelete = (index) => {
    setConfirmModal({ open: true, index });
  };

  const confirmDelete = async () => {
    const { index } = confirmModal;
    const linkToDelete = links[index];

    // --- OPTIMISTIC UI: Remove from list and close modal instantly ---
    setLinks(links.filter((_, i) => i !== index));
    setConfirmModal({ open: false, index: null });

    // --- BACKGROUND SYNC: Delete from backend in silence ---
    if (linkToDelete.social_link_uuid) {
      try {
        const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
        const token = localStorage.getItem("token");
        const res = await fetch(`${BASE_URL}/employee-details/social-links/${linkToDelete.social_link_uuid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Failed to delete link");
        
        // Success notification after background sync
        showStatusToast("Link deleted successfully", "success");
        if (refreshData) refreshData();
      } catch (err) {
        console.error("Delete failed:", err);
        showStatusToast("Failed to delete link on server", "error");
        // Optional: you could re-add the link here if it's critical, 
        // but usually, a retry message is sufficient for UX.
      }
    }
  };

  const updateLink = (index, field, value) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
      const token = localStorage.getItem("token");
      const headers = { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      };

      const tasks = [];

      // 1. PROCESS links (Add, Update, or Auto-Delete if empty)
      links.forEach(link => {
        const hasUrl = !!link.url?.trim();

        if (link.social_link_uuid) {
          if (!hasUrl) {
            // Existing link cleared -> DELETE it ("if the link is not provided then data is no need to store")
            tasks.push(fetch(`${BASE_URL}/employee-details/social-links/${link.social_link_uuid}`, {
              method: "DELETE",
              headers
            }));
          } else {
            // Existing link modified -> PUT it
            tasks.push(fetch(`${BASE_URL}/employee-details/social-links/${link.social_link_uuid}`, {
              method: "PUT",
              headers,
              body: JSON.stringify({
                platform_name: link.platform_name || "Other",
                url: link.url,
                user_uuid: user_uuid
              })
            }));
          }
        } else if (hasUrl) {
          // New link with URL -> POST it
          tasks.push(fetch(`${BASE_URL}/employee-details/social-links`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              platform_name: link.platform_name || "Other",
              url: link.url,
              user_uuid: user_uuid
            })
          }));
        }
      });

      if (tasks.length > 0) {
        const results = await Promise.all(tasks);
        const failed = results.filter(r => !r.ok);
        if (failed.length > 0) throw new Error(`${failed.length} operations failed`);
      }

      setData(links);
      showStatusToast("Saved successfully", "success");
      if (refreshData) refreshData();
      onClose();
    } catch (err) {
      console.error("Sync failed:", err);
      showStatusToast("Failed to save social links", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <form onSubmit={handleSave} className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white shrink-0">
          <h3 className="text-xl font-medium text-gray-800">Edit Social Media Links</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none">
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6 bg-white">
          {links.length > 0 ? (
            <div className="space-y-5">
              {links.map((link, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-4 items-end sm:items-center bg-gray-50/40 p-5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Platform Name</label>
                    <input
                      value={link.platform_name}
                      onChange={(e) => updateLink(idx, "platform_name", e.target.value)}
                      placeholder="e.g. GitHub"
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  </div>
                  <div className="flex-[2] space-y-1.5 w-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Profile URL / Link</label>
                    <input
                      value={link.url}
                      onChange={(e) => updateLink(idx, "url", e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
              <p className="text-sm text-gray-400 font-medium">No links added. Click below to add one.</p>
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-2 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 px-4 py-2.5 rounded-xl transition-all"
          >
            + Add Another Platform
          </button>
        </div>

        <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white shrink-0">
          <button type="button" onClick={onClose} className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-8 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all ${
              saving ? "bg-indigo-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02]"
            }`}
          >
            {saving ? "Saving..." : "Save Links"}
          </button>
        </div>
      </form>

      {/* Internal Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Link?</h3>
                <p className="text-sm text-gray-500 leading-relaxed px-2">
                  Are you sure you want to remove this social media link? This action will take effect once you save your changes.
                </p>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-5 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setConfirmModal({ open: false, index: null })}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                No, Keep it
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-red-200"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
