import Skeleton from "@/components/Skeleton";
import { RequestItem } from "@/types";
import RequestCard from "./RequestCard";

interface RequestListProps {
  requests: RequestItem[];
  loading: boolean;
  error: string | null;
  emptyMessage: string;
  showUser?: boolean;
  showActions?: boolean;
  onApprove?: (id: number) => void;
  onDecline?: (id: number) => void;
}

export default function RequestList({
  requests,
  loading,
  error,
  emptyMessage,
  showUser = false,
  showActions = false,
  onApprove,
  onDecline,
}: RequestListProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border-2 border-black shadow-cartoon-sm"
          >
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-rose-500">
        <p>Failed to load requests: {error}</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return <p className="text-gray-400 text-sm">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {requests.map((request, index) => (
        <RequestCard
          key={request.id}
          request={request}
          index={index}
          showUser={showUser}
          showActions={showActions}
          onApprove={onApprove}
          onDecline={onDecline}
        />
      ))}
    </div>
  );
}
