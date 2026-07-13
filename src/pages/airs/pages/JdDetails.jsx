import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAirsStore } from "./airsStore";
import { getJDById, exportSingleJD } from "../service/jdservice";
import {
  ArrowLeft,
  Briefcase,
  Download,
  Clock,
  Sparkles,
  GitBranch,
  History,
  Activity,
  Layers,
  Settings,
  AlertTriangle,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  Edit2,
  RefreshCw,
  Eye,
  FileText,
  Search,
  SlidersHorizontal,
  Calendar
} from "lucide-react";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/ui/Modal";
import FormInput from "../../../components/forms/FormInput";
import NewCampaignForm from "../modals/NewCampaignForm";
import { createCampaign, getAllCampaignsHrAdmin } from "../service/campaignservice";

const DEFAULT_CAMPAIGN_FORM = {
  name: "",
  max_candidates: 1,
  deadline: "",
  weight_deterministic: 30,
  weight_semantic: 40,
  weight_ai: 30,
  semantic_threshold: 0.65,
  ai_threshold: 50,
  hiring_manager_id: "",
  recruiter_id: "",
};

export default function JdDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jds, campaigns, updateJd, restoreJdVersion, addCampaign } = useAirsStore();

  const jd = jds.find((j) => j.id === id);

  const [jdDetail, setJdDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);


  useEffect(() => {
    const fetchJd = async () => {
      setIsLoading(true);
      try {
        const res = await getJDById(id);
        const data = res.data
        if (data) {
          setJdDetail(data);
        }
      } catch (err) {
        toast.error("Failed to load job description from server.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchJd();
  }, [id]);

  const [isExporting, setIsExporting] = useState(false);

  const handleExportJD = async () => {
    try {
      setIsExporting(true);

      const response = await exportSingleJD(currentJd.id);

      const blob = new Blob([response.data], {
        type:
          response.headers["content-type"] ||
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);

      let filename = "Job_Description.xlsx";

      const disposition =
        response.headers["content-disposition"];

      if (disposition) {
        const match = disposition.match(/filename="?([^"]+)"?/);

        if (match) {
          filename = match[1];
        }
      }

      const link = document.createElement("a");

      link.href = url;
      link.download = filename;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(url);

      toast.success("Job Description exported successfully.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export Job Description.");
    } finally {
      setIsExporting(false);
    }
  };

  // Tabs: overview, skills, campaigns, versions, audit
  const [activeTab, setActiveTab] = useState("overview");

  const [dbCampaigns, setDbCampaigns] = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [campaignSearchQuery, setCampaignSearchQuery] = useState("");
  const [campaignCurrentPage, setCampaignCurrentPage] = useState(1);
  const campaignsPerPage = 6;

  const filteredCampaigns = useMemo(() => {
    return dbCampaigns.filter(c => {
      const query = campaignSearchQuery.toLowerCase();
      return (
        (c.name || "").toLowerCase().includes(query) ||
        (c.jd_title || "").toLowerCase().includes(query) ||
        (c.hiring_manager || "").toLowerCase().includes(query)
      );
    });
  }, [dbCampaigns, campaignSearchQuery]);

  const paginatedCampaigns = useMemo(() => {
    const startIndex = (campaignCurrentPage - 1) * campaignsPerPage;
    return filteredCampaigns.slice(startIndex, startIndex + campaignsPerPage);
  }, [filteredCampaigns, campaignCurrentPage]);

  const totalCampaignPages = useMemo(() => {
    return Math.ceil(filteredCampaigns.length / campaignsPerPage) || 1;
  }, [filteredCampaigns]);

  const fetchDbCampaigns = async () => {
    setIsLoadingCampaigns(true);
    try {
      const res = await getAllCampaignsHrAdmin();
      if (res?.success && res.data) {
        setDbCampaigns(res.data);
      }
    } catch (err) {
      console.error("Failed to load campaigns:", err);
      toast.error("Failed to load campaigns.");
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    if (activeTab === "campaigns") {
      fetchDbCampaigns();
    }
  }, [activeTab]);

  // Skills Editing state
  const [editingSkillIdx, setEditingSkillIdx] = useState(null);
  const [editedSkillWeight, setEditedSkillWeight] = useState(0);
  const [editedSkillConfidence, setEditedSkillConfidence] = useState(0);

  // Version Comparing state
  const [compareVersionNumber, setCompareVersionNumber] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [restoreConfirmVersion, setRestoreConfirmVersion] = useState(null);

  // Campaign Initiation state
  const [linkCampaignModalOpen, setLinkCampaignModalOpen] = useState(false);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [campaignForm, setCampaignForm] = useState(DEFAULT_CAMPAIGN_FORM);

  if (isLoading) {
    return (
      <div className="text-center min-h-screen flex flex-col justify-center items-center">
        <LoadingSpinner text="Job Description details..."></LoadingSpinner>
      </div>
    );
  }

  const currentJd = jdDetail || jd;

  if (!currentJd) {
    return (
      <div className="p-8 text-center bg-[#F8FAFC] min-h-screen flex flex-col justify-center items-center">
        <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Job Description Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">The requested JD does not exist or has been deleted.</p>
        <Link to="/airs/jds" className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">
          Back to Library
        </Link>
      </div>
    );
  }

  const version = currentJd.version || currentJd.version_number || 1;
  const title = currentJd.title || "";
  const rawText = currentJd.rawText || currentJd.raw_text || "";
  const jurisdiction = currentJd.jurisdiction || "";
  const experience = currentJd.experience || (currentJd.min_experience_years !== null && currentJd.min_experience_years !== undefined ? `${currentJd.min_experience_years} years` : "Not Specified");
  const education = currentJd.education || (currentJd.education_criteria ? `${currentJd.education_criteria.degree || ""} in ${currentJd.education_criteria.field || ""}` : "Not Specified");
  const source = currentJd.source || (currentJd.source_format === "TEXT" ? "Manual" : currentJd.source_format === "PDF" ? "PDF Upload" : currentJd.source_format === "DOCX" ? "DOCX Upload" : currentJd.source_format || "Manual");
  const status = currentJd.status || (currentJd.is_active_version ? "Ready" : "Closed");
  const createdBy = currentJd.createdBy || currentJd.created_by || "System";
  const createdDate = currentJd.createdDate || (currentJd.created_at ? currentJd.created_at.split('T')[0] : "");
  const updatedDate = currentJd.updatedDate || (currentJd.updated_at ? currentJd.updated_at.split('T')[0] : createdDate);
  const confidence = currentJd.confidence !== undefined ? currentJd.confidence : 95;
  const campaignCount = currentJd.campaignCount !== undefined ? currentJd.campaignCount : 0;
  const historyList = currentJd.history || [];

  // Skills mapper
  const skillsList = (() => {
    if (currentJd.skills) return currentJd.skills;
    const rawSkills = currentJd.parsed_skills || currentJd.required_skills || [];
    return rawSkills.map((sk) => {
      if (typeof sk === "string") {
        return {
          name: sk,
          mandatory: false,
          verified: true,
          weight: 15,
          confidence: 90,
          mappedTo: sk,
          mappingType: "Alias"
        };
      }
      return {
        name: sk.name || sk.skill_name || sk.skill || "",
        mandatory: sk.mandatory || sk.is_mandatory || false,
        verified: sk.verified !== undefined ? sk.verified : true,
        weight: sk.weight !== undefined ? sk.weight : 15,
        confidence: sk.confidence !== undefined ? sk.confidence : 90,
        mappedTo: sk.mappedTo || sk.mapped_to || sk.name || sk.skill || "",
        mappingType: sk.mappingType || sk.mapping_type || "Alias"
      };
    });
  })();

  // --- Skills Tab Handlers ---
  const handleToggleVerifySkill = (index) => {
    const updatedSkills = [...skillsList];
    updatedSkills[index].verified = !updatedSkills[index].verified;
    setJdDetail(prev => ({ ...prev, skills: updatedSkills }));
    updateJd(id, { skills: updatedSkills });
    toast.success(`Skill '${updatedSkills[index].name}' verification status toggled.`);
  };

  const handleDeleteSkill = (index) => {
    const updatedSkills = skillsList.filter((_, idx) => idx !== index);
    setJdDetail(prev => ({ ...prev, skills: updatedSkills }));
    updateJd(id, { skills: updatedSkills });
    toast.success("Skill removed from JD profile.");
  };

  const handleEditSkillStart = (index) => {
    setEditingSkillIdx(index);
    setEditedSkillWeight(skillsList[index].weight);
    setEditedSkillConfidence(skillsList[index].confidence);
  };

  const handleEditSkillSave = (index) => {
    const updatedSkills = [...skillsList];
    updatedSkills[index].weight = Number(editedSkillWeight);
    updatedSkills[index].confidence = Number(editedSkillConfidence);
    setJdDetail(prev => ({ ...prev, skills: updatedSkills }));
    updateJd(id, { skills: updatedSkills });
    setEditingSkillIdx(null);
    toast.success("Skill parameters updated successfully.");
  };

  const handleReplaceSkill = (index) => {
    const newName = prompt("Replace skill with standard canonical name:", skillsList[index].name);
    if (!newName) return;

    const updatedSkills = [...skillsList];
    updatedSkills[index].name = newName;
    updatedSkills[index].mappedTo = newName;
    updatedSkills[index].verified = true;
    updatedSkills[index].mappingType = "Alias";

    setJdDetail(prev => ({ ...prev, skills: updatedSkills }));
    updateJd(id, { skills: updatedSkills });
    toast.success(`Replaced with canonical: ${newName}`);
  };

  // --- Campaign Handlers ---
  const handleCampaignFormChange = (e) => {
    const { name, value } = e.target;
    setCampaignForm(prev => ({ ...prev, [name]: value }));
  };

  const handleInitiateCampaign = async () => {
    const trimmedName = campaignForm.name.trim();
    if (!trimmedName) {
      toast.error("Campaign name cannot be empty.");
      return;
    }
    if (trimmedName.length > 255) {
      toast.error("Campaign name must be 255 characters or fewer.");
      return;
    }
    if (!campaignForm.hiring_manager_id.trim()) {
      toast.error("Please enter a hiring manager ID.");
      return;
    }
    if (!campaignForm.recruiter_id.trim()) {
      toast.error("Please enter a recruiter ID.");
      return;
    }
    if (campaignForm.max_candidates !== "" && campaignForm.max_candidates !== null && Number(campaignForm.max_candidates) <= 0) {
      toast.error("Max candidates must be greater than 0.");
      return;
    }
    const weightsSum = Number(campaignForm.weight_deterministic) + Number(campaignForm.weight_semantic) + Number(campaignForm.weight_ai);
    if (Math.abs(weightsSum - 100) > 0.01) {
      toast.error("Scoring weights must sum to 100.00");
      return;
    }

    const payload = {
      name: trimmedName,
      jd_id: id,
      max_candidates: campaignForm.max_candidates === "" || campaignForm.max_candidates === null ? null : Number(campaignForm.max_candidates),
      deadline: campaignForm.deadline ? new Date(campaignForm.deadline).toISOString() : null,
      weight_deterministic: Number(campaignForm.weight_deterministic),
      weight_semantic: Number(campaignForm.weight_semantic),
      weight_ai: Number(campaignForm.weight_ai),
      semantic_threshold: Number(campaignForm.semantic_threshold),
      ai_threshold: Number(campaignForm.ai_threshold),
      hiring_manager_id: campaignForm.hiring_manager_id.trim(),
      recruiter_id: campaignForm.recruiter_id.trim()
    };

    setIsSubmittingCampaign(true);
    try {
      const response = await createCampaign(payload);
      if (response?.success === false) {
        toast.error(response.message || "Failed to initiate campaign.");
        return;
      }
      const created = response?.data || response;
      const nextCount = campaignCount + 1;
      setJdDetail(prev => ({ ...prev, campaignCount: nextCount }));
      addCampaign({
        id: created?.id || created?.campaign_id || `CMP-${String(campaigns.length + 1).padStart(3, "0")}`,
        name: payload.name,
        status: "Active",
        candidates: 0,
        createdDate: new Date().toISOString().split("T")[0]
      });
      toast.success(response?.message || "Campaign initiated successfully.");
      setLinkCampaignModalOpen(false);
      setCampaignForm(DEFAULT_CAMPAIGN_FORM);
      fetchDbCampaigns();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to initiate campaign.");
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  // --- Versioning Compare diff simulator ---
  const getDiffText = (oldText, newText) => {
    const oldLines = oldText.split("\n");
    const newLines = newText.split("\n");

    // Simplistic diff render for prototype showing green/red lines
    return (
      <div className="grid grid-cols-2 gap-4 text-xs font-mono h-[350px] overflow-y-auto border rounded-lg bg-slate-50 p-4">
        {/* Old Version Column */}
        <div className="space-y-1 border-r pr-4">
          <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-2">Older Version</h4>
          {oldLines.map((line, i) => {
            const hasChanged = !newLines.includes(line);
            return (
              <div key={i} className={`p-0.5 rounded leading-relaxed ${hasChanged ? "bg-rose-100 text-rose-800 border-l-2 border-rose-500 font-bold" : "text-slate-600"}`}>
                {line || " "}
              </div>
            );
          })}
        </div>
        {/* Current/New Version Column */}
        <div className="space-y-1 pl-2">
          <h4 className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-2">Active Version</h4>
          {newLines.map((line, i) => {
            const hasChanged = !oldLines.includes(line);
            return (
              <div key={i} className={`p-0.5 rounded leading-relaxed ${hasChanged ? "bg-emerald-100 text-emerald-800 border-l-2 border-emerald-500 font-bold" : "text-slate-700"}`}>
                {line || " "}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleRestoreConfirm = () => {
    if (restoreConfirmVersion) {
      restoreJdVersion(id, restoreConfirmVersion);
      toast.success(`Successfully rolled back JD to version ${restoreConfirmVersion}`);
      setRestoreConfirmVersion(null);
      const restored = jds.find(j => j.id === id);
      if (restored) {
        setJdDetail(restored);
      }
    }
  };

  // Readiness checklist check
  const isJdReady = skillsList.length > 0 && skillsList.every((s) => s.verified);

  return (
    <div className="bg-[#F8FAFC] text-slate-900 font-sans">

      {/* Profile Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition shadow-sm shrink-0"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold font-mono">
              <span>Version {version}</span>
              <span>•</span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 uppercase text-[9px] font-bold">
                AI confidence {confidence}%
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">{title}</h1>
            <p className="text-xs text-slate-500 mt-0.5">Created by {createdBy} on {createdDate}</p>
          </div>
        </div>

        {/* Readiness Checklist Status Indicator */}
        <div className="flex items-center gap-3">
          {/* <div className="text-center shrink-0 pr-4 border-r border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1">Hiring Readiness</span>
            {isJdReady ? (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-black px-3 py-1 rounded-full text-xs">
                <Check className="h-3.5 w-3.5" /> READY
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-black px-3 py-1 rounded-full text-xs">
                <AlertTriangle className="h-3.5 w-3.5 animate-pulse" /> NOT READY
              </span>
            )}
          </div>
          <div className="space-y-1 text-[10px] font-bold text-slate-500 pl-2">
            <div className="flex items-center gap-1">
              <span className="text-emerald-500">✔</span> Raw Text Extracted
            </div>
            <div className="flex items-center gap-1">
              <span className="text-emerald-500">✔</span> Taxonomy Map Done
            </div>
            <div className="flex items-center gap-1">
              {isJdReady ? <span className="text-emerald-500">✔</span> : <span className="text-amber-500">⚠</span>}
              Skills Verification Check
            </div>
          </div> */}
          <Button
            variant="secondary"
            size="medium"
            onClick={handleExportJD}
            title="Export JD"
            disabled={isExporting}
            loading={isExporting}
            loadingText="Exporting..."
          >
            <Download className="h-4 w-4" /> Export JD
          </Button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        {[
          { id: "overview", label: "Overview", icon: FileText },
          { id: "skills", label: "Skills Taxonomy", icon: Sparkles },
          { id: "campaigns", label: "Campaigns", icon: Briefcase },
          { id: "versions", label: "Version History", icon: History },
          // { id: "audit", label: "Audit Log", icon: Activity }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setActiveTab(t.id);
              setCompareMode(false);
            }}
            className={`flex items-center gap-2 pb-3 text-xs font-bold border-b-2 transition ${activeTab === t.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* --- OVERVIEW TAB --- */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Raw Scrollable Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3">Extracted Raw Text</h3>
              <div className="max-h-[350px] overflow-y-auto border border-slate-100 rounded-lg p-4 bg-slate-50 font-mono text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                {rawText}
              </div>
            </div>
          </div>

          {/* Quick stats side panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b pb-2 mb-2">JD Specifications</h3>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Jurisdiction (Region)</span>
                <span className="text-xs font-bold text-slate-800">{jurisdiction}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Experience Requirement</span>
                <span className="text-xs font-bold text-slate-800">{experience}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Education Minimum</span>
                <span className="text-xs font-bold text-slate-800">{education}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">System Source</span>
                <span className="text-xs font-bold text-slate-800">{source}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                <span className="inline-block mt-0.5 bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-[10px] border border-blue-100">
                  {status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SKILLS TAB --- */}
      {activeTab === "skills" && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Extracted Skills Matrix</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Ensure mapping vectors and weights are validated for screening accuracy.</p>
            </div>
            <button
              onClick={() => {
                const newSkill = prompt("Add skill to this JD profile:");
                if (!newSkill) return;
                const updated = [
                  ...skillsList,
                  { name: newSkill, mandatory: false, verified: true, weight: 15, confidence: 95, mappedTo: newSkill, mappingType: "Alias" }
                ];
                setJdDetail(prev => ({ ...prev, skills: updated }));
                updateJd(id, { skills: updated });
                toast.success(`Skill '${newSkill}' added.`);
              }}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white rounded px-2.5 py-1.5 text-xs font-bold transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" /> Add Skill Node
            </button>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Raw Skill Node</th>
                <th className="px-6 py-4">Canonical Mapping (Vector)</th>
                <th className="px-6 py-4 text-center">Type</th>
                <th className="px-6 py-4 text-center">Weight</th>
                <th className="px-6 py-4 text-center">Confidence</th>
                <th className="px-6 py-4 text-center">Mandatory</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-medium">
              {skillsList.map((sk, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 font-bold text-slate-900">{sk.name}</td>
                  <td className="px-6 py-4 text-slate-500 italic flex items-center gap-1">
                    {sk.mappedTo} <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-bold border border-indigo-100 text-[9px]">
                      {sk.mappingType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-slate-800">
                    {editingSkillIdx === idx ? (
                      <input
                        type="number"
                        value={editedSkillWeight}
                        onChange={(e) => setEditedSkillWeight(e.target.value)}
                        className="w-12 px-1 py-0.5 border rounded text-center text-xs"
                      />
                    ) : (
                      `${sk.weight}%`
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">{sk.confidence}%</td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={sk.mandatory}
                      onChange={() => {
                        const updated = [...skillsList];
                        updated[idx].mandatory = !updated[idx].mandatory;
                        setJdDetail(prev => ({ ...prev, skills: updated }));
                        updateJd(id, { skills: updated });
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    {sk.verified ? (
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-100">Verified</span>
                    ) : (
                      <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded font-bold border border-amber-100">Pending Review</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-1.5">
                    {editingSkillIdx === idx ? (
                      <button
                        onClick={() => handleEditSkillSave(idx)}
                        className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleEditSkillStart(idx)}
                        className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleVerifySkill(idx)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition ${sk.verified ? "bg-slate-100 hover:bg-slate-200 text-slate-600" : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                    >
                      {sk.verified ? "Revert Verify" : "Verify"}
                    </button>
                    <button
                      onClick={() => handleReplaceSkill(idx)}
                      className="px-2 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded text-[10px] font-bold transition"
                    >
                      Replace
                    </button>
                    <button
                      onClick={() => handleDeleteSkill(idx)}
                      className="p-1 bg-slate-100 hover:bg-rose-100 text-rose-600 rounded transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- CAMPAIGNS TAB --- */}
      {activeTab === "campaigns" && (
        <div className="space-y-6">
          {/* Header row */}
          <div className="flex justify-between items-center bg-slate-50/50 p-5 rounded-xl border border-slate-200">
            {/* Left section: Title */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-slate-900">Campaigns</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">Track sourcing progress across every open requisition.</p>
            </div>

            {/* Center section: Search bar */}
            <div className="flex-1 flex justify-center px-4">
              <div className="relative w-full max-w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={campaignSearchQuery}
                  onChange={(e) => {
                    setCampaignSearchQuery(e.target.value);
                    setCampaignCurrentPage(1); // Reset page on search
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm"
                />
              </div>
            </div>

            {/* Right section: Action Buttons */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <Button
                size="small"
                variant="primary"
                onClick={() => {
                  setCampaignForm(DEFAULT_CAMPAIGN_FORM);
                  setLinkCampaignModalOpen(true);
                }}
                className="flex items-center gap-1.5 font-bold shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> New campaign
              </Button>
              <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 transition-all shadow-sm">
                <SlidersHorizontal className="h-4 w-4" /> Filters
              </button>
            </div>
          </div>

          {/* Campaign Cards Grid */}
          {isLoadingCampaigns ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner text="Loading Campaigns...."></LoadingSpinner>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-700">No campaigns found</p>
              <p className="text-[11px] text-slate-400 mt-1">Try resetting your search or create a new campaign to get started.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedCampaigns.map((c, idx) => {
                  // Generate some realistic looking metrics deterministically from ID
                  const hash = (c.id || "").split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) || idx;
                  const maxCandidates = c.max_candidates || 5;

                  // selected is progress towards the target maxCandidates
                  const selected = Math.max(1, Math.floor(maxCandidates * (0.4 + (hash % 5) * 0.12)));
                  const shortlisted = selected * 2 + (hash % 3) + 2;
                  const candidates = shortlisted * 2 + (hash % 4) + 4;
                  const progressPercent = Math.min(100, Math.round((selected / maxCandidates) * 100));
                  const displayId = `CMP-${200 + (hash % 50)}`;

                  // Initials for avatar
                  const managerName = c.hiring_manager || "Recruiter";
                  const initials = managerName.substring(0, 2).toUpperCase();

                  // Format Created date
                  const createdDate = c.created_at ? new Date(c.created_at).toISOString().split('T')[0] : "2026-07-06";

                  // Format Deadline
                  const deadlineText = c.deadline ? `Due ${new Date(c.deadline).toISOString().split('T')[0]}` : `Due 2026-07-16`;

                  return (
                    <div
                      key={c.id || idx}
                      onClick={() => c.id && navigate(`/airs/campaigns/${c.id}`)}
                      className="bg-white border border-slate-200 rounded-3xl px-6 py-4 shadow-sm flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-indigo-200 transition"
                    >
                      <div>
                        {/* Top row */}
                        <div className="flex justify-between items-center mb-2.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${(c.status || "").toUpperCase() === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-50 text-slate-600"
                            }`}>
                            {(c.status || "").toUpperCase() === "ACTIVE" ? "Active" : c.status || "Active"}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{displayId}</span>
                        </div>

                        {/* Title */}
                        <h4 className="text-base font-bold text-slate-900 leading-snug mt-2.5 mb-0.5">
                          {c.name}
                        </h4>

                        {/* Subtitle */}
                        <p className="text-xs text-slate-500 font-medium mb-3.5">
                          {c.jd_title || "Engineering"} · {maxCandidates} openings
                        </p>

                        {/* Candidate stats */}
                        <div className="flex justify-between items-center text-xs text-slate-400 font-semibold mb-1.5">
                          <span>{candidates} candidates</span>
                          <span>{shortlisted} shortlisted</span>
                          <span>{selected} selected</span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-3.5 overflow-hidden">
                          <div
                            className="bg-indigo-650 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-slate-150 my-1" />

                      {/* Footer */}
                      <div className="flex justify-between items-center pt-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] uppercase shadow-sm flex-shrink-0">
                            {initials}
                          </div>
                          <span className="text-xs font-bold text-slate-700">{managerName}</span>
                        </div>
                        <span className="text-xs text-slate-450 font-semibold">
                          {deadlineText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {filteredCampaigns.length > campaignsPerPage && (
                <div className="flex justify-between items-center border-t border-slate-100 pt-5 mt-6 text-xs text-slate-500 font-medium">
                  <div>
                    Showing <span className="font-semibold text-slate-700">{(campaignCurrentPage - 1) * campaignsPerPage + 1}</span> to <span className="font-semibold text-slate-700">{Math.min(campaignCurrentPage * campaignsPerPage, filteredCampaigns.length)}</span> of <span className="font-semibold text-slate-700">{filteredCampaigns.length}</span> campaigns
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCampaignCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={campaignCurrentPage === 1}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm flex items-center gap-1 text-slate-600 font-semibold"
                    >
                      Previous
                    </button>
                    {Array.from({ length: totalCampaignPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        onClick={() => setCampaignCurrentPage(pageNum)}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold transition-all shadow-sm ${campaignCurrentPage === pageNum
                          ? "bg-[#0A0082] text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                          }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                    <button
                      onClick={() => setCampaignCurrentPage(prev => Math.min(prev + 1, totalCampaignPages))}
                      disabled={campaignCurrentPage === totalCampaignPages}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-sm flex items-center gap-1 text-slate-600 font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* --- VERSION HISTORY TAB --- */}
      {activeTab === "versions" && (
        <div className="space-y-6">
          {compareMode && compareVersionNumber ? (
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                  <Layers className="h-4.5 w-4.5 text-blue-600" /> Comparing Version {compareVersionNumber} vs Current Version
                </h3>
                <button
                  onClick={() => setCompareMode(false)}
                  className="px-3 py-1 border rounded text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Exit Compare Mode
                </button>
              </div>

              {/* Print Diff side-by-side */}
              {getDiffText(
                historyList.find(h => h.version === Number(compareVersionNumber))?.rawText || "",
                rawText
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Timeline list */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b pb-2 mb-4">Timelined Revisions</h3>

                <div className="space-y-6 relative border-l border-slate-200 pl-6 ml-3">
                  {/* Current Active */}
                  <div className="relative">
                    <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-blue-600 bg-blue-50 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-900">Version {version} (Active)</h4>
                        <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 rounded">Current</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Updated on {updatedDate || createdDate} by Current User</p>
                      <p className="text-xs text-slate-700 mt-1.5">Active structure configured with {skillsList.length} taxonomy skill filters.</p>
                    </div>
                  </div>

                  {/* Previous versions */}
                  {historyList && historyList.map((hist, idx) => (
                    <div key={idx} className="relative">
                      <span className="absolute -left-[30px] top-1 w-4 h-4 rounded-full border-2 border-slate-350 bg-white flex items-center justify-center" />
                      <div>
                        <h4 className="text-xs font-bold text-slate-700">Version {hist.version}</h4>
                        <p className="text-[10px] text-slate-500 mt-1">Updated on {hist.updatedDate} by {hist.updatedBy}</p>
                        <p className="text-xs text-slate-500 mt-1.5 italic">"{hist.changesSummary}"</p>

                        <div className="flex gap-2.5 mt-3">
                          <button
                            onClick={() => {
                              setCompareVersionNumber(hist.version);
                              setCompareMode(true);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded text-[10px] font-bold transition"
                          >
                            <Eye className="h-3 w-3" /> Compare diff
                          </button>
                          <button
                            onClick={() => setRestoreConfirmVersion(hist.version)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 rounded text-[10px] font-bold transition"
                          >
                            <RefreshCw className="h-3 w-3" /> Restore state
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Lineage Tree card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col h-fit">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b pb-2 mb-4">Lineage Branch Tree</h3>

                {/* Vertical tree representation using basic CSS borders */}
                <div className="flex flex-col items-center py-4 space-y-4">
                  {historyList && historyList.map((h, i) => (
                    <React.Fragment key={i}>
                      <div className="w-24 border border-slate-200 rounded-lg p-2 text-center bg-slate-50 shadow-sm">
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Rev v{h.version}</span>
                        <span className="text-[10px] font-bold text-slate-600">Base version</span>
                      </div>
                      <div className="h-4 border-l-2 border-dashed border-slate-300" />
                    </React.Fragment>
                  ))}

                  {/* Current version node */}
                  <div className="w-28 border-2 border-blue-600 rounded-lg p-2.5 text-center bg-blue-50/50 shadow-md">
                    <span className="text-[9px] uppercase font-bold text-blue-600 block">Rev v{version}</span>
                    <span className="text-[10px] font-black text-blue-900">Active Node</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Initiate Campaign Modal */}
      <Modal
        isOpen={linkCampaignModalOpen}
        onClose={() => setLinkCampaignModalOpen(false)}
        title="Initiate Recruitment Campaign"
        width="520px"
        height="90vh"
      >
        <NewCampaignForm
          title={title}
          campaignForm={campaignForm}
          handleCampaignFormChange={handleCampaignFormChange}
          setLinkCampaignModalOpen={setLinkCampaignModalOpen}
          isSubmittingCampaign={isSubmittingCampaign}
          handleInitiateCampaign={handleInitiateCampaign}
        />
      </Modal>

      {/* Restore Confirmation Dialog */}
      {restoreConfirmVersion && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="p-2 bg-amber-50 rounded-full"><AlertTriangle className="h-5 w-5" /></div>
              <h3 className="text-sm font-bold text-slate-900">Rollback Confirmation</h3>
            </div>

            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to rollback back to <span className="font-bold text-slate-800">Version {restoreConfirmVersion}</span>?
              This will overwrite the active JD text and matching skills taxonomy, creating a backup history point of your current state.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRestoreConfirmVersion(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleRestoreConfirm}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold transition"
              >
                Confirm Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
