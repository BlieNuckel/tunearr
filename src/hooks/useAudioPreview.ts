import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

const audio = new Audio();
const listeners = new Set<() => void>();
let activeUrl: string | null = null;
let activeOwner: symbol | null = null;

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function getSnapshot() {
  return activeUrl;
}

function emit() {
  listeners.forEach((fn) => fn());
}

audio.addEventListener("ended", () => {
  activeUrl = null;
  activeOwner = null;
  emit();
});

export default function useAudioPreview() {
  const playingUrl = useSyncExternalStore(subscribe, getSnapshot);
  const ownerId = useRef(Symbol());

  useEffect(() => {
    const id = ownerId.current;
    return () => {
      if (activeOwner === id) {
        audio.pause();
        audio.src = "";
        activeUrl = null;
        activeOwner = null;
        emit();
      }
    };
  }, []);

  const toggle = useCallback((previewUrl: string) => {
    if (activeUrl === previewUrl && !audio.paused) {
      audio.pause();
      activeUrl = null;
      activeOwner = null;
    } else {
      audio.src = previewUrl;
      activeUrl = previewUrl;
      activeOwner = ownerId.current;
      audio.play().catch(() => {
        activeUrl = null;
        activeOwner = null;
        emit();
      });
    }
    emit();
  }, []);

  const stop = useCallback(() => {
    if (activeOwner !== ownerId.current) return;
    audio.pause();
    audio.src = "";
    activeUrl = null;
    activeOwner = null;
    emit();
  }, []);

  const isTrackPlaying = useCallback(
    (url: string) => playingUrl === url,
    [playingUrl]
  );

  return { toggle, stop, isTrackPlaying };
}
