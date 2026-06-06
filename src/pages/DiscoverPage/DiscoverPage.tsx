import usePromotedAlbum from "@/hooks/usePromotedAlbum";
import usePromotedArtists from "@/hooks/usePromotedArtists";
import PromotedAlbum from "./components/PromotedAlbum";
import PromotedArtists from "./components/PromotedArtists";

export default function DiscoverPage() {
  const {
    promotedAlbum,
    loading: promotedLoading,
    refresh: refreshPromotedAlbum,
  } = usePromotedAlbum();

  const {
    promotedArtists,
    loading: artistsLoading,
    refresh: refreshArtists,
  } = usePromotedArtists();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Discover
      </h1>

      {(promotedAlbum || promotedLoading) && (
        <PromotedAlbum
          data={promotedAlbum}
          loading={promotedLoading}
          onRefresh={refreshPromotedAlbum}
        />
      )}

      {(promotedArtists || artistsLoading) && (
        <PromotedArtists
          data={promotedArtists}
          loading={artistsLoading}
          onRefresh={refreshArtists}
        />
      )}
    </div>
  );
}
