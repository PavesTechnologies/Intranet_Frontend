import { describe, expect, it } from "vitest";
import { matchIntent } from "./intents";
import { getModule, matchModuleFaq, MODULES } from "./modules";

describe("matchIntent", () => {
  it.each([
    ["What's my leave balance?", "leaveBalance"],
    ["how many leaves do I have left", "leaveBalance"],
    ["Apply for leave", "applyLeave"],
    ["How do I apply for leave?", "applyLeave"],
    ["Who's on leave today?", "onLeaveToday"],
    ["Upcoming holidays", "holidays"],
    ["Upcoming birthdays", "celebrations"],
    ["How many hours this month?", "hours"],
    ["where do I log time", "timesheet"],
    ["How many projects am I on?", "projects"],
    ["Where are my tasks?", "tasks"],
    ["take a tour", "tour"],
    ["hello", "greet"],
    ["thanks!", "thanks"],
    ["help", "help"],
  ])("%s → %s", (text, intent) => {
    expect(matchIntent(text)).toBe(intent);
  });

  it("returns null for unknown or empty text", () => {
    expect(matchIntent("what is the wifi password")).toBeNull();
    expect(matchIntent("   ")).toBeNull();
  });
});

describe("getModule", () => {
  it.each([
    ["/dashboard", "welcome"],
    ["/leave-management", "leave"],
    ["/leave-management/manager", "leave"],
    ["/timesheets/history", "timesheets"],
    ["/projects/42", "projects"],
    ["/my-work", "projects"],
    ["/expense-management/expenses/my", "expense-management"],
    ["/account-receivable/receivables", "account-receivable"],
  ])("%s → %s", (path, id) => {
    expect(getModule(path)?.id).toBe(id);
  });

  it("does not match a prefix that is only a partial segment", () => {
    expect(getModule("/projectsx")).toBeNull();
    expect(getModule("/unknown")).toBeNull();
  });
});

describe("matchModuleFaq", () => {
  const mod = (id) => MODULES.find((m) => m.id === id);

  it("answers module-specific questions", () => {
    expect(matchModuleFaq(mod("leave"), "Can I take a half day?")?.text).toMatch(/half-days are supported/);
    expect(matchModuleFaq(mod("timesheets"), "Why was my timesheet rejected?")?.text).toMatch(/Rejected entries/);
    expect(matchModuleFaq(mod("expense-management"), "What happens after I submit?")?.text).toMatch(/policy check/);
    expect(matchModuleFaq(mod("user-management"), "What is an access point?")?.text).toMatch(/Access points/);
  });

  it("lets general questions fall through to intents", () => {
    expect(matchModuleFaq(mod("leave"), "What's my leave balance?")).toBeNull();
    expect(matchModuleFaq(null, "anything")).toBeNull();
  });

  it("every module suggestion gets an answer (module FAQ or general intent)", () => {
    for (const m of MODULES) {
      for (const s of m.suggestions) {
        const answered = matchModuleFaq(m, s) || matchIntent(s);
        expect(answered, `${m.id}: "${s}"`).toBeTruthy();
      }
    }
  });
});
