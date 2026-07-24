import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, RefreshCw } from "lucide-react";
import Button from "../../../components/Button/Button";
import useHierarchy from "./hooks/useHierarchy";
import HierarchyTree from "./components/HierarchyTree";
import ErrorState from "./components/ErrorState";

export default function HierarchyPage() {
  const navigate = useNavigate();
  const hierarchy = useHierarchy();

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <button
        onClick={() => navigate("/airs/skill-ontology")}
        className="flex items-center gap-1 text-[13px] font-semibold text-blue-600 mb-4"
      >
        <ChevronLeft size={15} /> Back to Skill Ontology
      </button>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Skill Hierarchy</h1>
          <p className="text-xs text-slate-500 mt-1">Browse the canonical skill taxonomy as a tree. Click a node to view details.</p>
        </div>
        <Button variant="ghost" size="small" onClick={hierarchy.refreshRoot} disabled={hierarchy.isLoadingRoot}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${hierarchy.isLoadingRoot ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        {hierarchy.rootError ? (
          <ErrorState onRetry={hierarchy.refreshRoot} message="We couldn't load the skill hierarchy. Please try again." />
        ) : (
          <HierarchyTree
            rootNodes={hierarchy.rootNodes}
            isLoadingRoot={hierarchy.isLoadingRoot}
            expandedIds={hierarchy.expandedIds}
            loadingIds={hierarchy.loadingIds}
            childrenById={hierarchy.childrenById}
            onToggle={hierarchy.toggleExpand}
            onSelect={(node) => navigate(`/airs/skill-ontology/${node.id}`)}
          />
        )}
      </div>
    </div>
  );
}
