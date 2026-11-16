import { useCallback, useState } from "react";
import { asId } from "../constants/vendorOnboarding";

/**
 * Unsaved-edit state for the NDA editor, layered over the content the backend holds.
 *
 * The persisted content (GET /apm/nda/{nda_id} → `content`) is the source of truth; this hook
 * only tracks the edits that have not been saved back through PUT /apm/nda/{nda_id}/content
 * yet. Nothing is kept in browser storage — an unsaved edit is exactly that, and POST
 * /send delivers whatever the backend last persisted.
 *
 * Three rules drive the whole thing:
 *
 *  1. **Never overwrite live edits.** A background refetch is adopted only while the editor
 *     is clean. Once the user has typed, the server copy is ignored until they save or
 *     explicitly reload.
 *  2. **Save against the version the edits were based on.** `baseVersion` is snapshotted when
 *     content is adopted, not read live from the query — otherwise a background refetch would
 *     silently advance the version and the save would clobber someone else's change instead
 *     of getting the 409 that protects it.
 *  3. **Remount the editor only when its DOM is genuinely out of date.** `epoch` bumps on an
 *     NDA change or an adopted/reloaded server copy, never on a save, so saving does not move
 *     the caret. The editor keys off `epoch` (see NdaDocumentEditor's `documentKey`).
 *
 * @param {{ ndaId:number|string|null, serverContent?:string|null,
 *   serverVersion?:number|null, fallbackContent?:string|null }} params
 */
export function useNdaDraft({ ndaId, serverContent, serverVersion, fallbackContent } = {}) {
  const key = asId(ndaId);

  // The server state the current edits are based on.
  const baseline = () => ({
    key,
    content: serverContent ?? fallbackContent ?? "",
    version: serverVersion ?? null,
  });

  const [base, setBase] = useState(() => ({ ...baseline(), epoch: 0 }));
  const [localHtml, setLocalHtml] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  // Set by reloadLatest(); consumed below once the refetched copy is in hand.
  const [pendingReload, setPendingReload] = useState(false);
  // True between a successful save and the moment the query catches up with it.
  const [awaitingRefetch, setAwaitingRefetch] = useState(false);

  const nextContent = serverContent ?? fallbackContent ?? "";
  const nextVersion = serverVersion ?? null;

  /**
   * A save invalidates the detail query, but the *stale* cached copy is still what the hook
   * reads until the refetch lands. Adopting it would throw away the text that was just saved
   * and roll the version back, so adoption is suspended until the server copy catches up —
   * either its text matches what we saved, or its version has reached ours.
   */
  const serverHasCaughtUp =
    nextContent === base.content ||
    (base.version !== null && nextVersion !== null && nextVersion >= base.version);
  const ignoreServerCopy = awaitingRefetch && !serverHasCaughtUp;

  // Derive-during-render rather than an effect, so the editor never renders one frame of the
  // wrong NDA's text.
  if (awaitingRefetch && serverHasCaughtUp) {
    setAwaitingRefetch(false);
  }

  if (pendingReload) {
    // Adopt the server copy unconditionally, including when its text happens to match the
    // baseline — the editor's DOM still holds the discarded edits, so it must be remounted.
    setPendingReload(false);
    setBase({ ...baseline(), epoch: base.epoch + 1 });
    setLocalHtml(null);
    setIsDirty(false);
  } else if (base.key !== key) {
    // A different NDA (including one that has only just been generated) — start clean.
    setBase({ ...baseline(), epoch: base.epoch + 1 });
    setLocalHtml(null);
    setIsDirty(false);
  } else if (ignoreServerCopy) {
    // Our own save is still in flight through the cache — leave the baseline alone.
  } else if (!isDirty && nextContent !== base.content) {
    // Clean editor, newer server copy: adopt it. This is the only path by which a refetch
    // changes what is on screen.
    setBase({ ...baseline(), epoch: base.epoch + 1 });
    setLocalHtml(null);
  } else if (!isDirty && nextVersion !== null && nextVersion !== base.version) {
    // Same text, new version (typically the refetch that follows our own save) — take the
    // version without remounting the editor.
    setBase((previous) => ({ ...previous, version: nextVersion }));
  }

  const setWorkingHtml = useCallback(
    (html) => {
      setLocalHtml(html);
      // Editing back to the saved text is not a change worth saving.
      setIsDirty(html !== base.content);
    },
    [base.content],
  );

  /** Called after PUT /content succeeds. `version` may be null — the refetch then supplies it. */
  const markSaved = useCallback((savedHtml, version) => {
    setBase((previous) => ({
      ...previous,
      content: savedHtml,
      version: version ?? previous.version,
    }));
    setLocalHtml(null);
    setIsDirty(false);
    setAwaitingRefetch(true);
  }, []);

  /**
   * Explicitly replace local edits with the server copy. Only ever called from the user's own
   * "Reload Latest" — this is the one action allowed to discard edits.
   *
   * It takes no content: the caller refetches first, and this adopts whatever the query then
   * holds. Passing content in would let the hook and the query disagree about what "latest"
   * means, which is exactly the confusion the reload exists to end.
   */
  const reloadLatest = useCallback(() => setPendingReload(true), []);

  return {
    /** What the editor shows and what a save sends. */
    currentHtml: localHtml ?? base.content,
    /** The version the current edits are based on — sent with the save. */
    baseVersion: base.version,
    /** Changes identity only when the editor's DOM must be replaced. */
    contentKey: `${key ?? "none"}:${base.epoch}`,
    isDirty,
    setWorkingHtml,
    markSaved,
    reloadLatest,
  };
}

export default useNdaDraft;
