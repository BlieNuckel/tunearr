import { useRef, useLayoutEffect, useState, useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
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

function MobileNav() {
  const { pathname } = useLocation();
  const navRef = useRef<HTMLUListElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const hasMounted = useRef(false);
  const [pillStyle, setPillStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  const activeIndex = links.findIndex((link) =>
    link.to === "/" ? pathname === "/" : pathname.startsWith(link.to)
  );

  const measure = useCallback(() => {
    const nav = navRef.current;
    const item = itemRefs.current[activeIndex];
    if (!nav || !item || activeIndex === -1) return;

    const navRect = nav.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const iconCenter = itemRect.left - navRect.left + itemRect.width / 2;
    const pillWidth = 44;
    setPillStyle({ left: iconCenter - pillWidth / 2, width: pillWidth });
  }, [activeIndex]);

  useLayoutEffect(() => {
    measure();

    const pill = pillRef.current;
    if (!pill || !hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    pill.style.animation = "none";
    void pill.offsetHeight;
    pill.style.animation = "";
  }, [measure]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3">
      <div className="relative bg-white dark:bg-gray-800 border-3 border-black rounded-full px-4">
        <ul ref={navRef} className="relative flex items-center justify-around">
          {activeIndex !== -1 && (
            <div
              ref={pillRef}
              className="nav-pill-squish absolute top-2 h-8 bg-amber-300 rounded-full border-2 border-black pointer-events-none transition-[left] duration-300 ease-out"
              style={{ left: pillStyle.left, width: pillStyle.width }}
            />
          )}
          {links.map((link, i) => (
            <li
              key={link.to}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="flex-1"
            >
              <NavLink
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center gap-1 py-3 text-xs font-bold transition-colors ${
                    isActive ? "text-black dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
                  }`
                }
              >
                <link.icon className="w-6 h-6" />
                <span>{link.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

export default function Sidebar() {
  return (
    <>
      {/* Mobile Header, shown only on mobile */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 border-b-4 border-black z-40">
        <div className="px-4 py-3 flex items-center justify-between">
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
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-500 transition-colors">
              Tunearr
            </span>
          </NavLink>
        </div>
      </header>

      {/* Desktop Sidebar, hidden on mobile */}
      <aside className="hidden md:flex w-64 min-h-screen bg-white dark:bg-gray-800 border-r-4 border-black flex-col">
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
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-amber-500 transition-colors">
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
                        ? "bg-amber-300 text-black border-black shadow-cartoon-sm dark:text-black"
                        : "text-gray-700 dark:text-gray-300 border-transparent hover:bg-amber-50 dark:hover:bg-gray-700 hover:border-black hover:text-gray-900 dark:hover:text-gray-100"
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
      <MobileNav />
    </>
  );
}
