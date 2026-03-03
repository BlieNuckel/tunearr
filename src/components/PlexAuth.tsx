import { useState, useEffect, useCallback } from "react";
import Spinner from "./Spinner";
import usePlexLogin, {
  fetchAccount,
  pickBestServer,
} from "@/hooks/usePlexLogin";
import type { PlexAccount, PlexServer } from "@/hooks/usePlexLogin";
import { getClientId } from "@/utils/plexOAuth";

interface PlexAuthProps {
  token: string;
  serverUrl?: string;
  onToken: (token: string) => void;
  onServerUrl: (url: string) => void;
  onSignOut?: () => void;
  onLoginComplete?: (token: string, serverUrl: string) => void;
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

function formatServerOption(server: PlexServer): string {
  try {
    const { host } = new URL(server.uri);
    return `${server.name} — ${host}${server.local ? " (local)" : ""}`;
  } catch {
    return server.uri;
  }
}

function ServerPicker({
  servers,
  selectedUrl,
  onChange,
}: {
  servers: PlexServer[];
  selectedUrl: string;
  onChange: (url: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Server connection
      </label>
      <select
        value={selectedUrl}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-sm text-gray-900 dark:text-gray-100 shadow-cartoon-sm"
      >
        {servers.map((s) => (
          <option key={s.uri} value={s.uri}>
            {formatServerOption(s)}
          </option>
        ))}
      </select>
    </div>
  );
}

type AccountFetch =
  | { status: "idle" }
  | { status: "fetching"; forToken: string }
  | { status: "done"; forToken: string; account: PlexAccount | null };

export default function PlexAuth({
  token,
  serverUrl = "",
  onToken,
  onServerUrl,
  onSignOut: onSignOutProp,
  onLoginComplete,
}: PlexAuthProps) {
  const [fetchState, setFetchState] = useState<AccountFetch>({
    status: "idle",
  });
  const [servers, setServers] = useState<PlexServer[]>([]);
  const serverName = servers.find((s) => s.uri === serverUrl)?.name ?? "";

  const handleAccount = useCallback(
    (acct: PlexAccount) => {
      setFetchState({ status: "done", forToken: token, account: acct });
    },
    [token]
  );

  const { loading, login } = usePlexLogin({
    onToken,
    onServers: (fetched: PlexServer[]) => {
      setServers(fetched);
      const best = pickBestServer(fetched);
      if (best) {
        onServerUrl(best.uri);
      }
    },
    onAccount: handleAccount,
    onLoginComplete,
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

  useEffect(() => {
    if (!token) {
      setServers([]);
      return;
    }

    let cancelled = false;
    const clientId = getClientId();
    fetch(
      `/api/plex/servers?token=${encodeURIComponent(token)}&clientId=${encodeURIComponent(clientId)}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setServers((prev) => (prev.length > 0 ? prev : (data.servers ?? [])));
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSignOut = () => {
    setFetchState({ status: "idle" });
    setServers([]);
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
      <div className="space-y-3">
        <SignedInCard
          account={account}
          serverName={serverName}
          onSignOut={handleSignOut}
        />
        {servers.length > 1 && (
          <ServerPicker
            servers={servers}
            selectedUrl={serverUrl}
            onChange={onServerUrl}
          />
        )}
      </div>
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
