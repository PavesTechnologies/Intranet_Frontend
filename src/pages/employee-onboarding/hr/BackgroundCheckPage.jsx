import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, User, ChevronDown, ShieldCheck, AlertTriangle, CheckCircle2,
  Clock3, Users, Folder, X, Send, FileArchive, RefreshCw, Mail, Phone,
  Building2, Clock, Eye, Download, ExternalLink, FileText,
  GraduationCap, Briefcase, MapPin, CreditCard, Award,
  Lock, Upload, Trash2, Plus
} from "lucide-react";
import FilterListbox from "../../../components/filter/FilterListbox";
import api from "../../../api/axiosInstance"
import { showStatusToast } from "../../../components/toastfy/toast";
import Button from "../../../components/Button/Button";
import StatusBadge from "../../../components/status/statusbadge";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { KPICard } from "../../../components/kpi/KPI";

 
/* ── Static BG Checks (not document-linked) ── */
const STATIC_CHECKS = [
  { key: "professional_reference", label: "Professional Reference Check",              icon: CheckCircle2,   group: "Reference" },
  { key: "address_digital",        label: "Address Verification (Digital & Physical)", icon: MapPin,         group: "Address" },
  { key: "global_compliance",      label: "Global Compliance Screening",               icon: ShieldCheck,    group: "Compliance" },
  { key: "criminal_record",        label: "Criminal Court Record Check",               icon: AlertTriangle,  group: "Compliance" },
  { key: "cibil_check",            label: "CIBIL Check",                               icon: CreditCard,     group: "Financial" },
  { key: "bank_statement",         label: "Bank Statement (Last 3 Months)",            icon: Clock3,         group: "Financial" },
];
 
/* ── Identity doc → check icon map ── */
const IDENTITY_ICON = {
  "Aadhaar":         ShieldCheck,
  "PAN":             CreditCard,
  "Passport":        ShieldCheck,
  "Driving Licence": ShieldCheck,
};
 
const SC = {
  VERIFIED:  { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "Verification Completed" },
  IN_REVIEW: { bg: "bg-blue-100",  text: "text-blue-700",  dot: "bg-blue-500",  label: "In Verification" },
  PENDING:   { bg: "bg-gray-100",  text: "text-gray-600",  dot: "bg-gray-400",  label: "Pending" },
  REJECTED:  { bg: "bg-red-100",   text: "text-red-700",   dot: "bg-red-500",   label: "Rejected" },
};
 
const normalizeStatus = (raw = "") => {
  const s = raw.toUpperCase().replace(/\s+/g, "_");
  if (s.includes("VERIF"))                             return "VERIFIED";
  if (s.includes("REVIEW") || s.includes("PROGRESS")) return "IN_REVIEW";
  if (s.includes("REJECT"))                            return "REJECTED";
  return "PENDING";
};
 
 
 
/* ─────────────────────── SMALL COMPONENTS ─────────────────────── */
const InfoRow = ({ label, value }) => (
  <div className="flex items-start py-1.5 border-b border-gray-50 last:border-0">
    <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-36 shrink-0">{label}</span>
    <span className="text-xs text-gray-800 font-medium flex-1">
      {value || <span className="text-gray-300 italic">Not Updated</span>}
    </span>
  </div>
);
 
const SectionCard = ({ title, icon: Icon, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 bg-gray-50">
      <Icon className="w-4 h-4 text-indigo-600" />
      <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</h3>
    </div>
    <div className="px-4 py-3">{children}</div>
  </div>
);
 
const StatCard = ({ label, count, color, Icon, onClick, isActive, activeColor }) => (
  <button
    onClick={onClick}
    className={`w-full text-left transition-all hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
      isActive ? `ring-2 ${activeColor} rounded-xl shadow-md` : ""
    }`}
  >
    <KPICard
      label={label}
      value={count}
      icon={<Icon className="h-5 w-5" />}
      color={`${color} text-white`}
      active={isActive}
      className="h-full w-full bg-white border-gray-200 shadow-sm"
    />
  </button>
);
 
const CandidateItem = ({ emp, isSelected, bgStatus, onClick }) => {
  const sc = SC[bgStatus] || SC.PENDING;
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3 border ${
        isSelected ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-100"
                   : "border-transparent hover:bg-gray-50 hover:border-gray-200"
      }`}
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
        {emp.first_name?.[0]}{emp.last_name?.[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 truncate">{emp.first_name} {emp.last_name}</p>
        <p className="text-[11px] text-gray-400 truncate">{emp.work_email}</p>
      </div>
      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.bg} ${sc.text}`}>
        {bgStatus.replace("_", " ")}
      </span>
    </button>
  );
};
 
