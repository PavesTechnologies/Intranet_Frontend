import React, { useState, useRef } from "react";
import FilterListbox from "../../../components/filter/FilterListbox";
import api from "../../../api/axiosInstance";
import {
  FileText,
  FileSignature,
  Key,
  Shield,
  X,
  UploadCloud,
  Download,
  User,
  Briefcase,
  Mail,
  Calendar,
  Sparkles,
  Search,
  CheckCircle,
  Settings,
  Eye,
  Printer,
  Receipt
} from "lucide-react";

import { generateHtml } from "./TemplateGenerator";

const TEMPLATES = [
  {
    id: "joining_letter",
    title: "Joining Letter",
    category: "Onboarding",
    description: "Official joining confirmation with reporting details, onboarding documents, and acknowledgement.",
    icon: <FileSignature className="text-blue-500" size={28} />,
    color: "from-blue-500/20 to-blue-500/5",
    accent: "bg-blue-500",
    fields: ["firstName", "lastName", "contactNumber", "email", "designation", "department", "joiningDate", "reportingTime", "location", "reportingManager", "customMessage", "date"]
  },
  {
    id: "nda",
    title: "Non-Disclosure Agreement",
    category: "Legal",
    description: "Standard NDA template ensuring confidentiality of intellectual property during the onboarding phase.",
    icon: <Key className="text-indigo-500" size={28} />,
    color: "from-indigo-500/20 to-indigo-500/5",
    accent: "bg-indigo-500",
    fields: ["firstName", "lastName", "date"]
  },
  {
    id: "policies",
    title: "Company Policies",
    category: "Compliance",
    description: "Comprehensive code of conduct, IT usage, and HR policies package for new hires.",
    icon: <Shield className="text-emerald-500" size={28} />,
    color: "from-emerald-500/20 to-emerald-500/5",
    accent: "bg-emerald-500",
    fields: ["firstName", "designation"]
  },
  {
    id: "relieving_letter",
    title: "Relieving Letter",
    category: "Offboarding",
    description: "Formal document confirming the separation of an employee and final settlement details.",
    icon: <FileText className="text-rose-500" size={28} />,
    color: "from-rose-500/20 to-rose-500/5",
    accent: "bg-rose-500",
    fields: ["firstName", "lastName", "designation", "relievingDate", "date"]
  },
  {
    id: "form_16",
    title: "Form 16",
    category: "Taxation",
    description: "Certificate under Section 203 of the Income Tax Act for tax deducted at source on salary.",
    icon: <Receipt className="text-orange-500" size={28} />,
    color: "from-orange-500/20 to-orange-500/5",
    accent: "bg-orange-500",
    fields: ["firstName", "lastName", "panNumber", "financialYear", "grossSalary", "taxDeducted", "date"]
  },
  {
    id: "offer_letter",
    title: "Offer Letter",
    category: "Onboarding",
    description: "Preliminary offer explicitly outlining the compensation structure and joining instructions.",
    icon: <Sparkles className="text-teal-500" size={28} />,
    color: "from-teal-500/20 to-teal-500/5",
    accent: "bg-teal-500",
    fields: ["firstName", "lastName", "designation", "totalCtc", "joiningDate", "date"]
  },
  {
    id: "appointment_letter",
    title: "Appointment Letter",
    category: "Onboarding",
    description: "Formal detailed contract of employment defining terms, policies, and operational expectations.",
    icon: <Briefcase className="text-purple-500" size={28} />,
    color: "from-purple-500/20 to-purple-500/5",
    accent: "bg-purple-500",
    fields: ["firstName", "lastName", "designation", "employeeType", "joiningDate", "date"]
  }
];

