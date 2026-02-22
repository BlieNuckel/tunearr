import { useState, useEffect } from "react";
import Spinner from "./Spinner";
import usePlexLogin, { fetchAccount } from "@/hooks/usePlexLogin";
import type { PlexAccount, PlexServer } from "@/hooks/usePlexLogin";

interface PlexAuthProps {
  token: string;
  onToken: (token: string) => void;
  onServerUrl: (url: string) => void;
}

function SignedInCard({
  account,
  serverName,
  onSignOut,
}: {
  account: PlexAccount;
  serverName: string;
  onSignOut: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-md">
      <img
        src={account.thumb}
        alt={account.username}
        className="w-10 h-10 rounded-full border-2 border-black"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
          {account.username}
        </p>
        {serverName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {serverName}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg border-2 border-black shadow-cartoon-sm transition-colors"
      >
        Sign out
      </button>
    </div>
  );
}

export default function PlexAuth({
  token,
  onToken,
  onServerUrl,
}: PlexAuthProps) {
  const [account, setAccount] = useState<PlexAccount | null>(null);
  const [serverName, setServerName] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(false);

  const { loading, login } = usePlexLogin({
    onToken,
    onServers: (servers: PlexServer[]) => {
      if (servers.length > 0) {
        onServerUrl(servers[0].uri);
        setServerName(servers[0].name);
      }
    },
    onAccount: (acct: PlexAccount) => {
      setAccount(acct);
    },
  });

  useEffect(() => {
    if (!token) {
      setAccount(null);
      setServerName("");
      return;
    }
    if (account) return;

    setLoadingAccount(true);
    fetchAccount(token).then((acct) => {
      setAccount(acct);
      setLoadingAccount(false);
    });
  }, [token]);

  const handleSignOut = () => {
    setAccount(null);
    setServerName("");
    onToken("");
    onServerUrl("");
  };

  if (loadingAccount) {
    return (
      <div className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-md">
        <Spinner className="w-4 h-4" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Loading account...
        </span>
      </div>
    );
  }

  if (account && token) {
    return (
      <SignedInCard
        account={account}
        serverName={serverName}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={login}
      disabled={loading}
      className="w-full px-4 py-2.5 bg-[#e5a00d] hover:bg-[#cc8f0c] disabled:opacity-60 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-md transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Spinner className="w-4 h-4" />
          Signing in...
        </>
      ) : (
        "Sign in with Plex"
      )}
    </button>
  );
}
