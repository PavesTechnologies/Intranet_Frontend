export const getNormalizedStatus = (status) =>
  String(status || "").trim().toUpperCase();

const JOINING_STATUS_STORAGE_KEY = "employee_onboarding_joining_status";

const canUseStorage = () => typeof window !== "undefined";

const readJoiningStatusMap = () => {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(JOINING_STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Failed to read joining status storage", error);
    return {};
  }
};

const writeJoiningStatusMap = (value) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(
      JOINING_STATUS_STORAGE_KEY,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error("Failed to write joining status storage", error);
  }
};

export const persistJoiningStatus = (offer) => {
  if (!offer?.user_uuid) return;

  const current = readJoiningStatusMap();

  current[offer.user_uuid] = {
    user_uuid: offer.user_uuid,
    joining_date: offer.joining_date || "",
    reporting_time: offer.reporting_time || "",
    location: offer.location || "",
    department: offer.department || "",
    reporting_manager: offer.reporting_manager || "",
    status: "JOINING",
  };

  writeJoiningStatusMap(current);
};

export const clearJoiningStatus = (userUuid) => {
  if (!userUuid) return;

  const current = readJoiningStatusMap();
  if (!current[userUuid]) return;

  delete current[userUuid];
  writeJoiningStatusMap(current);
};

const getStoredJoiningStatus = (userUuid) => {
  const current = readJoiningStatusMap();
  return current[userUuid] || null;
};

export const getOfferWithJoiningStatus = (offer = {}) => {
  const storedJoiningStatus = getStoredJoiningStatus(offer?.user_uuid);
  return storedJoiningStatus ? { ...offer, ...storedJoiningStatus } : offer;
};

export const hasJoiningDetails = (offer = {}) =>
  Boolean(
    offer?.joining_date ||
      offer?.reporting_time ||
      offer?.location ||
      offer?.department ||
      offer?.reporting_manager
  );

export const getOfferDisplayStatus = (offer, employeeUserIds = []) => {
  const baseStatus = getNormalizedStatus(offer?.status);
  const mergedOffer = getOfferWithJoiningStatus(offer);
  const isEmployeeCreated = employeeUserIds.includes(offer?.user_uuid);
  const joiningInitiated =
    getNormalizedStatus(mergedOffer?.status) === "JOINING" ||
    (baseStatus === "VERIFIED" && hasJoiningDetails(mergedOffer));

  if (isEmployeeCreated && (baseStatus === "VERIFIED" || joiningInitiated)) {
    clearJoiningStatus(offer?.user_uuid);
    return "COMPLETED";
  }

  if (joiningInitiated) {
    return "JOINING";
  }

  return baseStatus;
};

export const formatOfferStatusLabel = (status) => {
  if (!status) return "";

  return status.charAt(0) + status.slice(1).toLowerCase();
};
