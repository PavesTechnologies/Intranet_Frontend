import { describe, it, expect } from 'vitest';
import { draftProblem } from '../RequestAdvancePage';

// Mirrors the server's create rules (CashAdvanceServiceImpl): needed-by in the future, round amount.
const TODAY = '2026-11-17';
const valid = { amount: '5000', neededByDate: '2026-11-20', settlementDueDate: '2026-11-30' };

describe('draftProblem (same rules as the server on create)', () => {
  it('accepts a complete request with future dates and a round amount', () => {
    expect(draftProblem(valid, TODAY)).toBe('');
  });

  it('refuses a needed-by date that is today, the 422 the upload used to show', () => {
    expect(draftProblem({ ...valid, neededByDate: TODAY }, TODAY)).toBe('Needed by date must be a future date.');
  });

  it('asks for the needed-by date when it is missing', () => {
    expect(draftProblem({ ...valid, neededByDate: '' }, TODAY)).toMatch(/Needed by date is required/);
  });

  it('refuses a settlement date that is not in the future', () => {
    expect(draftProblem({ ...valid, settlementDueDate: TODAY }, TODAY)).toBe('Settlement due date must be a future date.');
  });

  it('refuses a settlement date before the needed-by date', () => {
    expect(draftProblem({ ...valid, settlementDueDate: '2026-11-18' }, TODAY))
      .toBe('Settlement expected date cannot be before the needed by date.');
  });

  it('refuses an amount that is not a multiple of 500', () => {
    expect(draftProblem({ ...valid, amount: '5050' }, TODAY)).toBe('The advance amount must be a positive multiple of 500.');
  });

  it('refuses a zero or missing amount', () => {
    expect(draftProblem({ ...valid, amount: '0' }, TODAY)).toMatch(/multiple of 500/);
    expect(draftProblem({ ...valid, amount: '' }, TODAY)).toMatch(/multiple of 500/);
  });
});
