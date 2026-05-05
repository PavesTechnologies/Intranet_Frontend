"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { showStatusToast } from "../../../components/toastfy/toast";
import StatusBadge from "../../../components/status/statusbadge";
import { useAuth } from "../../../contexts/AuthContext";
import {
  ArrowLeft,
  Mail,
  Phone,
  Briefcase,
  User,
  BadgeCheck,
  Pencil,
  Wallet,
  UserCheck,
  Eye,
  X,
  ChevronRight,
  Send,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  formatOfferStatusLabel,
  getOfferDisplayStatus,
  getOfferWithJoiningStatus,
} from "./offerStatus";



const EMP_STYLES = `
  @import url("https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Fraunces:wght@600;700&display=swap");
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  .anim-card { animation: fadeUp 0.4s ease both; }
  .pulse-dot  { animation: pulse-dot 1.5s ease-in-out infinite; }
  .emp-page   { font-family: "DM Sans", sans-serif; }
  .emp-name   { font-family: "Fraunces", serif; }
`;

(function injectEmpStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("emp-details-styles")) return;
  const tag = document.createElement("style");
  tag.id = "emp-details-styles";
  tag.textContent = EMP_STYLES;
  document.head.appendChild(tag);
})();
export default function ViewEmpDetails() {
  const { user_uuid } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [openApprovalModal, setOpenApprovalModal] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [sendingApproval, setSendingApproval] = useState(false);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [openMenu, setOpenMenu] = useState(false);
  const [loadingSendOffer, setLoadingSendOffer] = useState(false);
  const [approvalFile, setApprovalFile] = useState(null);
  const [deleteOfferModal, setDeleteOfferModal] = useState(false);
  const [deletingOffer, setDeletingOffer] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { user } = useAuth();
  const rawRoles = user?.roles || "";
  const userRoles = Array.isArray(rawRoles)
    ? rawRoles
    : rawRoles.split(",").map((r) => r.trim());

  const isHR = userRoles.includes("HR");
  const isAdmin = userRoles.includes("Admin");
  const isManager = userRoles.includes("Manager");
  const canEditOrDelete = isHR || isAdmin;
  const canRequestApproval = isHR || isAdmin;

  const selectedApproverName =
    adminUsers.find((a) => String(a.user_id) === String(selectedAdmin))?.name ||
    "";

  const [editData, setEditData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    mail: "",
    country_code: "",
    contact_number: "",
    designation: "",
    employee_type: "",
    // currency: "",
    total_ctc: "",
    compensation_components: [],
    cc_emails: "",
  });

  function toTitleCase(str) {
    str = str.toLowerCase();
    return str
      .split(" ")
      .map((w) => (w.length === 0 ? "" : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(" ");
  }

  /* ── FETCH EMPLOYEE ── */
  const fetchEmployee = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/offer/${user_uuid}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const offerData = getOfferWithJoiningStatus(res.data);
      setEmployee(offerData);
      setEditData({
        ...offerData,
        cc_emails: offerData?.cc_mails
        ? offerData.cc_mails.join(", ")
        : "",
      });
    } catch {
      showStatusToast("Failed to fetch employee details");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offer-approval/admin-users`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    setAdminUsers(res.data || []);
  };

  const fetchApprovalHistory = async () => {
    const token = localStorage.getItem("token");
    const res = await axios.get(
      `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offer-approval/status/${user_uuid}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = Array.isArray(res.data) ? res.data : [res.data];
    const mapped = data.map((item) => ({
      ...item,
      comments: item.comments || item.message || "",
    }));
    setApprovalHistory(mapped);
  };

  useEffect(() => { fetchEmployee(); fetchApprovalHistory(); }, [user_uuid]);
  useEffect(() => { if (openApprovalModal) fetchAdminUsers(); }, [openApprovalModal]);

  /* ── DERIVED STATE ── */
  const rawStatus = approvalHistory?.[0]?.status || "";
  const approvalStatus = rawStatus.toUpperCase();
  const isNoRequest = !rawStatus || approvalStatus === "NO REQUEST";
  const isPending = approvalStatus.includes("PENDING");
  const canModifyOfferApprovalRequest = isPending;
  const actionTaken = ["APPROVED", "REJECTED", "ON_HOLD"].includes(approvalStatus);

  const effectiveApprover =
    employee?.approver_name || approvalHistory?.[0]?.action_taker_name || null;

  /* ── PREVIEW ── */
  const handlePreviewOffer = async () => {
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/${user_uuid}/generate-preview`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );
      const file = new Blob([res.data], { type: "application/pdf" });
      window.open(URL.createObjectURL(file), "_blank");
    } catch {
      showStatusToast("Failed to generate preview");
    }
  };

  /* ── SEND OFFER ── */
  const handleSendOffer = async () => {
    setLoadingSendOffer(true);
    const token = localStorage.getItem("token");
    try {
      setSending(true);
      await axios.post(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/bulk-send`,
        { user_uuid_list: [user_uuid] },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showStatusToast("Offer sent successfully");
      fetchEmployee();
    } catch {
      showStatusToast("Failed to send offer");
    } finally {
      setSending(false);
      setLoadingSendOffer(false);
    }
  };

  /* ── APPROVAL ── */
  useEffect(() => {
    if (openApprovalModal && isPending) {
      const current = approvalHistory?.[0]?.action_taker_id || approvalHistory?.[0]?.approver_id;
      if (current) setSelectedAdmin(String(current));
    }
    if (openApprovalModal && isNoRequest) setSelectedAdmin("");
  }, [openApprovalModal, isPending, isNoRequest, approvalHistory]);

  const handleApprovalSubmit = async () => {
    if (!selectedAdmin) { showStatusToast("Please select approver"); return; }
    const token = localStorage.getItem("token");
    setSendingApproval(true);
    try {
      if (isNoRequest) {
        await axios.post(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offer-approval-requests/request`,
          [{ user_uuid, action_taker_id: Number(selectedAdmin) }],
          { headers: { Authorization: `Bearer ${token}` } },
        );
        showStatusToast("Approval request sent");
      } else if (isPending) {
        await axios.put(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offer-approval/reassign`,
          { user_uuid, new_approver_id: Number(selectedAdmin), comments: "Reassigned from UI" },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        showStatusToast("Approval reassigned");
      }
      setOpenApprovalModal(false);
      setSelectedAdmin("");
      fetchApprovalHistory();
    } catch {
      showStatusToast("Failed to process approval");
    } finally {
      setSendingApproval(false);
    }
  };

  /* ── UPDATE ── */
  const handleUpdateOffer = async () => {
    const token = localStorage.getItem("token");
    const payload = {
  first_name: editData.first_name,
  middle_name: editData.middle_name,
  last_name: editData.last_name,
  mail: editData.mail,
  country_code: editData.country_code,
  contact_number: editData.contact_number,
  designation: editData.designation,
  employee_type: editData.employee_type,

  total_ctc: Number(editData.total_ctc || 0),

  compensation_components:
  Array.isArray(editData.compensation_components)
    ? editData.compensation_components
    : [],
  cc_emails: editData.cc_emails
    ? editData.cc_emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean)
    : [],
};
    try {
      setUpdating(true);
      await axios.put(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/${user_uuid}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      showStatusToast("Offer updated successfully");
      setIsEditing(false);
      fetchEmployee();
    } catch {
      showStatusToast("Failed to update offer");
    } finally {
      setUpdating(false);
    }
  };

  /* ── DELETE ── */
  const handleDeleteOffer = async () => {
    const token = localStorage.getItem("token");
    try {
      setDeletingOffer(true);
      await axios.delete(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/delete/${user_uuid}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showStatusToast("Offer deleted successfully");
      setDeleteOfferModal(false);
      setTimeout(() => navigate("/employee-onboarding"), 800);
    } catch (e) {
      console.log("DELETE ERROR:", e);
      setDeleteOfferModal(false);
      showStatusToast(e?.response?.data?.detail || "Failed to delete offer");
    } finally {
      setDeletingOffer(false);
    }
  };

  if (loading)
    return (
      <div className="emp-page min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm">Loading offer details…</p>
        </div>
      </div>
    );

  if (!employee)
    return (
      <div className="emp-page min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Offer not found.</p>
      </div>
    );

  const displayStatus = getOfferDisplayStatus(employee, []);
  const fullName = [employee.first_name, employee.middle_name, employee.last_name]
    .filter((n) => n && n.trim() !== "")
    .join(" ");
  const initials = [employee.first_name, employee.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join("");

  /* ═══════════════════════════════ UI ═══════════════════════════════ */
  return (
    <div className="emp-page min-h-screen bg-slate-50">

      {/* ── TOP NAV BAR ── */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-sm font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Offers
          </button>
          <span className="text-xs text-slate-400 font-mono">{user_uuid}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* ── PROFILE HEADER ── */}
        <div
          className="anim-card bg-white rounded-2xl border border-slate-100 p-8 mb-6 shadow-sm"
          style={{ animationDelay: "0ms" }}
        >
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <span className="emp-name text-2xl font-bold text-indigo-700">
                {initials || <User size={24} />}
              </span>
            </div>

            {/* Name + badges */}
            <div className="flex-1 min-w-0">
              <h1
                className="emp-name text-3xl font-bold text-slate-900 leading-tight mb-2 truncate"

              >
                {fullName}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-3">
                <StatusBadge label={formatOfferStatusLabel(displayStatus)} size="sm" />
                <ApprovalPill
                  status={approvalStatus}
                  approver={effectiveApprover}
                />
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-400" />
                  {employee.mail}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone size={13} className="text-slate-400" />
                  +{employee.country_code} {employee.contact_number}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase size={13} className="text-slate-400" />
                  {employee.designation}
                </span>
              </div>
            </div>

            {/* Quick actions (top-right) */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {(isHR || isManager) && (
                <button
                  onClick={handlePreviewOffer}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Eye size={15} />
                  Preview
                </button>
              )}
              {(isHR || isAdmin) && isNoRequest && (
                <button
                onClick={() => {
                  setEditData({
                    ...employee,
                    cc_emails: employee?.cc_mails
                      ? employee.cc_mails.join(", ")
                      : "",
                  });
                  setIsEditing(true);
                }}
                  disabled={employee.status === "SENT"}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pencil size={15} />
                  Edit Offer
                </button>
              )}
              {canModifyOfferApprovalRequest && canRequestApproval && (
                <button
                  onClick={() => { setOpenMenu(false); setOpenApprovalModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <ShieldCheck size={15} />
                  Edit Approval
                </button>
              )}
            </div>
          </div>

          {/* Comments banner */}
          {approvalHistory?.[0]?.comments?.trim() && (
            <div className="mt-5 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-0.5">Approver Comments</p>
                <p className="text-sm text-amber-900">{approvalHistory[0].comments}</p>
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
                { icon: <Mail size={16} />, label: "Email", value: employee.mail, delay: 60 },
                {
                  icon: <Phone size={16} />,
                  label: "Contact",
                  value: `+${employee.country_code} ${employee.contact_number}`,
                  delay: 120,
                },
                { icon: <Briefcase size={16} />, label: "Designation", value: employee.designation, delay: 180 },
                {
                  icon: <Wallet size={16} />,
                  label: "Annual CTC",
                  value: employee.total_ctc ? `₹ ${Number(employee.total_ctc).toLocaleString("en-IN")}` : "—",
                  delay: 240,
                },
                { icon: <UserCheck size={16} />, label: "Employee Type", value: employee.employee_type, delay: 300 },
                {
                  icon: <Mail size={16} />,
                  label: "CC Emails",
                  value:
                    employee?.cc_mails && employee.cc_mails.length > 0
                      ? employee.cc_mails.join(", ")
                      : "—",
                  delay: 360,
                },
              ].map(({ icon, label, value, delay }) => (
                <GhostCard key={label} icon={icon} label={label} value={value} delay={delay} />
              ))}
            </div>
          </div>

          {/* ── RIGHT: STICKY ACTIONS + TIMELINE ── */}
          <div className="w-72 flex-shrink-0 sticky top-20 flex flex-col gap-4">

            {/* Unified card: horizontal timeline at top + actions below */}
            <div
              className="anim-card bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              style={{ animationDelay: "80ms" }}
            >
              {/* ── HORIZONTAL TIMELINE ── */}
              <div className="px-5 pt-5 pb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Progress
                </p>
                <HorizontalTimeline status={approvalStatus} sent={employee?.status === "SENT"} />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* ── ACTIONS ── */}
              <div className="px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                  Actions
                </p>
                <div className="flex flex-col gap-2.5">
                  {(isHR || isAdmin) && (
                    <ActionBtn
                      onClick={handleSendOffer}
                      disabled={approvalStatus !== "APPROVED" || loadingSendOffer || employee?.status === "SENT"}
                      variant="emerald"
                      icon={<Send size={15} />}
                      label={employee?.status === "SENT" ? "Offer Sent" : loadingSendOffer ? "Sending…" : "Send Offer"}
                    />
                  )}
                  {(isHR || isManager) && (
                    <ActionBtn
                      onClick={handlePreviewOffer}
                      variant="slate"
                      icon={<Eye size={15} />}
                      label="Preview Offer"
                    />
                  )}
                  {(isHR || isAdmin) && (
                    <ActionBtn
                      onClick={() => setOpenApprovalModal(true)}
                      disabled={!isNoRequest}
                      variant="indigo"
                      icon={<ShieldCheck size={15} />}
                      label="Request Approval"
                    />
                  )}
                  {canEditOrDelete && (
                    <ActionBtn
                      onClick={() => setDeleteOfferModal(true)}
                      variant="red"
                      icon={<Trash2 size={15} />}
                      label="Delete Offer"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ EDIT MODAL ══════════ */}
      {isEditing && (
        <ModalOverlay>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Sticky header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
              <div>
                <h3 className="emp-name text-xl font-bold text-slate-900">
                  Edit Offer Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{fullName}</p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(editData)
                  .filter((key) =>
                    [
                      "first_name","middle_name","last_name","mail","country_code",
                      "contact_number","designation","employee_type","total_ctc","cc_emails",
                    ].includes(key)
                  )
                  .map((key) => (
                    <label key={key} className="flex flex-col gap-1.5">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        {toTitleCase(key.replace(/_/g, " "))}
                      </span>
                      {key === "employee_type" ? (
                        <select
                          value={editData[key] || ""}
                          onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 ring-0 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
                        >
                          <option value="">Select Employee Type</option>
                          <option value="Full-Time">Full-Time</option>
                          <option value="Part-Time">Part-Time</option>
                          <option value="Intern">Intern</option>
                          <option value="Contract">Contract</option>
                        </select>
                      ) : (
                        <input
                          value={editData[key] || ""}
                          onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                          placeholder={key === "cc_emails" ? "Emails separated by comma" : ""}
                          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                        />
                      )}
                    </label>
                  ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50">
              <button
                onClick={() => setIsEditing(false)}
                className="px-5 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateOffer}
                disabled={updating}
                className="px-5 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 text-sm font-medium transition-all active:scale-95 disabled:opacity-60"
              >
                {updating ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══════════ APPROVAL MODAL ══════════ */}
      {openApprovalModal && (
        <ModalOverlay>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="emp-name text-xl font-bold text-slate-900">
                  {isPending ? "Reassign Approval" : "Send for Approval"}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Select the approver for this offer</p>
              </div>
              <button
                onClick={() => setOpenApprovalModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Approver
              </label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
              >
                <option value="">Select Approver</option>
                {adminUsers.map((a) => (
                  <option key={a.user_id} value={a.user_id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setOpenApprovalModal(false)}
                className="px-5 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!selectedAdmin) { showStatusToast("Please select approver"); return; }
                  setShowConfirmModal(true);
                }}
                className="px-5 py-2 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 text-sm font-medium transition-all active:scale-95"
              >
                Continue
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══════════ CONFIRMATION MODAL ══════════ */}
      {showConfirmModal && (
        <ModalOverlay>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="emp-name text-xl font-bold text-slate-900">
                Confirm Approval Request
              </h3>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Approver</p>
                <p className="text-sm font-semibold text-slate-800">{selectedApproverName || "—"}</p>
              </div>
              <p className="text-sm text-slate-500">
                The offer preview will be shared with the selected approver. This action can be reassigned if needed.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-5 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => { setShowConfirmModal(false); await handleApprovalSubmit(); }}
                className="px-5 py-2 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 text-sm font-medium transition-all active:scale-95"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ══════════ DELETE MODAL ══════════ */}
      {deleteOfferModal && (
        <ModalOverlay>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-1">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <h3 className="emp-name text-xl font-bold text-slate-900">
                Delete Offer?
              </h3>
              <p className="text-sm text-slate-500">
                This will permanently delete the offer for <strong className="text-slate-700">{fullName}</strong>. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setDeleteOfferModal(false)}
                className="flex-1 px-5 py-2 rounded-xl text-slate-600 bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOffer}
                disabled={deletingOffer}
                className="flex-1 px-5 py-2 rounded-xl text-white bg-red-600 hover:bg-red-700 text-sm font-medium transition-all active:scale-95 disabled:opacity-60"
              >
                {deletingOffer ? "Deleting…" : "Yes, Delete"}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(4px)" }}>
      {children}
    </div>
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
    indigo:  "bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-slate-200 disabled:text-slate-400",
    slate:   "bg-slate-800 hover:bg-slate-900 text-white",
    red:     "bg-red-600 hover:bg-red-700 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${variants[variant]}`}
    >
      {icon}
      {label}
    </button>
  );
}

const TIMELINE_STEPS = [
  { key: "created",  label: "Draft"    },
  { key: "pending",  label: "Approval" },
  { key: "approved", label: "Approved" },
  { key: "sent",     label: "Sent"     },
];

function HorizontalTimeline({ status, sent }) {
  const getActiveIndex = () => {
    if (sent) return 3;
    if (status === "APPROVED") return 2;
    if (status.includes("PENDING")) return 1;
    if (status === "REJECTED") return 1;
    return 0;
  };
  const active = getActiveIndex();
  const isRejected = status === "REJECTED";

  return (
    <div className="flex items-center">
      {TIMELINE_STEPS.map((step, i) => {
        const isDone = i < active;
        const isCurrent = i === active;
        const isRejectStep = isRejected && i === 1;

        const dotClass = isRejectStep
          ? "bg-red-100 ring-2 ring-red-300"
          : isDone
          ? "bg-emerald-100"
          : isCurrent
          ? "bg-indigo-50 ring-2 ring-indigo-300"
          : "bg-slate-100";

        const labelClass = isRejectStep
          ? "text-red-600"
          : isCurrent
          ? "text-indigo-700 font-bold"
          : isDone
          ? "text-emerald-700"
          : "text-slate-400";

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Step node */}
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${dotClass}`}>
                {isRejectStep ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                ) : isDone ? (
                  <CheckCircle2 size={13} className="text-emerald-600" />
                ) : isCurrent ? (
                  <span className="pulse-dot w-2 h-2 rounded-full bg-indigo-500 block" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-300 block" />
                )}
              </div>
              <span className={`text-[9px] font-semibold leading-tight text-center ${labelClass}`}>
                {isRejectStep ? "Rejected" : step.label}
              </span>
            </div>
            {/* Connector line between steps */}
            {i < TIMELINE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 rounded-full ${isDone ? "bg-emerald-200" : "bg-slate-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ApprovalPill({ status, approver }) {
  if (!status || status === "NO REQUEST") return null;

  const configs = {
    PENDING:  { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-500",  pulse: true,  label: "Approval Pending" },
    APPROVED: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", pulse: false, label: "Approved" },
    REJECTED: { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500",    pulse: false, label: "Rejected" },
    ON_HOLD:  { bg: "bg-slate-100", text: "text-slate-600",  dot: "bg-slate-400",  pulse: false, label: "On Hold" },
  };

  const key = Object.keys(configs).find((k) => status.includes(k)) || "ON_HOLD";
  const c = configs[key];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${c.pulse ? "pulse-dot" : ""}`} />
      {c.label}
      {approver && <span className="opacity-70 ml-0.5">· {approver}</span>}
    </span>
  );
}