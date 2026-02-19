import Dropdown from "@/components/Dropdown";
import StepDescription from "../components/StepDescription";

interface LidarrOptionsStepProps {
  qualityProfiles: { id: number; name: string }[];
  qualityProfileId: number;
  metadataProfiles: { id: number; name: string }[];
  metadataProfileId: number;
  rootFolderPaths: { id: number; path: string }[];
  rootFolderPath: string;
  onQualityProfileChange: (id: number) => void;
  onMetadataProfileChange: (id: number) => void;
  onRootFolderChange: (path: string) => void;
}

export default function LidarrOptionsStep({
  qualityProfiles,
  qualityProfileId,
  metadataProfiles,
  metadataProfileId,
  rootFolderPaths,
  rootFolderPath,
  onQualityProfileChange,
  onMetadataProfileChange,
  onRootFolderChange,
}: LidarrOptionsStepProps) {
  return (
    <div className="space-y-4">
      <StepDescription text="Choose your default Lidarr settings for new artist additions." />
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Root Folder
        </label>
        <Dropdown
          options={rootFolderPaths.map((f) => ({
            value: f.path,
            label: f.path,
          }))}
          value={rootFolderPath}
          onChange={onRootFolderChange}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
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
        <label className="block text-sm font-medium text-gray-600 mb-1">
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
