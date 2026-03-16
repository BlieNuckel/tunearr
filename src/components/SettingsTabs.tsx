import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { hasPermission, type Permission } from "@shared/permissions";

export interface SettingsRoute {
  text: string;
  content?: React.ReactNode;
  route: string;
  regex: RegExp;
  requiredPermission?: Permission | Permission[];
  permissionType?: { type: "and" | "or" };
  hidden?: boolean;
}

type SettingsLinkProps = {
  tabType: "default" | "button";
  currentPath: string;
  route: string;
  regex: RegExp;
  hidden?: boolean;
  isMobile?: boolean;
  children: React.ReactNode;
};

function SettingsLink({
  children,
  tabType,
  currentPath,
  route,
  regex,
  hidden = false,
  isMobile = false,
}: SettingsLinkProps) {
  if (hidden) {
    return null;
  }

  if (isMobile) {
    return <option value={route}>{children}</option>;
  }

  const isActive = currentPath.match(regex);

  if (tabType === "button") {
    return (
      <Link
        to={route}
        className={`px-3 py-2 text-sm font-medium transition duration-300 rounded-lg whitespace-nowrap ${
          isActive
            ? "bg-pink-400 text-black shadow-cartoon-sm dark:text-black"
            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-gray-700"
        }`}
        aria-current={isActive ? "page" : undefined}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      to={route}
      className={`px-1 py-4 ml-8 text-sm font-medium leading-5 transition duration-300 border-b-2 whitespace-nowrap first:ml-0 ${
        isActive
          ? "text-pink-500 border-pink-600 dark:text-pink-400 dark:border-pink-500"
          : "border-transparent text-gray-500 dark:tI ext-gray-400 hover:text-gray-700 hover:border-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

type SettingsTabsProps = {
  tabType?: "default" | "button";
  settingsRoutes: SettingsRoute[];
};

export default function SettingsTabs({
  tabType = "default",
  settingsRoutes,
}: SettingsTabsProps) {
  const location = useLocation();
  const { user } = useAuth();

  const checkPermission = (route: SettingsRoute): boolean => {
    if (!route.requiredPermission) return true;
    if (!user) return false;

    const permissions = Array.isArray(route.requiredPermission)
      ? route.requiredPermission
      : [route.requiredPermission];

    if (route.permissionType?.type === "and") {
      return permissions.every((perm) => hasPermission(user.permissions, perm));
    }

    return permissions.some((perm) => hasPermission(user.permissions, perm));
  };

  const visibleRoutes = settingsRoutes.filter(
    (route) => !route.hidden && checkPermission(route)
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    window.location.href = e.target.value;
  };

  return (
    <>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a Tab
        </label>
        <select
          id="tabs"
          onChange={handleSelectChange}
          onBlur={handleSelectChange}
          value={
            visibleRoutes.find(
              (route) => !!location.pathname.match(route.regex)
            )?.route || ""
          }
          className="block w-full rounded-lg border-2 border-black bg-white dark:bg-gray-800 px-3 py-2 text-sm font-medium shadow-cartoon-sm"
          aria-label="Selected Tab"
        >
          {visibleRoutes.map((route, index) => (
            <SettingsLink
              tabType={tabType}
              currentPath={location.pathname}
              route={route.route}
              regex={route.regex}
              hidden={route.hidden ?? false}
              isMobile
              key={`mobile-settings-link-${index}`}
            >
              {route.text}
            </SettingsLink>
          ))}
        </select>
      </div>
      {tabType === "button" ? (
        <div className="hidden sm:block">
          <nav className="flex flex-wrap gap-2" aria-label="Tabs">
            {visibleRoutes.map((route, index) => (
              <SettingsLink
                tabType={tabType}
                currentPath={location.pathname}
                route={route.route}
                regex={route.regex}
                hidden={route.hidden ?? false}
                key={`button-settings-link-${index}`}
              >
                {route.content ?? route.text}
              </SettingsLink>
            ))}
          </nav>
        </div>
      ) : (
        <div className="hide-scrollbar hidden overflow-x-auto border-b border-gray-300 dark:border-gray-600 sm:block">
          <nav className="flex" data-testid="settings-nav-desktop">
            {visibleRoutes.map((route, index) => (
              <SettingsLink
                tabType={tabType}
                currentPath={location.pathname}
                route={route.route}
                regex={route.regex}
                key={`standard-settings-link-${index}`}
              >
                {route.text}
              </SettingsLink>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
