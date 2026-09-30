import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SettingsAIProviders from "./SettingsAIProviders";
import useAiProviders from "../hooks/useAiProviders";

vi.mock("../hooks/useAiProviders", () => ({ default: vi.fn(), PROVIDERS_PAGE_SIZE: 5 }));
// The modal has its own tests; here it only needs to show whether it's open.
vi.mock("./AIProviderFormModal", () => ({
  default: ({ isOpen, mode, row }) => (isOpen ? <div data-testid="provider-modal">{`${mode}:${row?.provider ?? ""}`}</div> : null),
}));

const row = (overrides) => ({
  id: overrides.provider,
  provider_label: overrides.provider,
  model_name: "model-x",
  api_key_masked: "••••1234",
  is_active: false,
  is_verified: true,
  verified_at: null,
  ...overrides,
});

const baseState = (overrides = {}) => ({
  rows: [],
  total: 0,
  page: 1,
  totalPages: 1,
  setPage: vi.fn(),
  active: { source: "database", provider: "GOOGLE", provider_label: "Google Gemini", model_name: "gemini-2.5-pro" },
  options: [{ key: "GOOGLE", registered: true }, { key: "ANTHROPIC", registered: false }],
  unregisteredOptions: [{ key: "ANTHROPIC", label: "Anthropic Claude", registered: false }],
  loading: false,
  loadError: "",
  busyId: null,
  refresh: vi.fn(),
  activate: vi.fn().mockResolvedValue(true),
  remove: vi.fn().mockResolvedValue(true),
  ...overrides,
});

const rowFor = (name) => screen.getByText(name).closest("tr");

describe("SettingsAIProviders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows provider, model, masked key and status columns", () => {
    const rows = [
      row({ provider: "Google Gemini", model_name: "gemini-2.5-pro", api_key_masked: "••••abcd", is_active: true }),
      row({ provider: "Anthropic Claude", model_name: "claude-opus-5" }),
    ];
    useAiProviders.mockReturnValue(baseState({ rows, total: 2 }));
    render(<SettingsAIProviders />);

    for (const header of ["Provider", "Model", "API key", "Status", "Actions"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    const google = within(rowFor("Google Gemini"));
    expect(google.getByText("gemini-2.5-pro")).toBeInTheDocument();
    expect(google.getByText("••••abcd")).toBeInTheDocument();
    expect(google.getByText("Active")).toBeInTheDocument();
    expect(within(rowFor("Anthropic Claude")).getByText("Inactive")).toBeInTheDocument();
  });

  it("blocks deleting the active provider and explains why", () => {
    const rows = [row({ provider: "Google Gemini", is_active: true }), row({ provider: "Anthropic Claude" })];
    useAiProviders.mockReturnValue(baseState({ rows, total: 2 }));
    render(<SettingsAIProviders />);

    const del = within(rowFor("Google Gemini")).getByRole("button", { name: "Delete" });
    expect(del).toBeDisabled();
    expect(del.parentElement).toHaveAttribute(
      "title", "This is the active provider. Set another provider as active first.",
    );
    expect(within(rowFor("Anthropic Claude")).getByRole("button", { name: "Delete" })).toBeEnabled();
  });

  it("blocks deleting the last remaining provider", () => {
    useAiProviders.mockReturnValue(baseState({ rows: [row({ provider: "Groq" })], total: 1 }));
    render(<SettingsAIProviders />);
    const del = within(rowFor("Groq")).getByRole("button", { name: "Delete" });
    expect(del).toBeDisabled();
    expect(del.parentElement).toHaveAttribute(
      "title", "At least one provider must remain, so the last one can't be deleted.",
    );
  });

  it("offers Set active only on inactive rows, and confirms before switching", async () => {
    const anthropic = row({ provider: "Anthropic Claude", model_name: "claude-opus-5" });
    const state = baseState({ rows: [row({ provider: "Google Gemini", is_active: true }), anthropic], total: 2 });
    useAiProviders.mockReturnValue(state);
    render(<SettingsAIProviders />);

    expect(within(rowFor("Google Gemini")).queryByRole("button", { name: "Set as active" })).toBeNull();
    await userEvent.click(within(rowFor("Anthropic Claude")).getByRole("button", { name: "Set as active" }));
    expect(screen.getByText("Make this the active provider?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Set active" }));
    expect(state.activate).toHaveBeenCalledWith(anthropic);
  });

  it("confirms before deleting", async () => {
    const anthropic = row({ provider: "Anthropic Claude" });
    const state = baseState({ rows: [row({ provider: "Google Gemini", is_active: true }), anthropic], total: 2 });
    useAiProviders.mockReturnValue(state);
    render(<SettingsAIProviders />);

    await userEvent.click(within(rowFor("Anthropic Claude")).getByRole("button", { name: "Delete" }));
    await userEvent.click(within(screen.getByText("Delete AI provider?").parentElement).getByRole("button", { name: "Delete" }));
    expect(state.remove).toHaveBeenCalledWith(anthropic);
  });

  it("opens the modal to register and to edit", async () => {
    useAiProviders.mockReturnValue(baseState({ rows: [row({ provider: "GOOGLE", is_active: true })], total: 1 }));
    render(<SettingsAIProviders />);

    await userEvent.click(screen.getByRole("button", { name: /Add model provider/ }));
    expect(screen.getByTestId("provider-modal")).toHaveTextContent("create:");
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByTestId("provider-modal")).toHaveTextContent("edit:GOOGLE");
  });

  it("disables Add once every provider is registered", () => {
    useAiProviders.mockReturnValue(baseState({
      rows: [row({ provider: "GOOGLE", is_active: true })], total: 4, unregisteredOptions: [],
    }));
    render(<SettingsAIProviders />);
    const add = screen.getByRole("button", { name: /Add model provider/ });
    expect(add).toBeDisabled();
    expect(add.parentElement).toHaveAttribute("title", "All supported providers are already registered.");
  });

  it("shows the built-in default banner and empty state when nothing is registered", () => {
    useAiProviders.mockReturnValue(baseState({
      active: { source: "env_fallback", provider: "GOOGLE", provider_label: "Google Gemini", model_name: "gemini-flash-latest" },
    }));
    render(<SettingsAIProviders />);
    expect(screen.getByText(/No provider registered yet/)).toBeInTheDocument();
    expect(screen.getByText("No AI providers registered yet")).toBeInTheDocument();
  });

  it("shows a friendly load error with a retry", async () => {
    const state = baseState({ loadError: "Can't reach the AIRS server. Check your connection and try again." });
    useAiProviders.mockReturnValue(state);
    render(<SettingsAIProviders />);
    expect(screen.getByText("Can't reach the AIRS server. Check your connection and try again.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(state.refresh).toHaveBeenCalled();
  });
});
