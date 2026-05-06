import { STATIC_ENUMS } from "../constants/enumsData";

/**
 * Hook to provide static enums.
 * Previously fetched from API, now uses local static data as requested.
 */
export const useEnums = () => {
    /**
     * Get values for a specific enum by name.
     * @param {string} enumName - The name of the enum (e.g., 'DemandType')
     * @returns {string[]} Array of enum values
     */
    const getEnumValues = (enumName) => {
        return STATIC_ENUMS[enumName] || [];
    };

    return {
        enums: STATIC_ENUMS,
        getEnumValues,
        loading: false,
        error: null
    };
};

export default useEnums;
