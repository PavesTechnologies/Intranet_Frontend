import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Award } from "lucide-react";
import Button from "../../../components/Button/Button";

export default function UnknownSkillDetailPage() {
  const { unknownSkillId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <button
        onClick={() => navigate("/airs/skill-ontology")}
        className="flex items-center gap-1 text-[13px] font-semibold text-blue-600 mb-4"
      >
        <ChevronLeft size={15} /> Back to Skill Ontology
      </button>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center max-w-xl mx-auto">
        <Award size={36} className="text-amber-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">Unknown Skill Detail</h1>
        <p className="text-xs text-slate-500 mb-6">
          This skill (ID: {unknownSkillId}) is currently unmapped or unrecognized in our taxonomy database.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" size="medium" onClick={() => navigate("/airs/skill-ontology")}>
            Cancel
          </Button>
          <Button variant="primary" size="medium" onClick={() => navigate("/airs/skill-ontology")}>
            Promote to Canonical Skill
          </Button>
        </div>
      </div>
    </div>
  );
}
