import { useState, useRef, useEffect } from "react";
import BottomSheet from "./BottomSheet";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
  /** How selected values within this group combine. "or" = match any, "and" = match all. Default: "or" */
  combineMode?: "and" | "or";
}

interface SearchConfig {
  placeholder: string;
  onSearch: (query: string) => void;
}

interface FilterBarProps {
  filters: FilterGroup[];
  values: Record<string, string[]>;
  onChange: (key: string, values: string[]) => void;
  search?: SearchConfig;
}

function SearchForm({ placeholder, onSearch }: SearchConfig) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(input.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border-2 border-black rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-amber-400 shadow-cartoon-md text-[16px]"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold rounded-lg border-2 border-black shadow-cartoon-md hover:translate-y-[-1px] hover:shadow-cartoon-lg active:translate-y-[1px] active:shadow-cartoon-pressed transition-all"
      >
        Search
      </button>
    </form>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      width="16"
      height="16"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      width="16"
      height="16"
    >
      <path
        fillRule="evenodd"
        d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 01.628.74v2.288a2.25 2.25 0 01-.659 1.59l-4.682 4.683a2.25 2.25 0 00-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 018 18.25v-5.757a2.25 2.25 0 00-.659-1.591L2.659 6.22A2.25 2.25 0 012 4.629V2.34a.75.75 0 01.628-.74z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function toggleValue(current: string[], value: string): string[] {
  return current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value];
}

function getActiveChips(
  filters: FilterGroup[],
  values: Record<string, string[]>
): { key: string; groupLabel: string; value: string; label: string }[] {
  const chips: {
    key: string;
    groupLabel: string;
    value: string;
    label: string;
  }[] = [];
  for (const group of filters) {
    const selected = values[group.key] ?? [];
    for (const opt of group.options) {
      if (selected.includes(opt.value)) {
        chips.push({
          key: group.key,
          groupLabel: group.label,
          value: opt.value,
          label: opt.label,
        });
      }
    }
  }
  return chips;
}

const chipBase =
  "px-2.5 py-1 text-sm font-medium rounded-lg border-2 border-black transition-all whitespace-nowrap";
const chipActive = "bg-amber-400 text-black shadow-cartoon-sm";
const chipInactive =
  "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-cartoon-sm hover:bg-gray-50 dark:hover:bg-gray-700";

function SelectableChip({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`${chipBase} ${selected ? chipActive : chipInactive}`}
    >
      {label}
    </button>
  );
}

function RemovableChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-400 text-black border-2 border-black shadow-cartoon-sm transition-all active:shadow-cartoon-pressed"
    >
      {label}
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
      </svg>
    </button>
  );
}

// --- Mobile ---

function MobileFilterBar({
  filters,
  values,
  onChange,
}: Omit<FilterBarProps, "search">) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const activeChips = getActiveChips(filters, values);

  const handleReset = () => {
    for (const group of filters) {
      onChange(group.key, []);
    }
  };

  return (
    <div className="flex items-center gap-2 md:hidden">
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`flex items-center justify-center w-9 h-9 rounded-lg border-2 border-black shadow-cartoon-sm transition-all hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed flex-shrink-0 ${
          activeChips.length > 0
            ? "bg-amber-400 text-black"
            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
        }`}
      >
        <FilterIcon className="w-4 h-4" />
      </button>

      {activeChips.length > 0 && (
        <div className="flex items-center gap-1.5 min-w-0">
          {activeChips.slice(0, 2).map((chip) => (
            <RemovableChip
              key={`${chip.key}-${chip.value}`}
              label={chip.label}
              onRemove={() =>
                onChange(
                  chip.key,
                  toggleValue(values[chip.key] ?? [], chip.value)
                )
              }
            />
          ))}
          {activeChips.length > 2 && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
              +{activeChips.length - 2} more
            </span>
          )}
        </div>
      )}

      <BottomSheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filters"
      >
        <div className="space-y-6">
          {filters.map((group) => (
            <div key={group.key}>
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-2">
                {group.label}
              </h3>
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <SelectableChip
                    key={option.value}
                    label={option.label}
                    selected={(values[group.key] ?? []).includes(option.value)}
                    onToggle={() =>
                      onChange(
                        group.key,
                        toggleValue(values[group.key] ?? [], option.value)
                      )
                    }
                  />
                ))}
              </div>
            </div>
          ))}

          {activeChips.length > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Reset all filters
            </button>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

// --- Desktop ---

function handleClickOutside(
  e: MouseEvent,
  containerRef: React.RefObject<HTMLDivElement | null>,
  close: () => void
) {
  if (
    containerRef.current &&
    !containerRef.current.contains(e.target as Node)
  ) {
    close();
  }
}

const pillActiveClass = "bg-amber-400 text-black";
const pillInactiveClass =
  "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2.5-2.5a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
    </svg>
  );
}

