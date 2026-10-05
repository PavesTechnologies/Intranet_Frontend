import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import EditEngagementModal from "./EditEngagementModal";
import {
  useUpdateVendorEngagement,
  useUpdateNdaDecision,
} from "../../vendor-intake/hooks/useVendorIntakeMutations";

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("../../system-configuration/hooks/useDepartments", () => ({
  default: () => ({
    data: [
      { id: 1, code: "FIN", name: "Finance", is_active: true },
      { id: 2, code: "IT", name: "IT", is_active: true },
    ],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../system-configuration/hooks/usePurchaseCategories", () => ({
  default: () => ({ data: [] }),
  // Mirrors the real server-side department_id filter: categories belong to one department,
  // and nothing is returned until a department is chosen.
  usePurchaseCategoriesByDepartment: (departmentId) => ({
    data:
      departmentId === 1
        ? [{ id: 10, code: "AUD", name: "Audit Services", is_active: true }]
        : departmentId === 2
          ? [{ id: 20, code: "HW", name: "Hardware", is_active: true }]
          : [],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("../../vendor-intake/hooks/useVendorIntakeMutations", () => ({
  useUpdateVendorEngagement: vi.fn(),
  useUpdateNdaDecision: vi.fn(),
}));

/** An engagement in Finance / Audit Services with a recorded "NDA required: yes". */
const ENGAGEMENT = {
  engagement_id: 42,
  vendor_id: 7,
  department_id: 1,
  category_id: 10,
  purpose_of_onboarding: "Statutory audit support",
  pre_screen_status: "PASS",
  nda_recommended: true,
  nda_override: null,
  nda_final_required: true,
};

let updateEngagement;
let updateNda;

const mockMutations = ({ engagementError = null, ndaError = null } = {}) => {
  updateEngagement = vi.fn(() =>
    engagementError ? Promise.reject(engagementError) : Promise.resolve({}),
  );
  updateNda = vi.fn(() => (ndaError ? Promise.reject(ndaError) : Promise.resolve({})));

  useUpdateVendorEngagement.mockReturnValue({
    mutateAsync: updateEngagement,
    isPending: false,
  });
  useUpdateNdaDecision.mockReturnValue({ mutateAsync: updateNda, isPending: false });
};

const renderModal = (props = {}) =>
  render(
    <EditEngagementModal
      isOpen
      engagement={ENGAGEMENT}
      vendorId={7}
      onClose={vi.fn()}
      onSaved={vi.fn()}
      {...props}
    />,
  );

const selectOption = async (user, labelText, optionText) => {
  const label = screen.getByText(labelText);
  const trigger = label.parentElement.querySelector("button");
  await user.click(trigger);
  await user.click(await screen.findByText(optionText));
};

const save = (user) => user.click(screen.getByRole("button", { name: /save changes/i }));

beforeEach(() => {
  vi.clearAllMocks();
  mockMutations();
});

describe("EditEngagementModal — form", () => {
  it("seeds every field from the engagement's current values", () => {
    renderModal();

    expect(screen.getByText("Edit Engagement")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    expect(screen.getByText("Audit Services")).toBeInTheDocument();
    expect(screen.getByLabelText(/Purpose of Onboarding/)).toHaveValue(
      "Statutory audit support",
    );

    // NDA reflects the recorded decision, not a default.
    expect(screen.getByRole("radio", { name: "Yes" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "No" })).not.toBeChecked();
  });

  it("makes Purchase Category depend on Department and clears a stale selection", async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByText("Audit Services")).toBeInTheDocument();

    await selectOption(user, "Department *", "IT");

    // The category belonged to Finance — it must not survive the department change.
    await waitFor(() => expect(screen.queryByText("Audit Services")).not.toBeInTheDocument());
    expect(screen.getByText("Select")).toBeInTheDocument();

    // Only the new department's categories are offered.
    await selectOption(user, "Purchase Category *", "Hardware");
    expect(screen.getByText("Hardware")).toBeInTheDocument();
  });

  it("blocks the save when the dependent category was cleared", async () => {
    const user = userEvent.setup();
    renderModal();

    await selectOption(user, "Department *", "IT");
    await save(user);

    expect(await screen.findByText("Purchase category is required.")).toBeInTheDocument();
    expect(updateEngagement).not.toHaveBeenCalled();
  });
});

describe("EditEngagementModal — engagement PUT payload", () => {
  it("sends only the fields that changed", async () => {
    const user = userEvent.setup();
    renderModal();

    await selectOption(user, "Department *", "IT");
    await selectOption(user, "Purchase Category *", "Hardware");
    await save(user);

    await waitFor(() => expect(updateEngagement).toHaveBeenCalledTimes(1));

    // Purpose was untouched, so it is omitted entirely — the backend keeps its current value.
    expect(updateEngagement).toHaveBeenCalledWith({ department_id: 2, category_id: 20 });
  });

  it("sends an explicit null when the purpose is cleared", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.clear(screen.getByLabelText(/Purpose of Onboarding/));
    await save(user);

    await waitFor(() => expect(updateEngagement).toHaveBeenCalledTimes(1));

    // null is what CLEARS the purpose; omitting the key would have preserved it.
    expect(updateEngagement).toHaveBeenCalledWith({ purpose_of_onboarding: null });
  });

  it("never puts NDA fields in the engagement payload", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.type(
      screen.getByLabelText(/Override Reason/),
      "Public information only.",
    );
    await user.clear(screen.getByLabelText(/Purpose of Onboarding/));
    await user.type(screen.getByLabelText(/Purpose of Onboarding/), "Revised scope");
    await save(user);

    await waitFor(() => expect(updateEngagement).toHaveBeenCalledTimes(1));

    const payload = updateEngagement.mock.calls[0][0];
    expect(payload).toEqual({ purpose_of_onboarding: "Revised scope" });
    expect(Object.keys(payload).some((key) => key.startsWith("nda"))).toBe(false);
  });

  it("does not call the API when nothing changed", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModal({ onClose });

    await save(user);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateEngagement).not.toHaveBeenCalled();
    expect(updateNda).not.toHaveBeenCalled();
  });
});

describe("EditEngagementModal — NDA decision", () => {
  it("asks for an override reason only once the NDA decision is changed", async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.queryByLabelText(/Override Reason/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "No" }));
    expect(screen.getByLabelText(/Override Reason/)).toBeInTheDocument();

    // Changing it back makes the field — and the requirement — go away again.
    await user.click(screen.getByRole("radio", { name: "Yes" }));
    expect(screen.queryByLabelText(/Override Reason/)).not.toBeInTheDocument();
  });

  it("refuses to save a changed NDA decision without a reason", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("radio", { name: "No" }));
    await save(user);

    expect(
      await screen.findByText("A reason is required when the NDA decision is changed."),
    ).toBeInTheDocument();
    expect(updateNda).not.toHaveBeenCalled();
    expect(updateEngagement).not.toHaveBeenCalled();
  });

  it("sends a changed NDA decision to the separate NDA endpoint, not the PUT", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.type(screen.getByLabelText(/Override Reason/), "Vendor handles public data only.");
    await save(user);

    await waitFor(() => expect(updateNda).toHaveBeenCalledTimes(1));

    expect(updateNda).toHaveBeenCalledWith({
      overrideRequired: false,
      reason: "Vendor handles public data only.",
    });

    // Nothing else changed, so the engagement PUT is not sent at all.
    expect(updateEngagement).not.toHaveBeenCalled();
  });

  it("sends the scope change and the NDA decision as two separate calls", async () => {
    const user = userEvent.setup();
    renderModal();

    await selectOption(user, "Department *", "IT");
    await selectOption(user, "Purchase Category *", "Hardware");
    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.type(screen.getByLabelText(/Override Reason/), "Scope no longer sensitive.");
    await save(user);

    await waitFor(() => expect(updateNda).toHaveBeenCalledTimes(1));
    expect(updateEngagement).toHaveBeenCalledTimes(1);
    expect(updateEngagement).toHaveBeenCalledWith({ department_id: 2, category_id: 20 });
  });

  it("offers a Yes/No decision for an engagement that has none recorded yet", async () => {
    const user = userEvent.setup();
    renderModal({
      engagement: {
        ...ENGAGEMENT,
        nda_recommended: null,
        nda_final_required: null,
      },
    });

    expect(screen.getByRole("radio", { name: "Yes" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "No" })).not.toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Yes" }));
    await user.type(screen.getByLabelText(/Override Reason/), "Handles personal data.");
    await save(user);

    await waitFor(() =>
      expect(updateNda).toHaveBeenCalledWith({
        overrideRequired: true,
        reason: "Handles personal data.",
      }),
    );
  });
});

