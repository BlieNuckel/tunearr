import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import type { ManagedUser } from "@/hooks/useUsers";
import { useAuth } from "@/context/useAuth";
import {
  Permission,
  PERMISSION_LABELS,
} from "@shared/permissions";
import { UserCircleIcon, PlusIcon, CheckIcon } from "@/components/icons";
import Skeleton from "@/components/Skeleton";

type CreateFormState = {
  username: string;
  password: string;
  permissions: number;
};

const ASSIGNABLE_PERMISSIONS = [
  Permission.ADMIN,
  Permission.MANAGE_USERS,
  Permission.MANAGE_REQUESTS,
  Permission.REQUEST,
  Permission.AUTO_APPROVE,
  Permission.REQUEST_VIEW,
] as const;

const INITIAL_FORM: CreateFormState = {
  username: "",
  password: "",
  permissions: Permission.REQUEST,
};

function togglePermissionBit(current: number, perm: Permission): number {
  return (current & perm) !== 0 ? current & ~perm : current | perm;
}

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

function PermissionBadge({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  const base =
    "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold border transition-all";
  const colors = active
    ? "bg-pink-400 text-black border-black"
    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-500 border-black/20 dark:border-white/20 opacity-50";

  if (onClick) {
    return (
      <button onClick={onClick} className={`${base} ${colors} cursor-pointer`}>
        {label}
      </button>
    );
  }

  return <span className={`${base} ${colors}`}>{label}</span>;
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

function PermissionCheckbox({
  permission,
  checked,
  onChange,
}: {
  permission: Permission;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={`w-5 h-5 rounded border-2 border-black flex items-center justify-center transition-colors ${
          checked ? "bg-pink-400" : "bg-white dark:bg-gray-700"
        }`}
        onClick={onChange}
      >
        {checked && <CheckIcon className="w-3.5 h-3.5 text-black" />}
      </div>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {PERMISSION_LABELS[permission]}
      </span>
    </label>
  );
}

function CreateUserForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (form: CreateFormState) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<CreateFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(form);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-sm space-y-4"
    >
      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
        Create Local User
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Username
          </label>
          <input
            type="text"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-black rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            placeholder="Enter username"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-black rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            placeholder="Enter password"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
            Permissions
          </label>
          <div className="flex flex-wrap gap-3">
            {ASSIGNABLE_PERMISSIONS.map((perm) => (
              <PermissionCheckbox
                key={perm}
                permission={perm}
                checked={(form.permissions & perm) !== 0}
                onChange={() =>
                  setForm({
                    ...form,
                    permissions: togglePermissionBit(form.permissions, perm),
                  })
                }
              />
            ))}
          </div>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-400 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Creating…" : "Create User"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-lg border-2 border-black hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
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
        <UserAvatar
          thumb={managedUser.thumb}
          username={managedUser.username}
        />
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
              const canToggle =
                !isSelf || perm !== Permission.ADMIN;
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

export default function UsersSection() {
  const { user } = useAuth();
  const {
    users,
    loading,
    error,
    createUser,
    updatePermissions,
    toggleEnabled,
    removeUser,
  } = useUsers();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleTogglePermission = async (
    userId: number,
    permission: Permission
  ) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const newPermissions = togglePermissionBit(
      target.permissions,
      permission
    );
    try {
      await updatePermissions(userId, newPermissions);
    } catch {
      // Error is visible in the UI via the hook's error state
    }
  };

  const handleToggleEnabled = async (userId: number) => {
    try {
      await toggleEnabled(userId);
    } catch {
      // Error is visible in the UI via the hook's error state
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      await removeUser(userId);
    } catch {
      // Error is visible in the UI via the hook's error state
    }
  };

  const handleCreate = async (form: CreateFormState) => {
    await createUser(form);
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          User Management
        </h2>
        {!showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all cursor-pointer"
          >
            <PlusIcon className="w-4 h-4" />
            Add User
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {showCreateForm && (
        <CreateUserForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="space-y-3">
        {users.map((managedUser) => (
          <UserCard
            key={managedUser.id}
            managedUser={managedUser}
            currentUserId={user?.id ?? -1}
            onTogglePermission={handleTogglePermission}
            onToggleEnabled={handleToggleEnabled}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {users.length === 0 && !loading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No users found.
        </p>
      )}
    </div>
  );
}
