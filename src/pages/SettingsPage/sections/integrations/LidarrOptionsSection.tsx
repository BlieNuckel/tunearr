import Dropdown from "@/components/Dropdown";

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
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Lidarr Root Path
        </label>
        <Dropdown
          options={rootFolders.map((f) => ({
            value: f.path,
            label: f.path,
          }))}
          value={rootFolderPath}
          onChange={onRootFolderChange}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Quality Profile
        </label>
        <Dropdown
          options={qualityProfiles.map((p) => ({
            value: String(p.id),
            label: p.name,
          }))}
          value={String(qualityProfileId)}
          onChange={(v) => onQualityProfileChange(Number(v))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Metadata Profile
        </label>
        <Dropdown
          options={metadataProfiles.map((p) => ({
            value: String(p.id),
            label: p.name,
          }))}
          value={String(metadataProfileId)}
          onChange={(v) => onMetadataProfileChange(Number(v))}
        />
      </div>
    </div>
  );
}
