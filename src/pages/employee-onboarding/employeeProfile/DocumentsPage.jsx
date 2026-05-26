
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { showStatusToast } from "../../../components/toastfy/toast";
import FilterListbox from "../../../components/filter/FilterListbox";
import {
  FileText,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Award,
  Lock,
  Eye,
  Upload,
  X,
  Download,
  ExternalLink,
  CheckCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import Select from "react-select";

/* ─── Employment-type → relevant path keys ───────────────────────────── */
const RELEVANT_EXP_PATHS = {
  "full-time":  ["payslip_path", "exp_certificate_path"],
  "intern":     ["internship_certificate_path"],
  "contract":   ["contract_aggrement_path"],
  "part-time":  ["exp_certificate_path"],
  "freelance":  ["exp_certificate_path"],
};

const EXP_DOC_LABELS = {
  payslip_path:                  "Payslip",
  exp_certificate_path:          "Experience Certificate",
  internship_certificate_path:   "Internship Certificate",
  contract_aggrement_path:       "Contract Agreement",
};

/* Maps raw backend doc_type strings → canonical path key */
const NESTED_TYPE_TO_PATH_KEY = {
  payslip_path:                "payslip_path",
  payslip:                     "payslip_path",
  exp_certificate_path:        "exp_certificate_path",
  exp_certificate:             "exp_certificate_path",
  experience_certificate:      "exp_certificate_path",
  internship_certificate_path: "internship_certificate_path",
  internship_certificate:      "internship_certificate_path",
  contract_aggrement_path:     "contract_aggrement_path",
  contract_agreement_path:     "contract_aggrement_path",
  contract_agreement:          "contract_aggrement_path",
};

/**
 * Returns only the documents relevant to the given employment type.
 * Passing all historically-uploaded paths is safe — irrelevant ones are
 * silently ignored, preventing stale docs from a prior employment type.
 */
const buildExperienceDocuments = (employmentType, paths) => {
  const type = (employmentType || "").toLowerCase().trim();
  const relevantKeys = RELEVANT_EXP_PATHS[type] || [];
  return relevantKeys
    .map((key) => {
      const filePath = paths[key] || "";
      if (!filePath) return null;
      return { doc_type: EXP_DOC_LABELS[key] || key, file_path: filePath };
    })
    .filter(Boolean);
};

export default function DocumentsPage({ employee, user_uuid, hrData = {}, identityTypes = [], config = null, rawCertifications = [], refreshCertifications }) {
  const { employee_uuid } = useParams();
  
const [degreeOptions, setDegreeOptions] = useState([]);
const [educationMasters, setEducationMasters] = useState([]);
const [educationTypes, setEducationTypes] = useState([]);
const [formattedEducationTypes, setFormattedEducationTypes] = useState([]);

  const [educationDocs, setEducationDocs] = useState([]);
  const [experienceDocs, setExperienceDocs] = useState([]);
  const [identityDocs, setIdentityDocs] = useState([]);
  const [certificationDocs, setCertificationDocs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState("education");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDoc, setLoadingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  // 🔥 NEW STATES FOR CERTIFICATIONS
  const [skills, setSkills] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [customSkill, setCustomSkill] = useState("");

  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [filteredProviders, setFilteredProviders] = useState([]);

  const [allCertificates, setAllCertificates] = useState([]);
  const [filteredCertificates, setFilteredCertificates] = useState([]);
  const [selectedCertificate, setSelectedCertificate] = useState(null);
  const [experienceFiles, setExperienceFiles] =
  useState({
    payslip: null,
    exp_certificate: null,
    internship_certificate: null,
    contract_agreement: null,
  });
useEffect(() => {

  if (
    educationTypes.length > 0 &&
    educationMasters.length > 0
  ) {

    const formattedMappings =
      educationTypes.map((item) => ({

        mapping_uuid:
          item.mapping_uuid || "",

        education_name:
          item.education_name || "",

        document_name:
          item.document_name ||
          "Upload File",

        // ✅ NOW THIS WORKS
        education_uuid:
          educationMasters.find(
            e =>
              String(
                e.education_name
              ).trim() ===
              String(
                item.education_name
              ).trim()
          )?.education_uuid || "",
      }));

    console.log(
      "FINAL EDUCATION TYPES",
      formattedMappings
    );

    setEducationTypes(
      formattedMappings
    );
  }

}, [educationMasters]);
  /* ---- Sync folder and search from prop (deep linking) ---- */
  useEffect(() => {
    if (config?.folder) {
      setActiveFolder(config.folder);
    }
    if (config?.search !== undefined) {
      setSearchQuery(config.search || "");
    }
  }, [config]);

  /* ---- Confirm Modal State ---- */
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  /* ---- Preview Modal State ---- */
  const [previewModal, setPreviewModal] = useState({
    open: false,
    url: null,
    title: "",
    type: "", // "image", "pdf", "other"
  });

  /* ---- Upload Modal State ---- */
  const [uploadModal, setUploadModal] = useState({
    open: false,
    category: "", // "education", "experience", "identity", "certifications"
    docId: null, // if replacing a specific document
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({});
  const fileInputRef = useRef(null);
  useEffect(() => {

    if (!hrData) return;

    const latestDocs =
      hrData.identity_documents || [];

    console.log(
      "UPDATED HR DATA",
      latestDocs
    );

  }, [hrData]);

  useEffect(() => {
   
   
    // Use pre-fetched data from parent — no API calls needed
    const data = hrData || {};
    console.log(
  "HR EDUCATION DOCS",
  hrData.education_documents
);
    
    /* ---- Map Education Documents ---- */
    const eduDocs =
  (data.education_documents || []).map((doc, idx) => ({

    id:
      doc.document_uuid ||
      `edu-${idx}`,

    document_uuid:
      doc.document_uuid || "",

    mapping_uuid:
      doc.mapping_uuid || "",
    education_level:
      doc.education_level || "",
      
    education_uuid:
      educationMasters.find(
        e =>
          e.education_name ===
          doc.education_name
      )?.education_uuid || "",

    education_name:
      doc.education_name || "",
    document_name:
      doc.document_name || "",

    degree_uuid:
      doc.degree_uuid || "",

    degree:
      doc.degree_name || "NA",

    specialization:
      doc.specialization || "NA",

    institution:
      doc.institution_name || "NA",

    institute_location:
      doc.institute_location || "NA",

    education_mode:
      doc.education_mode || "NA",

    start_year:
      doc.start_year || "NA",

    year_of_passing:
      doc.year_of_passing || "NA",

    percentage_cgpa:
      doc.percentage_cgpa || "NA",

    delay_reason:
      doc.delay_reason || "",

    file_path:
      doc.file_path || null,

    documents:
      doc.file_path
        ? [
            {
              doc_type:
                "education_certificate",

              file_path:
                doc.file_path,
            },
          ]
        : [],
}));
    setEducationDocs(eduDocs);

    /* ---- Map Experience Documents ---- */
    // Collect all available paths from either flat keys or nested array,
    // then delegate to buildExperienceDocuments() which filters by employment type.
    const resolveExpPaths = (doc) => {
      const paths = {
        payslip_path:                doc.payslip_path || "",
        exp_certificate_path:        doc.exp_certificate_path || "",
        internship_certificate_path: doc.internship_certificate_path || "",
        contract_aggrement_path:     doc.contract_aggrement_path || doc.contract_agreement_path || "",
      };

      if (Object.values(paths).some(Boolean)) return paths;

      // Format B: backend returns a nested documents array
      const nested = doc.experience_documents || doc.experience_files || doc.documents || [];
      if (Array.isArray(nested)) {
        nested.forEach((d) => {
          const rawType = (d.doc_type || d.document_type || d.type || "")
            .toLowerCase().trim().replace(/\s+/g, "_");
          const filePath = d.file_path || d.path || d.url || "";
          if (!filePath) return;
          const pathKey = NESTED_TYPE_TO_PATH_KEY[rawType];
          if (pathKey && !paths[pathKey]) paths[pathKey] = filePath;
        });
      }

      return paths;
    };

    const expDocs = (data.experience || []).map((doc) => {
      const paths = resolveExpPaths(doc);
      const documents = buildExperienceDocuments(doc.employment_type, paths);
      // Resolve flat paths for the prefill modal (handle both spellings)
      return {
        id: doc.experience_uuid,
        experience_uuid: doc.experience_uuid,
        company: doc.company_name || "",
        company_name: doc.company_name || "",
        role: doc.role_title || "",
        role_title: doc.role_title || "",
        employment_type: doc.employment_type || "",
        start_date: doc.start_date || "",
        end_date: doc.end_date || "",
        description: doc.description || "",
        payslip_path:                paths.payslip_path,
        exp_certificate_path:        paths.exp_certificate_path,
        internship_certificate_path: paths.internship_certificate_path,
        contract_aggrement_path:     paths.contract_aggrement_path,
        documents,
      };
    });


setExperienceDocs(expDocs);
    
    /* ---- Map Identity Documents ---- */

const countryIdentityTypes = identityTypes || [];

const existingDocs = data.identity_documents || [];
console.log(
  "LATEST DOCS",
  existingDocs
);

const idDocs = countryIdentityTypes.map((typeObj, idx) => {

  const existingDoc = existingDocs.find((doc) => {

  // ✅ UUID MATCH
  if (
    doc.identity_type_uuid ===
    typeObj.identity_type_uuid
  ) {
    return true;
  }

  // ✅ NAME MATCH
  if (
    (doc.identity_type || "")
      .toLowerCase()
      .trim()
    ===
    (typeObj.identity_type_name || "")
      .toLowerCase()
      .trim()
  ) {
    return true;
  }

  return false;
});
  return {
    id:
      existingDoc?.document_uuid ||
      `identity-${idx}`,

    document_uuid:
      existingDoc?.document_uuid || null,

    // ✅ IMPORTANT
    mapping_uuid:
      typeObj.mapping_uuid,

    identity_type_uuid:
      typeObj.identity_type_uuid,

    type:
  existingDoc?.identity_type ||
  typeObj.identity_type_name,

    number:
      existingDoc?.identity_file_number || "",

    name:
      existingDoc?.name_on_document ||
      employee?.name ||
      "",

    file_path:
      existingDoc?.file_path || null,

    isExisting:
      !!existingDoc,

    documents:
      existingDoc?.file_path
        ? [
            {
              doc_type:
                typeObj.identity_type_name,

              file_path:
                existingDoc.file_path,
            },
          ]
        : [],
  };
});
setIdentityDocs(idDocs);

setLoading(false);

}, [
  hrData,
  identityTypes,
  employee
]);
useEffect(() => {

  const fetchEducationTypes = async () => {

    try {

      const BASE_URL =
        window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

      const country_uuid =
        hrData?.personal_details?.nationality_country_uuid ||
        hrData?.personal_details?.residence_country_uuid;

const response = await fetch(
  `${BASE_URL}/education/country-mapping/${country_uuid}`,
        {
          headers: {
            Authorization:
              `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const result = await response.json();

console.log(
  "EDUCATION TYPES API",
  result
);

// ✅ HANDLE DIFFERENT RESPONSE SHAPES
const mappings =
  result.data ||
  result.results ||
  result.mappings ||
  result ||
  [];
  console.log(
  "FINAL EDUCATION TYPES",
  mappings
);

const formattedMappings =
  (Array.isArray(mappings)
    ? mappings
    : []
  ).map((item) => ({

    mapping_uuid:
      item.mapping_uuid ||
      "",

    // ✅ IMPORTANT FIX
    education_uuid:
      item.education_master_uuid ||
      item.education_uuid ||
      item.education?.education_uuid ||
      "",

    education_name:
      item.education_name ||
      item.education?.education_name ||
      "",

    document_name:
      item.document_name ||
      "Upload File",
  }));

console.log(
  "FORMATTED EDUCATION TYPES",
  formattedMappings
);

setFormattedEducationTypes(formattedMappings);
console.log(
  "FINAL EDUCATION TYPES",
  formattedMappings
);
    } catch (err) {

      console.error(
        "Education Types Error",
        err
      );
    }
  };

  fetchEducationTypes();

}, []);
 /* ---- Map Certifications ---- */

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

        const res = await fetch(`${BASE_URL}/api/skills/active`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const result = await res.json();

        const formatted = (result.data || []).map((s) => ({
          value: s.id,
          label: s.name,
        }));

        formatted.push({ value: "other", label: "Other" });

        setSkills(formatted);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSkills();
  }, []);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {

        const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

        const res = await fetch(`${BASE_URL}/api/certificates`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });

        const result = await res.json();

        setAllCertificates(result.data || []);

        const providerSet = new Set();
        (result.data || []).forEach((cert) => {
          if (cert.providerName) {
            providerSet.add(cert.providerName);
          }
        });

        const formattedProviders = [...providerSet].map((p) => ({
          value: p,
          label: p,
        }));

        formattedProviders.push({ value: "other", label: "Other" });

        setProviders(formattedProviders);
      } catch (err) {
        console.error(err);
      }
    };

    fetchCertificates();
  }, []);
  useEffect(() => {
    if (!selectedSkill) {
      setFilteredCertificates([]);
      return;
    }

    const filtered = allCertificates.filter(
      (cert) => cert.skillId === selectedSkill.value
    );

    const unique = Array.from(
      new Map(filtered.map((c) => [c.certificateName, c])).values()
    );

    setFilteredCertificates(
      unique.map((c) => ({
        value: c.certificateId,
        label: c.certificateName,
      }))
    );
  }, [selectedSkill]);
  useEffect(() => {
    if (!selectedCertificate) {
      setFilteredProviders([]);
      setSelectedProvider(null);
      return;
    }

    const providers = allCertificates
      .filter(cert => cert.certificateId === selectedCertificate.value)
      .map(cert => cert.providerName)
      .filter(Boolean);

    const uniqueProviders = [...new Set(providers)];

    const formatted = uniqueProviders.map(p => ({
      value: p,
      label: p,
    }));

    formatted.push({ value: "other", label: "Other" });

    setFilteredProviders(formatted);

  }, [selectedCertificate, allCertificates]);

  
  useEffect(() => {
    if (!rawCertifications || !skills.length) return;

    const formatted = rawCertifications.map((doc) => {
      // ✅ MAP SKILL NAME
      const skillObj = skills.find(
        (s) => s.value === doc.certificate?.skillId
      );

      // ✅ MAP PROFICIENCY NAME
      return {
        id: doc.id,
        certificateId: doc.certificateId,
        skillId: doc.certificate?.skillId,
        skillName: skillObj?.label || "NA",
        name: doc.certificate?.certificateName || "NA",
        issuing_org: doc.certificate?.providerName || "NA",
        proficiencyId: doc.proficiencyId,
        proficiencyName: "NA",
        issue_date: doc.issuedDate,
        expiry_date: doc.expiryDate || "No Expiry",
        documents: doc.fileName
          ? [{ doc_type: "certificate", file_path: doc.fileName }]
          : [],
        certificateFile: doc.certificateFile,
        fileType: doc.fileType,
      };
    });

    setCertificationDocs(formatted);
  }, [rawCertifications, skills]);

  /* ---- Resolve signed URL from file_path ---- */
  const getSignedUrl = async (filePath) => {

    const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

    const response = await fetch(
      `${BASE_URL}/hr/view_documents?file_path=${encodeURIComponent(filePath)}`,
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
    );

    const textResult = await response.text();
    let signedUrl;
    try {
      const parsed = JSON.parse(textResult);
      signedUrl = parsed.url || parsed;
    } catch {
      signedUrl = textResult;
    }

    if (typeof signedUrl !== "string") signedUrl = String(signedUrl);
    signedUrl = signedUrl.replace(/^"+|"+$/g, "").trim();

    return signedUrl;
  };
  // 🔥 CERTIFICATION FILE HANDLER (BASE64 → URL)
  const getFileUrlFromBase64 = (base64, fileType) => {
    if (!base64) return null;

    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length)
      .fill(0)
      .map((_, i) => byteCharacters.charCodeAt(i));

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: fileType });

    return URL.createObjectURL(blob);
  };

  /* ---- Detect file type from URL ---- */
  const getFileType = (url) => {
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)/)) return "image";
    if (lower.match(/\.pdf/)) return "pdf";
    return "other";
  };
  useEffect(() => {

  const fetchEducationMasters =
    async () => {

      try {

        const BASE_URL =
          window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

        const response = await fetch(
          `${BASE_URL}/masters/education-level`,
          {
            headers: {
              Authorization:
                `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const data =
          await response.json();

        console.log(
          "EDUCATION MASTERS",
          data
        );

        setEducationMasters(
          Array.isArray(data)
            ? data
            : data?.data || []
        );

      } catch (err) {

        console.error(
          "Education Master Error",
          err
        );
      }
    };

  fetchEducationMasters();

}, []);
  const fetchDegrees = async (education_uuid) => {

  try {

    const BASE_URL =
      window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

    const response = await fetch(
      `${BASE_URL}/education/degree-master/${education_uuid}`,
      {
        headers: {
          Authorization:
            `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const data = await response.json();

    console.log(
      "DEGREES",
      data
    );

    const degrees = data || [];

setDegreeOptions(degrees);



  } catch (err) {

    console.error(
      "Degree Fetch Error",
      err
    );
  }
};
// ✅ ADD HERE
useEffect(() => {

  if (
    uploadFormData.degree_uuid &&
    degreeOptions.length > 0
  ) {

    const exists = degreeOptions.find(
      d =>
        String(d.degree_uuid) ===
        String(uploadFormData.degree_uuid)
    );

    if (exists) {

      setUploadFormData(prev => ({

        ...prev,

        degree_uuid:
          exists.degree_uuid,

        degree_name:
          exists.degree_name,
      }));
    }
  }

}, [degreeOptions]);


  /* ---- View Document (opens preview modal) ---- */
  const viewDocument = async (filePath, docId, docTitle) => {
    if (!filePath) return;
    try {
      setLoadingDoc(docId);

      // Blob URLs are already accessible — skip signed URL fetch
      if (filePath.startsWith("blob:")) {
        const fileType = getFileType(filePath) || "pdf";
        setPreviewModal({
          open: true,
          url: filePath,
          title: docTitle || "Document Preview",
          type: fileType,
        });
        return;
      }

      const signedUrl = await getSignedUrl(filePath);

      if (signedUrl && signedUrl.startsWith("http")) {
        const fileType = getFileType(signedUrl);
        setPreviewModal({
          open: true,
          url: signedUrl,
          title: docTitle || "Document Preview",
          type: fileType,
        });
      } else {
        showStatusToast("Unable to open document", "error");
      }
    } catch (error) {
      console.error("Error viewing document:", error);
      showStatusToast("Unable to open document", "error");
    } finally {
      setLoadingDoc(null);
    }
  };

  /* ---- Open in new tab ---- */
  const openInNewTab = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

 const handleUpload = async () => {
// ✅ NEW DOCUMENT → file required

  try {
    setUploading(true);
    const token = localStorage.getItem("token");

    // 🔥 1. CERTIFICATIONS → RMS API
    if (uploadModal.category === "certifications") {
      const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

      // ✅ VALIDATION
      if (!employee?.empId) {
        alert("Employee ID missing");
        return;
      }

      if (!selectedCertificate?.value) {
        alert("Please select a certificate");
        return;
      }

      const isEdit = !!uploadModal.docId;

// ✅ BUILD PAYLOAD DIFFERENTLY FOR POST & PUT
     let certData;

      if (isEdit) {
        // 🔥 UPDATE (merge existing data)
        const existingDoc = certificationDocs.find(
          (d) => d.id === uploadModal.docId
        );

        certData = {
          resourceId: Number(employee.empId),

          certificateId:
            selectedCertificate?.value || existingDoc?.certificateId,

          skillId:
            selectedSkill?.value === "other"
              ? null
              : selectedSkill?.value ?? existingDoc?.skillId,

          issuedDate:
            uploadFormData.issue_date ?? existingDoc?.issue_date,

          expiryDate:
            uploadFormData.expiry_date ?? existingDoc?.expiry_date,

          activeFlag: true,
        };
      } else {
        // 🔥 CREATE (all required fields)
        certData = {
          resourceId: Number(employee.empId),
          certificateId: selectedCertificate.value,
          skillId:
            selectedSkill?.value === "other"
              ? null
              : selectedSkill?.value,
          issuedDate: uploadFormData.issue_date,
          expiryDate: uploadFormData.expiry_date || null,
          activeFlag: true,
        };
      }

      // Swagger shows the DTO as query params and only the file in multipart body.
      const formData = new FormData();
      if (
  uploadFile &&
  uploadFile !== "null"
) {
  formData.append("file", uploadFile);
}

      // ✅ FILE (optional)
      if (uploadFile) {
        formData.append("certificateFile", uploadFile);
      }

      // ✅ API CONFIG
      const url = new URL(
        isEdit
          ? `${BASE_URL}/api/resource-certificates/${uploadModal.docId}`
          : `${BASE_URL}/api/resource-certificates`
      );

      Object.entries(certData).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          url.searchParams.append(key, String(value));
        }
      });

      const method = isEdit ? "PUT" : "POST";

      // ✅ API CALL
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("API ERROR:", errText);
        alert(`Certification upload failed: ${errText || response.status}`);
        return;
      }

      // ✅ SUCCESS
      alert(
        isEdit
          ? "Certification updated successfully"
          : "Certification saved successfully"
      );

      // ✅ REFRESH DATA
      await refreshCertifications?.();

      // ✅ RESET STATE
      setUploadModal({ open: false, category: "", docId: null });
      setUploadFormData({});
      setSelectedSkill(null);
      setSelectedCertificate(null);
      setUploadFile(null);

      return;
    }
    if (uploadModal.category === "education") {

  const BASE_URL =
    window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const formData = new FormData();

  if (
    uploadFile &&
    uploadFile !== "null"
  ) {
    formData.append("file", uploadFile);
  }

  formData.append("user_uuid", user_uuid);

  formData.append(
    "mapping_uuid",
    uploadFormData.mapping_uuid
  );

  formData.append(
    "degree_uuid",
    uploadFormData.degree_uuid
  );

  formData.append(
    "institution_name",
    uploadFormData.institution_name || ""
  );

  formData.append(
    "institute_location",
    uploadFormData.institute_location || ""
  );

  formData.append(
    "specialization",
    uploadFormData.specialization || ""
  );

  formData.append(
    "education_mode",
    uploadFormData.education_mode || ""
  );

  formData.append(
    "start_year",
    uploadFormData.start_year || ""
  );

  formData.append(
    "year_of_passing",
    uploadFormData.year_of_passing || ""
  );

  formData.append(
    "percentage_cgpa",
    uploadFormData.percentage_cgpa || ""
  );

  formData.append(
    "delay_reason",
    uploadFormData.delay_reason || ""
  );

  let response;

  // ✅ UPDATE
  if (uploadModal.docId) {

    response = await fetch(
      `${BASE_URL}/education/employee-education-document/${uploadModal.docId}`,
      {
        method: "PUT",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      }
    );

  }

  // ✅ CREATE
  else {

    response = await fetch(
      `${BASE_URL}/education/employee-education-document`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      }
    );

  }

  if (response.ok) {

    showStatusToast(
      uploadModal.docId
        ? "Education updated successfully"
        : "Education uploaded successfully",
      "success"
    );

    // ✅ REFRESH UI WITHOUT RELOAD

    const updatedDoc = {

      ...uploadFormData,

      id:
  uploadModal.docId ||
  `edu-${Date.now()}`,

document_uuid:
  uploadModal.docId ||
  `edu-${Date.now()}`,
  education_uuid:
  uploadFormData.education_uuid,

education_name:
  uploadFormData.education_name,

      degree:
        uploadFormData.degree_name,

      institution:
        uploadFormData.institution_name,

      file_path:
        uploadFile
          ? URL.createObjectURL(uploadFile)
          : uploadFormData.file_path,

      documents:
        uploadFile
          ? [
              {
                doc_type:
                  "education_certificate",

                file_path:
                  URL.createObjectURL(uploadFile),
              },
            ]
          : [],
    };

    setEducationDocs(prev => {

  // ✅ UPDATE
  if (uploadModal.docId) {

    return prev.map(doc => {

      if (
        doc.document_uuid === uploadModal.docId
      ) {

        return {

          ...doc,

          ...updatedDoc,

          // ✅ KEEP OLD FILE IF NEW FILE NOT SELECTED
          file_path:
            updatedDoc.file_path ||
            doc.file_path,

          // ✅ KEEP OLD DOCUMENTS
          documents:
            updatedDoc.documents?.length > 0
              ? updatedDoc.documents
              : doc.documents,
        };
      }

      return doc;
    });
  }

  // ✅ CREATE
  return [...prev, updatedDoc];
});
    setUploadModal({
      open: false,
      category: "",
      docId: null,
    });

    setUploadFile(null);

    setUploadFormData({});
    return;
  }
}
if (uploadModal.category === "experience") {

  if (!user_uuid) {
    showStatusToast("User UUID is missing. Please reload the page.", "error"); return;
  }
  if (!uploadFormData.company_name?.trim() || uploadFormData.company_name.trim().length < 2) {
    showStatusToast("Company name must be at least 2 characters", "error"); return;
  }
  if (!uploadFormData.role_title?.trim() || uploadFormData.role_title.trim().length < 2) {
    showStatusToast("Role / Designation must be at least 2 characters", "error"); return;
  }
  if (!uploadFormData.employment_type) {
    showStatusToast("Employment type is required", "error"); return;
  }
  if (!uploadFormData.start_date) {
    showStatusToast("Start date is required", "error"); return;
  }

  const BASE_URL =
    window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const formData = new FormData();

  formData.append(
    "employee_uuid",
    user_uuid
  );

  formData.append(
    "company_name",
    uploadFormData.company_name || ""
  );

  formData.append(
    "role_title",
    uploadFormData.role_title || ""
  );

  formData.append(
    "employment_type",
    uploadFormData.employment_type || ""
  );

  formData.append(
    "start_date",
    uploadFormData.start_date || ""
  );

  if (uploadFormData.end_date) {
    formData.append("end_date", uploadFormData.end_date);
  }

  const isCurrent = !uploadFormData.end_date;
  formData.append("is_current", isCurrent ? "true" : "false");

  if (uploadFormData.description) {
    formData.append("description", uploadFormData.description);
  }


  

  if (uploadFormData.employment_type === "Full-Time") {
    if (experienceFiles.payslip) {
      formData.append("doc_types", "payslip_path");
      formData.append("files", experienceFiles.payslip);
    }
    if (experienceFiles.exp_certificate) {
      formData.append("doc_types", "exp_certificate_path");
      formData.append("files", experienceFiles.exp_certificate);
    }
  } else if (uploadFormData.employment_type === "Intern") {
    if (experienceFiles.internship_certificate) {
      formData.append("doc_types", "internship_certificate_path");
      formData.append("files", experienceFiles.internship_certificate);
    }
  } else if (uploadFormData.employment_type === "Contract") {
    if (experienceFiles.contract_agreement) {
      formData.append("doc_types", "contract_aggrement_path");
      formData.append("files", experienceFiles.contract_agreement);
    }
  } else if (uploadFormData.employment_type === "Part-Time" || uploadFormData.employment_type === "Freelance") {
    if (experienceFiles.exp_certificate) {
      formData.append("doc_types", "exp_certificate_path");
      formData.append("files", experienceFiles.exp_certificate);
    }
  }
  // Log payload for debugging (use Array.from to show duplicate keys like doc_types/files)
  const debugEntries = {};
  formData.forEach((value, key) => {
    if (debugEntries[key] !== undefined) {
      debugEntries[key] = [].concat(debugEntries[key], value instanceof File ? value.name : value);
    } else {
      debugEntries[key] = value instanceof File ? value.name : value;
    }
  });
  console.log("EXPERIENCE PAYLOAD:", debugEntries);

  let response;

  if (uploadModal.docId) {
    response = await fetch(
      `${BASE_URL}/experience/${uploadModal.docId}`,
      { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: formData }
    );
  } else {
    response = await fetch(
      `${BASE_URL}/experience`,
      { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: formData }
    );
  }

  if (!response.ok) {
    const errText = await response.text();
    console.error("EXPERIENCE API ERROR:", errText);
    let friendlyMsg = "Experience save failed";
    try {
      const errJson = JSON.parse(errText);
      if (errJson?.detail) {
        friendlyMsg = Array.isArray(errJson.detail)
          ? errJson.detail.map(e => e.msg || JSON.stringify(e)).join("; ")
          : String(errJson.detail);
      }
    } catch (_) {}
    showStatusToast(friendlyMsg, "error");
    return;
  }

  const responseData = await response.json().catch(() => ({}));

  showStatusToast(
    uploadModal.docId ? "Experience updated successfully" : "Experience uploaded successfully",
    "success"
  );

  const pPath = experienceFiles.payslip
    ? URL.createObjectURL(experienceFiles.payslip)
    : (responseData?.payslip_path || uploadFormData.payslip_path || "");
  const ePath = experienceFiles.exp_certificate
    ? URL.createObjectURL(experienceFiles.exp_certificate)
    : (responseData?.exp_certificate_path || uploadFormData.exp_certificate_path || "");
  const iPath = experienceFiles.internship_certificate
    ? URL.createObjectURL(experienceFiles.internship_certificate)
    : (responseData?.internship_certificate_path || uploadFormData.internship_certificate_path || "");
  const cPath = experienceFiles.contract_agreement
    ? URL.createObjectURL(experienceFiles.contract_agreement)
    : (responseData?.contract_aggrement_path || responseData?.contract_agreement_path ||
       uploadFormData.contract_aggrement_path || uploadFormData.contract_agreement_path || "");

  const newExperienceUuid = responseData?.experience_uuid || uploadModal.docId;

  const updatedDoc = {
    id: newExperienceUuid || uploadModal.docId || `exp-${Date.now()}`,
    experience_uuid: newExperienceUuid || uploadModal.docId,
    company: uploadFormData.company_name || "",
    company_name: uploadFormData.company_name || "",
    role: uploadFormData.role_title || "",
    role_title: uploadFormData.role_title || "",
    employment_type: uploadFormData.employment_type || "",
    start_date: uploadFormData.start_date || "",
    end_date: uploadFormData.end_date || "",
    description: uploadFormData.description || "",
    payslip_path:                pPath,
    exp_certificate_path:        ePath,
    internship_certificate_path: iPath,
    contract_aggrement_path:     cPath,
    // Rebuild documents array from scratch using current employment type — prevents stale
    // files from a prior employment type persisting in the UI.
    documents: buildExperienceDocuments(uploadFormData.employment_type, {
      payslip_path:                pPath,
      exp_certificate_path:        ePath,
      internship_certificate_path: iPath,
      contract_aggrement_path:     cPath,
    }),
  };

  setExperienceDocs(prev => {
    if (uploadModal.docId) {
      return prev.map(doc => {
        if (doc.experience_uuid === uploadModal.docId || doc.id === uploadModal.docId) {
          // Always replace documents wholesale — never merge with old employment type's docs
          return { ...doc, ...updatedDoc };
        }
        return doc;
      });
    }
    return [...prev, updatedDoc];
  });

  setUploadModal({ open: false, category: "", docId: null });
  setUploadFile(null);
  setUploadFormData({});
  setExperienceFiles({
    payslip: null,
    exp_certificate: null,
    internship_certificate: null,
    contract_agreement: null,
  });
  return;
}
    // 🔥 2. OTHER DOCUMENTS (UNCHANGED)
    // 🔥 IDENTITY DOCUMENTS
if (uploadModal.category === "identity") {

  const BASE_URL =
    window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const formData = new FormData();

 if (
  uploadFile &&
  uploadFile !== "null"
) {
  formData.append("file", uploadFile);
}

  formData.append("user_uuid", user_uuid);
console.log("FINAL UPLOAD DATA", uploadFormData);

formData.append(
  "mapping_uuid",
  uploadFormData.mapping_uuid || "PUT-REAL-MAPPING-UUID-HERE"
);

  formData.append(
    "identity_type_uuid",
    uploadFormData.identity_type_uuid
  );

  formData.append(
    "identity_file_number",
    uploadFormData.identity_file_number
  );

  formData.append(
    "name_on_document",
    uploadFormData.name_on_document
  );

  let response;

  // ✅ UPDATE
  if (uploadModal.docId) {

    response = await fetch(
      `${BASE_URL}/identity/employee-document/${uploadModal.docId}`,
      {
        method: "PUT",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      }
    );

  }

  // ✅ CREATE
  else {

    response = await fetch(
      `${BASE_URL}/employee-upload/identity-documents`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      }
    );

  }

  if (response.ok) {

  const newFilePath = uploadFile
    ? URL.createObjectURL(uploadFile)
    : uploadFormData.file_path || null;

  const updatedDoc = {
    id: uploadModal.docId || `identity-${Date.now()}`,
    document_uuid: uploadModal.docId || null,
    mapping_uuid: uploadFormData.mapping_uuid,
    identity_type_uuid: uploadFormData.identity_type_uuid,
    type: uploadFormData.identity_type || "",
    number: uploadFormData.identity_file_number || "",
    name: uploadFormData.name_on_document || "",
    file_path: newFilePath,
    isExisting: true,
    documents: newFilePath
      ? [{ doc_type: uploadFormData.identity_type || "Identity", file_path: newFilePath }]
      : [],
  };

  setIdentityDocs(prev => {
    if (uploadModal.docId) {
      return prev.map(doc =>
        doc.document_uuid === uploadModal.docId
          ? { ...doc, ...updatedDoc, document_uuid: uploadModal.docId }
          : doc
      );
    }
    // New document: match placeholder by mapping_uuid and update in-place
    return prev.map(doc =>
      doc.mapping_uuid === uploadFormData.mapping_uuid
        ? { ...doc, ...updatedDoc }
        : doc
    );
  });

  showStatusToast(
    uploadModal.docId
      ? "Identity updated successfully"
      : "Identity uploaded successfully",
    "success"
  );

  setUploadModal({
    open: false,
    category: "",
    docId: null,
  });

  setUploadFile(null);
}
 else {

    const err = await response.text();

    console.error(err);

    showStatusToast(
      "Identity upload failed",
      "error"
    );

  }

  return;
}
    const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

    const formData = new FormData();
// ✅ ONLY APPEND FILE IF USER SELECTED NEW FILE

  formData.append("file", uploadFile);

    formData.append("user_uuid", user_uuid);
    formData.append("category", uploadModal.category);

    if (uploadModal.docId) {
      formData.append("document_id", uploadModal.docId);
    }

    Object.entries(uploadFormData).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    const response = await fetch(`${BASE_URL}/hr/upload-document`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.ok) {
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadModal({ open: false, category: "", docId: null });
        setUploadFile(null);
        setUploadFormData({});
        setUploadSuccess(false);
        
      }, 1500);
    } else {
      alert("Upload failed");
    }
  } catch (error) {
    console.error(error);
  } finally {
    setUploading(false);
  }
};
  /* ---- Reset upload modal ---- */
  const closeUploadModal = () => {
    setUploadModal({ open: false, category: "", docId: null });
    setUploadFile(null);
    setUploadFormData({});
    setUploadSuccess(false);
    setExperienceFiles({
      payslip: null,
      exp_certificate: null,
      internship_certificate: null,
      contract_agreement: null,
    });
  };

  /* ---- Delete Document ---- */
  // const deleteDocument = (docId, category) => {
  //   setConfirmModal({
  //     open: true,
  //     title: "Delete Document",
  //     message: "Are you sure you want to delete this document? This action cannot be undone.",
  //     onConfirm: async () => {
  //       setConfirmModal({ open: false, title: "", message: "", onConfirm: null });
  //       try {
  //         setDeletingDoc(docId);
  //         const token = localStorage.getItem("token");
  //         const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  //         const response = await fetch(
  //           `${BASE_URL}/hr/delete-document/${docId}?category=${encodeURIComponent(category)}`,
  //           {
  //             method: "DELETE",
  //             headers: {
  //               Authorization: `Bearer ${token}`,
  //               "Content-Type": "application/json",
  //             },
  //           }
  //         );

  //         if (response.ok) {
  //           showStatusToast("Document deleted successfully.", "success");
  //           if (category === "education") {
  //             setEducationDocs((prev) => prev.filter((d) => d.id !== docId));
  //           } else if (category === "experience") {
  //             setExperienceDocs((prev) => prev.filter((d) => d.id !== docId));
  //           } else if (category === "identity") {
  //             setIdentityDocs((prev) => prev.filter((d) => d.id !== docId));
  //           } else if (category === "certifications") {
  //             setCertificationDocs((prev) => prev.filter((d) => d.id !== docId));
  //        
  //         } else {
  //           const errData = await response.json().catch(() => ({}));
  //           showStatusToast(errData.detail || "Delete failed. Please try again.", "error");
  //         }
  //       } catch (error) {
  //         console.error("Error deleting document:", error);
  //         showStatusToast("Delete failed. Please try again.", "error");
  //       } finally {
  //         setDeletingDoc(null);
  //       }
  //     },
  //   });
  // };

  const deleteDocument = (docId, category) => {
  setConfirmModal({
    open: true,
    title: "Delete Document",
    message: "Are you sure you want to delete this document?",
    onConfirm: async () => {
      setConfirmModal({ open: false, title: "", message: "", onConfirm: null });

      try {
        setDeletingDoc(docId);
        const token = localStorage.getItem("token");

        let response;

        // 🔥 1. CERTIFICATIONS → RMS API
        if (category === "certifications") {
          const BASE_URL = window.__APP_CONFIG__.RMS_BASE_URL;

          response = await fetch(
            `${BASE_URL}/api/resource-certificates/${docId}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        }

        // 🔥 2. OTHER DOCUMENTS → EMPLOYEE ONBOARDING
        else {
          const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

          response = await fetch(
            `${BASE_URL}/hr/delete-document/${docId}?category=${encodeURIComponent(category)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
        }

        // ✅ HANDLE RESPONSE
        if (response.ok) {
          showStatusToast("Deleted successfully", "success");

          if (category === "certifications") {
            setCertificationDocs(prev => prev.filter(d => d.id !== docId));
          } else if (category === "education") {
            setEducationDocs(prev => prev.filter(d => d.id !== docId));
          } else if (category === "experience") {
            setExperienceDocs(prev => prev.filter(d => d.id !== docId));
          } else if (category === "identity") {
            setIdentityDocs(prev => prev.filter(d => d.id !== docId));
          }

        } else {
          const errData = await response.json().catch(() => ({}));
          showStatusToast(errData.message || "Delete failed", "error");
        }

      } catch (error) {
        console.error("Delete error:", error);
        showStatusToast("Delete failed", "error");
      } finally {
        setDeletingDoc(null);
      }
    },
  });
};

  /* ---- Pre-fill form data for re-upload ---- */
  const openReuploadModal = (doc, category) => {
    let prefillData = {};

    if (category === "education") {
      prefillData = {

  document_uuid:
    doc.document_uuid || "",

  mapping_uuid:
    doc.mapping_uuid || "",

  education_uuid:
    doc.education_uuid || "",
  education_name:
    doc.education_name || "",

  degree_uuid:
    doc.degree_uuid || "",

  degree_name:
    doc.degree || "",

  specialization:
    doc.specialization || "",

  institution_name:
    doc.institution || "",

  institute_location:
    doc.institute_location || "",

  education_mode:
    doc.education_mode || "",

  start_year:
    doc.start_year || "",

  year_of_passing:
    doc.year_of_passing || "",

  percentage_cgpa:
    doc.percentage_cgpa || "",

  delay_reason:
    doc.delay_reason || "",

  file_path:
  doc.file_path || "",
};
if (doc.education_name) {

  const selectedEducation =
formattedEducationTypes.find(
        e => e.education_name ===
        doc.education_name
    );

  console.log(
    "MATCHED EDUCATION",
    selectedEducation
  );

  if (selectedEducation) {

  prefillData.mapping_uuid =
    selectedEducation.mapping_uuid || "";

  prefillData.education_uuid =
    selectedEducation.education_uuid || "";

  // ✅ SET DATA FIRST
  setUploadFormData(prefillData);

  // ✅ FETCH DEGREES
  fetchDegrees(
    selectedEducation.education_uuid ||
    doc.education_uuid
  );

}else {

  setUploadFormData(prefillData);
}
}
    } else if (category === "experience") {

  prefillData = {

    experience_uuid:
      doc.experience_uuid || "",

    mapping_uuid:
      doc.mapping_uuid || "",

    company_name:
  doc.company_name || "",

    role_title:
      doc.role_title || "",

    employment_type:
      doc.employment_type || "",

    start_date:
      doc.start_date || "",

    end_date:
      doc.end_date || "",

    description:
      doc.description || "",

    // ✅ FILE PATHS FOR EXISTING DOCS
    payslip_path:
      doc.payslip_path || "",
    exp_certificate_path:
      doc.exp_certificate_path || "",
    internship_certificate_path:
      doc.internship_certificate_path || "",
    contract_aggrement_path:
      doc.contract_aggrement_path || "",

    documents: buildExperienceDocuments(doc.employment_type, {
      payslip_path:                doc.payslip_path || "",
      exp_certificate_path:        doc.exp_certificate_path || "",
      internship_certificate_path: doc.internship_certificate_path || "",
      contract_aggrement_path:     doc.contract_aggrement_path || "",
    }),
  };
}
else if (category === "identity") {
      prefillData = {
  mapping_uuid: doc.mapping_uuid || "",

  identity_type_uuid:
    doc.identity_type_uuid || "",

  identity_type:
    doc.type !== "NA"
      ? doc.type
      : "",

  identity_file_number:
    doc.number !== "NA"
      ? doc.number
      : "",

  name_on_document:
    doc.name !== "NA"
      ? doc.name
      : "",

  // ✅ ADD THIS
  file_path:
    doc.file_path || "",
};
    } else if (category === "certifications") {
      prefillData = {
        issue_date: doc.issue_date !== "NA" ? doc.issue_date : "",
        expiry_date:
          doc.expiry_date !== "No Expiry" && doc.expiry_date !== "NA"
            ? doc.expiry_date
            : "",
        credential_id: doc.credential_id || "",
        credential_url: doc.credential_url || "",
      };

      // ✅ Update complementary dropdown states
      const skillObj = skills.find((s) => s.value === doc.skillId);
      setSelectedSkill(skillObj || null);

      setSelectedCertificate({
        value: doc.certificateId,
        label: doc.name,
      });

      setSelectedProvider({
        value: doc.issuing_org,
        label: doc.issuing_org,
      });
    }

    if (category === "experience") {
      setExperienceFiles({
        payslip: null,
        exp_certificate: null,
        internship_certificate: null,
        contract_agreement: null,
      });
    }

    setUploadFormData(prefillData);
    setUploadModal({
      open: true,
      category,
      docId: category === "experience"
        ? (doc.experience_uuid || doc.id)
        : (doc.document_uuid || doc.id),
    });
  };

  /* ---- Handle drag and drop ---- */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    if (file) setUploadFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (loading) return <div>Loading documents...</div>;

  /* ---- Filter documents by search query ---- */
  const filterDocs = (docs, keys) => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase().trim();
    return docs.filter((doc) =>
      keys.some((key) =>
        String(doc[key] || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  };

  const filteredEducation = filterDocs(educationDocs, [
  "degree",
  "specialization",
  "institution",
  "start_year",
  "year_of_passing",
]);
  const filteredExperience = filterDocs(experienceDocs, [
    "company",
    "role",
    "start_date",
    "end_date",
    "description",
  ]);
  const filteredIdentity = filterDocs(identityDocs, ["type", "number", "name"]);
  const filteredCertifications = filterDocs(certificationDocs, [
    "name",
    "issuing_org",
    "issue_date",
    "credential_id",
  ]);

  /* ---- Folder Definitions ---- */
  const folders = [
    {
      key: "education",
      label: "Degrees & Certificates",
      icon: <GraduationCap size={16} />,
      count: searchQuery.trim()
        ? filteredEducation.length
        : educationDocs.length,
      hasMatches: filteredEducation.length > 0,
    },
    {
      key: "experience",
      label: "Previous Experience",
      icon: <Briefcase size={16} />,
      count: searchQuery.trim()
        ? filteredExperience.length
        : experienceDocs.length,
      hasMatches: filteredExperience.length > 0,
    },
    {
      key: "identity",
      label: "Identity",
      icon: <ShieldCheck size={16} />,
      count: searchQuery.trim() ? filteredIdentity.length : identityDocs.length,
      hasMatches: filteredIdentity.length > 0,
    },
    {
      key: "certifications",
      label: "Certifications",
      icon: <Award size={16} />,
      count: searchQuery.trim()
        ? filteredCertifications.length
        : certificationDocs.length,
      hasMatches: filteredCertifications.length > 0,
    },
  ];

  const visibleFolders = folders.filter((folder) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return folder.label.toLowerCase().includes(q) || folder.hasMatches;
  });

  const currentFolderKey = visibleFolders.some((f) => f.key === activeFolder)
    ? activeFolder
    : visibleFolders.length > 0
      ? visibleFolders[0].key
      : activeFolder;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">My Documents</h2>

      <div className="flex flex-col md:flex-row gap-6 min-h-[400px]">
        {/* ---- LEFT SIDEBAR ---- */}
        <div className="w-full md:w-64 shrink-0 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-8 text-sm outline-none focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Folders */}
          <div className="bg-white rounded-xl border border-[#e4e8f2] overflow-hidden" style={{ boxShadow: "0 1px 4px rgba(8,21,52,0.06)" }}>
            <div className="px-4 py-3 border-b border-[#f4f6fc]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Document Folders
              </span>
            </div>
            <div className="p-2 space-y-0.5">
              {visibleFolders.map((folder) => (
                <button
                  key={folder.key}
                  onClick={() => setActiveFolder(folder.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${currentFolderKey === folder.key
                    ? "bg-[#263383] text-white font-semibold shadow-sm"
                    : "text-gray-600 hover:bg-[#f4f6fc] hover:text-[#263383]"
                    }`}
                >
                  <span
                    className={
                      currentFolderKey === folder.key
                        ? "text-white/70"
                        : "text-gray-400"
                    }
                  >
                    {folder.icon}
                  </span>
                  <span className="flex-1 text-left">{folder.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${currentFolderKey === folder.key
                      ? "bg-white/25 text-white"
                      : "bg-[#f4f6fc] text-gray-500"
                      }`}
                  >
                    {folder.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ---- RIGHT CONTENT ---- */}
        <div className="flex-1 min-w-0">
          {/* ---- EDUCATION SECTION ---- */}
          {currentFolderKey === "education" && (
            <FolderContent
              title="Degrees & Certificates"
              icon={<GraduationCap size={18} />}
              count={filteredEducation.length}
              description="This section contains details about all the Degrees & Certificates of an employee."
              onUpload={() => {
                setUploadFormData({});
                setUploadModal({
                  open: true,
                  category: "education",
                  docId: null,
                });
              }}
            >
              {filteredEducation.length === 0 ? (
                <EmptyState
                  message={
                    searchQuery
                      ? "No matching education documents found."
                      : "No education documents found."
                  }
                  onUpload={() => {
                    setUploadFormData({});
                    setUploadModal({
                      open: true,
                      category: "education",
                      docId: null,
                    });
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredEducation.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      title="Degrees & Certificates"
                      hasFile={doc.documents.length > 0}
                      documents={doc.documents}
                      onViewDocument={(filePath, docTitle) =>
                        viewDocument(
                          filePath,
                          doc.document_uuid || doc.id,
                          docTitle
                        )}
                      cardTitle={`${doc.degree} - ${doc.institution}`}
                      onUpload={() => openReuploadModal(doc, "education")}
                      onDelete={() => deleteDocument(doc.id, "education")}
                      deleting={deletingDoc === doc.id}
                      loading={loadingDoc === doc.id}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                        <DocField label="Degree" value={doc.degree} />
                        <DocField
                          label="Branch / Specialization"
                          value={doc.specialization}
                        />
                        <DocField
                          label="Education Mode"
                          value={doc.education_mode}
                        />
                        <DocField
                          label="Year of Joining"
                          value={doc.start_year}
                        />
                        <DocField
                          label="Year of Completion"
                          value={doc.year_of_passing}
                        />
                        <DocField label="CGPA / Percentage" value={doc.percentage_cgpa} />
                        <DocField
  label="University / College"
  value={doc.institution}
/>

<DocField
  label="Location"
  value={doc.institute_location}
/>
                      </div>
                    </DocumentCard>
                  ))}
                </div>
              )}
            </FolderContent>
          )}

          {/* ---- EXPERIENCE SECTION ---- */}
          {currentFolderKey === "experience" && (
            <FolderContent
              title="Previous Experience"
              icon={<Briefcase size={18} />}
              count={filteredExperience.length}
              description="This section contains details about all the previous work experience of an employee."
              onUpload={() => {
                setUploadFormData({});
                setUploadModal({
                  open: true,
                  category: "experience",
                  docId: null
                });
              }}
            >
              {filteredExperience.length === 0 ? (
                <EmptyState
                  message={
                    searchQuery
                      ? "No matching experience records found."
                      : "No experience records found."
                  }
                  onUpload={() => {
                    setUploadFormData({});
                    setUploadModal({
                      open: true,
                      category: "experience",
                      docId: null
 
                    });
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredExperience.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      title="Previous Experience"
                      hasFile={doc.documents.length > 0}
                      documents={doc.documents}
                      onViewDocument={(filePath, docTitle) =>
                        viewDocument(filePath, doc.id, docTitle)
                      }
                      cardTitle={`${doc.company} - ${doc.role}`}
                      onUpload={() => openReuploadModal(doc, "experience")}
                      onDelete={() => deleteDocument(doc.id, "experience")}
                      deleting={deletingDoc === doc.id}
                      loading={loadingDoc === doc.id}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                        <DocField label="Company" value={doc.company} />
                        <DocField label="Role / Designation" value={doc.role} />
                        <DocField
                          label="Employment Type"
                          value={doc.employment_type}
                        />
                        <DocField label="Start Date" value={doc.start_date} />
                        <DocField label="End Date" value={doc.end_date} />
                        {doc.description && (
                          <DocField
                            label="Description"
                            value={doc.description}
                          />
                        )}
                      </div>
                    </DocumentCard>
                  ))}
                </div>
              )}
            </FolderContent>
          )}

          {/* ---- IDENTITY SECTION ---- */}
          {currentFolderKey === "identity" && (
            <FolderContent
              title="Identity"
              icon={<ShieldCheck size={18} />}
              count={filteredIdentity.length}
              description="This section contains identity documents such as Aadhaar, PAN, Passport, etc."
              onUpload={() => {
                setUploadFormData({});
                setUploadModal({
                  open: true,
                  category: "identity",
                  docId: null,
                });
              }}
            >
              {filteredIdentity.length === 0 ? (
                <EmptyState
                  message={
                    searchQuery
                      ? "No matching identity documents found."
                      : "No identity documents found."
                  }
                  onUpload={() => {
                    setUploadFormData({});
                    setUploadModal({
                      open: true,
                      category: "identity",
                      docId: null,
                    });
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredIdentity.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      title={doc.type}
                      hasFile={doc.documents.length > 0}
                      documents={doc.documents}
                      onViewDocument={(filePath, docTitle) =>
                        viewDocument(filePath, doc.id, docTitle)
                      }
                      cardTitle={doc.type}
                      onUpload={() => openReuploadModal(doc, "identity")}
                      onDelete={() =>
                        deleteDocument(
                          doc.document_uuid || doc.id,
                          "identity"
                        )
                      }
                        deleting={deletingDoc === doc.id}
                      loading={loadingDoc === doc.id}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        <DocField label="Document Type" value={doc.type} />
                        <DocField
  label="Document Number"
  value={doc.number?.trim() ? doc.number : "-"}
/>                        <DocField label="Name on Document" value={doc.name} />
                      </div>
                    </DocumentCard>
                  ))}
                </div>
              )}
            </FolderContent>
          )}

          {/* ---- CERTIFICATIONS SECTION ---- */}
          {currentFolderKey === "certifications" && (
            <FolderContent
              title="Certifications"
              icon={<Award size={18} />}
              count={filteredCertifications.length}
              description="This section contains course certificates, online certifications, credits, and other professional certifications."
              onUpload={() => {
                setUploadFormData({});
                setUploadModal({
                  open: true,
                  category: "certifications",
                  docId: null,
                });
              }}
            >
              {filteredCertifications.length === 0 ? (
                <EmptyState
                  message={
                    searchQuery
                      ? "No matching certifications found."
                      : "No certifications found."
                  }
                  onUpload={() => {
                    setUploadFormData({});
                    setUploadModal({
                      open: true,
                      category: "certifications",
                      docId: null,
                    });
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredCertifications.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      title={doc.name}
                      hasFile={doc.documents.length > 0}
                      documents={doc.documents}
                      onViewDocument={() => {
                        const url = getFileUrlFromBase64(doc.certificateFile, doc.fileType);

                        if (url) {
                          setPreviewModal({
                            open: true,
                            url,
                            title: doc.name,
                            type: doc.fileType?.includes("pdf") ? "pdf" : "image",
                          });
                        }
                      }}
                      cardTitle={doc.name}
                      onUpload={() => openReuploadModal(doc, "certifications")}
                      onDelete={() => deleteDocument(doc.id, "certifications")}
                      deleting={deletingDoc === doc.id}
                      loading={loadingDoc === doc.id}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        <DocField label="Skill" value={doc.skillName} />
                        <DocField label="Certificate Name" value={doc.name} />
                        <DocField label="Issuing Organization" value={doc.issuing_org} />

                        <DocField label="Issue Date" value={doc.issue_date} />
                        <DocField label="Expiry Date" value={doc.expiry_date} />
                        {doc.credential_id && (
                          <DocField
                            label="Credential ID"
                            value={doc.credential_id}
                          />
                        )}
                        {doc.credential_url && (
                          <DocField
                            label="Credential URL"
                            value={doc.credential_url}
                          />
                        )}
                      </div>
                    </DocumentCard>
                  ))}
                </div>
              )}
            </FolderContent>
          )}
        </div>
      </div>

      {/* ==================== PREVIEW MODAL ==================== */}
      {previewModal.open && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-[#263383]" />
                <h3 className="text-base font-semibold text-gray-900">
                  {previewModal.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openInNewTab(previewModal.url)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#263383] bg-[#263383]/5 rounded-lg hover:bg-[#263383]/10 transition-colors"
                >
                  <ExternalLink size={14} />
                  Open in New Tab
                </button>
                <a
                  href={previewModal.url}
                  download
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Download size={14} />
                  Download
                </a>
                <button
                  onClick={() =>
                    setPreviewModal({
                      open: false,
                      url: null,
                      title: "",
                      type: "",
                    })
                  }
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
              {previewModal.type === "image" && (
                <img
                  src={previewModal.url}
                  alt={previewModal.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
                />
              )}
              {previewModal.type === "pdf" && (
                <iframe
                  src={previewModal.url}
                  title={previewModal.title}
                  className="w-full h-[75vh] rounded-lg border border-gray-200"
                />
              )}
              {previewModal.type === "other" && (
                <div className="text-center space-y-4">
                  <FileText size={48} className="text-gray-300 mx-auto" />
                  <p className="text-sm text-gray-500">
                    Preview is not available for this file type.
                  </p>
                  <button
                    onClick={() => openInNewTab(previewModal.url)}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#263383] rounded-xl hover:bg-[#081534] transition-colors"
                  >
                    Open in New Tab
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== UPLOAD MODAL ==================== */}
      {uploadModal.open && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <Upload size={18} className="text-[#263383]" />
                <h3 className="text-base font-semibold text-gray-900">
                  {uploadModal.docId ? "Update Document" : "Add New Document"}{" "}
                  <span className="text-gray-400 font-normal text-sm">
                    — {uploadModal.category}
                  </span>
                </h3>
              </div>
              <button
                onClick={closeUploadModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-5 overflow-y-auto">
              {uploadSuccess ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                    <CheckCircle size={32} className="text-emerald-500" />
                  </div>
                  <p className="text-base font-semibold text-gray-900">
                    Upload Successful!
                  </p>
                  <p className="text-sm text-gray-500">
                    Your document has been uploaded.
                  </p>
                </div>
              ) : (
                <>
                  {/* ---- Category-Specific Form Fields ---- */}
                  {uploadModal.category === "education" && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Degree / Certificate Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Education Level
  </label>

  <FilterListbox
    options={[
      {
        value: "",
        label: "Select Education Level",
      },

    ...(Array.isArray(formattedEducationTypes)
  ? formattedEducationTypes
  : []
).map((edu) => ({

  value: String(edu.mapping_uuid || ""),

  label:
    edu.education_name ||
    edu.education?.education_name ||
    "Unknown",
}))
    ]}

    value={
  String(
    uploadFormData.mapping_uuid || ""
  )
}

    onChange={(val) => {

  const selected =
  formattedEducationTypes.find(
    e =>
      String(e.mapping_uuid) === String(val)
  );

console.log(
  "SELECTED EDUCATION",
  selected
);

  setUploadFormData(d => ({

    ...d,

    document_name:
  selected?.document_name || "",

    education_uuid:
  selected?.education_uuid ||
  selected?.education?.education_uuid ||
  "",

    // ✅ IMPORTANT FIX
    mapping_uuid:
      selected?.mapping_uuid ||
      selected?.education_mapping_uuid ||
      "",

    education_name:
  selected?.education_name ||
  selected?.education?.education_name ||
  "",

    degree_uuid:
  d.degree_uuid || "",
  }));

  fetchDegrees(
  selected?.education_uuid
);
}}    
  />
</div>
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Degree
  </label>

  <FilterListbox
    options={[
      {
        value: "",
        label: "Select Degree",
      },

      ...degreeOptions.map((deg) => ({
        value: String(deg.degree_uuid),

        label:
          deg.degree_name,
      })),
    ]}

    value={
  String(
    uploadFormData.degree_uuid || ""
  )
}

    onChange={(val) => {

      const selected =
        degreeOptions.find(
          d => d.degree_uuid === val
        );

      setUploadFormData(d => ({

        ...d,

        degree_uuid: val,

        degree_name:
          selected?.degree_name || "",
      }));
    }}
  />
</div>
                        <UploadField
                          label="Specialization"
                          placeholder="e.g. Computer Science"
                          value={uploadFormData.specialization || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({
                              ...d,
                              specialization: v,
                            }))
                          }
                        />
                        <div>
  <label className="block text-sm font-medium text-gray-700 mb-1.5">
    Education Mode
  </label>

  <FilterListbox
    options={[
      {
        value: "",
        label: "Select Mode",
      },
      {
        value: "Regular",
        label: "Regular",
      },
      {
        value: "Distance",
        label: "Distance",
      },
      {
        value: "Part Time",
        label: "Part Time",
      },
      {
        value: "Online",
        label: "Online",
      },
    ]}

    value={
      uploadFormData.education_mode || ""
    }

    onChange={(val) =>
      setUploadFormData((d) => ({
        ...d,
        education_mode: val,
      }))
    }
  />
</div>
                        <UploadField
                          label="Institution / Organization"
                          placeholder="e.g. JNTU, Coursera"
                          value={uploadFormData.institution_name || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({
                              ...d,
                              institution_name: v,
                            }))
                          }
                        />
                        <UploadField
  label="Institute Location"
  placeholder="e.g. Hyderabad"
  value={uploadFormData.institute_location || ""}
  onChange={(v) =>
    setUploadFormData((d) => ({
      ...d,
      institute_location: v,
    }))
  }
/>
                        <UploadField
                          label="Year of Joining"
                          placeholder="e.g. 2020"
                          value={uploadFormData.start_year || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({
                              ...d,
                              start_year: v,
                            }))
                          }
                        />
                        <UploadField
                          label="Year of Completion"
                          placeholder="e.g. 2024"
                          value={uploadFormData.year_of_passing || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({
                              ...d,
                              year_of_passing: v,
                            }))
                          }
                        />
                        <UploadField
                          label="CGPA / Percentage"
                          placeholder="e.g. 8.5 or 85%"
                          value={uploadFormData.percentage_cgpa || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({ ...d, percentage_cgpa: v }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {uploadModal.category === "experience" && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Experience Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <UploadField
                          label="Company Name"
                          placeholder="e.g. TCS, Google"
                          value={uploadFormData.company_name || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({
                              ...d,
                              company_name: v,
                            }))
                          }
                        />
                        <UploadField
                          label="Role / Designation"
                          placeholder="e.g. Software Intern"
                          value={uploadFormData.role_title || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({ ...d, role_title: v }))
                          }
                        />
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Employment Type
                          </label>
                          <FilterListbox
                            options={[
                              { value: "", label: "Select Type" },
                              { value: "Full-Time", label: "Full-Time" },
                              { value: "Part-Time", label: "Part-Time" },
                              { value: "Intern", label: "Intern" },
                              { value: "Contract", label: "Contract" },
                              { value: "Freelance", label: "Freelance" },
                            ]}
                            value={uploadFormData.employment_type || ""}
                            onChange={(val) =>
                              setUploadFormData(d => ({
                                ...d,
                                employment_type: val,
                              }))
                            }
                          />
                        </div>
                        <UploadField
                          label="Start Date"
                          placeholder="e.g. 2023-01-15"
                          type="date"
                          value={uploadFormData.start_date || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({ ...d, start_date: v }))
                          }
                        />
                        <UploadField
                          label="End Date"
                          placeholder="Leave empty if present"
                          type="date"
                          value={uploadFormData.end_date || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({ ...d, end_date: v }))
                          }
                        />
                        <UploadField
                          label="Description (Optional)"
                          placeholder="Brief description of your role"
                          value={uploadFormData.description || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({
                              ...d,
                              description: v,
                            }))
                          }
                        />
                              {uploadFormData.employment_type === "Full-Time" && (
                                <>
                                  <ExperienceFileField
                                    label="Payslip"
                                    file={experienceFiles.payslip}
                                    existingPath={uploadFormData.payslip_path}
                                    onChange={(file) => setExperienceFiles(prev => ({ ...prev, payslip: file }))}
                                    onView={(path) => viewDocument(path, uploadModal.docId, "Payslip")}
                                  />
                                  <ExperienceFileField
                                    label="Experience Certificate"
                                    file={experienceFiles.exp_certificate}
                                    existingPath={uploadFormData.exp_certificate_path}
                                    onChange={(file) => setExperienceFiles(prev => ({ ...prev, exp_certificate: file }))}
                                    onView={(path) => viewDocument(path, uploadModal.docId, "Experience Certificate")}
                                  />
                                </>
                              )}

                              {uploadFormData.employment_type === "Intern" && (
                                <ExperienceFileField
                                  label="Internship Certificate"
                                  file={experienceFiles.internship_certificate}
                                  existingPath={uploadFormData.internship_certificate_path}
                                  onChange={(file) => setExperienceFiles(prev => ({ ...prev, internship_certificate: file }))}
                                  onView={(path) => viewDocument(path, uploadModal.docId, "Internship Certificate")}
                                />
                              )}

                              {uploadFormData.employment_type === "Contract" && (
                                <ExperienceFileField
                                  label="Contract Agreement"
                                  file={experienceFiles.contract_agreement}
                                  existingPath={uploadFormData.contract_aggrement_path}
                                  onChange={(file) => setExperienceFiles(prev => ({ ...prev, contract_agreement: file }))}
                                  onView={(path) => viewDocument(path, uploadModal.docId, "Contract Agreement")}
                                />
                              )}

                              {(uploadFormData.employment_type === "Part-Time" || uploadFormData.employment_type === "Freelance") && (
                                <ExperienceFileField
                                  label="Experience Certificate"
                                  file={experienceFiles.exp_certificate}
                                  existingPath={uploadFormData.exp_certificate_path}
                                  onChange={(file) => setExperienceFiles(prev => ({ ...prev, exp_certificate: file }))}
                                  onView={(path) => viewDocument(path, uploadModal.docId, "Experience Certificate")}
                                />
                              )}

                      </div>
                    </div>
                  )}

                  {uploadModal.category === "identity" && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Identity Document Details
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">
                            Document Type
                          </label>
                          <FilterListbox
                            options={[{value:"",label:"Select type"}, ...identityTypes.map((idType) => ({value: idType.identity_type_uuid, label: idType.identity_type_name}))]}
                            value={uploadFormData.identity_type_uuid || ""}
                            onChange={(val) => {

  const selected =
    identityTypes.find(
      t => t.identity_type_uuid === val
    );

  setUploadFormData(d => ({
    ...d,

    identity_type_uuid: val,

    identity_type:
      selected?.identity_type_name || "",

    // ✅ IMPORTANT
    mapping_uuid:
      selected?.mapping_uuid || "",
  }));
}}
                          />
                        </div>
                        <UploadField
                          label="Document Number"
                          placeholder="e.g. XXXX-XXXX-1234"
                          value={uploadFormData.identity_file_number || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({
                              ...d,
                              identity_file_number: v,
                            }))
                          }
                        />
                        <UploadField
                          label="Name on Document"
                          placeholder="Name as on the document"
                          value={uploadFormData.name_on_document || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({
                              ...d,
                              name_on_document: v,
                            }))
                          }
                        />
                      </div>
                    </div>
                  )}

                  {uploadModal.category === "certifications" && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Certification Details
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* 🔥 Skill Dropdown */}
                        <div className="sm:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Skill</label>
                          <Select
                            options={skills}
                            value={selectedSkill}
                            onChange={setSelectedSkill}
                            placeholder="Select Skill"
                          />
                        </div>

                        {/* 🔥 Custom Skill */}
                        {selectedSkill?.value === "other" && (
                          <div className="sm:col-span-2">
                            <UploadField
                              label="Custom Skill"
                              placeholder="Enter custom skill"
                              value={customSkill}
                              onChange={setCustomSkill}
                            />
                          </div>
                        )}

                        {/* 🔥 Certificate Dropdown */}
                        <div className="sm:col-span-2">
                          <label className="text-sm font-medium text-gray-700">Certificate</label>
                          <Select
                            options={filteredCertificates}
                            value={selectedCertificate}
                            onChange={(val) => {
                              setSelectedCertificate(val);
                              setSelectedProvider(null); // 🔥 reset provider
                            }}
                            placeholder="Select Certificate"
                          />
                        </div>
                        {/* 🔥 Provider Dropdown */}
                        <div className="sm:col-span-2">
                          <label className="text-sm font-medium text-gray-700">
                            Issuing Organization
                          </label>
                          <Select
                            options={filteredProviders}
                            value={selectedProvider}
                            onChange={setSelectedProvider}
                            placeholder="Select Provider"
                          />
                        </div>
                        {selectedProvider?.value === "other" && (
                          <div className="sm:col-span-2">
                            <UploadField
                              label="Custom Provider"
                              placeholder="Enter provider name"
                              value={uploadFormData.customProvider || ""}
                              onChange={(v) =>
                                setUploadFormData(d => ({ ...d, customProvider: v }))
                              }
                            />
                          </div>
                        )}

                        {/* 🔥 Issue Date */}
                        <UploadField
                          label="Issued Date"
                          type="date"
                          value={uploadFormData.issue_date || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({ ...d, issue_date: v }))
                          }
                        />

                        {/* 🔥 Expiry Date */}
                        <UploadField
                          label="Expiry Date"
                          type="date"
                          value={uploadFormData.expiry_date || ""}
                          onChange={(v) =>
                            setUploadFormData((d) => ({ ...d, expiry_date: v }))
                          }
                        />
                      </div>
                    </div>
                  )}
                  {/* ---- Existing File Preview (Education/Identity) ---- */}
                  {uploadModal.docId && uploadFormData.file_path && uploadModal.category !== "experience" && (
  <div className="mb-4 p-3 border border-gray-200 rounded-xl bg-gray-50">

    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
      Existing Uploaded File
    </p>

    <button
      type="button"
      onClick={() =>
        viewDocument(
          uploadFormData.file_path,
          uploadModal.docId,
          uploadFormData.identity_type || "Document"
        )
      }
      className="text-sm text-blue-600 underline"
    >
      View Existing Document
    </button>

  </div>
)}

                  {/* ---- Existing Experience Documents Preview ---- */}
                  {uploadModal.docId && uploadModal.category === "experience" && uploadFormData.documents && uploadFormData.documents.length > 0 && (
  <div className="mb-4 p-3 border border-gray-200 rounded-xl bg-gray-50">
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
      Existing Uploaded Documents
    </p>
    <div className="space-y-2">
      {uploadFormData.documents.map((doc, idx) => (
        <div key={idx} className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-[#263383]" />
            <span className="text-sm text-gray-700">{doc.doc_type}</span>
          </div>
          <button
            type="button"
            onClick={() => viewDocument(doc.file_path, uploadModal.docId, doc.doc_type)}
            className="text-xs text-blue-600 underline"
          >
            View
          </button>
        </div>
      ))}
    </div>
  </div>
)}

                  {/* ---- File Drop Zone (NOT for Experience) ---- */}
                  {uploadModal.category !== "experience" && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      {uploadFormData.document_name ||"Upload File"}
                    </p>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${uploadFile
                        ? "border-[#263383]/30 bg-[#263383]/5"
                        : "border-gray-200 bg-gray-50/50 hover:border-[#263383]/30 hover:bg-[#263383]/5"
                        }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        className="hidden"
                      />

                      {uploadFile ? (
                        <div className="space-y-2">
                          <FileText
                            size={28}
                            className="text-[#263383] mx-auto"
                          />
                          <p className="text-sm font-medium text-gray-800">
                            {uploadFile.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {(uploadFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadFile(null);
                            }}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload size={28} className="text-gray-300 mx-auto" />
                          <p className="text-sm text-gray-600 font-medium">
                            Click to browse or drag and drop
                          </p>
                          <p className="text-xs text-gray-400">
                            PDF, JPG, PNG, DOC up to 10MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            {!uploadSuccess && (
              <div className="flex justify-end gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-white shrink-0">
                <button
                  onClick={closeUploadModal}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#263383] rounded-xl hover:bg-[#081534] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {uploadModal.docId ? "Updating..." : "Uploading..."}
                    </span>
                  ) : uploadModal.docId ? (
                    "Update Document"
                  ) : (
                    "Upload Document"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== CONFIRM MODAL ==================== */}
      {confirmModal.open && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in">
            {/* Body */}
            <div className="px-6 py-6 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {confirmModal.title}
                </h3>
                <p className="text-sm text-gray-500">{confirmModal.message}</p>
              </div>
            </div>
            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() =>
                  setConfirmModal({
                    open: false,
                    title: "",
                    message: "",
                    onConfirm: null,
                  })
                }
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-sm transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== UI COMPONENTS ==================== */

/* ---- Folder Content Wrapper ---- */
const FolderContent = ({
  title,
  icon,
  count,
  description,
  onUpload,
  children,
}) => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
          <span>
            {count} {count === 1 ? "document" : "documents"}
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1">
            <Lock size={12} />
            Restricted access
          </span>
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-2 hidden sm:block">
            {description}
          </p>
        )}
      </div>
      {onUpload && (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#263383] rounded-xl hover:bg-[#081534] shadow-sm transition-all shrink-0 w-full sm:w-auto justify-center sm:justify-start"
        >
          <Upload size={16} />
          Add New Document
        </button>
      )}
    </div>

    {/* Content */}
    {children}
  </div>
);

/* ---- Document Card ---- */
const DocumentCard = ({
  title,
  hasFile,
  documents = [],
  onViewDocument,
  cardTitle,
  onUpload,
  onDelete,
  loading,
  deleting,
  children,
}) => {
  const formatDocType = (docType) => {
    if (!docType) return "Document";
    return docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getFileName = (filePath) => {
    if (!filePath) return "Unknown File";
    const parts = filePath.split("/");
    return parts[parts.length - 1] || "Unknown File";
  };

  return (
    <div className="bg-white rounded-xl border border-[#e4e8f2] overflow-hidden"
      style={{ boxShadow: "0 1px 4px rgba(8,21,52,0.06)", borderLeft: "3px solid #263383" }}>
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#f4f6fc]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "#eff6ff" }}>
            <FileText size={13} className="text-[#263383]" />
          </div>
          <h4 className="text-sm font-semibold text-[#081534] truncate">{title}</h4>
          {hasFile && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
              <CheckCircle size={9} /> Uploaded
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onUpload && (
            <button
              onClick={onUpload}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 bg-white border border-[#e4e8f2] rounded-lg hover:bg-[#f4f6fc] transition-colors"
            >
              <Upload size={11} />
              {hasFile ? "Replace" : "Upload"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-500 bg-white border border-red-100 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <div className="h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={11} />
                  Delete
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 py-4 space-y-3">
        {children}

        {/* Attached Documents List */}
        {documents.length > 0 && (
          <div className="pt-3 border-t border-[#f4f6fc]">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Attached Files ({documents.length})
            </p>
            <div className="space-y-1.5">
              {documents.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 px-3 py-2 bg-[#fafbfd] rounded-lg border border-[#f0f2f8] hover:border-[#263383]/20 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-[#263383]/10 flex items-center justify-center flex-shrink-0">
                      <FileText size={11} className="text-[#263383]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700 truncate">
                        {formatDocType(file.doc_type)}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        {getFileName(file.file_path)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onViewDocument(
                        file.file_path,
                        `${cardTitle} — ${formatDocType(file.doc_type)}`,
                      )
                    }
                    disabled={loading}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#263383] bg-white border border-[#263383]/20 rounded-lg hover:bg-[#263383]/5 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {loading ? (
                      <>
                        <div className="h-3 w-3 border-2 border-[#263383] border-t-transparent rounded-full animate-spin" />
                        Loading…
                      </>
                    ) : (
                      <>
                        <Eye size={11} />
                        View
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ---- Document Field ---- */
const DocField = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
      {label}
    </p>
    <p className="text-sm font-medium text-gray-800">{value || "NA"}</p>
  </div>
);

/* ---- Empty State ---- */
const EmptyState = ({ message, onUpload }) => (
  <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-[#e4e8f2] rounded-xl bg-[#fafbfd] text-center">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
      style={{ background: "linear-gradient(135deg, #f4f6fc 0%, #e8ecf8 100%)" }}>
      <FileText size={24} className="text-gray-300" />
    </div>
    <p className="text-sm font-semibold text-gray-500 mb-1">{message}</p>
    <p className="text-xs text-gray-400 mb-4">Upload your documents to get started</p>
    {onUpload && (
      <button
        onClick={onUpload}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#263383] border border-[#263383]/20 hover:bg-[#263383]/5 rounded-xl transition-all"
      >
        <Upload size={14} />
        Upload Document
      </button>
    )}
  </div>
);

/* ---- Upload Form Field ---- */
const UploadField = ({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#263383] focus:ring-2 focus:ring-[#263383]/10 bg-white placeholder-gray-400 hover:border-gray-400 transition-all"
    />
  </div>
);

/* ---- Experience File Upload Field ---- */
const ExperienceFileField = ({ label, file, existingPath, onChange, onView }) => {
  const inputRef = React.useRef(null);
  return (
    <div className="sm:col-span-2">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          file
            ? "border-[#263383]/30 bg-[#263383]/5"
            : "border-gray-200 bg-gray-50/50 hover:border-[#263383]/30 hover:bg-[#263383]/5"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={(e) => onChange(e.target.files[0] || null)}
          className="hidden"
        />
        {file ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="text-[#263383] flex-shrink-0" />
              <span className="text-sm font-medium text-gray-800 truncate">{file.name}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-xs text-red-500 hover:text-red-700 font-medium flex-shrink-0"
            >
              Remove
            </button>
          </div>
        ) : existingPath ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="text-emerald-500 flex-shrink-0" />
              <span className="text-sm text-gray-600 truncate">Existing file uploaded</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onView(existingPath); }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View
              </button>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">Click to replace</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Upload size={20} className="text-gray-300 mx-auto" />
            <p className="text-xs text-gray-500">Click to upload {label}</p>
          </div>
        )}
      </div>
    </div>
  );
};


