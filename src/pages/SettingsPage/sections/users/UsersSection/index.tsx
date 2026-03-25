import { useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/context/useAuth";
import { Permission } from "@shared/permissions";
import { PlusIcon } from "@/components/icons";
import Skeleton from "@/components/Skeleton";
import UserCard from "./UserCard";
import CreateUserForm from "./CreateUserForm";
import { togglePermissionBit } from "./constants";
import type { CreateFormState } from "./constants";

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
    const newPermissions = togglePermissionBit(target.permissions, permission);
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
