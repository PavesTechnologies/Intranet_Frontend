// What is waiting on the TDS challans page: TDS deducted but not yet on a challan (by the month it is
// due by the 7th), and deposited TDS not yet in a quarterly statement (by quarter). Each links to the
// Record challan / Record filing page opened on that month or quarter.
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { CalendarClock, Landmark } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { AP_ROUTES } from "../../constants/routes";
import { usePendingTds } from "../hooks/useTdsChallans";
import { fmtDate, money } from "./TdsDocumentParts";

const monthLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

function DueText({ overdue, daysLeft, dueDate }) {
  if (overdue) return <span className="font-semibold text-rose-700">Overdue since {fmtDate(dueDate)}</span>;
  return (
    <span className={clsx(daysLeft <= 7 ? "font-semibold text-amber-700" : "text-slate-600")}>
      Due {fmtDate(dueDate)} · {daysLeft === 0 ? "today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`}
    </span>
  );
}

function Row({ icon: Icon, title, detail, due, action }) {
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Icon className="h-5 w-5 shrink-0 text-[#0A0082]" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{detail} · {due}</p>
      </div>
      {action}
    </li>
  );
}

export default function PendingTdsStrip({ canUpdate }) {
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePendingTds();
  if (isLoading || isError || !data) return null;
  const { deposits = [], filings = [] } = data;

  return (
    <section aria-labelledby="pending-tds-title" className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <h2 id="pending-tds-title" className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
        Waiting to be deposited or filed
      </h2>
      {deposits.length === 0 && filings.length === 0 ? (
        <p className="px-4 py-4 text-sm text-slate-500">Nothing pending - every deducted TDS is deposited and every deposit is filed.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {deposits.map((d) => (
            <Row
              key={`d-${d.due_date}`}
              icon={Landmark}
              title={`To deposit: ${money(d.total_tds)} - ${d.period ? `${monthLabel(d.period)} TDS` : "TDS deducted"}`}
              detail={`${d.invoices} invoice${d.invoices === 1 ? "" : "s"}${d.sections?.length ? ` · sections ${d.sections.join(", ")}` : ""}`}
              due={<DueText overdue={d.overdue} daysLeft={d.days_left} dueDate={d.due_date} />}
              action={canUpdate && (
                <Button size="small" variant="primary" onClick={() => navigate(`${AP_ROUTES.TDS_CHALLAN_NEW}${d.period ? `?period=${d.period.slice(0, 7)}` : ""}`)}>
                  Record challan
                </Button>
              )}
            />
          ))}
          {filings.map((f) => (
            <Row
              key={`f-${f.financial_year}-${f.quarter}`}
              icon={CalendarClock}
              title={`To file: Q${f.quarter} ${f.financial_year} statement (26Q) - ${money(f.total_tds)} deposited`}
              detail={`${f.invoices} invoice${f.invoices === 1 ? "" : "s"} · ${fmtDate(f.period_start)} – ${fmtDate(f.period_end)}${f.open ? " · quarter still running" : ""}`}
              due={<DueText overdue={f.overdue} daysLeft={f.days_left} dueDate={f.due_date} />}
              action={canUpdate && !f.open && (
                <Button size="small" variant="outline" onClick={() => navigate(`${AP_ROUTES.TDS_FILING_NEW}?fy=${f.financial_year}&quarter=${f.quarter}`)}>
                  Record filing
                </Button>
              )}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
