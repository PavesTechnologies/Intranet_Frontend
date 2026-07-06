import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAirsStore } from "./airsStore";
import { getJDById } from "../service/jdservice";
import {
  ArrowLeft,
  Briefcase,
  CheckCircle,
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
  X,
  UserPlus
} from "lucide-react";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";

export default function JdDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { jds, campaigns, updateJd, restoreJdVersion, linkCampaignToJd, addCampaign } = useAirsStore();

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

  // Tabs: overview, skills, campaigns, versions, audit
  const [activeTab, setActiveTab] = useState("overview");

  // Skills Editing state
  const [editingSkillIdx, setEditingSkillIdx] = useState(null);
  const [editedSkillWeight, setEditedSkillWeight] = useState(0);
  const [editedSkillConfidence, setEditedSkillConfidence] = useState(0);

  // Version Comparing state
  const [compareVersionNumber, setCompareVersionNumber] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [restoreConfirmVersion, setRestoreConfirmVersion] = useState(null);

  // Campaign Linking state
  const [linkCampaignModalOpen, setLinkCampaignModalOpen] = useState(false);
  const [campaignLinkStep, setCampaignLinkStep] = useState(1); // 1 = Name/Select, 2 = Review, 3 = Complete
  const [newCampaignName, setNewCampaignName] = useState("");
  const [selectedExistingCampaignId, setSelectedExistingCampaignId] = useState("");

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
  const handleCampaignSubmit = () => {
    if (campaignLinkStep === 1) {
      if (!newCampaignName && !selectedExistingCampaignId) {
        toast.error("Please enter a new campaign name or select an existing one.");
        return;
      }
      setCampaignLinkStep(2);
    } else if (campaignLinkStep === 2) {
      const nextCount = campaignCount + 1;
      setJdDetail(prev => ({ ...prev, campaignCount: nextCount }));
      if (newCampaignName) {
        const newCmpId = `CMP-${String(campaigns.length + 1).padStart(3, "0")}`;
        addCampaign({
          id: newCmpId,
          name: newCampaignName,
          status: "Active",
          candidates: 0,
          createdDate: new Date().toISOString().split("T")[0]
        });
        linkCampaignToJd(id, newCmpId);
      } else {
        linkCampaignToJd(id, selectedExistingCampaignId);
      }
      setCampaignLinkStep(3);
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
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 shrink-0 w-full md:w-auto">
          <div className="text-center shrink-0 pr-4 border-r border-slate-200">
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
          </div>
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
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Linked Campaigns</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Active hiring pipelines tied directly to the skill taxonomy of this JD.</p>
            </div>
            <button
              onClick={() => {
                setLinkCampaignModalOpen(true);
                setCampaignLinkStep(1);
                setNewCampaignName("");
                setSelectedExistingCampaignId("");
              }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 text-xs font-bold transition shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" /> Initiate Campaign
            </button>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Campaign Name</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Candidates Matching</th>
                <th className="px-6 py-4">Linked Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-medium">
              {campaignCount === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic">
                    No campaigns linked to this JD. Click 'Initiate Campaign' to map a recruiter pipeline.
                  </td>
                </tr>
              ) : (
                campaigns.slice(0, campaignCount).map((c, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-100 text-[10px]">
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{c.candidates}</td>
                    <td className="px-6 py-4 text-slate-500">{c.createdDate}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

      {/* --- AUDIT TIMELINE TAB --- */}
      {/* {activeTab === "audit" && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest border-b pb-2 mb-6">Historical Audit Timeline</h3>

          <div className="space-y-6 relative border-l border-slate-200 pl-6 ml-4">
            {jd.auditTimeline && jd.auditTimeline.map((item, idx) => (
              <div key={idx} className="relative">
                <span className="absolute -left-[30px] top-1.5 w-4 h-4 rounded-full border-2 border-blue-600 bg-blue-50 flex items-center justify-center">
                  <Check className="h-2.5 w-2.5 text-blue-600" />
                </span>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h4 className="text-xs font-bold text-slate-900">{item.event}</h4>
                    <span className="text-[10px] text-slate-400 font-bold">{item.date}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">Actioned by {item.user}</p>
                  <p className="text-xs text-slate-600 mt-1.5 leading-snug">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )} */}

      {/* dialog overlays */}

      {/* Link Campaign Modal */}
      {linkCampaignModalOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">Recruitment Campaign Linker</h3>
              <button onClick={() => setLinkCampaignModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stepper indicators */}
            <div className="flex justify-center items-center gap-3 mb-6">
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${campaignLinkStep >= 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>1</span>
              <span className="h-0.5 w-6 bg-slate-200" />
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${campaignLinkStep >= 2 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>2</span>
              <span className="h-0.5 w-6 bg-slate-200" />
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${campaignLinkStep >= 3 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>3</span>
            </div>

            {/* Step 1: Selection */}
            {campaignLinkStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Link to Existing Campaign</label>
                  <select
                    value={selectedExistingCampaignId}
                    onChange={(e) => {
                      setSelectedExistingCampaignId(e.target.value);
                      setNewCampaignName(""); // Clear other input
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Choose active campaign --</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                    ))}
                  </select>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-4 text-[9px] uppercase font-bold text-slate-400">Or Create New Campaign</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">New Campaign Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Q3 React Platform Lead Hiring"
                    value={newCampaignName}
                    onChange={(e) => {
                      setNewCampaignName(e.target.value);
                      setSelectedExistingCampaignId(""); // Clear other selection
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Review Mapping */}
            {campaignLinkStep === 2 && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Link Target:</span>
                    <span className="font-bold text-slate-800">{newCampaignName || campaigns.find(c => c.id === selectedExistingCampaignId)?.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Linked JD:</span>
                    <span className="font-bold text-slate-800">{title}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Mandatory Skill Nodes:</span>
                    <span className="font-bold text-slate-850">{skillsList.filter(s => s.mandatory).map(s => s.name).join(", ")}</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 italic leading-snug">
                  recruitment filters will be applied based on matching mandatory skills. Candidates not matching these tags will be locked out of screening scores.
                </p>
              </div>
            )}

            {/* Step 3: Complete */}
            {campaignLinkStep === 3 && (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-850">Recruitment Campaign Linked!</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Candidate parsing and skill vector scores are now synced with this job taxonomy structure.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6 border-t pt-4">
              {campaignLinkStep < 3 ? (
                <>
                  <button
                    onClick={() => {
                      if (campaignLinkStep === 2) setCampaignLinkStep(1);
                      else setLinkCampaignModalOpen(false);
                    }}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 transition"
                  >
                    {campaignLinkStep === 2 ? "Back" : "Cancel"}
                  </button>
                  <button
                    onClick={handleCampaignSubmit}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    {campaignLinkStep === 2 ? "Link & Sync" : "Continue"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setLinkCampaignModalOpen(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Close Dialog
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
