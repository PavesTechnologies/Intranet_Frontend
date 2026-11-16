import React, { Fragment, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronDown, ChevronRight, History, ScrollText, X } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import FilterCard from "@/components/ui/FilterCard";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import Pagination from "@/components/Pagination/pagination";
import LoadingSpinner from "@/components/LoadingSpinner";
import { auditLogService } from "@/pages/expense-management/api/expenseReportsApi";
import { useEmployeeDirectory } from "@/pages/expense-management/approval-engine/hooks/useEmployeeDirectory";

const PAGE_SIZE = 25;

const unwrap = (res) => (res?.data?.data !== undefined ? res.data.data : res?.data);

const inputCls =
  "h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const SOURCE_STYLES = {
  EMPLOYEE: "bg-sky-50 text-sky-700 ring-sky-200",
  FINANCE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ADMIN: "bg-violet-50 text-violet-700 ring-violet-200",
  OCR: "bg-amber-50 text-amber-700 ring-amber-200",
  SYSTEM: "bg-slate-100 text-slate-600 ring-slate-200",
};

// "REPORT_APPROVED_FOR_PAYMENT" -> "Report approved for payment"
const humanizeAction = (action) => {
  if (!action) return "—";
  const text = action.toLowerCase().replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// "ExpenseReport" -> "Expense report"
const humanizeEntity = (name) => {
  if (!name) return "—";
  const text = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const formatWhen = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
};

// Old/new values are free text or JSON (tax audit snapshots); show JSON indented.
const formatValue = (value) => {
  if (value == null || value === "") return null;
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === "object" ? JSON.stringify(parsed, null, 2) : String(value);
  } catch {
    return String(value);
  }
};

const shortId = (id) => (id ? `${String(id).slice(0, 8)}…` : "—");

function ValueBlock({ label, value }) {
  const text = formatValue(value);
  return (
    <div className="min-w-0 flex-1">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      {text ? (
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-slate-700">
          {text}
        </pre>
      ) : (
        <p className="text-xs italic text-slate-400">Not recorded</p>
      )}
    </div>
  );
}

/**
 * Audit Logs (Admin): the permanent, read-only trail of changes across Expense Management - report
 * submissions, approvals, corrections, Finance verification and payment, cash advances, OCR
 * overrides, tax and policy changes. Filter by record, action, source, person, date or text;
 * expand a row for its before/after values, or follow one record's whole history.
 */
