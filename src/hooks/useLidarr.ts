import { useState, useCallback } from "react";

type LidarrState =
  | "idle"
  | "adding"
  | "success"
  | "already_monitored"
  | "error";

export default function useLidarr() {
  const [state, setState] = useState<LidarrState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const addToLidarr = useCallback(
    async ({ albumMbid }: { albumMbid: string }) => {
      setState("adding");
      setErrorMsg(null);

      try {
        const res = await fetch("/api/lidarr/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ albumMbid }),
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Server error (${res.status})`);
        }

        if (!res.ok) throw new Error(data.error || "Failed to add album");

        if (data.status === "already_monitored") {
          setState("already_monitored");
        } else {
          setState("success");
        }
      } catch (err) {
        setState("error");
        setErrorMsg(err instanceof Error ? err.message : "Failed to add album");
      }
    },
    []
  );

  return { state, errorMsg, addToLidarr };
}
