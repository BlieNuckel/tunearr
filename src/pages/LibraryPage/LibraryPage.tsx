import { useState, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { hasPermission } from "@shared/permissions";
import { Permission } from "@shared/permissions";
import { useRequests } from "@/hooks/useRequests";
import useWantedList from "@/hooks/useWantedList";
import SettingsTabs, { type SettingsRoute } from "@/components/SettingsTabs";
import RequestFilter from "./components/RequestFilter";
import RequestList from "./components/RequestList";
import WantedList from "./components/WantedList";

const libraryTabs: SettingsRoute[] = [
  {
    text: "Wanted",
    route: "/library/wanted",
    regex: /^\/library\/wanted/,
  },
  {
    text: "Requests",
    route: "/library/requests",
    regex: /^\/library\/requests/,
  },
];

export default function LibraryPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [filters, setFilters] = useState<Record<string, string[]>>({
    requester: [],
    status: [],
  });

  const isRequestsTab = /^\/library\/requests/.test(location.pathname);
  const isWantedTab = !isRequestsTab;

  const canViewAll =
    user !== null &&
    hasPermission(user.permissions, [
      Permission.REQUEST_VIEW,
      Permission.MANAGE_REQUESTS,
    ]);
  const canManageRequests =
    user !== null &&
    hasPermission(user.permissions, Permission.MANAGE_REQUESTS);
  const isAdmin =
    user !== null && hasPermission(user.permissions, Permission.ADMIN);

  const showMine = filters.requester.includes("mine") || !canViewAll;
  const effectiveShowAll = canViewAll && !filters.requester.includes("mine");
  const requestsOptions = useMemo(
    () => ({
      ...(showMine ? { userId: user?.id } : {}),
      ...(filters.status.length > 0 ? { status: filters.status } : {}),
    }),
    [showMine, user?.id, filters.status]
  );
  const { requests, loading, error, approveRequest, declineRequest, refresh } =
    useRequests(requestsOptions);
  const {
    items: wantedItems,
    loading: wantedLoading,
    error: wantedError,
    removeItem: removeWantedItem,
  } = useWantedList();

  const handleFilterChange = useCallback((key: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  }, []);

  const handleSearch = useCallback(async (albumId: number) => {
    try {
      await fetch("/api/lidarr/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumIds: [albumId] }),
      });
    } catch {
      // Silently fail — user can retry
    }
  }, []);

  const handleUnmonitor = useCallback(
    async (albumMbid: string) => {
      try {
        const res = await fetch("/api/lidarr/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ albumMbid }),
        });
        if (res.ok) refresh();
      } catch {
        // Silently fail — user can retry
      }
    },
    [refresh]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Library
      </h1>

      <SettingsTabs settingsRoutes={libraryTabs} parentRoute="/library">
        <>
          {isWantedTab && (
            <WantedList
              items={wantedItems}
              loading={wantedLoading}
              error={wantedError}
              onRemove={removeWantedItem}
            />
          )}

          {isRequestsTab && (
            <>
              <RequestFilter values={filters} onChange={handleFilterChange} />

              <RequestList
                requests={requests}
                loading={loading}
                error={error}
                emptyMessage={
                  showMine
                    ? "You haven't made any requests yet"
                    : "No requests yet"
                }
                showUser={effectiveShowAll}
                showActions={canManageRequests && effectiveShowAll}
                showAdminDetails={isAdmin}
                onApprove={approveRequest}
                onDecline={declineRequest}
                onSearch={handleSearch}
                onUnmonitor={handleUnmonitor}
              />
            </>
          )}
        </>
      </SettingsTabs>
    </div>
  );
}
