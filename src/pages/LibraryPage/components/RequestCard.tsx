import StatusBadge from "@/components/StatusBadge";
import { ApproveIcon, DeclineIcon } from "@/components/icons";
import { RequestItem } from "@/types";

interface RequestCardProps {
  request: RequestItem;
  index: number;
  showUser?: boolean;
  showActions?: boolean;
  onApprove?: (id: number) => void;
  onDecline?: (id: number) => void;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString();
}

export default function RequestCard({
  request,
  index,
  showUser = false,
  showActions = false,
  onApprove,
  onDecline,
}: RequestCardProps) {
  return (
    <div
      className="stagger-fade-in flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-md hover:-translate-y-0.5 hover:shadow-cartoon-lg transition-all"
      style={{ "--stagger-index": index } as React.CSSProperties}
    >
      <div className="min-w-0 flex-1">
        <p className="text-gray-900 dark:text-gray-100 font-medium truncate">
          {request.albumTitle || request.albumMbid}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
          {request.artistName || "Unknown Artist"}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-gray-400 text-xs">
            {formatDate(request.createdAt)}
          </span>
          {showUser && request.user && (
            <span className="flex items-center gap-1 text-gray-400 text-xs">
              {request.user.thumb && (
                <img
                  src={request.user.thumb}
                  alt=""
                  className="w-4 h-4 rounded-full"
                />
              )}
              {request.user.username}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3 shrink-0">
        {showActions && request.status === "pending" && (
          <>
            <button
              onClick={() => onDecline?.(request.id)}
              aria-label="Decline request"
              className="w-9 h-9 flex items-center justify-center bg-gray-200 dark:bg-gray-700 hover:bg-rose-100 dark:hover:bg-rose-900 text-gray-700 dark:text-gray-300 hover:text-rose-600 rounded-lg border-2 border-black shadow-cartoon-sm hover:-translate-y-px hover:shadow-cartoon-md active:translate-y-px active:shadow-cartoon-pressed transition-all"
            >
              <DeclineIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onApprove?.(request.id)}
              aria-label="Approve request"
              className="w-9 h-9 flex items-center justify-center bg-emerald-400 hover:bg-emerald-300 text-black rounded-lg border-2 border-black shadow-cartoon-sm hover:-translate-y-px hover:shadow-cartoon-md active:translate-y-px active:shadow-cartoon-pressed transition-all"
            >
              <ApproveIcon className="w-4 h-4" />
            </button>
          </>
        )}
        <StatusBadge status={request.status} />
      </div>
    </div>
  );
}
