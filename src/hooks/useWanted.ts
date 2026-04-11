import { useState, useCallback } from "react";

type WantedState = "idle" | "adding" | "removing" | "wanted" | "error";

export default function useWanted(initialWanted = false) {
  const [state, setState] = useState<WantedState>(
    initialWanted ? "wanted" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addToWanted = useCallback(async (albumMbid: string) => {
    setState("adding");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/wanted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumMbid }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add to wanted list");
      }

      setState("wanted");
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to add to wanted list"
      );
    }
  }, []);

  const removeFromWanted = useCallback(async (albumMbid: string) => {
    setState("removing");
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/wanted/${encodeURIComponent(albumMbid)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove from wanted list");
      }

      setState("idle");
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to remove from wanted list"
      );
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setErrorMsg(null);
  }, []);

  return { state, errorMsg, addToWanted, removeFromWanted, reset };
}
