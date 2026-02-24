import { lidarrFetch } from "../api/lidarr/fetch";

type Profile = { id: number; name: string };
type RootFolder = { id: number; path: string };

type TestConnectionSuccess = {
  success: true;
  version: string;
  qualityProfiles: Profile[];
  metadataProfiles: Profile[];
  rootFolderPaths: RootFolder[];
};

type TestConnectionError = {
  error: string;
  status: number;
};

export async function testLidarrConnection(
  lidarrUrl: string,
  lidarrApiKey: string
): Promise<TestConnectionSuccess | TestConnectionError> {
  const url = lidarrUrl.replace(/\/+$/, "");
  const headers = { "X-Api-Key": lidarrApiKey };

  const response = await lidarrFetch(`${url}/api/v1/system/status`, {
    headers,
  });
  if (!response.ok) {
    return {
      error: `Lidarr returned ${response.status}`,
      status: response.status,
    };
  }
  const data = await response.json();

  const [qualityRes, metadataRes, rootRes] = await Promise.all([
    lidarrFetch(`${url}/api/v1/qualityprofile`, { headers }).catch(() => null),
    lidarrFetch(`${url}/api/v1/metadataprofile`, { headers }).catch(() => null),
    lidarrFetch(`${url}/api/v1/rootfolder`, { headers }).catch(() => null),
  ]);

  const qualityProfiles: Profile[] = qualityRes?.ok
    ? (await qualityRes.json()).map((p: { id: number; name: string }) => ({
        id: p.id,
        name: p.name,
      }))
    : [];
  const metadataProfiles: Profile[] = metadataRes?.ok
    ? (await metadataRes.json()).map((p: { id: number; name: string }) => ({
        id: p.id,
        name: p.name,
      }))
    : [];
  const rootFolderPaths: RootFolder[] = rootRes?.ok
    ? (await rootRes.json()).map((f: { id: number; path: string }) => ({
        id: f.id,
        path: f.path,
      }))
    : [];

  return {
    success: true,
    version: data.version,
    qualityProfiles,
    metadataProfiles,
    rootFolderPaths,
  };
}
