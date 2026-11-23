/**
 * Optional AI fallback for questions the rule-based helper doesn't recognise.
 *
 * Enabled by setting `CHATBOT_AI_URL` in public/config.js. The API key must
 * live on the server behind that URL — never in the browser.
 *
 * Request  (POST, JSON, with the user's Bearer token):
 *   { messages: [{ role: "user" | "assistant", content: string }],
 *     context:  { userName, currentPage } }
 * Response (JSON): { reply: string }   (also accepts `message`, `content` or a plain string)
 */
import api from "../../api/axiosInstance";

export const aiEnabled = () => Boolean(window.__APP_CONFIG__?.CHATBOT_AI_URL);

export async function askAI(history, context) {
  const url = window.__APP_CONFIG__.CHATBOT_AI_URL;
  const messages = history
    .filter((m) => m.text)
    .slice(-12)
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));

  const res = await api.post(
    url,
    { messages, context },
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }, timeout: 30000 },
  );
  const d = res?.data;
  const reply = typeof d === "string" ? d : d?.reply ?? d?.message ?? d?.content;
  if (!reply) throw new Error("Empty AI reply");
  return { text: String(reply) };
}