/* ─────────────────── DOCUMENT PREVIEW MODAL ─────────────────── */
const DocPreviewModal = ({ doc, onClose }) => {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading]     = useState(true);
  const BASE_URL =
    window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL ||
    import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");
 
  useEffect(() => {
    if (!doc?.file_path) {
      setLoading(false);
      return;
    }
    const fetchSignedUrl = async () => {
      try {
        const res = await api.get(`${BASE_URL}/hr/view_documents`, {
          params: { file_path: doc.file_path },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const url = typeof res.data === "string" ? res.data.replace(/^"+|"+$/g, "") : res.data.url;
        setSignedUrl(url);
      } catch (err) {
        console.error("Failed to fetch signed URL:", err);
        showStatusToast("Failed to open document", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSignedUrl();
  }, [doc, BASE_URL]);
 
  const name = doc?.document_name || doc?.doc_type || doc?.identity_type || "Document";
 
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 bg-gray-50 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-bold text-gray-800">{name}</span>
            {doc?.identity_file_number && (
              <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded">
                #{doc.identity_file_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => signedUrl && window.open(signedUrl, "_blank")}
              disabled={loading || !signedUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
            >
              <ExternalLink className="w-3.5 h-3.5" /> New Tab
            </button>
            <a
              href={signedUrl}
              download
              onClick={e => !signedUrl && e.preventDefault()}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors ${(!signedUrl || loading) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-100 min-h-[400px]">
          {loading ? (
             <div className="text-center">
               <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-3" />
               <p className="text-xs text-gray-500 font-medium whitespace-nowrap">Resolving secure document link...</p>
             </div>
          ) : signedUrl ? (
            signedUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
              <img src={signedUrl} alt={name} className="max-w-full max-h-[75vh] object-contain rounded-lg p-4" />
            ) : (
              <iframe src={signedUrl} title={name} className="w-full h-full border-0" />
            )
          ) : (
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-sm font-semibold text-gray-500">{name}</p>
              <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Document preview is unavailable or the file path is missing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
 
/* ─────────────────── DOC CARD ─────────────────── */
const TYPE_COLORS = {
  "Aadhaar":         { bg: "bg-orange-100",  text: "text-orange-700"  },
  "PAN":             { bg: "bg-blue-100",    text: "text-blue-700"    },
  "Passport":        { bg: "bg-purple-100",  text: "text-purple-700"  },
  "Driving Licence": { bg: "bg-green-100",   text: "text-green-700"   },
  "Education":       { bg: "bg-indigo-100",  text: "text-indigo-700"  },
  "Experience":      { bg: "bg-teal-100",    text: "text-teal-700"    },
};
 
const DocCard = ({ doc, idx, onPreview, isVerified, onDelete, onUpload }) => {
  const typeKey = doc.identity_type || doc._cat || "Education";
  const color   = TYPE_COLORS[typeKey] || { bg: "bg-gray-100", text: "text-gray-600" };
  const label   = doc.document_name || doc.doc_type || doc.identity_type || `Document ${idx + 1}`;
 
  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-white rounded-xl border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition-all">
      {/* Icon + badge */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color.bg}`}>
          <FileText className={`w-4 h-4 ${color.text}`} />
        </div>
        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${color.bg} ${color.text} uppercase tracking-wide whitespace-nowrap max-w-[56px] truncate text-center`}>
          {typeKey}
        </span>
      </div>
 
      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{label}</p>
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {doc.identity_file_number && (
            <span className="text-xs text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded"># {doc.identity_file_number}</span>
          )}
          {doc.institution_name && <span className="text-[11px] text-gray-500">{doc.institution_name}</span>}
          {doc.company_name     && <span className="text-[11px] text-gray-500">{doc.company_name}</span>}
          {doc.uploaded_at && (
            <span className="text-[11px] text-gray-400">
              {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
      </div>
 
      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onPreview(doc)}
          title="View document"
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all"
        >
          <Eye className="w-3.5 h-3.5" /> View
        </button>
        <label className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-600 hover:text-white hover:border-green-600 transition-all cursor-pointer" title="Re-upload document">
          <input type="file" className="hidden" onChange={(e) => {
            const file = e.target.files[0];
            if (file && onUpload) onUpload(doc, file);
          }} />
          <Upload className="w-3.5 h-3.5" /> Upload
        </label>
        <button
          onClick={() => onDelete && onDelete(doc)}
          title="Delete document"
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
 
/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export default function BackgroundCheckPage() {
  /* ── API config ── */
  const BASE_URL =
    window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL ||
    import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
  const token = localStorage.getItem("token");
 
  /* ── List ── */
  const [employees, setEmployees]     = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch]           = useState("");
  const [bgFilter, setBgFilter]       = useState("ALL");
  const [empBgMap, setEmpBgMap]       = useState({});
 
  /* ── Selected employee ── */
  const [selectedEmp, setSelectedEmp]         = useState(null);
  const [profile, setProfile]                 = useState(null);
  const [loadingProfile, setLoadingProfile]   = useState(false);
 
  // Confirmation Modal States
  const [deleteConf, setDeleteConf] = useState({ isOpen: false, docId: null, cat: null, sourceId: null, doc: null });
  const [showFinalizeConf, setShowFinalizeConf] = useState(false);
  const [rejectionConf, setRejectionConf] = useState({ isOpen: false, id: null, reason: "" });
  const [addCheckModal, setAddCheckModal] = useState({ isOpen: false, group: "" });
  const [newCheckLabel, setNewCheckLabel] = useState("");
 
  const [checks, setChecks]                   = useState([]);
  const [loadingChecks, setLoadingChecks]     = useState(false);
  const [activeTab, setActiveTab]             = useState("checks");
 
  /* ── Checks UI ── */
  const [expanded, setExpanded]         = useState(null);
  const [checkFilter, setCheckFilter]   = useState("ALL");
  const [selectedIds, setSelectedIds]   = useState([]);
  const [updatingId, setUpdatingId]     = useState(null);
  const [editModeId, setEditModeId]     = useState(null);
  const [editFields, setEditFields]     = useState([]);
  const [uploadModal, setUploadModal]   = useState({ isOpen: false, cat: "", file: null, docName: "", docType: "" });
 
  /* ── Preview ── */
  const [previewDoc, setPreviewDoc] = useState(null);
 
  /* ── Email modal ── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending]     = useState(false);
  const [emailForm, setEmailForm]     = useState({
    to: "", cc: "",
    message: "Please find the attached background verification documents in the ZIP file. Kindly review and proceed with the background checks for the above employee.",
  });
 
  /* ─── Load employees ─── */
  const loadEmployees = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await api.get(
        `${BASE_URL}/permanent-employee/core-employee-details/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const employeeList = res.data || [];
      setEmployees(employeeList);
      setEmpBgMap(
        employeeList.reduce((acc, emp) => {
          if (emp.user_uuid && emp.bg_status) acc[emp.user_uuid] = normalizeStatus(emp.bg_status);
          return acc;
        }, {})
      );
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setEmployees(MOCK_EMPLOYEES);
      setEmpBgMap(
        MOCK_EMPLOYEES.reduce((acc, emp) => {
          acc[emp.user_uuid] = normalizeStatus(emp.bg_status);
          return acc;
        }, {})
      );
      showStatusToast("Employee API unavailable. Showing mock background check data.", "warning");
    } finally {
      setLoadingList(false);
    }
  }, [BASE_URL, token]);
 
  useEffect(() => { loadEmployees(); }, [loadEmployees]);
 
 
 
  /* ─── Load profile + checks ─── */
  const loadProfileAndChecks = useCallback(async (emp) => {
    if (!emp) return;
    setLoadingProfile(true);
    setLoadingChecks(true);
    setProfile(null);
    setChecks([]);
    setExpanded(null);
    setSelectedIds([]);
    setCheckFilter("ALL");
 
    // Fetch employee profile from real API
    let prof = {};
    try {
      const res = await api.get(
        `${BASE_URL}/hr/hr/${emp.user_uuid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      prof = res.data || {};
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      showStatusToast("Profile API unavailable. Showing available background check data.", "warning");
      prof = MOCK_PROFILES[emp.user_uuid] || DEFAULT_PROFILE(emp);
    }
    setProfile(prof);
    setLoadingProfile(false);
 
    // Fetch background check statuses — graceful fallback if endpoint not ready
    let raw = [];
    try {
      const chkRes = await api.get(
        `${BASE_URL}/hr/background-checks/${emp.user_uuid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      raw = chkRes.data || [];
    } catch (err) {
      // Endpoint may not exist yet — silently continue with PENDING statuses
      console.warn("Background checks endpoint not available, defaulting to PENDING:", err?.response?.status);
      raw = MOCK_CHECKS[emp.user_uuid] || DEFAULT_CHECKS;
    }
 
    // ── Build dynamic checks from profile documents ──
    const dynamicChecks = [];
    const processedGroups = new Set();
 
    // 1. Identity documents
    const identityDocs = prof.identity_documents || [];
    identityDocs.forEach((doc, i) => {
      processedGroups.add("Identity");
      const typeStr = doc.identity_type || "Identity";
      const key = `identity_${typeStr.toLowerCase().replace(/\s+/g, "_")}`;
      const api = (raw || []).find(c => c.check_type === key) || {};
      dynamicChecks.push({
        id:         api.check_uuid || `${key}_${i}`,
        check_type: key,
        label:      `${typeStr} Verification`,
        icon:       IDENTITY_ICON[typeStr] || ShieldCheck,
        group:      "Identity",
        docRef:     doc,
        status:     normalizeStatus(api.status || "PENDING"),
        details:    {
          "ID Type":   typeStr,
          "ID Number": doc.identity_file_number || "Not Updated",
          "Uploaded":  doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : "Not Updated",
        },
        notes:      api.notes || "",
      });
    });
    if (identityDocs.length === 0) {
      processedGroups.add("Identity");
      const api = (raw || []).find(c => c.group === "Identity") || {};
      dynamicChecks.push({
        id:         api.check_uuid || "identity_placeholder",
        check_type: "identity_primary",
        label:      "Identity Verification",
        icon:       ShieldCheck,
        group:      "Identity",
        docRef:     null,
        status:     normalizeStatus(api.status || "PENDING"),
        details:    { "Status": "Not Updated", "Requirement": "Aadhaar/PAN Card" },
        notes:      api.notes || "",
      });
    }
 
    // 2. Education documents
    const eduDocs = prof.education_documents || [];
    eduDocs.forEach((edu, i) => {
      processedGroups.add("Education");
      const key = `education_${i}`;
      const api = (raw || []).find(c => c.check_type === key) || {};
      dynamicChecks.push({
        id:         api.check_uuid || key,
        check_type: key,
        label:      `${edu.degree_name || edu.education_level || "Education"} Verification`,
        icon:       GraduationCap,
        group:      "Education",
        docRef:     edu,
        status:     normalizeStatus(api.status || "PENDING"),
        details:    {
          "Level":          edu.education_level || "Not Updated",
          "Degree":         edu.degree_name || "Not Updated",
          "Specialization": edu.specialization || "Not Updated",
          "Institution":    edu.institution_name || "Not Updated",
          "Passing Year":   edu.year_of_passing || "Not Updated",
          "Grade/CGPA":     edu.percentage_cgpa || "Not Updated",
          "Mode":           edu.education_mode || "Not Updated",
        },
        notes:      api.notes || "",
      });
    });
    if (eduDocs.length === 0) {
      processedGroups.add("Education");
      const api = (raw || []).find(c => c.group === "Education") || {};
      dynamicChecks.push({
        id:         api.check_uuid || "education_placeholder",
        check_type: "education_primary",
        label:      "Education Verification",
        icon:       GraduationCap,
        group:      "Education",
        docRef:     null,
        status:     normalizeStatus(api.status || "PENDING"),
        details:    { "Status": "Not Updated", "Requirement": "Highest Degree Certificate" },
        notes:      api.notes || "",
      });
    }
 
    // 3. Experience documents
    const expDocs = prof.experience || [];
    expDocs.forEach((exp, i) => {
      processedGroups.add("Experience");
      const key = `experience_${i}`;
      const api = (raw || []).find(c => c.check_type === key) || {};
      dynamicChecks.push({
        id:         api.check_uuid || key,
        check_type: key,
        label:      `${exp.company_name || "Employer"} Employment Check`,
        icon:       Briefcase,
        group:      "Experience",
        docRef:     exp,
        status:     normalizeStatus(api.status || "PENDING"),
        details:    {
          "Company":      exp.company_name || "Not Updated",
          "Designation":  exp.role_title || "Not Updated",
          "Type":         exp.employment_type || "Not Updated",
          "Duration":     `${exp.start_date || "Not Updated"} to ${exp.end_date || "Present"}`,
          "Notice Period": exp.notice_period_days ? `${exp.notice_period_days} Days` : "Not Updated",
        },
        notes:      api.notes || "",
      });
    });
    if (expDocs.length === 0) {
      processedGroups.add("Experience");
      const api = (raw || []).find(c => c.group === "Experience") || {};
      dynamicChecks.push({
        id:         api.check_uuid || "experience_placeholder",
        check_type: "experience_primary",
        label:      "Employment Check",
        icon:       Briefcase,
        group:      "Experience",
        docRef:     null,
        status:     normalizeStatus(api.status || "PENDING"),
        details:    { "Status": "Not Updated", "Requirement": "Relieving Letters / Payslips" },
        notes:      api.notes || "",
      });
    }
 
    // 4. Financial (Always mandatory as a placeholder)
    if (!processedGroups.has("Financial")) {
      processedGroups.add("Financial");
      const api = (raw || []).find(c => c.group === "Financial") || {};
      dynamicChecks.push({
        id:         api.check_uuid || "financial_placeholder",
        check_type: "financial_primary",
        label:      "Financial Records Check",
        icon:       CreditCard,
        group:      "Financial",
        docRef:     null,
        status:     normalizeStatus(api.status || "PENDING"),
        details:    { "Status": "Not Updated", "Requirement": "Bank Statements / CIBIL" },
        notes:      api.notes || "",
      });
    }
 
    // 5. Static & Additional checks
    STATIC_CHECKS.forEach(ct => {
      // Avoid duplicates with our placeholders
      if (processedGroups.has(ct.group) && ct.key === "bank_statement") return;
     
      const api = raw.find(c => c.check_type === ct.key) || {};
      let docRef = null;
      if (ct.key === "bank_statement" && prof.bank_documents?.[0]) {
        docRef = prof.bank_documents[0];
      }
 
      dynamicChecks.push({
        id:         api.check_uuid || ct.key,
        check_type: ct.key,
        label:      ct.label,
        icon:       ct.icon,
        group:      ct.group,
        docRef:     docRef,
        status:     normalizeStatus(api.status || "PENDING"),
        details:    api.details || { "Source": "External Verification", "Status": "Not Updated" },
        notes:      api.notes || "",
      });
    });
 
    setChecks(dynamicChecks);
 
    const allV = dynamicChecks.every(c => c.status === "VERIFIED");
    const anyR = dynamicChecks.some(c => c.status === "REJECTED");
    const anyI = dynamicChecks.some(c => c.status === "IN_REVIEW");
    const overall = allV ? "VERIFIED" : anyR ? "REJECTED" : anyI ? "IN_REVIEW" : "PENDING";
    setEmpBgMap(prev => ({ ...prev, [emp.user_uuid]: overall }));
 
    setLoadingChecks(false);
  }, [BASE_URL, token]);
 
 
  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    setActiveTab("checks");
    loadProfileAndChecks(emp);
  };
 
 
/* ─── Analytics ─── */
  const analytics = useMemo(() => ({
    VERIFIED:  checks.filter(c => c.status === "VERIFIED").length,
    IN_REVIEW: checks.filter(c => c.status === "IN_REVIEW").length,
    PENDING:   checks.filter(c => c.status === "PENDING").length,
    REJECTED:  checks.filter(c => c.status === "REJECTED").length,
  }), [checks]);
 
  const globalStats = useMemo(() => {
    const stats = { pending: 0, review: 0, verified: 0, rejected: 0 };
    employees.forEach(emp => {
      const status = empBgMap[emp.user_uuid] || emp.bg_status || "PENDING";
      if (status === "IN_REVIEW") stats.review++;
      else if (status === "VERIFIED") stats.verified++;
      else if (status === "REJECTED") stats.rejected++;
      else stats.pending++;
    });
    return stats;
  }, [employees, empBgMap]);
 
  const progress = checks.length ? Math.round((analytics.VERIFIED / checks.length) * 100) : 0;
 
  /* ─── Filtered employees ─── */
  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(emp => {
      const matchS = !q || `${emp.first_name} ${emp.last_name} ${emp.work_email} ${emp.employee_id}`.toLowerCase().includes(q);
      const status = empBgMap[emp.user_uuid] || emp.bg_status || "PENDING";
      const matchB = bgFilter === "ALL" || status === bgFilter;
      return matchS && matchB;
    });
  }, [employees, search, bgFilter, empBgMap]);
 
  const visibleChecks = checkFilter === "ALL" ? checks : checks.filter(c => c.status === checkFilter);
 
  /* ─── Sync overall employee status with sub-checks ─── */
  useEffect(() => {
    if (!selectedEmp || checks.length === 0) return;
 
    const allV = checks.every(c => c.status === "VERIFIED");
    const anyR = checks.some(c => c.status === "REJECTED");
    const anyI = checks.some(c => c.status === "IN_REVIEW");
    const overall = allV ? "VERIFIED" : anyR ? "REJECTED" : anyI ? "IN_REVIEW" : "PENDING";
 
    if (empBgMap[selectedEmp.user_uuid] !== overall) {
      setEmpBgMap(prev => ({ ...prev, [selectedEmp.user_uuid]: overall }));
    }
  }, [checks, selectedEmp, empBgMap]);
 
  /* ─── Update check status ─── */
  const updateCheckStatus = async (id, status, reason = "") => {
    if (status.toUpperCase() === "REJECTED" && !reason) {
      setRejectionConf({ isOpen: true, id, reason: "" });
      return;
    }
    setUpdatingId(id);
    try {
      await api.patch(
        `${BASE_URL}/hr/background-checks/${id}`,
        { status, notes: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      // If endpoint not yet implemented, apply optimistic update silently
      console.warn("PATCH background-checks not available, applying optimistic update:", err?.response?.status);
    }
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status: normalizeStatus(status), notes: reason || c.notes } : c));
    showStatusToast(`Marked as ${status}`, status === "REJECTED" ? "error" : "success");
    setUpdatingId(null);
    setRejectionConf({ isOpen: false, id: null, reason: "" });
  };
 
  /* ─── Bulk Verify ─── */
  const bulkMarkVerified = async () => {
    if (selectedIds.length === 0) return;
    setUpdatingId("bulk");
    await new Promise(r => setTimeout(r, 800));
    setChecks(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, status: "VERIFIED" } : c));
    showStatusToast(`Marked ${selectedIds.length} items as Verified`, "success");
    setSelectedIds([]);
    setUpdatingId(null);
  };
 
  /* ─── Add/Delete Check Logic ─── */
  const deleteCheck = (id) => {
    setDeleteConf({ isOpen: true, docId: id, cat: null, sourceId: "task", doc: null });
  };
 
  const confirmDeleteCheck = async () => {
    const id = deleteConf.docId;
    if (!id) return;
    setUpdatingId(id);
    try {
      await api.delete(`${BASE_URL}/hr/background-checks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.warn("DELETE /hr/background-checks not available, applying optimistic update:", err?.response?.status);
    }
    setChecks(prev => prev.filter(c => c.id !== id));
    showStatusToast("Task removed", "success");
    setUpdatingId(null);
    setDeleteConf({ isOpen: false, docId: null, cat: null, sourceId: null, doc: null });
  };
 
  const addCheck = async () => {
    if (!newCheckLabel.trim()) return;
    const { group } = addCheckModal;
    setUpdatingId("add_task");
   
    const payload = {
      user_uuid: selectedEmp.user_uuid,
      check_type: `manual_${group.toLowerCase().replace(/\s+/g, "_")}`,
      label: newCheckLabel,
      group: group,
      status: "PENDING"
    };
 
    try {
      const res = await api.post(`${BASE_URL}/hr/background-checks`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newCheck = {
        ...payload,
        id: res.data?.check_uuid || res.data?.id || `manual_${Date.now()}`,
        icon: CheckCircle2,
        details: { "Created": "Manually by HR" },
        notes: ""
      };
      setChecks(prev => [...prev, newCheck]);
    } catch (err) {
      console.warn("POST /hr/background-checks not available, applying optimistic update:", err?.response?.status);
      const newCheck = {
        ...payload,
        id: `manual_${Date.now()}`,
        icon: CheckCircle2,
        details: { "Created": "Manually by HR" },
        notes: ""
      };
      setChecks(prev => [...prev, newCheck]);
    }
   
    showStatusToast("Task added successfully", "success");
    setUpdatingId(null);
    setAddCheckModal({ isOpen: false, group: "" });
    setNewCheckLabel("");
  };
 
  /* ─── Send to consultancy ─── */
  const handleSend = async () => {
    if (!emailForm.to.trim()) { showStatusToast("Consultancy email required", "error"); return; }
    setIsSending(true);
    try {
      await api.post(
        `${BASE_URL}/hr/background-checks/send-to-consultancy`,
        {
          user_uuid: selectedEmp.user_uuid,
          to_email: emailForm.to,
          cc_email: emailForm.cc,
          message: emailForm.message,
          check_ids: selectedIds,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.warn("Send-to-consultancy API not available, applying optimistic update:", err?.response?.status);
    }
    // Mark selected checks as IN_REVIEW optimistically
    setChecks(prev => prev.map(c => selectedIds.includes(c.id) ? { ...c, status: "IN_REVIEW" } : c));
    setEmpBgMap(prev => ({ ...prev, [selectedEmp.user_uuid]: "IN_REVIEW" }));
    showStatusToast(`Documents sent for ${selectedEmp.first_name}. Verification process started.`, "success");
    setIsModalOpen(false);
    setSelectedIds([]);
    setIsSending(false);
  };
 
  /* ─── All docs from profile & manual doc uploads ─── */
  const allDocuments = useMemo(() => {
    if (!profile) return [];
    const docs = [];
    (profile.education_documents || []).forEach(d =>
      docs.push({ ...d, _cat: "Education", _title: `${d.degree_name || d.education_level}` })
    );
    (profile.experience || []).forEach(exp =>
      (exp.documents || []).forEach(d =>
        docs.push({ ...d, _cat: "Experience", _title: `${exp.company_name} · ${exp.role_title}` })
      )
    );
    (profile.identity_documents || []).forEach(d =>
      docs.push({ ...d, _cat: "Identity", _title: d.identity_type })
    );
    (profile.bank_documents || []).forEach(d =>
      docs.push({ ...d, _cat: "Bank Statement", _title: d.document_name || "Bank Statement" })
    );
 
    // Merge in any manually uploaded session documents
    checks.forEach(c => {
      // Manual uploads should have _isManual: true or identity_type: "Manual Upload" set on the docRef inside checks
      if (c.docRef && (c.docRef._isManual || c.docRef.identity_type === "Manual Upload")) {
        docs.push({ ...c.docRef, _cat: c.group || "Other", _title: c.label });
      }
    });
 
    return docs;
  }, [profile, checks]);
 
  /* ══════════════════════════ RENDER ══════════════════════════ */
  return (
    <div className="min-h-screen bg-[#f4f6fb] p-6 space-y-5">
 
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#081534]">Background Check Tracker</h1>
          <p className="text-xs text-gray-500 mt-0.5">Select a candidate to view and manage their verification status</p>
        </div>
        <button onClick={loadEmployees} className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 bg-white px-3 py-1.5 rounded-lg hover:shadow-sm transition-all">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
 
      {/* Global stats / KPI Filters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: "PENDING",   label: "Pending",   count: globalStats.pending,  color: "bg-gray-400",  ring: "ring-gray-300",  icon: Clock3 },
          { key: "IN_REVIEW", label: "In Review", count: globalStats.review,   color: "bg-blue-500",  ring: "ring-blue-300",  icon: Clock },
          { key: "VERIFIED",  label: "Verified",  count: globalStats.verified, color: "bg-green-500", ring: "ring-green-300", icon: CheckCircle2 },
          { key: "REJECTED",  label: "Rejected",  count: globalStats.rejected, color: "bg-red-500",   ring: "ring-red-300",   icon: AlertTriangle },
        ].map(kpi => (
          <StatCard
            key={kpi.key}
            label={kpi.label}
            count={kpi.count}
            color={kpi.color}
            Icon={kpi.icon}
            isActive={bgFilter === kpi.key}
            activeColor={kpi.ring}
            onClick={() => setBgFilter(prev => prev === kpi.key ? "ALL" : kpi.key)}
          />
        ))}
      </div>
 
      {/* Two panel */}
      <div className="flex gap-5 items-start flex-col lg:flex-row">
 
        {/* ── LEFT: Candidate list ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm w-full lg:w-72 shrink-0 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-700" />
            <span className="text-sm font-bold text-gray-800">Candidates</span>
            <span className="text-[11px] text-gray-400 ml-1">({filteredEmployees.length})</span>
            {bgFilter !== "ALL" && (
              <button
                onClick={() => setBgFilter("ALL")}
                className="ml-auto text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text" placeholder="Search…" value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-800 bg-gray-50"
              />
            </div>
          </div>
          <div className="px-3 py-2 border-b border-gray-100">
            <FilterListbox
              options={[
                { value: "ALL", label: "All Status" },
                { value: "PENDING", label: "Pending" },
                { value: "IN_REVIEW", label: "In Review" },
                { value: "VERIFIED", label: "Verified" },
                { value: "REJECTED", label: "Rejected" },
              ]}
              value={bgFilter}
              onChange={setBgFilter}
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 max-h-[520px]">
            {loadingList ? (
              <div className="space-y-2 animate-pulse p-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredEmployees.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No candidates found.</p>
            ) : filteredEmployees.map(emp => (
              <CandidateItem
                key={emp.user_uuid}
                emp={emp}
                isSelected={selectedEmp?.user_uuid === emp.user_uuid}
                bgStatus={empBgMap[emp.user_uuid] || emp.bg_status || "PENDING"}
                onClick={() => handleSelectEmployee(emp)}
              />
            ))}
          </div>
        </div>
 
        {/* ── RIGHT: Detail panel ── */}
        <div className="flex-1 min-w-0">
          {!selectedEmp ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-20 text-center">
              <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-semibold text-gray-400">No candidate selected</p>
              <p className="text-xs text-gray-300 mt-1">Click a candidate on the left to begin</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Employee header card */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-lg shadow">
                    {selectedEmp.first_name?.[0]}{selectedEmp.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <p className="text-base font-bold text-gray-800">{selectedEmp.first_name} {selectedEmp.last_name}</p>
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${SC[empBgMap[selectedEmp.user_uuid] || "PENDING"].bg} ${SC[empBgMap[selectedEmp.user_uuid] || "PENDING"].text} uppercase tracking-wider ring-1 ring-inset ${empBgMap[selectedEmp.user_uuid] === "IN_REVIEW" ? "animate-pulse ring-blue-200" : "ring-gray-100"}`}>
                        <div className={`w-1 h-1 rounded-full ${SC[empBgMap[selectedEmp.user_uuid] || "PENDING"].dot}`}></div>
                        {SC[empBgMap[selectedEmp.user_uuid] || "PENDING"].label}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-500">
                      {selectedEmp.work_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gray-400" />{selectedEmp.work_email}</span>}
                      {selectedEmp.contact_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-400" />{selectedEmp.contact_number}</span>}
                      {selectedEmp.department_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3 text-gray-400" />{selectedEmp.department_name}</span>}
                      {selectedEmp.joining_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gray-400" />Joined {selectedEmp.joining_date}</span>}
                    </div>
                  </div>
                  <StatusBadge label={selectedEmp.employment_status || "—"} size="sm" />
                </div>
 
                {!loadingChecks && checks.length > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span className="font-medium">Verification Progress</span>
                      <span className="font-bold text-[#081534]">{analytics.VERIFIED}/{checks.length} verified · {progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#312e81,#6d28d9)" }} />
                    </div>
                    {progress === 100 && (empBgMap[selectedEmp.user_uuid] || "PENDING") !== "VERIFIED" && (
                      <div className="mt-3 flex justify-end">
                        <Button variant="primary" size="small" onClick={() => setShowFinalizeConf(true)}>
                          <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1.5" />
                          Mark Process as Completed
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap mt-2">
                      {[
                        { k: "PENDING",   l: "Pending",   c: "bg-gray-100 text-gray-600" },
                        { k: "IN_REVIEW", l: "In Review", c: "bg-blue-100 text-blue-700" },
                        { k: "VERIFIED",  l: "Verified",  c: "bg-green-100 text-green-700" },
                        { k: "REJECTED",  l: "Rejected",  c: "bg-red-100 text-red-700" },
                      ].filter(({ k }) => analytics[k] > 0).map(({ k, l, c }) => (
                        <span key={k} className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${c}`}>
                          {analytics[k]} {l}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
 
              {/* Tabs */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {[
                    { key: "checks",    label: "BG Checks",   Icon: ShieldCheck, badge: checks.length },
                    { key: "profile",   label: "Profile",     Icon: User,        badge: 0 },
                    { key: "documents", label: "Documents",   Icon: FileText,    badge: allDocuments.length },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all border-b-2 ${
                        activeTab === tab.key
                          ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <tab.Icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {tab.badge > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
 
                <div className="p-4">
 
                  {/* ── BG CHECKS TAB ── */}
                  {activeTab === "checks" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                            <input
                              type="checkbox"
                              className="w-4 h-4 accent-indigo-900 rounded"
                              checked={selectedIds.length === checks.length && checks.length > 0}
                              onChange={() => setSelectedIds(p => p.length === checks.length ? [] : checks.map(c => c.id))}
                            />
                            Select All
                          </label>
                          <FilterListbox
                            options={[
                              { value: "ALL", label: "All" },
                              { value: "PENDING", label: "Pending" },
                              { value: "IN_REVIEW", label: "In Review" },
                              { value: "VERIFIED", label: "Verified" },
                              { value: "REJECTED", label: "Rejected" },
                            ]}
                            value={checkFilter}
                            onChange={setCheckFilter}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="primary" size="small" onClick={() => setIsModalOpen(true)} disabled={selectedIds.length === 0}>
                            <Folder className="w-3.5 h-3.5 inline-block mr-1.5" />
                            Consultancy ({selectedIds.length})
                          </Button>
                        </div>
                      </div>
 
                      {loadingChecks ? (
                        <div className="space-y-2 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}</div>
                      ) : (() => {
                        const groups = ["Identity", "Education", "Experience", "Reference", "Compliance", "Financial", "Address"];
                        const grouped = visibleChecks.reduce((acc, c) => {
                          if (!acc[c.group]) acc[c.group] = [];
                          acc[c.group].push(c);
                          return acc;
                        }, {});
 
                        return groups.filter(g => grouped[g] || g === "Address" || g === "Compliance").map(groupName => {
                          const groupItems = grouped[groupName] || [];
                          const verifiedCount = groupItems.filter(i => i.status === "VERIFIED").length;
                          const progress = groupItems.length > 0 ? (verifiedCount / groupItems.length) * 100 : 0;
 
                          if (groupItems.length === 0 && !["Identity", "Education", "Experience"].includes(groupName)) return null;
                         
                          const IconGroup = groupName === "Identity" ? ShieldCheck : groupName === "Education" ? GraduationCap : groupName === "Experience" ? Briefcase : Folder;
 
                          return (
                            <div key={groupName} className="mb-6 bg-white/50 rounded-2xl border border-gray-100 p-4 transition-all hover:bg-white hover:shadow-sm">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-indigo-50 rounded-xl">
                                    <IconGroup className="w-5 h-5 text-indigo-600" />
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-bold text-gray-800">{groupName} Sessions</h3>
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                                      </div>
                                      <span className="text-[10px] text-gray-400 font-medium">{verifiedCount} of {groupItems.length} verified</span>
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setAddCheckModal({ isOpen: true, group: groupName })}
                                  className="h-8 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" /> Add Task
                                </button>
                              </div>
 
                              <div className="space-y-2.5">
                                {groupItems.map(check => {
                                  const Icon = check.icon;
                                  const isExp = expanded === check.id;
                                  const isSel = selectedIds.includes(check.id);
                                  const sc = SC[check.status] || SC.PENDING;
                                  return (
                                    <div key={check.id} className={`rounded-xl border shadow-sm transition-all ${isSel ? "border-indigo-300 ring-1 ring-indigo-100" : "border-gray-200 hover:border-gray-300"}`}>
                                      <div className="flex items-center px-4 py-3 gap-3">
                                        <input type="checkbox" className="w-4 h-4 accent-indigo-900 rounded shrink-0"
                                          checked={isSel}
                                          onChange={e => setSelectedIds(p => e.target.checked ? [...p, check.id] : p.filter(x => x !== check.id))}
                                        />
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sc.bg}`}>
                                          <Icon className={`w-4 h-4 ${sc.text}`} />
                                        </div>
                                        <div className="flex-1 flex items-center justify-between cursor-pointer min-w-0"
                                          onClick={() => setExpanded(isExp ? null : check.id)}>
                                          <span className="text-xs font-semibold text-gray-800 truncate pr-3">{check.label}</span>
                                          <div className="flex items-center gap-3 shrink-0">
                                            <StatusBadge label={check.status.replace("_", " ")} size="sm" />
                                            <button
                                              onClick={(e) => { e.stopPropagation(); deleteCheck(check.id); }}
                                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExp ? "rotate-180" : ""}`} />
                                          </div>
                                        </div>
                                      </div>
                                      {/* ... expanded content remains same ... */}
                                      {isExp && (
                                        <div className="border-t border-gray-100 px-4 pb-4 pt-3 ml-16">
                                          <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Verification Details</h4>
                                            {editModeId !== check.id && (
                                              <button onClick={() => {
                                                setEditModeId(check.id);
                                                setEditFields(Object.entries(check.details || {}).map(([k,v]) => ({ key: k, value: v })));
                                              }} className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100 px-2 py-1.5 rounded font-semibold flex items-center gap-1 transition-all">
                                                Edit Fields
                                              </button>
                                            )}
                                          </div>
                                          {editModeId === check.id ? (
                                            <div className="space-y-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                              {editFields.map((f, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                  <input type="text" value={f.key} onChange={e => {
                                                    const n = [...editFields]; n[i].key = e.target.value; setEditFields(n);
                                                  }} className="w-1/3 px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-white" placeholder="Field Name" />
                                                  <input type="text" value={f.value} onChange={e => {
                                                    const n = [...editFields]; n[i].value = e.target.value; setEditFields(n);
                                                  }} className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 bg-white" placeholder="Value" />
                                                  <button onClick={() => {
                                                    setEditFields(editFields.filter((_, idx) => idx !== i));
                                                  }} className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-md transition-colors" title="Remove Field">
                                                     <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              ))}
                                              <div className="flex flex-wrap gap-2 pt-2 mt-2 border-t border-gray-200">
                                                 <button onClick={() => setEditFields([...editFields, { key: "", value: "" }])} className="text-[11px] font-semibold px-2.5 py-1.5 text-indigo-600 bg-indigo-100/50 hover:bg-indigo-100 rounded-lg flex items-center gap-1 transition-all">
                                                    <Plus className="w-3.5 h-3.5" /> Add Field
                                                 </button>
                                                 <button onClick={() => {
                                                    setUpdatingId(check.id + "_save");
                                                    setTimeout(() => {
                                                      const newDetails = {};
                                                      editFields.forEach(f => { if (f.key.trim()) newDetails[f.key] = f.value; });
                                                      setChecks(prev => prev.map(c => c.id === check.id ? { ...c, details: newDetails } : c));
                                                      showStatusToast("Details saved successfully", "success");
                                                      setUpdatingId(null);
                                                      setEditModeId(null);
                                                    }, 300);
                                                 }} disabled={updatingId === check.id + "_save"} className="ml-auto text-[11px] font-semibold px-4 py-1.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1 transition-all shadow-sm">
                                                    {updatingId === check.id + "_save" ? (
                                                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                                                    ) : (
                                                      <><CheckCircle2 className="w-3.5 h-3.5" /> Save Changes</>
                                                    )}
                                                 </button>
                                                 <button onClick={() => setEditModeId(null)} className="text-[11px] font-semibold px-4 py-1.5 text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-all shadow-sm">
                                                    Cancel
                                                 </button>
                                              </div>
                                            </div>
                                          ) : (
                                            Object.keys(check.details || {}).length > 0 ? (
                                              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-4 px-1">
                                                {Object.entries(check.details || {}).map(([k, v]) => (
                                                  <div key={k} className="text-xs">
                                                    <span className="text-gray-400 mr-2">{k}:</span>
                                                    <span className="font-semibold text-gray-800">{String(v)}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : <p className="text-xs text-gray-400 italic mb-3 px-1">No details available.</p>
                                          )}
                                          {check.notes && (
                                            <p className="text-xs bg-amber-50 border border-amber-100 text-amber-800 rounded px-3 py-2 mb-3">📝 {check.notes}</p>
                                          )}
                                          {!check.docRef && ["Identity", "Education", "Experience", "Financial"].includes(check.group) && check.check_type !== "cibil_check" && (
                                            <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-50 border-l-2 border-amber-500 text-amber-800 text-xs rounded mb-3">
                                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                              <span><span className="font-semibold">Document expected.</span> Please instruct candidate to upload the document.</span>
                                            </div>
                                          )}
 
<div className="flex flex-wrap items-center gap-2">
                                            {check.docRef ? (
                                              <>
                                                <Button variant="secondary" size="small" onClick={() => setActiveTab("documents")}>
                                                  <Folder className="w-3.5 h-3.5 inline-block mr-1" />
                                                  View Document in Docs Tab
                                                </Button>
                                                <Button variant="danger" size="small" onClick={() => {
                                                  setDeleteConf({ isOpen: true, docId: check.id, sourceId: "session" });
                                                }} disabled={updatingId === `${check.id}_del_doc`}>
                                                  {updatingId === `${check.id}_del_doc` ? <RefreshCw className="w-3.5 h-3.5 inline-block mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 inline-block mr-1" />}
                                                  Remove Document
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <input type="file" id={`upload-doc-${check.id}`} className="hidden" onChange={(e) => {
                                                  const file = e.target.files[0];
                                                  if (!file) return;
                                                  setUpdatingId(`${check.id}_up_doc`);
                                                  setTimeout(() => {
                                                    const mockDoc = { document_name: file.name, uploaded_at: new Date().toISOString(), identity_type: "Manual Upload", _isManual: true };
                                                    setChecks(prev => prev.map(c => c.id === check.id ? { ...c, docRef: mockDoc } : c));
                                                    showStatusToast(`Uploaded ${file.name}`, "success");
                                                    setUpdatingId(null);
                                                  }, 500);
                                                }} />
                                                <Button variant="secondary" size="small" onClick={() => document.getElementById(`upload-doc-${check.id}`).click()} disabled={updatingId === `${check.id}_up_doc`}>
                                                  {updatingId === `${check.id}_up_doc` ? <RefreshCw className="w-3.5 h-3.5 inline-block mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 inline-block mr-1" />}
                                                  Upload Document
                                                </Button>
                                              </>
                                            )}
                                            <Button variant="success" size="small"
                                              disabled={updatingId === check.id || check.status === "VERIFIED"}
                                              onClick={() => updateCheckStatus(check.id, "Verified")}>
                                              <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1" />
                                              {updatingId === check.id ? "Saving…" : "Mark Verified"}
                                            </Button>
                                            <Button variant="danger" size="small"
                                              disabled={updatingId === check.id || check.status === "REJECTED"}
                                              onClick={() => updateCheckStatus(check.id, "Rejected")}>
                                              <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1" />
                                              {updatingId === check.id ? "Saving…" : "Flag Rejected"}
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}
                      <div className="mt-8 pt-6 border-t border-dashed border-gray-100 text-center">
                        <button
                          onClick={() => setAddCheckModal({ isOpen: true, group: "Custom Session" })}
                          className="px-6 py-3 bg-white border border-gray-200 rounded-2xl text-gray-600 text-xs font-bold hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center gap-2 mx-auto shadow-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Create New Verification Session
                        </button>
                      </div>
                    </div>
                  )}
 
                  {/* ── PROFILE TAB ── */}
                  {activeTab === "profile" && (
                    loadingProfile ? (
                      <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}</div>
                    ) : !profile ? (
                      <p className="text-xs text-gray-400 text-center py-10">Profile data unavailable.</p>
                    ) : (
                      <div className="space-y-4">
                        {profile.offer && (
                          <SectionCard title="Personal Details" icon={User}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                              <InfoRow label="Full Name" value={`${profile.offer.first_name} ${profile.offer.last_name}`} />
                              <InfoRow label="Email" value={profile.offer.email} />
                              <InfoRow label="Mobile" value={profile.offer.contact_number} />
                              <InfoRow label="Designation" value={profile.offer.designation} />
                              <InfoRow label="Gender" value={profile.personal_details?.gender} />
                              <InfoRow label="Date of Birth" value={profile.personal_details?.date_of_birth} />
                              <InfoRow label="Blood Group" value={profile.personal_details?.blood_group} />
                              <InfoRow label="Nationality" value={profile.personal_details?.nationality} />
                            </div>
                          </SectionCard>
                        )}
                        {/* Addresses */}
                        <SectionCard title="Addresses" icon={MapPin}>
                          {(profile.addresses?.length > 0) ? profile.addresses.map((a, i) => (
                            <div key={i} className={i > 0 ? "pt-3 mt-3 border-t border-gray-100" : ""}>
                              <span className="text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded mb-2 inline-block">
                                {a.address_type || "Address"}
                              </span>
                              <div className="grid grid-cols-2 gap-x-6">
                                <InfoRow label="Address" value={a.address_line1} />
                                <InfoRow label="City" value={a.city} />
                                <InfoRow label="State" value={a.state_or_region} />
                                <InfoRow label="Postal Code" value={a.postal_code} />
                                <InfoRow label="Country" value={a.country} />
                              </div>
                            </div>
                          )) : (
                            <div className="grid grid-cols-2 gap-x-6">
                              <InfoRow label="Current Address" value={null} />
                              <InfoRow label="Permanent Address" value={null} />
                            </div>
                          )}
                        </SectionCard>
 
                        {/* Bank Details */}
                        <SectionCard title="Bank Details" icon={Building2}>
                          <div className="grid grid-cols-2 gap-x-6">
                            <InfoRow label="Account Holder" value={profile.bank_details?.account_holder_name} />
                            <InfoRow label="Bank Name" value={profile.bank_details?.bank_name} />
                            <InfoRow label="Account No." value={profile.bank_details?.account_number} />
                            <InfoRow label="IFSC Code" value={profile.bank_details?.ifsc_code} />
                            <InfoRow label="Account Type" value={profile.bank_details?.account_type} />
                          </div>
                        </SectionCard>
 
                        {/* Education */}
                        <SectionCard title="Education" icon={GraduationCap}>
                          {(profile.education_documents?.length > 0) ? profile.education_documents.map((e, i) => (
                            <div key={i} className={i > 0 ? "pt-3 mt-3 border-t border-gray-100" : ""}>
                              <p className="text-xs font-bold text-gray-700 mb-1">{e.degree_name || e.education_level}</p>
                              <div className="grid grid-cols-2 gap-x-6">
                                <InfoRow label="Institution" value={e.institution_name} />
                                <InfoRow label="Specialization" value={e.specialization} />
                                <InfoRow label="Year of Passing" value={e.year_of_passing} />
                                <InfoRow label="CGPA" value={e.percentage_cgpa} />
                              </div>
                            </div>
                          )) : (
                            <div className="py-2">
                              <p className="text-[11px] font-bold text-gray-400 uppercase mb-2">Primary Education</p>
                              <div className="grid grid-cols-2 gap-x-6">
                                <InfoRow label="Degree" value={null} />
                                <InfoRow label="Institution" value={null} />
                              </div>
                            </div>
                          )}
                        </SectionCard>
 
                        {/* Work Experience */}
                        <SectionCard title="Work Experience" icon={Briefcase}>
                          {(profile.experience?.length > 0) ? profile.experience.map((exp, i) => (
                            <div key={i} className={i > 0 ? "pt-3 mt-3 border-t border-gray-100" : ""}>
                              <p className="text-xs font-bold text-gray-700 mb-1">{exp.company_name} · {exp.role_title}</p>
                              <div className="grid grid-cols-2 gap-x-6">
                                <InfoRow label="Type" value={exp.employment_type} />
                                <InfoRow label="Start" value={exp.start_date} />
                                <InfoRow label="End" value={exp.end_date || "Present"} />
                                <InfoRow label="Notice Period" value={exp.notice_period_days ? `${exp.notice_period_days} days` : null} />
                              </div>
                            </div>
                          )) : (
                            <div className="py-2">
                              <p className="text-[11px] font-bold text-gray-400 uppercase mb-2">Previous Employment</p>
                              <div className="grid grid-cols-2 gap-x-6">
                                <InfoRow label="Company" value={null} />
                                <InfoRow label="Designation" value={null} />
                              </div>
                            </div>
                          )}
                        </SectionCard>
                      </div>
                    )
                  )}
 
                  {/* ── DOCUMENTS TAB ── */}
                  {activeTab === "documents" && (
                    loadingProfile ? (
                      <div className="space-y-4 animate-pulse">
                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
                      </div>
                    ) : (() => {
                      const grouped = allDocuments.reduce((acc, doc) => {
                        if (!acc[doc._cat]) acc[doc._cat] = [];
                        acc[doc._cat].push(doc);
                        return acc;
                      }, { Identity: [], Education: [], Experience: [], Financial: [] });
 
                      const catIcons = { Education: GraduationCap, Experience: Briefcase, Identity: ShieldCheck, Certifications: Award, Financial: CreditCard };
 
                      return (
                        <div className="space-y-4">
                          {Object.entries(grouped)
                            .sort(([a], [b]) => {
                              const order = { Identity: 1, Education: 2, Experience: 3, Financial: 4 };
                              return (order[a] || 5) - (order[b] || 5);
                            })
                            .map(([cat, docs]) => {
                              const CatIcon = catIcons[cat] || FileText;
                              const isVerified = checks.filter(c => c.group === cat).every(c => c.status === "VERIFIED") && checks.some(c => c.group === cat);
 
                              return (
                                <div key={cat} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white hover:border-indigo-100 transition-colors">
                                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-1.5 bg-white rounded-lg border border-gray-100 shadow-sm">
                                        <CatIcon className="w-4 h-4 text-indigo-600" />
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
                                          {cat}
                                          {isVerified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">{docs.length} Document{docs.length !== 1 ? "s" : ""}</span>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => setUploadModal({ isOpen: true, cat, file: null, docName: "", docType: "" })}
                                      disabled={updatingId === `upload_folder_${cat}`}
                                      className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-white text-indigo-600 border border-indigo-100 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    >
                                      {updatingId === `upload_folder_${cat}` ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Upload className="w-3 h-3" />}
                                      Upload New
                                    </button>
                                  </div>
                                  <div className="p-3 bg-white space-y-2">
                                    {docs.length === 0 ? (
                                      <div className="py-8 text-center flex flex-col items-center justify-center">
                                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center mb-2">
                                          <FileText className="w-4 h-4 text-gray-200" />
                                        </div>
                                        <p className="text-[11px] font-semibold text-gray-400 italic">Not Updated</p>
                                        <p className="text-[10px] text-gray-300 mt-1">No documents provided yet.</p>
                                      </div>
                                    ) : (
                                      docs.map((doc, idx) => (
                                        <div key={idx}>
                                          {doc._title && (
                                            <p className="text-[11px] font-semibold text-gray-400 px-1 mb-1 mt-2 first:mt-0">{doc._title}</p>
                                          )}
                                          <DocCard
                                            doc={doc}
                                            idx={idx}
                                            isVerified={true}
                                            onPreview={setPreviewDoc}
                                            onDelete={(d) => setDeleteConf({ isOpen: true, doc: d, sourceId: "documents" })}
                                            onUpload={async (docRef, file) => {
                                              setUpdatingId(`upload_doc_${docRef.id || idx}`);
                                              try {
                                                const formData = new FormData();
                                                formData.append("file", file);
                                                formData.append("user_uuid", selectedEmp.user_uuid);
                                                formData.append("category", cat.toLowerCase());
                                                formData.append("document_id", docRef.id || "");
                                                formData.append("document_name", docRef.document_name || file.name);
 
                                                await api.post(`${BASE_URL}/hr/upload-document`, formData, {
                                                  headers: {
                                                    Authorization: `Bearer ${token}`,
                                                    "Content-Type": "multipart/form-data"
                                                  }
                                                });
                                                showStatusToast("Re-uploaded successfully", "success");
                                                loadProfileAndChecks(selectedEmp);
                                              } catch (err) {
                                                console.error("Upload error:", err);
                                                showStatusToast("Upload failed", "error");
                                              } finally {
                                                setUpdatingId(null);
                                              }
                                            }}
                                          />
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      );
                    })()
                  )}
 
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
 
      {/* Document preview modal */}
      {previewDoc && <DocPreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
 
      {/* Email modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <h2 className="text-sm font-bold text-[#081534] flex items-center gap-2">
                <FileArchive className="w-5 h-5 text-indigo-700" /> Send Documents to Consultancy
              </h2>
              <button onClick={() => setIsModalOpen(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-4">
              <div className="flex gap-2 bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs rounded-lg px-4 py-3">
                <FileArchive className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Selected checks and their attached documents will be packed into a ZIP and emailed to the consultancy.</p>
              </div>
              {selectedEmp && (
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {selectedEmp.first_name?.[0]}{selectedEmp.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{selectedEmp.first_name} {selectedEmp.last_name}</p>
                    <p className="text-[11px] text-gray-400">{selectedEmp.work_email}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">To — Consultancy Email <span className="text-red-500">*</span></label>
                <input type="email" value={emailForm.to} onChange={e => setEmailForm({...emailForm, to: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-800"
                  placeholder="consultancy@example.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">CC (comma-separated)</label>
                <input type="text" value={emailForm.cc} onChange={e => setEmailForm({...emailForm, cc: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-800"
                  placeholder="hr@company.com, manager@company.com" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Message</label>
                <textarea rows={3} value={emailForm.message} onChange={e => setEmailForm({...emailForm, message: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-800 resize-none" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">Selected Checks — {selectedIds.length}</p>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {checks.filter(c => selectedIds.includes(c.id)).map(item => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id} className="flex items-center gap-3 text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                        <Icon className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-800 truncate">{item.label}</p>
                          {item.docRef && (
                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5"><FileText className="w-3 h-3 text-indigo-400" /> Attached: {item.docRef.document_name || item.docRef.identity_type || "Document"}</p>
                          )}
                        </div>
                        <StatusBadge label={item.status.replace("_", " ")} size="sm" />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <Button variant="secondary" size="small" onClick={() => setIsModalOpen(false)} disabled={isSending}>Cancel</Button>
              <Button variant="primary" size="small" onClick={handleSend} disabled={isSending}>
                {isSending ? (
                  <><svg className="animate-spin w-3.5 h-3.5 inline-block mr-1.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sending…</>
                ) : (
                  <><Send className="w-3.5 h-3.5 inline-block mr-1.5" />Send ZIP via Email</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Confirmation Modal for Finalizing */}
      <ConfirmationModal
        isOpen={showFinalizeConf}
        title="Finalize Verification?"
        message={`Are you sure you want to mark the background verification for ${selectedEmp?.first_name} as COMPLETED? This will finalize their record and mark the process as successful.`}
        onConfirm={async () => {
          setUpdatingId("finalize");
          await new Promise(r => setTimeout(r, 800));
          setEmpBgMap(prev => ({ ...prev, [selectedEmp.user_uuid]: "VERIFIED" }));
          setShowFinalizeConf(false);
          showStatusToast("Verification Process Completed!", "success");
          setUpdatingId(null);
        }}
        onCancel={() => setShowFinalizeConf(false)}
        isLoading={updatingId === "finalize"}
        confirmText="Finalize Process"
      />
 
      {/* Confirmation Modal for Deletion */}
      <ConfirmationModal
        isOpen={deleteConf.isOpen}
        title={deleteConf.sourceId === "task" ? "Remove Verification Task?" : "Delete Document?"}
        message={deleteConf.sourceId === "task"
          ? "Are you sure you want to remove this verification step? This will delete the task and its status."
          : "Are you sure you want to delete this document? This action cannot be undone."
        }
        onConfirm={async () => {
          if (deleteConf.sourceId === "task") {
            await confirmDeleteCheck();
            return;
          }
 
          setUpdatingId("delete");
          try {
            const d = deleteConf.doc;
            if (d && d.id) {
              const category = d._cat?.toLowerCase() || "identity";
              await api.delete(`${BASE_URL}/hr/delete-document/${d.id}?category=${category}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              showStatusToast("Document deleted successfully", "success");
              // Refresh to sync state
              loadProfileAndChecks(selectedEmp);
            } else {
               // Fallback for manual session docs that don't have IDs yet
               if (deleteConf.sourceId === "session") {
                  setChecks(prev => prev.map(c => c.id === deleteConf.docId ? { ...c, docRef: null } : c));
               }
               showStatusToast("Document removed", "success");
            }
          } catch (err) {
            console.error("Delete failed:", err);
            showStatusToast("Delete failed", "error");
          } finally {
            setDeleteConf({ isOpen: false, docId: null, cat: null, sourceId: null, doc: null });
            setUpdatingId(null);
          }
        }}
        onCancel={() => setDeleteConf({ isOpen: false, docId: null, cat: null, sourceId: null, doc: null })}
        isLoading={updatingId === "delete" || updatingId === deleteConf.docId}
        confirmText="Delete"
      />
 
      {/* Manual Prompt for Rejection Reason (Custom Modal) */}
      {rejectionConf.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Rejection Reason</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Please specify why this document is being rejected. This will be shared with the employee.</p>
              <textarea
                value={rejectionConf.reason}
                onChange={e => setRejectionConf(p => ({ ...p, reason: e.target.value }))}
                placeholder="e.g. Blurry image, mismatched name, expired document..."
                className="w-full h-32 px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none bg-gray-50"
              />
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setRejectionConf({ isOpen: false, id: null, reason: "" })}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <Button
                variant="danger"
                size="small"
                disabled={!rejectionConf.reason.trim() || updatingId === rejectionConf.id}
                onClick={() => updateCheckStatus(rejectionConf.id, "REJECTED", rejectionConf.reason)}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* FLOATING BULK ACTIONS BAR */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-40 transition-all duration-500 ${selectedIds.length > 0 ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"}`}>
        <div className="bg-indigo-950 text-white rounded-2xl shadow-2xl border border-indigo-800 p-2 sm:p-3 flex items-center gap-4 sm:gap-6 min-w-[320px] sm:min-w-[450px]">
          <div className="flex items-center gap-3 pl-2 sm:pl-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-sm">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Items selected</p>
              <p className="text-[10px] text-indigo-300">Ready for bulk action</p>
            </div>
          </div>
          <div className="h-10 w-px bg-indigo-800" />
          <div className="flex-1 flex items-center justify-end gap-2 pr-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 text-xs font-bold text-indigo-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2"
            >
              <Folder className="w-3.5 h-3.5" />
              Send to Consultancy
            </button>
            <button
              onClick={bulkMarkVerified}
              disabled={updatingId === "bulk"}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              {updatingId === "bulk" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              {updatingId === "bulk" ? "Verifying…" : "Mark Verified"}
            </button>
          </div>
        </div>
      </div>
 
      {/* ADD CHECK MODAL */}
      {addCheckModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-indigo-950/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-6">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">New Verification Task</h3>
              <p className="text-sm text-gray-500 mb-6">Enter a name for the verification step you want to add to the <span className="font-bold text-indigo-600">{addCheckModal.group}</span> category.</p>
             
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Task Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={newCheckLabel}
                    onChange={e => setNewCheckLabel(e.target.value)}
                    placeholder="e.g. Criminal Record Verification"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                    onKeyDown={e => e.key === 'Enter' && addCheck()}
                  />
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setAddCheckModal({ isOpen: false, group: "" }); setNewCheckLabel(""); }}
                className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                disabled={updatingId}
              >
                Cancel
              </button>
              <button
                onClick={addCheck}
                disabled={!newCheckLabel.trim() || updatingId}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
 
      {/* UPLOAD DOC MODAL */}
      {uploadModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-indigo-950/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-300">
            <div className="p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-6">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Upload Details</h3>
              <p className="text-sm text-gray-500 mb-6">Please provide details for the uploaded document in the <span className="font-bold text-indigo-600">{uploadModal.cat}</span> category.</p>
             
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Document Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={uploadModal.docName}
                    onChange={e => setUploadModal(p => ({ ...p, docName: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Document Type / Sub-category</label>
                  <input
                    type="text"
                    value={uploadModal.docType}
                    onChange={e => setUploadModal(p => ({ ...p, docType: e.target.value }))}
                    placeholder={`e.g. Aadhaar, Passport, etc.`}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Document File</label>
                  <label className="flex items-center justify-center w-full px-4 py-6 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 hover:border-indigo-300 transition-all">
                    <div className="text-center">
                      <Upload className="w-6 h-6 mx-auto text-indigo-400 mb-2" />
                      {uploadModal.file ? (
                        <p className="text-xs font-semibold text-indigo-600 truncate max-w-[250px]">{uploadModal.file.name}</p>
                      ) : (
                        <p className="text-xs font-medium text-gray-500">Click to attach file</p>
                      )}
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                           setUploadModal(p => ({ ...p, file, docName: p.docName || file.name }));
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setUploadModal({ isOpen: false, cat: "", file: null, docName: "", docType: "" })}
                className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors"
                disabled={updatingId === "upload_new_doc"}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!uploadModal.file) { showStatusToast("Please select a file", "error"); return; }
                  setUpdatingId("upload_new_doc");
                  try {
                    const formData = new FormData();
                    formData.append("file", uploadModal.file);
                    formData.append("user_uuid", selectedEmp.user_uuid);
                    formData.append("category", uploadModal.cat?.toLowerCase() || "identity");
                    formData.append("document_name", uploadModal.docName || uploadModal.file.name);
                    formData.append("doc_type", uploadModal.docType || uploadModal.cat);
 
                    await api.post(`${BASE_URL}/hr/upload-document`, formData, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data"
                      }
                    });
 
                    showStatusToast("Document uploaded successfully", "success");
                    loadProfileAndChecks(selectedEmp);
                  } catch (err) {
                    console.error("Upload failed:", err);
                    showStatusToast("Upload failed", "error");
                  } finally {
                    setUpdatingId(null);
                    setUploadModal({ isOpen: false, cat: "", file: null, docName: "", docType: "" });
                  }
                }}
                disabled={!uploadModal.file || updatingId === "upload_new_doc"}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                {updatingId === "upload_new_doc" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Upload Now"}
              </button>
            </div>
          </div>
        </div>
      )}
 
    </div>
  );
}
 
 