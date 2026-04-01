"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Pencil, X, Trash2 } from "lucide-react";

export default function ProfilePage({ activeTab, user_uuid, coreData = {}, hrData = {} }) {
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
        country: current?.country || "",
        line1: current?.address_line1 || "",
        line2: current?.address_line2 || "",
        city: current?.city || "",
        state: current?.state_or_region || "",
        pincode: current?.postal_code || "",
      },
      permanent: {
        country: permanent?.country || "",
        line1: permanent?.address_line1 || "",
        line2: permanent?.address_line2 || "",
        city: permanent?.city || "",
        state: permanent?.state_or_region || "",
        pincode: permanent?.postal_code || "",
      },
    });

    /* EDUCATION - show ALL records */
    const eduDocs = data.education_documents || [];
    const allEdu = eduDocs.map((doc, idx) => ({
      id: doc.education_document_uuid || `edu-${idx}`,
      degree: doc.degree_name || doc.education_level || "N/A",
      specialization: doc.specialization || "",
      institution: doc.institution_name || "",
      year: doc.year_of_passing || "",
    }));
    setEducationData(allEdu);

    /* EXPERIENCE - show ALL records */
    const expDocs = data.experience || [];
    const allExp = expDocs.map((doc, idx) => ({
      id: doc.experience_uuid || `exp-${idx}`,
      company: doc.company_name || "",
      role: doc.role_title || "",
      duration: `${doc.start_date || ""} - ${doc.end_date || "Present"}`,
    }));
    setExperienceData(allExp);

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

        <Section title="Education" onEdit={() => setEditSection("education")}>
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

        <Section title="Experience" onEdit={() => setEditSection("experience")}>
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

        <Section title="Identity Information" onEdit={() => setEditSection("identity")}>
          <Row label="Aadhaar" value={identityData?.aadhaar || ""} />
          <Row label="PAN" value={identityData?.pan || ""} />
        </Section>

        <Section title="Social Media" onEdit={() => setEditSection("social")}>
          <Row label="GitHub" value={socialData?.github || ""} />
          <Row label="LinkedIn" value={socialData?.linkedin || ""} />
        </Section>

      </div>

      {/* MODALS */}
      {editSection === "primary" && <PrimaryModal data={primaryData} setData={setPrimaryData} onClose={() => setEditSection(null)} />}
      {editSection === "contact" && <ContactModal data={contactData} setData={setContactData} onClose={() => setEditSection(null)} />}
      {editSection === "address" && <AddressModal data={addressData} setData={setAddressData} onClose={() => setEditSection(null)} />}
      {editSection === "relations" && <RelationsModal data={relationData} setData={setRelationData} onClose={() => setEditSection(null)} />}
      {editSection === "education" && <EducationModal data={educationData} setData={setEducationData} onClose={() => setEditSection(null)} />}
      {editSection === "experience" && <ExperienceModal data={experienceData} setData={setExperienceData} onClose={() => setEditSection(null)} />}
      {editSection === "identity" && <IdentityModal data={identityData} setData={setIdentityData} onClose={() => setEditSection(null)} />}
      {editSection === "social" && <SocialModal data={socialData} setData={setSocialData} onClose={() => setEditSection(null)} />}

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

