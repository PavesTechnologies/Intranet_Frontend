import { describe, expect, it } from "vitest";
import { buildAdvancePrefill, nextAdvanceSelection } from "@/pages/expense-management/components/expense-reports/advanceReportPrefill";

const COST_CENTERS = [{ costCenterId: "cc-eng", costCenterCode: "Eng" }];
const CURRENCIES = [{ currencyId: "cur-inr", currencyCode: "INR" }];

const ADVANCE_E = {
  advanceId: "adv-e",
  title: "[SEED] Long trip advance E",
  purpose: "Seed data for long-trip testing",
  costCenterId: "cc-eng",
  currencyId: "cur-inr",
  expectedTripStartDate: "2026-10-05",
  expectedTripEndDate: "2026-10-24",
};

const ADVANCE_NO_DATES = { ...ADVANCE_E, advanceId: "adv-x", expectedTripStartDate: null, expectedTripEndDate: null };

const EMPTY_FORM = {
  title: "",
  businessPurpose: "",
  costCenterId: "",
  currencyId: "",
  tripStartDate: "",
  tripEndDate: "",
  cashAdvanceId: "",
};

const lists = { costCenters: COST_CENTERS, currencies: CURRENCIES };

describe("buildAdvancePrefill", () => {
  it("takes the title, purpose, cost center, currency and expected trip dates from the advance", () => {
    expect(buildAdvancePrefill(ADVANCE_E, lists)).toEqual({
      title: "[SEED] Long trip advance E",
      businessPurpose: "Seed data for long-trip testing",
      costCenterId: "cc-eng",
      currencyId: "cur-inr",
      tripStartDate: "2026-10-05",
      tripEndDate: "2026-10-24",
    });
  });

  it("leaves the trip dates empty when the advance has no expected dates, for manual entry", () => {
    const prefill = buildAdvancePrefill(ADVANCE_NO_DATES, lists);

    expect(prefill.tripStartDate).toBe("");
    expect(prefill.tripEndDate).toBe("");
  });

  it("is empty when no advance is selected", () => {
    expect(buildAdvancePrefill(null, lists)).toEqual({});
  });
});

describe("nextAdvanceSelection", () => {
  it("fills the empty report fields when an advance is selected", () => {
    const { form, autoFilled } = nextAdvanceSelection({ form: EMPTY_FORM, advance: ADVANCE_E, ...lists });

    expect(form).toMatchObject({
      title: "[SEED] Long trip advance E",
      tripStartDate: "2026-10-05",
      tripEndDate: "2026-10-24",
      costCenterId: "cc-eng",
      currencyId: "cur-inr",
      cashAdvanceId: "adv-e",
    });
    expect(autoFilled.tripStartDate).toBe("2026-10-05");
  });

  it("keeps a trip date the employee has typed, after the actual travel dates are entered", () => {
    const typed = { ...EMPTY_FORM, tripStartDate: "2026-10-06" };

    const { form } = nextAdvanceSelection({ form: typed, advance: ADVANCE_E, ...lists });

    expect(form.tripStartDate).toBe("2026-10-06");
    expect(form.tripEndDate).toBe("2026-10-24");
  });

  it("replaces the values from the previous advance when another advance is selected", () => {
    const first = nextAdvanceSelection({ form: EMPTY_FORM, advance: ADVANCE_E, ...lists });
    const other = {
      ...ADVANCE_E,
      advanceId: "adv-f",
      title: "[SEED] Workshop advance",
      expectedTripStartDate: "2026-10-12",
      expectedTripEndDate: "2026-10-16",
    };

    const { form } = nextAdvanceSelection({
      form: first.form,
      previousAuto: first.autoFilled,
      advance: other,
      ...lists,
    });

    expect(form.title).toBe("[SEED] Workshop advance");
    expect(form.tripStartDate).toBe("2026-10-12");
    expect(form.tripEndDate).toBe("2026-10-16");
    expect(form.cashAdvanceId).toBe("adv-f");
  });

  it("clears the values the advance filled in when the advance is removed", () => {
    const selected = nextAdvanceSelection({ form: EMPTY_FORM, advance: ADVANCE_E, ...lists });

    const { form } = nextAdvanceSelection({
      form: selected.form,
      previousAuto: selected.autoFilled,
      advance: null,
      ...lists,
    });

    expect(form.title).toBe("");
    expect(form.tripStartDate).toBe("");
    expect(form.tripEndDate).toBe("");
    expect(form.costCenterId).toBe("");
    expect(form.currencyId).toBe("");
    expect(form.cashAdvanceId).toBe("");
  });

  it("keeps the employee's own title when clearing the advance", () => {
    const selected = nextAdvanceSelection({ form: EMPTY_FORM, advance: ADVANCE_E, ...lists });
    const retitled = { ...selected.form, title: "My own report title" };

    const { form } = nextAdvanceSelection({
      form: retitled,
      previousAuto: selected.autoFilled,
      advance: null,
      ...lists,
    });

    expect(form.title).toBe("My own report title");
    expect(form.tripStartDate).toBe("");
  });

  it("leaves the trip dates empty when the advance has no expected dates", () => {
    const { form } = nextAdvanceSelection({ form: EMPTY_FORM, advance: ADVANCE_NO_DATES, ...lists });

    expect(form.tripStartDate).toBe("");
    expect(form.tripEndDate).toBe("");
    expect(form.title).toBe("[SEED] Long trip advance E");
  });
});
