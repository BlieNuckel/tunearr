import Spinner from "./Spinner";
import type {
  PlexConnection,
  PlexServer,
  UsePlexConnectionResult,
} from "@/hooks/usePlexConnection";

interface PlexAuthProps {
  plex: UsePlexConnectionResult;
}

function SignedInCard({
  account,
  serverName,
  busy,
  onSignOut,
}: {
  account: NonNullable<PlexConnection["account"]>;
  serverName: string;
  busy: boolean;
  onSignOut: () => void;
}) {
  return (
    <div className="w-xs flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-md">
      {account.thumb && (
        <img
          src={account.thumb}
          alt={account.username}
          className="w-10 h-10 rounded-full border-2 border-black"
        />
      )}
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
        disabled={busy}
        className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 rounded-lg border-2 border-black shadow-cartoon-sm transition-colors"
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
  busy,
  onChange,
}: {
  servers: PlexServer[];
  selectedUrl: string;
  busy: boolean;
  onChange: (url: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label
        htmlFor="plex-server-connection"
        className="block text-sm font-medium text-gray-700 dark:text-gray-300"
      >
        Server connection
      </label>
      <select
        id="plex-server-connection"
        value={selectedUrl}
        disabled={busy}
        onChange={(e) => onChange(e.target.value)}
        className="w-full sm:w-sm px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-sm text-gray-900 dark:text-gray-100 shadow-cartoon-sm"
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

function NotOwnerWarning() {
  return (
    <p className="text-xs text-amber-700 dark:text-amber-400">
      This account doesn&apos;t own the server. Plex only shows live listening
      sessions to the owner, so sign in with the owner&apos;s account to record
      them.
    </p>
  );
}

function ConnectedView({
  connection,
  busy,
  onSignOut,
  onSelectServer,
}: {
  connection: PlexConnection;
  busy: boolean;
  onSignOut: () => void;
  onSelectServer: (url: string) => void;
}) {
  const serverName =
    connection.servers.find((s) => s.uri === connection.serverUrl)?.name ?? "";

  return (
    <div className="space-y-3">
      {connection.account && (
        <SignedInCard
          account={connection.account}
          serverName={serverName}
          busy={busy}
          onSignOut={onSignOut}
        />
      )}
      {connection.servers.length > 1 && (
        <ServerPicker
          servers={connection.servers}
          selectedUrl={connection.serverUrl}
          busy={busy}
          onChange={onSelectServer}
        />
      )}
      {!connection.owned && <NotOwnerWarning />}
    </div>
  );
}

function SignInButton({
  busy,
  onClick,
}: {
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-auto px-4 py-2.5 bg-amber-300 hover:bg-amber-200 disabled:opacity-60 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-md transition-colors flex items-center justify-center gap-2"
    >
      {busy ? (
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

/**
 * Connects the Plex account Tunearr reads the server with. It is the server's connection,
 * not the signed-in user's: personal Plex links live under Account.
 */
export default function PlexAuth({ plex }: PlexAuthProps) {
  const { connection, loading, busy, error } = plex;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-3 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-md">
        <Spinner className="w-4 h-4" />
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Loading Plex connection...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {connection?.connected ? (
        <ConnectedView
          connection={connection}
          busy={busy}
          onSignOut={plex.disconnect}
          onSelectServer={plex.selectServer}
        />
      ) : (
        <SignInButton busy={busy} onClick={plex.connect} />
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
