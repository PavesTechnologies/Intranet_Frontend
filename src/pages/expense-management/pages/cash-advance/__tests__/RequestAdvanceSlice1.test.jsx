import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RequestAdvancePage from '../RequestAdvancePage';
import AdvanceTypeSelector, { ADVANCE_TYPE } from '../components/request/AdvanceTypeSelector';
import EmployeeProfileCard from '../components/request/EmployeeProfileCard';
import OutstandingBalanceSummary from '../components/request/OutstandingBalanceSummary';
import AdvanceCalculationPreview from '../components/request/AdvanceCalculationPreview';
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

// Preview checks the whole form first, so the form needs its required fields before a preview can be requested.
async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Pune trip' } });
  fireEvent.change(screen.getByLabelText(/purpose/i), { target: { value: 'Client visit' } });
  fireEvent.change(screen.getByLabelText(/needed by date/i), { target: { value: daysFromToday(10) } });
  fireEvent.change(screen.getByLabelText(/settlement expected date/i), { target: { value: daysFromToday(20) } });
  fireEvent.click(screen.getByRole('button', { name: /select currency/i }));
  fireEvent.click(await screen.findByRole('option', { name: /INR/ }));
}

const openAdvance = (overrides = {}) => ({
  advanceId: 'adv-1', employeeId: 'EMP001', status: 'DISBURSED', purpose: 'Pune client visit',
  amount: 10000, outstandingBalance: 4000, ...overrides,
});

describe('AdvanceTypeSelector', () => {
  it('shows both options and reports the chosen one', () => {
    const onChange = vi.fn();
    render(<AdvanceTypeSelector value={ADVANCE_TYPE.COMPLETE_NEW} onChange={onChange} />);

    expect(screen.getByRole('radio', { name: /Complete New Cash Advance/ })).toBeChecked();
    fireEvent.click(screen.getByRole('radio', { name: /Cash Advance \+ Outstanding/ }));
    expect(onChange).toHaveBeenCalledWith(ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING);
  });

  it('cannot be changed when disabled', () => {
    render(<AdvanceTypeSelector value={ADVANCE_TYPE.COMPLETE_NEW} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('radio', { name: /Cash Advance \+ Outstanding/ })).toBeDisabled();
  });
});

