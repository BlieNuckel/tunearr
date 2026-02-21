import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import type { Theme } from "@/context/themeContextDef";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (themeValue: Theme) => {
    switch (themeValue) {
      case "light":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        );
      case "dark":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        );
      case "system":
        return (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        );
    }
  };

  const getLabel = (themeValue: Theme) => {
    switch (themeValue) {
      case "light":
        return "Light";
      case "dark":
        return "Dark";
      case "system":
        return "Auto";
    }
  };

  const options: Theme[] = ["light", "dark", "system"];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border-2 border-black bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-[2px_2px_0_0_black] transition-all hover:bg-amber-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0_0_black] dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        title={`Theme: ${getLabel(theme)}`}
        aria-label={`Change theme (current: ${getLabel(theme)})`}
      >
        {getIcon(theme)}
        <span className="hidden sm:inline">{getLabel(theme)}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-40 rounded-lg border-2 border-black bg-white p-2 shadow-cartoon-lg dark:bg-gray-800">
          <div className="space-y-1">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => {
                  console.log("🖱️ Theme option clicked:", option);
                  setTheme(option);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  theme === option
                    ? "bg-amber-300 text-black font-bold dark:text-black"
                    : "text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700"
                }`}
              >
                {getIcon(option)}
                <span>{getLabel(option)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle;
