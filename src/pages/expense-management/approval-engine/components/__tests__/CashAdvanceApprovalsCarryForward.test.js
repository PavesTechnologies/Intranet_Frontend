import { describe, expect, it } from 'vitest';
import { advanceAmounts } from '../CashAdvanceApprovalsList';

const base = {
  requestType: 'ADVANCE_PLUS_CARRY_FORWARD', currencyCode: 'INR',
  additionalAmountRequested: 5000, totalAdvanceAllocation: 9000,
};

describe('advanceAmounts: Cash Advance + Carry Forward', () => {
  it('pending: requested is new cash + carry forward', () => {
    const a = advanceAmounts({ ...base, status: 'SUBMITTED', amount: 5000 });
    expect(a.requested).toBe(9000);
    expect(a.carryForward).toBe(4000);
    expect(a.carryForwardMoved).toBe(false);
    expect(a.approved).toBeNull();
  });

  it('approved in full by the manager: no false cut', () => {
    const a = advanceAmounts({ ...base, status: 'PENDING_FINANCE_APPROVAL', amount: 5000, managerTreatment: 'APPROVE_FULL' });
    expect(a.approved).toBe(9000);
    expect(a.cut).toBe(0);
  });

  it('manager reduced the cash: only the cash cut shows', () => {
    const a = advanceAmounts({ ...base, status: 'PENDING_FINANCE_APPROVAL', amount: 4000, requestedAmount: 5000, managerTreatment: 'APPROVE_REDUCED' });
    expect(a.requested).toBe(9000);
    expect(a.approved).toBe(8000);
    expect(a.cut).toBe(1000);
  });

  it('after final approval: approved includes the carry forward that moved in', () => {
    const a = advanceAmounts({ ...base, status: 'APPROVED', amount: 9000, approvedAmount: 9000, carriedInAmount: 4000 });
    expect(a.requested).toBe(9000);
    expect(a.approved).toBe(9000);
    expect(a.cut).toBe(0);
    expect(a.carryForwardMoved).toBe(true);
  });

  it('leaves a Complete New request unchanged', () => {
    const a = advanceAmounts({ requestType: 'COMPLETE_NEW', status: 'SUBMITTED', amount: 5000 });
    expect(a.requested).toBe(5000);
    expect(a.carryForward).toBe(0);
  });
});
