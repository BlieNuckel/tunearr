import { useState } from "react";
import type { ManagedUser } from "@/hooks/useUsers";
import { Permission, PERMISSION_LABELS } from "@shared/permissions";
import { UserCircleIcon } from "@/components/icons";
import PermissionBadge from "./PermissionBadge";
import { ASSIGNABLE_PERMISSIONS } from "./constants";

function UserAvatar({
  thumb,
  username,
}: {
  thumb: string | null;
  username: string;
}) {
  if (thumb) {
    return (
      <img
        src={thumb}
        alt={username}
        className="w-10 h-10 rounded-full border-2 border-black object-cover"
      />
    );
  }

  return (
    <UserCircleIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
  );
}

function UserTypeBadge({ userType }: { userType: "local" | "plex" }) {
  if (userType === "plex") {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-amber-400 text-black border border-black">
        Plex
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-black/20 dark:border-white/20">
      Local
    </span>
  );
}

function EnableToggle({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full border-2 border-black transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled ? "bg-emerald-400" : "bg-gray-300 dark:bg-gray-600"
      }`}
      aria-label={enabled ? "Disable user" : "Enable user"}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white border border-black transition-transform ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function DeleteButton({
  onConfirm,
  disabled,
}: {
  onConfirm: () => void;
  disabled: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => {
            onConfirm();
            setConfirming(false);
          }}
          className="px-2 py-1 text-xs font-bold bg-rose-400 text-white rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all cursor-pointer"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-1 text-xs font-bold bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg border-2 border-black hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      disabled={disabled}
      className="px-2 py-1 text-xs font-bold bg-rose-400 text-white rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Delete
    </button>
  );
}

function UserCard({
  managedUser,
  currentUserId,
  onTogglePermission,
  onToggleEnabled,
  onDelete,
}: {
  managedUser: ManagedUser;
  currentUserId: number;
  onTogglePermission: (userId: number, permission: Permission) => void;
  onToggleEnabled: (userId: number) => void;
  onDelete: (userId: number) => void;
}) {
  const isSelf = managedUser.id === currentUserId;

  return (
    <div className="flex items-center justify-between gap-3 p-4 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-sm">
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar thumb={managedUser.thumb} username={managedUser.username} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
              {managedUser.username}
            </p>
            <UserTypeBadge userType={managedUser.userType} />
            {!managedUser.enabled && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-rose-400 text-white border border-black">
                Disabled
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            {ASSIGNABLE_PERMISSIONS.map((perm) => {
              const isActive = (managedUser.permissions & perm) !== 0;
              const canToggle = !isSelf || perm !== Permission.ADMIN;
              return (
                <PermissionBadge
                  key={perm}
                  label={PERMISSION_LABELS[perm]}
                  active={isActive}
                  onClick={
                    canToggle
                      ? () => onTogglePermission(managedUser.id, perm)
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <EnableToggle
          enabled={managedUser.enabled}
          onToggle={() => onToggleEnabled(managedUser.id)}
          disabled={isSelf}
        />
        <DeleteButton
          onConfirm={() => onDelete(managedUser.id)}
          disabled={isSelf}
        />
      </div>
    </div>
  );
}

export default UserCard;
