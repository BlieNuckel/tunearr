import { useAuth } from "@/context/useAuth";
import { LogoutIcon, UserCircleIcon } from "@/components/icons";

export default function AccountSection() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Account
      </h2>
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-sm">
        <div className="flex items-center gap-3">
          <UserAvatar thumb={user?.thumb ?? null} username={user?.username} />
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-gray-100">
              {user?.username}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                {user?.role}
              </p>
              {user?.userType === "plex" && <PlexBadge />}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-rose-400 text-white font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all cursor-pointer"
        >
          <LogoutIcon className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

function UserAvatar({
  thumb,
  username,
}: {
  thumb: string | null;
  username: string | undefined;
}) {
  if (thumb) {
    return (
      <img
        src={thumb}
        alt={username ?? "User avatar"}
        className="w-10 h-10 rounded-full border-2 border-black object-cover"
      />
    );
  }

  return (
    <UserCircleIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
  );
}

function PlexBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-400 text-black border border-black">
      Plex
    </span>
  );
}