function DropdownOption({
  label,
  selected,
  onToggle,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onToggle}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <span
        className={`flex items-center justify-center w-4.5 h-4.5 rounded border-2 flex-shrink-0 transition-colors ${
          selected
            ? "bg-gray-900 dark:bg-gray-100 border-gray-900 dark:border-gray-100 text-white dark:text-gray-900"
            : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        }`}
      >
        {selected && <CheckIcon className="w-3.5 h-3.5" />}
      </span>
      <span className="text-gray-900 dark:text-gray-100">{label}</span>
    </button>
  );
}

function FilterDropdown({
  group,
  selected,
  isOpen,
  onToggleOpen,
  onChange,
}: {
  group: FilterGroup;
  selected: string[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onChange: (values: string[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const listener = (e: MouseEvent) =>
      handleClickOutside(e, ref, onToggleOpen);

    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [isOpen, onToggleOpen]);

  const selectedLabels = group.options
    .filter((o) => selected.includes(o.value))
    .map((o) => o.label);

  const pillText =
    selectedLabels.length === 0
      ? group.label
      : `${group.label}: ${selectedLabels.join(", ")}`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggleOpen}
        className={`flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border-2 border-black shadow-cartoon-sm hover:translate-y-[-1px] hover:shadow-cartoon-md active:translate-y-[1px] active:shadow-cartoon-pressed transition-all whitespace-nowrap ${
          selected.length > 0 ? pillActiveClass : pillInactiveClass
        }`}
      >
        {pillText}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 mt-1.5 min-w-48 bg-white dark:bg-gray-800 border-2 border-black rounded-xl shadow-cartoon-lg py-1 z-50 animate-dropdown-in"
        >
          {group.options.map((option) => (
            <DropdownOption
              key={option.value}
              label={option.label}
              selected={selected.includes(option.value)}
              onToggle={() => onChange(toggleValue(selected, option.value))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DesktopFilterBar({
  filters,
  values,
  onChange,
}: Omit<FilterBarProps, "search">) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const hasActiveFilters = filters.some(
    (group) => (values[group.key] ?? []).length > 0
  );

  const handleReset = () => {
    for (const group of filters) {
      onChange(group.key, []);
    }
    setExpandedKey(null);
  };

  return (
    <div className="hidden md:flex md:flex-wrap md:items-center md:gap-2">
      {filters.map((group) => (
        <FilterDropdown
          key={group.key}
          group={group}
          selected={values[group.key] ?? []}
          isOpen={expandedKey === group.key}
          onToggleOpen={() =>
            setExpandedKey((prev) => (prev === group.key ? null : group.key))
          }
          onChange={(newValues) => onChange(group.key, newValues)}
        />
      ))}

      {hasActiveFilters && (
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

// --- Combined ---

export default function FilterBar({
  filters,
  values,
  onChange,
  search,
}: FilterBarProps) {
  return (
    <div className="space-y-2">
      {search && <SearchForm {...search} />}
      <MobileFilterBar filters={filters} values={values} onChange={onChange} />
      <DesktopFilterBar filters={filters} values={values} onChange={onChange} />
    </div>
  );
}

export type { FilterOption, FilterGroup, FilterBarProps, SearchConfig };
