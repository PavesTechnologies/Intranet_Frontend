import { useCallback, useEffect, useState } from "react";
import {
  assetCategoryApi,
  assetTypeApi,
  normalizePagedResponse,
} from "./assetMasterService";
import { normalizeCategory, normalizeType } from "./assetMasterUtils";
import { notify } from "../utils/notify";

const DEFAULT_PAGE = {
  current: 0,
  size: 8,
  totalElements: 0,
  totalPages: 0,
};

export const useAssetCategories = (filters, sort) => {
  const [categories, setCategories] = useState([]);
  const [pageInfo, setPageInfo] = useState(DEFAULT_PAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await assetCategoryApi.search({
        categoryCode: filters.categoryCode,
        categoryName: filters.categoryName,
        search: filters.search,
        page: pageInfo.current,
        size: pageInfo.size,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      const page = normalizePagedResponse(response);
      setCategories(page.records.map(normalizeCategory));
      setPageInfo((prev) => ({
        ...prev,
        totalElements: page.totalElements,
        totalPages: page.totalPages,
      }));
    } catch (err) {
      setCategories([]);
      setPageInfo((prev) => ({ ...prev, totalElements: 0, totalPages: 0 }));
      setError("Failed To Load Asset Categories.");
      notify.error(err, "Failed To Load Asset Categories.");
    } finally {
      setLoading(false);
    }
  }, [filters, pageInfo.current, pageInfo.size, sort]);

  useEffect(() => {
    const timer = setTimeout(fetchCategories, 350);
    return () => clearTimeout(timer);
  }, [fetchCategories]);

  return { categories, pageInfo, setPageInfo, loading, error, refresh: fetchCategories };
};

export const useActiveAssetCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActiveCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await assetCategoryApi.getActive();
      const records = normalizePagedResponse(response).records;
      setCategories(records.map(normalizeCategory).filter((item) => item.activeFlag));
    } catch (err) {
      setCategories([]);
      notify.error(err, "Failed To Load Active Categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveCategories();
  }, [fetchActiveCategories]);

  return { categories, loading, refresh: fetchActiveCategories };
};

export const useAssetTypes = (filters, sort) => {
  const [types, setTypes] = useState([]);
  const [pageInfo, setPageInfo] = useState(DEFAULT_PAGE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTypes = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await assetTypeApi.search({
        search: filters.search,
        categoryId: filters.categoryId,
        page: pageInfo.current,
        size: pageInfo.size,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
      });
      const page = normalizePagedResponse(response);
      setTypes(page.records.map(normalizeType));
      setPageInfo((prev) => ({
        ...prev,
        totalElements: page.totalElements,
        totalPages: page.totalPages,
      }));
    } catch (err) {
      setTypes([]);
      setPageInfo((prev) => ({ ...prev, totalElements: 0, totalPages: 0 }));
      setError("Failed To Load Asset Types.");
      notify.error(err, "Failed To Load Asset Types.");
    } finally {
      setLoading(false);
    }
  }, [filters, pageInfo.current, pageInfo.size, sort]);

  useEffect(() => {
    const timer = setTimeout(fetchTypes, 350);
    return () => clearTimeout(timer);
  }, [fetchTypes]);

  return { types, pageInfo, setPageInfo, loading, error, refresh: fetchTypes };
};
