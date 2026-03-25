import { useState } from "react";

type WebhookSettings = {
  enabled: boolean;
  url: string;
  authHeader: string;
  jsonPayload: string;
};

const DEFAULT_PAYLOAD = JSON.stringify(
  {
    event: "{{event}}",
    type: "{{type}}",
    subject: "{{subject}}",
    message: "{{message}}",
    request: {
      id: "{{request_id}}",
      user: "{{request_user}}",
      status: "{{request_status}}",
    },
  },
  null,
  2
);

export default function WebhookNotificationsSection() {
  const [settings, setSettings] = useState<WebhookSettings>({
    enabled: false,
    url: "",
    authHeader: "",
    jsonPayload: DEFAULT_PAYLOAD,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookNotifications: settings,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");
    } catch (error) {
      console.error("Failed to save webhook settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch("/api/notifications/webhook/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Test failed");
      alert("Test webhook sent successfully!");
    } catch (error) {
      console.error("Failed to send test webhook:", error);
      alert("Failed to send test webhook");
    } finally {
      setIsTesting(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...settings, jsonPayload: DEFAULT_PAYLOAD });
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="webhook-enabled"
          checked={settings.enabled}
          onChange={(e) =>
            setSettings({ ...settings, enabled: e.target.checked })
          }
          className="h-4 w-4 rounded border-2 border-black"
        />
        <label
          htmlFor="webhook-enabled"
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          Enable Webhook Notifications
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="webhook-url"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Webhook URL <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            id="webhook-url"
            value={settings.url}
            onChange={(e) => setSettings({ ...settings, url: e.target.value })}
            required
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="https://example.com/webhook"
          />
        </div>

        <div>
          <label
            htmlFor="auth-header"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Authorization Header
          </label>
          <input
            type="text"
            id="auth-header"
            value={settings.authHeader}
            onChange={(e) =>
              setSettings({ ...settings, authHeader: e.target.value })
            }
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="Bearer your-token-here"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Optional authorization header value
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="json-payload"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              JSON Payload <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Reset to Default
            </button>
          </div>
          <textarea
            id="json-payload"
            value={settings.jsonPayload}
            onChange={(e) =>
              setSettings({ ...settings, jsonPayload: e.target.value })
            }
            required
            rows={12}
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm"
            placeholder={DEFAULT_PAYLOAD}
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Available variables: {`{{event}}`}, {`{{type}}`}, {`{{subject}}`},{" "}
            {`{{message}}`}, {`{{request_id}}`}, {`{{request_user}}`},{" "}
            {`{{request_status}}`}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting || !settings.url}
          className="px-4 py-2 text-sm font-bold rounded-lg border-2 border-black bg-yellow-400 text-black shadow-cartoon-sm hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isTesting ? "Testing..." : "Test"}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 text-sm font-bold rounded-lg border-2 border-black bg-pink-400 text-black shadow-cartoon-sm hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
