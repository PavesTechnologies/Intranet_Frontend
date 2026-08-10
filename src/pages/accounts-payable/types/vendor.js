/**
 * @typedef {Object} VendorAddress
 * @property {number} vendor_address_id
 * @property {string} address_type - e.g. "REGISTERED", "BILLING", "SHIPPING", "OTHER"
 * @property {string} address_line1
 * @property {string} address_line2
 * @property {string} city
 * @property {string} state
 * @property {string} postal_code
 * @property {number} country_id
 * @property {boolean} is_primary
 * @property {VendorTax[]} vendor_tax
 */

/**
 * @typedef {Object} VendorTax
 * @property {number} vendor_tax_id
 * @property {string} registration_type - e.g. "GST", "PAN", "VAT" (free text, no backend enum)
 * @property {string} registration_number
 * @property {boolean} is_verified - backend-managed, read-only in the UI
 */

/**
 * @typedef {Object} VendorBank
 * @property {number} vendor_bank_id
 * @property {string} bank_name
 * @property {string} account_holder_name
 * @property {string} account_number
 * @property {string} iban
 * @property {string} swift_code
 * @property {string} routing_number
 * @property {string} ifsc_code
 * @property {boolean} is_primary
 * @property {string} effective_from - ISO date string
 * @property {string} effective_to - ISO date string, empty while the account is open
 */

/**
 * @typedef {Object} Vendor
 * @property {number} vendor_id
 * @property {string} vendor_name
 * @property {string} vendor_code
 * @property {number} country_id
 * @property {number} payment_term_id
 * @property {number} currency_id
 * @property {string} pan_number
 * @property {string} phone_number
 * @property {string} email
 * @property {number} status_id - resolved against apLookupService.getVendorStatuses()
 * @property {VendorAddress[]} vendor_address
 * @property {VendorBank[]} vendor_bank
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/** @returns {Vendor} a blank vendor record, mirrors VendorForm's DEFAULT_VENDOR_FORM shape */
export function createEmptyVendor() {
  return {
    vendor_id: null,
    vendor_name: "",
    vendor_code: "",
    country_id: "",
    payment_term_id: "",
    currency_id: "",
    pan_number: "",
    phone_number: "",
    email: "",
    status_id: "",
    vendor_address: [],
    vendor_bank: [],
    created_at: "",
    updated_at: "",
  };
}
