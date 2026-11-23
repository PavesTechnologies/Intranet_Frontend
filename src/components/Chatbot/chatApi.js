/**
 * Optional AI answers for questions the rule-based helper doesn't recognise.
 *
 * Enabled by setting `CHATBOT_AI_URL` in public/config.js, normally XMS's
 * `POST /xms/chat` (Expense_Management_Service), which runs a free self-hosted
 * LLM (Ollama) with read-only tools over the user's own claims, advances and
 * approvals. Any API key lives on that server, never in the browser.
 *
 * Request  (POST, JSON, with the user's Bearer token):
 *   { messages: [{ role: "user" | "assistant", content: string }],
 *     context:  { userName, currentPage, module } }
 * Response (JSON): XMS's envelope { success, data: { reply } }; a bare
 *   { reply } (or `content`, or a plain string) is also accepted.
 */
import api from "../../api/axiosInstance";

export const aiEnabled = () => Boolean(window.__APP_CONFIG__?.CHATBOT_AI_URL);

export async function askAI(history, context) {
  const url = window.__APP_CONFIG__.CHATBOT_AI_URL;
  const messages = history
    // Skip error bubbles and module-change dividers: they aren't part of the conversation.
    .filter((m) => m.text && !m.error && !m.divider)
    .slice(-12)
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

  const res = await api.post(
    url,
    { messages, context },
    // A local CPU-only LLM can take a while, especially when it calls tools; XMS itself gives up after 60s per call.
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, timeout: 90000 },
  );
  const d = res?.data;
  // XMS wraps replies as { success, message, data: { reply } } — its `message` is a status line, not the answer.
  const reply = typeof d === "string" ? d : d?.data?.reply ?? d?.reply ?? d?.content;
  if (!reply) throw new Error("Empty AI reply");
  return { text: String(reply) };
}
