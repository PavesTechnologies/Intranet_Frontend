import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, MessageCircle, RotateCcw, SendHorizontal, Sparkles, X } from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { useTour } from "../Tour/TourContext";
import { WELCOME_TOUR_ID } from "../Tour/tours";
import { matchIntent, SUGGESTIONS } from "./intents";
import { HELP_REPLY, runIntent } from "./handlers";
import { getModule, matchModuleFaq } from "./modules";
import { aiEnabled, askAI } from "./chatApi";

/**
 * Intranet assistant — one chat for the whole intranet that also knows which
 * module you're in (from the route) and answers questions about it.
 *
 * Answer order: module FAQ → general intents (live data) → AI endpoint
 * (if CHATBOT_AI_URL is configured) → friendly fallback with suggestions.
 * In modules marked `aiFirst` (Expense Management) the AI is asked before the
 * module FAQ, because it can look up the user's own records. If the AI fails,
 * the FAQ answer (or the friendly fallback) is used instead of an error.
 */

const STORAGE_KEY = "paves-assistant-chat";
let idSeq = 0;
const newId = () => `${Date.now()}-${idSeq++}`;

const loadHistory = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveHistory = (messages) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-60)));
  } catch {
    /* storage unavailable — chat still works for this page view */
  }
};

export default function ChatbotWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { start: startTour, tours = [], active: tourActive } = useTour();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const lastModuleRef = useRef(null);

  const module = useMemo(() => getModule(location.pathname), [location.pathname]);
  const firstName = (user?.name || user?.email || "").split(/[\s@]/)[0];
  const useAI = aiEnabled();
  const moduleTour = module && tours.some((t) => t.id === module.id) ? module.id : null;

  useEffect(() => saveHistory(messages), [messages]);

  // Leave a short marker in the conversation when the user moves to another module.
  useEffect(() => {
    const id = module?.id ?? "none";
    if (lastModuleRef.current && lastModuleRef.current !== id && module && messages.length) {
      setMessages((m) => [...m, { id: newId(), role: "bot", text: module.intro, divider: module.name }]);
    }
    lastModuleRef.current = id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module?.id]);

  // Scroll to the latest message.
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, busy, open]);

  // Focus the input on open; Esc closes.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const respond = useCallback(
    async (text, history) => {
      const hit = matchModuleFaq(module, text);
      const faqReply = hit ? { text: hit.text, actions: hit.links } : null;
      const aiFirst = useAI && module?.aiFirst;

      // 1) Module-specific answer (deferred to the AI in aiFirst modules)
      if (faqReply && !aiFirst) return faqReply;

      // 2) General intents (with live data)
      const intent = matchIntent(text);
      if (intent === "help" && module) {
        return {
          text: `${module.intro}`,
          items: module.faqs.length ? undefined : HELP_REPLY.items,
          chips: module.suggestions,
          actions: moduleTour ? [{ label: `Take the ${module.name} tour`, tour: moduleTour }] : undefined,
        };
      }
      if (intent === "tour") {
        const tourId = moduleTour || WELCOME_TOUR_ID;
        return {
          text: moduleTour ? `Here's a quick tour of ${module.name}.` : "The guided tour walks you through the main parts of the intranet.",
          actions: [{ label: "Start the tour", tour: tourId }],
        };
      }
      if (intent) {
        const reply = await runIntent(intent, { userId: user?.user_id, firstName });
        if (reply) return reply;
      }

      // 3) AI
      if (useAI) {
        try {
          return await askAI(history, { userName: user?.name, currentPage: location.pathname, module: module?.name || null });
        } catch (err) {
          console.warn("Assistant AI unavailable, using built-in answers", err);
          if (faqReply) return faqReply;
        }
      }

      // 4) Fallback
      return {
        text: module
          ? `I'm not sure about that one yet. Here are some things I can help with in ${module.name}:`
          : "I'm not sure about that one yet. Here are some things I can help with:",
        chips: module?.suggestions || SUGGESTIONS,
      };
    },
    [module, moduleTour, user, firstName, useAI, location.pathname],
  );

  const send = useCallback(
    async (raw) => {
      const text = String(raw ?? input).trim();
      if (!text || busy) return;
      setInput("");
      const userMsg = { id: newId(), role: "user", text };
      const history = [...messages, userMsg];
      setMessages(history);
      setBusy(true);
      try {
        const reply = await respond(text, history);
        setMessages((m) => [...m, { id: newId(), role: "bot", ...reply }]);
      } catch (err) {
        console.error("Assistant failed to answer", err);
        setMessages((m) => [
          ...m,
          { id: newId(), role: "bot", text: "Sorry, I couldn't fetch that right now. Please try again in a moment.", error: true },
        ]);
      } finally {
        setBusy(false);
      }
    },
    [input, busy, messages, respond],
  );

  const runAction = (action) => {
    if (action.tour) {
      setOpen(false);
      startTour(action.tour === true ? WELCOME_TOUR_ID : action.tour);
    } else if (action.to) {
      navigate(action.to);
      setOpen(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    inputRef.current?.focus();
  };

  // Hide while a guided tour is running so the two don't overlap.
  if (tourActive) return null;

  const greetingTitle = `Hi${firstName ? ` ${firstName}` : ""}! I'm your Paves Assistant.`;
  const starterChips = module?.suggestions || SUGGESTIONS;

  return (
    <>
      {/* Launcher */}
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open Paves Assistant"}
        aria-expanded={open}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-5 right-5 z-[8500] flex items-center justify-center rounded-full bg-[#0A0082] text-white shadow-[0_12px_28px_-8px_rgba(10,0,130,0.6)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#0A0082]/30"
        style={{ height: 52, width: 52 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-label="Paves Assistant"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="fixed bottom-[84px] right-3 left-3 z-[8500] flex flex-col overflow-hidden rounded-2xl border border-[#E3E6F2] bg-white sm:left-auto sm:right-5 sm:w-[380px]"
            style={{ height: "min(580px, calc(100vh - 110px))", boxShadow: "0 24px 56px -16px rgba(10,23,78,0.35)" }}
          >
            <div className="h-[3px] w-full bg-gradient-to-r from-[#0A0082] via-[#5B66B8] to-[#FF3D72]" />

            {/* Header */}
            <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
              <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg object-contain" />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-semibold text-[#0A174E]">Paves Assistant</p>
                <p className="flex items-center gap-1.5 truncate text-[11px] text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {module ? `Helping with ${module.name}` : "Here to help across the intranet"}
                  {useAI && (
                    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-[#F1F0FF] px-1.5 text-[10px] font-medium text-[#0A0082]">
                      <Sparkles size={9} /> AI
                    </span>
                  )}
                </p>
              </div>
              {messages.length > 0 && (
                <button type="button" onClick={clearChat} title="Clear chat" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
                  <RotateCcw size={15} />
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} title="Close" className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600">
                <X size={16} />
              </button>
            </header>

            {/* Messages */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-[#FAFBFE] px-4 py-4" aria-live="polite">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <BotBubble>
                    <p className="font-medium text-[#0A174E]">{greetingTitle}</p>
                    <p className="mt-1 text-gray-600">{module ? module.intro : "Ask me about leave, timesheets, projects, holidays or celebrations."}</p>
                  </BotBubble>
                  <Chips chips={starterChips} onPick={send} />
                  {moduleTour && (
                    <Actions actions={[{ label: `Take the ${module.name} tour`, tour: moduleTour }]} onRun={runAction} />
                  )}
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-[#0A0082] px-3.5 py-2 text-[13px] leading-relaxed text-white">
                      {m.text}
                    </p>
                  </div>
                ) : (
                  <div key={m.id} className="space-y-2">
                    {m.divider && (
                      <div className="flex items-center gap-2 py-1 text-[10.5px] font-medium uppercase tracking-wider text-gray-400">
                        <span className="h-px flex-1 bg-gray-200" /> {m.divider} <span className="h-px flex-1 bg-gray-200" />
                      </div>
                    )}
                    <BotBubble error={m.error}>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      {m.items?.length > 0 && (
                        <ul className="mt-2 divide-y divide-gray-100 rounded-xl border border-gray-100 bg-white">
                          {m.items.map((it, i) => (
                            <li key={i} className="flex items-baseline justify-between gap-3 px-3 py-2">
                              <span className="min-w-0 truncate font-medium text-[#0A174E]">{it.primary}</span>
                              {it.secondary && <span className="shrink-0 text-right text-[11.5px] text-gray-500">{it.secondary}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </BotBubble>
                    {m.actions?.length > 0 && <Actions actions={m.actions} onRun={runAction} />}
                    {m.chips?.length > 0 && <Chips chips={m.chips} onPick={send} />}
                  </div>
                ),
              )}

              {busy && (
                <BotBubble>
                  <span className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-[#5B66B8]"
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </BotBubble>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-2 border-t border-gray-100 bg-white p-3"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={module ? `Ask about ${module.name}…` : "Ask me anything…"}
                aria-label="Message"
                className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-gray-200 bg-[#FAFBFE] px-3 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/15"
              />
              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Send"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A0082] text-white transition-opacity disabled:opacity-40"
              >
                <SendHorizontal size={17} />
              </button>
            </form>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}

function BotBubble({ children, error }) {
  return (
    <div className={`max-w-[92%] rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-[13px] leading-relaxed ${error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-gray-100 bg-white text-gray-700"}`}>
      {children}
    </div>
  );
}

function Chips({ chips, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="rounded-full border border-[#E3E6F2] bg-white px-3 py-1.5 text-[12px] text-[#263383] transition-colors hover:border-[#0A0082] hover:bg-[#F1F0FF]"
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function Actions({ actions, onRun }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => onRun(a)}
          className="group inline-flex items-center gap-1 rounded-lg bg-[#0A0082] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#080066]"
        >
          {a.label}
          <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      ))}
    </div>
  );
}