export default function DocumentTemplates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // flow: "gallery" -> "preview" -> "form" -> "result"
  const [viewState, setViewState] = useState("gallery");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({});
  const iframeRef = useRef(null);

  const [bulkLoading, setBulkLoading] = useState(false);
  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  const downloadBulkTemplate = async () => {
    try {
      setBulkLoading(true);
      const response = await api.get(
        `${BASE_URL}/permanent-employee/core-employee-details/bulk-template/`,
        {
          responseType: "blob",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "employee_bulk_template.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredTemplates = TEMPLATES.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUseTemplate = (template) => {
    setSelectedTemplate(template);
    setFormData({});
    setViewState("preview");
  };

  const handleClose = () => {
    setViewState("gallery");
    setTimeout(() => {
      setSelectedTemplate(null);
    }, 200);
  };

  const handleApplyFromPreview = () => {
    setViewState("form");
  };

  const handleGenerate = (e) => {
    e.preventDefault();
    setIsGenerating(true);
    // Simulate generation delay
    setTimeout(() => {
      setIsGenerating(false);
      setViewState("result");
    }, 1500);
  };

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.print();
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // const renderInputField = (field) => {
  //   const commonClasses = "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all";
    
  //   switch(field) {
  //     case "firstName":
  //     case "lastName":
  //       return (
  //         <div className="relative">
  //           <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
  //           <input required type="text" placeholder="e.g. John" className={`pl-10 ${commonClasses}`} value={formData[field] || ""} onChange={(e) => handleInputChange(field, e.target.value)} />
  //         </div>
  //       );
  //     case "contactNumber":
  //       return (
  //         <div className="relative">
  //            <span className="absolute left-4 top-3.5 text-slate-400 font-medium text-sm">+</span>
  //           <input required type="text" placeholder="91 XXXXX XXXXX" className={`pl-8 ${commonClasses}`} value={formData[field] || ""} onChange={(e) => handleInputChange(field, e.target.value)} />
  //         </div>
  //       )
  //     case "email":
  //       return (
  //         <div className="relative">
  //           <Mail className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
  //           <input required type="email" placeholder="john.doe@example.com" className={`pl-10 ${commonClasses}`} value={formData[field] || ""} onChange={(e) => handleInputChange(field, e.target.value)} />
  //         </div>
  //       );
  //     case "designation":
  //       return (
  //         <div className="relative">
  //           <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
  //           <input required type="text" placeholder="e.g. Senior Software Engineer" className={`pl-10 ${commonClasses}`} value={formData[field] || ""} onChange={(e) => handleInputChange(field, e.target.value)} />
  //         </div>
  //       );
  //     case "employeeType":
  //       return (
  //         <div className="relative">
  //           <Shield className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
  //           <FilterListbox options={[{value:"",label:"Select Employment Type"},{value:"Full-Time",label:"Full-Time"},{value:"Part-Time",label:"Part-Time"},{value:"Contract",label:"Contract"},{value:"Internship",label:"Internship"}]} value={formData[field] || ""} onChange={(val) => handleInputChange(field, val)} />
  //         </div>
  //       );
  //     case "date":
  //     case "joiningDate":
  //     case "relievingDate":
  //       return (
  //         <div className="relative">
  //           <Calendar className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
  //           <input required type="date" className={`pl-10 ${commonClasses}`} value={formData[field] || ""} onChange={(e) => handleInputChange(field, e.target.value)} />
  //         </div>
  //       );
  //     case "totalCtc":
  //     case "grossSalary":
  //     case "taxDeducted":
  //       return (
  //         <div className="relative">
  //           <span className="absolute left-4 top-3.5 text-slate-400 font-medium text-sm">₹</span>
  //           <input required type="text" placeholder="12,00,000" className={`pl-8 ${commonClasses}`} value={formData[field] || ""} onChange={(e) => handleInputChange(field, e.target.value)} />
  //         </div>
  //       );
  //     case "financialYear":
  //       return (
  //         <div className="relative">
  //            <span className="absolute left-4 top-3.5 text-slate-400 font-medium text-sm">#</span>
  //            <input required type="text" placeholder="e.g. 2025-2026" className={`pl-8 ${commonClasses}`} value={formData[field] || ""} onChange={(e) => handleInputChange(field, e.target.value)} />
  //         </div>
  //       );
  //     default:
  //       return <input required type="text" className={commonClasses} value={formData[field] || ""} onChange={(e) => handleInputChange(field, e.target.value)} />;
  //   }
  // };

  const formatFieldLabel = (field) => {
    const spaced = field.replace(/([A-Z])/g, ' $1');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="mx-auto max-w-[1280px]">
        {/* Header Section */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 shadow-inner">
                <FileSignature size={20} />
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                Document Templates
              </h1>
            </div>
            <p className="max-w-2xl text-base leading-relaxed text-slate-500">
              Manage and automatically generate personalized PDF documents for candidates using Paves Technologies templates.
            </p>
          </div>

          {/* <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search templates (e.g., NDA, Policy)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none transition-all focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            />
          </div> */}
        </div>

        {/* Templates Grid */}
        {/* {filteredTemplates.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group relative flex flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className={`absolute left-0 top-0 h-1.5 w-full ${template.accent}`} />
                
                <div className="flex flex-1 flex-col p-6 sm:p-8">
                  <div className="mb-5 flex items-start justify-between">
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${template.color} shadow-inner`}>
                      {template.icon}
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {template.category}
                    </span>
                  </div>
                  
                  <h3 className="mb-3 text-xl font-bold text-slate-900 leading-tight">{template.title}</h3>
                  <p className="mb-8 flex-1 text-sm leading-relaxed text-slate-500 line-clamp-3">
                    {template.description}
                  </p>

                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                  >
                    <Eye size={18} />
                    <span>Preview & Use</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
              <Search className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-slate-900">No templates found</h3>
            <p className="text-sm text-slate-500 max-w-sm">Try adjusting your search to find what you're looking for or clear the search field.</p>
          </div>
        )} */}

        {/* Bulk Employee Upload Template Section */}
        <div className="mt-10">
          {/* <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <Download size={16} />
            </span>
            <h2 className="text-lg font-bold text-slate-900">Employee Document Templates</h2>
          </div> */}

          <div className="inline-flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm w-[340px] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <FileText size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Bulk Employee Upload Template</h3>
                <p className="text-xs text-slate-500 mt-0.5">Download Excel template to upload employees in bulk</p>
              </div>
            </div>
            <button
              onClick={downloadBulkTemplate}
              disabled={bulkLoading}
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-70 disabled:cursor-wait"
            >
              {bulkLoading ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <Download size={16} />
                  <span>Download Template</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Modals / Overlays */}
        {viewState !== "gallery" && selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>
            
            {/* 1. Preview State */}
            {viewState === "preview" && (
              <div className="animate-in fade-in zoom-in-95 relative flex flex-col w-full max-w-5xl h-[90vh] overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-slate-200 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <Eye size={20} />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Template Preview: {selectedTemplate.title}</h2>
                      <p className="text-xs text-slate-500">Review the mock layout before filling dynamic fields.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
                    <button onClick={handleApplyFromPreview} className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-700">Apply & Fill Data</button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-6 relative">
                  <iframe 
                    title="pdf-preview"
                    srcDoc={generateHtml(selectedTemplate.id, {
                      firstName: "Jane",
                      lastName: "Doe",
                      countryCode: "91",
                      contactNumber: "9876543210",
                      email: "jane.doe@example.com",
                      designation: "Product Manager",
                      totalCtc: "18,00,000",
                      employeeType: "Full-Time",
                      date: new Date().toISOString().split('T')[0],
                      relievingDate: "2026-05-08",
                      department: "Engineering",
                      joiningDate: "2026-05-21",
                      reportingTime: "10:00 AM",
                      location: "Hyderabad",
                      reportingManager: "Paves HR",
                      customMessage: "Welcome aboard."
                    })} 
                    className="w-full h-full bg-white rounded-xl shadow-sm border border-slate-200"
                  />
                </div>
              </div>
            )}

            {/* 2. Form State */}
            {viewState === "form" && (
              <div className="animate-in fade-in zoom-in-95 relative w-full max-w-xl overflow-hidden rounded-[2rem] bg-white shadow-2xl transition-all duration-300">
                <div className={`relative px-8 py-8 overflow-hidden bg-gradient-to-br ${selectedTemplate.color}`}>
                  <button onClick={handleClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-slate-600 hover:bg-black/10"><X size={18} /></button>
                  <div className="relative z-10 flex items-center gap-5">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-white/50">
                      {selectedTemplate.icon}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 mb-1">{selectedTemplate.title}</h2>
                      <p className="text-sm font-medium text-slate-600">Fill dynamic fields to insert into PDF</p>
                    </div>
                  </div>
                </div>

                <div className="p-8">
                  <form onSubmit={handleGenerate} className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                       {selectedTemplate.fields.map((field) => (
                        <div key={field} className={field === 'description' || field === 'firstName' || field === 'lastName' ? "col-span-1 sm:col-span-2" : "col-span-1"}>
                          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">
                            {formatFieldLabel(field)}
                          </label>
                          {renderInputField(field)}
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 flex items-center justify-end gap-3 border-t border-slate-100 pt-6">
                      <button type="button" onClick={() => setViewState("preview")} className="rounded-xl px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100" disabled={isGenerating}>Back to Preview</button>
                      <button type="submit" disabled={isGenerating} className={`inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 hover:shadow-indigo-600/40 ${isGenerating ? "cursor-wait opacity-80" : ""}`}>
                        {isGenerating ? (
                          <><svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span>Generating...</span></>
                        ) : (
                          <><UploadCloud size={18} /><span>Generate Document</span></>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* 3. Result State */}
            {viewState === "result" && (
              <div className="animate-in fade-in zoom-in-95 relative flex flex-col w-full max-w-5xl h-[90vh] overflow-hidden rounded-[2rem] bg-slate-100 shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between bg-white px-6 py-4 border-b border-slate-200 shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle size={20} />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Document Generated!</h2>
                      <p className="text-xs text-slate-500">The personalized {selectedTemplate.title} has been successfully populated.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>
                    <button onClick={handlePrint} className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-semibold text-white shadow-md hover:bg-slate-800 flex items-center gap-2"><Printer size={16}/> Print / Save PDF</button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden p-6 relative flex justify-center">
                  <iframe 
                    ref={iframeRef}
                    title="generated-pdf"
                    srcDoc={generateHtml(selectedTemplate.id, formData)} 
                    className="w-full max-w-[210mm] h-full bg-white shadow-xl shadow-slate-300/50"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



