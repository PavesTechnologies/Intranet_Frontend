import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateExpensePage from '../CreateExpensePage';
import { expenseReportService, lookupService } from '../../../api/expenseReportsApi';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import * as authContext from '@/contexts/AuthContext';
import { showStatusToast } from '@/components/toastfy/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * EP04-S4 Test Suite: Expense-Advance Integration
 *
 * Covers the create-report form: the cash advance link (react-select), the report-level
 * validation (trip dates, reporting period, required fields) and the create call payload.
 */

vi.mock('../../../api/expenseReportsApi');
vi.mock('../../../api/cashAdvanceApi');
vi.mock('@/contexts/AuthContext');
vi.mock('@/components/toastfy/toast');

const PURPOSE = 'Client site visit accommodation and travel';

function renderWithProviders(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// react-select has no label association, so a field is located through its <label> wrapper.
const selectInput = (labelText) =>
  screen.getByText(labelText, { selector: 'label' }).closest('div').querySelector('input');

const selectControl = (labelText) => selectInput(labelText).closest('div[class*="control"]');

const openSelect = (labelText) => {
  fireEvent.keyDown(selectInput(labelText), { key: 'ArrowDown', keyCode: 40 });
};

const pickOption = async (labelText, optionText) => {
  openSelect(labelText);
  fireEvent.click(await screen.findByText(optionText));
};

const fillReport = async ({ advanceTitle } = {}) => {
  fireEvent.change(screen.getByLabelText(/report title/i), { target: { value: 'Hotel Expense Report' } });
  fireEvent.change(screen.getByLabelText(/business purpose/i), { target: { value: PURPOSE } });
  fireEvent.change(screen.getByLabelText(/trip \/ meeting start date/i), { target: { value: '2026-10-01' } });
  fireEvent.change(screen.getByLabelText(/estimated end date/i), { target: { value: '2026-10-05' } });
  await pickOption(/^Cost Center/, 'ENG - Engineering');
  await pickOption(/^Report Currency/, 'USD - US Dollar');
  if (advanceTitle) {
    await pickOption(/Link Disbursed Cash Advance/, advanceTitle);
  }
};

describe('CreateExpensePage - EP04-S4: Expense-Advance Integration', () => {
  const mockAdvances = [
    {
      advanceId: 'adv-1',
      advanceNumber: 'ADV-001',
      title: 'Business Trip',
      amount: 5000,
      currencyCode: 'USD',
      employeeId: 'emp-1',
      status: 'DISBURSED',
      outstandingBalance: 3000,
    },
    {
      advanceId: 'adv-2',
      advanceNumber: 'ADV-002',
      title: 'Conference',
      amount: 2000,
      currencyCode: 'USD',
      employeeId: 'emp-1',
      status: 'SETTLED',
      outstandingBalance: 0,
    },
    {
      advanceId: 'adv-3',
      advanceNumber: 'ADV-003',
      title: 'Client Visit',
      amount: 1500,
      currencyCode: 'USD',
      employeeId: 'emp-1',
      status: 'IN_PROGRESS',
      outstandingBalance: 1500,
    },
  ];

  const mockCategories = [
    { expenseCategoryId: 'cat-1', categoryName: 'Travel' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/');
    cashAdvanceApi.getMyAdvances.mockResolvedValue({
      data: { data: mockAdvances },
    });
    lookupService.getActiveCostCenters.mockResolvedValue([
      { costCenterId: 'cc-1', costCenterCode: 'ENG', costCenterName: 'Engineering' },
    ]);
    lookupService.getActiveCurrencies.mockResolvedValue([
      { currencyId: 'cur-1', currencyCode: 'USD', currencyName: 'US Dollar' },
    ]);
    lookupService.getActiveCategories.mockResolvedValue(mockCategories);
    lookupService.getAssignedProjects.mockResolvedValue([]);
    authContext.useAuth.mockReturnValue({
      user: { id: 'emp-1' },
      hasRole: vi.fn(() => true),
    });
  });

  describe('Cash Advance Selector Filtering', () => {
    it('should load all advances on page load', async () => {
      renderWithProviders(<CreateExpensePage />);

      await waitFor(() => {
        expect(cashAdvanceApi.getMyAdvances).toHaveBeenCalled();
      });
    });

    it('should only show DISBURSED and IN_PROGRESS advances', async () => {
      renderWithProviders(<CreateExpensePage />);
      openSelect(/Link Disbursed Cash Advance/);

      expect(await screen.findByText(/Business Trip/)).toBeInTheDocument();
      expect(screen.getByText(/Client Visit/)).toBeInTheDocument();
      expect(screen.queryByText(/Conference/)).not.toBeInTheDocument(); // SETTLED is filtered out
    });

    it('should exclude advances with zero outstanding balance', async () => {
      cashAdvanceApi.getMyAdvances.mockResolvedValue({
        data: {
          data: [{ ...mockAdvances[0], advanceId: 'adv-9', title: 'Spent Advance', outstandingBalance: 0 }],
        },
      });
      renderWithProviders(<CreateExpensePage />);
      openSelect(/Link Disbursed Cash Advance/);

      await waitFor(() => {
        expect(screen.queryByText(/Spent Advance/)).not.toBeInTheDocument();
      });
    });

    it('should display advance details: ID, title and amount', async () => {
      renderWithProviders(<CreateExpensePage />);
      openSelect(/Link Disbursed Cash Advance/);

      // The option label is truncated by the component, so the balance is not readable here.
      const option = await screen.findByText(/Business Trip/);
      expect(option.textContent).toMatch(/ADV-adv-1 \(Business Trip\)/);
      expect(option.textContent).toMatch(/Amount: 5/);
    });
  });

  describe('Cash Advance Selection', () => {
    it('should allow selecting a cash advance', async () => {
      renderWithProviders(<CreateExpensePage />);
      await pickOption(/Link Disbursed Cash Advance/, /Business Trip/);

      expect(await screen.findByText('Cash Advance Linked')).toBeInTheDocument();
    });

    it('should clear selection when user clicks clear button', async () => {
      renderWithProviders(<CreateExpensePage />);
      await pickOption(/Link Disbursed Cash Advance/, /Business Trip/);
      await screen.findByText('Cash Advance Linked');

      const clearIndicator = selectInput(/Link Disbursed Cash Advance/)
        .closest('div[class*="control"]')
        .querySelector('[class*="indicatorContainer"]');
      fireEvent.mouseDown(clearIndicator);

      await waitFor(() => {
        expect(screen.queryByText('Cash Advance Linked')).not.toBeInTheDocument();
      });
    });

    it('should display selected advance in form state', async () => {
      renderWithProviders(<CreateExpensePage />);
      await pickOption(/Link Disbursed Cash Advance/, /Business Trip/);

      await screen.findByText('Cash Advance Linked');
      expect(selectControl(/Link Disbursed Cash Advance/)).toHaveTextContent('Business Trip');
    });
  });

  describe('Report Submission with Advance', () => {
    it('should include selected advance in report creation', async () => {
      expenseReportService.create.mockResolvedValue({
        data: { data: { reportId: 'rep-1', status: 'DRAFT' } },
      });
      renderWithProviders(<CreateExpensePage />);

      await fillReport({ advanceTitle: /Business Trip/ });
      fireEvent.click(screen.getByRole('button', { name: /create expense report/i }));

      await waitFor(() => {
        expect(expenseReportService.create).toHaveBeenCalledWith(
          expect.objectContaining({ cashAdvanceId: 'adv-1', businessPurpose: PURPOSE }),
        );
      });
    });

    it('should submit report without advance if none selected', async () => {
      expenseReportService.create.mockResolvedValue({
        data: { data: { reportId: 'rep-2', status: 'DRAFT' } },
      });
      renderWithProviders(<CreateExpensePage />);

      await fillReport();
      fireEvent.click(screen.getByRole('button', { name: /create expense report/i }));

      await waitFor(() => {
        expect(expenseReportService.create).toHaveBeenCalledTimes(1);
      });
      expect(expenseReportService.create.mock.calls[0][0]).not.toHaveProperty('cashAdvanceId');
    });
  });

  describe('Reporting period and trip date validation', () => {
    it('should reject a reporting period that ends in the future', async () => {
      renderWithProviders(<CreateExpensePage />);
      const future = new Date();
      future.setDate(future.getDate() + 10);
      const futureIso = future.toISOString().split('T')[0];

      fireEvent.change(screen.getByLabelText(/reporting period end/i), { target: { value: futureIso } });
      await fillReport();
      fireEvent.click(screen.getByRole('button', { name: /create expense report/i }));

      expect(await screen.findByText('The reporting period cannot end in the future.')).toBeInTheDocument();
      expect(expenseReportService.create).not.toHaveBeenCalled();
    });

    it('should reject an estimated end date before the trip start date', async () => {
      renderWithProviders(<CreateExpensePage />);
      await fillReport();
      // Other required fields are valid; only the end date is moved before the start date.
      fireEvent.change(screen.getByLabelText(/estimated end date/i), { target: { value: '2026-09-30' } });
      fireEvent.click(screen.getByRole('button', { name: /create expense report/i }));

      await waitFor(() => {
        expect(showStatusToast).toHaveBeenCalledWith('The end date cannot be before the start date.', 'error', 6000);
      });
      expect(expenseReportService.create).not.toHaveBeenCalled();
    });
  });

  describe('URL Parameter Handling', () => {
    it('should read cash advance ID from URL parameters', async () => {
      window.history.pushState({}, '', '/?cashAdvanceId=adv-1');
      renderWithProviders(<CreateExpensePage />);

      expect(await screen.findByText('Cash Advance Linked')).toBeInTheDocument();
    });

    it('should pre-populate form when navigated with advance ID', async () => {
      window.history.pushState({}, '', '/?cashAdvanceId=adv-1');
      renderWithProviders(<CreateExpensePage />);

      await screen.findByText('Cash Advance Linked');
      expect(selectControl(/Link Disbursed Cash Advance/)).toHaveTextContent('Business Trip');
    });
  });

  describe('Error Handling', () => {
    it('should not offer advances when advance loading fails', async () => {
      cashAdvanceApi.getMyAdvances.mockRejectedValue(new Error('network down'));
      cashAdvanceApi.getAll.mockRejectedValue(new Error('network down'));
      renderWithProviders(<CreateExpensePage />);
      openSelect(/Link Disbursed Cash Advance/);

      await waitFor(() => {
        expect(screen.queryByText(/Business Trip/)).not.toBeInTheDocument();
      });
    });

    it('should show error if report submission with advance fails', async () => {
      expenseReportService.create.mockRejectedValue({
        response: { data: { message: 'Advance is already fully settled' } },
      });
      renderWithProviders(<CreateExpensePage />);

      await fillReport({ advanceTitle: /Business Trip/ });
      fireEvent.click(screen.getByRole('button', { name: /create expense report/i }));

      await waitFor(() => {
        expect(showStatusToast).toHaveBeenCalledWith('Advance is already fully settled', 'error', expect.anything());
      });
    });
  });
});
