import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, CheckCheck, Download, Hourglass, Info, ShieldX, Undo2 } from "lucide-react";
import TableFilterBar, {
  KpiCards,
  applyTableFilters,
  distinctOptions,
  emptyFilterValues,
} from "@/pages/expense-management/components/common/TableFilterBar";
import { useEmployeeDirectory } from "@/pages/expense-management/approval-engine/hooks/useEmployeeDirectory";
import { itcRegisterApi } from "./reportsApi";
import { ITC_PERIODS, READINESS, itcCsv, itcPeriodRange, readinessOf, summarizeItc } from "./itcRegister";

/**
 * ITC Register (Finance): every expense line with GST in the chosen period (by expense date), showing how much input
 * tax credit it carries and whether it is ready to go into the GST return. Export gives the tax team the same rows
 * as a CSV for the GSTR-2B check and GSTR-3B Table 4(A)(5). The claim itself is filed outside, on the GST portal under the
 * company GSTIN; "Mark as claimed" records here which return it went into, so nothing is claimed twice.
 * Data: GET /xms/reports/tax/itc-register, POST .../claim and .../unclaim.
 */
const monthOf = (isoDate) => (isoDate || "").slice(0, 7);
const errorText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

const num = (v) => Number(v) || 0;
const money = (v, cur = "INR") => `${cur} ${num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");

const READINESS_OPTIONS = [
  { label: "All lines", value: "" },
  ...Object.entries(READINESS).map(([value, r]) => ({ label: r.label, value })),
];

function ReadinessBadge({ line }) {
  const r = READINESS[readinessOf(line)];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${r.tone}`}>{r.label}</span>;
}

