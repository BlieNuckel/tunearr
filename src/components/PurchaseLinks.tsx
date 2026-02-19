interface PurchaseLink {
  platform: string;
  url: string;
  icon: string;
}

interface PurchaseLinksProps {
  artistName: string;
  albumTitle: string;
}

export default function PurchaseLinks({ artistName, albumTitle }: PurchaseLinksProps) {
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
      <p className="text-gray-300 text-sm font-medium">
        Check availability and pricing:
      </p>
      {links.map((link) => (
        <a
          key={link.platform}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors border border-gray-600 hover:border-gray-500"
        >
          <img src={link.icon} className="h-12" />
          <div className="flex-1">
            <p className="text-white font-medium">{link.platform}</p>
            <p className="text-gray-400 text-xs">
              View pricing and purchase
            </p>
          </div>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      ))}
    </div>
  );
}
