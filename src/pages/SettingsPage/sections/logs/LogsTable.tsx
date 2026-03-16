import { useState } from "react";
import Modal from "@/components/Modal";
import { LogEntry } from "@/hooks/useLogs";

interface LogsTableProps {
  logs: LogEntry[];
}

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "bg-gray-400",
  info: "bg-blue-400",
  warn: "bg-amber-400",
  error: "bg-rose-400",
};

const LEVEL_LABELS: Record<LogLevel, string> = {
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
};

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return timestamp;
  }
}

function formatData(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

export default function LogsTable({ logs }: LogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  if (logs.length === 0) {
    return (
      <p className="text-gray-400 text-sm">
        No logs found. Try adjusting your filters.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto border-2 border-black rounded-xl shadow-cartoon-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 border-b-2 border-black">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                Level
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                Label
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                Message
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300">
                Data
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900">
            {logs.map((log, index) => (
              <tr
                key={`${log.timestamp}-${index}`}
                className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <td className="px-4 py-3">
                  <span
                    className={`${LEVEL_COLORS[log.level]} text-white text-xs font-bold px-2 py-0.5 rounded border border-black`}
                  >
                    {LEVEL_LABELS[log.level]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs font-mono whitespace-nowrap">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs font-mono">
                  {log.label}
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                  {log.message}
                </td>
                <td className="px-4 py-3 text-center">
                  {log.data !== undefined && (
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      aria-label="View log data"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={selectedLog !== null}
        onClose={() => setSelectedLog(null)}
        panelClassName="md:max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Log Details
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span
                  className={`${LEVEL_COLORS[selectedLog.level]} text-white text-xs font-bold px-2 py-0.5 rounded border border-black`}
                >
                  {LEVEL_LABELS[selectedLog.level]}
                </span>
                <span className="font-mono">[{selectedLog.label}]</span>
                <span>{formatTimestamp(selectedLog.timestamp)}</span>
              </div>
            </div>

            <div>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                {selectedLog.message}
              </p>
              {selectedLog.data !== undefined && (
                <div className="bg-gray-50 dark:bg-gray-900 border-2 border-black rounded-xl p-4 overflow-x-auto">
                  <pre className="text-xs text-gray-800 dark:text-gray-200 font-mono">
                    {formatData(selectedLog.data)}
                  </pre>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 font-medium py-2 px-4 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
            >
              Close
            </button>
          </div>
        )}
      </Modal>
    </>
  );
}
