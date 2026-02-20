import { ExternalLinkIcon } from "@/components/icons";

interface PurchaseLink {
  platform: string;
  url: string;
  icon: string;
}

interface PurchaseLinksProps {
  artistName: string;
  albumTitle: string;
}

export default function PurchaseLinks({
  artistName,
  albumTitle,
}: PurchaseLinksProps) {
  const query = encodeURIComponent(`${artistName} ${albumTitle}`);

  const links: PurchaseLink[] = [
    {
      platform: "Bandcamp",
      url: `https://bandcamp.com/search?q=${query}`,
      icon: "bandcamp.png",
    },
    {
      platform: "Qobuz",
      url: `https://www.qobuz.com/us-en/search?q=${query}`,
      icon: "qobuz.png",
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-gray-600 text-sm font-medium">
        Check availability and pricing:
      </p>
      {links.map((link) => (
        <a
          key={link.platform}
          data-testid={`purchase-link-${link.platform.toLowerCase()}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
        >
          <img src={link.icon} className="h-12" />
          <div className="flex-1">
            <p className="text-gray-900 font-medium">{link.platform}</p>
            <p className="text-gray-400 text-xs">View pricing and purchase</p>
          </div>
          <ExternalLinkIcon className="w-5 h-5 text-gray-400" />
        </a>
      ))}
    </div>
  );
}
