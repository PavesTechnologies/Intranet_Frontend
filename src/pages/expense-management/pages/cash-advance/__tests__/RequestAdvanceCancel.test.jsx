import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RequestAdvancePage from '../RequestAdvancePage';
import { cashAdvanceApi } from '../../../api/cashAdvanceApi';
import { lookupService } from '../../../api/expenseReportsApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
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
  fireEvent.change(screen.getByLabelText(/^Amount Required/), { target: { value: '5000' } });
  fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Pune trip' } });
  fireEvent.change(screen.getByLabelText(/purpose/i), { target: { value: 'Client visit' } });
  fireEvent.change(screen.getByLabelText(/needed by date/i), { target: { value: daysFromToday(10) } });
  fireEvent.change(screen.getByLabelText(/settlement expected date/i), { target: { value: daysFromToday(20) } });
  fireEvent.click(screen.getByRole('button', { name: /select currency/i }));
  fireEvent.click(await screen.findByRole('option', { name: /INR/ }));
}

// Adding a document saves a draft behind the scenes, so the document has a request to belong to.
async function addDocument() {
  const file = new File(['x'], 'ticket.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText(/Add supporting documents/), { target: { files: [file] } });
  expect(await screen.findByText('Uploaded')).toBeInTheDocument();
}

describe('RequestAdvancePage: Cancel and leaving the page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lookupService.getActiveCostCenters.mockResolvedValue([]);
    lookupService.getActiveCurrencies.mockResolvedValue([{ currencyId: 'cur-1', currencyCode: 'INR', currencyName: 'Rupee' }]);
    cashAdvanceApi.getMyAdvances.mockResolvedValue({ data: { data: [] } });
    cashAdvanceApi.myProfile.mockResolvedValue({ employeeId: 'EMP001', fullName: 'Ravi Menon' });
    cashAdvanceApi.create.mockResolvedValue({ data: { data: { advanceId: 'draft-1' } } });
    cashAdvanceApi.uploadDocument.mockResolvedValue({});
    cashAdvanceApi.listDocuments.mockResolvedValue([
      { documentId: 'doc-1', originalFileName: 'ticket.png', category: 'OTHER', fileSizeBytes: 1 },
    ]);
    cashAdvanceApi.deleteDocument.mockResolvedValue({});
    cashAdvanceApi.delete.mockResolvedValue({});
  });

  it('leaves at once when nothing was entered', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/expense-management/cash-advance/my'));
    expect(screen.queryByText('Discard this request?')).not.toBeInTheDocument();
    expect(cashAdvanceApi.delete).not.toHaveBeenCalled();
  });

  it('asks before discarding typed input, and Keep editing stays on the page', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Pune trip' } });

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }));
    expect(await screen.findByText('Discard this request?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Keep editing/ }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Pune trip');
  });

  it('Cancel removes the draft created for an uploaded document, with its document', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    await fillForm();
    await addDocument();
    expect(cashAdvanceApi.create).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/ }));
    fireEvent.click(await screen.findByRole('button', { name: /Discard and leave/ }));

    await waitFor(() => expect(cashAdvanceApi.delete).toHaveBeenCalledWith('draft-1'));
    expect(cashAdvanceApi.deleteDocument).toHaveBeenCalledWith('draft-1', 'doc-1');
    expect(mockNavigate).toHaveBeenCalledWith('/expense-management/cash-advance/my');
  });

  it('leaving the page another way (Back, the menu) also removes that draft', async () => {
    const { unmount } = renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    await fillForm();
    await addDocument();

    unmount();

    await waitFor(() => expect(cashAdvanceApi.delete).toHaveBeenCalledWith('draft-1'));
  });

  it('keeps the draft when the employee pressed Save Draft', async () => {
    cashAdvanceApi.update.mockResolvedValue({});
    const { unmount } = renderPage();
    await waitFor(() => expect(screen.getByText(/no outstanding cash advance/)).toBeInTheDocument());
    await fillForm();
    await addDocument();

    fireEvent.click(screen.getByRole('button', { name: /Save Draft/ }));
    await waitFor(() => expect(cashAdvanceApi.update).toHaveBeenCalledWith('draft-1', expect.any(Object)));
    unmount();

    await new Promise((r) => setTimeout(r, 0));
    expect(cashAdvanceApi.delete).not.toHaveBeenCalled();
  });
});
