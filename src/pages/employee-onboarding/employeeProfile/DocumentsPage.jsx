"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { showStatusToast } from "../../../components/toastfy/toast";
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

export default function DocumentsPage({ employee, user_uuid, hrData = {}, identityTypes = [], config = null }) {
  const { employee_uuid } = useParams();

  const [educationDocs, setEducationDocs] = useState([]);
  const [experienceDocs, setExperienceDocs] = useState([]);
  const [identityDocs, setIdentityDocs] = useState([]);
  const [certificationDocs, setCertificationDocs] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState("education");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingDoc, setLoadingDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);

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
    docId: null,   // if replacing a specific document
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadFormData, setUploadFormData] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Use pre-fetched data from parent — no API calls needed
    const data = hrData || {};

    /* ---- Map Education Documents ---- */
    const eduDocs = (data.education_documents || []).map((doc, idx) => ({
      id: doc.education_document_uuid || `edu-${idx}`,
      degree: doc.degree_name || doc.education_level || "NA",
      specialization: doc.specialization || "NA",
      institution: doc.institution_name || "NA",
      year_of_joining: doc.year_of_joining || "NA",
      year_of_completion: doc.year_of_passing || "NA",
      cgpa: doc.cgpa || doc.percentage || "NA",
      file_path: doc.file_path || null,
      documents: doc.documents || (doc.file_path ? [{ doc_type: "certificate", file_path: doc.file_path }] : []),
    }));
    setEducationDocs(eduDocs);

    /* ---- Map Experience Documents ---- */
    const expDocs = (data.experience || []).map((doc, idx) => ({
      id: doc.experience_uuid || `exp-${idx}`,
      company: doc.company_name || "NA",
      role: doc.role_title || doc.designation || "NA",
      employment_type: doc.employment_type || "NA",
      start_date: doc.start_date || "NA",
      end_date: doc.end_date || "Present",
      description: doc.description || "",
      file_path: doc.file_path || null,
      documents: doc.documents || (doc.file_path ? [{ doc_type: "experience_letter", file_path: doc.file_path }] : []),
    }));
    setExperienceDocs(expDocs);

    /* ---- Map Identity Documents ---- */
    const idDocs = (data.identity_documents || []).map((doc, idx) => ({
      id: doc.identity_document_uuid || `id-${idx}`,
      type: doc.identity_type || doc.identity_type_name || "NA",
      number: doc.identity_file_number || "NA",
      name: doc.name_on_document || employee?.name || "NA",
      file_path: doc.file_path || null,
      documents: doc.documents || (doc.file_path ? [{ doc_type: doc.identity_type || "identity", file_path: doc.file_path }] : []),
    }));
    setIdentityDocs(idDocs);

    /* ---- Map Certifications ---- */
    const certDocs = (data.certifications || []).map((doc, idx) => ({
      id: doc.certification_uuid || `cert-${idx}`,
      name: doc.certification_name || doc.name || "NA",
      issuing_org: doc.issuing_organization || doc.issuer || "NA",
      issue_date: doc.issue_date || "NA",
      expiry_date: doc.expiry_date || "No Expiry",
      credential_id: doc.credential_id || "",
      credential_url: doc.credential_url || "",
      file_path: doc.file_path || null,
      documents: doc.documents || (doc.file_path ? [{ doc_type: "certificate", file_path: doc.file_path }] : []),
    }));
    setCertificationDocs(certDocs);

    setLoading(false);
  }, [hrData]);

  /* ---- Resolve signed URL from file_path ---- */
  const getSignedUrl = async (filePath) => {
    const token = localStorage.getItem("token");
    const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;

    const response = await fetch(
      `${BASE_URL}/hr/view_documents?file_path=${encodeURIComponent(filePath)}`,
      { headers: { Authorization: `Bearer ${token}` } }
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

  /* ---- Detect file type from URL ---- */
  const getFileType = (url) => {
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)/)) return "image";
    if (lower.match(/\.pdf/)) return "pdf";
    return "other";
  };

  /* ---- View Document (opens preview modal) ---- */
  const viewDocument = async (filePath, docId, docTitle) => {
    if (!filePath) return;
    try {
      setLoadingDoc(docId);

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

  /* ---- Upload Document ---- */
  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);
      const token = localStorage.getItem("token");
      const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;

      const targetUserUuid = user_uuid;

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("user_uuid", targetUserUuid || "");
      formData.append("category", uploadModal.category);

      if (uploadModal.docId) {
        formData.append("document_id", uploadModal.docId);
      }

      // Append category-specific metadata
      Object.entries(uploadFormData).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });

      const response = await fetch(
        `${BASE_URL}/hr/upload-document`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        setUploadSuccess(true);
        setTimeout(() => {
          setUploadModal({ open: false, category: "", docId: null });
          setUploadFile(null);
          setUploadFormData({});
          setUploadSuccess(false);
          // Refresh documents
          window.location.reload();
        }, 1500);
      } else {
        const errData = await response.json().catch(() => ({}));
        showStatusToast(errData.detail || "Upload failed. Please try again.", "error");
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      showStatusToast("Upload failed. Please try again.", "error");
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
  };

  /* ---- Delete Document ---- */
  const deleteDocument = (docId, category) => {
    setConfirmModal({
      open: true,
      title: "Delete Document",
      message: "Are you sure you want to delete this document? This action cannot be undone.",
      onConfirm: async () => {
        setConfirmModal({ open: false, title: "", message: "", onConfirm: null });
        try {
          setDeletingDoc(docId);
          const token = localStorage.getItem("token");
          const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;

          const response = await fetch(
            `${BASE_URL}/hr/delete-document/${docId}?category=${encodeURIComponent(category)}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          if (response.ok) {
            showStatusToast("Document deleted successfully.", "success");
            if (category === "education") {
              setEducationDocs((prev) => prev.filter((d) => d.id !== docId));
            } else if (category === "experience") {
              setExperienceDocs((prev) => prev.filter((d) => d.id !== docId));
            } else if (category === "identity") {
              setIdentityDocs((prev) => prev.filter((d) => d.id !== docId));
            } else if (category === "certifications") {
              setCertificationDocs((prev) => prev.filter((d) => d.id !== docId));
            }
          } else {
            const errData = await response.json().catch(() => ({}));
            showStatusToast(errData.detail || "Delete failed. Please try again.", "error");
          }
        } catch (error) {
          console.error("Error deleting document:", error);
          showStatusToast("Delete failed. Please try again.", "error");
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
        degree_name: doc.degree !== "NA" ? doc.degree : "",
        specialization: doc.specialization !== "NA" ? doc.specialization : "",
        institution_name: doc.institution !== "NA" ? doc.institution : "",
        year_of_joining: doc.year_of_joining !== "NA" ? doc.year_of_joining : "",
        year_of_passing: doc.year_of_completion !== "NA" ? doc.year_of_completion : "",
        cgpa: doc.cgpa !== "NA" ? doc.cgpa : "",
      };
    } else if (category === "experience") {
      prefillData = {
        company_name: doc.company !== "NA" ? doc.company : "",
        role_title: doc.role !== "NA" ? doc.role : "",
        start_date: doc.start_date !== "NA" ? doc.start_date : "",
        end_date: doc.end_date !== "Present" && doc.end_date !== "NA" ? doc.end_date : "",
        description: doc.description || "",
      };
    } else if (category === "identity") {
      prefillData = {
        identity_type: doc.type !== "NA" ? doc.type : "",
        identity_file_number: doc.number !== "NA" ? doc.number : "",
        name_on_document: doc.name !== "NA" ? doc.name : "",
      };
    } else if (category === "certifications") {
      prefillData = {
        certification_name: doc.name !== "NA" ? doc.name : "",
        issuing_organization: doc.issuing_org !== "NA" ? doc.issuing_org : "",
        issue_date: doc.issue_date !== "NA" ? doc.issue_date : "",
        expiry_date: doc.expiry_date !== "No Expiry" && doc.expiry_date !== "NA" ? doc.expiry_date : "",
        credential_id: doc.credential_id || "",
        credential_url: doc.credential_url || "",
      };
    }

    setUploadFormData(prefillData);
    setUploadModal({ open: true, category, docId: doc.id });
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

  /* ---- Folder Definitions ---- */
  const folders = [
    {
      key: "education",
      label: "Degrees & Certificates",
      icon: <GraduationCap size={16} />,
      count: educationDocs.length,
    },
    {
      key: "experience",
      label: "Previous Experience",
      icon: <Briefcase size={16} />,
      count: experienceDocs.length,
    },
    {
      key: "identity",
      label: "Identity",
      icon: <ShieldCheck size={16} />,
      count: identityDocs.length,
    },
    {
      key: "certifications",
      label: "Certifications",
      icon: <Award size={16} />,
      count: certificationDocs.length,
    },
  ];

  /* ---- Filter documents by search query ---- */
  const filterDocs = (docs, keys) => {
    if (!searchQuery.trim()) return docs;
    const q = searchQuery.toLowerCase().trim();
    return docs.filter(doc =>
      keys.some(key => String(doc[key] || "").toLowerCase().includes(q))
    );
  };

  const filteredEducation = filterDocs(educationDocs, ["degree", "specialization", "institution", "year_of_joining", "year_of_completion"]);
  const filteredExperience = filterDocs(experienceDocs, ["company", "role", "start_date", "end_date", "description"]);
  const filteredIdentity = filterDocs(identityDocs, ["type", "number", "name"]);
  const filteredCertifications = filterDocs(certificationDocs, ["name", "issuing_org", "issue_date", "credential_id"]);


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
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-8 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white"
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
          <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md border border-indigo-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-indigo-100 bg-indigo-50/60">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Folders</span>
            </div>
            <div className="p-2 space-y-0.5">
              {folders.map((folder) => (
                <button
                  key={folder.key}
                  onClick={() => setActiveFolder(folder.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    activeFolder === folder.key
                      ? "bg-indigo-50 text-indigo-700 font-semibold"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <span className={activeFolder === folder.key ? "text-indigo-500" : "text-gray-400"}>
                    {folder.icon}
                  </span>
                  <span className="flex-1 text-left">{folder.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      activeFolder === folder.key
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-gray-100 text-gray-500"
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
          {activeFolder === "education" && (
            <FolderContent
              title="Degrees & Certificates"
              icon={<GraduationCap size={18} />}
              count={filteredEducation.length}
              description="This section contains details about all the Degrees & Certificates of an employee."
              onUpload={() => { setUploadFormData({}); setUploadModal({ open: true, category: "education", docId: null }); }}
            >
              {filteredEducation.length === 0 ? (
                <EmptyState
                  message={searchQuery ? "No matching education documents found." : "No education documents found."}
                  onUpload={() => { setUploadFormData({}); setUploadModal({ open: true, category: "education", docId: null }); }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredEducation.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      title="Degrees & Certificates"
                      hasFile={doc.documents.length > 0}
                      documents={doc.documents}
                      onViewDocument={(filePath, docTitle) => viewDocument(filePath, doc.id, docTitle)}
                      cardTitle={`${doc.degree} - ${doc.institution}`}
                      onUpload={() => openReuploadModal(doc, "education")}
                      onDelete={() => deleteDocument(doc.id, "education")}
                      deleting={deletingDoc === doc.id}
                      loading={loadingDoc === doc.id}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                        <DocField label="Degree" value={doc.degree} />
                        <DocField label="Branch / Specialization" value={doc.specialization} />
                        <DocField label="Year of Joining" value={doc.year_of_joining} />
                        <DocField label="Year of Completion" value={doc.year_of_completion} />
                        <DocField label="CGPA / Percentage" value={doc.cgpa} />
                        <DocField label="University / College" value={doc.institution} />
                      </div>
                    </DocumentCard>
                  ))}
                </div>
              )}
            </FolderContent>
          )}

          {/* ---- EXPERIENCE SECTION ---- */}
          {activeFolder === "experience" && (
            <FolderContent
              title="Previous Experience"
              icon={<Briefcase size={18} />}
              count={filteredExperience.length}
              description="This section contains details about all the previous work experience of an employee."
              onUpload={() => { setUploadFormData({}); setUploadModal({ open: true, category: "experience", docId: null }); }}
            >
              {filteredExperience.length === 0 ? (
                <EmptyState
                  message={searchQuery ? "No matching experience records found." : "No experience records found."}
                  onUpload={() => { setUploadFormData({}); setUploadModal({ open: true, category: "experience", docId: null }); }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredExperience.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      title="Previous Experience"
                      hasFile={doc.documents.length > 0}
                      documents={doc.documents}
                      onViewDocument={(filePath, docTitle) => viewDocument(filePath, doc.id, docTitle)}
                      cardTitle={`${doc.company} - ${doc.role}`}
                      onUpload={() => openReuploadModal(doc, "experience")}
                      onDelete={() => deleteDocument(doc.id, "experience")}
                      deleting={deletingDoc === doc.id}
                      loading={loadingDoc === doc.id}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                        <DocField label="Company" value={doc.company} />
                        <DocField label="Role / Designation" value={doc.role} />
                        <DocField label="Employment Type" value={doc.employment_type} />
                        <DocField label="Start Date" value={doc.start_date} />
                        <DocField label="End Date" value={doc.end_date} />
                        {doc.description && <DocField label="Description" value={doc.description} />}
                      </div>
                    </DocumentCard>
                  ))}
                </div>
              )}
            </FolderContent>
          )}

          {/* ---- IDENTITY SECTION ---- */}
          {activeFolder === "identity" && (
            <FolderContent
              title="Identity"
              icon={<ShieldCheck size={18} />}
              count={filteredIdentity.length}
              description="This section contains identity documents such as Aadhaar, PAN, Passport, etc."
              onUpload={() => { setUploadFormData({}); setUploadModal({ open: true, category: "identity", docId: null }); }}
            >
              {filteredIdentity.length === 0 ? (
                <EmptyState
                  message={searchQuery ? "No matching identity documents found." : "No identity documents found."}
                  onUpload={() => { setUploadFormData({}); setUploadModal({ open: true, category: "identity", docId: null }); }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredIdentity.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      title={doc.type}
                      hasFile={doc.documents.length > 0}
                      documents={doc.documents}
                      onViewDocument={(filePath, docTitle) => viewDocument(filePath, doc.id, docTitle)}
                      cardTitle={doc.type}
                      onUpload={() => openReuploadModal(doc, "identity")}
                      onDelete={() => deleteDocument(doc.id, "identity")}
                      deleting={deletingDoc === doc.id}
                      loading={loadingDoc === doc.id}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        <DocField label="Document Type" value={doc.type} />
                        <DocField label="Document Number" value={doc.number} />
                        <DocField label="Name on Document" value={doc.name} />
                      </div>
                    </DocumentCard>
                  ))}
                </div>
              )}
            </FolderContent>
          )}

          {/* ---- CERTIFICATIONS SECTION ---- */}
          {activeFolder === "certifications" && (
            <FolderContent
              title="Certifications"
              icon={<Award size={18} />}
              count={filteredCertifications.length}
              description="This section contains course certificates, online certifications, credits, and other professional certifications."
              onUpload={() => { setUploadFormData({}); setUploadModal({ open: true, category: "certifications", docId: null }); }}
            >
              {filteredCertifications.length === 0 ? (
                <EmptyState
                  message={searchQuery ? "No matching certifications found." : "No certifications found."}
                  onUpload={() => { setUploadFormData({}); setUploadModal({ open: true, category: "certifications", docId: null }); }}
                />
              ) : (
                <div className="space-y-4">
                  {filteredCertifications.map((doc) => (
                    <DocumentCard
                      key={doc.id}
                      title={doc.name}
                      hasFile={doc.documents.length > 0}
                      documents={doc.documents}
                      onViewDocument={(filePath, docTitle) => viewDocument(filePath, doc.id, docTitle)}
                      cardTitle={doc.name}
                      onUpload={() => openReuploadModal(doc, "certifications")}
                      onDelete={() => deleteDocument(doc.id, "certifications")}
                      deleting={deletingDoc === doc.id}
                      loading={loadingDoc === doc.id}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                        <DocField label="Certificate Name" value={doc.name} />
                        <DocField label="Issuing Organization" value={doc.issuing_org} />
                        <DocField label="Issue Date" value={doc.issue_date} />
                        <DocField label="Expiry Date" value={doc.expiry_date} />
                        {doc.credential_id && <DocField label="Credential ID" value={doc.credential_id} />}
                        {doc.credential_url && <DocField label="Credential URL" value={doc.credential_url} />}
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
                <FileText size={18} className="text-indigo-600" />
                <h3 className="text-base font-semibold text-gray-900">{previewModal.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openInNewTab(previewModal.url)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
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
                  onClick={() => setPreviewModal({ open: false, url: null, title: "", type: "" })}
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
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
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
                <Upload size={18} className="text-indigo-600" />
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
                  <p className="text-base font-semibold text-gray-900">Upload Successful!</p>
                  <p className="text-sm text-gray-500">Your document has been uploaded.</p>
                </div>
              ) : (
                <>
                  {/* ---- Category-Specific Form Fields ---- */}
                  {uploadModal.category === "education" && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Degree / Certificate Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <UploadField label="Degree / Certificate Name" placeholder="e.g. B.Tech, Internship Certificate" value={uploadFormData.degree_name || ""} onChange={(v) => setUploadFormData(d => ({ ...d, degree_name: v }))} />
                        <UploadField label="Specialization" placeholder="e.g. Computer Science" value={uploadFormData.specialization || ""} onChange={(v) => setUploadFormData(d => ({ ...d, specialization: v }))} />
                        <UploadField label="Institution / Organization" placeholder="e.g. JNTU, Coursera" value={uploadFormData.institution_name || ""} onChange={(v) => setUploadFormData(d => ({ ...d, institution_name: v }))} />
                        <UploadField label="Year of Joining" placeholder="e.g. 2020" value={uploadFormData.year_of_joining || ""} onChange={(v) => setUploadFormData(d => ({ ...d, year_of_joining: v }))} />
                        <UploadField label="Year of Completion" placeholder="e.g. 2024" value={uploadFormData.year_of_passing || ""} onChange={(v) => setUploadFormData(d => ({ ...d, year_of_passing: v }))} />
                        <UploadField label="CGPA / Percentage" placeholder="e.g. 8.5 or 85%" value={uploadFormData.cgpa || ""} onChange={(v) => setUploadFormData(d => ({ ...d, cgpa: v }))} />
                      </div>
                    </div>
                  )}

                  {uploadModal.category === "experience" && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Experience Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <UploadField label="Company Name" placeholder="e.g. TCS, Google" value={uploadFormData.company_name || ""} onChange={(v) => setUploadFormData(d => ({ ...d, company_name: v }))} />
                        <UploadField label="Role / Designation" placeholder="e.g. Software Intern" value={uploadFormData.role_title || ""} onChange={(v) => setUploadFormData(d => ({ ...d, role_title: v }))} />
                        <UploadField label="Start Date" placeholder="e.g. 2023-01-15" type="date" value={uploadFormData.start_date || ""} onChange={(v) => setUploadFormData(d => ({ ...d, start_date: v }))} />
                        <UploadField label="End Date" placeholder="Leave empty if present" type="date" value={uploadFormData.end_date || ""} onChange={(v) => setUploadFormData(d => ({ ...d, end_date: v }))} />
                        <div className="sm:col-span-2">
                          <UploadField label="Description (Optional)" placeholder="Brief description of your role" value={uploadFormData.description || ""} onChange={(v) => setUploadFormData(d => ({ ...d, description: v }))} />
                        </div>
                      </div>
                    </div>
                  )}

                  {uploadModal.category === "identity" && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Identity Document Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Document Type</label>
                          <select
                            value={uploadFormData.identity_type_uuid || ""}
                            onChange={(e) => {
                              const selected = identityTypes.find(t => t.identity_type_uuid === e.target.value);
                              setUploadFormData(d => ({
                                ...d,
                                identity_type_uuid: e.target.value,
                                identity_type: selected?.identity_type_name || "",
                              }));
                            }}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white"
                          >
                            <option value="">Select type</option>
                            {identityTypes.map((idType) => (
                              <option key={idType.identity_type_uuid} value={idType.identity_type_uuid}>
                                {idType.identity_type_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <UploadField label="Document Number" placeholder="e.g. XXXX-XXXX-1234" value={uploadFormData.identity_file_number || ""} onChange={(v) => setUploadFormData(d => ({ ...d, identity_file_number: v }))} />
                        <UploadField label="Name on Document" placeholder="Name as on the document" value={uploadFormData.name_on_document || ""} onChange={(v) => setUploadFormData(d => ({ ...d, name_on_document: v }))} />
                      </div>
                    </div>
                  )}

                  {uploadModal.category === "certifications" && (
                    <div className="space-y-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Certification Details</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <UploadField label="Certificate Name" placeholder="e.g. AWS Cloud Practitioner, Python Course" value={uploadFormData.certification_name || ""} onChange={(v) => setUploadFormData(d => ({ ...d, certification_name: v }))} />
                        <UploadField label="Issuing Organization" placeholder="e.g. Coursera, Udemy, AWS" value={uploadFormData.issuing_organization || ""} onChange={(v) => setUploadFormData(d => ({ ...d, issuing_organization: v }))} />
                        <UploadField label="Issue Date" type="date" value={uploadFormData.issue_date || ""} onChange={(v) => setUploadFormData(d => ({ ...d, issue_date: v }))} />
                        <UploadField label="Expiry Date (if any)" type="date" value={uploadFormData.expiry_date || ""} onChange={(v) => setUploadFormData(d => ({ ...d, expiry_date: v }))} />
                        <UploadField label="Credential ID (Optional)" placeholder="e.g. ABC123XYZ" value={uploadFormData.credential_id || ""} onChange={(v) => setUploadFormData(d => ({ ...d, credential_id: v }))} />
                        <UploadField label="Credential URL (Optional)" placeholder="e.g. https://verify.coursera.org/..." value={uploadFormData.credential_url || ""} onChange={(v) => setUploadFormData(d => ({ ...d, credential_url: v }))} />
                      </div>
                    </div>
                  )}

                  {/* ---- File Drop Zone ---- */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Upload File</p>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                        uploadFile
                          ? "border-indigo-300 bg-indigo-50/50"
                          : "border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30"
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
                          <FileText size={28} className="text-indigo-500 mx-auto" />
                          <p className="text-sm font-medium text-gray-800">{uploadFile.name}</p>
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
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                >
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {uploadModal.docId ? "Updating..." : "Uploading..."}
                    </span>
                  ) : (
                    uploadModal.docId ? "Update Document" : "Upload Document"
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
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{confirmModal.title}</h3>
                <p className="text-sm text-gray-500">{confirmModal.message}</p>
              </div>
            </div>
            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setConfirmModal({ open: false, title: "", message: "", onConfirm: null })}
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
const FolderContent = ({ title, icon, count, description, onUpload, children }) => (
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
        {description && <p className="text-sm text-gray-500 mt-2 hidden sm:block">{description}</p>}
      </div>
      {onUpload && (
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-all shrink-0 w-full sm:w-auto justify-center sm:justify-start"
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
const DocumentCard = ({ title, hasFile, documents = [], onViewDocument, cardTitle, onUpload, onDelete, loading, deleting, children }) => {
  /* Helper: format doc_type to readable name */
  const formatDocType = (docType) => {
    if (!docType) return "Document";
    return docType
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  /* Helper: extract filename from file_path */
  const getFileName = (filePath) => {
    if (!filePath) return "Unknown File";
    const parts = filePath.split("/");
    return parts[parts.length - 1] || "Unknown File";
  };

  return (
    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md border border-indigo-100 overflow-hidden">
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4 border-b border-indigo-100 bg-indigo-50/60">
        <div className="flex items-center gap-3 min-w-0">
          <FileText size={16} className="text-indigo-600 shrink-0" />
          <h4 className="text-sm font-semibold text-indigo-800 truncate">{title}</h4>
        </div>
        <div className="flex items-center gap-2">
          {onUpload && (
            <button
              onClick={onUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload size={14} />
              {hasFile ? "Re-upload" : "Upload"}
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {deleting ? (
                <>
                  <div className="h-3.5 w-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  Delete
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
        {children}

        {/* Attached Documents List */}
        {documents.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Attached Documents ({documents.length})
            </p>
            <div className="space-y-2">
              {documents.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-gray-50/80 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-indigo-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {formatDocType(file.doc_type)}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">
                        {getFileName(file.file_path)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onViewDocument(file.file_path, `${cardTitle} — ${formatDocType(file.doc_type)}`)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 shrink-0"
                  >
                    {loading ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
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
    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm font-medium text-gray-800">{value || "NA"}</p>
  </div>
);

/* ---- Empty State ---- */
const EmptyState = ({ message, onUpload }) => (
  <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md border border-indigo-100 p-10 text-center">
    <FileText size={32} className="text-gray-300 mx-auto mb-3" />
    <p className="text-sm text-gray-400 mb-4">{message}</p>
    {onUpload && (
      <button
        onClick={onUpload}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm transition-all"
      >
        <Upload size={16} />
        Upload Document
      </button>
    )}
  </div>
);

/* ---- Upload Form Field ---- */
const UploadField = ({ label, placeholder, value, onChange, type = "text" }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white placeholder-gray-400 hover:border-gray-400 transition-all"
    />
  </div>
);
