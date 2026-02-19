interface LidarrOptionsSectionProps {
  rootFolders: { id: number; path: string }[];
  rootFolderPath: string;
  qualityProfiles: { id: number; name: string }[];
  qualityProfileId: number;
  metadataProfiles: { id: number; name: string }[];
  metadataProfileId: number;
  onRootFolderChange: (path: string) => void;
  onQualityProfileChange: (id: number) => void;
  onMetadataProfileChange: (id: number) => void;
}

export default function LidarrOptionsSection({
  rootFolders,
  rootFolderPath,
  qualityProfiles,
  qualityProfileId,
  metadataProfiles,
  metadataProfileId,
  onRootFolderChange,
  onQualityProfileChange,
  onMetadataProfileChange,
}: LidarrOptionsSectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Lidarr Root Path
        </label>
        <select
          key={rootFolders.length}
          value={rootFolderPath}
          onChange={(e) => onRootFolderChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        >
          {rootFolders.map((folder) => (
            <option key={folder.id} value={folder.path}>
              {folder.path}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Quality Profile
        </label>
        <select
          key={qualityProfiles.length}
          value={qualityProfileId}
          onChange={(e) => onQualityProfileChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        >
          {qualityProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Metadata Profile
        </label>
        <select
          key={metadataProfiles.length}
          value={metadataProfileId}
          onChange={(e) => onMetadataProfileChange(Number(e.target.value))}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        >
          {metadataProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
