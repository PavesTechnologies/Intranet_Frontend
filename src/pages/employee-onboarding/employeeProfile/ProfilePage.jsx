"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Pencil, X, Trash2, AlertTriangle } from "lucide-react";
import { showStatusToast } from "../../../components/toastfy/toast";
import Button from "../../../components/Button/Button";
import DynamicCardGrid from "../../../components/Cards/DynamicCardGrid";
import { PageCard } from "../../../components/Cards/PageCard";
import LoadingSpinner from "../../../components/LoadingSpinner";
import api from "../../../api/axiosInstance";

export default function ProfilePage({
  activeTab,
  user_uuid,
  coreData = {},
  hrData = {},
  refreshData,
  onTabChange,
}) {
  const { employee_uuid } = useParams();

  if (activeTab !== "profile") return null;

  const [editSection, setEditSection] = useState(null);

  /* ---------------- PRIMARY STATE ---------------- */

  const [primaryData, setPrimaryData] = useState(null);

  const [loading, setLoading] = useState(true);

  /* ---------------- ADDRESS STATE ---------------- */

  const [addressData, setAddressData] = useState(null);

  /* ---------------- EDUCATION STATE ---------------- */

  const [educationData, setEducationData] = useState([]);

  /* ---------------- EXPERIENCE STATE ---------------- */

  const [experienceData, setExperienceData] = useState([]);

  /* ---------------- IDENTITY STATE ---------------- */
  const [identityData, setIdentityData] = useState([]);

  /* ---------------- SOCIAL MEDIA STATE ---------------- */

  const [socialData, setSocialData] = useState([]);
  const [countries, setCountries] = useState([]);
  const [relations, setRelations] = useState([]);

  useEffect(() => {
    // Use pre-fetched data from parent — no API calls needed
    const data = hrData || {};

    /* PRIMARY */
    const pd = data.personal_details || {};
    setPrimaryData({
      first_name: coreData.first_name || data.offer?.first_name || "",
      last_name: coreData.last_name || data.offer?.last_name || "",
      gender: coreData.gender || pd.gender || "",
      dob: coreData.date_of_birth || pd.date_of_birth || "",
      personal_email: data.offer?.email || "",
      mobile_number: coreData.contact_number || data.offer?.contact_number || "",
      marital_status: coreData.marital_status || pd.marital_status || "",
      blood_group: coreData.blood_group || pd.blood_group || "",
      nationality_country_uuid: pd.nationality_country_uuid || "",
      residence_country_uuid: pd.residence_country_uuid || "",
      emergency_contact_name: pd.emergency_contact_name || "",
      emergency_contact_phone: pd.emergency_contact_phone || "",
      emergency_contact_relation_uuid: pd.emergency_contact_relation_uuid || "",
    });

    /* ADDRESS */
    const addresses = Array.isArray(data.addresses)
  ? data.addresses
  : [];

const current = addresses.find(
  (a) => a.address_type === "current",
);

const permanent = addresses.find(
  (a) => a.address_type === "permanent",
);

    setAddressData({
      current: {
        address_uuid: current?.address_uuid || "",
        country: current?.country || "",
        
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
        
        line1: permanent?.address_line1 || "",
        line2: permanent?.address_line2 || "",
        city: permanent?.city || "",
        district_or_ward: permanent?.district_or_ward || "",
        state: permanent?.state_or_region || "",
        pincode: permanent?.postal_code || "",
      },
    });

    /* EDUCATION - show all records sorted by year descending */
    const eduDocs = data.education_documents || [];
    const sortedEdu = [...eduDocs].sort(
      (a, b) => (b.year_of_passing || 0) - (a.year_of_passing || 0),
    );
    const recentEdu = sortedEdu.map((doc, idx) => ({
      id: doc.education_document_uuid || `edu-${idx}`,
      degree: doc.degree_name || doc.education_level || "N/A",
      specialization: doc.specialization || "",
      institution: doc.institution_name || "",
      year: doc.year_of_passing || "",
    }));
    setEducationData(recentEdu);

    /* EXPERIENCE - show all records */
    const expDocs = data.experience || [];
    const recentExp = expDocs.map((doc, idx) => ({
      id: doc.experience_uuid || `exp-${idx}`,
      company: doc.company_name || "",
      role: doc.role_title || "",
      duration: `${doc.start_date || ""} - ${doc.end_date || "Present"}`,
    }));
    setExperienceData(recentExp);

    /* IDENTITY - map all documents dynamically, try every possible field name */
    const allIdentityDocs = (data.identity_documents || []).map((d) => ({
      identity_type: d.identity_type || d.document_type || "Unknown",
      document_number:
        d.identity_file_number ||
        d.document_number ||
        d.file_number ||
        d.identity_number ||
        d.number ||
        "",
    }));
    setIdentityData(allIdentityDocs);

    setLoading(false);
  }, [coreData, hrData]);

  /* fetch static master data once on mount */
  useEffect(() => {
    const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

    const fetchCountries = () =>
      api.get(`${BASE_URL}/masters/country`, { headers })
        .then((r) => setCountries(Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : []))
        .catch((err) => console.error("Failed to fetch countries:", err));

    const fetchRelations = () =>
      api.get(`${BASE_URL}/employee-upload/relations`, { headers })
        .then((r) => setRelations(Array.isArray(r.data) ? r.data : []))
        .catch((err) => { console.error("Relations fetch failed:", err); setRelations([]); });

    Promise.all([fetchCountries(), fetchRelations()]);
  }, []);

  /* fetch social links when user changes */
  useEffect(() => {
    if (!user_uuid) return;
    const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
    api.get(`${BASE_URL}/employee-details/social-links/${user_uuid}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((r) => {
        const links = r.data || [];
        setSocialData(
          links.length > 0
            ? links
            : [{ platform_name: "GitHub", url: "" }, { platform_name: "LinkedIn", url: "" }],
        );
      })
      .catch(() => console.error("Failed to fetch social links"));
  }, [user_uuid]);

  if (loading) return <LoadingSpinner text="Loading profile..." />;
  const completionSections = {
  personal:
    !!primaryData?.gender ||
    !!primaryData?.dob,

  address:
    !!addressData?.current?.line1,

  education:
    (educationData || []).length,

  experience:
    (experienceData || []).length,

  identity:
    identityData.length > 0,
};

const totalSections =
  Object.keys(completionSections).length;

const completedSections =
  Object.values(completionSections)
    .filter(Boolean).length;

const profileCompletion = Math.round(
  (completedSections / totalSections) * 100,
);

  const profileSections = [
    {
      key: "primary",
      title: "Primary Details",
      onEdit: () => setEditSection("primary"),
      content: (
        <>
          <Row label="First Name" value={primaryData?.first_name || ""} />
          <Row label="Last Name" value={primaryData?.last_name || ""} />
          <Row label="Gender" value={primaryData?.gender || ""} />
          <Row label="Date of Birth" value={primaryData?.dob || ""} />
          <Row label="Personal Email" value={primaryData?.personal_email || ""} />
          <Row label="Mobile Number" value={primaryData?.mobile_number ? `+91 ${primaryData.mobile_number}` : ""} />
          <Row label="Blood Group" value={primaryData?.blood_group || ""} />
          <Row label="Marital Status" value={primaryData?.marital_status || ""} />
          <Row
  label="Nationality"
  value={
    primaryData?.nationality_country_uuid
      ? countries.find(
          (c) => c.country_uuid === primaryData.nationality_country_uuid
        )?.country_name || "-"
      : "-"
  }
/>

<Row
  label="Country of Residence"
  value={
    primaryData?.residence_country_uuid
      ? countries.find(
          (c) => c.country_uuid === primaryData.residence_country_uuid
        )?.country_name || "-"
      : "-"
  }
/>
          {(primaryData?.emergency_contact_name ||
            primaryData?.emergency_contact_phone ||
            primaryData?.emergency_contact_relation_uuid) && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                Emergency Contact
              </div>
              <Row
                label="Contact Name"
                value={primaryData?.emergency_contact_name || ""}
              />
              <Row
                label="Contact Phone"
                value={primaryData?.emergency_contact_phone || ""}
              />
              <Row
                label="Relation"
                value={
                  primaryData?.emergency_contact_relation_uuid
                    ? relations.find(
                        (r) =>
                          r.relation_uuid ===
                          primaryData.emergency_contact_relation_uuid
                      )?.relation_name || "-"
                    : "-"
                }
              />
            </div>
          )}
        </>
      ),
    },
    {
      key: "address",
      title: "Addresses",
      onEdit: () => setEditSection("address"),
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
          <AddressBlock title="Current Address" address={addressData?.current} />
          <AddressBlock title="Permanent Address" address={addressData?.permanent} />
        </div>
      ),
    },
    {
      key: "education",
      title: "Education",
      onEdit: () => onTabChange("documents", { folder: "education", search: "" }),
      content:
        educationData.length > 0 ? (
          <div className="space-y-3">
            {educationData.map((edu, idx) => (
              <EducationCard key={edu.id || idx} edu={edu} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No education records added"
            buttonText="Add Education"
            onClick={() =>
              onTabChange("documents", { folder: "education", search: "" })
            }
          />
        ),
    },
    {
      key: "experience",
      title: "Experience",
      onEdit: () => onTabChange("documents", { folder: "experience", search: "" }),
      content:
        experienceData.length > 0 ? (
          <div className="space-y-3">
            {experienceData.map((exp, idx) => (
              <ExperienceCard key={exp.id || idx} exp={exp} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No experience records added"
            buttonText="Add Experience"
            onClick={() =>
              onTabChange("documents", { folder: "experience", search: "" })
            }
          />
        ),
    },
    {
      key: "identity",
      title: "Identity Information",
      onEdit: () => onTabChange("documents", { folder: "identity", search: "" }),
      content:
        identityData.length > 0 ? (
          <div className="space-y-3">
            {identityData.map((doc, idx) => (
              <IdentityCard key={idx} doc={doc} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No identity documents added"
            buttonText="Add Identity"
            onClick={() =>
              onTabChange("documents", { folder: "identity", search: "" })
            }
          />
        ),
    },
    {
      key: "social",
      title: "Social Media",
      onEdit: () => setEditSection("social"),
      content: Array.isArray(socialData) && socialData.length > 0 ? (        <div className="space-y-3">
          {socialData.map((link, idx) => (
            <Row
              key={idx}
              label={link.platform_name || "Link"}
              value={link.url || ""}
              isLink
            />
          ))}
        </div>
      ) : (
        <EmptyState
  title="No social media links added"
  buttonText="Add Social Links"
  onClick={() => setEditSection("social")}
/>
      ),
    },
  ];

  return (
  <div className="space-y-6">

    <div className="bg-white rounded-2xl border border-[#dfe6f3] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#081534] uppercase tracking-wide">
          Profile Completion
        </h3>

        <span className="text-sm font-semibold text-[#263383]">
          {profileCompletion}%
        </span>
      </div>

      <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full bg-[#263383] transition-all duration-500"
          style={{
            width: `${profileCompletion}%`,
          }}
        />
      </div>
    </div>
      <DynamicCardGrid
        data={profileSections}
        getKey={(section) => section.key}
        renderCard={(section) => (
          <Section title={section.title} onEdit={section.onEdit}>
            {section.content}
          </Section>
        )}
        cardsPerRow={2}
        cardsPerPage={profileSections.length}
        showPagination={false}
        gapClassName="gap-6"
        gridClassName="min-w-0"
      />

      {/* MODALS */}
      {editSection === "primary" && (
        <PrimaryModal
          data={primaryData}
          setData={setPrimaryData}
          
          onClose={() => setEditSection(null)}
          personalUuid={
            hrData?.personal_details?.personal_uuid ||
            hrData?.personal_details?.user_uuid
          }
          hrData={hrData}
          countries={countries}
          relations={relations}
          refreshData={refreshData}
        />
      )}
      {editSection === "address" && (
        <AddressModal
          data={addressData}
          setData={setAddressData}
          user_uuid={user_uuid}
          hrData={hrData}
          refreshData={refreshData}
          onClose={() => setEditSection(null)}
        />
      )}
      {editSection === "education" && (
        <EducationModal
          data={educationData}
          setData={setEducationData}
          onClose={() => setEditSection(null)}
        />
      )}
      {editSection === "experience" && (
        <ExperienceModal
          data={experienceData}
          setData={setExperienceData}
          onClose={() => setEditSection(null)}
        />
      )}
      {editSection === "identity" && (
        <IdentityModal
          data={identityData}
          setData={setIdentityData}
          onClose={() => setEditSection(null)}
        />
      )}
      {editSection === "social" && (
        <SocialModal
          data={socialData}
          setData={setSocialData}
          onClose={() => setEditSection(null)}
          refreshData={refreshData}
          user_uuid={user_uuid}
        />
      )}
    </div>
  );
}

/* ---------------- COMMON UI COMPONENTS ---------------- */

const Section = ({ title, children, onEdit }) => (
  <PageCard className="h-full min-h-[292px] overflow-hidden rounded-2xl border-[#dfe6f3] shadow-[0_8px_24px_rgba(15,23,42,0.07)]">
    <div className="flex justify-between items-center px-6 py-5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 rounded-full bg-[#263383] flex-shrink-0" />
        <h3 className="text-[13px] font-bold text-[#081534] uppercase tracking-[0.08em]">{title}</h3>
      </div>
      <Button
        onClick={onEdit}
        variant="ghost"
        size="small"
        className="text-[#263383] hover:bg-[#f4f6fc] shadow-none"
      >
        <Pencil size={11} /> Edit
      </Button>
    </div>
    <div className="border-t border-[#eef2f8] px-6 pb-7 pt-6">{children}</div>
  </PageCard>
);

const Row = ({ label, value, isLink = false }) => (
  <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-b-0">
    <span className="text-sm font-medium text-gray-500">{label}</span>
    {isLink && value ? (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline text-right"
      >
        {value}
      </a>
    ) : (
      <span className="text-sm text-gray-800 text-right max-w-[60%] break-words">
        {value || "-"}
      </span>
    )}
  </div>
);

const EmptyState = ({
  title,
  buttonText,
  onClick,
}) => (
  <div className="flex flex-col items-center justify-center py-10 text-center">
    <AlertTriangle
      size={32}
      className="text-gray-300 mb-3"
    />

    <p className="text-sm text-gray-500 mb-4">
      {title}
    </p>

    <button
      onClick={onClick}
      className="px-4 py-2 rounded-lg bg-[#263383] text-white text-sm hover:bg-[#081534]"
    >
      {buttonText}
    </button>
  </div>
);

const AddressBlock = ({ title, address }) => (
  <div className="flex flex-col">
    <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">
      {title}
    </span>
    {address?.line1 ? (
      <>
        <span className="text-[15px] font-medium text-[#081534] leading-relaxed">
          {address.line1}
        </span>
        {address.line2 && (
          <span className="text-[15px] font-medium text-[#081534] leading-relaxed">
            {address.line2}
          </span>
        )}
        <span className="text-[15px] font-medium text-[#081534] leading-relaxed">
          {[address.city, address.state, address.country, address.pincode]
            .filter(Boolean)
            .join("  ")}
        </span>
      </>
    ) : (
      <span className="text-base text-slate-400">No address added</span>
    )}
  </div>
);

/* ---- shared info field used by the structured cards below ---- */
const InfoField = ({ label, value }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none truncate">
      {label}
    </span>
    <span className="text-sm font-semibold text-[#081534] leading-snug break-words">
      {value || "-"}
    </span>
  </div>
);

const EducationCard = ({ edu }) => (
  <div className="rounded-xl border border-[#dfe6f3] bg-[#f8fbff] px-4 py-4 shadow-[0_1px_4px_rgba(38,51,131,0.06)]">
    <p className="text-[14px] font-bold text-[#081534] leading-snug">
      {edu.degree || "N/A"}
    </p>
    {edu.specialization && (
      <p className="text-[12px] text-gray-400 mt-0.5 mb-3 leading-snug">
        {edu.specialization}
      </p>
    )}
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 ${edu.specialization ? "" : "mt-3"}`}>
      {edu.institution && (
        <InfoField label="University / College" value={edu.institution} />
      )}
      {edu.year && <InfoField label="Year of Passing" value={String(edu.year)} />}
    </div>
  </div>
);

const ExperienceCard = ({ exp }) => (
  <div className="rounded-xl border border-[#dfe6f3] bg-[#f8fbff] px-4 py-4 shadow-[0_1px_4px_rgba(38,51,131,0.06)]">
    <p className="text-[14px] font-bold text-[#081534] leading-snug mb-3">
      {exp.role || "N/A"}
    </p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      {exp.company && <InfoField label="Company" value={exp.company} />}
      {exp.duration && <InfoField label="Duration" value={exp.duration} />}
    </div>
  </div>
);

const DOC_CATEGORY = {
  aadhaar: "Address Proof",
  aadhar: "Address Proof",
  pan: "Payroll",
  passport: "International Travel",
  driving: "Driving Licence",
  licence: "Driving Licence",
  license: "Driving Licence",
};

const getDocCategory = (type) => {
  const lower = (type || "").toLowerCase();
  const match = Object.keys(DOC_CATEGORY).find((k) => lower.includes(k));
  return match ? DOC_CATEGORY[match] : "Identity Document";
};

const IdentityCard = ({ doc }) => (
  <div className="rounded-xl border border-[#dfe6f3] bg-[#f8fbff] px-4 py-4 shadow-[0_1px_4px_rgba(38,51,131,0.06)]">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
      {getDocCategory(doc.identity_type)}
    </p>
    <div className="flex items-center gap-2 mb-4">
      <span className="inline-flex items-center px-3 py-1 rounded-lg bg-[#e8edf8] text-[12px] font-semibold text-[#263383] leading-none">
        {doc.identity_type}
      </span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
      <InfoField label="Document Number" value={doc.document_number} />
    </div>
  </div>
);

const Input = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
}) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center">
      {label}{" "}
      {required && (
        <span className="text-red-500 ml-1 mt-1 text-lg leading-none">*</span>
      )}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      placeholder={`Enter ${label.toLowerCase()}`}
      className={`w-full border-gray-300 border rounded-xl px-4 py-2.5 text-sm outline-none transition-all placeholder-gray-400 focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 
      ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white hover:border-gray-400"}`}
    />
  </div>
);

