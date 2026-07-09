import DiscoverGrid from "./components/DiscoverGrid";
import { SECTION_DEFINITIONS } from "./sections";

export default function DiscoverPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Discover
      </h1>

      <DiscoverGrid definitions={SECTION_DEFINITIONS} />
    </div>
  );
}
