import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, User, ChevronDown, ShieldCheck, AlertTriangle, CheckCircle2,
  Clock3, Users, Folder, X, Send, FileArchive, RefreshCw, Mail, Phone,
  Building2, Clock, Eye, Download, ExternalLink, FileText,
  GraduationCap, Briefcase, MapPin, CreditCard, Award,
  Lock, Upload, Trash2, Plus, XCircle, MailCheck, Hourglass
} from "lucide-react";
import FilterListbox from "../../../components/filter/FilterListbox";
import api from "../../../api/axiosInstance"
import { showStatusToast } from "../../../components/toastfy/toast";
import Button from "../../../components/Button/Button";
import StatusBadge from "../../../components/status/statusbadge";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { KPICard } from "../../../components/kpi/KPI";
import Modal from "../../../components/Modal/modal";

 
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
 
/* ── Check-level status styles ── */
const SC = {
  NOT_STARTED: { bg: "bg-gray-100",   text: "text-gray-500",   dot: "bg-gray-400",   label: "Not Started" },
  IN_REVIEW:   { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-500",   label: "In Review" },
  VERIFIED:    { bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500",  label: "Verified" },
  REJECTED:    { bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500",    label: "Rejected" },
};

/* ── Employee-level status styles ── */
const ES = {
  NOT_STARTED:         { bg: "bg-gray-100",   text: "text-gray-500",   label: "Not Started" },
  IN_PROGRESS:         { bg: "bg-blue-100",   text: "text-blue-700",   label: "In Progress" },
  ACTION_REQUIRED:     { bg: "bg-orange-100", text: "text-orange-700", label: "Action Required" },
  READY_TO_SEND:       { bg: "bg-teal-100",   text: "text-teal-700",   label: "Ready to Send" },
  AWAITING_BGV_RESULT: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Awaiting BGV Result" },
  CLEARED:             { bg: "bg-green-100",  text: "text-green-700",  label: "Cleared" },
  REJECTED:            { bg: "bg-red-100",    text: "text-red-700",    label: "Rejected" },
};

const normalizeStatus = (raw = "") => {
  const s = raw.toUpperCase().replace(/\s+/g, "_");
  if (s === "NOT_STARTED")                             return "NOT_STARTED";
  if (s.includes("VERIF"))                             return "VERIFIED";
  if (s.includes("REVIEW") || s.includes("PROGRESS")) return "IN_REVIEW";
  if (s.includes("REJECT"))                            return "REJECTED";
  return "NOT_STARTED";
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
 
 
const CandidateItem = ({ emp, isSelected, bgStatus, onClick }) => {
  const es = ES[bgStatus] || ES.NOT_STARTED;
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
      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${es.bg} ${es.text}`}>
        {es.label}
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

  useEffect(() => {
    if (!doc?.file_path) { setLoading(false); return; }
    setSignedUrl(null);
    setLoading(true);
    const fetchSignedUrl = async () => {
      try {
        const res = await api.get(`${BASE_URL}/hr/background-checks/documents/view`, {
          params: { file_path: doc.file_path },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const url = typeof res.data === "string" ? res.data.replace(/^"+|"+$/g, "") : res.data.url;
        setSignedUrl(url);
      } catch (err) {
        console.error("Failed to fetch signed URL:", err);
        showStatusToast("Could not load the document. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSignedUrl();
  }, [doc, BASE_URL]);

  const name = doc?.document_name || doc?.doc_type || doc?.identity_type || "Document";

  return (
    <Modal
      isOpen={!!doc}
      onClose={onClose}
      title={name}
      titleIcon={<FileText className="w-4 h-4 text-indigo-600" />}
      subtitle={doc?.identity_file_number ? `#${doc.identity_file_number}` : undefined}
      size="4xl"
      zIndex="z-[60]"
      maxHeight="max-h-[90vh]"
      bodyClassName="p-0"
      footer={
        <div className="flex items-center gap-2 justify-end">
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
        </div>
      }
    >
      <div className="flex items-center justify-center bg-gray-100 min-h-[400px]">
        {loading ? (
          <div className="text-center">
            <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-xs text-gray-500 font-medium whitespace-nowrap">Resolving secure document link...</p>
          </div>
        ) : signedUrl ? (
          signedUrl.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/) ? (
            <img src={signedUrl} alt={name} className="max-w-full max-h-[75vh] object-contain rounded-lg p-4" />
          ) : (
            <iframe src={signedUrl} title={name} className="w-full h-full border-0 min-h-[400px]" />
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
    </Modal>
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
  const [deleteSessionConf, setDeleteSessionConf] = useState({ isOpen: false, groupName: null });
  const [hiddenGroups, setHiddenGroups] = useState(new Set());
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
  const [bgvDocuments, setBgvDocuments] = useState([]);
 
  /* ── Preview ── */
  const [previewDoc, setPreviewDoc] = useState(null);
 
  /* ── Email modal ── */
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending]     = useState(false);
  const [emailForm, setEmailForm]     = useState({
    to: "", cc: "",
    message: "Please find the attached background verification documents in the ZIP file. Kindly review and proceed with the background checks for the above employee.",
  });

  /* ── Final BGV Decision modal ── */
  const [finalDecisionModal, setFinalDecisionModal] = useState({ isOpen: false });
  const [finalDecision, setFinalDecision]           = useState("CLEARED");
  const [finalRemarks, setFinalRemarks]             = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
 
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
      const MANUAL_STATUSES_INIT = ["AWAITING_BGV_RESULT", "CLEARED", "REJECTED"];
      const BG_STATUS_MAP = { PENDING: "NOT_STARTED", IN_REVIEW: "IN_PROGRESS", VERIFIED: "READY_TO_SEND", REJECTED: "ACTION_REQUIRED" };
      setEmpBgMap(
        employeeList.reduce((acc, emp) => {
          if (!emp.user_uuid) return acc;
          if (emp.bgv_status && MANUAL_STATUSES_INIT.includes(emp.bgv_status)) {
            acc[emp.user_uuid] = emp.bgv_status;
          } else {
            acc[emp.user_uuid] = BG_STATUS_MAP[emp.bg_status] || "NOT_STARTED";
          }
          return acc;
        }, {})
      );
    } catch (err) {
      console.error("Failed to fetch employees:", err);
      setEmployees([]);
      setEmpBgMap({});
      showStatusToast("Failed to load employee list. Please refresh.", "error");
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
    setHiddenGroups(new Set());
    setExpanded(null);
    setSelectedIds([]);
    setCheckFilter("ALL");

    try {
    // Fetch profile, checks, and BGV documents in parallel
    const [profRes, chkRes, docsRes] = await Promise.allSettled([
      api.get(`${BASE_URL}/hr/background-checks/employee/${emp.user_uuid}/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      api.get(`${BASE_URL}/hr/background-checks/${emp.user_uuid}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      api.get(`${BASE_URL}/background-checks/documents/user/${emp.user_uuid}`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
    ]);

    const prof = profRes.status === "fulfilled" ? (profRes.value.data || {}) : {};
    if (profRes.status === "rejected") {
      showStatusToast("Could not load employee profile. Some information may be missing.", "warning");
    }
    setProfile(prof);
    setLoadingProfile(false);

    const raw = chkRes.status === "fulfilled" && Array.isArray(chkRes.value.data)
      ? chkRes.value.data : [];

    const bgvDocs = docsRes.status === "fulfilled" && Array.isArray(docsRes.value.data)
      ? docsRes.value.data : [];
    setBgvDocuments(bgvDocs);

    // ── Build checks from API data — docRef resolved from BGV documents by document_id ──
    const GROUP_ICON_MAP = {
      Identity: ShieldCheck, Education: GraduationCap, Experience: Briefcase,
      Financial: CreditCard, Compliance: ShieldCheck, Reference: CheckCircle2, Address: MapPin,
    };

    // Detect __hidden__ sentinels and restore hiddenGroups across page reloads
    const hiddenGroupNames = new Set(
      (raw || [])
        .filter(c => typeof c.check_type === "string" && c.check_type.startsWith("__hidden__"))
        .map(c => c.group)
    );
    setHiddenGroups(hiddenGroupNames);

    const dynamicChecks = (raw || [])
      .filter(c => c.check_uuid && !c.check_type?.startsWith("__hidden__"))
      .map(c => {
        const isPlaceholder = typeof c.check_type === "string" && c.check_type.startsWith("__session__");
        const docRef = (!isPlaceholder && c.document_id)
          ? (bgvDocs.find(d => d.document_id === c.document_id) || null)
          : null;

        const staticCheck = STATIC_CHECKS.find(sc => sc.key === c.check_type);
        const icon = staticCheck?.icon || GROUP_ICON_MAP[c.group] || CheckCircle2;

        return {
          id:             c.check_uuid,
          check_type:     c.check_type,
          label:          c.label,
          icon,
          group:          c.group,
          docRef,
          document_id:    c.document_id || null,
          status:         normalizeStatus(c.status || "NOT_STARTED"),
          details:        c.details || {},
          notes:          c.notes || "",
          _isPlaceholder: isPlaceholder,
        };
      });

    setChecks(dynamicChecks);

    // bgv_status is the HR-set manual status; bg_status is SQL-computed from check statuses
    const storedStatus = emp.bgv_status || emp.bg_status || "NOT_STARTED";
    const MANUAL_STATUSES = ["AWAITING_BGV_RESULT", "CLEARED", "REJECTED"];
    if (!MANUAL_STATUSES.includes(storedStatus)) {
      const realChecks = dynamicChecks.filter(c => !c._isPlaceholder);
      const allV = realChecks.length > 0 && realChecks.every(c => c.status === "VERIFIED");
      const anyR = realChecks.some(c => c.status === "REJECTED");
      const anyActive = realChecks.some(c => c.status === "IN_REVIEW" || c.status === "VERIFIED");
      const overall = allV ? "READY_TO_SEND"
                    : anyR ? "ACTION_REQUIRED"
                    : anyActive ? "IN_PROGRESS"
                    : "NOT_STARTED";
      setEmpBgMap(prev => ({ ...prev, [emp.user_uuid]: overall }));
    } else {
      setEmpBgMap(prev => ({ ...prev, [emp.user_uuid]: storedStatus }));
    }

    } finally {
      setLoadingChecks(false);
      setLoadingProfile(false);
    }
  }, [BASE_URL, token]);
 
 
  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    setActiveTab("checks");
    loadProfileAndChecks(emp);
  };
 
 
/* ─── Analytics ─── */
  const analytics = useMemo(() => ({
    VERIFIED:     checks.filter(c => !c._isPlaceholder && c.status === "VERIFIED").length,
    IN_REVIEW:    checks.filter(c => !c._isPlaceholder && c.status === "IN_REVIEW").length,
    NOT_STARTED:  checks.filter(c => !c._isPlaceholder && c.status === "NOT_STARTED").length,
    REJECTED:     checks.filter(c => c.status === "REJECTED").length,
  }), [checks]);

  const globalStats = useMemo(() => {
    const stats = { notStarted: 0, inProgress: 0, actionRequired: 0, readyToSend: 0, awaitingResult: 0, cleared: 0, rejected: 0 };
    employees.forEach(emp => {
      const status = empBgMap[emp.user_uuid] || emp.bg_status || "NOT_STARTED";
      if (status === "IN_PROGRESS")              stats.inProgress++;
      else if (status === "ACTION_REQUIRED")     stats.actionRequired++;
      else if (status === "READY_TO_SEND")       stats.readyToSend++;
      else if (status === "AWAITING_BGV_RESULT") stats.awaitingResult++;
      else if (status === "CLEARED")             stats.cleared++;
      else if (status === "REJECTED")            stats.rejected++;
      else stats.notStarted++;
    });
    return stats;
  }, [employees, empBgMap]);
 
  const realChecksCount = checks.filter(c => !c._isPlaceholder).length;
  const progress = realChecksCount ? Math.round((analytics.VERIFIED / realChecksCount) * 100) : 0;
 
  /* ─── Filtered employees ─── */
  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(emp => {
      const matchS = !q || `${emp.first_name} ${emp.last_name} ${emp.work_email} ${emp.employee_id}`.toLowerCase().includes(q);
      const status = empBgMap[emp.user_uuid] || emp.bg_status || "NOT_STARTED";
      const matchB = bgFilter === "ALL" || status === bgFilter;
      return matchS && matchB;
    });
  }, [employees, search, bgFilter, empBgMap]);

  const visibleChecks = checkFilter === "ALL" ? checks : checks.filter(c => c.status === checkFilter);

  const MANUAL_STATUSES = ["AWAITING_BGV_RESULT", "CLEARED", "REJECTED"];

  /* ─── Sync overall employee status with sub-checks (only for auto-computed states) ─── */
  useEffect(() => {
    if (!selectedEmp || checks.length === 0) return;

    const currentStatus = empBgMap[selectedEmp.user_uuid] || selectedEmp.bg_status || "NOT_STARTED";
    if (MANUAL_STATUSES.includes(currentStatus)) return;

    const realChecks = checks.filter(c => !c._isPlaceholder);
    const allV = realChecks.length > 0 && realChecks.every(c => c.status === "VERIFIED");
    const anyR = realChecks.some(c => c.status === "REJECTED");
    const anyActive = realChecks.some(c => c.status === "IN_REVIEW" || c.status === "VERIFIED");

    const overall = allV ? "READY_TO_SEND"
                  : anyR ? "ACTION_REQUIRED"
                  : anyActive ? "IN_PROGRESS"
                  : "NOT_STARTED";

    if (empBgMap[selectedEmp.user_uuid] !== overall) {
      setEmpBgMap(prev => ({ ...prev, [selectedEmp.user_uuid]: overall }));
    }
  }, [checks, selectedEmp]);
 
  /* ── true DB uuid has the form xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx ── */
  const isPlaceholder = (id) =>
    !id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  /* ─── Update check status ─── */
  const updateCheckStatus = async (id, status, reason = "") => {
    const normalizedStatus = status.toUpperCase().replace(/\s+/g, "_");
    if (normalizedStatus === "REJECTED" && !reason) {
      setRejectionConf({ isOpen: true, id, reason: "" });
      return;
    }
    setUpdatingId(id);
    const check = checks.find(c => c.id === id);

    if (isPlaceholder(id) && check && selectedEmp) {
      // No DB record yet — create it with the target status in one POST
      try {
        const res = await api.post(
          `${BASE_URL}/hr/background-checks`,
          {
            user_uuid: selectedEmp.user_uuid,
            check_type: check.check_type,
            label: check.label,
            group: check.group,
            status: normalizedStatus,
            notes: reason || undefined,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const realId = res.data?.check_uuid || id;
        setChecks(prev => prev.map(c =>
          c.id === id ? { ...c, id: realId, status: normalizedStatus, notes: normalizedStatus === "NOT_STARTED" ? "" : (reason || c.notes) } : c
        ));
      } catch (err) {
        console.warn("Create check failed, applying optimistic update:", err?.response?.status);
        setChecks(prev => prev.map(c =>
          c.id === id ? { ...c, status: normalizedStatus, notes: normalizedStatus === "NOT_STARTED" ? "" : (reason || c.notes) } : c
        ));
      }
    } else {
      try {
        await api.patch(
          `${BASE_URL}/hr/background-checks/${id}`,
          { status: normalizedStatus, notes: reason },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (err) {
        console.warn("PATCH background-checks not available, applying optimistic update:", err?.response?.status);
      }
      setChecks(prev => prev.map(c =>
        c.id === id ? { ...c, status: normalizedStatus, notes: normalizedStatus === "NOT_STARTED" ? "" : (reason || c.notes) } : c
      ));
    }

    if (normalizedStatus === "REJECTED" && check?.document_id) {
      try {
        await api.delete(`${BASE_URL}/hr/delete-document/${check.document_id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn("Document delete on rejection failed:", err?.response?.status);
      }
      setBgvDocuments(prev => prev.filter(d => d.document_id !== check.document_id));
      setChecks(prev => prev.map(c =>
        c.id === id ? { ...c, document_id: null, docRef: null } : c
      ));
    }

    const statusToastMsg = {
      VERIFIED:     "Task marked as Verified successfully.",
      REJECTED:     "Task flagged as Rejected.",
      NOT_STARTED:  "Task re-opened and reset to Not Started.",
      IN_REVIEW:    "Task status updated to In Review.",
    }[normalizedStatus] || `Task status updated to ${normalizedStatus}.`;
    showStatusToast(statusToastMsg, normalizedStatus === "REJECTED" ? "error" : "success");
    setUpdatingId(null);
    setRejectionConf({ isOpen: false, id: null, reason: "" });
  };
 
  /* ─── Bulk Verify ─── */
  const bulkMarkVerified = async () => {
    if (selectedIds.length === 0) return;
    setUpdatingId("bulk");
    const idMap = {}; // placeholder id → real uuid after creation
    await Promise.allSettled(
      selectedIds.map(async id => {
        const check = checks.find(c => c.id === id);
        if (isPlaceholder(id) && check && selectedEmp) {
          try {
            const res = await api.post(
              `${BASE_URL}/hr/background-checks`,
              { user_uuid: selectedEmp.user_uuid, check_type: check.check_type, label: check.label, group: check.group, status: "VERIFIED" },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            idMap[id] = res.data?.check_uuid || id;
          } catch (err) {
            console.warn(`Create for ${id} failed:`, err?.response?.status);
          }
        } else {
          await api.patch(
            `${BASE_URL}/hr/background-checks/${id}`,
            { status: "VERIFIED", notes: "" },
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch(err => console.warn(`PATCH ${id} failed:`, err?.response?.status));
        }
      })
    );
    setChecks(prev => prev.map(c => {
      if (!selectedIds.includes(c.id)) return c;
      return { ...c, id: idMap[c.id] || c.id, status: "VERIFIED" };
    }));
    showStatusToast(`${selectedIds.length} task(s) marked as Verified successfully.`, "success");
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
    const checkToDelete = checks.find(c => c.id === id);
    if (!isPlaceholder(id)) {
      try {
        await api.delete(`${BASE_URL}/hr/background-checks/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (err) {
        console.warn("DELETE /hr/background-checks not available, applying optimistic update:", err?.response?.status);
      }
    }
    if (checkToDelete?.document_id) {
      setBgvDocuments(prev => prev.filter(doc => doc.document_id !== checkToDelete.document_id));
    }
    setChecks(prev => prev.filter(c => c.id !== id));
    showStatusToast("Verification task removed successfully.", "success");
    setUpdatingId(null);
    setDeleteConf({ isOpen: false, docId: null, cat: null, sourceId: null, doc: null });
  };
 
  const confirmDeleteSession = async () => {
    const { groupName } = deleteSessionConf;
    if (!groupName) return;
    setUpdatingId(`session_${groupName}`);
    const KNOWN_GROUPS_LIST = ["Identity", "Education", "Experience", "Reference", "Compliance", "Financial", "Address"];

    // Include ALL checks in the group — real tasks AND the __session__ sentinel
    const allGroupChecks = checks.filter(c => c.group === groupName);
    await Promise.all(
      allGroupChecks.map(async c => {
        if (!isPlaceholder(c.id)) {
          try {
            await api.delete(`${BASE_URL}/hr/background-checks/${c.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (err) {
            console.warn(`DELETE check ${c.id} failed:`, err?.response?.status);
          }
        }
        if (c.document_id) {
          setBgvDocuments(prev => prev.filter(doc => doc.document_id !== c.document_id));
        }
      })
    );

    // For known groups there is no __session__ sentinel, so persist deletion
    // via a __hidden__ sentinel so it stays gone after page refresh
    if (KNOWN_GROUPS_LIST.includes(groupName)) {
      try {
        await api.post(`${BASE_URL}/hr/background-checks`, {
          user_uuid: selectedEmp.user_uuid,
          label: `__hidden__${groupName}`,
          group: groupName,
          check_type: `__hidden__${groupName.toLowerCase()}`,
          status: "NOT_STARTED",
        }, { headers: { Authorization: `Bearer ${token}` } });
      } catch (err) {
        console.warn(`Could not persist hidden sentinel for ${groupName}:`, err?.response?.status);
      }
    }

    setChecks(prev => prev.filter(c => c.group !== groupName));
    setHiddenGroups(prev => new Set([...prev, groupName]));
    setDeleteSessionConf({ isOpen: false, groupName: null });
    setUpdatingId(null);
    showStatusToast(`"${groupName}" session deleted successfully.`, "success");
  };

  const addCheck = async () => {
    if (!newCheckLabel.trim()) return;
    const { group, isNewSession } = addCheckModal;
    const effectiveGroup = isNewSession ? newCheckLabel.trim() : group;
    const sentinelType = isNewSession
      ? `__session__${effectiveGroup.toLowerCase().replace(/\s+/g, "_")}`
      : undefined;
    setUpdatingId("add_task");

    const payload = {
      user_uuid: selectedEmp.user_uuid,
      label: newCheckLabel.trim(),
      group: effectiveGroup,
      status: "NOT_STARTED",
      ...(sentinelType && { check_type: sentinelType }),
    };

    try {
      const res = await api.post(`${BASE_URL}/hr/background-checks`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newCheck = {
        ...payload,
        id: res.data?.check_uuid || res.data?.id || `manual_${Date.now()}`,
        icon: CheckCircle2,
        details: {},
        notes: "",
        _isPlaceholder: !!isNewSession,
      };
      setChecks(prev => [...prev, newCheck]);
    } catch (err) {
      console.warn("POST /hr/background-checks not available, applying optimistic update:", err?.response?.status);
      const newCheck = {
        ...payload,
        id: `manual_${Date.now()}`,
        icon: CheckCircle2,
        details: {},
        notes: "",
        _isPlaceholder: !!isNewSession,
      };
      setChecks(prev => [...prev, newCheck]);
    }

    showStatusToast(isNewSession ? "New verification session created successfully." : "Verification task added successfully.", "success");
    setUpdatingId(null);
    setAddCheckModal({ isOpen: false, group: "", isNewSession: false });
    setNewCheckLabel("");
  };
 
  /* ─── Send to consultancy ─── */
  const handleSend = async () => {
    if (!emailForm.to.trim()) { showStatusToast("Please enter the consultancy email address before sending.", "error"); return; }
    setIsSending(true);

    // Step 1: create any placeholder checks so we have real UUIDs to send
    const idMap = {};
    await Promise.allSettled(
      selectedIds.map(async id => {
        const check = checks.find(c => c.id === id);
        if (isPlaceholder(id) && check && selectedEmp) {
          try {
            const res = await api.post(
              `${BASE_URL}/hr/background-checks`,
              { user_uuid: selectedEmp.user_uuid, check_type: check.check_type,
                label: check.label, group: check.group, status: "IN_REVIEW" },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data?.check_uuid) idMap[id] = res.data.check_uuid;
          } catch (err) {
            console.warn("Create check for send failed:", err?.response?.status);
          }
        }
      })
    );

    // Step 2: resolve real UUIDs and call send-to-consultancy (which also persists IN_REVIEW)
    const realIds = selectedIds.map(id => idMap[id] || id).filter(id => !isPlaceholder(id));
    try {
      await api.post(
        `${BASE_URL}/hr/background-checks/send-to-consultancy`,
        {
          user_uuid: selectedEmp.user_uuid,
          to_email: emailForm.to,
          cc_email: emailForm.cc,
          message: emailForm.message,
          check_ids: realIds,
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
    } catch (err) {
      if (err?.response?.status === 409 || err?.response?.status === 422) {
        showStatusToast(err.response.data?.detail || "Cannot send to consultancy. Please check that all tasks are verified.", "error");
        setIsSending(false);
        return;
      }
      console.warn("Send-to-consultancy API error:", err?.response?.status);
    }

    // Step 3: set employee status FIRST so the useEffect sees it as a manual status
    // and does not override it when checks update triggers the effect
    setEmpBgMap(prev => ({ ...prev, [selectedEmp.user_uuid]: "AWAITING_BGV_RESULT" }));
    setEmployees(prev => prev.map(e =>
      e.user_uuid === selectedEmp.user_uuid ? { ...e, bgv_status: "AWAITING_BGV_RESULT" } : e
    ));
    // Then reflect individual check statuses (replace placeholder IDs, set IN_REVIEW)
    setChecks(prev => prev.map(c => {
      if (!selectedIds.includes(c.id)) return c;
      return { ...c, id: idMap[c.id] || c.id, status: "IN_REVIEW" };
    }));
    showStatusToast(`BGV documents sent to consultancy for ${selectedEmp.first_name}. All selected tasks are now In Review.`, "success");
    setIsModalOpen(false);
    setSelectedIds([]);
    setIsSending(false);
  };
 
  /* ─── Final BGV Decision ─── */
  const submitFinalDecision = async () => {
    if (!selectedEmp || !finalDecision) return;
    setIsSubmittingDecision(true);
    try {
      await api.post(
        `${BASE_URL}/hr/background-checks/employee/${selectedEmp.user_uuid}/final-decision`,
        { decision: finalDecision, remarks: finalRemarks || null },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
    } catch (err) {
      showStatusToast(err?.response?.data?.detail || "Failed to record BGV decision.", "error");
      setIsSubmittingDecision(false);
      return;
    }

    // Update employee status
    setEmpBgMap(prev => ({ ...prev, [selectedEmp.user_uuid]: finalDecision }));
    setEmployees(prev => prev.map(e =>
      e.user_uuid === selectedEmp.user_uuid ? { ...e, bgv_status: finalDecision } : e
    ));

    // If CLEARED, mark all real tasks as VERIFIED locally
    if (finalDecision === "CLEARED") {
      setChecks(prev => prev.map(c => c._isPlaceholder ? c : { ...c, status: "VERIFIED" }));
    }

    setFinalDecisionModal({ isOpen: false });
    setFinalRemarks("");
    setIsSubmittingDecision(false);
    showStatusToast(
      finalDecision === "CLEARED"
        ? `${selectedEmp.first_name} has been Cleared.`
        : `${selectedEmp.first_name} has been Rejected.`,
      finalDecision === "CLEARED" ? "success" : "error"
    );
  };

  /* ─── All BGV documents (from background_check_documents table only) ─── */
  const allDocuments = useMemo(() => {
    return bgvDocuments.map(d => ({
      ...d,
      _cat: d.category
        ? d.category.charAt(0).toUpperCase() + d.category.slice(1)
        : "Other",
      _title: d.document_name || "Document",
    }));
  }, [bgvDocuments]);
 
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
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: "NOT_STARTED",          label: "Not Started",          count: globalStats.notStarted,        color: "bg-gray-400",    ring: "ring-gray-300",    icon: Clock3 },
          { key: "IN_PROGRESS",          label: "In Progress",      count: globalStats.inProgress,     color: "bg-blue-500",   ring: "ring-blue-300",   icon: Clock },
          { key: "ACTION_REQUIRED",      label: "Action Required",  count: globalStats.actionRequired, color: "bg-orange-500", ring: "ring-orange-300", icon: AlertTriangle },
          { key: "READY_TO_SEND",        label: "Ready to Send",    count: globalStats.readyToSend,    color: "bg-violet-500", ring: "ring-violet-300", icon: Send },
          { key: "AWAITING_BGV_RESULT",  label: "Awaiting BGV Result",  count: globalStats.awaitingResult, color: "bg-amber-500",  ring: "ring-amber-300",  icon: Hourglass },
          { key: "CLEARED",              label: "Cleared",          count: globalStats.cleared,        color: "bg-green-500",  ring: "ring-green-300",  icon: CheckCircle2 },
          { key: "REJECTED",             label: "Rejected",         count: globalStats.rejected,       color: "bg-red-500",    ring: "ring-red-300",    icon: XCircle },
        ].map(kpi => (
          <button
            key={kpi.key}
            type="button"
            onClick={() => setBgFilter(prev => prev === kpi.key ? "ALL" : kpi.key)}
            className="w-full text-left"
          >
            <KPICard
              label={kpi.label}
              value={kpi.count}
              icon={<kpi.icon className="h-4 w-4" />}
              color={`${kpi.color} text-white`}
              active={bgFilter === kpi.key}
              className={`hover:shadow-md hover:-translate-y-0.5 ${bgFilter === kpi.key ? `ring-2 ${kpi.ring}` : ""}`}
            />
          </button>
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
                { value: "ALL",                  label: "All Status" },
                { value: "NOT_STARTED",          label: "Not Started" },
                { value: "IN_PROGRESS",          label: "In Progress" },
                { value: "ACTION_REQUIRED",      label: "Action Required" },
                { value: "READY_TO_SEND",        label: "Ready to Send" },
                { value: "AWAITING_BGV_RESULT",  label: "Awaiting BGV Result" },
                { value: "CLEARED",              label: "Cleared" },
                { value: "REJECTED",             label: "Rejected" },
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
                bgStatus={empBgMap[emp.user_uuid] || emp.bg_status || "NOT_STARTED"}
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
                      {(() => {
                        const es = ES[empBgMap[selectedEmp.user_uuid] || "NOT_STARTED"] || ES.NOT_STARTED;
                        return (
                          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${es.bg} ${es.text} uppercase tracking-wider ring-1 ring-inset ring-gray-100 animate-pulse`}>
                            {es.label}
                          </div>
                        );
                      })()}
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
 
                {!loadingChecks && realChecksCount > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                      <span className="font-medium">Verification Progress</span>
                      <span className="font-bold text-[#081534]">{analytics.VERIFIED}/{realChecksCount} verified · {progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "linear-gradient(90deg,#312e81,#6d28d9)" }} />
                    </div>
                    {progress === 100 && !["CLEARED", "AWAITING_BGV_RESULT"].includes(empBgMap[selectedEmp.user_uuid]) && (
                      <div className="mt-3 flex justify-end">
                        <Button variant="primary" size="small" onClick={() => setShowFinalizeConf(true)}>
                          <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1.5" />
                          Mark Process as Completed
                        </Button>
                      </div>
                    )}
                    {empBgMap[selectedEmp.user_uuid] === "AWAITING_BGV_RESULT" && (
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => { setFinalDecision("CLEARED"); setFinalRemarks(""); setFinalDecisionModal({ isOpen: true }); }}
                          className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Update BGV Result
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap mt-2">
                      {[
                        { k: "NOT_STARTED", l: "Not Started", c: "bg-gray-100 text-gray-600" },
                        { k: "IN_REVIEW",   l: "In Review",   c: "bg-blue-100 text-blue-700" },
                        { k: "VERIFIED",    l: "Verified",    c: "bg-green-100 text-green-700" },
                        { k: "REJECTED",    l: "Rejected",    c: "bg-red-100 text-red-700" },
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
                    { key: "checks",    label: "BG Checks",   Icon: ShieldCheck, badge: checks.filter(c => !c._isPlaceholder).length },
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
                              checked={(() => { const real = checks.filter(c => !c._isPlaceholder); return real.length > 0 && selectedIds.length === real.length; })()}
                              onChange={() => { const real = checks.filter(c => !c._isPlaceholder); setSelectedIds(p => p.length === real.length ? [] : real.map(c => c.id)); }}
                            />
                            Select All
                          </label>
                          <FilterListbox
                            options={[
                              { value: "ALL",         label: "All" },
                              { value: "NOT_STARTED", label: "Not Started" },
                              { value: "IN_REVIEW",   label: "In Review" },
                              { value: "VERIFIED",    label: "Verified" },
                              { value: "REJECTED",    label: "Rejected" },
                            ]}
                            value={checkFilter}
                            onChange={setCheckFilter}
                            optionsClassName="min-w-[150px] w-auto"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            const empStatus = empBgMap[selectedEmp?.user_uuid] || selectedEmp?.bg_status || "NOT_STARTED";
                            const BLOCKED_STATUSES = ["AWAITING_BGV_RESULT", "CLEARED", "REJECTED"];
                            const alreadySent = BLOCKED_STATUSES.includes(empStatus) || checks.some(c => !c._isPlaceholder && c.status === "IN_REVIEW");
                            const allVerified = checks.filter(c => !c._isPlaceholder).length > 0 && checks.filter(c => !c._isPlaceholder).every(c => c.status === "VERIFIED");
                            const canSend = allVerified && empStatus === "READY_TO_SEND" && !alreadySent;
                            const tooltip = alreadySent
                              ? "BGV request has already been sent. Please wait for the final verification result before sending again."
                              : "All verification tasks must be verified before sending to consultancy.";
                            return (
                              <div className="relative group">
                                <Button
                                  variant="primary"
                                  size="small"
                                  onClick={() => setIsModalOpen(true)}
                                  disabled={!canSend || selectedIds.length === 0}
                                >
                                  <Folder className="w-3.5 h-3.5 inline-block mr-1.5" />
                                  Consultancy ({selectedIds.length})
                                </Button>
                                {!canSend && (
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-72 text-[11px] text-white bg-gray-800 rounded-lg px-3 py-2 z-50 text-center shadow-lg">
                                    {tooltip}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
 
                      {loadingChecks ? (
                        <div className="space-y-2 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}</div>
                      ) : (() => {
                        const KNOWN_GROUPS = ["Identity", "Education", "Experience", "Reference", "Compliance", "Financial", "Address"];
                        const grouped = visibleChecks.reduce((acc, c) => {
                          if (!acc[c.group]) acc[c.group] = [];
                          acc[c.group].push(c);
                          return acc;
                        }, {});
                        const extraGroups = Object.keys(grouped).filter(g => !KNOWN_GROUPS.includes(g));
                        const groups = [...KNOWN_GROUPS, ...extraGroups];

                        // Check if any group will actually render under the active filter
                        const hasAnyVisible = groups.some(g => {
                          if (hiddenGroups.has(g)) return false;
                          const gi = grouped[g] || [];
                          if (!KNOWN_GROUPS.includes(g) && gi.length === 0) return false;
                          const ri = gi.filter(i => !i._isPlaceholder);
                          if (checkFilter !== "ALL" && ri.length === 0) return false;
                          return true;
                        });

                        if (!hasAnyVisible && checkFilter !== "ALL") {
                          return (
                            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                              <ShieldCheck className="w-10 h-10 mb-3 text-gray-200" />
                              <p className="text-sm font-medium">No tasks with status "{checkFilter.replace(/_/g, " ")}"</p>
                              <p className="text-xs mt-1">Switch to "All" to see all verification sessions.</p>
                            </div>
                          );
                        }

                        return groups.map(groupName => {
                          const groupItems = grouped[groupName] || [];
                          const realItems = groupItems.filter(i => !i._isPlaceholder);
                          const isCustomSession = !KNOWN_GROUPS.includes(groupName);
                          const verifiedCount = realItems.filter(i => i.status === "VERIFIED").length;
                          const progress = realItems.length > 0 ? (verifiedCount / realItems.length) * 100 : 0;

                          // Skip groups explicitly hidden by HR, or empty custom groups with no sentinel
                          if (hiddenGroups.has(groupName)) return null;
                          if (!KNOWN_GROUPS.includes(groupName) && groupItems.length === 0) return null;
                          // When a filter is active, hide groups with no matching real tasks
                          if (checkFilter !== "ALL" && realItems.length === 0) return null;
                         
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
                                      <span className="text-[10px] text-gray-400 font-medium">{verifiedCount} of {realItems.length} verified</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setAddCheckModal({ isOpen: true, group: groupName })}
                                    className="h-8 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" /> Add Task
                                  </button>
                                  <button
                                    onClick={() => setDeleteSessionConf({ isOpen: true, groupName })}
                                    className="h-8 px-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-all flex items-center"
                                    title="Delete session"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
 
                              <div className="space-y-2.5">
                                {realItems.length === 0 && (
                                  <p className="text-xs text-gray-400 italic text-center py-3">
                                    No tasks yet — click Add Task to get started.
                                  </p>
                                )}
                                {realItems.map(check => {
                                  const Icon = check.icon;
                                  const isExp = expanded === check.id;
                                  const isSel = selectedIds.includes(check.id);
                                  const sc = SC[check.status] || SC.NOT_STARTED;
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
                                                 <button onClick={async () => {
                                                    setUpdatingId(check.id + "_save");
                                                    const newDetails = {};
                                                    editFields.forEach(f => { if (f.key.trim()) newDetails[f.key] = f.value; });
                                                    let realId = check.id;
                                                    if (isPlaceholder(check.id) && selectedEmp) {
                                                      // No DB record yet — create (or upsert) it with current status + new details
                                                      try {
                                                        const res = await api.post(
                                                          `${BASE_URL}/hr/background-checks`,
                                                          {
                                                            user_uuid: selectedEmp.user_uuid,
                                                            check_type: check.check_type,
                                                            label: check.label,
                                                            group: check.group,
                                                            status: check.status,
                                                            details: newDetails,
                                                          },
                                                          { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                        realId = res.data?.check_uuid || check.id;
                                                      } catch (err) {
                                                        console.warn("Create check for details save failed:", err?.response?.status);
                                                      }
                                                    } else {
                                                      try {
                                                        await api.put(
                                                          `${BASE_URL}/hr/background-checks/${check.id}`,
                                                          { details: newDetails },
                                                          { headers: { Authorization: `Bearer ${token}` } }
                                                        );
                                                      } catch (err) {
                                                        console.warn("PUT details failed, applying optimistic update:", err?.response?.status);
                                                      }
                                                    }
                                                    setChecks(prev => prev.map(c => c.id === check.id ? { ...c, id: realId, details: newDetails } : c));
                                                    showStatusToast("Verification details saved successfully.", "success");
                                                    setUpdatingId(null);
                                                    setEditModeId(null);
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
                                          {!check.docRef && (
                                            <div className="flex items-start gap-1.5 px-3 py-2 bg-amber-50 border-l-2 border-amber-500 text-amber-800 text-xs rounded mb-3">
                                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                              <span className="font-semibold">Document expected.</span>
                                            </div>
                                          )}
 
{(() => {
                                              const locked = ["AWAITING_BGV_RESULT", "CLEARED", "REJECTED"].includes(empBgMap[selectedEmp?.user_uuid]);
                                              const taskRejected = check.status === "REJECTED";
                                              return (
                                                <div className="flex flex-wrap items-center gap-2">
                                                  {check.docRef ? (
                                                    <>
                                                      <Button variant="secondary" size="small" onClick={() => !locked && !taskRejected && setActiveTab("documents")} disabled={locked || taskRejected}>
                                                        <Folder className="w-3.5 h-3.5 inline-block mr-1" />
                                                        View Document in Docs Tab
                                                      </Button>
                                                      <Button variant="danger" size="small"
                                                        disabled={locked || taskRejected || updatingId === `${check.id}_del_doc`}
                                                        onClick={() => setDeleteConf({ isOpen: true, docId: check.id, sourceId: "session", doc: check.docRef })}>
                                                        {updatingId === `${check.id}_del_doc` ? <RefreshCw className="w-3.5 h-3.5 inline-block mr-1 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 inline-block mr-1" />}
                                                        Remove Document
                                                      </Button>
                                                    </>
                                                  ) : (
                                                    <>
                                                      <input type="file" id={`upload-doc-${check.id}`} className="hidden" onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        setUpdatingId(`${check.id}_up_doc`);
                                                        try {
                                                          const formData = new FormData();
                                                          formData.append("file", file);
                                                          formData.append("user_uuid", selectedEmp.user_uuid);
                                                          formData.append("category", check.group.toLowerCase());
                                                          formData.append("document_name", file.name);
                                                          const res = await api.post(`${BASE_URL}/hr/upload-document`, formData, {
                                                            headers: { Authorization: `Bearer ${token}` }
                                                          });
                                                          const uploadedDoc = {
                                                            document_id:   res.data?.document_id,
                                                            document_name: res.data?.document_name || file.name,
                                                            uploaded_at:   res.data?.uploaded_at || new Date().toISOString(),
                                                            category:      check.group.toLowerCase(),
                                                            file_path:     res.data?.file_path,
                                                          };
                                                          if (res.data?.document_id) {
                                                            await api.put(`${BASE_URL}/hr/background-checks/${check.id}`, {
                                                              document_id: res.data.document_id,
                                                              doc_category: check.group.toLowerCase(),
                                                            }, { headers: { Authorization: `Bearer ${token}` } });
                                                          }
                                                          setBgvDocuments(prev => [...prev, uploadedDoc]);
                                                          setChecks(prev => prev.map(c => c.id === check.id ? { ...c, docRef: uploadedDoc, document_id: res.data?.document_id } : c));
                                                          showStatusToast(`Document "${file.name}" uploaded successfully.`, "success");
                                                        } catch (err) {
                                                          console.error("Upload failed:", err);
                                                          showStatusToast("Document upload failed. Please try again.", "error");
                                                        } finally {
                                                          setUpdatingId(null);
                                                        }
                                                      }} />
                                                      <Button variant="secondary" size="small"
                                                        disabled={locked || taskRejected || updatingId === `${check.id}_up_doc`}
                                                        onClick={() => document.getElementById(`upload-doc-${check.id}`).click()}>
                                                        {updatingId === `${check.id}_up_doc` ? <RefreshCw className="w-3.5 h-3.5 inline-block mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 inline-block mr-1" />}
                                                        Upload Document
                                                      </Button>
                                                    </>
                                                  )}
                                                  <div className="relative group/verify inline-block">
                                                    <Button variant="success" size="small"
                                                      disabled={locked || taskRejected || updatingId === check.id || check.status === "VERIFIED" || !check.docRef}
                                                      onClick={() => updateCheckStatus(check.id, "VERIFIED")}>
                                                      <CheckCircle2 className="w-3.5 h-3.5 inline-block mr-1" />
                                                      {updatingId === check.id ? "Saving…" : "Mark Verified"}
                                                    </Button>
                                                    {!check.docRef && !locked && (
                                                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/verify:block w-52 text-[11px] text-white bg-gray-800 rounded-lg px-3 py-2 z-50 text-center shadow-lg pointer-events-none">
                                                        Upload a document before marking as verified.
                                                      </div>
                                                    )}
                                                  </div>
                                                  {check.status === "REJECTED" ? (
                                                    <Button variant="secondary" size="small"
                                                      disabled={locked || updatingId === check.id}
                                                      onClick={() => updateCheckStatus(check.id, "NOT_STARTED")}>
                                                      <RefreshCw className="w-3.5 h-3.5 inline-block mr-1" />
                                                      {updatingId === check.id ? "Saving…" : "Re-open"}
                                                    </Button>
                                                  ) : (
                                                    <Button variant="danger" size="small"
                                                      disabled={locked || updatingId === check.id || !check.docRef}
                                                      onClick={() => updateCheckStatus(check.id, "REJECTED")}>
                                                      <AlertTriangle className="w-3.5 h-3.5 inline-block mr-1" />
                                                      {updatingId === check.id ? "Saving…" : "Flag Rejected"}
                                                    </Button>
                                                  )}
                                                </div>
                                              );
                                            })()}
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
                          onClick={() => setAddCheckModal({ isOpen: true, group: "", isNewSession: true })}
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
 
                      const hasAnyDocument = Object.values(grouped).some(d => d.length > 0);

                      return (
                        <div className="space-y-4">
                          {!hasAnyDocument && (
                            <div className="py-16 text-center flex flex-col items-center justify-center text-gray-400">
                              <FileText className="w-8 h-8 text-gray-200 mb-2" />
                              <p className="text-sm font-semibold">No documents uploaded yet</p>
                              <p className="text-xs mt-1">Documents uploaded via BG Check tasks will appear here.</p>
                            </div>
                          )}
                          {Object.entries(grouped)
                            .filter(([, docs]) => docs.length > 0)
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
                                              setUpdatingId(`upload_doc_${docRef.document_id || idx}`);
                                              try {
                                                const formData = new FormData();
                                                formData.append("file", file);
                                                formData.append("user_uuid", selectedEmp.user_uuid);
                                                formData.append("category", cat.toLowerCase());
                                                formData.append("document_name", docRef.document_name || file.name);
                                                const res = await api.post(`${BASE_URL}/hr/upload-document`, formData, {
                                                  headers: {
                                                    Authorization: `Bearer ${token}`,
                                                    "Content-Type": "multipart/form-data"
                                                  }
                                                });
                                                const newDoc = {
                                                  document_id:   res.data?.document_id,
                                                  document_name: res.data?.document_name || file.name,
                                                  uploaded_at:   res.data?.uploaded_at || new Date().toISOString(),
                                                  category:      cat.toLowerCase(),
                                                  file_path:     res.data?.file_path,
                                                };
                                                setBgvDocuments(prev => [...prev, newDoc]);
                                                showStatusToast("Document replaced successfully.", "success");
                                              } catch (err) {
                                                console.error("Upload error:", err);
                                                showStatusToast("Document upload failed. Please try again.", "error");
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
 
      {/* Final BGV Decision Modal */}
      <Modal
        isOpen={finalDecisionModal.isOpen}
        onClose={() => setFinalDecisionModal({ isOpen: false })}
        title="Final BGV Decision"
        titleIcon={<CheckCircle2 className="w-5 h-5 text-indigo-600" />}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="small" onClick={() => setFinalDecisionModal({ isOpen: false })} disabled={isSubmittingDecision}>
              Cancel
            </Button>
            <Button
              variant={finalDecision === "CLEARED" ? "success" : "danger"}
              size="small"
              onClick={submitFinalDecision}
              disabled={isSubmittingDecision}
              loading={isSubmittingDecision}
              loadingText="Saving..."
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Save Decision
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-500">
            Record the final background verification outcome for <span className="font-semibold text-gray-800">{selectedEmp?.first_name} {selectedEmp?.last_name}</span>.
          </p>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 block">Decision</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${finalDecision === "CLEARED" ? "border-emerald-500 bg-emerald-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="finalDecision" value="CLEARED" checked={finalDecision === "CLEARED"} onChange={() => setFinalDecision("CLEARED")} className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${finalDecision === "CLEARED" ? "border-emerald-500" : "border-gray-300"}`}>
                  {finalDecision === "CLEARED" && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
                <span className={`text-sm font-semibold ${finalDecision === "CLEARED" ? "text-emerald-700" : "text-gray-600"}`}>Cleared</span>
              </label>
              <label className={`flex-1 flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${finalDecision === "REJECTED" ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                <input type="radio" name="finalDecision" value="REJECTED" checked={finalDecision === "REJECTED"} onChange={() => setFinalDecision("REJECTED")} className="sr-only" />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${finalDecision === "REJECTED" ? "border-red-500" : "border-gray-300"}`}>
                  {finalDecision === "REJECTED" && <div className="w-2 h-2 rounded-full bg-red-500" />}
                </div>
                <span className={`text-sm font-semibold ${finalDecision === "REJECTED" ? "text-red-700" : "text-gray-600"}`}>Rejected</span>
              </label>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Comments <span className="normal-case font-normal">(optional)</span></label>
            <textarea
              value={finalRemarks}
              onChange={e => setFinalRemarks(e.target.value)}
              placeholder="Add any remarks or notes about this decision..."
              rows={3}
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none bg-gray-50"
            />
          </div>
        </div>
      </Modal>

      {/* Email modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Send Documents to Consultancy"
        titleIcon={<FileArchive className="w-5 h-5 text-indigo-700" />}
        size="xl"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="small" onClick={() => setIsModalOpen(false)} disabled={isSending}>Cancel</Button>
            <Button variant="primary" size="small" onClick={handleSend} disabled={isSending} loading={isSending} loadingText="Sending…">
              <Send className="w-3.5 h-3.5" /> Send ZIP via Email
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
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
      </Modal>
      {/* Confirmation Modal for Finalizing */}
      <ConfirmationModal
        isOpen={showFinalizeConf}
        title="Finalize Verification?"
        message={`Are you sure you want to mark the background verification for ${selectedEmp?.first_name} as COMPLETED? This will finalize their record and mark the process as successful.`}
        onConfirm={async () => {
          setUpdatingId("finalize");
          const idMap = {};
          // PATCH / create every non-verified check to VERIFIED
          await Promise.allSettled(
            checks.map(async c => {
              if (c.status === "VERIFIED") return;
              if (isPlaceholder(c.id) && selectedEmp) {
                try {
                  const res = await api.post(
                    `${BASE_URL}/hr/background-checks`,
                    { user_uuid: selectedEmp.user_uuid, check_type: c.check_type,
                      label: c.label, group: c.group, status: "VERIFIED" },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  if (res.data?.check_uuid) idMap[c.id] = res.data.check_uuid;
                } catch (err) {
                  console.warn("Create check for finalize failed:", err?.response?.status);
                }
              } else {
                await api.patch(
                  `${BASE_URL}/hr/background-checks/${c.id}`,
                  { status: "VERIFIED" },
                  { headers: { Authorization: `Bearer ${token}` } }
                ).catch(err => console.warn(`PATCH ${c.id} finalize failed:`, err?.response?.status));
              }
            })
          );
          setChecks(prev => prev.map(c => ({
            ...c,
            id: idMap[c.id] || c.id,
            status: "VERIFIED",
          })));
          setShowFinalizeConf(false);
          showStatusToast(`Verification process for ${selectedEmp?.first_name} finalized. All tasks marked as Verified.`, "success");
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

            if (deleteConf.sourceId === "session") {
              if (d?.document_id) {
                try {
                  await api.delete(`${BASE_URL}/hr/delete-document/${d.document_id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  });
                  setBgvDocuments(prev => prev.filter(doc => doc.document_id !== d.document_id));
                } catch (err) {
                  console.warn("Backend doc delete failed (session):", err?.response?.status);
                }
              }
              setChecks(prev => prev.map(c => c.id === deleteConf.docId ? { ...c, docRef: null, document_id: null } : c));
              showStatusToast("Document removed from this task.", "success");
            } else {
              // Documents tab deletion — BGV document
              if (d && d.document_id) {
                await api.delete(`${BASE_URL}/hr/delete-document/${d.document_id}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setBgvDocuments(prev => prev.filter(doc => doc.document_id !== d.document_id));
                // Clear docRef on any check that referenced this document
                setChecks(prev => prev.map(c => c.document_id === d.document_id ? { ...c, docRef: null, document_id: null } : c));
                showStatusToast("Document deleted successfully.", "success");
              } else {
                showStatusToast("Document removed successfully.", "success");
              }
            }
          } catch (err) {
            console.error("Delete failed:", err);
            showStatusToast("Failed to delete document. Please try again.", "error");
          } finally {
            setDeleteConf({ isOpen: false, docId: null, cat: null, sourceId: null, doc: null });
            setUpdatingId(null);
          }
        }}
        onCancel={() => setDeleteConf({ isOpen: false, docId: null, cat: null, sourceId: null, doc: null })}
        isLoading={updatingId === "delete" || updatingId === deleteConf.docId}
        confirmText="Delete"
      />
 
      {/* Rejection Reason Modal */}
      <Modal
        isOpen={rejectionConf.isOpen}
        onClose={() => setRejectionConf({ isOpen: false, id: null, reason: "" })}
        title="Rejection Reason"
        titleIcon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        size="md"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="small" onClick={() => setRejectionConf({ isOpen: false, id: null, reason: "" })}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="small"
              disabled={!rejectionConf.reason.trim() || updatingId === rejectionConf.id}
              onClick={() => updateCheckStatus(rejectionConf.id, "REJECTED", rejectionConf.reason)}
            >
              Confirm Rejection
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Please specify why this document is being rejected. This will be shared with the employee.</p>
          <textarea
            value={rejectionConf.reason}
            onChange={e => setRejectionConf(p => ({ ...p, reason: e.target.value }))}
            placeholder="e.g. Blurry image, mismatched name, expired document..."
            className="w-full h-32 px-4 py-3 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none bg-gray-50"
          />
        </div>
      </Modal>
      {/* Confirmation Modal for Session Deletion */}
      <ConfirmationModal
        isOpen={deleteSessionConf.isOpen}
        title="Delete Session?"
        message={`This will permanently delete the "${deleteSessionConf.groupName}" session and all its tasks. This action cannot be undone.`}
        onConfirm={confirmDeleteSession}
        onCancel={() => setDeleteSessionConf({ isOpen: false, groupName: null })}
        isLoading={updatingId === `session_${deleteSessionConf.groupName}`}
        confirmText="Delete Session"
      />

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
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {addCheckModal.isNewSession ? "New Verification Session" : "New Verification Task"}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {addCheckModal.isNewSession
                  ? "Enter a name for the new verification session. A section with this name will be created."
                  : <>Enter a name for the verification step you want to add to the <span className="font-bold text-indigo-600">{addCheckModal.group}</span> category.</>
                }
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                    {addCheckModal.isNewSession ? "Session Name" : "Task Name"}
                  </label>
                  <input
                    autoFocus
                    type="text"
                    value={newCheckLabel}
                    onChange={e => setNewCheckLabel(e.target.value)}
                    placeholder={addCheckModal.isNewSession ? "e.g. Government Verification" : "e.g. Criminal Record Verification"}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-medium"
                    onKeyDown={e => e.key === 'Enter' && addCheck()}
                  />
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => { setAddCheckModal({ isOpen: false, group: "", isNewSession: false }); setNewCheckLabel(""); }}
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
                {addCheckModal.isNewSession ? "Create Session" : "Create Task"}
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
                  if (!uploadModal.file) { showStatusToast("Please select a file to upload.", "error"); return; }
                  setUpdatingId("upload_new_doc");
                  try {
                    const formData = new FormData();
                    formData.append("file", uploadModal.file);
                    formData.append("user_uuid", selectedEmp.user_uuid);
                    formData.append("category", uploadModal.cat?.toLowerCase() || "identity");
                    formData.append("document_name", uploadModal.docName || uploadModal.file.name);
                    formData.append("doc_type", uploadModal.docType || uploadModal.cat);
 
                    const res = await api.post(`${BASE_URL}/hr/upload-document`, formData, {
                      headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "multipart/form-data"
                      }
                    });

                    const newDoc = {
                      document_id:   res.data?.document_id,
                      document_name: res.data?.document_name || uploadModal.file.name,
                      uploaded_at:   res.data?.uploaded_at || new Date().toISOString(),
                      category:      uploadModal.cat?.toLowerCase() || "identity",
                      file_path:     res.data?.file_path,
                    };
                    setBgvDocuments(prev => [...prev, newDoc]);
                    showStatusToast("Document uploaded successfully.", "success");
                  } catch (err) {
                    console.error("Upload failed:", err);
                    showStatusToast("Document upload failed. Please try again.", "error");
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
 
 