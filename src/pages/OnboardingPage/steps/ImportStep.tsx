import StepDescription from "../components/StepDescription";

interface ImportStepProps {
  importPath: string;
  onImportPathChange: (path: string) => void;
}

export default function ImportStep({
  importPath,
  onImportPathChange,
}: ImportStepProps) {
  return (
    <div className="space-y-4">
      <StepDescription text="Set a shared import directory accessible by both Music Requester and Lidarr for file uploads. You can skip this and add it later in Settings." />
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Import Path
        </label>
        <input
          type="text"
          value={importPath}
          onChange={(e) => onImportPathChange(e.target.value)}
          placeholder="/imports"
          className="w-full px-3 py-2 bg-white border-2 border-black rounded-lg text-gray-900 placeholder-gray-200 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
      </div>
      <div className="bg-amber-50 rounded-xl p-4 border-2 border-black shadow-cartoon-sm">
        <p className="text-xs text-gray-500 mb-2 font-medium">
          Docker Compose example:
        </p>
        <pre className="text-xs text-gray-600 overflow-x-auto">{`services:
  lidarr:
    volumes:
      - /path/to/imports:/imports

  music-requester:
    volumes:
      - /path/to/imports:/imports`}</pre>
      </div>
    </div>
  );
}
