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

  it('opens as Cash Advance + Carry Forward when a carry-forward is waiting, and says where it comes from', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: [{
        advanceId: 'a-1', status: 'SETTLEMENT_PENDING', outstandingBalance: 500, carryForwardReadyAmount: 500,
        title: 'Week 1 client trip', advanceNumber: 'ADV-2026-2027-AAAA1111', currencyCode: 'INR',
      }] },
    });
    renderPage();

    expect(await screen.findByText(/INR 500\.00 is carried forward into this request/)).toBeInTheDocument();
    expect(screen.getByText('Week 1 client trip')).toBeInTheDocument();
    expect(await screen.findByLabelText(/^Additional Amount Required/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Cash Advance \+ Carry Forward/ })).toBeChecked();
    expect(screen.queryByLabelText(/Reason for Separate Advance/)).not.toBeInTheDocument();
  });

  it('does not offer a carry-forward another pending request already includes, and says where it is', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: [
        { advanceId: 'src-1', status: 'CLOSED', outstandingBalance: 0, carryForwardReadyAmount: 550,
          title: 'Pune onboarding', currencyCode: 'INR', createdAt: '2026-11-10T10:00:00' },
        { advanceId: 'src-2', status: 'SETTLEMENT_PENDING', outstandingBalance: 968, carryForwardReadyAmount: 968,
          title: 'Bengaluru visit', currencyCode: 'INR', createdAt: '2026-10-20T10:00:00' },
        { advanceId: 'pending-1', status: 'PENDING_FINANCE_APPROVAL', requestType: 'ADVANCE_PLUS_CARRY_FORWARD',
          title: 'client laptop visit', currencyCode: 'INR', amount: 2000, additionalAmountRequested: 2000,
          totalAdvanceAllocation: 2968 },
      ] },
    });
    renderPage();

    // The pending request includes 968 (the oldest balance first); only the other 550 is offered.
    expect(await screen.findByText(/INR 550\.00 is carried forward into this request/)).toBeInTheDocument();
    expect(screen.queryByText('Bengaluru visit')).not.toBeInTheDocument();
    const note = screen.getByTestId('carry-forward-claimed-note');
    expect(note).toHaveTextContent('INR 968.00 carried forward is already included in your request "client laptop visit"');
    expect(note).toHaveTextContent('If that request is rejected or cancelled');
  });

  it('falls back to Complete New when every carry-forward is included in a pending request', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: [
        { advanceId: 'src-1', status: 'CLOSED', outstandingBalance: 0, carryForwardReadyAmount: 550,
          title: 'Pune onboarding', currencyCode: 'INR' },
        { advanceId: 'pending-1', status: 'SUBMITTED', requestType: 'ADVANCE_PLUS_CARRY_FORWARD',
          title: 'client laptop visit', currencyCode: 'INR', amount: 2000, additionalAmountRequested: 2000,
          totalAdvanceAllocation: 2550 },
      ] },
    });
    renderPage();

    expect(await screen.findByTestId('carry-forward-claimed-note')).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /Cash Advance \+ Carry Forward/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Complete New Cash Advance/ })).toBeChecked();
    expect(screen.queryByText(/is carried forward into this request/)).not.toBeInTheDocument();
  });

  it('starts in the carried-forward currency, and warns when another currency is chosen', async () => {
    lookupService.getActiveCurrencies.mockResolvedValue([
      { currencyId: 'cur-1', currencyCode: 'INR', currencyName: 'Rupee' },
      { currencyId: 'cur-2', currencyCode: 'SGD', currencyName: 'Singapore Dollar' },
    ]);
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: [{
        advanceId: 'a-1', status: 'CLOSED', outstandingBalance: 0, carryForwardReadyAmount: 550,
        title: 'Earlier trip', currencyCode: 'INR',
      }] },
    });
    renderPage();

    expect(await screen.findByText(/INR 550\.00 is carried forward into this request/)).toBeInTheDocument();

    // The currency starts as INR, the carried-forward balance's currency.
    fireEvent.click(await screen.findByRole('button', { name: /INR - Rupee/ }));
    fireEvent.click(await screen.findByRole('option', { name: /SGD/ }));

    expect(await screen.findByText(/is carried forward, but not in SGD/)).toBeInTheDocument();
    expect(screen.getByText(/Choose INR as the currency to include it/)).toBeInTheDocument();
  });

  it('sends the carry-forward type with the new cash as the additional amount', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: [{
        advanceId: 'a-1', status: 'SETTLEMENT_PENDING', outstandingBalance: 0, carryForwardReadyAmount: 500,
        title: 'Week 1 client trip', currencyCode: 'INR',
      }] },
    });
    cashAdvanceApi.preview.mockResolvedValue({
      requestType: 'ADVANCE_PLUS_CARRY_FORWARD', currencyCode: 'INR', existingOutstanding: 500,
      eligibleOutstanding: 500, cashRequested: 2000, totalAdvanceAllocation: 2500, justificationRequired: false,
    });
    renderPage();
    await screen.findByText(/is carried forward into this request/);
    fireEvent.change(await screen.findByLabelText(/^Additional Amount Required/), { target: { value: '2000' } });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Pune trip' } });
    fireEvent.change(screen.getByLabelText(/purpose/i), { target: { value: 'Client visit' } });
    fireEvent.change(screen.getByLabelText(/needed by date/i), { target: { value: daysFromToday(10) } });
    fireEvent.change(screen.getByLabelText(/settlement expected date/i), { target: { value: daysFromToday(20) } });
    // No currency to pick: the form starts in INR, the carried-forward balance's currency.
    await screen.findByRole('button', { name: /INR - Rupee/ });

    fireEvent.click(screen.getByRole('button', { name: /Submit Request/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Submit for approval/ }));

    await waitFor(() => expect(cashAdvanceApi.submit).toHaveBeenCalledWith('adv-1'));
    const payload = cashAdvanceApi.create.mock.calls[0][0];
    expect(payload.currencyId).toBe('cur-1');
    expect(payload.requestType).toBe('ADVANCE_PLUS_CARRY_FORWARD');
    expect(payload.additionalAmount).toBe(2000);
    expect(payload.employeeJustification).toBeNull();
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
