import { useState, useMemo, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { hasPermission } from "@shared/permissions";
import { Permission } from "@shared/permissions";
import { useRequests } from "@/hooks/useRequests";
import useWantedList from "@/hooks/useWantedList";
import usePurchaseList from "@/hooks/usePurchaseList";
import useIsMobile from "@/hooks/useIsMobile";
import { useSettings } from "@/context/useSettings";
import { DEFAULT_SPENDING } from "@/context/spendingDefaults";
import SettingsTabs, { type SettingsRoute } from "@/components/SettingsTabs";
import RequestFilter from "./components/RequestFilter";
import RequestList from "./components/RequestList";
import WantedList from "./components/WantedList";
import PurchaseList from "./components/PurchaseList";
import SpendingSummary from "./components/SpendingSummary";
import Skeleton from "@/components/Skeleton";

const libraryTabs: SettingsRoute[] = [
  {
    text: "Purchases",
    route: "/library/purchases",
    regex: /^\/library\/purchases/,
  },
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
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  const spending = settings.spending ?? DEFAULT_SPENDING;
  const [filters, setFilters] = useState<Record<string, string[]>>({
    requester: [],
    status: [],
  });

  const isRequestsTab = /^\/library\/requests/.test(location.pathname);
  const isPurchasesTab = /^\/library\/purchases/.test(location.pathname);
  const isWantedTab = /^\/library\/wanted/.test(location.pathname);
  const isSubTab = isRequestsTab || isWantedTab || isPurchasesTab;

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
  const {
    items: purchaseItems,
    summary: purchaseSummary,
    loading: purchasesLoading,
    error: purchasesError,
    removeItem: removePurchaseItem,
  } = usePurchaseList();

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

  if (isMobile && isSubTab) {
    return (
      <div className="space-y-6">
        <SettingsTabs
          settingsRoutes={libraryTabs}
          parentRoute="/library"
          mobileBackLabel="Library"
        >
          <>
            {isPurchasesTab && (
              <PurchaseList
                items={purchaseItems}
                loading={purchasesLoading}
                error={purchasesError}
                onRemove={removePurchaseItem}
              />
            )}

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

  return (
    <div className="space-y-6">
      <Outlet />
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Library
      </h1>

      {purchasesLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : (
        purchaseSummary && (
          <SpendingSummary
            summary={purchaseSummary}
            currency={spending.currency}
            monthlyLimit={spending.monthlyLimit}
          />
        )
      )}

      <SettingsTabs
        settingsRoutes={libraryTabs}
        parentRoute="/library"
        mobileBackLabel="Library"
      >
        <>
          {isPurchasesTab && (
            <PurchaseList
              items={purchaseItems}
              loading={purchasesLoading}
              error={purchasesError}
              onRemove={removePurchaseItem}
            />
          )}

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
