import React, { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Check, MessageSquare, Pencil, Trash2, X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import {
  addCandidateNote,
  deleteCandidateNote,
  getCandidateNotes,
  updateCandidateNote,
} from "../services/candidateActionsService";

const fmt = (iso) => {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

/**
 * Recruiter notes on one candidate.
 * Editing and deleting are only offered on your own notes; the server enforces
 * the same rule, so a hidden button is a convenience, not the control.
 */
export default function CandidateNotesPanel({ campaignCandidateId, currentUserId, onCountChange }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => {
    if (!campaignCandidateId) return;
    setLoading(true);
    setError(false);
    try {
      const data = await getCandidateNotes(campaignCandidateId);
      setNotes(data);
      onCountChange?.(data.length);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [campaignCandidateId, onCountChange]);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const text = draft.trim();
    if (!text) return;
    setSaving(true);
    try {
      await addCandidateNote(campaignCandidateId, text);
      setDraft("");
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not add the note.");
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (noteId) => {
    const text = editText.trim();
    if (!text) return;
    try {
      await updateCandidateNote(noteId, text);
      setEditingId(null);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update the note.");
    }
  };

  const remove = async (noteId) => {
    try {
      await deleteCandidateNote(noteId);
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the note.");
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
        <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
        Recruiter Notes
        {notes.length > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {notes.length}
          </span>
        )}
      </h3>

      <div className="flex items-start gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Add a note about this candidate…"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <Button variant="primary" size="small" onClick={add}
          disabled={!draft.trim()} loading={saving} loadingText="Saving...">
          Add
        </Button>
      </div>

      {loading && <div className="py-4 flex justify-center"><LoadingSpinner text="Loading notes..." /></div>}

      {!loading && error && (
        <div className="text-[11px] text-slate-500 py-3 text-center">
          Notes could not be loaded.{" "}
          <button type="button" onClick={load} className="text-indigo-600 font-semibold hover:underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && notes.length === 0 && (
        <p className="text-[11px] text-slate-400 py-3 text-center">
          No notes yet. Anything you add here is visible to the hiring team.
        </p>
      )}

      {!loading && !error && notes.map((n) => {
        const mine = n.created_by === currentUserId;
        return (
          <div key={n.id} className="border border-slate-200 rounded-lg p-2.5">
            {editingId === n.id ? (
              <div className="space-y-2">
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={2}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs resize-none
                             focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="flex justify-end gap-1.5">
                  <button type="button" onClick={() => setEditingId(null)}
                    className="p-1 text-slate-400 hover:text-slate-600" title="Cancel">
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => saveEdit(n.id)} disabled={!editText.trim()}
                    className="p-1 text-emerald-600 hover:text-emerald-700 disabled:opacity-40" title="Save">
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{n.note_text}</p>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-400">
                    {n.created_by_name} · {fmt(n.created_at)}
                    {n.is_edited && " · edited"}
                  </span>
                  {mine && (
                    <div className="flex items-center gap-1">
                      <button type="button" title="Edit"
                        onClick={() => { setEditingId(n.id); setEditText(n.note_text); }}
                        className="p-1 text-slate-400 hover:text-indigo-600">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button type="button" title="Delete" onClick={() => remove(n.id)}
                        className="p-1 text-slate-400 hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
