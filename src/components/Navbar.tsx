import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Discover" },
  { to: "/search", label: "Search" },
  { to: "/status", label: "Status" },
  { to: "/settings", label: "Settings" },
];

export default function Navbar() {
  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        <NavLink to="/" className="flex items-center gap-2 mr-4 group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            className="w-7 h-7 text-indigo-400 group-hover:text-indigo-300 transition-colors"
            fill="currentColor"
          >
            <path d="M26 4a1 1 0 0 0-.78-.38 1 1 0 0 0-.22 0l-14 3A1 1 0 0 0 10 7.62V22a5 5 0 1 0 2 4V13.38l12-2.57V18a5 5 0 1 0 2 4ZM7 28a3 3 0 1 1 3-3 3 3 0 0 1-3 3Zm17-4a3 3 0 1 1 3-3 3 3 0 0 1-3 3Zm2-15.19-12 2.57V8.81l12-2.57Z" />
          </svg>
          <span className="text-lg font-bold text-indigo-400 group-hover:text-indigo-300 transition-colors">
            Music Requester
          </span>
        </NavLink>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `text-sm font-medium transition-colors ${
                isActive
                  ? "text-indigo-400 border-b-2 border-indigo-400"
                  : "text-gray-400 hover:text-gray-200"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
