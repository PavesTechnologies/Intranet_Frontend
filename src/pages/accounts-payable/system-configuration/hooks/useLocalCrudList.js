import { useState, useCallback } from "react";

/**
 * Local-state stand-in for the useX / useXMutations hook pair used by the
 * other AP features (see useGoodsReceiptMutations.js, useVendorMutations.js).
 * System Configuration is frontend-only/mock for now — add/update/remove keep
 * the same call signature a real mutation hook would use, so swapping this
 * out for TanStack Query + a services/*Service.js call later is a drop-in
 * change for each tab, not a rewrite.
 */
export default function useLocalCrudList(initialItems, idKey = "id") {
  const [items, setItems] = useState(initialItems);

  const add = useCallback(
    (record) => {
      const nextId = items.reduce((max, item) => Math.max(max, item[idKey]), 0) + 1;
      const created = { ...record, [idKey]: nextId };
      setItems((prev) => [...prev, created]);
      return created;
    },
    [items, idKey]
  );

  const update = useCallback(
    (id, record) => {
      setItems((prev) =>
        prev.map((item) => (item[idKey] === id ? { ...item, ...record, [idKey]: id } : item))
      );
    },
    [idKey]
  );

  const remove = useCallback(
    (id) => {
      setItems((prev) => prev.filter((item) => item[idKey] !== id));
    },
    [idKey]
  );

  return { items, add, update, remove };
}
