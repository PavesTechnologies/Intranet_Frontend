import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Eye, History, Mail, RotateCcw } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import {
  fieldProblems, getEmailTemplate, getEmailTemplates, previewEmailTemplate, restoreEmailTemplate, saveEmailTemplate,
} from "../services/settingsService";
import { apiErrorMessage } from "../services/aiProviderService";

const inputClass = "w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white";

// Settings phase 1: the emails the system sends. Every save is a new version (emails already queued keep
// theirs); placeholders are checked against what the email's sender supplies; the preview uses made-up
// values and sends nothing - there is no test send.
export default function SettingsEmailTemplates() {
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [problems, setProblems] = useState({});
  const [preview, setPreview] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    getEmailTemplates().then((rows) => {
      setList(rows);
      if (rows.length) setSelected(rows[0].trigger_event);
    }).catch((error) => {
      toast.error(apiErrorMessage(error, "Couldn't load the email templates."));
      setList([]);
    });
  }, []);

  const showDetail = (data) => {
    setDetail(data);
    setForm(data.active ? { name: data.active.name, subject: data.active.subject, body: data.active.body } : null);
    setProblems({});
    setPreview(null);
  };

  useEffect(() => {
    if (!selected) return;
    setDetail(null);
    getEmailTemplate(selected).then(showDetail).catch((error) => {
      toast.error(apiErrorMessage(error, "Couldn't load the template."));
    });
  }, [selected]);

  const dirty = !!(form && detail?.active
    && (form.name !== detail.active.name || form.subject !== detail.active.subject || form.body !== detail.active.body));

  const insertPlaceholder = (name) => {
    const token = `{${name}}`;
    const el = bodyRef.current;
    setForm((f) => {
      if (!el) return { ...f, body: `${f.body}${token}` };
      const start = el.selectionStart ?? f.body.length;
      const end = el.selectionEnd ?? start;
      return { ...f, body: `${f.body.slice(0, start)}${token}${f.body.slice(end)}` };
    });
  };

  const handleProblems = (error, fallback) => {
    const perField = fieldProblems(error);
    if (perField) setProblems(perField);
    else toast.error(apiErrorMessage(error, fallback));
  };

  const runPreview = async () => {
    setBusy(true);
    try {
      setProblems({});
      setPreview(await previewEmailTemplate(selected, form));
    } catch (error) {
      handleProblems(error, "Couldn't preview the template.");
    } finally {
      setBusy(false);
    }
  };

  const reviewSave = async () => {
    setBusy(true);
    try {
      setProblems({});
      await previewEmailTemplate(selected, form);          // checks the placeholders before the confirm step
      setPending({ kind: "save" });
    } catch (error) {
      handleProblems(error, "Couldn't check the template.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      const result = pending.kind === "save"
        ? await saveEmailTemplate(selected, form)
        : await restoreEmailTemplate(selected, pending.version.id);
      showDetail(result);
      setList((rows) => rows.map((r) => (r.trigger_event === selected
        ? { ...r, active: { ...r.active, name: result.active.name, subject: result.active.subject, version: result.active.version } }
        : r)));
      toast.success(pending.kind === "save" ? `Saved as version ${result.active.version}.` : "Version restored.");
    } catch (error) {
      handleProblems(error, "Couldn't save the template.");
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  if (!list) return <LoadingSpinner text="Loading email templates..." />;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <Mail className="h-4 w-4 text-slate-500" /> Email templates
      </h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
        The wording of each email the system sends. Use only the placeholders listed for an email; write a
        literal brace as {"{{"} or {"}}"}. Each save is a new version, and emails already queued keep the version
        they were queued with. Previews use made-up values; nothing is sent from here.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 mt-4">
        <ul className="border border-slate-100 rounded-lg divide-y divide-slate-100 self-start">
          {list.map((row) => (
            <li key={row.trigger_event}>
              <button type="button" onClick={() => setSelected(row.trigger_event)}
                className={`w-full text-left px-3 py-2 text-xs ${selected === row.trigger_event ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                <div className="font-semibold text-slate-800">{row.label}</div>
                <div className="text-[10px] text-slate-500">
                  {row.audience}{row.active ? ` · v${row.active.version}` : " · no template"}
                  {!row.editable && " · not sent yet"}
                </div>
              </button>
            </li>
          ))}
        </ul>

        <div className="min-w-0">
          {!detail ? <LoadingSpinner text="Loading template..." /> : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-800">{detail.label}</span>
                <span className="text-[10px] text-slate-500">to {detail.audience}</span>
                {detail.active && <span className="text-[10px] text-slate-400">version {detail.active.version} in use</span>}
              </div>
              {!detail.editable && (
                <p className="text-[11px] text-amber-700 mb-2">Nothing sends this email yet, so it can't be edited.</p>
              )}
              {form && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-600">Name
                    <input className={inputClass} value={form.name} maxLength={255} disabled={!detail.editable || busy}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                  </label>
                  {problems.name && <p className="text-[11px] text-rose-600">{problems.name.join(" ")}</p>}
                  <label className="block text-[11px] font-semibold text-slate-600">Subject
                    <input className={inputClass} value={form.subject} maxLength={255} disabled={!detail.editable || busy}
                      onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
                  </label>
                  {problems.subject && <p className="text-[11px] text-rose-600">{problems.subject.join(" ")}</p>}
                  <label className="block text-[11px] font-semibold text-slate-600">Body (HTML)
                    <textarea ref={bodyRef} className={`${inputClass} font-mono h-64`} value={form.body}
                      disabled={!detail.editable || busy}
                      onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
                  </label>
                  {problems.body && <p className="text-[11px] text-rose-600">{problems.body.join(" ")}</p>}
                  {detail.editable && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Insert:</span>
                      {detail.placeholders.map((p) => (
                        <button key={p} type="button" disabled={busy} onClick={() => insertPlaceholder(p)}
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200">
                          {`{${p}}`}
                        </button>
                      ))}
                    </div>
                  )}
                  {detail.editable && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button variant="outline" size="small" disabled={busy} onClick={runPreview}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                      </Button>
                      <Button variant="primary" size="small" disabled={!dirty || busy} onClick={reviewSave}>
                        Save as new version
                      </Button>
                      {dirty && (
                        <Button variant="outline" size="small" disabled={busy} onClick={() => showDetail(detail)}>
                          Discard
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {preview && (
                <div className="mt-4 border border-slate-200 rounded-lg">
                  <div className="px-3 py-1.5 border-b border-slate-100 text-[11px]">
                    <span className="text-slate-500">Subject: </span>
                    <span className="font-semibold text-slate-800">{preview.subject}</span>
                    <span className="ml-2 text-[10px] text-slate-400">(sample values, not sent)</span>
                  </div>
                  <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="w-full h-80 bg-white rounded-b-lg" />
                </div>
              )}

              {detail.versions.length > 1 && (
                <div className="mt-4">
                  <h3 className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5 mb-1">
                    <History className="h-3.5 w-3.5" /> Versions
                  </h3>
                  <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                    {detail.versions.map((v) => (
                      <li key={v.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                        <span className="font-semibold text-slate-700 w-10">v{v.version}</span>
                        <span className="truncate text-slate-600 flex-1">{v.subject}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {v.created_at ? new Date(v.created_at).toLocaleString() : ""}{v.created_by ? ` · ${v.created_by}` : ""}
                        </span>
                        {v.is_active ? (
                          <span className="text-[10px] font-bold text-emerald-700">In use</span>
                        ) : detail.editable && (
                          <Button variant="outline" size="small" disabled={busy}
                            onClick={() => setPending({ kind: "restore", version: v })}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restore
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!pending}
        title={pending?.kind === "restore" ? `Use version ${pending.version.version} again?` : "Save this template?"}
        message={(() => {
          if (!pending || !detail?.active) return "";
          if (pending.kind === "restore") {
            return `It becomes the new version ${detail.versions[0].version + 1}. Emails queued from now on use it; the change is recorded in the audit log.`;
          }
          const parts = [];
          if (form.name !== detail.active.name) parts.push("name");
          if (form.subject !== detail.active.subject) parts.push(`subject: "${detail.active.subject}" → "${form.subject}"`);
          if (form.body !== detail.active.body) parts.push(`body (${detail.active.body.length} → ${form.body.length} characters)`);
          return `Changes: ${parts.join("; ")}. Saved as version ${detail.versions[0].version + 1}; emails queued from now on use it. Recorded in the audit log.`;
        })()}
        confirmText={pending?.kind === "restore" ? "Restore" : "Save"}
        variant="primary"
        isLoading={busy}
        onCancel={() => setPending(null)}
        onConfirm={confirm}
      />
    </div>
  );
}
