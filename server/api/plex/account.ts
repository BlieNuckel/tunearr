import { resilientFetch } from "../resilientFetch";

export type PlexAccountFull = {
  id: number;
  username: string;
  email: string;
  thumb: string;
};

export async function getPlexAccountFull(
  token: string,
  clientId: string
): Promise<PlexAccountFull> {
  const res = await resilientFetch("https://plex.tv/users/account.json", {
    headers: {
      Accept: "application/json",
      "X-Plex-Token": token,
      "X-Plex-Client-Identifier": clientId,
    },
  });

  if (!res.ok) {
    throw new Error(`Plex returned ${res.status}`);
  }

  const data = await res.json();
  return {
    id: data.user.id,
    username: data.user.username,
    email: data.user.email,
    thumb: data.user.thumb,
  };
}
