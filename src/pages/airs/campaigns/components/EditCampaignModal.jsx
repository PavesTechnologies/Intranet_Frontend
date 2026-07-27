import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, RotateCcw } from "lucide-react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/ui/Modal";
import FormInput from "../../../../components/forms/FormInput";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { updateCampaign, getWeightPresets, resetScoringConfig } from "../services/campaignservice";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

// ISO timestamp -> value usable by <input type="datetime-local"> (minute precision, local time)
const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Shared edit modal for S07-T01/T02/T03.
 * `detail` is a CampaignDetailResponse (campaign_info / scoring_configuration / pipeline_limits).
 * `existingNames` (optional): lowercase names of OTHER campaigns for the duplicate check.
 */
export default function EditCampaignModal({ isOpen, onClose, campaignId, detail, onSaved, existingNames = [] }) {
    const info = detail?.campaign_info || {};
    const scoring = detail?.scoring_configuration;
    const limits = detail?.pipeline_limits || {};
    const isActive = (info.status || "").toUpperCase() === "ACTIVE";

    const [form, setForm] = useState({});
    const [confirmScoring, setConfirmScoring] = useState(false);
    const [saving, setSaving] = useState(false);
    const [presets, setPresets] = useState([]);
    const [selectedPresetId, setSelectedPresetId] = useState("");
    const [resetting, setResetting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm({
            name: info.name || "",
            max_candidates: limits.max_candidates ?? "",
            deadline: toLocalInput(limits.deadline),
            weight_deterministic: scoring?.weight_deterministic ?? "",
            weight_semantic: scoring?.weight_semantic ?? "",
            weight_ai: scoring?.weight_ai ?? "",
            semantic_threshold: scoring?.semantic_threshold ?? "",
            ai_threshold: scoring?.ai_threshold ?? "",
        });
        setConfirmScoring(false);
        setSelectedPresetId("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, detail]);

    // E02-S03: presets only matter when scoring is editable at all
    useEffect(() => {
        if (!isOpen || !scoring) return;
        (async () => {
            try {
                const res = await getWeightPresets();
                setPresets(unwrap(res) || []);
            } catch {
                // Non-fatal — the picker just stays empty if presets can't load.
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen]);

    const applyPreset = (presetId) => {
        setSelectedPresetId(presetId);
        const preset = presets.find((p) => p.id === presetId);
        if (!preset) return;
        setForm((p) => ({
            ...p,
            weight_deterministic: preset.weight_deterministic,
            weight_semantic: preset.weight_semantic,
            weight_ai: preset.weight_ai,
            semantic_threshold: preset.semantic_threshold,
            ai_threshold: preset.ai_threshold,
        }));
    };

    const handleResetToDefaults = async () => {
        setResetting(true);
        try {
            await resetScoringConfig(campaignId);
            toast.success("Scoring configuration reset to platform defaults.");
            onSaved();
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to reset scoring configuration.");
        } finally {
            setResetting(false);
        }
    };

    const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    // S07-T02: scoring fields stay locked on an ACTIVE campaign until confirmed
    const scoringLocked = isActive && !confirmScoring;
    const currentCount = limits.current_candidate_count ?? 0;

    const handleSave = async () => {
        const name = (form.name || "").trim();
        if (!name) return toast.error("Campaign name cannot be empty.");
        // S07-T01: duplicate check excluding the current campaign
        if (existingNames.includes(name.toLowerCase())) {
            return toast.error(`A campaign named "${name}" already exists.`);
        }

        // S07-T01: can't drop the cap below the number of candidates already in
        const cap = form.max_candidates === "" ? null : Number(form.max_candidates);
        if (cap !== null && cap < currentCount) {
            return toast.error(`Max candidates (${cap}) cannot be below the current candidate count (${currentCount}).`);
        }

        // Build a PATCH payload containing ONLY the fields that actually changed —
        // avoids spurious audit entries and accidental clears of untouched fields.
        const payload = {};
        if (name !== (info.name || "")) payload.name = name;

        // max_candidates: the backend only clears it via an explicit
        // clear_max_candidates flag — sending max_candidates: null is a no-op
        // there (PATCH semantics: omitted vs null are indistinguishable).
        if (cap !== (limits.max_candidates ?? null)) {
            if (cap === null) {
                payload.clear_max_candidates = true;
            } else {
                payload.max_candidates = cap;
            }
        }

        // Compare at the minute precision the datetime-local input works in,
        // so an untouched deadline is never re-sent as a "change". Same
        // clear-flag requirement as above for actually removing it.
        if (form.deadline !== toLocalInput(limits.deadline)) {
            if (!form.deadline) {
                payload.clear_deadline = true;
            } else {
                payload.deadline = new Date(form.deadline).toISOString();
            }
        }

        const scoringChanged = scoring && (
            Number(form.weight_deterministic) !== Number(scoring.weight_deterministic) ||
            Number(form.weight_semantic) !== Number(scoring.weight_semantic) ||
            Number(form.weight_ai) !== Number(scoring.weight_ai) ||
            Number(form.semantic_threshold) !== Number(scoring.semantic_threshold) ||
            Number(form.ai_threshold) !== Number(scoring.ai_threshold)
        );

        if (scoringChanged) {
            const sum = Number(form.weight_deterministic) + Number(form.weight_semantic) + Number(form.weight_ai);
            if (Math.abs(sum - 100) > 0.01) return toast.error("Scoring weights must sum to 100.");
            Object.assign(payload, {
                weight_deterministic: Number(form.weight_deterministic),
                weight_semantic: Number(form.weight_semantic),
                weight_ai: Number(form.weight_ai),
                semantic_threshold: Number(form.semantic_threshold),
                ai_threshold: Number(form.ai_threshold),
                confirm_scoring_change: true,   // backend requires this on ACTIVE (S07-T02)
            });
        }

        if (Object.keys(payload).length === 0) {
            toast.info("No changes to save.");
            return;
        }

        setSaving(true);
        try {
            await updateCampaign(campaignId, payload);
            toast.success("Campaign updated successfully.");
            onSaved();
        } catch (err) {
            // 403 (closed) / 409 (cap conflict) messages come straight from the API
            toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to update campaign.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Edit Campaign Configuration" width="560px" height="90vh">
            <div className="space-y-4">
                <FormInput label="Campaign Name" name="name" value={form.name} onChange={change} maxLength={255} requiredMark />

                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Max Candidates" name="max_candidates" type="number" min="1" value={form.max_candidates} onChange={change} />
                    <FormInput label="Deadline" name="deadline" type="datetime-local" value={form.deadline} onChange={change} />
                </div>
                <p className="text-[10px] text-slate-400">Current candidate count: {currentCount}</p>

                {/* Scoring config is only editable when the backend sent it (HR_ADMIN) */}
                {scoring && (
                    <>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Scoring Configuration</span>
                            <Button
                                variant="link"
                                size="small"
                                onClick={handleResetToDefaults}
                                loading={resetting}
                                loadingText="Resetting..."
                                disabled={scoringLocked}
                            >
                                <RotateCcw className="h-3 w-3" /> Reset to Platform Defaults
                            </Button>
                        </div>

                        {presets.length > 0 && (
                            <div>
                                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                                    Apply a Preset
                                </label>
                                <FilterListbox
                                    options={[{ value: "", label: "Choose a preset..." }, ...presets.map((p) => ({ value: p.id, label: p.name }))]}
                                    value={selectedPresetId}
                                    onChange={applyPreset}
                                    disabled={scoringLocked}
                                />
                            </div>
                        )}

                        {/* S07-T02: warning + confirm gate on ACTIVE campaigns */}
                        {isActive && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <div className="flex gap-2 text-amber-700">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <p className="text-[11px] font-medium">
                                        Changing scoring configuration will only affect candidates submitted after this change.
                                        Existing candidate scores will not be recalculated.
                                    </p>
                                </div>
                                <label className="flex items-center gap-2 mt-2 text-[11px] font-semibold text-amber-800 cursor-pointer">
                                    <input type="checkbox" checked={confirmScoring} onChange={(e) => setConfirmScoring(e.target.checked)} />
                                    I understand — allow editing scoring configuration
                                </label>
                            </div>
                        )}

                        <div className="grid grid-cols-3 gap-4">
                            <FormInput label="Deterministic Wt" name="weight_deterministic" type="number" value={form.weight_deterministic} onChange={change} disabled={scoringLocked} />
                            <FormInput label="Semantic Wt" name="weight_semantic" type="number" value={form.weight_semantic} onChange={change} disabled={scoringLocked} />
                            <FormInput label="AI Wt" name="weight_ai" type="number" value={form.weight_ai} onChange={change} disabled={scoringLocked} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Semantic Threshold" name="semantic_threshold" type="number" step="0.01" value={form.semantic_threshold} onChange={change} disabled={scoringLocked} />
                            <FormInput label="AI Threshold" name="ai_threshold" type="number" value={form.ai_threshold} onChange={change} disabled={scoringLocked} />
                        </div>
                    </>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <Button variant="outline" size="small" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button variant="primary" size="small" onClick={handleSave} loading={saving} loadingText="Saving...">
                    Save Changes
                </Button>
            </div>
        </Modal>
    );
}
