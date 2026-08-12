// Shared state for the Invoice Draft flow, introduced in Epic 4 Phase 5 (Software Charge
// Generation) so selectedSoftwareItems no longer lives in InvoiceDraftStep's local state and
// can be read by both Invoice Software Selection and Generated Software Charges without prop
// drilling. No pre-existing Invoice/Billing context was found in this module (grepped for
// createContext/useContext across account_receivable) — this follows the same
// createContext + Provider + hook shape already used at src/contexts/JobProgressContext.jsx.
// Deliberately plain React Context, no Redux, no localStorage — this is preview-only state
// that should reset with the page, not persist.
//
// Epic 4 Phase 6 (Invoice Integration) extends this with generatedSoftwareChargeLines — the
// backend-calculated lines Software Charge Generation produces — so InvoiceDraftStep can fold
// them into the same charge-type list as Labor/Contract/Milestone/Recurring/Expense/Tool
// without another context.
import { createContext, useContext, useState } from "react";

const InvoiceDraftContext = createContext(null);

export function InvoiceDraftProvider({ children }) {
  const [selectedSoftwareItems, setSelectedSoftwareItems] = useState([]);
  const [generatedSoftwareChargeLines, setGeneratedSoftwareChargeLines] = useState([]);

  return (
    <InvoiceDraftContext.Provider
      value={{
        selectedSoftwareItems,
        setSelectedSoftwareItems,
        generatedSoftwareChargeLines,
        setGeneratedSoftwareChargeLines,
      }}
    >
      {children}
    </InvoiceDraftContext.Provider>
  );
}

export function useInvoiceDraftContext() {
  const context = useContext(InvoiceDraftContext);
  if (!context) {
    throw new Error("useInvoiceDraftContext must be used within an InvoiceDraftProvider");
  }
  return context;
}
