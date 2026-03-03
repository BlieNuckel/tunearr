import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/context/useAuth";
import Skeleton from "@/components/Skeleton";

type UserCardProps = {
  user: { id: number; username: string; role: "admin" | "user"; enabled: boolean; thumb: string | null };
  isSelf: boolean;
  onRoleChange: (id: number, role: "admin" | "user") => Promise<void>;
  onToggleEnabled: (id: number, enabled: boolean) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function UserInitials({ username }: { username: string }) {
  const initials = username.slice(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-pink-200 dark:bg-pink-900 border-2 border-black flex items-center justify-center text-sm font-bold text-gray-900 dark:text-gray-100">
      {initials}
    </div>
  );
}

function UserAvatar({ thumb, username }: { thumb: string | null; username: string }) {
  const [imgError, setImgError] = useState(false);

  if (!thumb || imgError) return <UserInitials username={username} />;

  return (
    <img
      src={thumb}
      alt={username}
      className="w-10 h-10 rounded-full border-2 border-black object-cover"
      onError={() => setImgError(true)}
    />
  );
}

function RoleBadge({
  role,
  disabled,
  onClick,
}: {
  role: "admin" | "user";
  disabled: boolean;
  onClick: () => void;
}) {
  const isAdmin = role === "admin";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-bold px-2 py-0.5 rounded-full border-2 border-black shadow-cartoon-sm transition-all ${
        isAdmin
          ? "bg-amber-300 text-black"
          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:brightness-110 cursor-pointer"}`}
    >
      {isAdmin ? "Admin" : "User"}
    </button>
  );
}

function UserCard({ user, isSelf, onRoleChange, onToggleEnabled, onDelete }: UserCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleRoleToggle = async () => {
    setActionError(null);
    try {
      await onRoleChange(user.id, user.role === "admin" ? "user" : "admin");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleEnabledToggle = async () => {
    setActionError(null);
    try {
      await onToggleEnabled(user.id, !user.enabled);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    }
  };

  const handleDelete = async () => {
    setActionError(null);
    try {
      await onDelete(user.id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed");
    }
    setConfirmDelete(false);
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-sm">
      <UserAvatar thumb={user.thumb} username={user.username} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 dark:text-gray-100 truncate">
            {user.username}
          </span>
          {isSelf && (
            <span className="text-xs text-gray-400 dark:text-gray-500">(you)</span>
          )}
        </div>
        {actionError && (
          <p className="text-xs text-rose-500 mt-0.5">{actionError}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <RoleBadge
          role={user.role}
          disabled={isSelf}
          onClick={handleRoleToggle}
        />
        <button
          onClick={handleEnabledToggle}
          disabled={isSelf}
          className={`relative w-10 h-6 rounded-full border-2 border-black transition-colors ${
            user.enabled ? "bg-emerald-400" : "bg-gray-300 dark:bg-gray-600"
          } ${isSelf ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          aria-label={user.enabled ? "Disable user" : "Enable user"}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white border border-black transition-transform ${
              user.enabled ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
        {!isSelf && (
          <>
            {confirmDelete ? (
              <div className="flex gap-1">
                <button
                  onClick={handleDelete}
                  className="text-xs font-bold px-2 py-1 bg-rose-400 text-white rounded border-2 border-black shadow-cartoon-sm hover:brightness-110"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs font-bold px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded border-2 border-black shadow-cartoon-sm hover:brightness-110"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs font-bold px-2 py-1 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded border-2 border-black shadow-cartoon-sm hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors"
                aria-label={`Delete ${user.username}`}
              >
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function UsersSection() {
  const { users, loading, error, updateRole, toggleEnabled, removeUser, refetch } = useUsers();
  const { user: currentUser } = useAuth();

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Users</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Users</h2>
        <div className="p-4 bg-rose-100 dark:bg-rose-900/30 border-2 border-black rounded-lg shadow-cartoon-sm">
          <p className="text-rose-600 dark:text-rose-400 font-medium">{error}</p>
          <button
            onClick={refetch}
            className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-300 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Users</h2>
      <div className="space-y-3">
        {users.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            isSelf={u.id === currentUser?.id}
            onRoleChange={updateRole}
            onToggleEnabled={toggleEnabled}
            onDelete={removeUser}
          />
        ))}
        {users.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm">No users found.</p>
        )}
      </div>
    </div>
  );
}
