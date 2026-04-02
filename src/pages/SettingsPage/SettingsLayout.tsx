import { Outlet } from "react-router-dom";
import SettingsTabs from "@/components/SettingsTabs";
import type { SettingsRoute } from "@/components/SettingsTabs";
import { Permission } from "@shared/permissions";

export default function SettingsLayout() {
  const settingsRoutes: SettingsRoute[] = [
    {
      text: "General",
      route: "/settings/general",
      regex: /^\/settings\/general/,
    },
    {
      text: "Integrations",
      route: "/settings/integrations",
      regex: /^\/settings\/integrations/,
      requiredPermission: Permission.ADMIN,
    },
    {
      text: "Recommendations",
      route: "/settings/recommendations",
      regex: /^\/settings\/recommendations/,
      requiredPermission: Permission.ADMIN,
    },
    {
      text: "Notifications",
      route: "/settings/notifications",
      regex: /^\/settings\/notifications/,
      requiredPermission: Permission.ADMIN,
    },
    {
      text: "Users",
      route: "/settings/users",
      regex: /^\/settings\/users/,
      requiredPermission: Permission.MANAGE_USERS,
    },
    {
      text: "Logs",
      route: "/settings/logs",
      regex: /^\/settings\/logs/,
      requiredPermission: Permission.ADMIN,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Settings
        </h1>
      </div>

      <SettingsTabs settingsRoutes={settingsRoutes} parentRoute="/settings">
        <Outlet />
      </SettingsTabs>
    </div>
  );
}
