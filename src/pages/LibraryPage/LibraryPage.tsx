import { useState, useMemo } from "react";
import { useAuth } from "@/context/useAuth";
import { hasPermission } from "@shared/permissions";
import { Permission } from "@shared/permissions";
import { useRequests } from "@/hooks/useRequests";
import LibraryTabs from "./components/LibraryTabs";
import RequestList from "./components/RequestList";
import DownloadsTab from "./components/DownloadsTab";
import type { LibraryTab } from "./components/LibraryTabs";

type TabDef = { id: LibraryTab; label: string };

function getVisibleTabs(permissions: number | undefined): TabDef[] {
  const tabs: TabDef[] = [{ id: "my-requests", label: "My Requests" }];

  if (
    permissions !== undefined &&
    hasPermission(permissions, [
      Permission.REQUEST_VIEW,
      Permission.MANAGE_REQUESTS,
    ])
  ) {
    tabs.push({ id: "all-requests", label: "All Requests" });
  }

  if (
    permissions !== undefined &&
    hasPermission(permissions, Permission.ADMIN)
  ) {
    tabs.push({ id: "downloads", label: "Downloads" });
  }

  return tabs;
}

export default function LibraryPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LibraryTab>("my-requests");
  const visibleTabs = useMemo(
    () => getVisibleTabs(user?.permissions),
    [user?.permissions]
  );

  const canManageRequests =
    user !== null &&
    hasPermission(user.permissions, Permission.MANAGE_REQUESTS);

  const myRequests = useRequests({ userId: user?.id });
  const allRequests = useRequests();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Library
      </h1>

      <LibraryTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        visibleTabs={visibleTabs}
      />

      {activeTab === "my-requests" && (
        <RequestList
          requests={myRequests.requests}
          loading={myRequests.loading}
          error={myRequests.error}
          emptyMessage="You haven't made any requests yet"
        />
      )}

      {activeTab === "all-requests" && (
        <RequestList
          requests={allRequests.requests}
          loading={allRequests.loading}
          error={allRequests.error}
          emptyMessage="No requests yet"
          showUser
          showActions={canManageRequests}
          onApprove={allRequests.approveRequest}
          onDecline={allRequests.declineRequest}
        />
      )}

      {activeTab === "downloads" && <DownloadsTab />}
    </div>
  );
}
