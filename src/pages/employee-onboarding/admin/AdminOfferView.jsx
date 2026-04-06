"use client";

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
} from "lucide-react";
import { set } from "date-fns";
import {
  formatOfferStatusLabel,
  getOfferDisplayStatus,
  getOfferWithJoiningStatus,
} from "../components/offerStatus";

/* ================= MAIN COMPONENT ================= */

export default function AdminOfferView() {
  const { user_uuid } = useParams();
  const navigate = useNavigate();

  const token = localStorage.getItem("token");
  const BASE = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;

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
    if (!found) {
      setApproval(null);
      return;
    }
    const mapped= {
      ...found,
      action: found.action,
      approver_name: found.approver_name || null,
      comments: found.message || found.comments|| "",
      mail: found.mail || "",
    };
    setApproval(mapped);
    console.log("Mapped Approval:", mapped);
    // setApproval(found || null);
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

    if (approval.action === action) {
      toast.info("This status is already applied.");
      return;
    }

    const previousAction = approval.action;
    setApproval({
      ...approval,
      action,
      comments: comment !== null ? comment : approval.comments,
    });

    setActing(true);
    setError("");

    try {
      await axios.put(
        `${BASE}/offer-approval/update_action`,
        {
          user_uuid,
          action,
          comments:
            comment ??
            (action === "APPROVED"
              ? "Approved by admin"
              : action === "REJECTED"
              ? "Rejected by admin"
              : "Kept on hold by admin"),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      toast.success(
        action === "APPROVED"
          ? "Offer approved"
          : action === "REJECTED"
          ? "Offer rejected"
          : "Offer put on hold"
      );

      await fetchOffer();
      await fetchApproval();

      setIsEditing(false);
      setShowMenu(false);
    } catch (e) {
      setApproval({ ...approval, action: previousAction, comments: approval.comments });
      const msg =
        e?.response?.data?.detail || "Unable to update approval status";
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
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      }
    );

    const file = new Blob([res.data], { type: "application/pdf" });

    const fileURL = URL.createObjectURL(file);

    window.open(fileURL, "_blank");

  } catch (error) {

    toast.error("Failed to open offer preview");

  }

};

 
/* ---------------- DELETE APPROVAL REQUEST ---------------- */
const deleteApprovalRequest = async () => {
  if (!approval) return;

  try {
    setActing(true);

    await axios.delete(`${BASE}/offer-approval-requests/request/delete`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: [{ user_uuid }],
    });

    toast.success("Approval request deleted successfully");

    // close modal
    setDeleteModal(false);

    // redirect to dashboard after short delay
    setTimeout(() => {
      navigate("/employee-onboarding"); // change if your dashboard route is different
    }, 800);

  } catch (e) {
    const msg =
      e?.response?.data?.detail || "Failed to delete approval request";
    toast.error(msg);
  } finally {
    setActing(false);
  }
};


  if (loading)
    return <div className="p-10 text-center">Loading...</div>;

  if (!offer)
    return (
      <div className="p-10 text-center text-red-600">
        Offer not found
      </div>
    );
  const displayStatus = formatOfferStatusLabel(
    getOfferDisplayStatus(offer, [])
  );

  /* ================= UI ================= */

  return (
    <div className="max-w-5xl mx-auto p-6">
      <ToastContainer position="top-right" autoClose={3000} />

      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-blue-900 hover:underline mb-6 font-semibold"
      >
        <ArrowLeft size={20} /> Back
      </button>

      <div className="bg-white rounded-xl shadow-md p-8 relative">
        {/* EDIT MENU */}
        {isFinalStatus && (
          <div className="absolute top-6 right-6">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <MoreVertical size={20} />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 bg-white shadow border rounded-md w-36">
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-blue-700"
                >
                  Edit Status
                </button>
              </div>
            )}
          </div>
        )}

        {/* HEADER */}
        <div className="flex gap-4 mb-8 items-start">
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <UserCheck size={26} />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-blue-900">
              {offer.first_name} {offer.last_name}
            </h1>

            <p className="flex items-center gap-2 text-gray-700 mt-1">
              <BadgeCheck size={16} className="text-green-600" />
              Offer Status:
              <span className="font-medium text-gray-900">
                {displayStatus}
              </span>
            </p>

            {approval && (
              <ApprovalBadge
                 status={approval?.action}
                  approver={approval?.approver_name}
                  comments={approval?.comments}
              />
            )}
          </div>
        </div>

        {/* DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <DetailCard icon={<Mail />} label="Email" value={offer.mail} />
          <DetailCard
            icon={<Phone />}
            label="Contact"
            value={`+${offer.country_code} ${offer.contact_number}`}
          />
          <DetailCard
            icon={<Briefcase />}
            label="Designation"
            value={offer.designation}
          />
          <DetailCard
            icon={<IndianRupee />}
            label="CTC"
            value={`${offer.package} ${offer.currency}`}
          />
          <DetailCard
            icon={<UserCheck/>}
            label="Employee Type"
            value={offer.employee_type}
          />
          <DetailCard
            icon={<Mail />}
            label="CC Emails"
            value={
              offer?.cc_emails
                ? offer.cc_emails
                    .split(",")
                    .map(e => e.trim())
                    .filter(Boolean)
                    .join(", ")
                : "—"
            }
          />
        </div>

        {/* ACTION BUTTONS */}
        {/* {approval && (
          <div className="flex gap-4 mt-10">
            <ActionButton
              label="View Offer"
              color="grey"
              icon={Eye}
              onClick={handlePreviewOffer}
              disabled={false}
              
            />
            <ActionButton
              label="Approve"
              color="green"
              disabled={!buttonsEnabled || acting}
              onClick={() => submitAction("APPROVED")}
            />
            <ActionButton
              label="Reject"
              color="red"
              disabled={!buttonsEnabled || acting}
              onClick={() => {
                setRejectModal(true);
                setRejectComment("");
              }}
            />
            <ActionButton
              label="On Hold"
              color="gray"
              disabled={!buttonsEnabled || acting}
              onClick={() => {
                setHoldModal(true);
                setHoldComment("");
              }}
              
            />
            <ActionButton
            label="Delete Approval"
            color="red"
            disabled={acting}
            onClick={() => setDeleteModal(true)}
              />
          </div>

        )} */}
        {approval && (
  <div className="flex gap-4 mt-10">

    <ActionButton
      label="Preview Offer"
      color="blue" 
      onClick={handlePreviewOffer}
      disabled={false}
    />

    <ActionButton
      label="Approve"
      color="green"
      disabled={!buttonsEnabled || acting}
      onClick={() => submitAction("APPROVED")}
    />

    <ActionButton
      label="Reject"
      color="red"
      disabled={!buttonsEnabled || acting}
      onClick={() => {
        setRejectModal(true);
        setRejectComment("");
      }}
    />

    <ActionButton
      label="On Hold"
      color="gray"
      disabled={!buttonsEnabled || acting}
      onClick={() => {
        setHoldModal(true);
        setHoldComment("");
      }}
    />

    <ActionButton
      label="Delete Approval"
      color="red"
      disabled={acting}
      onClick={() => setDeleteModal(true)}
    />

  </div>
)}

        {error && (
          <p className="text-red-600 mt-4 font-medium">{error}</p>
        )}
      </div>

      {/* REJECT MODAL */}
      {rejectModal && (
        <Modal
          title="Reject Offer"
          comment={rejectComment}
          setComment={setRejectComment}
          acting={acting}
          onCancel={() => setRejectModal(false)}
          onConfirm={async () => {
            await submitAction("REJECTED", rejectComment);
            setRejectModal(false);
          }}
          confirmText="Reject"
          color="red"
        />
      )}

      {/* HOLD MODAL */}
      {holdModal && (
        <Modal
          title="Put Offer On Hold"
          comment={holdComment}
          setComment={setHoldComment}
          acting={acting}
          onCancel={() => setHoldModal(false)}
          onConfirm={async () => {
            await submitAction("ON_HOLD", holdComment);
            setHoldModal(false);
          }}
          confirmText="Confirm"
          color="green"
        />
      )}
      {/* DELETE MODAL */}
{deleteModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow w-[400px]">
      <h2 className="text-lg font-semibold mb-3 text-red-700">
        Delete Approval Request
      </h2>

      <p className="text-sm text-gray-700 mb-4">
        Are you sure you want to delete this approval request?  
        This action cannot be undone.
      </p>

      <div className="flex justify-end gap-2">
        <button
          disabled={acting}
          onClick={() => setDeleteModal(false)}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Cancel
        </button>

        <button
          disabled={acting}
          onClick={deleteApprovalRequest}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-60"
        >
          {acting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

/* ================= REUSABLE COMPONENTS ================= */

function DetailCard({ icon, label, value }) {
  return (
    <div className="border rounded-lg p-4 flex gap-4">
      <div className="text-blue-900">{icon}</div>
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        <p className="font-semibold text-blue-900">{value || "—"}</p>
      </div>
    </div>
  );
}

function ApprovalBadge({ status, approver,comments }) {
  const styles = {
    APPROVED: "bg-green-100 text-green-800 border-green-300",
    REJECTED: "bg-red-100 text-red-800 border-red-300",
    ON_HOLD: "bg-gray-100 text-gray-800 border-gray-300",
  };
  return (
    <div className="flex mt-3 flex-col gap-2">
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 text-sm border rounded-full ${
          styles[status] || "bg-gray-100"
        }`}
      >
        <span className="font-medium">{status}</span>
        {approver && <span className="text-xs opacity-80">• {approver}</span>}
      </div>

      {comments && comments.trim() !== "" && (
        <div className="text-lg">
          <span className="font-semibold text-red-700">Comments : </span>
          {comments}
        </div>
      )}
    </div>
  );

  // return (
  //   <div className="mt-4 flex flex-col gap-2">
  //     {/* STATUS LINE */}
  //     <div
  //       className={`inline-flex items-center gap-2 px-3 py-1 text-sm border rounded-full ${styles[status]}`}
  //     >
  //       <span className="font-medium">{status}</span>
  //       {approver && <span className="text-xs">• {approver}</span>}
        
  //     </div>

  //     {/* COMMENT LINE */}
  //     {comments && comments.trim() !== "" && (
  //     <div className="text-sm mt-1">
  //       <span className="font-semibold text-gray-700">Comments: </span>
  //       <span className="text-gray-800">{comments}</span>
  //     </div>
  //   )}
  //   </div>
  // );
}

function ActionButton({ label, color, onClick, disabled ,icon: Icon}) {
  const colors = {
    blue: "bg-blue-700 hover:bg-blue-800",
    green: "bg-green-700 hover:bg-green-800",
    red: "bg-red-700 hover:bg-red-800",
    gray: "bg-gray-600 hover:bg-gray-800",
  };

  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`px-6 py-2 text-white rounded-lg transition disabled:opacity-60 ${colors[color]}`}
    >
      {Icon && <Icon size={16}/>}
      {label}
    </button>
  );
}

function Modal({
  title,
  comment,
  setComment,
  acting,
  onCancel,
  onConfirm,
  confirmText,
  color,
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow w-[420px]">
        <h2 className="text-lg font-semibold mb-3">{title}</h2>

        <textarea
          className="w-full border p-2 rounded h-28"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            disabled={acting}
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded"
          >
            Cancel
          </button>

          <button
            disabled={!comment.trim() || acting}
            onClick={onConfirm}
            className={`px-4 py-2 bg-${color}-600 text-white rounded disabled:opacity-60`}
          >
            {acting ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
