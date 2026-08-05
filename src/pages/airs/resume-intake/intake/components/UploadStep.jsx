import React, { useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, X, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import Button from "../../../../../components/Button/Button";
import { Input } from "../../../../../components/ui/input";
import Modal from "../../../../../components/ui/Modal";
import PipelineCandidateScorecardPage from "../../../pipeline/PipelineCandidateScorecardPage";
import { activeCampaigns, resumeUpload } from "../../../service/resumeIntake";
// import CountriesList from "../../../../../components/CountriesList";
import FilterListbox from "../../../../../components/filter/FilterListbox";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES } from "../constants/intakeConstants";

// Mirrors the backend's `Jurisdiction` enum (str, Enum):
//   GLOBAL = "GLOBAL", EU = "EU", US = "US", IN = "INDIA"
// The label shown to the user is just the descriptive name; the enum key
// (value below) is what actually gets sent to the backend.
const JURISDICTION_OPTIONS = [
  { label: "GLOBAL", value: "GLOBAL" },
  { label: "EUROPE", value: "EU" },
  { label: "UNITED STATES", value: "US" },
  { label: "INDIA", value: "IN" },
];

// FilterListbox always shows a selected option (it falls back to options[0]
// when the value doesn't match), so default to the backend's own default
// jurisdiction rather than an empty string that would look selected but isn't.
const EMPTY_FORM = { campaignId: "", candidateName: "", candidateEmail: "", candidatePhone: "", jurisdiction: JURISDICTION_OPTIONS[0].value };

function isAcceptedFile(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_FILE_TYPES.some((ext) => name.endsWith(ext));
}

