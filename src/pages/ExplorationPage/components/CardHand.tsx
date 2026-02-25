import { useState, useMemo } from "react";
import type { CollectedAlbum } from "@/hooks/useExploration";
import ImageWithShimmer from "@/components/ImageWithShimmer";

interface CardHandProps {
  albums: CollectedAlbum[];
}

function pastelColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 85%)`;
}

function MiniCard({
  album,
  index,
}: {
  album: CollectedAlbum;
  index: number;
}) {
  const [coverError, setCoverError] = useState(false);
  const rg = album.releaseGroup;
  const coverUrl = `https://coverartarchive.org/release-group/${rg.id}/front-500`;
  const pastelBg = useMemo(() => pastelColorFromId(rg.id), [rg.id]);

  const rotation = useMemo(() => {
    let h = 0;
    for (let i = 0; i < rg.id.length; i++) {
      h = rg.id.charCodeAt(i) + ((h << 5) - h);
    }
    return (Math.abs(h) % 21) - 10;
  }, [rg.id]);

  return (
    <div
      className="hand-card w-14 md:w-16 aspect-square rounded-lg border-2 border-black shadow-cartoon-sm overflow-hidden relative flex-shrink-0 cursor-default"
      style={{
        transform: `rotate(${rotation}deg)`,
        zIndex: index,
      }}
      title={`${rg.title} - ${rg["artist-credit"]?.[0]?.artist?.name || "Unknown"}`}
    >
      <div
        className="absolute inset-0"
        style={{ backgroundColor: pastelBg }}
      />
      {!coverError && (
        <ImageWithShimmer
          src={coverUrl}
          alt={rg.title}
          className="w-full h-full object-cover relative z-10"
          onError={() => setCoverError(true)}
        />
      )}
      <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-black text-white text-[10px] font-bold rounded-full flex items-center justify-center z-20">
        {index + 1}
      </div>
    </div>
  );
}

export default function CardHand({ albums }: CardHandProps) {
  if (albums.length === 0) return null;

  const cards = albums.map((album, i) => (
    <MiniCard
      key={album.releaseGroup.id}
      album={album}
      index={i}
    />
  ));

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3
                 md:static md:z-auto md:px-0 md:pb-6"
      data-testid="card-hand"
    >
      <div className="relative h-9 [clip-path:inset(-999px_-999px_0_-999px)] md:h-auto md:[clip-path:none]">
        <div className="absolute inset-0 bg-white dark:bg-gray-800 border-3 border-black rounded-full md:hidden" />
        <div className="absolute -bottom-1 left-0 right-0 flex justify-center items-end z-20 md:relative md:bottom-auto md:py-8">
          <div className="flex items-end" style={{ gap: "-8px" }}>
            {cards}
          </div>
        </div>
      </div>
    </div>
  );
}
