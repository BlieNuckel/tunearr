import { useRef } from "react";
import { CloudUploadIcon } from "@/components/icons";

const ACCEPTED_TYPES = ".flac,.mp3,.ogg,.wav,.m4a,.aac";
const ALLOWED_EXTENSIONS = new Set([
  ".flac",
  ".mp3",
  ".ogg",
  ".wav",
  ".m4a",
  ".aac",
]);

interface FileUploadZoneProps {
  onFiles: (files: File[]) => void;
}

function readFolderEntries(entry: FileSystemDirectoryEntry): Promise<File[]> {
  return new Promise((resolve) => {
    const reader = entry.createReader();
    reader.readEntries((entries) => {
      const filePromises = entries
        .filter(
          (e): e is FileSystemFileEntry =>
            e.isFile &&
            ALLOWED_EXTENSIONS.has(e.name.slice(e.name.lastIndexOf(".")))
        )
        .map(
          (fileEntry) =>
            new Promise<File>((res) => fileEntry.file((f) => res(f)))
        );
      Promise.all(filePromises).then(resolve);
    });
  });
}

async function extractFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const items = Array.from(dataTransfer.items);
  const folderEntry = items
    .map((item) => item.webkitGetAsEntry?.())
    .find((entry) => entry?.isDirectory) as
    | FileSystemDirectoryEntry
    | undefined;

  if (folderEntry) {
    return readFolderEntries(folderEntry);
  }

  return Array.from(dataTransfer.files);
}

export default function FileUploadZone({ onFiles }: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.items.length && !e.dataTransfer.files.length) return;

    const files = await extractFiles(e.dataTransfer);
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-xl p-6 text-center cursor-pointer bg-amber-50 dark:bg-gray-700/50 shadow-cartoon-md transition-all hover:translate-y-[-2px] hover:shadow-cartoon-lg"
    >
      <CloudUploadIcon className="w-8 h-8 mx-auto text-amber-400 dark:text-amber-500 mb-2" />
      <p className="text-gray-600 dark:text-gray-400 text-sm">
        Drop audio files or a folder here, or click to browse
      </p>
      <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
        FLAC, MP3, OGG, WAV, M4A, AAC
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
        }}
        className="hidden"
      />
    </div>
  );
}
