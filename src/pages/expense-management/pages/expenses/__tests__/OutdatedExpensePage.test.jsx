import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import OutdatedExpensePage from '../OutdatedExpensePage';
import { expenseReportService, lineItemService } from '@/pages/expense-management/api/expenseReportsApi';

vi.mock('@/pages/expense-management/api/expenseReportsApi', async () => ({
  LATE_RECEIPT_REPORT_STATUSES: ['APPROVED', 'REIMBURSED', 'CLOSED'],
  expenseReportService: { getAll: vi.fn() },
  lineItemService: { getAll: vi.fn() },
}));

vi.mock('@/components/toastfy/toast', () => ({ showStatusToast: vi.fn() }));

// The panel has its own tests; here we only check which report it receives.
vi.mock('@/pages/expense-management/components/expense-reports/LateReceiptPanel', () => ({
  default: ({ reportId, reportStatus, lineItems }) => (
    <div data-testid="late-panel">panel:{reportId}:{reportStatus}:{lineItems.length}</div>
  ),
}));

const report = (id, number, status) => ({ reportId: id, reportNumber: number, title: `Trip ${number}`, reportStatus: status });

function renderPage() {
  return render(
    <MemoryRouter>
      <OutdatedExpensePage />
    </MemoryRouter>,
  );
}

describe('OutdatedExpensePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only settled reports (approved, reimbursed, closed) in the dropdown', async () => {
    expenseReportService.getAll.mockResolvedValue({
      data: { data: { reports: [
        report('r1', 'EXP-1', 'APPROVED'),
        report('r2', 'EXP-2', 'DRAFT'),
        report('r3', 'EXP-3', 'REIMBURSED'),
        report('r4', 'EXP-4', 'PENDING_APPROVAL'),
        report('r5', 'EXP-5', 'CLOSED'),
      ] } },
    });

    renderPage();

    const select = await screen.findByLabelText(/settled expense report/i);
    const options = [...select.querySelectorAll('option')].map((o) => o.textContent);
    expect(options.join('|')).toContain('EXP-1');
    expect(options.join('|')).toContain('EXP-3');
    expect(options.join('|')).toContain('EXP-5');
    expect(options.join('|')).not.toContain('EXP-2');
    expect(options.join('|')).not.toContain('EXP-4');
  });

  it('shows an empty state when no report is settled', async () => {
    expenseReportService.getAll.mockResolvedValue({ data: { data: [report('r2', 'EXP-2', 'DRAFT')] } });

    renderPage();

    expect(await screen.findByText(/no settled expense reports yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/settled expense report/i)).not.toBeInTheDocument();
  });

  it('loads the expenses of the chosen report and passes them to the late receipt panel', async () => {
    expenseReportService.getAll.mockResolvedValue({ data: { data: [report('r1', 'EXP-1', 'APPROVED')] } });
    lineItemService.getAll.mockResolvedValue({ data: { data: [{ lineItemId: 'l1' }, { lineItemId: 'l2' }] } });

    renderPage();

    fireEvent.change(await screen.findByLabelText(/settled expense report/i), { target: { value: 'r1' } });

    await waitFor(() => expect(lineItemService.getAll).toHaveBeenCalledWith('r1'));
    expect(await screen.findByTestId('late-panel')).toHaveTextContent('panel:r1:APPROVED:2');
  });
});
