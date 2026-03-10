import { useState } from "react";
import { login, getClientId } from "@/utils/plexOAuth";
import { useAuth } from "@/context/useAuth";

export type PlexServer = {
  name: string;
  uri: string;
  local: boolean;
};

export type PlexAccount = {
  username: string;
  thumb: string;
};

export function pickBestServer(servers: PlexServer[]): PlexServer | undefined {
  return servers.find((s) => !s.local) ?? servers[0];
}

interface UsePlexLoginOptions {
  onServers?: (servers: PlexServer[]) => void;
  onAccount?: (account: PlexAccount) => void;
}

interface UsePlexLoginResult {
  loading: boolean;
  login: () => void;
}

async function fetchAccount(token?: string): Promise<PlexAccount | null> {
  const clientId = getClientId();
  const params = new URLSearchParams({ clientId });
  if (token) params.set("token", token);
  const res = await fetch(`/api/plex/account?${params}`);
  if (!res.ok) return null;
  return res.json();
}

async function storePlexToken(authToken: string): Promise<void> {
  await fetch("/api/auth/store-plex-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ authToken }),
  });
}

export default function usePlexLogin({
  onServers,
  onAccount,
}: UsePlexLoginOptions): UsePlexLoginResult {
  const [loading, setLoading] = useState(false);
  const { refreshUser } = useAuth();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const token = await login();
      if (!token) return;

      await storePlexToken(token);
      await refreshUser();

      const clientId = getClientId();
      const [serversRes, account] = await Promise.all([
        fetch(
          `/api/plex/servers?token=${encodeURIComponent(token)}&clientId=${encodeURIComponent(clientId)}`
        ),
        fetchAccount(token),
      ]);

      if (serversRes.ok) {
        const data = await serversRes.json();
        const servers = data.servers ?? [];
        onServers?.(servers);
      }

      if (account) {
        onAccount?.(account);
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, login: handleLogin };
}

export { fetchAccount };
