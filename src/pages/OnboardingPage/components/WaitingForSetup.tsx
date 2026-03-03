import { useState } from "react";

export default function WaitingForSetup() {
  const [checking, setChecking] = useState(false);

  const handleRetry = () => {
    setChecking(true);
    fetch("/api/auth/app-status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.lidarrConfigured) {
          window.location.href = "/";
        }
      })
      .finally(() => setChecking(false));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">🔧</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Waiting for Setup
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          An admin needs to configure the app before you can use it. Check back
          soon!
        </p>
        <button
          onClick={handleRetry}
          disabled={checking}
          className="px-6 py-3 bg-pink-400 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all disabled:opacity-50"
        >
          {checking ? "Checking..." : "Check Again"}
        </button>
      </div>
    </div>
  );
}
