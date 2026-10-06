import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import tdsConfigService from "../services/tdsConfigService";
import {
  mapRuleFromApi,
  mapRuleToApi,
  mapPaymentNatureFromApi,
  mapPaymentNatureToApi,
  mapDeductorFromApi,
  mapDeductorToApi,
} from "../services/tdsConfigMapper";

export const TDS_RULES_KEY = (filters) => ["accountsPayable", "tdsRules", filters];
export const TDS_RULE_DETAIL_KEY = (ruleId) => ["accountsPayable", "tdsRule", ruleId];
export const TDS_PAYMENT_NATURES_KEY = ["accountsPayable", "tdsPaymentNatures"];
export const TDS_DEDUCTORS_KEY = ["accountsPayable", "tdsDeductors"];
export const TDS_METADATA_KEY = ["accountsPayable", "tdsConfigMetadata"];

const invalidateRules = (qc) => qc.invalidateQueries({ queryKey: ["accountsPayable", "tdsRules"] });
const invalidateNatures = (qc) => qc.invalidateQueries({ queryKey: TDS_PAYMENT_NATURES_KEY });
const invalidateDeductors = (qc) => qc.invalidateQueries({ queryKey: TDS_DEDUCTORS_KEY });

// ── TDS Rules ────────────────────────────────────────────────────────────
/** @param {{search?: string, status?: string, paymentNature?: string, effectiveDate?: string,
 *   deductorId?: number}} [filters] Server-side filtering, per the backend contract — not a
 *   client-side .filter() over the full list. */
export function useTdsRules(filters = {}) {
  return useQuery({
    queryKey: TDS_RULES_KEY(filters),
    queryFn: async () => {
      const raw = await tdsConfigService.getRules(filters);
      const list = Array.isArray(raw) ? raw : raw?.items || [];
      return list.map(mapRuleFromApi);
    },
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
}

export function useTdsRule(ruleId) {
  return useQuery({
    queryKey: TDS_RULE_DETAIL_KEY(ruleId),
    queryFn: async () => mapRuleFromApi(await tdsConfigService.getRule(ruleId)),
    enabled: Boolean(ruleId),
    staleTime: 15_000,
    retry: 1,
  });
}

export function useCreateTdsRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form) => tdsConfigService.createRule(mapRuleToApi(form)),
    onSuccess: () => invalidateRules(qc),
  });
}

export function useUpdateTdsRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, form }) => tdsConfigService.updateRule(ruleId, mapRuleToApi(form)),
    onSuccess: (_, { ruleId }) => {
      qc.invalidateQueries({ queryKey: TDS_RULE_DETAIL_KEY(ruleId) });
      invalidateRules(qc);
    },
  });
}

export function useUpdateTdsRuleStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, isActive }) => tdsConfigService.updateRuleStatus(ruleId, isActive),
    onSuccess: (_, { ruleId }) => {
      qc.invalidateQueries({ queryKey: TDS_RULE_DETAIL_KEY(ruleId) });
      invalidateRules(qc);
    },
  });
}

/** Backend returns 409 when the rule is referenced/in use — surfaced via error.status at the
 * call site (see TdsRulesSection.jsx), not swallowed here. */
export function useDeleteTdsRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ruleId) => tdsConfigService.deleteRule(ruleId),
    onSuccess: () => invalidateRules(qc),
  });
}

// ── Nature of Payment ───────────────────────────────────────────────────
export function useTdsPaymentNatures() {
  return useQuery({
    queryKey: TDS_PAYMENT_NATURES_KEY,
    queryFn: async () => {
      const raw = await tdsConfigService.getPaymentNatures();
      const list = Array.isArray(raw) ? raw : raw?.items || [];
      return list.map(mapPaymentNatureFromApi);
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateTdsPaymentNature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form) => tdsConfigService.createPaymentNature(mapPaymentNatureToApi(form)),
    onSuccess: () => invalidateNatures(qc),
  });
}

export function useUpdateTdsPaymentNature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }) => tdsConfigService.updatePaymentNature(id, mapPaymentNatureToApi(form)),
    onSuccess: () => invalidateNatures(qc),
  });
}

export function useUpdateTdsPaymentNatureStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => tdsConfigService.updatePaymentNatureStatus(id, isActive),
    onSuccess: () => invalidateNatures(qc),
  });
}

export function useDeleteTdsPaymentNature() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => tdsConfigService.deletePaymentNature(id),
    onSuccess: () => invalidateNatures(qc),
  });
}

// ── Deductor ─────────────────────────────────────────────────────────────
export function useTdsDeductors() {
  return useQuery({
    queryKey: TDS_DEDUCTORS_KEY,
    queryFn: async () => {
      const raw = await tdsConfigService.getDeductors();
      const list = Array.isArray(raw) ? raw : raw?.items || [];
      return list.map(mapDeductorFromApi);
    },
    staleTime: 30_000,
    retry: 1,
  });
}

export function useCreateTdsDeductor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (form) => tdsConfigService.createDeductor(mapDeductorToApi(form)),
    onSuccess: () => invalidateDeductors(qc),
  });
}

export function useUpdateTdsDeductor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, form }) => tdsConfigService.updateDeductor(id, mapDeductorToApi(form)),
    onSuccess: () => invalidateDeductors(qc),
  });
}

export function useUpdateTdsDeductorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => tdsConfigService.updateDeductorStatus(id, isActive),
    onSuccess: () => invalidateDeductors(qc),
  });
}

export function useDeleteTdsDeductor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => tdsConfigService.deleteDeductor(id),
    onSuccess: () => invalidateDeductors(qc),
  });
}

// ── Metadata ─────────────────────────────────────────────────────────────
export function useTdsConfigMetadata() {
  return useQuery({
    queryKey: TDS_METADATA_KEY,
    queryFn: () => tdsConfigService.getMetadata(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

// ── Excel Import ─────────────────────────────────────────────────────────
export function useValidateTdsImport() {
  return useMutation({
    mutationFn: (file) => tdsConfigService.validateImport(file),
  });
}

export function useImportTdsConfiguration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file) => tdsConfigService.importConfiguration(file),
    onSuccess: () => {
      invalidateRules(qc);
      invalidateNatures(qc);
      invalidateDeductors(qc);
    },
  });
}
