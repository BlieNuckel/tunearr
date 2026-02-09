import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Search" },
  { to: "/status", label: "Status" },
  { to: "/settings", label: "Settings" },
];

export default function Navbar() {
  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        <span className="text-lg font-bold text-indigo-400 mr-4">
          Music Requester
        </span>
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
