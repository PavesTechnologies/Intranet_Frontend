import React, { useState } from "react";
import { toast } from "react-toastify";
import { UserPlus, Download } from "lucide-react";
import Button from "@/components/Button/Button";
import { getResumeDownloadUrl } from "../../../service/resumeIntake";
import { formatApiError } from "../../../campaigns/services/campaignservice";
import { addTalentPoolCandidateToCampaign } from "../../services/talentPoolService";
import CampaignPickerModal from "../../components/CampaignPickerModal";

// Add to Campaign only ever tells the backend WHICH campaign
// (CampaignPickerModal) — POST /talent-pool/candidates/{id}/campaigns/{id}.
// ResumeSelectionService picks the resume server-side; nothing here ever
// touches a resume_id for selection purposes. Download is real:
// GET /resumes/{resume_id}/download-url, then open the signed URL it
// returns (never a storage URL built here).
export default function ActionButtons({ candidateId, candidateName, resumeId, onAdded }) {
  const [downloading, setDownloading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleDownload = async () => {
    if (!resumeId) {
      toast.error("No resume file is available for this candidate.");
      return;
    }
    setDownloading(true);
    try {
      const response = await getResumeDownloadUrl(resumeId);
      const data = response?.data ?? response;
      const url = data?.download_url || data?.url || data?.signed_url;
      if (!url) throw new Error("No download URL returned by the server.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      toast.error(formatApiError(err, "Failed to get the resume download link."));
    } finally {
      setDownloading(false);
    }
  };

  const handleAddToCampaign = async (campaignId) => {
    try {
      await addTalentPoolCandidateToCampaign(candidateId, campaignId);
      toast.success(`${candidateName || "Candidate"} added to the campaign.`);
      setPickerOpen(false);
      onAdded?.();
    } catch (err) {
      toast.error(formatApiError(err, "Failed to add this candidate to the campaign."));
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      <Button variant="outline" size="small" onClick={() => setPickerOpen(true)}>
        <UserPlus className="h-4 w-4" /> Add To Campaign
      </Button>
      <Button variant="primary" size="small" loading={downloading} loadingText="Preparing..." onClick={handleDownload}>
        <Download className="h-4 w-4" /> Download Resume
      </Button>

      <CampaignPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add to Campaign"
        description={`Add ${candidateName || "this candidate"} to an active campaign.`}
        onConfirm={handleAddToCampaign}
      />
    </div>
  );
}
