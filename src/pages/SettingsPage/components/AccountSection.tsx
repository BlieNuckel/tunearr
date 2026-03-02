import { useAuth } from "@/context/useAuth";
import { LogoutIcon } from "@/components/icons";

export default function AccountSection() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
        Account
      </h2>
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-2 border-black rounded-lg shadow-cartoon-sm">
        <div>
          <p className="text-base font-bold text-gray-900 dark:text-gray-100">
            {user?.username}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
            {user?.role}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2 bg-rose-400 text-white font-bold rounded-lg border-2 border-black shadow-cartoon-sm hover:brightness-110 transition-all cursor-pointer"
        >
          <LogoutIcon className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
