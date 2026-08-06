import React, { useEffect, useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { showStatusToast } from "../../../../components/toastfy/toast";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "../hooks/useNotificationSettings";
import NotificationRuleList from "../components/NotificationRuleList";

export default function NotificationSettingsPage() {
  const { data, isLoading, isError, error } = useNotificationSettings();
  const updateNotificationSettings = useUpdateNotificationSettings();

  const [settings, setSettings] = useState({});

  useEffect(() => {
    if (data) {
      setSettings(data);
    }
  }, [data]);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    try {
      await updateNotificationSettings.mutateAsync(settings);
      showStatusToast("Notification settings saved successfully.", "success");
    } catch (err) {
      showStatusToast(err?.message || "Failed to save notification settings.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Settings"
        subtitle="Choose which AP events trigger notifications to your team."
      />

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load notification settings{error?.message ? `: ${error.message}` : "."}
        </div>
      )}

      <PageCard>
        <PageCardContent>
          {isLoading ? (
            <LoadingSpinner text="Loading notification settings..." />
          ) : (
            <>
              <NotificationRuleList settings={settings} onToggle={handleToggle} />

              <div className="mt-6 flex justify-end border-t border-gray-100 pt-4">
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={updateNotificationSettings.isPending}
                  loadingText="Saving..."
                >
                  Save Changes
                </Button>
              </div>
            </>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
