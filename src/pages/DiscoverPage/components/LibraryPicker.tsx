import Dropdown from "@/components/Dropdown";

interface LibraryArtist {
  id: number;
  name: string;
  foreignArtistId: string;
}

interface LibraryPickerProps {
  artists: LibraryArtist[];
  loading: boolean;
  selectedArtist: string | null;
  onSelect: (name: string) => void;
}

export default function LibraryPicker({
  artists,
  loading,
  selectedArtist,
  onSelect,
}: LibraryPickerProps) {
  return (
    <div className="lg:col-span-1">
      <h2 className="text-sm font-medium text-gray-500 mb-2">Your Library</h2>
      {loading ? (
        <p className="text-gray-400 text-sm">Loading library...</p>
      ) : artists.length === 0 ? (
        <p className="text-gray-400 text-sm">
          No artists in library. Connect Lidarr in Settings.
        </p>
      ) : (
        <Dropdown
          options={artists.map((a) => ({ value: a.name, label: a.name }))}
          value={selectedArtist ?? ""}
          onChange={onSelect}
          searchable
          placeholder="Search library..."
        />
      )}
    </div>
  );
}
