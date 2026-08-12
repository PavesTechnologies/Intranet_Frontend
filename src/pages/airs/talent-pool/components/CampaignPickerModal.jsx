import React, { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import { getAllCampaigns } from "../../campaigns/services/campaignservice";

// Campaign selection dialog shared by single- and bulk-add-to-campaign —
// only ever lets the user pick WHICH campaign. Resume selection is entirely
// the backend's ResumeSelectionService's job; this component never touches
// a resume. Only ACTIVE campaigns are listed, since add-to-campaign is
// rejected server-side for paused/closed ones anyway.
export default function CampaignPickerModal({ isOpen, onClose, title, description, confirmLabel, onConfirm }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedCampaignId("");
    setSubmitting(false);
    setLoading(true);
    setLoadError(null);
    getAllCampaigns({ status: "ACTIVE" })
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setCampaigns(list);
      })
      .catch((err) => setLoadError(err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!selectedCampaignId) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedCampaignId);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || "Select a Campaign"} width="480px" height="70vh">
      {description && <p className="text-[11.5px] text-slate-500 mb-3">{description}</p>}

      {loading ? (
        <div className="py-8 flex justify-center">
          <LoadingSpinner text="Loading active campaigns..." />
        </div>
      ) : loadError ? (
        <ErrorState
          title="Couldn't load campaigns"
          message="Something went wrong while loading active campaigns. Please try again."
        />
      ) : campaigns.length === 0 ? (
        <div className="text-center text-slate-400 text-[12.5px] py-10">No active campaigns available right now.</div>
      ) : (
        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {campaigns.map((c) => (
            <label
              key={c.id}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                selectedCampaignId === c.id ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="talent-pool-campaign-picker"
                className="mt-1 accent-indigo-600"
                checked={selectedCampaignId === c.id}
                onChange={() => setSelectedCampaignId(c.id)}
              />
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-slate-900 truncate">{c.name}</div>
                {c.jd_title && <div className="text-[11px] text-slate-400 truncate">{c.jd_title}</div>}
              </div>
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
        <Button variant="outline" size="small" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="small"
          onClick={handleConfirm}
          disabled={!selectedCampaignId || loading || campaigns.length === 0}
          loading={submitting}
          loadingText="Adding..."
        >
          {confirmLabel || "Add to Campaign"}
        </Button>
      </div>
    </Modal>
  );
}
