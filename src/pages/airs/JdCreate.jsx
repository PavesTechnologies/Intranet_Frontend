import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAirsStore } from "./airsStore";
import {
  FileText,
  FileUp,
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Check,
  AlertTriangle,
  X,
  FileCode,
  Tag
} from "lucide-react";
import toast from "react-hot-toast";

export default function JdCreate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { jds, addJd, addJdVersion } = useAirsStore();

  // URL trigger check (e.g. ?input=paste or ?input=upload)
  const initialInputMode = searchParams.get("input") === "upload" ? "upload" : "paste";

  // Stepper State: 1 = Input, 2 = Review Extracted, 3 = Submit Checklist
  const [step, setStep] = useState(1);
  const [inputMode, setInputMode] = useState(initialInputMode); // 'paste' | 'upload'

  // Paste Fields State
  const [title, setTitle] = useState("");
  const [jurisdiction, setJurisdiction] = useState("India");
  const [experience, setExperience] = useState("3-5 years");
  const [education, setEducation] = useState("Bachelor's Degree");
  const [rawText, setRawText] = useState("");

  // Upload Fields State
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  
  // Parsing Simulator State
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseStepText, setParseStepText] = useState("");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [parseFailed, setParseFailed] = useState(false);
  const [parseFailReason, setParseFailReason] = useState("");

  // Extracted Data State (Editable in Step 2)
  const [extractedSkills, setExtractedSkills] = useState([]);
  const [detectedExp, setDetectedExp] = useState("");
  const [detectedEdu, setDetectedEdu] = useState("");

  // Duplicate Check Overlay State
  const [duplicateJd, setDuplicateJd] = useState(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);

  // Set default initial values for text paste for demo help
  const handlePreFill = (roleType) => {
    if (roleType === "react") {
      setTitle("Senior React & Frontend Engineer");
      setRawText("We are hiring a Senior React Developer to join our UI team. Required skills include ReactJS, TypeScript, NodeJS, TailwindCSS, CSS3, and Git. The ideal candidate will have 4 years of frontend development experience and a Bachelor's degree.");
      setExperience("3-5 years");
      setEducation("Bachelor's Degree");
    } else if (roleType === "java") {
      setTitle("Java Spring Boot Platform Lead");
      setRawText("Looking for a Java Lead Developer to build high scalability APIs. Technologies needed: Java, Spring Boot, Microservices, Kubernetes, PostgreSQL, AWS, and Git. Requires a Master's degree in CS and 6 years in backend systems.");
      setExperience("5-8 years");
      setEducation("Master's Degree");
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file) => {
    const validExtensions = ["pdf", "docx"];
    const ext = file.name.split(".").pop().toLowerCase();
    
    if (!validExtensions.includes(ext)) {
      toast.error("Invalid file format. Please upload a PDF or DOCX file.");
      return;
    }
    
    setUploadedFile(file);
    startMockParsing(file.name);
  };

  // Parsing Simulator Logic
  const startMockParsing = (fileName) => {
    setIsParsing(true);
    setParseFailed(false);
    setParseProgress(0);
    
    const steps = [
      { p: 15, text: "Scanning document layers..." },
      { p: 40, text: "Extracting metadata via NLP parser..." },
      { p: 65, text: "Checking skills matching model alignment..." },
      { p: 85, text: "Mapping canonical skill vectors..." },
      { p: 100, text: "Finalizing extracted taxonomy..." }
    ];

    let currentStepIdx = 0;
    
    const interval = setInterval(() => {
      setParseProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsParsing(false);
            if (simulateFailure) {
              setParseFailed(true);
              setParseFailReason("Failure in NLP Extraction Module: Unstructured format mismatch or corrupted PDF text layer.");
              toast.error("Job description parsing failed.");
            } else {
              // Parse Success: Populate Step 2 editable states
              const isJava = fileName.toLowerCase().includes("java") || title.toLowerCase().includes("java");
              setDetectedExp(experience || "3-5 years");
              setDetectedEdu(education || "Bachelor's Degree");
              
              const defaultSkills = isJava 
                ? [
                    { name: "Java", mandatory: true, verified: true, weight: 35, confidence: 98, mappedTo: "Java Language", mappingType: "Alias" },
                    { name: "Spring Boot", mandatory: true, verified: true, weight: 30, confidence: 95, mappedTo: "Spring Framework", mappingType: "Fuzzy" },
                    { name: "PostgreSQL", mandatory: true, verified: false, weight: 15, confidence: 91, mappedTo: "Postgres Database", mappingType: "Alias" },
                    { name: "AWS", mandatory: false, verified: false, weight: 10, confidence: 85, mappedTo: "Amazon Web Services", mappingType: "Vector" }
                  ]
                : [
                    { name: "React", mandatory: true, verified: true, weight: 40, confidence: 97, mappedTo: "ReactJS Library", mappingType: "Alias" },
                    { name: "TypeScript", mandatory: true, verified: true, weight: 25, confidence: 92, mappedTo: "TypeScript", mappingType: "Alias" },
                    { name: "NodeJS", mandatory: true, verified: false, weight: 20, confidence: 89, mappedTo: "Node Runtime", mappingType: "Fuzzy" },
                    { name: "CSS3", mandatory: false, verified: false, weight: 15, confidence: 80, mappedTo: "CSS Style", mappingType: "Vector" }
                  ];
              
              setExtractedSkills(defaultSkills);
              toast.success("Job description parsed successfully!");
              setStep(2);
            }
          }, 400);
          return 100;
        }

        const nextVal = prev + Math.floor(Math.random() * 15) + 5;
        const matchingStep = steps.find(s => nextVal >= s.p - 10 && nextVal <= s.p + 10);
        if (matchingStep) {
          setParseStepText(matchingStep.text);
        }
        
        return Math.min(nextVal, 100);
      });
    }, 400);
  };

  // Submit Text (Triggers duplicate check before proceeding)
  const handleSubmitInputStep = (e) => {
    e.preventDefault();
    if (inputMode === "paste") {
      if (!title || !rawText) {
        toast.error("Please enter a job title and description text.");
        return;
      }
      
      // Perform duplicate check
      const duplicate = jds.find(
        (j) => j.title.toLowerCase().trim() === title.toLowerCase().trim() && j.status !== "Closed"
      );
      
      if (duplicate) {
        setDuplicateJd(duplicate);
        setDuplicateModalOpen(true);
        return;
      }
      
      // Run parser animation on text
      startMockParsing("manual_paste.txt");
    }
  };

  // Proceed with duplicate choices
  const handleReuseExisting = () => {
    setDuplicateModalOpen(false);
    toast.success(`Redirecting to existing active JD: ${duplicateJd.id}`);
    navigate(`/airs/jds/${duplicateJd.id}`);
  };

  const handleCreateNewVersion = () => {
    setDuplicateModalOpen(false);
    
    // Add version via store
    const newFields = {
      title,
      jurisdiction,
      experience,
      education,
      rawText
    };
    
    addJdVersion(duplicateJd.id, newFields, "Incremented version via creator wizard");
    toast.success(`New version created under existing JD: ${duplicateJd.id}`);
    navigate(`/airs/jds/${duplicateJd.id}`);
  };

  // Step 2 Skill Management (Verify, Replace, Delete)
  const handleToggleVerifySkill = (index) => {
    const updated = [...extractedSkills];
    updated[index].verified = !updated[index].verified;
    setExtractedSkills(updated);
  };

  const handleDeleteSkill = (index) => {
    const updated = extractedSkills.filter((_, idx) => idx !== index);
    setExtractedSkills(updated);
    toast.success("Skill removed from definition.");
  };

  const handleReplaceSkill = (index, newSkillName) => {
    const updated = [...extractedSkills];
    updated[index].name = newSkillName;
    updated[index].mappedTo = newSkillName;
    updated[index].verified = true;
    updated[index].mappingType = "Alias";
    setExtractedSkills(updated);
    toast.success(`Skill replaced with ${newSkillName}`);
  };

  // Step 3 Submission
  const handleFinalSubmit = () => {
    const newJdId = `JD-${String(jds.length + 1).padStart(4, "0")}`;
    const newJdObj = {
      id: newJdId,
      title: title || "Extracted Job Role",
      version: 1,
      status: "Ready",
      source: inputMode === "paste" ? "Manual" : "PDF Upload",
      jurisdiction,
      experience: detectedExp,
      education: detectedEdu,
      skills: extractedSkills,
      mandatorySkills: extractedSkills.filter(s => s.mandatory).map(s => s.name),
      campaignCount: 0,
      createdBy: "Current User",
      createdDate: new Date().toISOString().split("T")[0],
      updatedDate: new Date().toISOString().split("T")[0],
      parseStatus: "Success",
      confidence: 94,
      rawText: rawText || `Pasted content for role: ${title}`,
      history: [],
      auditTimeline: [
        { event: "Created", date: new Date().toISOString().split("T")[0], user: "Current User", description: "Created via wizard stepper." },
        { event: "Parsed", date: new Date().toISOString().split("T")[0], user: "AIRS Parser Engine", description: "Skills and constraints verified." }
      ]
    };
    
    addJd(newJdObj);
    toast.success(`Job Description ${newJdId} created successfully!`);
    navigate("/airs/jds");
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate("/airs/jds")}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to JDs
      </button>

      {/* Stepper Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6 flex justify-between items-center">
        <h1 className="text-lg font-bold">Create Job Description</h1>
        
        {/* Stepper indicators */}
        <div className="flex items-center gap-2">
          {/* Step 1 */}
          <div className="flex items-center gap-1.5">
            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
              step >= 1 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>1</span>
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">Input</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200"></div>

          {/* Step 2 */}
          <div className="flex items-center gap-1.5">
            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
              step >= 2 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>2</span>
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">Review Taxonomy</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200"></div>

          {/* Step 3 */}
          <div className="flex items-center gap-1.5">
            <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
              step >= 3 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            }`}>3</span>
            <span className="text-xs font-semibold text-slate-700 hidden sm:inline">Checklist</span>
          </div>
        </div>
      </div>

      {/* Step 1: Input choice */}
      {step === 1 && !isParsing && !parseFailed && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          {/* Mode Selector */}
          <div className="flex gap-4 border-b border-slate-150 pb-4 mb-6">
            <button
              onClick={() => setInputMode("paste")}
              className={`flex items-center gap-2 pb-3.5 px-2 text-xs font-bold transition border-b-2 -mb-4.5 ${
                inputMode === "paste"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <FileText className="h-4.5 w-4.5" /> Paste Raw Text
            </button>
            <button
              onClick={() => setInputMode("upload")}
              className={`flex items-center gap-2 pb-3.5 px-2 text-xs font-bold transition border-b-2 -mb-4.5 ${
                inputMode === "upload"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <FileUp className="h-4.5 w-4.5" /> Upload File (PDF/DOCX)
            </button>
          </div>

          {/* Paste Text Form */}
          {inputMode === "paste" && (
            <form onSubmit={handleSubmitInputStep} className="space-y-4">
              <div className="flex justify-between items-center bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs">
                <span className="text-blue-800 font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" /> Quick Demo Autocomplete:
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreFill("react")}
                    className="bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded transition"
                  >
                    Frontend Dev
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreFill("java")}
                    className="bg-white border border-blue-200 hover:bg-blue-100 text-blue-700 font-bold px-2 py-1 rounded transition"
                  >
                    Java Spring Lead
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Job Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Frontend Architect"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Region (Jurisdiction)</label>
                  <select
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="USA">USA</option>
                    <option value="EU">EU</option>
                    <option value="India">India</option>
                    <option value="UK">UK</option>
                    <option value="Global">Global</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Experience Level</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="1-3 years">1-3 years</option>
                    <option value="3-5 years">3-5 years</option>
                    <option value="5-8 years">5-8 years</option>
                    <option value="8+ years">8+ years</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Education</label>
                  <select
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="Bachelor's Degree">Bachelor's Degree</option>
                    <option value="Master's Degree">Master's Degree</option>
                    <option value="PhD">PhD</option>
                    <option value="Associate Degree">Associate Degree</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Job Description Text Area</label>
                <textarea
                  rows="8"
                  required
                  placeholder="Paste the full job description details, responsibilities, and required core skills..."
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition focus:border-transparent font-sans"
                />
              </div>

              {/* Toggle parsing failure simulation */}
              <div className="flex items-center gap-2 border-t border-slate-150 pt-4">
                <input
                  type="checkbox"
                  id="fail-toggle"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="fail-toggle" className="text-xs font-semibold text-slate-600 cursor-pointer">
                  Simulate parser crash (Parse Failure State)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate("/airs/jds")}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  Create JD & Parse <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          )}

          {/* File Upload Form */}
          {inputMode === "upload" && (
            <div className="space-y-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-10 text-center transition ${
                  dragActive
                    ? "border-blue-500 bg-blue-50/50"
                    : "border-slate-300 hover:border-blue-400 bg-slate-50/50"
                }`}
              >
                <div className="max-w-xs mx-auto">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">Drag & drop your file here</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Supports PDF, DOCX formats up to 10MB</p>
                  
                  <div className="relative mt-4">
                    <input
                      type="file"
                      id="file-upload-input"
                      className="hidden"
                      onChange={handleFileInput}
                      accept=".pdf,.docx"
                    />
                    <label
                      htmlFor="file-upload-input"
                      className="inline-block px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition"
                    >
                      Choose Local File
                    </label>
                  </div>
                </div>
              </div>

              {/* Predefined Test files for simulation help */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                <h4 className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">Simulate File Upload Demos</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <button
                    type="button"
                    onClick={() => {
                      setTitle("AWS Cloud Architect");
                      setExperience("8+ years");
                      setEducation("Bachelor's Degree");
                      setRawText("Simulated PDF upload content.");
                      handleFileSelected(new File([""], "AWS_Cloud_Architect.pdf"));
                    }}
                    className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg text-xs hover:bg-slate-100 transition text-left"
                  >
                    <FileCode className="h-5 w-5 text-red-600" />
                    <div>
                      <div className="font-bold">AWS_Cloud_Architect.pdf</div>
                      <div className="text-[9px] text-slate-400">Trigger successful PDF parser</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSimulateFailure(true);
                      handleFileSelected(new File([""], "Corrupted_JD.docx"));
                    }}
                    className="flex items-center gap-2.5 p-2 bg-white border border-slate-200 rounded-lg text-xs hover:bg-slate-100 transition text-left"
                  >
                    <FileCode className="h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-bold">Corrupted_JD.docx</div>
                      <div className="text-[9px] text-slate-400">Trigger simulated Parse Failure</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parsing progress view */}
      {isParsing && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto animate-spin-slow" style={{ animationDuration: '4s' }}>
            <RefreshCw className="h-8 w-8 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-slate-800">AIRS Parsing Engine Active</h3>
            <p className="text-xs text-slate-500 font-semibold">{parseStepText}</p>
            <p className="text-[10px] text-slate-400">Estimated time remaining: {Math.max(1, Math.ceil((100 - parseProgress) / 25))}s</p>
          </div>
          
          {/* Progress bar container */}
          <div className="max-w-md mx-auto">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                style={{ width: `${parseProgress}%` }}
              />
            </div>
            <div className="text-right text-[10px] font-bold text-slate-400 mt-1">{parseProgress}% Completed</div>
          </div>
        </div>
      )}

      {/* Parse Failure Error Card */}
      {parseFailed && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <div className="border border-rose-100 bg-rose-50/50 rounded-xl p-6 text-center space-y-4 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">JD Parsing Failed</h3>
              <p className="text-xs text-rose-700 font-medium mt-1">{parseFailReason}</p>
            </div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setParseFailed(false);
                  setSimulateFailure(false);
                  startMockParsing(uploadedFile ? uploadedFile.name : "manual_paste.txt");
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry Parsing
              </button>
              <button
                type="button"
                onClick={() => {
                  setParseFailed(false);
                  setInputMode("paste");
                  setTitle(uploadedFile ? uploadedFile.name.replace(/\.[^/.]+$/, "") : "Raw Job Draft");
                  setRawText("Pasted details of the failed document here so you can verify manually...");
                }}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                Edit Manually
              </button>
              <button
                type="button"
                onClick={() => {
                  setParseFailed(false);
                  setUploadedFile(null);
                  setInputMode("upload");
                }}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition shadow-sm"
              >
                Upload Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Review Extracted Details */}
      {step === 2 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-slate-150 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Verify AI Taxonomy Extraction</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Below are the parameters detected. Edit and confirm verification before campaign linkage.</p>
            </div>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" /> Parser Done
            </span>
          </div>

          {/* Details Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Extracted Experience</label>
              <input
                type="text"
                value={detectedExp}
                onChange={(e) => setDetectedExp(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Extracted Education Requirement</label>
              <input
                type="text"
                value={detectedEdu}
                onChange={(e) => setDetectedEdu(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Skills verification grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-600" /> Extracted Skills Taxonomy
            </h3>
            
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase">
                    <th className="px-4 py-3">Detected Skill</th>
                    <th className="px-4 py-3 text-center">Mandatory</th>
                    <th className="px-4 py-3">Vector Mapped To</th>
                    <th className="px-4 py-3 text-center">Confidence</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 font-medium">
                  {extractedSkills.map((sk, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-bold text-slate-950 flex items-center gap-2">
                        {sk.name}
                        {sk.verified ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold border border-emerald-100">Verified</span>
                        ) : (
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold border border-slate-200">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={sk.mandatory}
                          onChange={() => {
                            const updated = [...extractedSkills];
                            updated[idx].mandatory = !updated[idx].mandatory;
                            setExtractedSkills(updated);
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-500 italic">{sk.mappedTo}</span>
                        <span className="ml-2 text-[9px] bg-indigo-50 text-indigo-700 px-1 rounded-md border border-indigo-100 font-bold">{sk.mappingType}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-slate-800">{sk.confidence}%</span>
                      </td>
                      <td className="px-4 py-3 text-right flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleVerifySkill(idx)}
                          className="px-2 py-1 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-600 rounded text-[10px] font-bold transition"
                        >
                          {sk.verified ? "Unverify" : "Verify"}
                        </button>
                        <button
                          onClick={() => {
                            const newName = prompt("Replace skill with standard canonical name:", sk.name);
                            if (newName) handleReplaceSkill(idx, newName);
                          }}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-600 rounded text-[10px] font-bold transition"
                        >
                          Replace
                        </button>
                        <button
                          onClick={() => handleDeleteSkill(idx)}
                          className="p-1 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-600 rounded transition"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between border-t border-slate-150 pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Input
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-xs font-bold transition"
            >
              Continue to Submit <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Complete & Readiness checklist */}
      {step === 3 && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-150 pb-4">
            <h2 className="text-sm font-bold text-slate-900">Hiring Readiness Checklist</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-semibold">Verify configuration score parameters before database submission.</p>
          </div>

          {/* Checklist display */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between p-3.5 border border-slate-150 rounded-xl bg-slate-50">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" /> Raw Text Extracted
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-100">PASSED</span>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-slate-150 rounded-xl bg-slate-50">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" /> Mandatory Skills Extracted
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-100">PASSED</span>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-slate-150 rounded-xl bg-slate-50">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="h-4.5 w-4.5 text-emerald-500" /> Taxonomy Mapping Complete
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-100">PASSED</span>
              </div>

              <div className="flex items-center justify-between p-3.5 border border-slate-150 rounded-xl bg-slate-50">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  {extractedSkills.every(s => s.verified) ? (
                    <>
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-500" /> All Skills Verified
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-500 animate-pulse" /> Pending Skills Verification
                    </>
                  )}
                </span>
                {extractedSkills.every(s => s.verified) ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 font-bold px-2 py-0.5 rounded border border-emerald-100">PASSED</span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 font-bold px-2 py-0.5 rounded border border-amber-100">PENDING</span>
                )}
              </div>
            </div>

            {/* Overall Score */}
            <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 flex flex-col justify-center items-center text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 mb-2">Overall JD Status</span>
              
              {extractedSkills.length > 0 && extractedSkills.some(s => !s.verified) ? (
                <>
                  <div className="w-16 h-16 rounded-full border-4 border-amber-500 flex items-center justify-center bg-amber-50 text-amber-600 text-lg font-black mb-3">
                    90%
                  </div>
                  <h3 className="text-xs font-bold text-amber-700">NOT FULLY READY</h3>
                  <p className="text-[9px] text-slate-400 mt-1 leading-snug">Verify remaining skill nodes to unlock candidate matches.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full border-4 border-blue-600 flex items-center justify-center bg-blue-50 text-blue-600 text-lg font-black mb-3 animate-pulse">
                    100%
                  </div>
                  <h3 className="text-xs font-bold text-blue-700">READY</h3>
                  <p className="text-[9px] text-slate-400 mt-1 leading-snug">All criteria satisfied. Eligible for active campaign links.</p>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between border-t border-slate-150 pt-4">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Review
            </button>
            <button
              onClick={handleFinalSubmit}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-xs font-bold transition shadow-sm"
            >
              Submit & Add to Library
            </button>
          </div>
        </div>
      )}

      {/* Duplicate JD dialog */}
      {duplicateModalOpen && duplicateJd && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-500 mb-4">
              <div className="p-2 bg-amber-50 rounded-full"><AlertTriangle className="h-6 w-6" /></div>
              <h3 className="text-base font-bold text-slate-900">Duplicate Role Detected</h3>
            </div>
            
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              A Job Description with title <span className="font-bold text-slate-800">"{duplicateJd.title}"</span> already exists in the system.
            </p>

            <div className="border border-slate-150 rounded-xl p-4 bg-slate-50 space-y-2 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Record ID:</span>
                <span className="font-mono font-bold text-slate-800">{duplicateJd.id}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Active Version:</span>
                <span className="font-bold text-slate-800">Version {duplicateJd.version}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400 font-medium">Created Date:</span>
                <span className="font-bold text-slate-800">{duplicateJd.createdDate}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3.5">
              <button
                type="button"
                onClick={() => setDuplicateModalOpen(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 text-slate-700 transition order-3 sm:order-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReuseExisting}
                className="px-4 py-2 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold transition order-2 shadow-sm"
              >
                View Existing
              </button>
              <button
                type="button"
                onClick={handleCreateNewVersion}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition order-1 shadow-sm"
              >
                Create New Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
