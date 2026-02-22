import Spinner from "./Spinner";
import usePlexLogin from "@/hooks/usePlexLogin";
import type { PlexServer } from "@/hooks/usePlexLogin";

interface PlexLoginButtonProps {
  onToken: (token: string) => void;
  onServerUrl?: (url: string) => void;
}

export default function PlexLoginButton({
  onToken,
  onServerUrl,
}: PlexLoginButtonProps) {
  const { loading, login } = usePlexLogin({
    onToken,
    onServers: (servers: PlexServer[]) => {
      if (servers.length > 0 && onServerUrl) {
        onServerUrl(servers[0].uri);
      }
    },
  });

  return (
    <button
      type="button"
      onClick={login}
      disabled={loading}
      className="w-full px-4 py-2.5 bg-[#e5a00d] hover:bg-[#cc8f0c] disabled:opacity-60 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-md transition-colors flex items-center justify-center gap-2"
    >
      {loading ? (
        <>
          <Spinner className="w-4 h-4" />
          Signing in…
        </>
      ) : (
        "Sign in with Plex"
      )}
    </button>
  );
}
