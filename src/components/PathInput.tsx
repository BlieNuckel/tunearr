import { useEffect, useRef, useState } from "react";
import {
  useFloating,
  offset,
  flip,
  shift,
  size,
  autoUpdate,
} from "@floating-ui/react-dom";

type ValidationState =
  | { status: "idle" }
  | { status: "validating" }
  | { status: "valid" }
  | { status: "invalid"; error: string };

interface CheckedPath {
  path: string;
  validation: ValidationState;
  suggestions: string[];
}

interface PathInputProps {
  value: string;
  onChange: (path: string) => void;
  placeholder?: string;
  className?: string;
  "data-testid"?: string;
}

const DEBOUNCE_MS = 400;

async function validatePath(dirPath: string): Promise<ValidationState> {
  try {
    const res = await fetch("/api/settings/validate-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: dirPath }),
    });
    if (res.ok) {
      return { status: "valid" };
    }
    const data = await res.json().catch(() => ({}));
    return { status: "invalid", error: data.error || "Invalid path" };
  } catch {
    return { status: "idle" };
  }
}

async function fetchSuggestions(dirPath: string): Promise<string[]> {
  try {
    const res = await fetch(
      `/api/settings/browse?path=${encodeURIComponent(dirPath)}`
    );
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

export default function PathInput({
  value,
  onChange,
  placeholder,
  className = "w-full",
  "data-testid": dataTestId,
}: PathInputProps) {
  const [checked, setChecked] = useState<CheckedPath | null>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [referenceEl, setReferenceEl] = useState<HTMLElement | null>(null);
  const [floatingEl, setFloatingEl] = useState<HTMLElement | null>(null);

  const { floatingStyles } = useFloating({
    elements: { reference: referenceEl, floating: floatingEl },
    placement: "bottom-start",
    transform: false,
    middleware: [
      offset(4),
      flip(),
      shift({ padding: 8 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (!value) {
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const [validation, dirs] = await Promise.all([
        validatePath(value),
        fetchSuggestions(value),
      ]);
      if (!cancelled) {
        setChecked({
          path: value,
          validation,
          suggestions: dirs.filter((dir) => dir !== value),
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isCurrent = checked !== null && checked.path === value;
  const validation: ValidationState = !value
    ? { status: "idle" }
    : isCurrent
      ? checked.validation
      : { status: "validating" };
  const suggestions = isCurrent ? checked.suggestions : [];

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length
      );
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showDropdown = open && suggestions.length > 0;

  return (
    <div ref={wrapperRef}>
      <input
        ref={setReferenceEl}
        type="text"
        value={value}
        data-testid={dataTestId}
        onChange={(e) => {
          setOpen(true);
          setHighlightIndex(-1);
          onChange(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-200 dark:placeholder-gray-600 focus:outline-none focus:border-amber-400 shadow-cartoon-md`}
      />
      {showDropdown && (
        <div
          ref={setFloatingEl}
          style={floatingStyles}
          className="z-10 bg-white dark:bg-gray-800 rounded-xl border-2 border-black p-2 shadow-cartoon-lg animate-dropdown-in origin-top"
        >
          <div className="max-h-64 overflow-y-auto space-y-1">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  index === highlightIndex
                    ? "bg-amber-300 text-black font-bold dark:text-black"
                    : "text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700"
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      {validation.status === "validating" && (
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Checking path...
        </p>
      )}
      {validation.status === "valid" && (
        <p className="text-green-600 dark:text-green-400 text-xs mt-1">
          Path exists and is writable
        </p>
      )}
      {validation.status === "invalid" && (
        <p className="text-red-600 dark:text-red-400 text-xs mt-1">
          {validation.error}
        </p>
      )}
    </div>
  );
}