describe('EmployeeProfileCard', () => {
  it('shows the details it has, and leaves out the ones it does not', () => {
    render(<EmployeeProfileCard profile={{ employeeId: 'EMP001', fullName: 'Ravi Menon', managerName: 'Anita Rao', departmentName: null, designationName: null }} />);
    expect(screen.getByText('Ravi Menon')).toBeInTheDocument();
    expect(screen.getByText('EMP001')).toBeInTheDocument();
    expect(screen.getByText('Anita Rao')).toBeInTheDocument();
    expect(screen.queryByText('Department')).not.toBeInTheDocument();
    expect(screen.queryByText('Designation')).not.toBeInTheDocument();
  });

  it('renders nothing when there is no profile', () => {
    const { container } = render(<EmployeeProfileCard profile={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OutstandingBalanceSummary', () => {
  it('says there is no outstanding advance when the balance is zero', () => {
    render(<OutstandingBalanceSummary totalOutstanding={0} openCount={0} hasOverdue={false} />);
    expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument();
  });

  it('shows the total and how many advances it spans', () => {
    render(<OutstandingBalanceSummary totalOutstanding={5000} openCount={2} hasOverdue={false} currency="INR" />);
    expect(screen.getByText(/INR 5,000.00/)).toBeInTheDocument();
    expect(screen.getByText(/2 open advances/)).toBeInTheDocument();
  });

  it('raises the overdue message as an alert', () => {
    render(<OutstandingBalanceSummary totalOutstanding={5000} openCount={1} hasOverdue overdueMessage="Resolve it first." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Resolve it first.');
  });
});

describe('AdvanceCalculationPreview', () => {
  it('shows the eligible balance and total for Cash Advance + Outstanding', () => {
    render(<AdvanceCalculationPreview preview={{
      requestType: ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING, currencyCode: 'INR', eligibleOutstanding: 4000,
      cashRequested: 4000, totalAdvanceAllocation: 8000, justificationRequired: false, exceedsLimit: false,
    }} />);
    expect(screen.getByText('Eligible outstanding balance')).toBeInTheDocument();
    expect(screen.getByText('INR 8,000.00')).toBeInTheDocument();
    expect(screen.getAllByText('INR 4,000.00')).toHaveLength(2); // eligible balance and cash now
  });

  it('warns when the total exposure is above the company limit', () => {
    render(<AdvanceCalculationPreview preview={{
      requestType: ADVANCE_TYPE.COMPLETE_NEW, currencyCode: 'INR', cashRequested: 8000, totalAdvanceAllocation: 8000,
      exceedsLimit: true, potentialExposure: 30000, exposureLimit: 25000,
    }} />);
    expect(screen.getByText(/above the company limit/)).toBeInTheDocument();
  });

  it('renders nothing before a preview exists', () => {
    const { container } = render(<AdvanceCalculationPreview preview={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('RequestAdvancePage: request types and justification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupService.getActiveCostCenters.mockResolvedValue([]);
    lookupService.getActiveCurrencies.mockResolvedValue([{ currencyId: 'cur-1', currencyCode: 'INR', currencyName: 'Rupee' }]);
    cashAdvanceApi.getMyAdvances.mockResolvedValue({ data: { data: [openAdvance()] } });
    cashAdvanceApi.myProfile.mockResolvedValue({ employeeId: 'EMP001', fullName: 'Ravi Menon' });
  });

  it('asks for a reason for a separate advance when an outstanding balance exists', async () => {
    renderPage();
    expect(await screen.findByLabelText(/Reason for Separate Advance/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Amount Required/)).toBeInTheDocument();
  });

  it('does not ask for the reason when there is no outstanding balance', async () => {
    cashAdvanceApi.getMyAdvances.mockResolvedValue({ data: { data: [] } });
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    expect(screen.queryByLabelText(/Reason for Separate Advance/)).not.toBeInTheDocument();
  });

  it('switches to the additional amount, and hides the reason, for Cash Advance + Outstanding', async () => {
    renderPage();
    await screen.findByLabelText(/Reason for Separate Advance/);
    fireEvent.click(screen.getByRole('radio', { name: /Cash Advance \+ Outstanding/ }));

    expect(screen.getByLabelText(/Additional Amount Required/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Reason for Separate Advance/)).not.toBeInTheDocument();
  });

  it('previews through the server and shows its figures', async () => {
    cashAdvanceApi.preview.mockResolvedValue({
      requestType: ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING, currencyCode: 'INR', eligibleOutstanding: 4000,
      cashRequested: 4000, totalAdvanceAllocation: 8000, justificationRequired: false, exceedsLimit: false,
    });
    renderPage();
    await screen.findByLabelText(/Reason for Separate Advance/);
    fireEvent.click(screen.getByRole('radio', { name: /Cash Advance \+ Outstanding/ }));
    fireEvent.change(screen.getByLabelText(/Additional Amount Required/), { target: { value: '4000' } });
    await fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /Preview calculation/ }));

    await waitFor(() => expect(cashAdvanceApi.preview).toHaveBeenCalledWith(expect.objectContaining({
      requestType: ADVANCE_TYPE.ADVANCE_PLUS_OUTSTANDING, amount: 4000,
    })));
    expect(await screen.findByText('INR 8,000.00')).toBeInTheDocument();
  });

  it('shows the employee their own details, read-only', async () => {
    renderPage();
    expect(await screen.findByText('Ravi Menon')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /employee name/i })).not.toBeInTheDocument();
  });

  it('keeps the form usable when the profile cannot be loaded', async () => {
    cashAdvanceApi.myProfile.mockRejectedValue(new Error('down'));
    renderPage();
    expect(await screen.findByLabelText(/Reason for Separate Advance/)).toBeInTheDocument();
  });
});

describe('RequestAdvancePage: mandatory preview before submit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupService.getActiveCostCenters.mockResolvedValue([]);
    lookupService.getActiveCurrencies.mockResolvedValue([{ currencyId: 'cur-1', currencyCode: 'INR', currencyName: 'Rupee' }]);
    cashAdvanceApi.getMyAdvances.mockResolvedValue({ data: { data: [] } });
    cashAdvanceApi.myProfile.mockResolvedValue({ employeeId: 'EMP001', fullName: 'Ravi Menon' });
    cashAdvanceApi.preview.mockResolvedValue({
      requestType: ADVANCE_TYPE.COMPLETE_NEW, currencyCode: 'INR', existingOutstanding: 0, eligibleOutstanding: 0,
      cashRequested: 5000, totalAdvanceAllocation: 5000, justificationRequired: false, exceedsLimit: false,
    });
  });

  it('keeps Submit disabled until a preview has been calculated', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Submit Request/i })).toBeDisabled();
    expect(screen.getByText(/Preview the calculation before you submit/)).toBeInTheDocument();
  });

  it('drops the preview when the amount changes, so Submit is disabled again until a fresh preview', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/^Amount Required/), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Pune trip' } });
    fireEvent.change(screen.getByLabelText(/purpose/i), { target: { value: 'Client visit' } });
    fireEvent.change(screen.getByLabelText(/needed by date/i), { target: { value: daysFromToday(10) } });
    fireEvent.change(screen.getByLabelText(/settlement expected date/i), { target: { value: daysFromToday(20) } });
    fireEvent.click(screen.getByRole('button', { name: /select currency/i }));
    fireEvent.click(await screen.findByRole('option', { name: /INR/ }));

    fireEvent.click(screen.getByRole('button', { name: /Preview calculation/ }));
    expect(await screen.findByText('Calculation preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Request/i })).toBeEnabled();

    fireEvent.change(screen.getByLabelText(/^Amount Required/), { target: { value: '6000' } });
    await waitFor(() => expect(screen.queryByText('Calculation preview')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Submit Request/i })).toBeDisabled();
  });
});