const Row = ({ label, value }) => (
  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4 text-sm min-w-0">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className="text-gray-900 font-medium sm:text-right break-words min-w-0">
      {value}
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

const ModalWrapper = ({ title, onClose, children, contentClassName = "px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7 overflow-y-auto bg-gray-50/50" }) => (
  <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
    <form
      onSubmit={(e) => { e.preventDefault(); onClose(); }}
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
        <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all focus:ring-offset-1">
          Save Changes
        </button>
      </div>
    </form>
  </div>
);

/* ---------------- INDIVIDUAL MODALS ---------------- */

const PrimaryModal = ({ data, setData, onClose }) => (
  <ModalWrapper title="Primary Details" onClose={onClose}>
    <Input required label="First Name" name="first_name" value={data.first_name} onChange={(e) => setData({ ...data, first_name: e.target.value })} />
    <Input required label="Last Name" name="last_name" value={data.last_name} onChange={(e) => setData({ ...data, last_name: e.target.value })} />
    <Input required label="Gender" name="gender" value={data.gender} onChange={(e) => setData({ ...data, gender: e.target.value })} />
    <Input required label="Date of Birth" type="date" name="dob" value={data.dob} onChange={(e) => setData({ ...data, dob: e.target.value })} />
    <Input label="Blood Group" name="blood_group" value={data.blood_group} onChange={(e) => setData({ ...data, blood_group: e.target.value })} />
    <Input label="Marital Status" name="marital_status" value={data.marital_status} onChange={(e) => setData({ ...data, marital_status: e.target.value })} />
    <Input label="Nationality" name="nationality" value={data.nationality} onChange={(e) => setData({ ...data, nationality: e.target.value })} />
  </ModalWrapper>
);

const ContactModal = ({ data, setData, onClose }) => (
  <ModalWrapper title="Contact Details" onClose={onClose}>
    <Input required label="Work Email" type="email" name="work_email" value={data.work_email} onChange={(e) => setData({ ...data, work_email: e.target.value })} />
    <Input label="Personal Email" type="email" name="personal_email" value={data.personal_email} onChange={(e) => setData({ ...data, personal_email: e.target.value })} />
    <Input required label="Mobile Number" name="mobile_number" value={data.mobile_number} onChange={(e) => setData({ ...data, mobile_number: e.target.value })} />
    <Input label="Emergency Number" name="emergency_number" value={data.emergency_number} onChange={(e) => setData({ ...data, emergency_number: e.target.value })} />
  </ModalWrapper>
);

const AddressModal = ({ data, setData, onClose }) => {
  const updateCurrent = (field, value) => {
    setData((prev) => {
      const nextData = { ...prev, current: { ...prev.current, [field]: value } };
      if (nextData.sameAsCurrent) {
        nextData.permanent = { ...nextData.permanent, [field]: value };
      }
      return nextData;
    });
  };

  const updatePermanent = (field, value) => {
    setData((prev) => ({ ...prev, permanent: { ...prev.permanent, [field]: value } }));
  };

  const toggleSameAsCurrent = (e) => {
    const checked = e.target.checked;
    setData((prev) => ({
      ...prev,
      sameAsCurrent: checked,
      permanent: checked
        ? { ...prev.current }
        : {
          country: "India",
          line1: "",
          line2: "",
          city: "",
          state: "",
          pincode: "",
        },
    }));
  };

  const countries = ["India", "USA", "UK", "Australia", "Canada"];
  const states = ["Andhra Pradesh", "Karnataka", "Maharashtra", "Tamil Nadu", "Telangana"];

  return (
    <ModalWrapper title="Addresses" onClose={onClose}>
      <div className="flex flex-col bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1 md:col-span-1">
        <div className="text-gray-900 mb-5 text-sm font-bold border-b border-gray-100 pb-3">CURRENT ADDRESS</div>
        <div className="space-y-4">
          <Select required label="Country" value={data.current.country} onChange={(e) => updateCurrent('country', e.target.value)} options={countries} />
          <AddressInput required label="Address Line 1" value={data.current.line1} onChange={(e) => updateCurrent('line1', e.target.value)} />
          <AddressInput label="Address Line 2" value={data.current.line2} onChange={(e) => updateCurrent('line2', e.target.value)} />
          <AddressInput required label="City" value={data.current.city} onChange={(e) => updateCurrent('city', e.target.value)} />
          <Select required label="State" value={data.current.state} onChange={(e) => updateCurrent('state', e.target.value)} options={states} />
          <AddressInput required label="Pincode" value={data.current.pincode} onChange={(e) => updateCurrent('pincode', e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1 md:col-span-1 relative">
        <div className="text-gray-900 mb-5 text-sm font-bold border-b border-gray-100 pb-3">PERMANENT ADDRESS</div>
        <div className="space-y-4 flex-grow">
          <Select required={!data.sameAsCurrent} label="Country" value={data.permanent.country} disabled={data.sameAsCurrent} onChange={(e) => updatePermanent('country', e.target.value)} options={countries} />
          <AddressInput required={!data.sameAsCurrent} label="Address Line 1" value={data.permanent.line1} disabled={data.sameAsCurrent} onChange={(e) => updatePermanent('line1', e.target.value)} />
          <AddressInput label="Address Line 2" value={data.permanent.line2} disabled={data.sameAsCurrent} onChange={(e) => updatePermanent('line2', e.target.value)} />
          <AddressInput required={!data.sameAsCurrent} label="City" value={data.permanent.city} disabled={data.sameAsCurrent} onChange={(e) => updatePermanent('city', e.target.value)} />
          <Select required={!data.sameAsCurrent} label="State" value={data.permanent.state} disabled={data.sameAsCurrent} onChange={(e) => updatePermanent('state', e.target.value)} options={states} />
          <AddressInput required={!data.sameAsCurrent} label="Pincode" value={data.permanent.pincode} disabled={data.sameAsCurrent} onChange={(e) => updatePermanent('pincode', e.target.value)} />

          <label className="flex items-center gap-2 mt-5 p-3 bg-gray-50 rounded-lg cursor-pointer text-gray-700 transition-colors hover:bg-gray-100 border border-gray-200">
            <input type="checkbox" checked={data.sameAsCurrent} onChange={toggleSameAsCurrent} className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
            <span className="text-sm font-medium">Same as Current Address</span>
          </label>
        </div>
      </div>
    </ModalWrapper>
  );
};

const RelationsModal = ({ data, setData, onClose }) => {
  const [relations, setRelations] = useState(Array.isArray(data) ? [...data] : []);
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  const handleSave = () => {
    setData(relations);
    onClose();
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
          <button type="submit" className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm transition-all focus:ring-offset-1">
            Save Changes
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

const SocialModal = ({ data, setData, onClose }) => (
  <ModalWrapper title="Social Media Links" onClose={onClose}>
    <Input
      label="GitHub Profile URL"
      name="github"
      value={data.github}
      onChange={(e) => setData({ ...data, github: e.target.value })}
      type="url"
    />
    <Input
      label="LinkedIn Profile URL"
      name="linkedin"
      value={data.linkedin}
      onChange={(e) => setData({ ...data, linkedin: e.target.value })}
      type="url"
    />
  </ModalWrapper>
);