"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import StatusBadge from "../../../components/status/statusbadge";
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  IndianRupee,
  BadgeCheck,
  UserCheck,
  Eye,
  MoreVertical,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Trash2,
  AlertCircle,
  X,
} from "lucide-react";
import {
  formatOfferStatusLabel,
  getOfferDisplayStatus,
  getOfferWithJoiningStatus,
} from "../components/offerStatus";

/* ─────────── Styles (same system as ViewEmpDetails) ─────────── */
const ADMIN_STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:wght@600;700&display=swap");
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  .anim-card  { animation: fadeUp 0.4s ease both; }
  .pulse-dot  { animation: pulse-dot 1.5s ease-in-out infinite; }
  .emp-page   { font-family: "DM Sans", sans-serif; }
  .emp-name   { font-family: "Fraunces", serif; }
`;

(function injectAdminStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("admin-offer-styles")) return;
  const tag = document.createElement("style");
  tag.id = "admin-offer-styles";
  tag.textContent = ADMIN_STYLES;
  document.head.appendChild(tag);
})();

/* ================= MAIN COMPONENT ================= */

export default function AdminOfferView() {
  const { user_uuid } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const BASE = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const [offer, setOffer] = useState(null);
  const [approval, setApproval] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const [rejectModal, setRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState("");

  const [holdModal, setHoldModal] = useState(false);
  const [holdComment, setHoldComment] = useState("");
  const [deleteModal, setDeleteModal] = useState(false);

  /* ---------------- FETCH OFFER ---------------- */
  const fetchOffer = async () => {
    const res = await axios.get(`${BASE}/offerletters/offer/${user_uuid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setOffer(getOfferWithJoiningStatus(res.data));
  };
  console.log("OFFER:", offer);

  /* ---------------- FETCH APPROVAL ---------------- */
  const fetchApproval = async () => {
    const res = await axios.get(`${BASE}/offer-approval/my-actions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("ADMIN APPROVAL API RAW:", res.data);
    const found = res.data.find((i) => i.user_uuid === user_uuid);
    if (!found) { setApproval(null); return; }
    const mapped = {
      ...found,
      action: found.action,
      approver_name: found.approver_name || null,
      comments: found.message || found.comments || "",
      mail: found.mail || "",
    };
    setApproval(mapped);
    console.log("Mapped Approval:", mapped);
  };


  useEffect(() => {
    Promise.all([fetchOffer(), fetchApproval()])
      .catch(() => setError("Failed to load data"))
      .finally(() => setLoading(false));
  }, [user_uuid]);

  /* ---------------- STATUS LOGIC ---------------- */
  const isFinalStatus =
    approval?.action === "APPROVED" ||
    approval?.action === "REJECTED" ||
    approval?.action === "ON_HOLD";

  const buttonsEnabled = !isFinalStatus || isEditing;

  /* ---------------- SUBMIT ACTION ---------------- */
  const submitAction = async (action, comment = null) => {
    if (!approval) return;
    if (approval.action === action) { toast.info("This status is already applied."); return; }
    const previousAction = approval.action;
    setApproval({ ...approval, action, comments: comment !== null ? comment : approval.comments });
    setActing(true);
    setError("");
    try {
      await axios.put(
        `${BASE}/offer-approval/update_action`,
        {
          user_uuid,
          action,
          comments: comment ?? (
            action === "APPROVED" ? "Approved by admin" :
              action === "REJECTED" ? "Rejected by admin" :
                "Kept on hold by admin"
          ),
        },
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
      );
      toast.success(
        action === "APPROVED" ? "Offer approved" :
          action === "REJECTED" ? "Offer rejected" :
            "Offer put on hold"
      );
      await fetchOffer();
      await fetchApproval();
      setIsEditing(false);
      setShowMenu(false);
    } catch (e) {
      setApproval({ ...approval, action: previousAction, comments: approval.comments });
      const msg = e?.response?.data?.detail || "Unable to update approval status";
      setError(msg);
      toast.error(msg);
    } finally {
      setActing(false);
    }
  };

  /* ---------------- PREVIEW OFFER ---------------- */
  const handlePreviewOffer = async () => {
    try {
      const res = await axios.get(
        `${BASE}/offerletters/${user_uuid}/generate-preview`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );
      const file = new Blob([res.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(file), "_blank");
    } catch {
      toast.error("Failed to open offer preview");
    }
  };

  /* ---------------- DELETE APPROVAL REQUEST ---------------- */
  const deleteApprovalRequest = async () => {
    if (!approval) return;
    try {
      setActing(true);
      await axios.delete(`${BASE}/offer-approval-requests/request/delete`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: [{ user_uuid }],
      });
      toast.success("Approval request deleted successfully");
      setDeleteModal(false);
      setTimeout(() => navigate("/employee-onboarding"), 800);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to delete approval request");
    } finally {
      setActing(false);
    }
  };

  /* ── Loading / Not found ── */
  if (loading)
    return (
      <div className="emp-page min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Loading offer details…</p>
        </div>
      </div>
    );

  if (!offer)
    return (
      <div className="emp-page min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Offer not found.</p>
      </div>
    );

  const displayStatus = getOfferDisplayStatus(offer, []);
  const fullName = [offer.first_name, offer.middle_name, offer.last_name]
    .filter((n) => n && n.trim() !== "")
    .join(" ");
  const initials = [offer.first_name, offer.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join("");

  const approvalStatus = approval?.action?.toUpperCase() || "";

  /* ================= UI ================= */
  return (
    <div className="emp-page min-h-screen bg-slate-50">
      <ToastContainer position="top-right" autoClose={3000} />

      {/* ── TOP NAV ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <span className="text-xs text-slate-400 font-mono">{user_uuid}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── PROFILE HEADER ── */}
        <div className="anim-card bg-white rounded-2xl border border-slate-100 p-8 mb-6 shadow-sm" style={{ animationDelay: "0ms" }}>
          <div className="flex items-start gap-6">

            {/* Avatar */}
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <span className="emp-name text-2xl font-bold text-indigo-700">
                {initials || <UserCheck size={24} />}
              </span>
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <h1 className="emp-name text-3xl font-bold text-slate-900 leading-tight mb-2 truncate">
                {fullName}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <StatusBadge label={formatOfferStatusLabel(displayStatus)} size="sm" />
                {approval && <ApprovalPill status={approvalStatus} approver={approval.approver_name} />}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  {offer.mail}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400" />
                  +{offer.country_code} {offer.contact_number}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase size={13} className="text-slate-400" />
                  {offer.designation}
                </span>
              </div>
            </div>

            {/* Three-dot menu (only when final status) */}
            {isFinalStatus && (
              <div className="flex-shrink-0 relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <MoreVertical size={18} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 w-40 overflow-hidden z-10">
                    <button
                      onClick={() => { setIsEditing(true); setShowMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-indigo-700 font-medium hover:bg-indigo-50 transition-colors"
                    >
                      Edit Status
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comments banner */}
          {approval?.comments?.trim() && (
            <div className="mt-5 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-0.5">Comments</p>
                <p className="text-sm text-amber-900">{approval.comments}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── TWO-COLUMN BODY ── */}
        <div className="flex gap-6 items-start">

          {/* ── LEFT: DETAILS GRID ── */}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
              Offer Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <Mail size={16} />, label: "Email", value: offer.mail, delay: 60 },
                { icon: <Phone size={16} />, label: "Contact", value: `+${offer.country_code} ${offer.contact_number}`, delay: 120 },
                { icon: <Briefcase size={16} />, label: "Designation", value: offer.designation, delay: 180 },
                { icon: <IndianRupee size={16} />, label: "CTC", value: `${offer.total_ctc} ${offer.currency}`, delay: 240 },
                { icon: <UserCheck size={16} />, label: "Employee Type", value: offer.employee_type, delay: 300 },
                {
  icon: <Mail size={16} />,
  label: "CC Emails",
  value: Array.isArray(offer?.cc_emails)
    ? offer.cc_emails.join(", ")
    : typeof offer?.cc_emails === "string"
      ? offer.cc_emails
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
          .join(", ")
      : "—",
  delay: 360,
},
              ].map(({ icon, label, value, delay }) => (
                <GhostCard key={label} icon={icon} label={label} value={value} delay={delay} />
              ))}
            </div>

            {error && (
              <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* ── RIGHT: UNIFIED CARD ── */}
          {approval && (
            <div className="w-72 flex-shrink-0 sticky top-20">
              <div className="anim-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" style={{ animationDelay: "80ms" }}>

                {/* Horizontal Timeline */}
                <div className="px-5 pt-5 pb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">Progress</p>
                  <HorizontalTimeline status={approvalStatus} />
                </div>

                <div className="border-t border-slate-100" />

                {/* Actions */}
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Actions</p>
                  <div className="flex flex-col gap-2.5">

                    <ActionBtn
                      onClick={handlePreviewOffer}
                      variant="slate"
                      icon={<Eye size={15} />}
                      label="Preview Offer"
                    />

                    <ActionBtn
                      onClick={() => submitAction("APPROVED")}
                      disabled={!buttonsEnabled || acting}
                      variant="emerald"
                      icon={<CheckCircle2 size={15} />}
                      label="Approve"
                    />

                    <ActionBtn
                      onClick={() => { setRejectModal(true); setRejectComment(""); }}
                      disabled={!buttonsEnabled || acting}
                      variant="red"
                      icon={<XCircle size={15} />}
                      label="Reject"
                    />

                    <ActionBtn
                      onClick={() => { setHoldModal(true); setHoldComment(""); }}
                      disabled={!buttonsEnabled || acting}
                      variant="amber"
                      icon={<PauseCircle size={15} />}
                      label="On Hold"
                    />

                    <div className="border-t border-slate-100 my-1" />

                    <ActionBtn
                      onClick={() => setDeleteModal(true)}
                      disabled={acting}
                      variant="redOutline"
                      icon={<Trash2 size={15} />}
                      label="Delete Approval"
                    />

                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══════════ REJECT MODAL ══════════ */}
      {rejectModal && (
        <CommentModal
          title="Reject Offer"
          description="Please provide a reason for rejection. This will be shared with the requester."
          comment={rejectComment}
          setComment={setRejectComment}
          acting={acting}
          onCancel={() => setRejectModal(false)}
          onConfirm={async () => { await submitAction("REJECTED", rejectComment); setRejectModal(false); }}
          confirmText="Reject Offer"
          confirmVariant="red"
        />
      )}

      {/* ══════════ ON HOLD MODAL ══════════ */}
      {holdModal && (
        <CommentModal
          title="Put Offer On Hold"
          description="Add a note explaining why this offer is being placed on hold."
          comment={holdComment}
          setComment={setHoldComment}
          acting={acting}
          onCancel={() => setHoldModal(false)}
          onConfirm={async () => { await submitAction("ON_HOLD", holdComment); setHoldModal(false); }}
          confirmText="Confirm Hold"
          confirmVariant="amber"
        />
      )}

      {/* ══════════ DELETE MODAL ══════════ */}
      {deleteModal && (
        <ModalOverlay>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-1">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="emp-name text-xl font-bold text-slate-900">Delete Approval Request?</h3>
              <p className="text-sm text-slate-500">
                This will permanently remove the approval request for{" "}
                <strong className="text-slate-700">{fullName}</strong>. This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setDeleteModal(false)}
                disabled={acting}
                className="flex-1 px-5 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={deleteApprovalRequest}
                disabled={acting}
                className="flex-1 px-5 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 text-sm font-medium transition-all active:scale-95 disabled:opacity-60"
              >
                {acting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

/* ──────────────────── UI HELPERS ──────────────────── */

function ModalOverlay({ children }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}
    >
      {children}
    </div>
  );
}

function CommentModal({ title, description, comment, setComment, acting, onCancel, onConfirm, confirmText, confirmVariant }) {
  const confirmStyles = {
    red: "bg-red-600 hover:bg-red-700",
    amber: "bg-amber-500 hover:bg-amber-600",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
  };
  return (
    <ModalOverlay>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="emp-name text-xl font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{description}</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Comment <span className="text-red-400">*</span>
          </label>
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none h-28"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add your comment here…"
          />
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            disabled={acting}
            onClick={onCancel}
            className="px-5 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>
          <button
            disabled={!comment.trim() || acting}
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-white text-sm font-medium transition-all active:scale-95 disabled:opacity-60 ${confirmStyles[confirmVariant]}`}
          >
            {acting ? "Processing…" : confirmText}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function GhostCard({ icon, label, value, delay = 0 }) {
  return (
    <div
      className="anim-card group bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-500 group-hover:bg-indigo-100 transition-colors">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, disabled, variant, icon, label }) {
  const variants = {
    emerald: "bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-200 disabled:text-slate-400",
    indigo: "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-200 disabled:text-slate-400",
    slate: "bg-slate-800 hover:bg-slate-900 text-white",
    red: "bg-red-600 hover:bg-red-700 text-white disabled:bg-slate-200 disabled:text-slate-400",
    amber: "bg-amber-500 hover:bg-amber-600 text-white disabled:bg-slate-200 disabled:text-slate-400",
    redOutline: "bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${variants[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}

const TIMELINE_STEPS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "hold", label: "On Hold" },
];

function HorizontalTimeline({ status }) {
  // For admin view: show the 4 possible outcomes horizontally
  // Highlight just the current/final state
  const stateMap = {
    APPROVED: { index: 1, isRejected: false, isHold: false },
    REJECTED: { index: 2, isRejected: true, isHold: false },
    ON_HOLD: { index: 3, isRejected: false, isHold: true },
  };

  const current = stateMap[status] || null;
  const isPending = !current;

  const steps = [
    { label: "Pending", active: isPending, done: !!current, reject: false, hold: false },
    { label: "Approved", active: status === "APPROVED", done: false, reject: false, hold: false },
    { label: "Rejected", active: status === "REJECTED", done: false, reject: status === "REJECTED", hold: false },
    { label: "On Hold", active: status === "ON_HOLD", done: false, reject: false, hold: status === "ON_HOLD" },
  ];

  return (
    <div className="flex items-center">
      {steps.map((step, i) => {
        const dotClass =
          step.reject ? "bg-red-100 ring-2 ring-red-300" :
            step.hold ? "bg-amber-100 ring-2 ring-amber-300" :
              step.active && !step.done ? "bg-indigo-50 ring-2 ring-indigo-300" :
                step.active ? "bg-emerald-100" :
                  step.done ? "bg-emerald-100" :
                    "bg-slate-100";

        const labelClass =
          step.reject ? "text-red-600" :
            step.hold ? "text-amber-600" :
              step.active && !step.done ? "text-indigo-700 font-bold" :
                step.active ? "text-emerald-700 font-bold" :
                  step.done ? "text-emerald-600" :
                    "text-slate-400";

        return (
          <div key={step.label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${dotClass}`}>
                {step.reject ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                ) : step.hold ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                ) : step.active && !step.done ? (
                  <span className="pulse-dot w-2 h-2 rounded-full bg-indigo-500 block" />
                ) : step.done || (step.active && step.label === "Approved") ? (
                  <CheckCircle2 size={13} className="text-emerald-600" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 block" />
                )}
              </div>
              <span className={`text-[9px] font-semibold leading-tight text-center ${labelClass}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full ${step.done ? "bg-emerald-200" : "bg-slate-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ApprovalPill({ status, approver }) {
  if (!status) return null;

  const configs = {
    APPROVED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", pulse: false, label: "Approved" },
    REJECTED: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500", pulse: false, label: "Rejected" },
    ON_HOLD: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", pulse: false, label: "On Hold" },
    PENDING: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500", pulse: true, label: "Pending Review" },
  };

  const key = Object.keys(configs).find((k) => status.includes(k)) || "PENDING";
  const c = configs[key];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? "pulse-dot" : ""}`} />
      {c.label}
      {approver && <span className="opacity-70 ml-0.5">· {approver}</span>}
    </span>
  );
}