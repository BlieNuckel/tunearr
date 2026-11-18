import { useCallback } from "react";
import { createSearchParams, useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Highlights from "./components/Highlights";

export default function HomePage() {
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
        Home
      </h1>

      <div className="mb-8">
        <SearchBar onSearch={handleSearch} />
      </div>

      <Highlights />
    </div>
  );
}
