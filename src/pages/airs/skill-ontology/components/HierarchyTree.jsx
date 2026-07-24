import React from "react";
import { ChevronRight, ChevronDown, Loader2, Circle } from "lucide-react";
import { renderStatusPill, renderVerificationBadge } from "../utils/skillOntologyUtils.jsx";
import LoadingSpinner from "../../../../components/LoadingSpinner";

function TreeNode({ node, depth, expandedIds, loadingIds, childrenById, onToggle, onSelect }) {
  const isExpanded = expandedIds.has(node.id);
  const isLoading = loadingIds.has(node.id);
  const hasChildren = node.hasChildren ?? (node.childCount ?? 0) > 0;
  const children = childrenById[node.id] || [];

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer"
        style={{ paddingLeft: depth * 20 + 8 }}
        onClick={() => onSelect(node)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="shrink-0 text-slate-500"
          >
            {isLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : isExpanded ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
          </button>
        ) : (
          <span className="shrink-0 flex items-center justify-center w-3.5" title="Leaf skill — no children">
            <Circle size={6} className="fill-slate-300 text-slate-300" />
          </span>
        )}
        <span className="text-[13px] font-semibold text-slate-900 truncate">{node.canonicalName}</span>
        {renderVerificationBadge(node.confidence)}
        {renderStatusPill(node.status)}
        {hasChildren && (
          <span className="text-[11px] text-slate-400 ml-auto shrink-0">{node.childCount} children</span>
        )}
      </div>

      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              loadingIds={loadingIds}
              childrenById={childrenById}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HierarchyTree({ rootNodes, isLoadingRoot, expandedIds, loadingIds, childrenById, onToggle, onSelect }) {
  if (isLoadingRoot) {
    return (
      <div className="py-16 flex items-center justify-center">
        <LoadingSpinner text="Loading hierarchy..." />
      </div>
    );
  }

  if (rootNodes.length === 0) {
    return <p className="text-[12px] text-slate-400 py-8 text-center">No top-level skills in the hierarchy yet.</p>;
  }

  return (
    <div className="space-y-0.5">
      {rootNodes.map((node) => (
        <TreeNode
          key={node.id}
          node={node}
          depth={0}
          expandedIds={expandedIds}
          loadingIds={loadingIds}
          childrenById={childrenById}
          onToggle={onToggle}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
