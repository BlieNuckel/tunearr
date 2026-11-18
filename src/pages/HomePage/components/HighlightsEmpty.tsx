import { Link } from "react-router-dom";
import { SparklesIcon } from "@/components/icons";
import { SECONDARY_BUTTON } from "../styles";

export default function HighlightsEmpty() {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-400 dark:border-gray-600 px-6 py-10 flex flex-col items-center text-center">
      <SparklesIcon
        className="w-7 h-7 text-amber-400 dark:text-amber-500"
        aria-hidden="true"
      />
      <p className="mt-3 font-semibold text-gray-900 dark:text-gray-100">
        Nothing new right now
      </p>
      <p className="mt-1 max-w-sm text-sm text-gray-600 dark:text-gray-400">
        New releases from artists you follow, and their shows near you, will
        show up here.
      </p>
      <Link to="/library/following" className={`mt-4 ${SECONDARY_BUTTON}`}>
        See who you follow
      </Link>
    </div>
  );
}
