import { useState } from "react";
import useAsyncData from "./useAsyncData";
import { login } from "@/utils/plexOAuth";
import { responseError } from "@/utils/fetchError";

export type PlexServer = {
  name: string;
  uri: string;
  local: boolean;
};

/** The server-level Plex connection an admin makes under Settings > Integrations > Plex. */
export type PlexConnection = {
  connected: boolean;
  account: { username: string; thumb: string } | null;
  serverUrl: string;
  /** Whether the connected account owns the selected server; live sessions need it. */
  owned: boolean;
  servers: PlexServer[];
};

export type UsePlexConnectionResult = {
  connection: PlexConnection | null;
  loading: boolean;
  /** A connect, server change or disconnect is in flight. */
  busy: boolean;
  error: string | null;
  connect: () => Promise<void>;
  selectServer: (serverUrl: string) => Promise<void>;
  disconnect: () => Promise<void>;
};

const ENDPOINT = "/api/plex/connection";

const DISCONNECTED: PlexConnection = {
  connected: false,
  account: null,
  serverUrl: "",
  owned: false,
  servers: [],
};

async function readConnection(
  res: Response,
  fallback: string
): Promise<PlexConnection> {
  if (!res.ok) throw await responseError(res, fallback);
  return res.json();
}

async function fetchConnection({
  signal,
}: {
  signal: AbortSignal;
}): Promise<PlexConnection> {
  return readConnection(
    await fetch(ENDPOINT, { signal }),
    "Failed to load the Plex connection"
  );
}

async function sendJson(
  url: string,
  method: string,
  body: unknown
): Promise<Response> {
  return fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export default function usePlexConnection(): UsePlexConnectionResult {
  const { data, loading, error } = useAsyncData(
    "plex-connection",
    fetchConnection
  );
  const [changed, setChanged] = useState<PlexConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const run = async (action: () => Promise<PlexConnection | null>) => {
    setBusy(true);
    setActionError(null);
    try {
      const next = await action();
      if (next) setChanged(next);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Plex request failed"
      );
    } finally {
      setBusy(false);
    }
  };

  const connect = () =>
    run(async () => {
      const authToken = await login();
      if (!authToken) return null;
      return readConnection(
        await sendJson(ENDPOINT, "POST", { authToken }),
        "Failed to connect Plex"
      );
    });

  const selectServer = (serverUrl: string) =>
    run(async () =>
      readConnection(
        await sendJson(`${ENDPOINT}/server`, "PUT", { serverUrl }),
        "Failed to change the Plex server"
      )
    );

  const disconnect = () =>
    run(async () => {
      const res = await fetch(ENDPOINT, { method: "DELETE" });
      if (!res.ok) throw await responseError(res, "Failed to disconnect Plex");
      return DISCONNECTED;
    });

  return {
    connection: changed ?? data,
    loading: loading && !changed,
    busy,
    error: actionError ?? error,
    connect,
    selectServer,
    disconnect,
  };
}