export default function AuditLogsPage() {
  const [entityName, setEntityName] = useState("");
  const [entityId, setEntityId] = useState("");
  const [action, setAction] = useState("");
  const [source, setSource] = useState("");
  const [performedBy, setPerformedBy] = useState("");
  // Typed employee ID, applied on Enter / blur so each keystroke isn't a query.
  const [performedByDraft, setPerformedByDraft] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(null);

  const params = {
    entityName: entityName || undefined,
    entityId: entityId || undefined,
    action: action || undefined,
    source: source || undefined,
    performedBy: performedBy || undefined,
    from: from || undefined,
    to: to || undefined,
    q: q || undefined,
    page,
    size: PAGE_SIZE,
  };

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ["xmsAuditLogs", params],
    queryFn: () => auditLogService.search(params).then(unwrap),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
  const { data: facets } = useQuery({
    queryKey: ["xmsAuditLogFacets"],
    queryFn: () => auditLogService.facets().then(unwrap),
    staleTime: 5 * 60_000,
  });
  const { data: directory } = useEmployeeDirectory();

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(0);
    setExpanded(null);
  };
  const hasFilters = entityName || entityId || action || source || performedBy || from || to || q;
  const clearFilters = () => {
    [setEntityName, setEntityId, setAction, setSource, setPerformedBy, setPerformedByDraft, setFrom, setTo, setQ].forEach((set) => set(""));
    setPage(0);
    setExpanded(null);
  };
  const showHistory = (row) => {
    setEntityName(row.entityName);
    setEntityId(row.entityId);
    setPage(0);
    setExpanded(null);
  };

  const personName = (id) => {
    if (!id) return null;
    return directory?.get(id)?.name || directory?.get(String(id))?.name || null;
  };

  const items = data?.content || [];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb
        items={[
          { label: "Expense Management", to: "/expense-management/dashboard" },
          { label: "Activity", to: "/expense-management/activity/notifications" },
          { label: "Audit Logs" },
        ]}
      />

      <PageHeader
        title="Audit Logs"
        subtitle="A permanent, read-only record of who changed what across Expense Management, and when."
      />

      <FilterCard title="Filters" description="Narrow down by record, action, source, person, date or text.">
        <div className="w-full sm:max-w-xs">
          <SearchInput value={q} onSearch={(v) => resetPage(setQ)(v || "")} placeholder="Action, record, person, reason..." />
        </div>
        <select aria-label="Record type" value={entityName} onChange={(e) => { resetPage(setEntityName)(e.target.value); setEntityId(""); }} className={inputCls}>
          <option value="">All records</option>
          {(facets?.entityNames || []).map((name) => (
            <option key={name} value={name}>{humanizeEntity(name)}</option>
          ))}
        </select>
        <select aria-label="Action" value={action} onChange={(e) => resetPage(setAction)(e.target.value)} className={inputCls}>
          <option value="">All actions</option>
          {(facets?.actions || []).map((a) => (
            <option key={a} value={a}>{humanizeAction(a)}</option>
          ))}
        </select>
        <select aria-label="Source" value={source} onChange={(e) => resetPage(setSource)(e.target.value)} className={inputCls}>
          <option value="">All sources</option>
          {(facets?.sources || Object.keys(SOURCE_STYLES)).map((s) => (
            <option key={s} value={s}>{humanizeAction(s)}</option>
          ))}
        </select>
        <input
          aria-label="Performed by (employee ID)"
          value={performedByDraft}
          onChange={(e) => setPerformedByDraft(e.target.value)}
          onBlur={() => performedByDraft.trim() !== performedBy && resetPage(setPerformedBy)(performedByDraft.trim())}
          onKeyDown={(e) => e.key === "Enter" && resetPage(setPerformedBy)(performedByDraft.trim())}
          placeholder="Employee ID"
          className={`${inputCls} w-32`}
        />
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => resetPage(setFrom)(e.target.value)} className={inputCls} />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => resetPage(setTo)(e.target.value)} className={inputCls} />
        </label>
        {hasFilters && (
          <Button size="small" variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </FilterCard>

      {entityId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
          <History size={14} />
          <span>
            Full history of {humanizeEntity(entityName)} <span className="font-mono">{entityId}</span>
          </span>
          <button
            type="button"
            onClick={() => resetPage(setEntityId)("")}
            className="ml-auto inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium hover:bg-indigo-100"
          >
            <X size={12} /> Show all
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading audit trail…" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
            <p className="text-sm font-semibold text-rose-700">Couldn't load the audit trail.</p>
            <Button size="small" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <ScrollText className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              {hasFilters ? "No audit entries match these filters." : "No audit entries yet."}
            </p>
            <p className="text-xs text-slate-400">Entries are added automatically as reports, advances and settings change.</p>
          </div>
        ) : (
          <div className={`overflow-x-auto ${isFetching ? "opacity-70" : ""}`}>
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-8 px-3 py-2.5" />
                  <th className="px-3 py-2.5">When</th>
                  <th className="px-3 py-2.5">Record</th>
                  <th className="px-3 py-2.5">Action</th>
                  <th className="px-3 py-2.5">By</th>
                  <th className="px-3 py-2.5">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row) => {
                  const open = expanded === row.auditId;
                  const name = personName(row.performedBy);
                  return (
                    <Fragment key={row.auditId}>
                      <tr className={`align-top hover:bg-slate-50 ${open ? "bg-slate-50" : ""}`}>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            aria-label={open ? "Hide details" : "Show details"}
                            aria-expanded={open}
                            onClick={() => setExpanded(open ? null : row.auditId)}
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                          >
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-600">{formatWhen(row.performedAt)}</td>
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-slate-800">{humanizeEntity(row.entityName)}</p>
                          {row.entityId && (
                            <button
                              type="button"
                              title={`Show the full history of ${row.entityId}`}
                              onClick={() => showHistory(row)}
                              className="font-mono text-[11px] text-indigo-600 hover:underline"
                            >
                              {shortId(row.entityId)}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-medium text-slate-800">{humanizeAction(row.action)}</td>
                        <td className="px-3 py-2.5">
                          <p className="text-slate-800">{name || row.performedBy || "System"}</p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {name && <span className="text-[11px] text-slate-400">{row.performedBy}</span>}
                            {row.source && (
                              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${SOURCE_STYLES[row.source] || SOURCE_STYLES.SYSTEM}`}>
                                {row.source}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-xs px-3 py-2.5 text-slate-600">
                          <p className="line-clamp-2 break-words">{row.reason || "—"}</p>
                        </td>
                      </tr>
                      {open && (
                        <tr className="bg-slate-50">
                          <td />
                          <td colSpan={5} className="px-3 pb-4 pt-1">
                            <div className="flex flex-col gap-3 md:flex-row">
                              <ValueBlock label="Before" value={row.oldValue} />
                              <ValueBlock label="After" value={row.newValue} />
                            </div>
                            {row.reason && <p className="mt-3 break-words text-xs text-slate-600"><span className="font-semibold">Reason:</span> {row.reason}</p>}
                            <p className="mt-2 font-mono text-[10px] text-slate-400">Audit ID {row.auditId}</p>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex flex-col items-center gap-1">
          <Pagination
            currentPage={page + 1}
            totalPages={data.totalPages ?? 0}
            onPrevious={() => setPage((p) => Math.max(p - 1, 0))}
            onNext={() => setPage((p) => Math.min(p + 1, (data.totalPages ?? 1) - 1))}
          />
          <p className="text-[11px] text-slate-400">{data.totalElements} entries</p>
        </div>
      )}
    </div>
  );
}
