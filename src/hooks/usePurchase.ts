import { useState, useCallback } from "react";

type PurchaseState = "idle" | "recording" | "removing" | "purchased" | "error";

export default function usePurchase(initialPurchased = false) {
  const [state, setState] = useState<PurchaseState>(
    initialPurchased ? "purchased" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const record = useCallback(
    async (albumMbid: string, price: number, currency: string) => {
      setState("recording");
      setErrorMsg(null);

      try {
        const res = await fetch("/api/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ albumMbid, price, currency }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to record purchase");
        }

        setState("purchased");
      } catch (err) {
        setState("error");
        setErrorMsg(
          err instanceof Error ? err.message : "Failed to record purchase"
        );
      }
    },
    []
  );

  const remove = useCallback(async (albumMbid: string) => {
    setState("removing");
    setErrorMsg(null);

    try {
      const res = await fetch(
        `/api/purchases/${encodeURIComponent(albumMbid)}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove purchase");
      }

      setState("idle");
    } catch (err) {
      setState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Failed to remove purchase"
      );
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setErrorMsg(null);
  }, []);

  return { state, errorMsg, record, remove, reset };
}
