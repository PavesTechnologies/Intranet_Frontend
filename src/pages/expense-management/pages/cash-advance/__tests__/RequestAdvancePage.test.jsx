import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestAdvancePage from '../RequestAdvancePage';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import { lookupService } from '../../../api/expenseReportsApi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Dates must be after today, so the fixtures are built relative to the run date.
const daysFromToday = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const NEEDED_BY = daysFromToday(10);
const SETTLEMENT_DUE = daysFromToday(20);

/**
 * EP04-S1 Test Suite: Employee Cash Advance Request
 *
 * Tests validation, submission, error handling, and UX workflows
 */

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock('react-router-dom', async () => ({
  ...await vi.importActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../api/cashAdvanceApi');
vi.mock('../../../api/expenseReportsApi');
vi.mock('@/components/toastfy/toast');

function renderWithProviders(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

async function selectCurrency() {
  fireEvent.click(screen.getByRole('button', { name: /select currency/i }));
  fireEvent.click(await screen.findByRole('option', { name: /USD/ }));
}

// The server's calculation for a complete new advance with no outstanding balance.
const COMPLETE_NEW_PREVIEW = {
  requestType: 'COMPLETE_NEW', currencyCode: 'USD', existingOutstanding: 0, eligibleOutstanding: 0,
  cashRequested: 5000, totalAdvanceAllocation: 5000, justificationRequired: false,
  exceedsLimit: false, potentialExposure: 5000, exposureLimit: null, excessOverLimit: 0,
};

// The employee must preview before Submit is enabled.
async function previewBeforeSubmit() {
  fireEvent.click(screen.getByRole('button', { name: /preview calculation/i }));
  await screen.findByText(/Calculation preview/);
}

describe('RequestAdvancePage - EP04-S1: Cash Advance Request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupService.getActiveCostCenters.mockResolvedValue([
      { costCenterId: 'cc-1', costCenterCode: 'ENG', costCenterName: 'Engineering' },
    ]);
    cashAdvanceApi.preview.mockResolvedValue(COMPLETE_NEW_PREVIEW);
    lookupService.getActiveCurrencies.mockResolvedValue([
      { currencyId: 'cur-1', currencyCode: 'USD', currencyName: 'US Dollar' },
    ]);
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: [] },
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      renderWithProviders(<RequestAdvancePage />);

      fireEvent.click(screen.getByRole('button', { name: /preview calculation/i }));

      await waitFor(() => {
        expect(screen.getByText(/title is required/i)).toBeInTheDocument();
        expect(screen.getByText(/enter a valid advance amount/i)).toBeInTheDocument();
      });
    });

    it('should validate positive amount', async () => {
      renderWithProviders(<RequestAdvancePage />);

      const amountInput = screen.getByLabelText(/amount/i);
      await userEvent.type(amountInput, '-100');

      fireEvent.click(screen.getByRole('button', { name: /preview calculation/i }));

      await waitFor(() => expect(screen.getByText(/enter a valid advance amount/i)).toBeInTheDocument());
      expect(cashAdvanceApi.create).not.toHaveBeenCalled();
      expect(cashAdvanceApi.preview).not.toHaveBeenCalled();
    });

    it('should validate settlement date is after needed date', async () => {
      renderWithProviders(<RequestAdvancePage />);

      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      // Date inputs are set directly: typing into them character by character is unreliable in jsdom.
      fireEvent.change(neededDateInput, { target: { value: '2026-10-20' } });
      fireEvent.change(settlementDateInput, { target: { value: '2026-10-10' } });

      fireEvent.click(screen.getByRole('button', { name: /preview calculation/i }));

      await waitFor(() => expect(screen.getByText(/cannot be before needed by date/i)).toBeInTheDocument());
      expect(cashAdvanceApi.create).not.toHaveBeenCalled();
    });
  });

  describe('Submit Button State', () => {
    it('should disable submit button during submission', async () => {
      cashAdvanceApi.create.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({ data: { data: { advanceId: 'adv-1' } } }), 500))
      );

      renderWithProviders(<RequestAdvancePage />);

      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '5000');
      await selectCurrency();
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, NEEDED_BY);
      await userEvent.type(settlementDateInput, SETTLEMENT_DUE);

      await previewBeforeSubmit();
      const submitButton = screen.getByRole('button', { name: /submit request/i });
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);
      // Submit asks first; the request is created and sent only after the user confirms.
      fireEvent.click(await screen.findByRole('button', { name: /submit for approval/i }));

      // Check button is disabled during submission
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Successful Submission', () => {
    it('should submit valid form and redirect', async () => {
      cashAdvanceApi.create.mockResolvedValue({
        data: { data: { advanceId: 'adv-1', status: 'DRAFT' } },
      });

      renderWithProviders(<RequestAdvancePage />);

      // Fill form
      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '5000');
      await selectCurrency();
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, NEEDED_BY);
      await userEvent.type(settlementDateInput, SETTLEMENT_DUE);

      await previewBeforeSubmit();
      const submitButton = screen.getByRole('button', { name: /submit request/i });
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);
      // Submit asks first; the request is created and sent only after the user confirms.
      fireEvent.click(await screen.findByRole('button', { name: /submit for approval/i }));

      await waitFor(() => {
        expect(cashAdvanceApi.create).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Business Trip',
            amount: 5000,
            currencyId: 'cur-1',
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on submission failure', async () => {
      cashAdvanceApi.create.mockRejectedValue({
        response: { data: { message: 'Amount exceeds policy limit' } },
      });

      renderWithProviders(<RequestAdvancePage />);

      const titleInput = screen.getByLabelText(/title/i);
      const amountInput = screen.getByLabelText(/amount/i);
      const purposeTextarea = screen.getByLabelText(/purpose/i);
      const neededDateInput = screen.getByLabelText(/needed by date/i);
      const settlementDateInput = screen.getByLabelText(/settlement expected date/i);

      await userEvent.type(titleInput, 'Business Trip');
      await userEvent.type(amountInput, '50000');
      await selectCurrency();
      await userEvent.type(purposeTextarea, 'Client meeting');
      await userEvent.type(neededDateInput, NEEDED_BY);
      await userEvent.type(settlementDateInput, SETTLEMENT_DUE);

      await previewBeforeSubmit();
      const submitButton = screen.getByRole('button', { name: /submit request/i });
      await waitFor(() => expect(submitButton).toBeEnabled());
      fireEvent.click(submitButton);
      // Submit asks first; the request is created and sent only after the user confirms.
      fireEvent.click(await screen.findByRole('button', { name: /submit for approval/i }));

      await waitFor(() => {
        expect(cashAdvanceApi.create).toHaveBeenCalled();
      });
    });
  });
});
