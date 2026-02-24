import { useState } from "react";
import Modal from "@/components/Modal";

type SetupResult = {
  indexer: { success: boolean; error?: string };
  downloadClient: { success: boolean; error?: string };
};

interface AutoSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

async function submitAutoSetup(
  host: string,
  port: number
): Promise<SetupResult> {
  const res = await fetch("/api/lidarr/auto-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ host, port }),
  });
  if (!res.ok) {
    throw new Error("Failed to set up in Lidarr");
  }
  return res.json();
}

export default function AutoSetupModal({
  isOpen,
  onClose,
  onSuccess,
}: AutoSetupModalProps) {
  const [host, setHost] = useState("tunearr");
  const [port, setPort] = useState("3001");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const data = await submitAutoSetup(host, Number(port));
      setResult(data);

      if (data.indexer.success && data.downloadClient.success) {
        onSuccess();
        onClose();
      }
    } catch {
      setResult({
        indexer: { success: false, error: "Request failed" },
        downloadClient: { success: false, error: "Request failed" },
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fullSuccess =
    result?.indexer.success && result?.downloadClient.success;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
        Set Up in Lidarr
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Enter the host and port that Lidarr should use to reach this app. This
        will create a Torznab indexer and SABnzbd download client in Lidarr.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Host
          </label>
          <input
            type="text"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            placeholder="tunearr"
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Port
          </label>
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="3001"
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md"
          />
        </div>

        {result && !fullSuccess && (
          <div className="space-y-2 text-sm">
            <ResultLine label="Indexer" result={result.indexer} />
            <ResultLine
              label="Download Client"
              result={result.downloadClient}
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !host || !port}
            className="flex-1 px-4 py-2 bg-amber-400 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:bg-amber-300 active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {submitting ? "Setting up…" : "Set Up"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 font-medium hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ResultLine({
  label,
  result,
}: {
  label: string;
  result: { success: boolean; error?: string };
}) {
  return (
    <div
      className={`p-2 rounded-lg border-2 border-black ${result.success ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-rose-100 dark:bg-rose-900/30"}`}
    >
      <span className="font-medium">{label}:</span>{" "}
      {result.success ? "Created" : result.error ?? "Failed"}
    </div>
  );
}
