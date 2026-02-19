import { useRef } from "react";

const ACCEPTED_TYPES = ".flac,.mp3,.ogg,.wav,.m4a,.aac";

interface FileUploadZoneProps {
  onFiles: (files: FileList) => void;
}

export default function FileUploadZone({ onFiles }: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      onFiles(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      className="border-2 border-dashed border-amber-400 hover:border-amber-500 rounded-xl p-6 text-center cursor-pointer bg-amber-50 shadow-cartoon-md transition-all hover:translate-y-[-2px] hover:shadow-cartoon-lg"
    >
      <svg
        className="w-8 h-8 mx-auto text-amber-400 mb-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
        />
      </svg>
      <p className="text-gray-600 text-sm">
        Drop audio files here or click to browse
      </p>
      <p className="text-gray-400 text-xs mt-1">
        FLAC, MP3, OGG, WAV, M4A, AAC
      </p>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
        }}
        className="hidden"
      />
    </div>
  );
}