describe("EditEngagementModal — errors and duplicate submits", () => {
  it("explains a 409 conflict and leaves the NDA call unsent", async () => {
    const user = userEvent.setup();
    mockMutations({
      engagementError: {
        response: {
          status: 409,
          data: { detail: "An engagement already exists for this vendor" },
        },
      },
    });
    const onClose = vi.fn();
    renderModal({ onClose });

    await selectOption(user, "Department *", "IT");
    await selectOption(user, "Purchase Category *", "Hardware");
    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.type(screen.getByLabelText(/Override Reason/), "No longer sensitive.");
    await save(user);

    expect(await screen.findByText(/already engaged for the selected department/i)).toBeInTheDocument();

    // A failed scope change must not go on to record an NDA decision, and the modal stays open.
    expect(updateNda).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("reports a 404 as a stale engagement", async () => {
    const user = userEvent.setup();
    mockMutations({ engagementError: { response: { status: 404, data: { detail: "Engagement not found" } } } });
    renderModal();

    await selectOption(user, "Department *", "IT");
    await selectOption(user, "Purchase Category *", "Hardware");
    await save(user);

    expect(await screen.findByText(/no longer exists/i)).toBeInTheDocument();
  });

  it("surfaces the backend's own 422 explanation", async () => {
    const user = userEvent.setup();
    mockMutations({
      engagementError: {
        response: {
          status: 422,
          data: { detail: "Category does not belong to the selected department" },
        },
      },
    });
    renderModal();

    await selectOption(user, "Department *", "IT");
    await selectOption(user, "Purchase Category *", "Hardware");
    await save(user);

    expect(
      await screen.findByText("Category does not belong to the selected department"),
    ).toBeInTheDocument();
  });

  it("says the scope saved when only the follow-up NDA call fails", async () => {
    const user = userEvent.setup();
    mockMutations({
      ndaError: { response: { status: 422, data: { detail: "A reason is required" } } },
    });
    const onSaved = vi.fn();
    renderModal({ onSaved });

    await selectOption(user, "Department *", "IT");
    await selectOption(user, "Purchase Category *", "Hardware");
    await user.click(screen.getByRole("radio", { name: "No" }));
    await user.type(screen.getByLabelText(/Override Reason/), "Reviewed.");
    await save(user);

    expect(
      await screen.findByText(/engagement was updated, but the NDA decision was not saved/i),
    ).toBeInTheDocument();

    // The part that did land is still refreshed.
    expect(onSaved).toHaveBeenCalled();
  });

  it("ignores a second save while the first is still in flight", async () => {
    const user = userEvent.setup();

    let release;
    updateEngagement = vi.fn(() => new Promise((resolve) => {
      release = resolve;
    }));
    useUpdateVendorEngagement.mockReturnValue({ mutateAsync: updateEngagement, isPending: false });
    useUpdateNdaDecision.mockReturnValue({ mutateAsync: updateNda, isPending: false });

    renderModal();

    await user.clear(screen.getByLabelText(/Purpose of Onboarding/));
    await user.type(screen.getByLabelText(/Purpose of Onboarding/), "Revised");

    await save(user);
    await save(user);
    await save(user);

    expect(updateEngagement).toHaveBeenCalledTimes(1);

    release({});
  });

  it("refreshes and closes after a successful save", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderModal({ onClose, onSaved });

    await user.clear(screen.getByLabelText(/Purpose of Onboarding/));
    await user.type(screen.getByLabelText(/Purpose of Onboarding/), "Revised scope");
    await save(user);

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });
});
