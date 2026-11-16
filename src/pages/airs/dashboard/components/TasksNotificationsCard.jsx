import React, { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, UserPlus, Clock } from "lucide-react";
import { getDashboardNotifications } from "../services/dashboardService";
import { formatApiError } from "../../campaigns/services/campaignservice";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import StateMessage from "./StateMessage";

// event_type is a free-form audit-log event name (e.g. CANDIDATE_FLAGGED,
// CAMPAIGN_CLOSED, JD_APPROVED) — classify by keyword rather than an exact
// enum match, since the backend doesn't publish a fixed list of values.
const classify = (eventType = "") => {
    const t = eventType.toUpperCase();
    if (/(FLAG|DUPLICATE|STALL|OVERDUE|WARN)/.test(t)) return { icon: AlertTriangle, color: "bg-amber-50 text-amber-600" };
    if (/(APPROV|PUBLISH|SELECT|COMPLETE|CLOS)/.test(t)) return { icon: CheckCircle2, color: "bg-emerald-50 text-emerald-600" };
    if (/(CANDIDATE|RESUME|UPLOAD)/.test(t)) return { icon: UserPlus, color: "bg-blue-50 text-blue-600" };
    return { icon: Clock, color: "bg-indigo-50 text-indigo-600" };
};

export default function TasksNotificationsCard() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [errorDetail, setErrorDetail] = useState("");

    const load = useCallback(async () => {
        setIsLoading(true);
        setHasError(false);
        try {
            const res = await getDashboardNotifications(6);
            // Matches NotificationsFeedResponse: { items: [NotificationItemResponse] }
            setItems(res?.data?.items || []);
        } catch (error) {
            setHasError(true);
            setItems([]);
            const status = error?.response?.status;
            setErrorDetail(`${status ? `${status}: ` : ""}${formatApiError(error, "Unknown error")}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return (
        <PageCard className="h-full">
        <PageCardContent>
            <h3 className="font-bold text-sm text-slate-900 mb-3">Tasks &amp; notifications</h3>

            {isLoading ? (
                <div className="space-y-2.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-7 bg-slate-100 rounded animate-pulse" />
                    ))}
                </div>
            ) : hasError ? (
                <StateMessage variant="error" title="Couldn't load notifications." detail={errorDetail} onRetry={load} />
            ) : items.length === 0 ? (
                <StateMessage variant="empty" title="Nothing to show right now." />
            ) : (
                <div className="space-y-2.5">
                    {items.map((n) => {
                        const { icon: Icon, color } = classify(n.event_type);
                        return (
                            <div key={n.id} className="flex items-start gap-2.5">
                                <div className={`flex h-6 w-6 items-center justify-center rounded-lg shrink-0 ${color}`}>
                                    <Icon className="h-3 w-3" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-slate-700 leading-snug">{n.message}</p>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                        {n.actor_name}{n.actor_name && n.created_at ? " · " : ""}
                                        {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ""}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </PageCardContent>
        </PageCard>
    );
}
