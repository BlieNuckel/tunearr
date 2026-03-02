import { Link } from "react-router-dom";

export default function ExplorationBanner() {
  return (
    <Link
      to="/explore"
      className="block mb-6 group"
      data-testid="exploration-banner"
    >
      <div className="bg-gradient-to-r from-pink-100 via-amber-100 to-pink-100 dark:from-pink-900/20 dark:via-amber-900/20 dark:to-pink-900/20 rounded-xl border-2 border-black shadow-cartoon-md p-5 transition-all group-hover:shadow-cartoon-lg group-hover:-translate-y-0.5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-300 rounded-xl border-2 border-black shadow-cartoon-sm flex items-center justify-center flex-shrink-0">
            <svg
              className="w-6 h-6 text-black"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
              Explore Albums
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pick a starting album and discover new music through tags — collect
              5 albums along the way
            </p>
          </div>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m8.25 4.5 7.5 7.5-7.5 7.5"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
