import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { hasPermission, type Permission } from "@shared/permissions";
import { ArrowLeftIcon, ChevronRightIcon } from "@/components/icons";
import useIsMobile from "@/hooks/useIsMobile";

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
  children: React.ReactNode;
};

type SettingsTabsProps = {
  tabType?: "default" | "button";
  settingsRoutes: SettingsRoute[];
  parentRoute?: string;
  children?: React.ReactNode;
};

function SettingsLink({
  children,
  tabType,
  currentPath,
  route,
  regex,
  hidden = false,
}: SettingsLinkProps) {
  if (hidden) {
    return null;
  }

  const isActive = currentPath.match(regex);

  if (tabType === "button") {
    return (
      <Link
        to={route}
        className={`px-3 py-2 text-sm font-medium transition duration-300 rounded-lg whitespace-nowrap ${
          isActive
            ? "bg-amber-300 text-black shadow-cartoon-sm dark:text-black"
            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-gray-700"
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
          ? "text-amber-500 border-amber-600 dark:text-amber-400 dark:border-amber-500"
          : "border-transparent text-gray-500 dark:tI ext-gray-400 hover:text-gray-700 hover:border-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-500"
      }`}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  );
}

function MobileNavItem({ route }: { route: SettingsRoute }) {
  return (
    <Link
      to={route.route}
      className="flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 transition duration-150 hover:bg-gray-50 dark:hover:bg-gray-700/50"
    >
      <span>{route.content ?? route.text}</span>
      <ChevronRightIcon className="h-5 w-5 text-gray-400 dark:text-gray-500" />
    </Link>
  );
}

function MobileBackButton({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-1.5 py-2 text-sm font-medium text-amber-600 dark:text-amber-400 transition duration-150 hover:text-amber-700 dark:hover:text-amber-300"
    >
      <ArrowLeftIcon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function checkRoutePermission(
  route: SettingsRoute,
  userPermissions: number | undefined
): boolean {
  if (!route.requiredPermission) return true;
  if (userPermissions === undefined) return false;

  const permissions = Array.isArray(route.requiredPermission)
    ? route.requiredPermission
    : [route.requiredPermission];

  if (route.permissionType?.type === "and") {
    return permissions.every((perm) => hasPermission(userPermissions, perm));
  }

  return permissions.some((perm) => hasPermission(userPermissions, perm));
}

function getVisibleRoutes(
  routes: SettingsRoute[],
  userPermissions: number | undefined
): SettingsRoute[] {
  return routes.filter(
    (route) => !route.hidden && checkRoutePermission(route, userPermissions)
  );
}

function getActiveRouteLabel(
  routes: SettingsRoute[],
  pathname: string
): string | undefined {
  return routes.find((route) => route.regex.test(pathname))?.text;
}

export default function SettingsTabs({
  tabType = "default",
  settingsRoutes,
  parentRoute,
  children,
}: SettingsTabsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const visibleRoutes = getVisibleRoutes(settingsRoutes, user?.permissions);
  const hasActiveChild = visibleRoutes.some((route) =>
    route.regex.test(location.pathname)
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    navigate(e.target.value);
  };

  const showDrillDown = parentRoute !== undefined && isMobile;

  return (
    <>
      {showDrillDown ? (
        <div className="sm:hidden" data-testid="mobile-drill-down">
          {hasActiveChild ? (
            <MobileBackButton
              to={parentRoute}
              label={
                getActiveRouteLabel(visibleRoutes, location.pathname) ?? "Back"
              }
            />
          ) : (
            <nav className="overflow-hidden rounded-lg border-2 border-black bg-white shadow-cartoon-sm dark:bg-gray-800 dark:border-gray-600 divide-y divide-gray-200 dark:divide-gray-700">
              {visibleRoutes.map((route, index) => (
                <MobileNavItem route={route} key={`mobile-nav-${index}`} />
              ))}
            </nav>
          )}
        </div>
      ) : (
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
                <option
                  value={route.route}
                  key={`mobile-settings-link-${index}`}
                >
                  {route.text}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

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

      {showDrillDown
        ? hasActiveChild && <div className="mt-6">{children}</div>
        : children && <div className="mt-6">{children}</div>}
    </>
  );
}
