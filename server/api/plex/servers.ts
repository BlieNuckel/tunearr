type PlexResource = {
  name: string;
  provides: string;
  connections: { uri: string; local: boolean }[];
};

export type PlexServer = {
  name: string;
  uri: string;
  local: boolean;
};

export async function getPlexServers(token: string): Promise<PlexServer[]> {
  const res = await fetch(
    "https://plex.tv/api/v2/resources?includeHttps=1",
    {
      headers: {
        Accept: "application/json",
        "X-Plex-Token": token,
      },
    },
  );

  if (!res.ok) {
    throw new Error(`Plex returned ${res.status}`);
  }

  const resources: PlexResource[] = await res.json();

  return resources
    .filter((r) => r.provides.includes("server"))
    .flatMap((r) =>
      r.connections.map((c) => ({
        name: r.name,
        uri: c.uri,
        local: c.local,
      })),
    );
}
