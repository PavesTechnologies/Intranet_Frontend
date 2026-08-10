import { VENDOR_STATUS } from "../constants/vendorStatus";

/**
 * @typedef {Object} VendorAddress
 * @property {string} line1
 * @property {string} line2
 * @property {string} city
 * @property {string} state
 * @property {string} country
 * @property {string} postalCode
 */

/**
 * @typedef {Object} VendorBankDetails
 * @property {string} accountHolderName
 * @property {string} accountNumber
 * @property {string} bankName
 * @property {string} ifscCode
 */

/**
 * @typedef {Object} Vendor
 * @property {string} id
 * @property {string} name
 * @property {string} taxId - GSTIN/PAN or equivalent tax identifier
 * @property {string} contactEmail
 * @property {string} contactPhone
 * @property {string} status - one of VENDOR_STATUS (see constants/vendorStatus.js)
 * @property {VendorAddress} address
 * @property {VendorBankDetails} bankDetails
 * @property {string} createdAt - ISO date string
 */

/** @returns {Vendor} a blank vendor record, used as onboarding form initial state */
export function createEmptyVendor() {
  return {
    id: "",
    name: "",
    taxId: "",
    contactEmail: "",
    contactPhone: "",
    status: VENDOR_STATUS.PENDING_ONBOARDING,
    address: { line1: "", line2: "", city: "", state: "", country: "", postalCode: "" },
    bankDetails: { accountHolderName: "", accountNumber: "", bankName: "", ifscCode: "" },
    createdAt: "",
  };
}
