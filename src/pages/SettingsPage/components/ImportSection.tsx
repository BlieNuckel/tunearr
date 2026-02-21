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
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Manual Import
      </h2>
      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          Import Path
        </label>
        <input
          type="text"
          value={importPath}
          onChange={(e) => onImportPathChange(e.target.value)}
          placeholder="/imports"
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
        />
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Shared volume path accessible by both this app and Lidarr for file
          uploads
        </p>
      </div>
    </div>
  );
}
