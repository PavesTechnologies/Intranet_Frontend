import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, BellRing, CheckCheck, CheckCircle2, Inbox, XCircle, AlertTriangle } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import PageHeader from "@/components/ui/PageHeader";
import FilterCard from "@/components/ui/FilterCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import StatCard from "@/components/Cards/StatCard";
import Button from "@/components/Button/Button";
import SearchInput from "@/components/filter/Searchbar";
import Pagination from "@/components/Pagination/pagination";
import LoadingSpinner from "@/components/LoadingSpinner";
import NotificationItem, { CATEGORY_META } from "@/pages/expense-management/components/notifications/NotificationItem";
import {
  useMarkAllRead,
  useMarkRead,
  useNotificationList,
  useUnreadCount,
} from "@/pages/expense-management/components/notifications/useNotifications";
import { DEFAULT_PAGE_SIZE } from "@/pages/expense-management/components/common/pagination";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "read", label: "Read" },
];

// Backend event types (NotificationEventListener / admin alerts), grouped as a reader thinks of them.
const EVENT_TYPES = [
  { value: "", label: "All events" },
  { value: "REPORT_SUBMITTED", label: "Report submitted" },
  { value: "LEVEL_ACTIVATED", label: "Approval requested" },
  { value: "SEQUENTIAL_ENTRY_ADVANCED", label: "Approval turn" },
  { value: "SLA_REMINDER", label: "Approval reminder" },
  { value: "REPORT_AWAITING_CORRECTION", label: "Correction requested" },
  { value: "REPORT_RESUMED", label: "Resubmitted" },
  { value: "REPORT_REJECTED", label: "Rejected" },
  { value: "REPORT_APPROVED", label: "Approved" },
  { value: "FINANCE_VERIFICATION_ACTIVATED", label: "Ready for verification" },
  { value: "VERIFICATION_QUERY_RAISED", label: "Finance query" },
  { value: "VERIFICATION_QUERY_RESOLVED", label: "Query resolved" },
  { value: "FINANCE_VERIFICATION_COMPLETED", label: "Verification completed" },
  { value: "REPORT_APPROVED_FOR_PAYMENT", label: "Ready for payment" },
  { value: "PAYMENT_COMPLETED", label: "Payment completed" },
  { value: "REPORT_INVOICE_HANDOFF", label: "Invoice handoff" },
  { value: "APPROVAL_FLOW_CHANGED", label: "Configuration changed" },
  { value: "CDC_SYNC_FAILED", label: "Sync failure" },
];

const inputCls =
  "h-9 rounded-lg border border-gray-300 bg-white px-2.5 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

/**
 * Notification Center - every notification for the signed-in user: their own plus their roles'
 * team inboxes (Finance / AP / Admin). Filter by read state, type, event, date and text; open one
 * to jump to the record it's about.
 */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("");
  const [eventType, setEventType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  const params = {
    status,
    category: category || undefined,
    eventType: eventType || undefined,
    from: from || undefined,
    to: to || undefined,
    q: q || undefined,
    page,
    size: DEFAULT_PAGE_SIZE,
  };
  const { data, isLoading, isFetching, isError, refetch } = useNotificationList(params);
  const { data: unread = 0 } = useUnreadCount();
  // Headline counts for the cards: unread action-required and failures.
  const { data: actionData } = useNotificationList({ status: "unread", category: "ACTION_REQUIRED", page: 0, size: 1 });
  const { data: failedData } = useNotificationList({ status: "unread", category: "FAILED", page: 0, size: 1 });
  const { data: doneData } = useNotificationList({ status: "all", category: "COMPLETED", page: 0, size: 1 });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const resetPage = (setter) => (value) => {
    setter(value);
    setPage(0);
  };
  const hasFilters = category || eventType || from || to || q;
  const clearFilters = () => {
    setCategory("");
    setEventType("");
    setFrom("");
    setTo("");
    setQ("");
    setPage(0);
  };

  const openNotification = (n) => {
    if (!n.read) markRead.mutate(n.notificationId);
    if (n.link) navigate(n.link);
  };

  const items = data?.content || [];

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Expense Management", to: "/expense-management/dashboard" }, { label: "Notifications" }]} />

      <PageHeader
        title="Notification Center"
        subtitle="Everything that happened in your part of the expense workflow - and what needs you next."
        actions={
          <Button variant="outline" size="small" disabled={!unread || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck size={14} className="mr-1" /> Mark all as read
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Unread" value={unread} subtitle="New since you last looked" icon={BellRing} textColor="text-indigo-700" />
        <StatCard title="Action required" value={actionData?.totalElements ?? "—"} subtitle="Unread, waiting on you" icon={AlertCircle} textColor="text-amber-700" />
        <StatCard title="Failed" value={failedData?.totalElements ?? "—"} subtitle="Unread rejections & failures" icon={XCircle} textColor="text-rose-700" />
        <StatCard title="Completed" value={doneData?.totalElements ?? "—"} subtitle="Approvals, verifications, payments" icon={CheckCircle2} textColor="text-emerald-700" />
      </div>

      <Tabs value={status} onValueChange={resetPage(setStatus)}>
        <TabsList className="h-auto flex-wrap">
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
              {t.value === "unread" && unread > 0 && <span className="ml-1.5 text-xs text-slate-400">({unread})</span>}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <FilterCard title="Filters" description="Narrow down by type, event, date or text.">
        <div className="w-full sm:max-w-xs">
          <SearchInput value={q} onSearch={(v) => resetPage(setQ)(v || "")} placeholder="Report number, person, text..." />
        </div>
        <select aria-label="Type" value={category} onChange={(e) => resetPage(setCategory)(e.target.value)} className={inputCls}>
          <option value="">All types</option>
          {Object.entries(CATEGORY_META).map(([value, m]) => (
            <option key={value} value={value}>{m.label}</option>
          ))}
        </select>
        <select aria-label="Event" value={eventType} onChange={(e) => resetPage(setEventType)(e.target.value)} className={inputCls}>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
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

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading notifications…" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
            <p className="text-sm font-semibold text-rose-700">Couldn't load notifications.</p>
            <Button size="small" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <Inbox className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">
              {hasFilters || status !== "all" ? "No notifications match these filters." : "No notifications yet."}
            </p>
            <p className="text-xs text-slate-400">They'll appear here as reports move through approval, verification and payment.</p>
          </div>
        ) : (
          <div className={`divide-y divide-slate-100 ${isFetching ? "opacity-70" : ""}`}>
            {items.map((n) => (
              <NotificationItem key={n.notificationId} notification={n} onOpen={openNotification} />
            ))}
          </div>
        )}
      </div>

      {data && (
        <div className="flex justify-center">
          <Pagination
            currentPage={page + 1}
            totalPages={data.totalPages ?? 0}
            onPrevious={() => setPage((p) => Math.max(p - 1, 0))}
            onNext={() => setPage((p) => Math.min(p + 1, (data.totalPages ?? 1) - 1))}
          />
        </div>
      )}
    </div>
  );
}
