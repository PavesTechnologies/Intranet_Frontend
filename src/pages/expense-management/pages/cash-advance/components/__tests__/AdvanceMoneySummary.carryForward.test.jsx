import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdvanceMoneySummary, { carryForwardRequest } from '../AdvanceMoneySummary';
import { figuresForAdvance } from '../../useAdvanceFigures';

const pending = {
  advanceId: 'adv-1', status: 'SUBMITTED', currencyCode: 'INR', requestType: 'ADVANCE_PLUS_CARRY_FORWARD',
  amount: 2000, additionalAmountRequested: 2000, totalAdvanceAllocation: 2550, carriedInAmount: null,
};

describe('AdvanceMoneySummary: Cash Advance + Carry Forward', () => {
  it('shows the carry-forward added to a pending request, before any money moves', () => {
    render(<AdvanceMoneySummary advance={pending} figures={figuresForAdvance(pending, null, 0)} />);

    expect(screen.getByText('New cash requested')).toBeInTheDocument();
    expect(screen.getByText('Carry forward added')).toBeInTheDocument();
    expect(screen.getByText(/^\+ .*550\.00$/)).toBeInTheDocument();
    expect(screen.getByText(/2,550\.00$/)).toBeInTheDocument();
    expect(screen.getByText(/Moves in when Finance gives final approval/)).toBeInTheDocument();
  });

  it('after approval shows what actually moved in, with no false reduction', () => {
    const approved = { ...pending, status: 'APPROVED', amount: 2550, approvedAmount: 2550, carriedInAmount: 550 };
    render(<AdvanceMoneySummary advance={approved} figures={figuresForAdvance(approved, null, 0)} />);

    expect(screen.getByText(/Moved in from your earlier advance/)).toBeInTheDocument();
    expect(screen.queryByText(/Reduced by/)).not.toBeInTheDocument();
  });

  it('is not used for a Complete New request', () => {
    expect(carryForwardRequest({ requestType: 'COMPLETE_NEW', amount: 2000 })).toBeNull();
    expect(carryForwardRequest(pending)).toEqual({ newCash: 2000, carry: 550, total: 2550, moved: false });
  });
});
