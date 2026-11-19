import {
  computeSubmissionDeadline,
  formatDeadlineDate,
  getOverdueSubmitBlockMessage,
  getSubmissionDeadlineInfo,
} from "@/pages/expense-management/components/expense-reports/submissionDeadline";

// Fixed "today" so the tests do not depend on the date they run.
const TODAY = new Date(2026, 9, 23); // 23 Oct 2026, local time

const draft = (extra) => ({ reportStatus: "DRAFT", ...extra });

describe("computeSubmissionDeadline", () => {
  it("is the trip end date plus the configured days (default 30)", () => {
    expect(computeSubmissionDeadline("2026-10-01")).toEqual(new Date(2026, 9, 31));
    expect(computeSubmissionDeadline("2026-10-01", 45)).toEqual(new Date(2026, 10, 15));
  });

  it("is null without a trip end date", () => {
    expect(computeSubmissionDeadline(null)).toBeNull();
  });
});

describe("getSubmissionDeadlineInfo", () => {
  it("still allows submission on the deadline day itself", () => {
    const info = getSubmissionDeadlineInfo(draft({ tripEndDate: "2026-09-23" }), TODAY);
    expect(info.daysRemaining).toBe(0);
    expect(info.isOverdue).toBe(false);
  });

  it("is overdue from the day after the deadline", () => {
    const info = getSubmissionDeadlineInfo(draft({ tripEndDate: "2026-09-22" }), TODAY);
    expect(info.isOverdue).toBe(true);
    expect(info.daysRemaining).toBe(-1);
  });

  it("uses the backend deadline when one is supplied, so a Finance extension is honoured", () => {
    const info = getSubmissionDeadlineInfo(
      draft({ tripEndDate: "2026-01-01", submissionDeadline: "2026-11-30" }),
      TODAY,
    );
    expect(info.isOverdue).toBe(false);
  });

  it("shows no clock when the backend returns a null deadline (advance not yet disbursed or reopened)", () => {
    const info = getSubmissionDeadlineInfo(
      draft({ tripEndDate: "2026-01-01", submissionDeadline: null }),
      TODAY,
    );
    expect(info).toBeNull();
    expect(getOverdueSubmitBlockMessage(info)).toBeNull();
  });

  it("does not apply once the report has been submitted", () => {
    expect(getSubmissionDeadlineInfo({ reportStatus: "PENDING_APPROVAL", tripEndDate: "2026-01-01" }, TODAY)).toBeNull();
  });
});

describe("getOverdueSubmitBlockMessage (submit guard)", () => {
  it("blocks submit with the deadline date once the deadline has passed", () => {
    const info = getSubmissionDeadlineInfo(draft({ tripEndDate: "2026-09-22" }), TODAY);
    expect(getOverdueSubmitBlockMessage(info)).toBe(
      `The submission deadline passed on ${formatDeadlineDate(new Date(2026, 9, 22))}. This report can no longer be submitted.`,
    );
  });

  it("does not block submit on or before the deadline", () => {
    const info = getSubmissionDeadlineInfo(draft({ tripEndDate: "2026-09-23" }), TODAY);
    expect(getOverdueSubmitBlockMessage(info)).toBeNull();
  });

  it("does not block when there is no deadline info at all", () => {
    expect(getOverdueSubmitBlockMessage(null)).toBeNull();
    expect(getOverdueSubmitBlockMessage(undefined)).toBeNull();
  });
});
