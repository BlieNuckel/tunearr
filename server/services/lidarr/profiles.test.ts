import { describe, it, expect, vi, beforeEach } from "vitest";

const mockLidarrGet = vi.fn();

vi.mock("../../api/lidarr/get.js", () => ({
  lidarrGet: (...args: unknown[]) => mockLidarrGet(...args),
}));

import {
  getQualityProfiles,
  getMetadataProfiles,
  getRootFolders,
} from "./profiles";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getQualityProfiles", () => {
  it("returns quality profiles from Lidarr", async () => {
    const profiles = [{ id: 1, name: "Any" }];
    mockLidarrGet.mockResolvedValue({ data: profiles });

    const result = await getQualityProfiles();
    expect(result).toEqual(profiles);
    expect(mockLidarrGet).toHaveBeenCalledWith("/qualityprofile");
  });
});

describe("getMetadataProfiles", () => {
  it("returns metadata profiles from Lidarr", async () => {
    const profiles = [{ id: 1, name: "Standard" }];
    mockLidarrGet.mockResolvedValue({ data: profiles });

    const result = await getMetadataProfiles();
    expect(result).toEqual(profiles);
    expect(mockLidarrGet).toHaveBeenCalledWith("/metadataprofile");
  });
});

describe("getRootFolders", () => {
  it("returns root folders from Lidarr", async () => {
    const folders = [{ id: 1, path: "/music" }];
    mockLidarrGet.mockResolvedValue({ data: folders });

    const result = await getRootFolders();
    expect(result).toEqual(folders);
    expect(mockLidarrGet).toHaveBeenCalledWith("/rootfolder");
  });
});
