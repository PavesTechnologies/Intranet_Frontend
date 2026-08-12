import React from "react";

/**
 * Shared enterprise-workspace shell for every Policy Engine page. Enforces
 * one consistent design language: full-width content (no max-width caps),
 * a 35%/65% left-list/right-detail split, and the same card chrome
 * everywhere. Pages compose these pieces instead of hand-rolling their own
 * grid proportions and wrapper divs.
 */
export function PolicyWorkspaceLayout({ children, className = "" }) {
  return <div className={`flex h-full w-full flex-col gap-3 ${className}`}>{children}</div>;
}

export function PolicyToolbar({ title, subtitle, actions, className = "" }) {
  return (
    <div className={`flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-[#0a174e]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{actions}</div>}
    </div>
  );
}

/**
 * The 35%/65% split. Fixed at lg: and up; stacks to a single column below
 * that. Height is centralized here so no page invents its own magic-number
 * viewport calc.
 */
export function PolicyWorkspaceGrid({ left, right, className = "" }) {
  return (
    <div className={`grid flex-1 grid-cols-1 gap-3 lg:h-[calc(100vh-152px)] lg:min-h-[520px] lg:grid-cols-[35%_65%] ${className}`}>
      {left}
      {right}
    </div>
  );
}

export function PolicyLeftPanel({ children, className = "" }) {
  return <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function PolicyRightPanel({ children, className = "" }) {
  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm ${className}`}>{children}</div>
  );
}

/**
 * A single stacked block inside a RightPanel (Overview, Statistics, Rule
 * Summary, etc.) — gives every "workspace" page the same section chrome
 * instead of ad hoc cards floating in white space.
 */
export function PolicyInspectorSection({ title, action, children, className = "", bodyClassName = "" }) {
  return (
    <div className={`border-b border-gray-100 px-5 py-4 last:border-b-0 ${className}`}>
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between gap-2">
          {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</h3>}
          {action}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}

PolicyWorkspaceLayout.Toolbar = PolicyToolbar;
PolicyWorkspaceLayout.Grid = PolicyWorkspaceGrid;
PolicyWorkspaceLayout.LeftPanel = PolicyLeftPanel;
PolicyWorkspaceLayout.RightPanel = PolicyRightPanel;
PolicyWorkspaceLayout.Workspace = PolicyRightPanel;
PolicyWorkspaceLayout.Inspector = PolicyInspectorSection;

export default PolicyWorkspaceLayout;