// "use_existing" -> "Use Existing" — available_resolutions are backend enum
// values, not display copy.
function formatResolutionLabel(resolution) {
  return resolution
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function UploadStep({ onSubmit, bare = false }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignsError, setCampaignsError] = useState("");
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);

  // Set when the upload is rejected because this candidate already exists in
  // the campaign ({ candidateId, message } or null) — surfaces a "View
  // Candidate" action instead of just a dead-end error toast.
  const [duplicateCandidate, setDuplicateCandidate] = useState(null);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);

  // Set when the upload is rejected because an identical resume file already
  // exists ({ message, candidateName, campaignNames, availableResolutions }
  // or null) — surfaces the backend's available_resolutions as buttons
  // instead of a dead-end error toast.
  const [duplicateResume, setDuplicateResume] = useState(null);

  const isFormValid = Boolean(
    form.campaignId &&
    form.jurisdiction &&
    form.candidateName.trim() &&
    form.candidateEmail.trim() &&
    file &&
    consent
  );

  useEffect(() => {
    const loadCampaigns = async () => {
      setIsLoadingCampaigns(true);
      setCampaignsError("");
      try {
        const res = await activeCampaigns();
        setCampaigns(res?.data || []);
      } catch (err) {
        setCampaignsError("Failed to load campaigns.");
      } finally {
        setIsLoadingCampaigns(false);
      }
    };
    loadCampaigns();
  }, []);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleFile = (candidate) => {
    if (!candidate) return;
    if (!isAcceptedFile(candidate)) {
      setFileError(`"${candidate.name}" is not a supported format. Only PDF and DOCX files are accepted.`);
      setFile(null);
      return;
    }
    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`"${candidate.name}" is larger than the 15MB limit.`);
      setFile(null);
      return;
    }
    setFileError("");
    setFile(candidate);
  };

  const validate = () => {
    const next = {};
    if (!form.campaignId) next.campaignId = "Select a campaign.";
    if (!form.jurisdiction) next.jurisdiction = "Select a jurisdiction.";
    if (!form.candidateName.trim()) next.candidateName = "Candidate name is required.";
    if (!form.candidateEmail.trim()) next.candidateEmail = "Candidate email is required.";
    else if (!/^\S+@\S+\.\S+$/.test(form.candidateEmail)) next.candidateEmail = "Enter a valid email address.";
    if (!file) next.file = "Attach a PDF or DOCX resume.";
    if (!consent) next.consent = "Candidate consent must be confirmed before upload.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildFormData = () => {
    const formData = new FormData();
    formData.append("campaign_id", form.campaignId);
    formData.append("candidate_full_name", form.candidateName.trim());
    formData.append("candidate_email", form.candidateEmail.trim());
    if (form.candidatePhone.trim()) {
      formData.append("candidate_phone", form.candidatePhone.trim());
    }
    formData.append("jurisdiction", form.jurisdiction);
    formData.append("consent_confirmed", consent);
    formData.append("file", file);
    return formData;
  };

  const submitUpload = async (formData) => {
    const res = await resumeUpload(formData);
    toast.success(res?.message || "Resume uploaded successfully and queued for processing.");
    setDuplicateCandidate(null);
    setDuplicateResume(null);
    onSubmit({
      uploadResponse: res?.data,
      candidateName: form.candidateName.trim(),
      candidateEmail: form.candidateEmail.trim(),
      fileFormat: file.name.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setDuplicateCandidate(null);
    setDuplicateResume(null);
    setIsSubmitting(true);
    try {
      await submitUpload(buildFormData());
    } catch (err) {
      const responseBody = err?.response?.data;
      const conflictData = responseBody?.data;
      if (conflictData?.candidate_exists && conflictData?.candidate_id) {
        setDuplicateCandidate({
          candidateId: conflictData.candidate_id,
          message: responseBody?.message || "Candidate already exists in this campaign.",
        });
      } else if (conflictData?.duplicate_resume_id && Array.isArray(conflictData?.available_resolutions)) {
        setDuplicateResume({
          message: responseBody?.message || "An identical resume file already exists in the system.",
          candidateName: conflictData.candidate_name,
          campaignNames: conflictData.campaign_names || [],
          availableResolutions: conflictData.available_resolutions,
        });
      } else {
        toast.error(responseBody?.message || "Failed to upload resume. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveDuplicateResume = async (resolution) => {
    setIsSubmitting(true);
    try {
      const formData = buildFormData();
      formData.append("resolution", resolution);
      await submitUpload(formData);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to upload resume. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className={bare ? "" : "max-w-3xl"}>
      <div className={bare ? "" : "rounded-xl border border-slate-200 bg-white shadow-sm"}>
        {!bare && (
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-[15px] font-bold text-slate-900">New resume intake</h2>
            <p className="text-[12.5px] text-slate-500 mt-0.5">Upload a candidate resume to start automatic parsing and skill extraction.</p>
          </div>
        )}

        <div className={bare ? "space-y-5" : "p-6 space-y-5"}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Campaign <span className="text-red-500">*</span></label>
              <select
                value={form.campaignId}
                onChange={setField("campaignId")}
                disabled={isLoadingCampaigns}
                className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingCampaigns ? "Loading campaigns..." : "Select a campaign..."}
                </option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.campaignId && <p className="text-[11.5px] text-rose-600 mt-1">{errors.campaignId}</p>}
              {campaignsError && <p className="text-[11.5px] text-rose-600 mt-1">{campaignsError}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Jurisdiction <span className="text-red-500">*</span></label>
              {/* <CountriesList
                variant="intake"
                value={form.jurisdiction}
                onChange={(value) => setForm((prev) => ({ ...prev, jurisdiction: value }))}
                placeholder="Select jurisdiction..."
                error={errors.jurisdiction}
              /> */}
              <FilterListbox
                options={JURISDICTION_OPTIONS}
                value={form.jurisdiction}
                onChange={(value) => setForm((prev) => ({ ...prev, jurisdiction: value }))}
                buttonClassName={`w-full h-10 cursor-default rounded-md border bg-white py-2 pl-3 pr-10 text-left text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.jurisdiction ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-300"
                  }`}
              />
              {errors.jurisdiction && <p className="text-[11.5px] text-rose-600 mt-1">{errors.jurisdiction}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Candidate full name <span className="text-red-500">*</span></label>
              <Input value={form.candidateName} onChange={setField("candidateName")} placeholder="e.g. Ananya Rao" />
              {errors.candidateName && <p className="text-[11.5px] text-rose-600 mt-1">{errors.candidateName}</p>}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Candidate email <span className="text-red-500">*</span></label>
              <Input type="email" value={form.candidateEmail} onChange={setField("candidateEmail")} placeholder="candidate@example.com" />
              {errors.candidateEmail && <p className="text-[11.5px] text-rose-600 mt-1">{errors.candidateEmail}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">
                Candidate phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input value={form.candidatePhone} onChange={setField("candidatePhone")} placeholder="+1 555 000 1234" />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1.5">Resume file <span className="text-red-500">*</span></label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFile(e.dataTransfer?.files?.[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className="rounded-xl p-6 border-2 border-dashed text-center cursor-pointer transition-colors"
              style={{ borderColor: isDragging ? "#2563EB" : "#E6E9F0", background: isDragging ? "#DBEAFE" : "#F8FAFC" }}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {!file ? (
                <>
                  <UploadCloud size={22} className="text-blue-600 mx-auto mb-2" />
                  <div className="text-[13px] font-semibold text-slate-900">Drag & drop, or click to browse</div>
                  <div className="text-[11.5px] text-slate-500 mt-1">PDF or DOCX only, up to 15MB</div>
                </>
              ) : (
                <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-blue-600 shrink-0" />
                    <span className="text-[12.5px] font-medium text-slate-900 truncate">{file.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 shrink-0"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>
            {fileError && <p className="text-[11.5px] text-rose-600 mt-1.5">{fileError}</p>}
            {!fileError && errors.file && <p className="text-[11.5px] text-rose-600 mt-1.5">{errors.file}</p>}
          </div>

          <div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-[12.5px] text-slate-600">
                I confirm the candidate has consented to their resume being processed and stored, in line with our data handling policy. <span className="text-red-500">*</span>
              </span>
            </label>
            {errors.consent && <p className="text-[11.5px] text-rose-600 mt-1 ml-6.5">{errors.consent}</p>}
          </div>

          {duplicateCandidate && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-amber-800">{duplicateCandidate.message}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => setIsScorecardOpen(true)}
                className="!text-blue-600 hover:!text-blue-700 hover:bg-blue-50 text-xs shrink-0"
              >
                View Candidate <ArrowRight size={14} className="ml-1" />
              </Button>
            </div>
          )}

          {duplicateResume && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-[12.5px] text-amber-800">
                  <p>{duplicateResume.message}</p>
                  {duplicateResume.candidateName && (
                    <p className="mt-1 text-amber-700">
                      Matches <span className="font-semibold">{duplicateResume.candidateName}</span>
                      {duplicateResume.campaignNames.length > 0 && (
                        <> in {duplicateResume.campaignNames.join(", ")}</>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                {duplicateResume.availableResolutions.map((resolution) => (
                  <Button
                    key={resolution}
                    type="button"
                    variant={resolution === "upload_anyway" ? "secondary" : "primary"}
                    size="small"
                    disabled={isSubmitting}
                    onClick={() => handleResolveDuplicateResume(resolution)}
                  >
                    {formatResolutionLabel(resolution)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={bare ? "flex justify-end gap-2 pt-5 mt-1 border-t border-slate-100" : "px-6 py-4 border-t border-slate-100 flex justify-end gap-2"}>
          <Button
            type="submit"
            variant="primary"
            size="medium"
            disabled={!isFormValid || !!duplicateResume}
            loading={isSubmitting}
            loadingText="Submitting..."
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Submit for parsing
          </Button>
        </div>
      </div>
    </form>

    <Modal
      isOpen={isScorecardOpen}
      onClose={() => setIsScorecardOpen(false)}
      title="Candidate Scorecard"
      width="1100px"
    >
      {duplicateCandidate && (
        <PipelineCandidateScorecardPage
          candidateId={duplicateCandidate.candidateId}
          resumeRow={{
            candidate_full_name: form.candidateName.trim(),
            candidate_email: form.candidateEmail.trim(),
          }}
          onBack={() => setIsScorecardOpen(false)}
          variant="modal"
        />
      )}
    </Modal>
    </>
  );
}
