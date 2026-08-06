import { useMutation, useQueryClient } from "@tanstack/react-query";
import vendorService from "../services/vendorService";
import vendorAddressService from "../services/vendorAddressService";
import vendorBankService from "../services/vendorBankService";
import vendorTaxService from "../services/vendorTaxService";
import { VENDOR_DETAIL_KEY } from "./useVendorDetail";

const invalidateVendorLists = (qc) =>
  qc.invalidateQueries({ queryKey: ["accountsPayable", "vendors"] });

// ── Vendor ──────────────────────────────────────────────────────────────

export const useCreateVendor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vendorService.createVendor(payload),
    onSuccess: () => invalidateVendorLists(qc),
  });
};

export const useUpdateVendor = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vendorService.updateVendor(vendorId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) });
      invalidateVendorLists(qc);
    },
  });
};

export const useUpdateVendorStatus = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (isActive) => vendorService.updateVendorStatus(vendorId, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) });
      invalidateVendorLists(qc);
    },
  });
};

// ── Vendor Address ──────────────────────────────────────────────────────

export const useCreateAddress = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vendorAddressService.createAddress(vendorId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};

export const useUpdateAddress = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ addressId, payload }) =>
      vendorAddressService.updateAddress(vendorId, addressId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};

export const useDeleteAddress = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (addressId) => vendorAddressService.deleteAddress(vendorId, addressId),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};

// ── Vendor Bank ─────────────────────────────────────────────────────────

export const useCreateBank = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => vendorBankService.createBank(vendorId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};

export const useUpdateBank = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bankId, payload }) => vendorBankService.updateBank(vendorId, bankId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};

export const useDeleteBank = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bankId) => vendorBankService.deleteBank(vendorId, bankId),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};

// ── Vendor Tax (scoped to a vendor address) ────────────────────────────

export const useCreateTax = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorAddressId, payload }) =>
      vendorTaxService.createTax(vendorAddressId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};

export const useUpdateTax = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorAddressId, taxId, payload }) =>
      vendorTaxService.updateTax(vendorAddressId, taxId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};

export const useDeleteTax = (vendorId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vendorAddressId, taxId }) => vendorTaxService.deleteTax(vendorAddressId, taxId),
    onSuccess: () => qc.invalidateQueries({ queryKey: VENDOR_DETAIL_KEY(vendorId) }),
  });
};
