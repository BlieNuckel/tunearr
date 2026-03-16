import { useState } from "react";

type EmailSettings = {
  enabled: boolean;
  senderName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  useTLS: boolean;
};

export default function EmailNotificationsSection() {
  const [settings, setSettings] = useState<EmailSettings>({
    enabled: false,
    senderName: "",
    senderEmail: "",
    smtpHost: "",
    smtpPort: 587,
    username: "",
    password: "",
    useTLS: true,
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
          emailNotifications: settings,
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");
    } catch (error) {
      console.error("Failed to save email settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch("/api/notifications/email/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Test failed");
      alert("Test email sent successfully!");
    } catch (error) {
      console.error("Failed to send test email:", error);
      alert("Failed to send test email");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="email-enabled"
          checked={settings.enabled}
          onChange={(e) =>
            setSettings({ ...settings, enabled: e.target.checked })
          }
          className="h-4 w-4 rounded border-2 border-black"
        />
        <label
          htmlFor="email-enabled"
          className="text-sm font-medium text-gray-900 dark:text-gray-100"
        >
          Enable Email Notifications
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="sender-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Sender Name
          </label>
          <input
            type="text"
            id="sender-name"
            value={settings.senderName}
            onChange={(e) =>
              setSettings({ ...settings, senderName: e.target.value })
            }
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="Tunearr"
          />
        </div>

        <div>
          <label
            htmlFor="sender-email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Sender Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="sender-email"
            value={settings.senderEmail}
            onChange={(e) =>
              setSettings({ ...settings, senderEmail: e.target.value })
            }
            required
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="noreply@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="smtp-host"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            SMTP Host <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="smtp-host"
            value={settings.smtpHost}
            onChange={(e) =>
              setSettings({ ...settings, smtpHost: e.target.value })
            }
            required
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="smtp.gmail.com"
          />
        </div>

        <div>
          <label
            htmlFor="smtp-port"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            SMTP Port <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            id="smtp-port"
            value={settings.smtpPort}
            onChange={(e) =>
              setSettings({ ...settings, smtpPort: parseInt(e.target.value) })
            }
            required
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="587"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Common ports: 587 (STARTTLS), 465 (SSL/TLS), 25 (plain)
          </p>
        </div>

        <div>
          <label
            htmlFor="smtp-username"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            SMTP Username
          </label>
          <input
            type="text"
            id="smtp-username"
            value={settings.username}
            onChange={(e) =>
              setSettings({ ...settings, username: e.target.value })
            }
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoComplete="off"
          />
        </div>

        <div>
          <label
            htmlFor="smtp-password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            SMTP Password
          </label>
          <input
            type="password"
            id="smtp-password"
            value={settings.password}
            onChange={(e) =>
              setSettings({ ...settings, password: e.target.value })
            }
            className="w-full px-3 py-2 border-2 border-black rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            autoComplete="off"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="use-tls"
            checked={settings.useTLS}
            onChange={(e) =>
              setSettings({ ...settings, useTLS: e.target.checked })
            }
            className="h-4 w-4 rounded border-2 border-black"
          />
          <label
            htmlFor="use-tls"
            className="text-sm font-medium text-gray-900 dark:text-gray-100"
          >
            Use TLS/STARTTLS
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleTest}
          disabled={isTesting || !settings.senderEmail || !settings.smtpHost}
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
