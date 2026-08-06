import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, PauseCircle, PlayCircle, RotateCcw } from "lucide-react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/ui/Modal";
import FormInput from "../../../../components/forms/FormInput";
import FilterListbox from "../../../../components/filter/FilterListbox";
import usePromptTemplateLookup from "../../prompt-templates/hooks/usePromptTemplateLookup";
import {
    updateCampaign, getWeightPresets, resetScoringConfig,
    getPauseSummary, getResumeSummary, getClosureSummary, closeCampaign,
    formatApiError,
} from "../services/campaignservice";

const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

const LABEL_CLASS = "text-[10px] uppercase font-bold text-slate-400 block mb-1.5";

const CLOSURE_REASONS = [
    { value: "", label: "Select a closure reason" },
    { value: "POSITION_FILLED", label: "Position Filled" },
    { value: "BUDGET_FREEZE", label: "Budget Freeze" },
    { value: "ROLE_CANCELLED", label: "Role Cancelled" },
    { value: "INTAKE_COMPLETE", label: "Intake Complete" },
    { value: "OTHER", label: "Other" },
];

// ISO timestamp -> value usable by <input type="datetime-local"> (minute precision, local time)
const toLocalInput = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Shared edit modal for /T02/T03.
 * `detail` is a CampaignDetailResponse (campaign_info / scoring_configuration / pipeline_limits).
 * `existingNames` (optional): lowercase names of OTHER campaigns for the duplicate check.
 */
