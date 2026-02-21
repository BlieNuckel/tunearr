import { useState, useEffect, useRef } from "react";
import { ChevronDownIcon } from "@/components/icons";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchable = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setFilter("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label;

  const filteredOptions =
    searchable && filter
      ? options.filter((o) =>
          o.label.toLowerCase().includes(filter.toLowerCase())
        )
      : options;

  const triggerClasses =
    "w-full px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-sm text-left shadow-cartoon-md focus:outline-none focus:border-amber-400";

  return (
    <div className="relative" ref={ref}>
      {searchable ? (
        <input
          ref={inputRef}
          type="text"
          value={open ? filter : (selectedLabel ?? "")}
          onChange={(e) => setFilter(e.target.value)}
          onFocus={() => {
            setOpen(true);
            setFilter("");
          }}
          placeholder={placeholder}
          className={`${triggerClasses} text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`${triggerClasses} flex items-center justify-between`}
        >
          <span
            className={
              selectedLabel
                ? "text-gray-900 dark:text-gray-100"
                : "text-gray-400 dark:text-gray-500"
            }
          >
            {selectedLabel || placeholder}
          </span>
          <ChevronDownIcon
            className={`w-4 h-4 text-gray-500 dark:text-gray-400 ml-2 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
      {open && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl border-2 border-black p-2 shadow-cartoon-lg">
          <div className="max-h-64 overflow-y-auto space-y-1">
            {filteredOptions.length === 0 ? (
              <p className="text-gray-400 dark:text-gray-500 text-sm px-3 py-2">
                No matches
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                    setFilter("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    value === option.value
                      ? "bg-amber-300 text-black font-bold dark:text-black"
                      : "text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
