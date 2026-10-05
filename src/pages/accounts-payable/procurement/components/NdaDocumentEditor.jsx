import { useCallback, useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";

/**
 * The editable NDA document surface.
 *
 * Uses contentEditable + document.execCommand, the same rich-text approach already used in
 * EmployeeProfileView.jsx — no editor library is bundled for this. It is deliberately a small
 * formatting toolbar over a document page, not a word processor.
 *
 * The document is only mounted from `initialHtml` once per NDA (keyed by `documentKey`).
 * Re-writing innerHTML on every render would move the caret to the start of the document on
 * each keystroke, so edits are read out of the DOM via `onChange` instead of being driven
 * back in as props.
 *
 * System-populated fields carry contenteditable="false" (see ndaDocument.js), so the vendor
 * and PR identity in the document cannot be edited away while the rest of the text stays
 * freely editable.
 *
 * @param {{ initialHtml:string, documentKey:string|number, readOnly?:boolean,
 *   onChange?:(html:string)=>void }} props
 */
export default function NdaDocumentEditor({
  initialHtml,
  documentKey,
  readOnly = false,
  onChange,
}) {
  const editorRef = useRef(null);
  const mountedKeyRef = useRef(null);

  // Mount the document once per NDA. Remounting on every `initialHtml` identity change would
  // discard in-progress edits and reset the caret.
  useEffect(() => {
    if (!editorRef.current) return;
    if (mountedKeyRef.current === documentKey) return;

    editorRef.current.innerHTML = initialHtml || "";
    mountedKeyRef.current = documentKey;
  }, [initialHtml, documentKey]);

  const emitChange = useCallback(() => {
    if (onChange && editorRef.current) onChange(editorRef.current.innerHTML);
  }, [onChange]);

  const exec = useCallback(
    (command, value = null) => {
      if (readOnly) return;
      // Keep the selection inside the document when the command is fired from a toolbar button.
      editorRef.current?.focus();
      document.execCommand(command, false, value);
      emitChange();
    },
    [readOnly, emitChange],
  );

  const TOOLBAR_GROUPS = [
    [
      { command: "bold", icon: Bold, label: "Bold" },
      { command: "italic", icon: Italic, label: "Italic" },
      { command: "underline", icon: Underline, label: "Underline" },
    ],
    [
      { command: "justifyLeft", icon: AlignLeft, label: "Align left" },
      { command: "justifyCenter", icon: AlignCenter, label: "Align center" },
      { command: "justifyRight", icon: AlignRight, label: "Align right" },
      { command: "justifyFull", icon: AlignJustify, label: "Justify" },
    ],
    [
      { command: "insertUnorderedList", icon: List, label: "Bulleted list" },
      { command: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
    ],
    [
      { command: "undo", icon: Undo2, label: "Undo" },
      { command: "redo", icon: Redo2, label: "Redo" },
    ],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <style>{`
        .nda-document {
          font-family: Georgia, "Times New Roman", serif;
          color: #1f2937;
          font-size: 0.95rem;
          line-height: 1.75;
          /* Left-aligned, not justified: justification on a narrow measure opens uneven
             word gaps down the page, which is the ragged "zigzag" this replaces. */
          text-align: left;
        }
        .nda-document > *:first-child { margin-top: 0; }
        .nda-document > *:last-child { margin-bottom: 0; }
        .nda-document h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0 0 1.5rem;
          letter-spacing: 0.04em;
          line-height: 1.3;
        }
        .nda-document h2 {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 2rem 0 0.6rem;
          line-height: 1.4;
        }
        .nda-document h3 { font-size: 1rem; font-weight: 700; margin: 1.4rem 0 0.5rem; }
        .nda-document p { margin: 0 0 0.85rem; }
        .nda-document ol, .nda-document ul { margin: 0 0 1rem; padding-left: 1.75rem; }
        .nda-document ol { list-style: decimal outside; }
        .nda-document ul { list-style: disc outside; }
        .nda-document li { margin-bottom: 0.45rem; padding-left: 0.25rem; }
        .nda-document strong { font-weight: 700; }
        /* Signature lines are consecutive paragraphs, not <br>-separated text, so they
           stay editable as discrete blocks and keep their own spacing. */
        .nda-document .nda-sign-line { margin: 0 0 0.3rem; }
        .nda-document:focus { outline: none; }

        /* System-populated: authoritative, locked. */
        .nda-field-system {
          background: #eff6ff;
          border-bottom: 1px solid #bfdbfe;
          border-radius: 2px;
          padding: 0 3px;
          color: #1e3a8a;
          font-weight: 600;
          cursor: default;
          user-select: none;
        }
        /* Editable: the user is expected to write here. */
        .nda-field-editable {
          background: #fffbeb;
          border-bottom: 1px solid #fde68a;
          border-radius: 2px;
          padding: 0 3px;
          color: #92400e;
        }
        .nda-field-editable--empty { font-style: italic; color: #b45309; }
      `}</style>

      {!readOnly && (
        <div className="flex shrink-0 flex-wrap items-center gap-1 rounded-t-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
          {TOOLBAR_GROUPS.map((group, groupIndex) => (
            <div key={group[0].command} className="flex items-center gap-1">
              {groupIndex > 0 && <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />}
              {group.map(({ command, icon: Icon, label }) => (
                <button
                  key={command}
                  type="button"
                  title={label}
                  aria-label={label}
                  // onMouseDown + preventDefault keeps the document selection alive; a plain
                  // onClick would blur the editor first and the command would apply to nothing.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    exec(command);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-white hover:text-[#0A0082]"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          ))}

          <span className="mx-1 h-5 w-px bg-gray-200" aria-hidden="true" />

          <select
            aria-label="Paragraph style"
            defaultValue=""
            onChange={(event) => {
              if (!event.target.value) return;
              exec("formatBlock", event.target.value);
              event.target.value = "";
            }}
            className="h-7 rounded-md border border-gray-200 bg-white px-1.5 text-xs text-gray-600 focus:border-[#0A0082] focus:outline-none"
          >
            <option value="">Style</option>
            <option value="h1">Title</option>
            <option value="h2">Heading</option>
            <option value="h3">Subheading</option>
            <option value="p">Body text</option>
          </select>
        </div>
      )}

      {/* The page itself. This is the only scroller in the column — the surrounding layout
          does not add another — and the white sheet fills the available width rather than
          floating as a narrow card inside a wide modal. */}
      <div
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain border border-gray-200 bg-gray-100 p-0 sm:p-4 lg:p-6 ${
          readOnly ? "rounded-lg" : "rounded-b-lg border-t-0"
        }`}
      >
        <div className="mx-auto min-h-full w-full max-w-[60rem] bg-white px-5 py-8 shadow-sm ring-1 ring-gray-200 sm:px-12 sm:py-12 lg:px-16">
          <div
            ref={editorRef}
            className="nda-document"
            contentEditable={!readOnly}
            suppressContentEditableWarning
            role="textbox"
            aria-multiline="true"
            aria-label="NDA document"
            aria-readonly={readOnly}
            onInput={emitChange}
            onBlur={emitChange}
          />
        </div>
      </div>
    </div>
  );
}
