import { useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "@/context/useAuth";

export default function SetupPage() {
  const { setup, plexSetup } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [plexSaving, setPlexSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await setup(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSaving(false);
    }
  };

  const handlePlexSetup = async () => {
    setError("");
    setPlexSaving(true);
    try {
      await plexSetup();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Plex setup failed");
    } finally {
      setPlexSaving(false);
    }
  };

  const anyLoading = saving || plexSaving;

  return (
    <div className="min-h-screen bg-amber-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border-2 border-black dark:border-gray-600 shadow-cartoon-lg">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">
            Create Admin Account
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center">
            Set up your admin account to get started with Tunearr.
          </p>

          <button
            type="button"
            onClick={handlePlexSetup}
            disabled={anyLoading}
            className="w-full px-4 py-2 bg-[#E5A00D] hover:bg-[#cc8f0b] disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
          >
            {plexSaving ? "Setting up with Plex..." : "Set up with Plex"}
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                or
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-cartoon-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                autoComplete="username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-cartoon-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-cartoon-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="p-3 rounded-md text-sm bg-red-900/30 text-red-400 border border-red-800">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={anyLoading}
              className="w-full px-4 py-2 bg-amber-300 hover:bg-amber-200 disabled:opacity-50 text-black font-bold rounded-lg text-sm border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
            >
              {saving ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