export default function EditCampaignModal({ isOpen, onClose, campaignId, detail, onSaved, existingNames = [] }) {
    const info = detail?.campaign_info || {};
    const scoring = detail?.scoring_configuration;
    const limits = detail?.pipeline_limits || {};
    const isActive = (info.status || "").toUpperCase() === "ACTIVE";

    const currentStatus = (info.status || "").toUpperCase();

    const [form, setForm] = useState({});
    const [confirmScoring, setConfirmScoring] = useState(false);
    const [saving, setSaving] = useState(false);
    const [presets, setPresets] = useState([]);
    const [selectedPresetId, setSelectedPresetId] = useState("");
    const [resetting, setResetting] = useState(false);
    // Status transition (replaces the old standalone Pause/Resume/Close buttons)
    const [targetStatus, setTargetStatus] = useState(currentStatus);
    const [closureReason, setClosureReason] = useState("");
    const [impact, setImpact] = useState(null);   // lazy-loaded transition impact summary
    const resumeParsePromptLookup = usePromptTemplateLookup("resume-parse");
    const aiEvaluatePromptLookup = usePromptTemplateLookup("ai-evaluate");

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
            deterministic_threshold: scoring?.deterministic_threshold ?? "",
            prompt_template_id: info.prompt_template_id || "",
            ai_evaluate_prompt_id: info.ai_evaluate_prompt_id || "",
        });
        setConfirmScoring(false);
        setSelectedPresetId("");
        setTargetStatus(currentStatus);
        setClosureReason("");
        setImpact(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, detail]);

    // The backend only allows ACTIVE ⇄ PAUSED via PATCH; CLOSED goes through
    // its own terminal endpoint. Closed campaigns never reach this modal.
    const statusOptions = [
        { value: "ACTIVE", label: "Active" },
        { value: "PAUSED", label: "Paused" },
        { value: "CLOSED", label: "Closed" },
    ];
    const statusChanged = targetStatus !== currentStatus;
    const closing = statusChanged && targetStatus === "CLOSED";

    const handleStatusChange = async (value) => {
        setTargetStatus(value);
        setImpact(null);
        if (value === currentStatus) return;
        // best-effort impact preview — the dropdown still works if it fails
        try {
            const res = value === "CLOSED"
                ? await getClosureSummary(campaignId)
                : value === "PAUSED"
                    ? await getPauseSummary(campaignId)
                    : await getResumeSummary(campaignId);
            setImpact(unwrap(res));
        } catch {
            setImpact(null);
        }
    };

    // presets only matter when scoring is editable at all
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
            deterministic_threshold: preset.deterministic_threshold,
        }));
    };

    const handleResetToDefaults = async () => {
        setResetting(true);
        try {
            await resetScoringConfig(campaignId);
            toast.success("Scoring configuration reset to platform defaults.");
            onSaved();
        } catch (err) {
            toast.error(formatApiError(err, "Failed to reset scoring configuration."));
        } finally {
            setResetting(false);
        }
    };

    const change = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    // scoring fields stay locked on an ACTIVE campaign until confirmed
    const scoringLocked = isActive && !confirmScoring;
    const currentCount = limits.current_candidate_count ?? 0;

    const handleSave = async () => {
        const name = (form.name || "").trim();
        if (!name) return toast.error("Campaign name cannot be empty.");
        // duplicate check excluding the current campaign
        if (existingNames.includes(name.toLowerCase())) {
            return toast.error(`A campaign named "${name}" already exists.`);
        }

        // every campaign carries a resume-parse prompt, so the prefilled
        // selection must not be cleared on the way out
        if (!String(form.prompt_template_id || "").trim()) {
            return toast.error("Please select a Resume Parsing Prompt.");
        }
        if (!String(form.ai_evaluate_prompt_id || "").trim()) {
            return toast.error("Please select an AI Evaluation Prompt.");
        }

        // can't drop the cap below the number of candidates already in
        const cap = form.max_candidates === "" ? null : Number(form.max_candidates);
        if (cap !== null && cap < currentCount) {
            return toast.error(`Max candidates (${cap}) cannot be below the current candidate count (${currentCount}).`);
        }

        // Build a PATCH payload containing ONLY the fields that actually changed —
        // avoids spurious audit entries and accidental clears of untouched fields.
        const payload = {};
        if (name !== (info.name || "")) payload.name = name;
        if (form.prompt_template_id !== (info.prompt_template_id || "")) payload.prompt_template_id = form.prompt_template_id;
        if (form.ai_evaluate_prompt_id !== (info.ai_evaluate_prompt_id || "")) payload.ai_evaluate_prompt_id = form.ai_evaluate_prompt_id;

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

        const scoringChanged = scoring && (Number(form.weight_deterministic) !== Number(scoring.weight_deterministic) ||
            Number(form.weight_semantic) !== Number(scoring.weight_semantic) ||
            Number(form.weight_ai) !== Number(scoring.weight_ai) ||
            Number(form.semantic_threshold) !== Number(scoring.semantic_threshold) ||
            Number(form.ai_threshold) !== Number(scoring.ai_threshold) ||
            Number(form.deterministic_threshold) !== Number(scoring.deterministic_threshold)
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
                deterministic_threshold: Number(form.deterministic_threshold),
                confirm_scoring_change: true,   // backend requires this on ACTIVE
            });
        }

        // Status transition: ACTIVE ⇄ PAUSED rides the same PATCH; CLOSED is a
        // separate terminal endpoint and requires a reason.
        if (closing && !closureReason) {
            return toast.error("Please select a closure reason.");
        }
        if (statusChanged && !closing) {
            payload.status = targetStatus;
        }

        if (Object.keys(payload).length === 0 && !closing) {
            toast.info("No changes to save.");
            return;
        }

        setSaving(true);
        try {
            // Apply field edits first — a closed campaign becomes read-only,
            // so any other changes must land before the terminal close call.
            if (Object.keys(payload).length > 0) {
                await updateCampaign(campaignId, payload);
            }
            if (closing) {
                await closeCampaign(campaignId, closureReason);
                toast.success("Campaign closed successfully.");
            } else {
                toast.success("Campaign updated successfully.");
            }
            onSaved();
        } catch (err) {
            // 403 (closed) / 409 (cap conflict) messages come straight from the API
            toast.error(formatApiError(err, "Failed to update campaign."));
        } finally {
            setSaving(false);
        }
    };

    return (<Modal isOpen={isOpen} onClose={onClose} title="Edit Campaign Configuration" width="640px" height="90vh">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Campaign Name" name="name" value={form.name} onChange={change} maxLength={255} requiredMark labelClassName={LABEL_CLASS} />

                    {/* Status transition — pause/resume/close live here, not as header buttons */}
                    <div>
                        <label className={LABEL_CLASS}>Status</label>
                        <FilterListbox options={statusOptions} value={targetStatus} onChange={handleStatusChange} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={LABEL_CLASS}>
                            Resume Parsing Prompt <span className="text-red-500">*</span>
                        </label>
                        <FilterListbox
                            options={[
                                { value: "", label: resumeParsePromptLookup.isLoading ? "Loading prompt templates..." : "Select Resume Parsing Prompt" },
                                ...resumeParsePromptLookup.options,
                            ]}
                            value={form.prompt_template_id}
                            onChange={(value) => setForm((p) => ({ ...p, prompt_template_id: value }))}
                            disabled={resumeParsePromptLookup.isLoading}
                        />
                    </div>

                    <div>
                        <label className={LABEL_CLASS}>
                            AI Evaluation Prompt <span className="text-red-500">*</span>
                        </label>
                        <FilterListbox
                            options={[
                                { value: "", label: aiEvaluatePromptLookup.isLoading ? "Loading prompt templates..." : "Select AI Evaluation Prompt" },
                                ...aiEvaluatePromptLookup.options,
                            ]}
                            value={form.ai_evaluate_prompt_id}
                            onChange={(value) => setForm((p) => ({ ...p, ai_evaluate_prompt_id: value }))}
                            disabled={aiEvaluatePromptLookup.isLoading}
                        />
                    </div>
                </div>

                {statusChanged && targetStatus === "PAUSED" && (<div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                        <PauseCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <p className="text-[11.5px] text-amber-700">
                            Pausing stops new uploads and suspends queued processing until resumed.
                            {impact && ` Currently ${impact.queued_task_count ?? 0} queued task(s) and ${impact.processing_bulk_job_count ?? 0} bulk job(s) in flight.`}
                        </p>
                    </div>
                )}

                {statusChanged && targetStatus === "ACTIVE" && (<div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                        <PlayCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <p className="text-[11.5px] text-emerald-700">
                            Resuming re-queues suspended tasks and re-enables uploads.
                            {impact && ` ${impact.paused_task_count ?? 0} paused task(s) will be re-queued.`}
                        </p>
                    </div>
                )}

                {closing && (<div className="space-y-3 p-3 rounded-xl bg-rose-50 border border-rose-100">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
                            <p className="text-[11.5px] text-rose-700">
                                Closing permanently concludes this campaign — new uploads stop and queued
                                processing is cancelled. Reopening is a separate action afterwards.
                                {impact && ` ${impact.candidate_count ?? 0} candidate(s), ${impact.in_progress_task_count ?? 0} in-progress task(s), ${impact.pending_human_decision_count ?? 0} pending human decision(s).`}
                            </p>
                        </div>
                        <div>
                            <label className="text-[10px] uppercase font-bold text-rose-400 block mb-1.5">
                                Closure Reason <span className="text-rose-600">*</span>
                            </label>
                            <FilterListbox options={CLOSURE_REASONS} value={closureReason} onChange={setClosureReason} />
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Max Candidates" name="max_candidates" type="number" min="1" value={form.max_candidates} onChange={change} labelClassName={LABEL_CLASS} />
                    <FormInput label="Deadline" name="deadline" type="datetime-local" value={form.deadline} onChange={change} labelClassName={LABEL_CLASS} />
                </div>
                <p className="text-[10px] text-slate-400">Current candidate count: {currentCount}</p>

                {/* Scoring config is only editable when the backend sent it (HR_ADMIN) */}
                {scoring && (<>
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

                        {presets.length > 0 && (<div>
                                <label className={LABEL_CLASS}>
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

                        {/* warning + confirm gate on ACTIVE campaigns */}
                        {isActive && (<div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormInput label="Deterministic Wt" name="weight_deterministic" type="number" value={form.weight_deterministic} onChange={change} disabled={scoringLocked} labelClassName={LABEL_CLASS} />
                            <FormInput label="Deterministic Threshold" name="deterministic_threshold" type="number" value={form.deterministic_threshold} onChange={change} disabled={scoringLocked} labelClassName={LABEL_CLASS} />
                            <FormInput label="Semantic Wt" name="weight_semantic" type="number" value={form.weight_semantic} onChange={change} disabled={scoringLocked} labelClassName={LABEL_CLASS} />
                            <FormInput label="Semantic Threshold" name="semantic_threshold" type="number" step="0.01" value={form.semantic_threshold} onChange={change} disabled={scoringLocked} labelClassName={LABEL_CLASS} />
                            <FormInput label="AI Wt" name="weight_ai" type="number" value={form.weight_ai} onChange={change} disabled={scoringLocked} labelClassName={LABEL_CLASS} />
                            <FormInput label="AI Threshold" name="ai_threshold" type="number" value={form.ai_threshold} onChange={change} disabled={scoringLocked} labelClassName={LABEL_CLASS} />
                        </div>
                    </>
                )}
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <Button variant="outline" size="small" onClick={onClose} disabled={saving}>Cancel</Button>
                <Button
                    variant={closing ? "danger" : "primary"}
                    size="small"
                    onClick={handleSave}
                    loading={saving}
                    loadingText="Saving..."
                >
                    {closing ? "Save & Close Campaign" : "Save Changes"}
                </Button>
            </div>
        </Modal>
    );
}
