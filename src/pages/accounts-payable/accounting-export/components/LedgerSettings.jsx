import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { getApiErrorMessage } from "../../utils/apiError";
import { useLedgers, useUpdateLedgers } from "../hooks/useAccountingExport";

const input = "h-8 w-full rounded-md border border-slate-300 px-2 text-xs disabled:bg-slate-50 disabled:text-slate-500";

/** Ledger names exactly as they are in Tally / Zoho Books - the import matches ledgers by name. */
export default function LedgerSettings({ canEdit }) {
  const { data, isLoading } = useLedgers();
  const save = useUpdateLedgers();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  useEffect(() => {
    if (data) {
      setDraft({
        company: data.company,
        ledgers: Object.fromEntries(data.ledgers.map((l) => [l.key, l.name])),
        categories: Object.fromEntries(data.categories.map((c) => [c.category_id, c.name])),
      });
    }
  }, [data]);

  const blank = draft && [...Object.values(draft.ledgers), ...Object.values(draft.categories)].some((v) => !v.trim());

  const submit = async () => {
    try {
      await save.mutateAsync(draft);
      toast.success("Ledger names saved.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save the ledger names."));
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <BookOpen className="h-4 w-4" aria-hidden /> Ledger names
          <span className="font-normal text-slate-500">· as they are in your books (vendor ledger = vendor name)</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" aria-hidden /> : <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden />}
      </button>
      {open && (isLoading || !draft ? (
        <p className="px-4 pb-4 text-xs text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-4 border-t border-slate-100 px-4 py-4">
          <label className="block max-w-md text-xs text-slate-600">
            Tally company name <span className="text-slate-400">(blank = the company open in Tally)</span>
            <input className={input} aria-label="Tally company name" value={draft.company} disabled={!canEdit}
              onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.ledgers.map((l) => (
              <label key={l.key} className="block text-xs text-slate-600">
                {l.label} <span className="text-slate-400">· {l.group}</span>
                <input className={input} aria-label={l.label} value={draft.ledgers[l.key]} disabled={!canEdit}
                  onChange={(e) => setDraft({ ...draft, ledgers: { ...draft.ledgers, [l.key]: e.target.value } })} />
              </label>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Expense ledger per purchase category</h3>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.categories.map((c) => (
                <label key={c.category_id} className="block text-xs text-slate-600">
                  {c.category}
                  <input className={input} aria-label={`Expense ledger for ${c.category}`} value={draft.categories[c.category_id]} disabled={!canEdit}
                    onChange={(e) => setDraft({ ...draft, categories: { ...draft.categories, [c.category_id]: e.target.value } })} />
                </label>
              ))}
            </div>
          </div>
          {canEdit && (
            <div className="flex items-center gap-3">
              <Button size="small" variant="primary" onClick={submit} loading={save.isPending} disabled={blank}>Save ledger names</Button>
              {blank && <span className="text-xs text-rose-600">Ledger names cannot be blank.</span>}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
