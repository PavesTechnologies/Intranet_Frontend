import React, { useState, useEffect } from "react";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FilterListbox from "../../../../components/filter/FilterListbox";
import usePromptTemplateLookup from "../../prompt-templates/hooks/usePromptTemplateLookup";
import { getNameByRoles } from "../services/campaignservice";

export default function NewCampaignForm({
    title,
    jdOptions,          // optional: when provided, render a JD dropdown instead of the static title
    campaignForm,
    handleCampaignFormChange,
    setLinkCampaignModalOpen,
    isSubmittingCampaign,
    handleInitiateCampaign
}) {
    const [hiringManager, setHiringManager] = useState([]);
    const [recruiter, setRecruiter] = useState([]);
    const resumeParsePromptLookup = usePromptTemplateLookup("resume-parse");

    useEffect(() => {
        const fetchNamesByRoles = async () => {
            try {
                const resHiringManager = await getNameByRoles("HIRING_MANAGER");
                const resRecruiter = await getNameByRoles("RECRUITER");
                
                const hmData = Array.isArray(resHiringManager) ? resHiringManager : (resHiringManager?.data || []);
                const recData = Array.isArray(resRecruiter) ? resRecruiter : (resRecruiter?.data || []);

                setHiringManager(hmData);
                setRecruiter(recData);
            } catch (error) {
                console.error("Error fetching names by roles:", error);
            }
        };
        fetchNamesByRoles();
    }, []);

    const hiringManagerOptions = [
        { value: "", label: "Select Hiring Manager" },
        ...hiringManager.map((hm) => ({
            value: hm.user_id?.toString() || "",
            label: hm.employee_name || `ID: ${hm.user_id}`
        }))
    ];

    const recruiterOptions = [
        { value: "", label: "Select Recruiter" },
        ...recruiter.map((rec) => ({
            value: rec.user_id?.toString() || "",
            label: rec.employee_name || `ID: ${rec.user_id}`
        }))
    ];

    const resumeParsePromptOptions = [
        { value: "", label: resumeParsePromptLookup.isLoading ? "Loading prompt templates..." : "Select Resume Parsing Prompt" },
        ...resumeParsePromptLookup.options,
    ];

    return (
        <>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Job Description {jdOptions && <span className="text-red-500">*</span>}
                    </label>
                    {jdOptions ? (
                        <FilterListbox
                            options={jdOptions}
                            value={campaignForm.jd_id}
                            onChange={(value) => handleCampaignFormChange({ target: { name: "jd_id", value } })}
                        />
                    ) : (
                        <div className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-xs font-bold text-slate-700">
                            {title}
                        </div>
                    )}
                </div>

                <FormInput
                    label="Campaign Name"
                    name="name"
                    value={campaignForm.name}
                    onChange={handleCampaignFormChange}
                    placeholder="e.g. Q3 React Platform Lead Hiring"
                    maxLength={255}
                    requiredMark
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label="Max Candidates"
                        name="max_candidates"
                        type="number"
                        min="1"
                        value={campaignForm.max_candidates}
                        onChange={handleCampaignFormChange}
                    />
                    <FormInput
                        label="Deadline"
                        name="deadline"
                        type="datetime-local"
                        value={campaignForm.deadline}
                        onChange={handleCampaignFormChange}
                    />
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <FormInput
                        label="Deterministic Weight"
                        name="weight_deterministic"
                        type="number"
                        value={campaignForm.weight_deterministic}
                        onChange={handleCampaignFormChange}
                    />
                    <FormInput
                        label="Semantic Weight"
                        name="weight_semantic"
                        type="number"
                        value={campaignForm.weight_semantic}
                        onChange={handleCampaignFormChange}
                    />
                    <FormInput
                        label="AI Weight"
                        name="weight_ai"
                        type="number"
                        value={campaignForm.weight_ai}
                        onChange={handleCampaignFormChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormInput
                        label="Semantic Threshold"
                        name="semantic_threshold"
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={campaignForm.semantic_threshold}
                        onChange={handleCampaignFormChange}
                    />
                    <FormInput
                        label="AI Threshold"
                        name="ai_threshold"
                        type="number"
                        value={campaignForm.ai_threshold}
                        onChange={handleCampaignFormChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                            Hiring Manager <span className="text-red-500">*</span>
                        </label>
                        <FilterListbox
                            options={hiringManagerOptions}
                            value={campaignForm.hiring_manager_id}
                            onChange={(value) => handleCampaignFormChange({ target: { name: "hiring_manager_id", value } })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                            Recruiter <span className="text-red-500">*</span>
                        </label>
                        <FilterListbox
                            options={recruiterOptions}
                            value={campaignForm.recruiter_id}
                            onChange={(value) => handleCampaignFormChange({ target: { name: "recruiter_id", value } })}
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                        Resume Parsing Prompt <span className="text-red-500">*</span>
                    </label>
                    <FilterListbox
                        options={resumeParsePromptOptions}
                        value={campaignForm.prompt_template_id}
                        onChange={(value) => handleCampaignFormChange({ target: { name: "prompt_template_id", value } })}
                        disabled={resumeParsePromptLookup.isLoading}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                <Button
                    variant="outline"
                    size="small"
                    onClick={() => setLinkCampaignModalOpen(false)}
                    disabled={isSubmittingCampaign}
                >
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    size="small"
                    onClick={handleInitiateCampaign}
                    loading={isSubmittingCampaign}
                    loadingText="Initiating..."
                >
                    Initiate Campaign
                </Button>
            </div>
        </>
    )
}