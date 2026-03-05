import { TAB_LABELS } from "../settingsSearchConfig";
import type { SettingsTab } from "../settingsSearchConfig";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  visibleTabs: SettingsTab[];
}

export default function SettingsTabs({
  activeTab,
  onTabChange,
  visibleTabs,
}: SettingsTabsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory overlay-scrollbar p-1"
      role="tablist"
    >
      {visibleTabs.map((tabId) => (
        <button
          key={tabId}
          role="tab"
          aria-selected={activeTab === tabId}
          onClick={() => onTabChange(tabId)}
          className={`shrink-0 snap-start px-4 py-2 text-sm font-bold rounded-lg border-2 border-black transition-all ${
            activeTab === tabId
              ? "bg-pink-400 text-black shadow-cartoon-sm dark:text-black"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-gray-700"
          }`}
        >
          {TAB_LABELS[tabId]}
        </button>
      ))}
    </div>
  );
}
