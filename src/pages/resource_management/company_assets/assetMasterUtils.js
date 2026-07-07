export const getCategoryId = (category) =>
  category?.categoryId ?? category?.assetCategoryId ?? category?.id;

export const getTypeId = (type) =>
  type?.typeId ?? type?.assetTypeId ?? type?.id;

export const isActive = (item) => {
  if (typeof item?.activeFlag === "boolean") return item.activeFlag;
  if (typeof item?.isActive === "boolean") return item.isActive;
  return String(item?.status || "").toUpperCase() === "ACTIVE";
};

export const normalizeCategory = (category = {}) => ({
  ...category,
  categoryId: getCategoryId(category),
  categoryCode: category.categoryCode ?? category.code ?? "",
  categoryName: category.categoryName ?? category.name ?? "",
  description: category.description ?? "",
  displayOrder: category.displayOrder ?? "",
  activeFlag: isActive(category),
});

export const normalizeType = (type = {}) => {
  const category = type.category ?? type.assetCategory ?? {};

  return {
    ...type,
    typeId: getTypeId(type),
    typeCode: type.typeCode ?? type.code ?? "",
    typeName: type.typeName ?? type.name ?? "",
    description: type.description ?? "",
    displayOrder: type.displayOrder ?? "",
    activeFlag: isActive(type),
    categoryId:
      type.categoryId ??
      type.assetCategoryId ??
      category.categoryId ??
      category.assetCategoryId ??
      category.id ??
      "",
    categoryName:
      type.categoryName ??
      category.categoryName ??
      category.name ??
      "",
  };
};

export const responseMessage = (response, fallback) =>
  response?.message || response?.data?.message || fallback;

export const buildCategoryPayload = (values) => ({
  categoryCode: values.categoryCode.trim(),
  categoryName: values.categoryName.trim(),
  description: values.description?.trim() || "",
  displayOrder: values.displayOrder === "" ? null : Number(values.displayOrder),
  activeFlag: Boolean(values.activeFlag),
});

export const buildTypePayload = (values) => ({
  categoryId: values.categoryId,
  category: { categoryId: values.categoryId },
  typeCode: values.typeCode.trim(),
  typeName: values.typeName.trim(),
  description: values.description?.trim() || "",
  displayOrder: values.displayOrder === "" ? null : Number(values.displayOrder),
  activeFlag: Boolean(values.activeFlag),
});
