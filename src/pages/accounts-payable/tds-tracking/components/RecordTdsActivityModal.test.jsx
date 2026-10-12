import { describe, it, expect } from "vitest";
import { validateTdsActivity } from "./RecordTdsActivityModal";
import { sectionLabel } from "../utils/tdsTrackingFormat";

describe("validateTdsActivity", () => {
  it("requires the deduction date", () => {
    expect(validateTdsActivity("RECORD_DEDUCTION", { deduction_date: "" })).toHaveProperty("deduction_date");
    expect(validateTdsActivity("RECORD_DEDUCTION", { deduction_date: "2026-04-10" })).toEqual({});
  });

  it("requires challan number and TDS payment date, and a 7-digit BSR code when given", () => {
    expect(Object.keys(validateTdsActivity("RECORD_DEPOSIT", {})).sort()).toEqual(["challan_number", "deposit_date"]);
    expect(validateTdsActivity("RECORD_DEPOSIT", { challan_number: "CH1", deposit_date: "2026-04-10", bsr_code: "12" }))
      .toHaveProperty("bsr_code");
    expect(validateTdsActivity("RECORD_DEPOSIT", { challan_number: "CH1", deposit_date: "2026-04-10", bsr_code: "0510308" }))
      .toEqual({});
  });

  it("requires filing date and reference, and rejects future dates", () => {
    expect(Object.keys(validateTdsActivity("RECORD_FILING", {})).sort()).toEqual(["filing_date", "filing_reference"]);
    expect(validateTdsActivity("RECORD_FILING", { filing_date: "2999-01-01", filing_reference: "ACK" }).filing_date)
      .toMatch(/future/);
  });
});

describe("sectionLabel", () => {
  it("shows old / new section and the rule code from the backend snapshot", () => {
    expect(sectionLabel({ oldSection: "194J", newSection: "393(1) Table 6(iii).D(b)", ruleCode: "1027" }))
      .toBe("194J / 393(1) Table 6(iii).D(b) (1027)");
    expect(sectionLabel({ ruleCode: "TDS_194C" })).toBe("TDS_194C");
    expect(sectionLabel({})).toBe("—");
  });
});
