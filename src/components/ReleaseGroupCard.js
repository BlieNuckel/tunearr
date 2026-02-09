import MonitorButton from "./MonitorButton";
import useLidarr from "../hooks/useLidarr";

/**
 * @param {{ releaseGroup: object }} props
 */
export default function ReleaseGroupCard({ releaseGroup }) {
  const artistCredit = releaseGroup["artist-credit"]?.[0];
  const artistName = artistCredit?.artist?.name || "Unknown Artist";
  const artistMbid = artistCredit?.artist?.id;
  const albumTitle = releaseGroup.title;
  const albumMbid = releaseGroup.id;
  const year = releaseGroup["first-release-date"]?.slice(0, 4) || "";

  const coverUrl = `https://coverartarchive.org/release-group/${albumMbid}/front-250`;

  const { state, errorMsg, addToLidarr } = useLidarr();

  const handleClick = () => {
    if (state === "idle" || state === "error") {
      addToLidarr({ artistMbid, albumMbid });
    }
  };

  return (
    <div className="flex gap-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
      <img
        src={coverUrl}
        alt={`${albumTitle} cover`}
        className="w-24 h-24 rounded object-cover bg-gray-700 flex-shrink-0"
        onError={(e) => {
          e.target.style.display = "none";
        }}
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold truncate">{albumTitle}</h3>
        <p className="text-gray-400 text-sm">{artistName}</p>
        {year && <p className="text-gray-500 text-xs mt-1">{year}</p>}
      </div>
      <div className="flex items-start">
        <MonitorButton state={state} onClick={handleClick} errorMsg={errorMsg} />
      </div>
    </div>
  );
}
