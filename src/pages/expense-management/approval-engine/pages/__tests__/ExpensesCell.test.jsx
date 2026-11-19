import React from 'react';
import { render, screen } from '@testing-library/react';
import { ExpensesCell } from '../PendingApprovalsPage';
import { formatMoney } from '../../constants/approvalLabels';

/**
 * Expenses column for expense-report approval rows. It must show the report's claimed total (totalAmount), and must not
 * sum the pending line items, which only cover the items awaiting this approver.
 */

const renderCell = (item) =>
  render(
    <table>
      <tbody>
        <tr>
          <ExpensesCell item={item} />
        </tr>
      </tbody>
    </table>,
  );

describe('ExpensesCell - expense-report approval rows', () => {
  it('shows the report total claimed amount from totalAmount', () => {
    renderCell({
      totalAmount: 2000,
      currencyCode: 'INR',
      splitCount: 0,
      relevantLines: [{ amount: 2000 }],
    });

    expect(screen.getByText(formatMoney(2000, 'INR'))).toBeInTheDocument();
  });

  it('does not add up only the pending line items when several are awaiting review', () => {
    renderCell({
      totalAmount: 2000,
      currencyCode: 'INR',
      splitCount: 0,
      relevantLines: [{ amount: 300 }, { amount: 400 }],
    });

    expect(screen.getByText(formatMoney(2000, 'INR'))).toBeInTheDocument();
    expect(screen.queryByText(formatMoney(700, 'INR'))).not.toBeInTheDocument();
  });

  it('keeps the pending-line count as secondary text', () => {
    renderCell({
      totalAmount: 2000,
      currencyCode: 'INR',
      splitCount: 0,
      relevantLines: [{ amount: 300 }, { amount: 400 }],
    });

    expect(screen.getByText('2 to review')).toBeInTheDocument();
  });

  it('shows the split count when the report has splits', () => {
    renderCell({
      totalAmount: 2000,
      currencyCode: 'INR',
      splitCount: 2,
      relevantLines: [{ amount: 2000 }],
    });

    expect(screen.getByText('2 split')).toBeInTheDocument();
  });

  it('shows no split badge when the report has no splits', () => {
    renderCell({
      totalAmount: 2000,
      currencyCode: 'INR',
      splitCount: 0,
      relevantLines: [{ amount: 2000 }],
    });

    expect(screen.queryByText(/split/)).not.toBeInTheDocument();
  });
});
