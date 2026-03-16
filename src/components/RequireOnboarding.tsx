import { Navigate, Outlet } from "react-router-dom";
import { useSettings } from "@/context/useSettings";
import { useAuth } from "@/context/useAuth";
import { hasPermission, Permission } from "@shared/permissions";

function AwaitingSetup() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 dark:bg-gray-900 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Not Yet Configured
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          This app hasn&apos;t been set up yet. Please contact your
          administrator to complete the initial configuration.
        </p>
      </div>
    </div>
  );
}

export default function RequireOnboarding() {
  const { settings, isLoading } = useSettings();
  const { user } = useAuth();

  if (isLoading) return null;

  if (!settings.lidarrUrl) {
    const isAdmin =
      user != null && hasPermission(user.permissions, Permission.ADMIN);

    if (isAdmin) return <Navigate to="/onboarding" replace />;

    return <AwaitingSetup />;
  }

  return <Outlet />;
}
