import { useState, useCallback } from "react";

/**
 * Hook to add an album to Lidarr via the backend.
 * @returns {{ state: string, errorMsg: string|null, addToLidarr: (params: {albumMbid: string}) => Promise<void> }}
 */
export default function useLidarr() {
  const [state, setState] = useState("idle");
  const [errorMsg, setErrorMsg] = useState(null);

  const addToLidarr = useCallback(async ({ albumMbid }) => {
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
      setErrorMsg(err.message);
    }
  }, []);

  return { state, errorMsg, addToLidarr };
}
