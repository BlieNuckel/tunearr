import { resilientFetch } from "../resilientFetch";
import type { PlexSectionsResponse } from "./types";

export const getMusicSectionKey = async (
  baseUrl: string,
  headers: Record<string, string>
): Promise<string> => {
  const res = await resilientFetch(`${baseUrl}/library/sections`, { headers });
  if (!res.ok) throw new Error(`Plex returned ${res.status}`);

  const data: PlexSectionsResponse = await res.json();
  const sections = data.MediaContainer?.Directory || [];
  const musicSection = sections.find((s) => s.type === "artist");
  if (!musicSection) throw new Error("No music library found in Plex");
  return musicSection.key;
};
