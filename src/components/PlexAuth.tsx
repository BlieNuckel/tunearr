import { useState, useEffect, useCallback } from "react";
import Spinner from "./Spinner";
import usePlexLogin, { fetchAccount } from "@/hooks/usePlexLogin";
import type { PlexAccount, PlexServer } from "@/hooks/usePlexLogin";

interface PlexAuthProps {
  token: string;
  onToken: (token: string) => void;
  onServerUrl: (url: string) => void;
  onSignOut?: () => void;
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

type AccountFetch =
  | { status: "idle" }
  | { status: "fetching"; forToken: string }
  | { status: "done"; forToken: string; account: PlexAccount | null };

export default function PlexAuth({
  token,
  onToken,
  onServerUrl,
  onSignOut: onSignOutProp,
}: PlexAuthProps) {
  const [fetchState, setFetchState] = useState<AccountFetch>({
    status: "idle",
  });
  const [serverName, setServerName] = useState("");

  const handleAccount = useCallback(
    (acct: PlexAccount) => {
      setFetchState({ status: "done", forToken: token, account: acct });
    },
    [token]
  );

  const { loading, login } = usePlexLogin({
    onToken,
    onServers: (servers: PlexServer[]) => {
      if (servers.length > 0) {
        onServerUrl(servers[0].uri);
        setServerName(servers[0].name);
      }
    },
    onAccount: handleAccount,
  });

  useEffect(() => {
    if (!token) return;
    if (
      (fetchState.status === "fetching" && fetchState.forToken === token) ||
      (fetchState.status === "done" && fetchState.forToken === token)
    ) {
      return;
    }

    let cancelled = false;
    setFetchState({ status: "fetching", forToken: token });

    fetchAccount(token).then((acct) => {
      if (cancelled) return;
      setFetchState({ status: "done", forToken: token, account: acct });
    });

    return () => {
      cancelled = true;
    };
    // fetchState is intentionally omitted — we only want to re-run when token changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSignOut = () => {
    setFetchState({ status: "idle" });
    setServerName("");

    if (onSignOutProp) {
      onSignOutProp();
    } else {
      onToken("");
      onServerUrl("");
    }
  };

  const isLoading =
    fetchState.status === "fetching" && fetchState.forToken === token;
  const account =
    token && fetchState.status === "done" && fetchState.forToken === token
      ? fetchState.account
      : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-md">
        <Spinner className="w-4 h-4" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Loading account...
        </span>
      </div>
    );
  }

  if (account) {
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
