import { NavLink } from "react-router-dom";
import {
  DiscoverIcon,
  SearchIcon,
  SparklesIcon,
  SettingsIcon,
} from "@/components/icons";

const links: Array<{
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { to: "/", label: "Discover", icon: DiscoverIcon },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/status", label: "Status", icon: SparklesIcon },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function Sidebar() {
  return (
    <>
      {/* Mobile Header, shown only on mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white border-b-4 border-black z-40">
        <div className="px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 group">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              className="w-8 h-8 flex-shrink-0"
            >
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="#FCD34D"
                stroke="black"
                strokeWidth="2"
              />
              <circle
                cx="16"
                cy="16"
                r="10"
                fill="none"
                stroke="black"
                strokeWidth="1.5"
              />
              <circle
                cx="16"
                cy="16"
                r="6"
                fill="#F472B6"
                stroke="black"
                strokeWidth="2"
              />
              <circle
                cx="16"
                cy="16"
                r="2"
                fill="white"
                stroke="black"
                strokeWidth="1.5"
              />
            </svg>
            <span className="text-xl font-bold text-gray-900 group-hover:text-amber-500 transition-colors">
              Tunearr
            </span>
          </NavLink>
        </div>
      </header>

      {/* Desktop Sidebar, hidden on mobile */}
      <aside className="hidden md:flex w-64 min-h-screen bg-white border-r-4 border-black flex-col">
        <div className="p-6 border-b-4 border-black">
          <NavLink to="/" className="flex items-center gap-3 group">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 32 32"
              className="w-10 h-10 flex-shrink-0"
            >
              <circle
                cx="16"
                cy="16"
                r="14"
                fill="#FCD34D"
                stroke="black"
                strokeWidth="2"
              />
              <circle
                cx="16"
                cy="16"
                r="10"
                fill="none"
                stroke="black"
                strokeWidth="1.5"
              />
              <circle
                cx="16"
                cy="16"
                r="6"
                fill="#F472B6"
                stroke="black"
                strokeWidth="2"
              />
              <circle
                cx="16"
                cy="16"
                r="2"
                fill="white"
                stroke="black"
                strokeWidth="1.5"
              />
            </svg>
            <span className="text-2xl font-bold text-gray-900 group-hover:text-amber-500 transition-colors">
              Tunearr
            </span>
          </NavLink>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-base font-bold transition-all border-2 ${
                      isActive
                        ? "bg-amber-300 text-black border-black shadow-cartoon-sm"
                        : "text-gray-700 border-transparent hover:bg-amber-50 hover:border-black hover:text-gray-900"
                    }`
                  }
                >
                  <link.icon className="w-5 h-5" />
                  <span>{link.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      {/* Mobile Bottom Navigation, shown only on mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black z-50">
        <ul className="flex items-center justify-around">
          {links.map((link) => (
            <li key={link.to} className="flex-1">
              <NavLink
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-1 py-3 text-xs font-bold transition-all ${
                    isActive
                      ? "text-amber-500 bg-amber-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-amber-50"
                  }`
                }
              >
                <link.icon className="w-6 h-6" />
                <span>{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
