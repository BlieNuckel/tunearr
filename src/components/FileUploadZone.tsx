import { useRef } from "react";
import { CloudUploadIcon } from "@/components/icons";

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
      <CloudUploadIcon className="w-8 h-8 mx-auto text-amber-400 mb-2" />
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
