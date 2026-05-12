import React, { useEffect, useState } from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import {
  AlertIcon,
  AddIcon,
  UserIcon,
  BookmarkIcon,
  EditIcon,
  CheckIcon,
  ShieldIcon,
  DeleteIcon,
  CloseIcon,
} from "../../../../components/icons";
import axios from "axios";
import { showStatusToast } from "../../../../components/toastfy/toast";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import Modal from "../../../../components/Modal/modal";
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

  const axiosInstance = React.useMemo(() => {
    const instance = axios.create({
      baseURL: window.__APP_CONFIG__.PMS_BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    instance.interceptors.request.use(
      (config) => {
        const latestToken = localStorage.getItem("token");

        if (latestToken) {
          config.headers.Authorization = `Bearer ${latestToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    return instance;
  }, []);

  useEffect(() => {
    if (!risk?.id) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const riskReq = axiosInstance.get(`/api/risks/${risk.id}`);

        const riskLinkId = axiosInstance.get(`/api/risk-links/risk/${risk.id}`);

        const mitigationReq = axiosInstance
          .get(`/api/mitigation-plans/risk/${risk.id}`)
          .catch(() => ({ data: [] }));

        const membersReq = axiosInstance.get(
          `/api/projects/${projectId}/members`
        );

        const riskRes = (await riskReq).data;

        const riskLinkRes = (await riskLinkId).data;
        riskRes.riskLinkId = riskLinkRes[0]?.id || null;

        const categoryReq = riskRes.categoryId
          ? axiosInstance.get(`/api/risk/category/${riskRes.categoryId}`)
          : Promise.resolve({ data: null });

        const ownerReq = riskRes.ownerId
          ? axiosInstance.get(`/api/users/${riskRes.ownerId}`)
          : Promise.resolve({ data: null });

        const reporterReq = riskRes.reporterId
          ? axiosInstance.get(`/api/users/${riskRes.reporterId}`)
          : Promise.resolve({ data: null });

        const statusReq = riskRes.statusId
          ? axiosInstance.get(`/api/risk-statuses/${riskRes.statusId}`)
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
  }, [risk?.id, projectId, axiosInstance]);

  async function startEditStatus() {
    try {
      const res = await axiosInstance.get(
        `/api/projects/${projectId}/risk-statuses`
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
      await axiosInstance.patch(`/api/risks/${risk.id}/status`, {
        statusId: selectedStatusId,
      });

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

      await axiosInstance.delete(`/api/risks/${risk.id}`);

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

  const editRiskData = riskDetail
    ? {
        ...riskDetail,
        linkedType:
          riskDetail.linkedType ||
          risk?.linkedType ||
          selectedIssue?.linkedType ||
          null,
        linkedId:
          riskDetail.linkedId ||
          risk?.linkedId ||
          selectedIssue?.linkedId ||
          null,
        linkedName:
          riskDetail.linkedName ||
          riskDetail.linkedTitle ||
          risk?.linkedName ||
          risk?.linkedTitle ||
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
    <>
      <Modal
        isOpen={!!risk}
        onClose={onClose}
        title={`Risk #${risk?.id ?? ""}`}
        subtitle={riskDetail?.title || (loading ? "Loading…" : "")}
        titleIcon={<ShieldIcon className="w-4 h-4 text-white" />}
        closeIcon={<CloseIcon className="w-4 h-4 text-white" />}
        size="3xl"
        maxHeight="max-h-[88vh]"
        headerClassName="!bg-indigo-600 !border-indigo-500"
        titleClassName="!text-white"
        subtitleClassName="!text-indigo-200"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button
              variant="danger"
              size="small"
              onClick={handleDeleteRisk}
              disabled={deleting}
              loading={deleting}
              loadingText="Deleting..."
            >
              <DeleteIcon className="w-3.5 h-3.5" /> Delete Risk
            </Button>

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="small"
                onClick={() => setShowEdit(true)}
              >
                <EditIcon className="w-3.5 h-3.5" /> Edit
              </Button>

              <Button variant="secondary" size="small" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        }
      >
        <CreateRiskModal
          isOpen={showEdit}
          onClose={() => setShowEdit(false)}
          projectId={projectId}
          risk={editRiskData}
          onSuccess={() => {
            setShowEdit(false);
            onUpdated?.();
          }}
          onEdit={true}
        />

        {riskDetail?.priority && (
          <div className="mb-3">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wide">
              {riskDetail.priority}
            </span>
          </div>
        )}

        {loading && <LoadingSpinner size="md" text="Loading…" />}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {riskDetail && (
          <div className="space-y-4">
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
                icon={<BookmarkIcon className="w-3 h-3 text-slate-400" />}
              />
              <InfoCard
                label="Owner"
                value={owner?.name}
                icon={<UserIcon className="w-3 h-3 text-slate-400" />}
              />
              <InfoCard
                label="Reporter"
                value={reporter?.name}
                icon={<UserIcon className="w-3 h-3 text-slate-400" />}
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
                    <FilterListbox
                      options={statuses.map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))}
                      value={selectedStatusId || ""}
                      onChange={setSelectedStatusId}
                    />
                  )}
                </div>

                {!editingStatus ? (
                  <Button variant="ghost" size="small" onClick={startEditStatus}>
                    <EditIcon className="w-3 h-3" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => setEditingStatus(false)}
                    >
                      Cancel
                    </Button>

                    <Button variant="primary" size="small" onClick={saveStatus}>
                      <CheckIcon className="w-3 h-3" /> Save
                    </Button>
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
                  <AlertIcon className="w-4 h-4 text-indigo-500" />
                  Mitigation Plans
                  {mitigations.length > 0 && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-600 font-bold px-1.5 py-0.5 rounded-full">
                      {mitigations.length}
                    </span>
                  )}
                </h4>

                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setShowAdd(true)}
                >
                  <AddIcon className="w-3.5 h-3.5" /> Add
                </Button>
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
      </Modal>

      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        showHeader={false}
        size="md"
        zIndex="z-[10000]"
        bodyClassName="p-0"
      >
        <AddMitigationForm
          riskId={risk?.id}
          members={members}
          onAdd={handleCreated}
          onClose={() => setShowAdd(false)}
        />
      </Modal>

      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        title="Delete Risk"
        message="Are you sure you want to delete this risk? This action cannot be undone."
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          executeDeleteRisk();
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
        confirmText="Delete"
        variant="danger"
        isLoading={deleting}
      />
    </>
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