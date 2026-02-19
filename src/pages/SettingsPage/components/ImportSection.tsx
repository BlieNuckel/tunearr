interface ImportSectionProps {
  importPath: string;
  onImportPathChange: (path: string) => void;
}

export default function ImportSection({
  importPath,
  onImportPathChange,
}: ImportSectionProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl text-gray">Manual Import</h2>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Import Path
        </label>
        <input
          type="text"
          value={importPath}
          onChange={(e) => onImportPathChange(e.target.value)}
          placeholder="/imports"
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
        />
        <p className="text-gray-500 text-xs mt-1">
          Shared volume path accessible by both this app and Lidarr for file
          uploads
        </p>
      </div>
    </div>
  );
}
