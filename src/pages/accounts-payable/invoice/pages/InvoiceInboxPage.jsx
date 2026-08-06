import React from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import InvoiceTable from "../components/InvoiceTable";
import { useInboxInvoices } from "../hooks/useInvoices";

const InvoiceInboxPage = () => {
  const navigate = useNavigate();
  const { data: invoices = [], isLoading } = useInboxInvoices();

  const goToDetail = (invoice, tab) => {
    navigate(`/accounts-payable/invoices/${invoice.id}?tab=${tab}`);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <PageHeader
        title="Invoice Inbox"
        subtitle="Invoices awaiting validation or three-way matching before they can move to approval."
      />

      <PageCard>
        <PageCardContent>
          {isLoading ? (
            <LoadingSpinner text="Loading inbox..." />
          ) : (
            <InvoiceTable
              invoices={invoices}
              loading={isLoading}
              mode="inbox"
              onView={(invoice) => goToDetail(invoice, "details")}
              onValidate={(invoice) => goToDetail(invoice, "validation")}
              onMatch={(invoice) => goToDetail(invoice, "matching")}
            />
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
};

export default InvoiceInboxPage;
