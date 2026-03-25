import { useState } from "react";
import { Permission, PERMISSION_LABELS } from "@shared/permissions";
import { CheckIcon } from "@/components/icons";
import {
  ASSIGNABLE_PERMISSIONS,
  INITIAL_FORM,
  togglePermissionBit,
} from "./constants";
import type { CreateFormState } from "./constants";

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
          {submitting ? "Creating\u2026" : "Create User"}
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

export default CreateUserForm;
