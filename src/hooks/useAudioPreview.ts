import { useState, useRef, useCallback, useEffect } from "react";

export default function useAudioPreview() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleEnded = () => setPlayingUrl(null);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
      audio.src = "";
    };
  }, []);

  const toggle = useCallback((previewUrl: string) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.src === previewUrl && !audio.paused) {
      audio.pause();
      setPlayingUrl(null);
    } else {
      audio.src = previewUrl;
      audio.play();
      setPlayingUrl(previewUrl);
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = "";
    setPlayingUrl(null);
  }, []);

  const isTrackPlaying = useCallback(
    (url: string) => playingUrl === url,
    [playingUrl]
  );

  return { toggle, stop, isTrackPlaying };
}
