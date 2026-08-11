import { useEffect, useState } from "react";

import LoadingSpinner from "../../../../components/LoadingSpinner";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useInvoiceDraftContext } from "../../context/InvoiceDraftContext";
import { generateSoftwareCharges } from "../../services/softwareChargeGenerationService";

// Regenerates whenever the selected assets (read from InvoiceDraftContext, shared with
// Invoice Software Selection) change. The backend performs the calculation — this component
// never touches invoice subtotal/tax/total itself.
//
// Epic 4 Phase 6 (Invoice Integration): this no longer renders its own charge table. Generated
// lines are written to InvoiceDraftContext (generatedSoftwareChargeLines) so InvoiceDraftStep
// can fold them into the same Draft Details charge-type list as every other invoice line —
// "no separate software invoice section". Only a loading affordance remains here, reusing the
// existing LoadingSpinner, since generation can take a moment after each selection change.
export default function GeneratedSoftwareCharges() {
  const { selectedSoftwareItems, setGeneratedSoftwareChargeLines } = useInvoiceDraftContext();
  const [loading, setLoading] = useState(false);

  const selectionKey = selectedSoftwareItems.map((item) => item.assetId).join(",");

  useEffect(() => {
    if (selectedSoftwareItems.length === 0) {
      setGeneratedSoftwareChargeLines([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    generateSoftwareCharges(selectedSoftwareItems)
      .then((result) => {
        if (isMounted) setGeneratedSoftwareChargeLines(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (isMounted) {
          showStatusToast("Unable to generate software charges. Please try again.", "error");
          setGeneratedSoftwareChargeLines([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  if (!loading) return null;
  return <LoadingSpinner text="Generating software charges..." size="sm" />;
}