function download(name, text) {
  const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ItcRegisterPage() {
  const [period, setPeriod] = useState("THIS_MONTH");
  const [custom, setCustom] = useState(() => itcPeriodRange("THIS_MONTH"));
  const range = period === "CUSTOM" ? custom : itcPeriodRange(period);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["xmsItcRegister", range.from, range.to],
    queryFn: () => itcRegisterApi.get(range).then((r) => r.data?.data),
    enabled: Boolean(range.from && range.to),
    staleTime: 60_000,
  });
  const { data: directory } = useEmployeeDirectory();
  const nameOf = (id) => directory?.get?.(id)?.name || directory?.get?.(String(id))?.name || "";
  const cur = data?.currency || "INR";
  const lines = useMemo(() => data?.lines || [], [data]);

  const filters = useMemo(
    () => [
      {
        key: "search",
        label: "Search",
        type: "search",
        placeholder: "Report, merchant, employee or GSTIN",
        match: (l, v) =>
          `${l.reportNumber || ""} ${l.merchantName || ""} ${l.employeeId || ""} ${nameOf(l.employeeId)} ${l.supplierGstin || ""}`
            .toLowerCase()
            .includes(v.trim().toLowerCase()),
      },
      { key: "readiness", label: "Claim status", type: "select", options: READINESS_OPTIONS, match: (l, v) => readinessOf(l) === v },
      { key: "taxCode", label: "Tax code", type: "select", options: distinctOptions(lines, (l) => l.taxCode, "All tax codes"), match: (l, v) => l.taxCode === v },
      { key: "category", label: "Category", type: "select", options: distinctOptions(lines, (l) => l.categoryName, "All categories"), match: (l, v) => l.categoryName === v },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, directory],
  );
  const [values, setValues] = useState(() => emptyFilterValues([{ key: "search" }, { key: "readiness" }, { key: "taxCode" }, { key: "category" }]));
  const shown = useMemo(() => applyTableFilters(lines, filters, values), [lines, filters, values]);
  const s = summarizeItc(shown);

  // Claiming: pick Ready lines, choose the GSTR-3B month they were claimed in, record it.
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState([]);
  const [returnPeriod, setReturnPeriod] = useState(() => monthOf(range.to));
  const [note, setNote] = useState("");
  const [message, setMessage] = useState(null);
  const readyShown = shown.filter((l) => readinessOf(l) === "READY");
  const picked = readyShown.filter((l) => selected.includes(l.lineItemId));
  const pickedTotal = picked.reduce((t, l) => t + num(l.recoverableTaxAmount), 0);
  const toggle = (id) => setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  const allPicked = readyShown.length > 0 && picked.length === readyShown.length;
  const done = (text) => {
    setMessage({ tone: "ok", text });
    setSelected([]);
    setNote("");
    queryClient.invalidateQueries({ queryKey: ["xmsItcRegister"] });
  };
  const claim = useMutation({
    mutationFn: () => itcRegisterApi.claim({ lineItemIds: picked.map((l) => l.lineItemId), returnPeriod, note }),
    onSuccess: () => done(`${picked.length} line${picked.length === 1 ? "" : "s"} (${money(pickedTotal, cur)}) recorded as claimed in GSTR-3B ${returnPeriod}.`),
    onError: (e) => setMessage({ tone: "error", text: errorText(e, "Could not record the claim.") }),
  });
  const unclaim = useMutation({
    mutationFn: ({ line, reason }) => itcRegisterApi.unclaim({ lineItemIds: [line.lineItemId], note: reason }),
    onSuccess: () => done("Claim undone. The line is ready to claim again."),
    onError: (e) => setMessage({ tone: "error", text: errorText(e, "Could not undo the claim.") }),
  });
  const undo = (line) => {
    const reason = window.prompt(`Undo the claim of ${line.reportNumber} (GSTR-3B ${line.itcClaimPeriod})? Give a reason:`);
    if (reason && reason.trim()) unclaim.mutate({ line, reason: reason.trim() });
  };

  const cards = [
    { key: "claimed", icon: CheckCheck, tone: "bg-indigo-50 text-indigo-600", label: "Claimed", value: money(s.claimed, cur),
      hint: s.claimedCount ? `${s.claimedCount} line${s.claimedCount === 1 ? "" : "s"} recorded in a GST return` : "Nothing recorded yet" },
    { key: "ready", icon: BadgeCheck, tone: "bg-emerald-50 text-emerald-600", label: "Ready to claim", value: money(s.ready, cur),
      hint: s.readyCount ? `${s.readyCount} line${s.readyCount === 1 ? "" : "s"} · verified with GSTIN` : "Nothing ready yet" },
    { key: "awaiting", icon: Hourglass, tone: "bg-amber-50 text-amber-600", label: "Awaiting Finance", value: money(s.awaiting, cur),
      hint: s.awaitingCount ? `${s.awaitingCount} line${s.awaitingCount === 1 ? "" : "s"} to verify first` : "Nothing waiting" },
    { key: "noGstin", icon: AlertTriangle, tone: "bg-rose-50 text-rose-600", label: "Blocked: GSTIN missing", value: money(s.noGstin, cur),
      hint: s.noGstinCount ? `${s.noGstinCount} verified line${s.noGstinCount === 1 ? "" : "s"} without a supplier GSTIN` : "Every verified line has a GSTIN" },
    { key: "lost", icon: ShieldX, tone: "bg-slate-100 text-slate-600", label: "Not recoverable", value: money(s.lost, cur),
      hint: "GST that is a cost (ITC % is 0)" },
  ];

  // While loading, no figures: zeros would read as "nothing to claim".
  const shownCards = isLoading ? cards.map((c) => ({ ...c, value: "…", hint: "Loading" })) : cards;

  const exportCsv = () => download(`itc-register_${range.from}_to_${range.to}.csv`, itcCsv(shown, nameOf));

  return (
    <div className="space-y-4 p-4 sm:p-6" data-itc-register>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0a174e]">ITC Register</h1>
          <p className="mt-0.5 max-w-3xl text-sm text-slate-500">
            GST on employee expenses and how much the company can claim back as input tax credit. Only lines that are{" "}
            <b>ready to claim</b> go into the GST return.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!shown.length}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#0A0082] px-4 text-sm font-semibold text-white hover:bg-[#0A0082]/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} aria-hidden="true" /> Export for GST return
        </button>
      </div>

      {/* Period: by expense date, in GST-return terms */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Period" className="flex flex-wrap gap-1.5">
          {ITC_PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-pressed={period === p.key}
              data-itc-period={p.key}
              onClick={() => {
                if (p.key === "CUSTOM") setCustom(range);
                setPeriod(p.key);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                period === p.key ? "bg-[#0A0082] text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === "CUSTOM" ? (
          <div className="flex items-center gap-2 text-sm">
            <input type="date" aria-label="From" value={custom.from} max={custom.to || undefined}
              onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
              className="h-9 rounded-lg border border-gray-300 px-2 text-[13px]" />
            <span className="text-slate-400">to</span>
            <input type="date" aria-label="To" value={custom.to} min={custom.from || undefined}
              onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
              className="h-9 rounded-lg border border-gray-300 px-2 text-[13px]" />
          </div>
        ) : (
          <p className="text-xs text-slate-500" data-itc-range>
            Expense dates {fmtDate(range.from)} – {fmtDate(range.to)}
          </p>
        )}
      </div>

      {isError ? (
        <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error?.response?.status === 403 ? "Only Finance and Admin can see the ITC register." : "Couldn't load the ITC register."}
          <button type="button" onClick={() => refetch()} className="font-semibold underline">Retry</button>
        </div>
      ) : (
        <>
          <KpiCards cards={shownCards} />

          <TableFilterBar
            filters={filters}
            values={values}
            onChange={setValues}
            onReset={() => setValues(emptyFilterValues(filters))}
            resultCount={shown.length}
            totalCount={lines.length}
            noun="lines"
          />

          {message && (
            <div role={message.tone === "error" ? "alert" : "status"} data-itc-message
              className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-2.5 text-sm ${
                message.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"
              }`}>
              <span>{message.text}</span>
              <button type="button" onClick={() => setMessage(null)} className="text-xs font-semibold underline">Dismiss</button>
            </div>
          )}

          {readyShown.length > 0 && (
            <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 lg:flex-row lg:items-end lg:justify-between" data-itc-claim-bar>
              <div className="text-sm text-slate-700">
                <p className="font-semibold text-[#0a174e]">
                  {picked.length ? `${picked.length} selected · ${money(pickedTotal, cur)}` : "Select the lines you claimed on the GST portal"}
                </p>
                <p className="text-xs text-slate-500">File the claim on the GST portal first, then record it here with the return month.</p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-xs font-medium text-slate-600">
                  GSTR-3B month
                  <input type="month" value={returnPeriod} onChange={(e) => setReturnPeriod(e.target.value)} aria-label="GSTR-3B month"
                    className="mt-1 block h-9 rounded-lg border border-gray-300 bg-white px-2 text-[13px]" />
                </label>
                <label className="text-xs font-medium text-slate-600">
                  Note (optional)
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. ARN of the return" aria-label="Claim note"
                    className="mt-1 block h-9 w-52 rounded-lg border border-gray-300 bg-white px-2 text-[13px]" />
                </label>
                <button type="button" onClick={() => claim.mutate()} disabled={!picked.length || !returnPeriod || claim.isPending}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                  <CheckCheck size={15} aria-hidden="true" /> {claim.isPending ? "Saving…" : "Mark as claimed"}
                </button>
              </div>
            </div>
          )}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {isLoading ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">Loading the ITC register…</p>
            ) : !shown.length ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">
                {lines.length ? "No lines match these filters." : "No expense lines with GST in this period."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[68rem] text-sm">
                  <caption className="sr-only">ITC register lines</caption>
                  <thead className="bg-slate-50 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="w-10 px-3 py-2.5">
                        <input type="checkbox" aria-label="Select all lines ready to claim" disabled={!readyShown.length} checked={allPicked}
                          onChange={() => setSelected(allPicked ? [] : readyShown.map((l) => l.lineItemId))} />
                      </th>
                      {["Expense date", "Report", "Employee", "Merchant · category", "Tax code", "Supplier GSTIN"].map((h) => (
                        <th key={h} scope="col" className="whitespace-nowrap px-3 py-2.5 text-left">{h}</th>
                      ))}
                      {["GST", "ITC %", "Recoverable", "Not recoverable"].map((h) => (
                        <th key={h} scope="col" className="whitespace-nowrap px-3 py-2.5 text-right">{h}</th>
                      ))}
                      <th scope="col" className="whitespace-nowrap px-3 py-2.5 text-left">Claim status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {shown.map((l) => (
                      <tr key={l.lineItemId} data-itc-line={l.lineItemId}>
                        <td className="px-3 py-2.5">
                          {readinessOf(l) === "READY" && (
                            <input type="checkbox" aria-label={`Select ${l.reportNumber} ${l.merchantName || ""}`.trim()}
                              checked={selected.includes(l.lineItemId)} onChange={() => toggle(l.lineItemId)} />
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{fmtDate(l.expenseDate)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[12px] text-[#0a174e]">{l.reportNumber}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className="text-slate-800">{nameOf(l.employeeId) || l.employeeId}</span>
                          {nameOf(l.employeeId) && <span className="ml-1.5 text-[11px] text-slate-400">{l.employeeId}</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="block max-w-[14rem] truncate text-slate-800" title={l.merchantName}>{l.merchantName || "Merchant not given"}</span>
                          <span className="text-[11px] text-slate-400">{l.categoryName}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{l.taxCode || "No tax code"}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          {l.supplierGstin ? (
                            <span className="font-mono text-[12px] text-slate-700">{l.supplierGstin}</span>
                          ) : num(l.recoverableTaxAmount) > 0 ? (
                            <span className="text-[12px] font-semibold text-rose-600">Not captured</span>
                          ) : (
                            <span className="text-[12px] text-slate-400">Not needed</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-800">{num(l.taxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">{num(l.itcRecoverablePercent)}%</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-emerald-700">{num(l.recoverableTaxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-500">{num(l.nonRecoverableTaxAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <ReadinessBadge line={l} />
                          {l.itcClaimPeriod && (
                            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500">
                              GSTR-3B {l.itcClaimPeriod}
                              <button type="button" onClick={() => undo(l)} aria-label={`Undo claim of ${l.reportNumber}`}
                                className="inline-flex items-center gap-0.5 font-semibold text-slate-500 hover:text-rose-600">
                                <Undo2 size={11} aria-hidden="true" /> Undo
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50/70 font-semibold text-[#0a174e]">
                    <tr>
                      <td className="px-3 py-2.5" colSpan={7}>Total GST · {shown.length} line{shown.length === 1 ? "" : "s"}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{s.tax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2.5" />
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-emerald-700">{s.recoverable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{s.lost.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      <td className="px-3 py-2.5" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>

          <div className="flex gap-2 rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-xs leading-relaxed text-slate-600">
            <Info size={15} className="mt-0.5 shrink-0 text-sky-600" aria-hidden="true" />
            <p>
              <b>How to claim:</b> export the <b>Ready to claim</b> lines, check each invoice appears in the company's GSTR-2B, then
              claim the total in GSTR-3B, Table 4(A)(5) "All other ITC". Only invoices billed to the company's GSTIN can be claimed,
              and blocked credits (for example food and beverages) cannot. Amounts are in {cur}.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
