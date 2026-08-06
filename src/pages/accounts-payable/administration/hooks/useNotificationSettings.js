import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apConfigService from "../services/apConfigService";

export const NOTIFICATION_SETTINGS_KEY = [
  "accountsPayable",
  "administration",
  "notificationSettings",
];

export const useNotificationSettings = () =>
  useQuery({
    queryKey: NOTIFICATION_SETTINGS_KEY,
    queryFn: apConfigService.getNotificationSettings,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 2,
  });

export const useUpdateNotificationSettings = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (settings) => apConfigService.updateNotificationSettings(settings),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATION_SETTINGS_KEY });
    },
  });
};

export default useNotificationSettings;
