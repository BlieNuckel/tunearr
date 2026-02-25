import { resilientFetch } from "../resilientFetch";

export type PlexAccount = {
  username: string;
  thumb: string;
};

export async function getPlexAccount(
  token: string,
  clientId: string
): Promise<PlexAccount> {
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
    username: data.user.username,
    thumb: data.user.thumb,
  };
}
