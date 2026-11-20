import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RequestAdvancePage from '../RequestAdvancePage';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import { lookupService } from '../../../api/expenseReportsApi';

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => vi.fn(),
}));
vi.mock('../../../api/cashAdvanceApi');
vi.mock('../../../api/expenseReportsApi');
vi.mock('@/components/toastfy/toast');

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RequestAdvancePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const daysFromToday = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

async function fillForm() {
  fireEvent.change(screen.getByLabelText(/^Amount Required/), { target: { value: '2000' } });
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Pune trip' } });
  fireEvent.change(screen.getByLabelText(/purpose/i), { target: { value: 'Client visit' } });
  fireEvent.change(screen.getByLabelText(/needed by date/i), { target: { value: daysFromToday(10) } });
  fireEvent.change(screen.getByLabelText(/settlement expected date/i), { target: { value: daysFromToday(20) } });
  fireEvent.click(screen.getByRole('button', { name: /select currency/i }));
  fireEvent.click(await screen.findByRole('option', { name: /INR/ }));
}

const previewWith = (justificationRequired, existingOutstanding) => ({
  requestType: 'COMPLETE_NEW',
  currencyCode: 'INR',
  existingOutstanding,
  eligibleOutstanding: 0,
  cashRequested: 2000,
  totalAdvanceAllocation: 2000,
  justificationRequired,
});

// A disbursed advance whose stored balance reads the given amount.
const listWithBalance = (balance) => ({
  data: { data: [{ advanceId: 'a-1', status: 'IN_PROGRESS', outstandingBalance: balance }] },
});

// Each case fills the whole form and runs submit; under a full parallel run that takes longer than the 5 s default.
describe('RequestAdvancePage: reason for a separate advance', { timeout: 20000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupService.getActiveCostCenters.mockResolvedValue([]);
    lookupService.getActiveCurrencies.mockResolvedValue([{ currencyId: 'cur-1', currencyCode: 'INR', currencyName: 'Rupee' }]);
    cashAdvanceApi.myProfile.mockResolvedValue({ employeeId: 'EMP001', fullName: 'Ravi Menon' });
    cashAdvanceApi.create.mockResolvedValue({ data: { data: { advanceId: 'adv-1' } } });
    cashAdvanceApi.submit.mockResolvedValue({});
  });

  it('asks for no reason when nothing is owed, and submits', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue({ data: { data: [] } });
    cashAdvanceApi.preview.mockResolvedValue(previewWith(false, 0));
    renderPage();
    await waitFor(() => expect(cashAdvanceApi.getMyAdvances).toHaveBeenCalled());
    await fillForm();

    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Submit for approval/ }));

    await waitFor(() => expect(cashAdvanceApi.submit).toHaveBeenCalledWith('adv-1'));
    expect(screen.queryByLabelText(/Reason for Separate Advance/)).not.toBeInTheDocument();
    expect(cashAdvanceApi.create.mock.calls[0][0].employeeJustification).toBeNull();
  });

  it('shows the reason box when the list reads 0 but the server finds money owed', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue(listWithBalance(0));
    cashAdvanceApi.preview.mockResolvedValue(previewWith(true, 3000));
    renderPage();
    await waitFor(() => expect(cashAdvanceApi.getMyAdvances).toHaveBeenCalled());
    await fillForm();
    expect(screen.queryByLabelText(/Reason for Separate Advance/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }));

    expect(await screen.findByLabelText(/Reason for Separate Advance/)).toBeInTheDocument();
    expect(screen.getByText(/Explain why a separate new advance is needed/)).toBeInTheDocument();
    expect(screen.queryByText('Submit cash advance request')).not.toBeInTheDocument();
    expect(cashAdvanceApi.create).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Reason for Separate Advance/), {
      target: { value: 'Different client trip, earlier one not settled yet' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Submit for approval/ }));

    await waitFor(() => expect(cashAdvanceApi.submit).toHaveBeenCalledWith('adv-1'));
    expect(cashAdvanceApi.create.mock.calls[0][0].employeeJustification).toBe(
      'Different client trip, earlier one not settled yet',
    );
  });

  it('opens as Cash Advance + Outstanding when a carry-forward is waiting, and says where it comes from', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: [{
        advanceId: 'a-1', status: 'SETTLEMENT_PENDING', outstandingBalance: 500, carryForwardReadyAmount: 500,
        title: 'Week 1 client trip', advanceNumber: 'ADV-2026-2027-AAAA1111', currencyCode: 'INR',
      }] },
    });
    renderPage();

    expect(await screen.findByText(/INR 500\.00 is carried forward into this request/)).toBeInTheDocument();
    expect(screen.getByText('Week 1 client trip')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Additional Amount Required/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Reason for Separate Advance/)).not.toBeInTheDocument();
  });

  it('drops the reason when the list shows a balance but the server finds nothing owed', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue(listWithBalance(5000));
    cashAdvanceApi.preview.mockResolvedValue(previewWith(false, 0));
    renderPage();
    expect(await screen.findByLabelText(/Reason for Separate Advance/)).toBeInTheDocument();
    await fillForm();

    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Submit for approval/ }));

    await waitFor(() => expect(cashAdvanceApi.submit).toHaveBeenCalledWith('adv-1'));
    expect(screen.queryByLabelText(/Reason for Separate Advance/)).not.toBeInTheDocument();
  });
});