const AddressInput = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  disabled = false,
  required = false,
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center">
      {label}{" "}
      {required && (
        <span className="text-red-500 ml-1 mt-1 text-lg leading-none">*</span>
      )}
    </label>
    <input
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none transition-all focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 
      ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white hover:border-gray-400"}`}
    />
  </div>
);

const Select = ({
  label,
  name,
  value,
  onChange,
  options,
  disabled = false,
  required = false,
}) => (
  <div>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center">
      {label}{" "}
      {required && (
        <span className="text-red-500 ml-1 mt-1 text-lg leading-none">*</span>
      )}
    </label>
    <select
      name={name}
      value={value || ""}
      onChange={onChange}
      disabled={disabled}
      required={required}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10
      ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed" : "bg-white hover:border-gray-400 cursor-pointer text-gray-900"}`}
    >
      <option value="" disabled className="text-gray-400">
        Select {label}
      </option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  </div>
);

const ModalWrapper = ({
  title,
  onClose,
  onSubmit,
  children,
  saving = false,
  contentClassName = "px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7 overflow-y-auto bg-gray-50/50",
  formClassName = "bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100",
}) => (
  <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
    <form
      onSubmit={
        onSubmit ||
        ((e) => {
          e.preventDefault();
          onClose();
        })
      }
      className={formClassName}
    >
      <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white shrink-0">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none"
        >
          <X size={20} />
        </button>
      </div>
      <div className={contentClassName}>{children}</div>
      <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#263383] transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#263383] shadow-sm transition-all focus:ring-offset-1 ${
            saving
              ? "bg-[#263383]/50 cursor-not-allowed"
              : "bg-[#263383] hover:bg-[#081534]"
          }`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  </div>
);

/* ---------------- INDIVIDUAL MODALS ---------------- */

const PrimaryModal = ({
  data,
  setData,
  onClose,
  personalUuid,
  hrData,
  refreshData,
  countries,
  relations,
}) => {
  const { employee_uuid } = useParams();
  const [localData, setLocalData] = useState({ ...data });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();

    if (!personalUuid) {
      showStatusToast(
        "Unable to save: employee personal details not found",
        "error",
      );
      return;
    }
    
    setSaving(true);
    try {
      const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
      const personal = hrData?.personal_details || {};
      const core = hrData?.offer || {}; // Actually coreData is passed to ProfilePage

      // 1. Update Personal Details
      const personalPayload = {
        date_of_birth: localData.dob || "",
        gender: localData.gender || "",
        marital_status: localData.marital_status || "",
        blood_group: localData.blood_group || "",
        nationality_country_uuid: localData.nationality_country_uuid || "",
        residence_country_uuid: localData.residence_country_uuid || "",
        emergency_contact_name: localData.emergency_contact_name || "",
        emergency_contact_phone: localData.emergency_contact_phone || "",
        emergency_contact_relation_uuid:
          localData.emergency_contact_relation_uuid || null,
      };

      const authHeader = { Authorization: `Bearer ${localStorage.getItem("token")}` };

      const personalTask = api.put(
        `${BASE_URL}/employee-details/${personalUuid}`,
        personalPayload,
        { headers: authHeader },
      );

      // 2. Update Core Details
      const corePayload = {
        first_name: localData.first_name,
        last_name: localData.last_name,
        date_of_birth: localData.dob,
        gender: localData.gender,
        marital_status: localData.marital_status,
        blood_group: localData.blood_group,
        contact_number: localData.mobile_number || "",
        department_uuid: personal.department_uuid || null,
        designation_uuid: personal.designation_uuid || null,
        location: personal.location || "",
        employment_type: personal.employment_type || "Full-Time",
        joining_date: personal.joining_date || null,
        employment_status: personal.employment_status || "Probation",
        work_mode: personal.work_mode || "Office",
        total_experience: personal.total_experience || 0,
      };

      const coreTask = api.put(
        `${BASE_URL}/permanent-employee/core-employee-details/${employee_uuid}`,
        corePayload,
        { headers: authHeader },
      );

      await Promise.all([personalTask, coreTask]);

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
    <ModalWrapper
      title="Primary Details"
      onClose={onClose}
      onSubmit={handleSave}
      saving={saving}
      formClassName="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100"
      contentClassName="px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 overflow-y-auto pr-2 bg-gray-50/50"
    >
      {/* LEFT */}
      <Input
        required
        label="First Name"
        name="first_name"
        value={localData.first_name}
        onChange={(e) => setLocalData({ ...localData, first_name: e.target.value })}
      />
      {/* RIGHT */}
      <Input
        required
        label="Last Name"
        name="last_name"
        value={localData.last_name}
        onChange={(e) => setLocalData({ ...localData, last_name: e.target.value })}
      />
      {/* LEFT */}
      <Select
        label="Gender"
        name="gender"
        value={localData.gender}
        onChange={(e) => setLocalData({ ...localData, gender: e.target.value })}
        options={["Male", "Female", "Other"]}
        required
      />
      {/* RIGHT */}
      <Input
        required
        label="Date of Birth"
        type="date"
        name="dob"
        value={localData.dob}
        onChange={(e) => setLocalData({ ...localData, dob: e.target.value })}
      />
      {/* LEFT */}
      <Input
        label="Personal Email"
        type="email"
        name="personal_email"
        value={localData.personal_email || ""}
        onChange={(e) => setLocalData({ ...localData, personal_email: e.target.value })}
      />
      {/* RIGHT */}
      <Input
        label="Mobile Number"
        name="mobile_number"
        value={localData.mobile_number || ""}
        onChange={(e) => setLocalData({ ...localData, mobile_number: e.target.value })}
      />
      {/* LEFT */}
      <Select
        label="Blood Group"
        name="blood_group"
        value={localData.blood_group}
        onChange={(e) => setLocalData({ ...localData, blood_group: e.target.value })}
        options={["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]}
      />
      {/* RIGHT */}
      <Select
        label="Marital Status"
        name="marital_status"
        value={localData.marital_status}
        onChange={(e) => setLocalData({ ...localData, marital_status: e.target.value })}
        options={["Single", "Married", "Divorced", "Widowed"]}
      />
      {/* LEFT: Nationality */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
          Nationality
        </label>
        <select
          value={localData.nationality_country_uuid || ""}
          onChange={(e) => setLocalData({ ...localData, nationality_country_uuid: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 bg-white hover:border-gray-400 cursor-pointer text-gray-900"
        >
          <option value="">Select Nationality</option>
          {countries.map((country) => (
            <option key={country.country_uuid} value={country.country_uuid}>
              {country.country_name}
            </option>
          ))}
        </select>
      </div>
      {/* RIGHT: Residence Country */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
          Residence Country
        </label>
        <select
          value={localData.residence_country_uuid || ""}
          onChange={(e) => setLocalData({ ...localData, residence_country_uuid: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 bg-white hover:border-gray-400 cursor-pointer text-gray-900"
        >
          <option value="">Select Residence Country</option>
          {countries.map((country) => (
            <option key={country.country_uuid} value={country.country_uuid}>
              {country.country_name}
            </option>
          ))}
        </select>
      </div>

      {/* FULL WIDTH: Emergency Contact divider */}
      <div className="md:col-span-2 mt-2">
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Emergency Contact
          </h4>
        </div>
      </div>

      {/* LEFT: Emergency Contact Name */}
      <Input
        label="Emergency Contact Name"
        name="emergency_contact_name"
        value={localData.emergency_contact_name || ""}
        onChange={(e) => setLocalData({ ...localData, emergency_contact_name: e.target.value })}
      />
      {/* RIGHT: Emergency Contact Phone */}
      <Input
        label="Emergency Contact Phone"
        name="emergency_contact_phone"
        value={localData.emergency_contact_phone || ""}
        onChange={(e) => setLocalData({ ...localData, emergency_contact_phone: e.target.value })}
      />
      {/* LEFT: Emergency Relation */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
          Emergency Relation
        </label>
        <select
          value={localData.emergency_contact_relation_uuid || ""}
          onChange={(e) => setLocalData({ ...localData, emergency_contact_relation_uuid: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none transition-all focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 bg-white hover:border-gray-400 cursor-pointer text-gray-900"
        >
          <option value="">Select Relation</option>
          {relations.map((relation) => (
            <option key={relation.relation_uuid} value={relation.relation_uuid}>
              {relation.relation_name}
            </option>
          ))}
        </select>
      </div>
    </ModalWrapper>
  );
};

const AddressModal = ({ data, setData, user_uuid, onClose, hrData, refreshData  }) => {
 
  const [localData, setLocalData] = useState({ ...data });
  const [saving, setSaving] = useState(false);

  const updateCurrent = (field, value) => {
    setLocalData((prev) => {
      const nextData = {
        ...prev,
        current: { ...prev.current, [field]: value },
      };
      if (nextData.sameAsCurrent) {
        nextData.permanent = { ...nextData.permanent, [field]: value };
      }
      return nextData;
    });
  };

  const updatePermanent = (field, value) => {
    setLocalData((prev) => ({
      ...prev,
      permanent: { ...prev.permanent, [field]: value },
    }));
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

  try {
    setSaving(true);
    const BASE_URL =
  window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
  const addresses = Array.isArray(hrData?.addresses)
  ? hrData.addresses
  : [];

    const createPayload = (addr, type) => {
  const existingAddress = addresses.find(
    (a) => a.address_type === type
  );

  return {
    user_uuid: user_uuid,

    country_uuid:
      existingAddress?.country_uuid,

    address_type: type,

    address_line1: addr.line1 || "",

    address_line2: addr.line2 || "",

    city: addr.city || "",

    district_or_ward:
      addr.district_or_ward || "",

    state_or_region:
      addr.state || "",

    postal_code: addr.pincode || "",
  };
};
   

const currentAddressRow =
  addresses.find(
    (a) => a.address_type === "current"
  );

const permanentAddressRow =
  addresses.find(
    (a) => a.address_type === "permanent"
  );
  if (!currentAddressRow || !permanentAddressRow) {
  showStatusToast(
    "Address rows not found",
    "error"
  );

  return;
}
    const currentPayload = createPayload(
      localData.current,
      "current"
    );

    const permanentPayload = createPayload(
      localData.sameAsCurrent
        ? localData.current
        : localData.permanent,
      "permanent"
    );

    const addrHeaders = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    };

    await Promise.all([
      api.put(
        `${BASE_URL}/employee-details/address/${currentAddressRow.address_uuid}`,
        currentPayload,
        addrHeaders,
      ),
      api.put(
        `${BASE_URL}/employee-details/address/${permanentAddressRow.address_uuid}`,
        permanentPayload,
        addrHeaders,
      ),
    ]);

    showStatusToast(
      "Address updated successfully",
      "success"
    );

    refreshData();

    onClose();
  } catch (err) {
    console.error(err);

    showStatusToast(
      "Failed to update address",
      "error"
    );
  } finally {
    setSaving(false);
  }
};
  const states = [
    "Andhra Pradesh",
    "Karnataka",
    "Maharashtra",
    "Tamil Nadu",
    "Telangana",
  ];

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <form
        onSubmit={handleSave}
        className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100"
      >
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white shrink-0">
          <h3 className="text-lg font-bold text-gray-900">Addresses</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-7 overflow-y-auto bg-gray-50/50">
          <div className="flex flex-col bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1 md:col-span-1">
            <div className="text-gray-900 mb-5 text-sm font-bold border-b border-gray-100 pb-3 uppercase tracking-wider">
              CURRENT ADDRESS
            </div>
            <div className="space-y-4">
          
              <AddressInput
                required
                label="Address Line 1"
                value={localData.current.line1}
                onChange={(e) => updateCurrent("line1", e.target.value)}
              />
              <AddressInput
                label="Address Line 2"
                value={localData.current.line2}
                onChange={(e) => updateCurrent("line2", e.target.value)}
              />
              <AddressInput
                required
                label="City"
                value={localData.current.city}
                onChange={(e) => updateCurrent("city", e.target.value)}
              />
              <AddressInput
                required
                label="District/Ward"
                value={localData.current.district_or_ward}
                onChange={(e) =>
                  updateCurrent("district_or_ward", e.target.value)
                }
              />
              <Select
                required
                label="State"
                value={localData.current.state}
                onChange={(e) => updateCurrent("state", e.target.value)}
                options={states}
              />
              <AddressInput
                required
                label="Pincode"
                value={localData.current.pincode}
                onChange={(e) => updateCurrent("pincode", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col bg-white p-6 rounded-xl border border-gray-100 shadow-sm col-span-1 md:col-span-1 relative">
            <div className="text-gray-900 mb-5 text-sm font-bold border-b border-gray-100 pb-3 uppercase tracking-wider">
              PERMANENT ADDRESS
            </div>
            <div className="space-y-4 flex-grow">
                        <AddressInput
                required={!localData.sameAsCurrent}
                label="Address Line 1"
                value={localData.permanent.line1}
                disabled={localData.sameAsCurrent}
                onChange={(e) => updatePermanent("line1", e.target.value)}
              />
              <AddressInput
                label="Address Line 2"
                value={localData.permanent.line2}
                disabled={localData.sameAsCurrent}
                onChange={(e) => updatePermanent("line2", e.target.value)}
              />
              <AddressInput
                required={!localData.sameAsCurrent}
                label="City"
                value={localData.permanent.city}
                disabled={localData.sameAsCurrent}
                onChange={(e) => updatePermanent("city", e.target.value)}
              />
              <AddressInput
                required={!localData.sameAsCurrent}
                label="District/Ward"
                value={localData.permanent.district_or_ward}
                disabled={localData.sameAsCurrent}
                onChange={(e) =>
                  updatePermanent("district_or_ward", e.target.value)
                }
              />
              <Select
                required={!localData.sameAsCurrent}
                label="State"
                value={localData.permanent.state}
                disabled={localData.sameAsCurrent}
                onChange={(e) => updatePermanent("state", e.target.value)}
                options={states}
              />
              <AddressInput
                required={!localData.sameAsCurrent}
                label="Pincode"
                value={localData.permanent.pincode}
                disabled={localData.sameAsCurrent}
                onChange={(e) => updatePermanent("pincode", e.target.value)}
              />

              <label className="flex items-center gap-2 mt-5 p-3 bg-gray-50 rounded-lg cursor-pointer text-gray-700 transition-colors hover:bg-gray-100 border border-gray-200">
                <input
                  type="checkbox"
                  checked={localData.sameAsCurrent}
                  onChange={toggleSameAsCurrent}
                  className="w-4 h-4 text-[#263383] border-gray-300 rounded focus:ring-[#263383]"
                />
                <span className="text-sm font-medium">
                  Same as Current Address
                </span>
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#263383] transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-6 py-2.5 text-sm font-medium text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-[#263383] shadow-sm transition-all focus:ring-offset-1 ${
              saving
                ? "bg-[#263383]/50 cursor-not-allowed"
                : "bg-[#263383] hover:bg-[#081534]"
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
    <Input
      required
      label="Degree"
      name="degree"
      value={data.degree}
      onChange={(e) => setData({ ...data, degree: e.target.value })}
    />
    <Input
      label="Specialization"
      name="specialization"
      value={data.specialization}
      onChange={(e) => setData({ ...data, specialization: e.target.value })}
    />
    <Input
      required
      label="Institution"
      name="institution"
      value={data.institution}
      onChange={(e) => setData({ ...data, institution: e.target.value })}
    />
  </ModalWrapper>
);

const ExperienceModal = ({ data, setData, onClose }) => (
  <ModalWrapper title="Experience" onClose={onClose}>
    <Input
      required
      label="Company"
      name="company"
      value={data.company}
      onChange={(e) => setData({ ...data, company: e.target.value })}
    />
    <Input
      required
      label="Role"
      name="role"
      value={data.role}
      onChange={(e) => setData({ ...data, role: e.target.value })}
    />
  </ModalWrapper>
);

const IdentityModal = ({ data, setData, onClose }) => (
  <ModalWrapper title="Identity Information" onClose={onClose}>
    <Input
      required
      label="Aadhaar Number"
      name="aadhaar"
      value={data.aadhaar}
      onChange={(e) => setData({ ...data, aadhaar: e.target.value })}
    />
    <Input
      required
      label="PAN Number"
      name="pan"
      value={data.pan}
      onChange={(e) => setData({ ...data, pan: e.target.value })}
    />
  </ModalWrapper>
);

const SocialModal = ({ data, setData, onClose, refreshData, user_uuid }) => {
  const [links, setLinks] = useState(Array.isArray(data) ? [...data] : []);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    index: null,
  });

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
        const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
        await api.delete(
          `${BASE_URL}/employee-details/social-links/${linkToDelete.social_link_uuid}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
        );

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
      const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;
      const axiosHeaders = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      };

      const tasks = [];

      // 1. PROCESS links (Add, Update, or Auto-Delete if empty)
      links.forEach((link) => {
        const hasUrl = !!link.url?.trim();

        if (link.social_link_uuid) {
          if (!hasUrl) {
            // Existing link cleared -> DELETE it
            tasks.push(
              api.delete(
                `${BASE_URL}/employee-details/social-links/${link.social_link_uuid}`,
                axiosHeaders,
              ),
            );
          } else {
            // Existing link modified -> PUT it
            tasks.push(
              api.put(
                `${BASE_URL}/employee-details/social-links/${link.social_link_uuid}`,
                { platform_name: link.platform_name || "Other", url: link.url, user_uuid },
                axiosHeaders,
              ),
            );
          }
        } else if (hasUrl) {
          // New link with URL -> POST it
          tasks.push(
            api.post(
              `${BASE_URL}/employee-details/social-links`,
              { platform_name: link.platform_name || "Other", url: link.url, user_uuid },
              axiosHeaders,
            ),
          );
        }
      });

      if (tasks.length > 0) {
        await Promise.all(tasks);
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
      <form
        onSubmit={handleSave}
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100"
      >
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-100 bg-white shrink-0">
          <h3 className="text-xl font-medium text-gray-800">
            Edit Social Media Links
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors focus:outline-none"
          >
            <X size={24} strokeWidth={1.5} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6 bg-white">
          {links.length > 0 ? (
            <div className="space-y-5">
              {links.map((link, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row gap-4 items-end sm:items-center bg-gray-50/40 p-5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                      Platform Name
                    </label>
                    <input
                      value={link.platform_name}
                      onChange={(e) =>
                        updateLink(idx, "platform_name", e.target.value)
                      }
                      placeholder="e.g. GitHub"
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 outline-none transition-all"
                    />
                  </div>
                  <div className="flex-[2] space-y-1.5 w-full">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">
                      Profile URL / Link
                    </label>
                    <input
                      value={link.url}
                      onChange={(e) => updateLink(idx, "url", e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 outline-none transition-all"
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
              <p className="text-sm text-gray-400 font-medium">
                No links added. Click below to add one.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center gap-2 text-[#263383] text-sm font-semibold hover:bg-[#263383]/5 px-4 py-2.5 rounded-xl transition-all"
          >
            + Add Another Platform
          </button>
        </div>

        <div className="flex justify-end gap-3 px-8 py-5 border-t border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className={`px-8 py-2.5 text-sm font-semibold text-white rounded-xl shadow-md transition-all ${
              saving
                ? "bg-[#263383]/50 cursor-not-allowed"
                : "bg-[#263383] hover:bg-[#081534] hover:scale-[1.02]"
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
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Delete Link?
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed px-2">
                  Are you sure you want to remove this social media link? This
                  action will take effect once you save your changes.
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
