import { useState } from "react";
import { login } from "@/utils/plexOAuth";

export type PlexServer = {
  name: string;
  uri: string;
  local: boolean;
};

interface UsePlexLoginOptions {
  onToken: (token: string) => void;
  onServers?: (servers: PlexServer[]) => void;
}

interface UsePlexLoginResult {
  loading: boolean;
  login: () => void;
}

export default function usePlexLogin({
  onToken,
  onServers,
}: UsePlexLoginOptions): UsePlexLoginResult {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const token = await login();
      if (!token) return;

      onToken(token);

      const res = await fetch(
        `/api/plex/servers?token=${encodeURIComponent(token)}`,
      );
      if (res.ok) {
        const data = await res.json();
        onServers?.(data.servers ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, login: handleLogin };
}
