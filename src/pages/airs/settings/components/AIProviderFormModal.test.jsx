import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AIProviderFormModal from "./AIProviderFormModal";
import { createProvider, listModels, updateProvider, verifyAiProvider } from "../services/aiProviderService";

vi.mock("@/api/axiosInstance", () => ({ default: {} }));
vi.mock("../services/aiProviderService", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual, // keep the real apiErrorMessage
    listModels: vi.fn(),
    verifyAiProvider: vi.fn(),
    createProvider: vi.fn(),
    updateProvider: vi.fn(),
  };
});

const anthropicOnly = [{ key: "ANTHROPIC", label: "Anthropic Claude", registered: false }];

const renderCreate = (props = {}) => {
  const onSaved = vi.fn();
  render(
    <AIProviderFormModal isOpen mode="create" row={null} providerOptions={anthropicOnly}
      onClose={vi.fn()} onSaved={onSaved} {...props} />,
  );
  return { onSaved };
};

// With the model list empty the model field is a text input.
const fillForm = async ({ key = "sk-ant-1234", model = "claude-opus-5" } = {}) => {
  const keyInput = screen.getByPlaceholderText("Paste the provider API key");
  await userEvent.type(keyInput, key);
  await userEvent.tab(); // blur -> loads the live model list
  await waitFor(() => expect(listModels).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText("Loading models...")).toBeNull());
  await userEvent.type(screen.getByPlaceholderText(/type a model ID/), model);
};

describe("AIProviderFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listModels.mockResolvedValue([]);
  });

  it("keeps Register disabled until Check passes", async () => {
    verifyAiProvider.mockResolvedValue({ verified: true, message: "Anthropic Claude · claude-opus-5 responded in 120 ms." });
    renderCreate();
    await fillForm();

    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    expect(await screen.findByText("Model verified — you can save.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeEnabled();
    expect(verifyAiProvider).toHaveBeenCalledWith({ provider: "ANTHROPIC", modelName: "claude-opus-5", apiKey: "sk-ant-1234" });
  });

  it("shows a failed check in plain English and keeps Register disabled", async () => {
    verifyAiProvider.mockResolvedValue({ verified: false, message: "The API key is invalid. Check the key and try again." });
    renderCreate();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText("Can't use this model.")).toBeInTheDocument();
    expect(screen.getByText("The API key is invalid. Check the key and try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
  });

  it("changing the model after a passed check requires checking again", async () => {
    verifyAiProvider.mockResolvedValue({ verified: true, message: "ok" });
    renderCreate();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await screen.findByText("Model verified — you can save.");

    await userEvent.type(screen.getByPlaceholderText(/type a model ID/), "-v2");
    expect(screen.queryByText("Model verified — you can save.")).toBeNull();
    expect(screen.getByRole("button", { name: "Register" })).toBeDisabled();
  });

  it("registers and reports the backend's message", async () => {
    verifyAiProvider.mockResolvedValue({ verified: true, message: "ok" });
    createProvider.mockResolvedValue({ message: "Anthropic Claude registered." });
    const { onSaved } = renderCreate();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(await screen.findByRole("button", { name: "Register" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("Anthropic Claude registered."));
    expect(createProvider).toHaveBeenCalledWith({ provider: "ANTHROPIC", modelName: "claude-opus-5", apiKey: "sk-ant-1234" });
  });

  it("shows a friendly reason when saving fails", async () => {
    verifyAiProvider.mockResolvedValue({ verified: true, message: "ok" });
    createProvider.mockRejectedValue({
      response: { status: 409, data: { success: false, message: "Anthropic Claude is already registered. Edit it instead." } },
    });
    const { onSaved } = renderCreate();
    await fillForm();
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(await screen.findByRole("button", { name: "Register" }));

    expect(await screen.findByText("Anthropic Claude is already registered. Edit it instead.")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("shows a friendly message when the model list can't load", async () => {
    listModels.mockRejectedValue({
      response: { status: 400, data: { success: false, message: "Couldn't load models. The API key is invalid. Check the key and try again." } },
    });
    renderCreate();
    const keyInput = screen.getByPlaceholderText("Paste the provider API key");
    await userEvent.type(keyInput, "bad-key");
    keyInput.blur();
    expect(await screen.findByText("Couldn't load models. The API key is invalid. Check the key and try again.")).toBeInTheDocument();
  });

  it("drops a model that the key can't use from the dropdown", async () => {
    listModels.mockResolvedValue([
      { id: "gemini-x", display_name: "Gemini X" },
      { id: "gemini-y", display_name: "Gemini Y" },
    ]);
    verifyAiProvider.mockResolvedValue({
      verified: false,
      error_code: "MODEL_NOT_FOUND",
      message: "This model isn't available for this API key. Pick another model.",
    });
    renderCreate();
    const keyInput = screen.getByPlaceholderText("Paste the provider API key");
    await userEvent.type(keyInput, "AIza-key");
    await userEvent.tab();
    await waitFor(() => expect(screen.queryByText("Loading models...")).toBeNull());

    await userEvent.click(screen.getByRole("button", { name: /Select a model/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Gemini X/ }));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText(/gemini-x has been removed from the model list/)).toBeInTheDocument();
    expect(screen.getByText("Error code: MODEL_NOT_FOUND")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Select a model/ }));
    expect(await screen.findByRole("option", { name: /Gemini Y/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Gemini X/ })).toBeNull();
  });

  it("keeps a model in the list when the failure is about the key, not the model", async () => {
    listModels.mockResolvedValue([{ id: "gemini-x", display_name: "Gemini X" }]);
    verifyAiProvider.mockResolvedValue({
      verified: false, error_code: "RATE_LIMITED", message: "Google Gemini is limiting how often this key can be used.",
    });
    renderCreate();
    const keyInput = screen.getByPlaceholderText("Paste the provider API key");
    await userEvent.type(keyInput, "AIza-key");
    await userEvent.tab();
    await waitFor(() => expect(screen.queryByText("Loading models...")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: /Select a model/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Gemini X/ }));
    await userEvent.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText("Error code: RATE_LIMITED")).toBeInTheDocument();
    expect(screen.queryByText(/has been removed from the model list/)).toBeNull();
    expect(screen.getByRole("button", { name: /Gemini X/ })).toBeInTheDocument();
  });

  it("edit mode fixes the provider, allows a blank key, and saves model changes", async () => {
    const row = { id: "r1", provider: "OPENAI", provider_label: "OpenAI", model_name: "gpt-5", api_key_masked: "••••9999" };
    verifyAiProvider.mockResolvedValue({ verified: true, message: "ok" });
    updateProvider.mockResolvedValue({ message: "OpenAI updated." });
    const onSaved = vi.fn();
    render(<AIProviderFormModal isOpen mode="edit" row={row} providerOptions={[]} onClose={vi.fn()} onSaved={onSaved} />);

    expect(screen.getByText("Edit OpenAI")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/leave blank to keep the saved key/)).toBeInTheDocument();
    await waitFor(() => expect(listModels).toHaveBeenCalledWith({ provider: "OPENAI", apiKey: "" }));

    const modelInput = await screen.findByPlaceholderText(/type a model ID/);
    await userEvent.clear(modelInput);
    await userEvent.type(modelInput, "gpt-5-mini");
    await userEvent.click(screen.getByRole("button", { name: "Check" }));
    await userEvent.click(await screen.findByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("OpenAI updated."));
    expect(updateProvider).toHaveBeenCalledWith("r1", { provider: "OPENAI", modelName: "gpt-5-mini", apiKey: "" });
  });
});
