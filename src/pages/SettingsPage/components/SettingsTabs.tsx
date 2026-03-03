export type SettingsTab =
  | "general"
  | "integrations"
  | "recommendations"
  | "users";

interface SettingsTabsProps {
  activeTab: SettingsTab;
  onTabChange: (tab: SettingsTab) => void;
  isAdmin: boolean;
}

const ALL_TABS: { id: SettingsTab; label: string; adminOnly: boolean }[] = [
  { id: "general", label: "General", adminOnly: false },
  { id: "integrations", label: "Integrations", adminOnly: true },
  { id: "recommendations", label: "Recommendations", adminOnly: true },
  { id: "users", label: "Users", adminOnly: true },
];

export default function SettingsTabs({
  activeTab,
  onTabChange,
  isAdmin,
}: SettingsTabsProps) {
  const tabs = isAdmin ? ALL_TABS : ALL_TABS.filter((t) => !t.adminOnly);

  return (
    <div
      className="flex gap-2 overflow-x-auto snap-x snap-mandatory overlay-scrollbar p-1"
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`shrink-0 snap-start px-4 py-2 text-sm font-bold rounded-lg border-2 border-black transition-all ${
            activeTab === tab.id
              ? "bg-pink-400 text-black shadow-cartoon-sm dark:text-black"
              : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-pink-50 dark:hover:bg-gray-700"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
