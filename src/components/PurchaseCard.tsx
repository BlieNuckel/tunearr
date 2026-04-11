import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/useAuth";
import { hasPermission, Permission } from "@shared/permissions";
import { formatCurrency } from "@shared/currency";
import ImageWithShimmer from "./ImageWithShimmer";
import OptionSelect from "./OptionSelect";
import { pastelColorFromId } from "@/utils/color";
import type { Option } from "./OptionSelect";
import type { PurchaseItem } from "@/types";

interface PurchaseCardProps {
  item: PurchaseItem;
  onRemove: (albumMbid: string) => void | Promise<void>;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function PurchaseCard({ item, onRemove }: PurchaseCardProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin =
    user !== null && hasPermission(user.permissions, Permission.ADMIN);

  const [coverError, setCoverError] = useState(false);
  const pastelBg = useMemo(
    () => pastelColorFromId(item.albumMbid),
    [item.albumMbid]
  );
  const coverUrl = `https://coverartarchive.org/release-group/${item.albumMbid}/front-500`;

  const priceDisplay = formatCurrency(item.price, item.currency);

  const options: Option[] = [
    { label: "Remove purchase", onClick: () => onRemove(item.albumMbid) },
    ...(isAdmin
      ? [
          {
            label: "Upload files",
            onClick: () => navigate(`/library/upload?mbid=${item.albumMbid}`),
          },
        ]
      : []),
  ];

  const coverImage = !coverError ? (
    <ImageWithShimmer
      src={coverUrl}
      alt={`${item.albumTitle} cover`}
      className="w-full h-full object-cover"
      onError={() => setCoverError(true)}
    />
  ) : null;

  return (
    <>
      {/* Mobile */}
      <div className="sm:hidden bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden">
        <div className="flex items-center">
          <div
            className="w-24 aspect-square flex-shrink-0 relative"
            style={{ backgroundColor: pastelBg }}
          >
            {coverImage}
          </div>
          <div className="flex-1 min-w-0 px-4 py-3">
            <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-base truncate">
              {item.albumTitle}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm truncate">
              {item.artistName}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                {priceDisplay}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-xs">
                {formatDate(item.purchasedAt)}
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 mr-3">
            <OptionSelect options={options} title={item.albumTitle} />
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div
        className="hidden sm:block bg-white dark:bg-gray-800 rounded-xl border-2 border-black shadow-cartoon-md overflow-hidden"
        data-testid="purchase-card"
      >
        <div
          className="aspect-square relative"
          style={{ backgroundColor: pastelBg }}
        >
          {coverImage}
          <div className="absolute top-2 right-2">
            <span className="bg-emerald-400 text-black text-xs font-bold px-2 py-1 rounded-lg border-2 border-black shadow-cartoon-sm">
              {priceDisplay}
            </span>
          </div>
        </div>

        <div className="p-3 border-t-2 border-black">
          <div className="flex items-start justify-between gap-1">
            <div className="min-w-0 flex-1">
              <h3 className="text-gray-900 dark:text-gray-100 font-semibold text-sm truncate mb-1">
                {item.albumTitle}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                {item.artistName}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                {formatDate(item.purchasedAt)}
              </p>
            </div>
            <OptionSelect options={options} title={item.albumTitle} />
          </div>
        </div>
      </div>
    </>
  );
}
