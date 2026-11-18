import { useCallback } from "react";
import { createSearchParams, useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import DiscoverGrid from "./components/DiscoverGrid";
import { SECTION_DEFINITIONS } from "./sections";

export default function DiscoverPage() {
  const navigate = useNavigate();

  const handleSearch = useCallback(
    (query: string) => {
      navigate({
        pathname: "/search",
        search: createSearchParams({ q: query }).toString(),
      });
    },
    [navigate]
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
        Discover
      </h1>

      <div className="mb-6">
        <SearchBar onSearch={handleSearch} />
      </div>

      <DiscoverGrid definitions={SECTION_DEFINITIONS} />
    </div>
  );
}
