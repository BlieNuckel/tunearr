import AccountSection from "../sections/general/AccountSection";
import SpendingSection from "../sections/general/SpendingSection";
import LivePreferencesSection from "../sections/general/LivePreferencesSection";
import ThemeToggle from "@/components/ThemeToggle";

export default function GeneralSettingsPage() {
  return (
    <div className="space-y-6">
      <AccountSection />

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Theme
        </h2>
        <ThemeToggle />
      </div>

      <SpendingSection />

      <LivePreferencesSection />
    </div>
  );
}
