import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useLidarrContext } from "@/context/useLidarrContext";
import { useAuth } from "@/context/useAuth";

export default function RequireOnboarding() {
  const { settings, isLoading } = useLidarrContext();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [appStatus, setAppStatus] = useState<{
    lidarrConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    if (isAdmin) return;

    fetch("/api/auth/app-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setAppStatus(data))
      .catch(() => setAppStatus(null));
  }, [isAdmin]);

  if (isAdmin) {
    if (isLoading) return null;
    if (!settings.lidarrUrl) return <Navigate to="/onboarding" replace />;
    return <Outlet />;
  }

  if (appStatus === null) return null;
  if (!appStatus.lidarrConfigured)
    return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}
