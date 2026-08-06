import React from "react";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import VendorTaxList from "./VendorTaxList";

/**
 * Consolidated Tax tab — Vendor Tax is scoped to a vendor address, so this
 * groups every address's tax registrations together (reusing the same
 * VendorTaxList used inline on the Addresses tab, so add/edit/delete and
 * cache invalidation behave identically in both places).
 */
const VendorTaxTab = ({ vendorId, addresses = [], onGoToAddresses }) => {
  if (addresses.length === 0) {
    return (
      <PageCard>
        <PageCardContent className="space-y-2 text-center">
          <p className="text-sm italic text-gray-500">
            Tax registrations are scoped to a vendor address — add an address first.
          </p>
          {onGoToAddresses && (
            <button
              type="button"
              onClick={onGoToAddresses}
              className="text-sm font-medium text-[#0A0082] hover:underline"
            >
              Go to Addresses
            </button>
          )}
        </PageCardContent>
      </PageCard>
    );
  }

  return (
    <div className="space-y-4">
      {addresses.map((address) => (
        <PageCard key={address.vendor_address_id}>
          <PageCardContent className="space-y-3">
            <div>
              <p className={Fonts.label}>
                {address.address_type} — {address.address_line1}, {address.city}
              </p>
            </div>
            <VendorTaxList vendorId={vendorId} address={address} />
          </PageCardContent>
        </PageCard>
      ))}
    </div>
  );
};

export default VendorTaxTab;
