import { useState } from "react";
import { login, getClientId } from "@/utils/plexOAuth";

export type PlexServer = {
  name: string;
  uri: string;
  local: boolean;
};

export type PlexAccount = {
  username: string;
  thumb: string;
};

interface UsePlexLoginOptions {
  onToken: (token: string) => void;
  onServers?: (servers: PlexServer[]) => void;
  onAccount?: (account: PlexAccount) => void;
  onLoginComplete?: (token: string, serverUrl: string) => void;
}

interface UsePlexLoginResult {
  loading: boolean;
  login: () => void;
}

async function fetchAccount(token: string): Promise<PlexAccount | null> {
  const res = await fetch(
    `/api/plex/account?token=${encodeURIComponent(token)}&clientId=${encodeURIComponent(getClientId())}`,
  );
  if (!res.ok) return null;
  return res.json();
}

export default function usePlexLogin({
  onToken,
  onServers,
  onAccount,
  onLoginComplete,
}: UsePlexLoginOptions): UsePlexLoginResult {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const token = await login();
      if (!token) return;

      onToken(token);

      const clientId = getClientId();
      const serversPromise = fetch(
        `/api/plex/servers?token=${encodeURIComponent(token)}&clientId=${encodeURIComponent(clientId)}`,
      );
      const accountPromise = fetchAccount(token);

      const [serversRes, account] = await Promise.all([
        serversPromise,
        accountPromise,
      ]);

      let serverUrl = "";
      if (serversRes.ok) {
        const data = await serversRes.json();
        const servers = data.servers ?? [];
        onServers?.(servers);
        if (servers.length > 0) {
          serverUrl = servers[0].uri;
        }
      }

      if (account) {
        onAccount?.(account);
      }

      onLoginComplete?.(token, serverUrl);
    } finally {
      setLoading(false);
    }
  };

  return { loading, login: handleLogin };
}

export { fetchAccount };
