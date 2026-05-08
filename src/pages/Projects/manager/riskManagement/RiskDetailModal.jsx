import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Plus,
  X,
  User,
  Tag,
  Pencil,
  Check,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";

import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import AddMitigationForm from "./AddMitigationForm";
import MitigationList from "./MitigationList";
import CreateRiskModal from "./createRiskModal";

export default function RiskDetailModal({
  risk,
  onClose,
  projectId,
  selectedIssue,
  onUpdated,
}) {
  const [riskDetail, setRiskDetail] = useState(null);
  const [mitigations, setMitigations] = useState([]);
  const [members, setMembers] = useState([]);
  const [category, setCategory] = useState(null);
  const [owner, setOwner] = useState(null);
  const [reporter, setReporter] = useState(null);

  const [status, setStatus] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [editingStatus, setEditingStatus] = useState(false);
  const [selectedStatusId, setSelectedStatusId] = useState(null);

  const [showEdit, setShowEdit] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const BASE_URL = window.__APP_CONFIG__.PMS_BASE_URL;
  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    if (!risk?.id) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const riskReq = axios.get(`${BASE_URL}/api/risks/${risk.id}`, {
          headers,
        });

        const mitigationReq = axios
          .get(`${BASE_URL}/api/mitigation-plans/risk/${risk.id}`, {
            headers,
          })
          .catch(() => ({ data: [] }));

        const membersReq = axios.get(
          `${BASE_URL}/api/projects/${projectId}/members`,
          { headers },
        );

        const riskRes = (await riskReq).data;

        const categoryReq = riskRes.categoryId
          ? axios.get(`${BASE_URL}/api/risk/category/${riskRes.categoryId}`, {
              headers,
            })
          : Promise.resolve({ data: null });

        const ownerReq = riskRes.ownerId
          ? axios.get(`${BASE_URL}/api/users/${riskRes.ownerId}`, {
              headers,
            })
          : Promise.resolve({ data: null });

        const reporterReq = riskRes.reporterId
          ? axios.get(`${BASE_URL}/api/users/${riskRes.reporterId}`, {
              headers,
            })
          : Promise.resolve({ data: null });

        const statusReq = riskRes.statusId
          ? axios.get(`${BASE_URL}/api/risk-statuses/${riskRes.statusId}`, {
              headers,
            })
          : Promise.resolve({ data: null });

        const [
          mitigationRes,
          membersRes,
          categoryRes,
          ownerRes,
          reporterRes,
          statusRes,
        ] = await Promise.all([
          mitigationReq,
          membersReq,
          categoryReq,
          ownerReq,
          reporterReq,
          statusReq,
        ]);

        if (!mounted) return;

        setRiskDetail(riskRes);
        setMitigations(mitigationRes?.data || []);
        setMembers(membersRes?.data || []);
        setCategory(categoryRes?.data || null);
        setOwner(ownerRes?.data || null);
        setReporter(reporterRes?.data || null);
        setStatus(statusRes?.data || null);
        setSelectedStatusId(statusRes?.data?.id || null);
      } catch (err) {
        console.error(err);
        if (mounted) setError("Failed to load risk details");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [risk?.id, projectId, BASE_URL, token]);

  async function startEditStatus() {
    try {
      const res = await axios.get(
        `${BASE_URL}/api/projects/${projectId}/risk-statuses`,
        { headers },
      );

      setStatuses(res.data || []);
      setEditingStatus(true);
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to load risk statuses", "error");
    }
  }

  async function saveStatus() {
    try {
      await axios.patch(
        `${BASE_URL}/api/risks/${risk.id}/status`,
        { statusId: selectedStatusId },
        { headers },
      );

      const updated = statuses.find((s) => s.id === selectedStatusId);
      setStatus(updated || null);
      setEditingStatus(false);

      showStatusToast("Risk status updated successfully", "success");
      onUpdated?.();
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to update risk status", "error");
    }
  }

  async function executeDeleteRisk() {
    try {
      setDeleting(true);

      await axios.delete(`${BASE_URL}/api/risks/${risk.id}`, {
        headers,
      });

      showStatusToast("Risk deleted successfully", "success");
      onUpdated?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to delete risk", "error");
    } finally {
      setDeleting(false);
    }
  }

  function handleDeleteRisk() {
    setDeleteConfirmOpen(true);
  }

  function handleCreated(plan) {
    setMitigations((p) => [...p, plan]);
    setShowAdd(false);
  }

  function handleUpdated(updated) {
    setMitigations((p) => p.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleDeleted(id) {
    setMitigations((p) => p.filter((m) => m.id !== id));
  }

  if (!risk) return null;

  const editRiskData = riskDetail
    ? {
        ...riskDetail,

        linkedType:
          riskDetail.linkedType ||
          risk.linkedType ||
          selectedIssue?.linkedType ||
          null,

        linkedId:
          riskDetail.linkedId ||
          risk.linkedId ||
          selectedIssue?.linkedId ||
          null,

        linkedName:
          riskDetail.linkedName ||
          riskDetail.linkedTitle ||
          risk.linkedName ||
          risk.linkedTitle ||
          selectedIssue?.title ||
          selectedIssue?.name ||
          null,
      }
    : null;

  const score = riskDetail?.riskScore ?? 0;

  const scoreColor =
    score >= 20
      ? "text-red-600 bg-red-50 border-red-200"
      : score >= 12
        ? "text-orange-600 bg-orange-50 border-orange-200"
        : score >= 6
          ? "text-amber-600 bg-amber-50 border-amber-200"
          : "text-emerald-600 bg-emerald-50 border-emerald-200";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center">

      <div
        className="
          bg-white w-full
          sm:max-w-3xl sm:mx-4
          rounded-t-2xl sm:rounded-2xl
          shadow-2xl flex flex-col
          max-h-[92dvh] sm:max-h-[88vh]
          overflow-hidden
        "
      >
        <div className="bg-indigo-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-start sm:items-center flex-shrink-0">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 mt-0.5 sm:mt-0">
              <ShieldAlert className="w-4 h-4" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base">
                  Risk #{risk.id}
                </h2>

                {riskDetail?.priority && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 uppercase tracking-wide">
                    {riskDetail.priority}
                  </span>
                )}
              </div>

              <p className="text-xs text-white/70 truncate max-w-[200px] sm:max-w-sm mt-0.5">
                {riskDetail?.title || "Loading…"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {/* <button
              onClick={handleDeleteRisk}
              disabled={deleting}
              className="hidden sm:flex items-center gap-1 text-xs text-white/90 hover:text-white bg-red-500/25 hover:bg-red-500/40 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-60"
            >
              <Trash2 size={12} />
              {deleting ? "Deleting..." : "Delete"}
            </button> */}

            <button
              onClick={handleDeleteRisk}
              disabled={deleting}
              className="sm:hidden w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/25 hover:bg-red-500/40 disabled:opacity-60"
            >
              <Trash2 size={13} />
            </button>

            <button
              onClick={() => setShowEdit(true)}
              className="hidden sm:flex items-center gap-1 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Pencil size={12} /> Edit
            </button>

            <button
              onClick={() => setShowEdit(true)}
              className="sm:hidden w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20"
            >
              <Pencil size={13} />
            </button>

            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <CreateRiskModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          projectId={projectId}
          risk={editRiskData}
          onSuccess={() => {
            setShowEdit(false);
            onUpdated?.();
          }}
        />

        <div className="flex-1 overflow-y-auto">
          {loading && <LoadingSpinner size="md" text="Loading…" />}

          {error && (
            <div className="mx-4 sm:mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {riskDetail && (
            <div className="px-4 sm:px-6 py-4 space-y-4">
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <Metric label="Probability" value={riskDetail.probability} />
                <Metric label="Impact" value={riskDetail.impact} />

                <div
                  className={`border rounded-xl p-3 sm:p-4 text-center ${scoreColor}`}
                >
                  <div className="text-[10px] uppercase tracking-wide font-semibold opacity-70">
                    Risk Score
                  </div>
                  <div className="text-xl sm:text-2xl font-black mt-0.5">
                    {riskDetail.riskScore ?? "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <InfoCard
                  label="Category"
                  value={category?.name}
                  icon={<Tag size={13} className="text-slate-400" />}
                />

                <InfoCard
                  label="Owner"
                  value={owner?.name}
                  icon={<User size={13} className="text-slate-400" />}
                />

                <InfoCard
                  label="Reporter"
                  value={reporter?.name}
                  icon={<User size={13} className="text-slate-400" />}
                />

                <InfoCard label="Triggers" value={riskDetail.triggers || "—"} />
              </div>

              <div className="border border-slate-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-1.5">
                      Status
                    </p>

                    {!editingStatus ? (
                      <span className="px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
                        {status?.name || "—"}
                      </span>
                    ) : (
                      <select
                        value={selectedStatusId || ""}
                        onChange={(e) =>
                          setSelectedStatusId(Number(e.target.value))
                        }
                        className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      >
                        {statuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {!editingStatus ? (
                    <button
                      onClick={startEditStatus}
                      className="flex items-center gap-1 text-indigo-600 text-xs font-medium hover:text-indigo-700 transition-colors"
                    >
                      <Pencil size={12} /> Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingStatus(false)}
                        className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                      >
                        Cancel
                      </button>

                      <button
                        onClick={saveStatus}
                        className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        <Check size={12} /> Save
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {riskDetail.description && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 sm:p-4">
                  <p className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold mb-2">
                    Description
                  </p>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {riskDetail.description}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-slate-800">
                    <AlertCircle size={15} className="text-indigo-500" />
                    Mitigation Plans

                    {mitigations.length > 0 && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">
                        {mitigations.length}
                      </span>
                    )}
                  </h4>

                  <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1 text-indigo-600 text-xs font-semibold hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={13} /> Add
                  </button>
                </div>

                {mitigations.length === 0 && !loading ? (
                  <div className="text-center py-6 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                    No mitigation plans yet
                  </div>
                ) : (
                  <MitigationList
                    mitigations={mitigations}
                    members={members}
                    onUpdated={handleUpdated}
                    onDelete={handleDeleted}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-6 py-3 flex justify-between items-center flex-shrink-0">
          <Button
            variant="danger"
            size="medium"
            onClick={handleDeleteRisk}
            disabled={deleting}
            loading={deleting}
            loadingText="Deleting..."
          >
            <Trash2 size={14} /> Delete Risk
          </Button>
          <Button variant="outline" size="medium" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center sm:justify-center">
          <div className="bg-white w-full sm:max-w-md sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[85dvh]">
            <AddMitigationForm
              riskId={risk.id}
              members={members}
              onAdd={handleCreated}
              onClose={() => setShowAdd(false)}
            />
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Delete Risk"
        message="Are you sure you want to delete this risk? This action cannot be undone."
        onConfirm={() => { setDeleteConfirmOpen(false); executeDeleteRisk(); }}
        onCancel={() => setDeleteConfirmOpen(false)}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 sm:p-4 text-center bg-white">
      <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
        {label}
      </div>
      <div className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5">
        {value ?? "—"}
      </div>
    </div>
  );
}

function InfoCard({ label, value, icon }) {
  return (
    <div className="flex items-start gap-2.5 border border-slate-200 rounded-xl p-3 bg-white">
      {icon && (
        <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
          {icon}
        </div>
      )}

      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">
          {label}
        </div>
        <div className="text-sm font-medium text-slate-700 mt-0.5 truncate">
          {value || "—"}
        </div>
      </div>
    </div>
  );
}