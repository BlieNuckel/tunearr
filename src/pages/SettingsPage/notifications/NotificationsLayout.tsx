import SettingsTabs, { type SettingsRoute } from "@/components/SettingsTabs";
import { EnvelopeIcon } from "@heroicons/react/24/solid";

type NotificationsLayoutProps = {
  children: React.ReactNode;
};

export default function NotificationsLayout({
  children,
}: NotificationsLayoutProps) {
  const settingsRoutes: SettingsRoute[] = [
    {
      text: "Email",
      content: (
        <span className="flex items-center gap-2">
          <EnvelopeIcon className="h-4 w-4" />
          Email
        </span>
      ),
      route: "/settings/notifications/email",
      regex: /^\/settings\/notifications\/email/,
    },
    {
      text: "Webhook",
      content: (
        <span className="flex items-center gap-2">
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          Webhook
        </span>
      ),
      route: "/settings/notifications/webhook",
      regex: /^\/settings\/notifications\/webhook/,
    },
  ];

  return (
    <>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Notification Settings
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure and enable notification agents.
        </p>
      </div>
      <SettingsTabs tabType="button" settingsRoutes={settingsRoutes} />
      <div className="mt-6">{children}</div>
    </>
  );
}
