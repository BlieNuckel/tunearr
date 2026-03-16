import { useState } from "react";
import { useAuth } from "@/context/useAuth";
import { LogoutIcon } from "@/components/icons";
import UserAvatar from "@/components/UserAvatar";
import { getActivePermissions } from "@shared/permissions";

export default function AccountSection() {
  const { user, logout, linkPlex } = useAuth();
  const [linkingPlex, setLinkingPlex] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const handleLinkPlex = async () => {
    setLinkingPlex(true);
    setLinkError(null);
    try {
      await linkPlex();
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to link Plex");
    } finally {
      setLinkingPlex(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Account
      </h2>
      <div className="w-fit flex items-center gap-6 p-4 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-sm">
        <div className="flex items-center gap-3">
          <UserAvatar
            thumb={user?.thumb ?? null}
            username={user?.username}
            className="w-10 h-10"
          />
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">
              {user?.username}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {user &&
                getActivePermissions(user.permissions).map(
                  ({ permission, label }) => (
                    <PermissionBadge key={permission} label={label} />
                  )
                )}
              {user?.userType === "plex" && <PlexBadge />}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.userType === "local" && (
            <button
              onClick={handleLinkPlex}
              disabled={linkingPlex}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {linkingPlex ? "Connecting…" : "Connect Plex"}
            </button>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-400 text-white font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all cursor-pointer"
          >
            <LogoutIcon className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
      {linkError && (
        <p className="text-sm text-red-600 dark:text-red-400">{linkError}</p>
      )}
    </div>
  );
}

function PermissionBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-black/20 dark:border-white/20">
      {label}
    </span>
  );
}

function PlexBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-400 text-black border border-black">
      Plex
    </span>
  );
}
