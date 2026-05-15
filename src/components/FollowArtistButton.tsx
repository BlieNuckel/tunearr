import { useState } from "react";
import { BellIcon, BellSlashIcon } from "./icons";
import useFollowedArtists from "@/hooks/useFollowedArtists";

type FollowArtistButtonProps = {
  artistMbid: string;
  artistName: string;
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
};

const SIZE_STYLES = {
  sm: "h-8 px-2 text-xs",
  md: "h-9 px-3 text-sm",
};

export default function FollowArtistButton({
  artistMbid,
  artistName,
  size = "md",
  showLabel = true,
  className = "",
}: FollowArtistButtonProps) {
  const { isFollowing, follow, unfollow } = useFollowedArtists();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!artistMbid) return null;

  const following = isFollowing(artistMbid);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (following) {
        await unfollow(artistMbid);
      } else {
        await follow(artistMbid, artistName);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const label = following ? "Following" : "Follow";
  const Icon = following ? BellIcon : BellSlashIcon;
  const colorClasses = following
    ? "bg-pink-400 text-black"
    : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={following}
      aria-label={following ? `Unfollow ${artistName}` : `Follow ${artistName}`}
      title={error ?? label}
      className={`inline-flex items-center gap-1 rounded-full border-2 border-black font-bold ${SIZE_STYLES[size]} ${colorClasses} disabled:opacity-50 ${className}`}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {showLabel ? label : null}
    </button>
  );
}
