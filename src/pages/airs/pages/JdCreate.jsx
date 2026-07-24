import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import JdForm from "./JdForm";

export default function JdCreate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editId = searchParams.get("edit");

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/airs/jds")}
        className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to JDs
      </button>

      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
        <h1 className="text-lg font-bold">{editId ? "Edit Job Description" : "Create Job Description"}</h1>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <JdForm
          editId={editId}
          onSuccess={() => navigate("/airs/jds")}
          onCancel={() => navigate("/airs/jds")}
        />
      </div>
    </div>
  );
}
