import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Discover" },
  { to: "/search", label: "Search" },
  { to: "/status", label: "Status" },
  { to: "/settings", label: "Settings" },
];

export default function Navbar() {
  return (
    <nav className="bg-white border-b-4 border-black">
      <div className="max-w-6xl mx-auto px-4 flex items-center h-14 gap-6">
        <NavLink to="/" className="flex items-center gap-2 mr-4 group">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            className="w-7 h-7"
          >
            <circle cx="16" cy="16" r="14" fill="#FCD34D" stroke="black" strokeWidth="2" />
            <circle cx="16" cy="16" r="10" fill="none" stroke="black" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="6" fill="#F472B6" stroke="black" strokeWidth="2" />
            <circle cx="16" cy="16" r="2" fill="white" stroke="black" strokeWidth="1.5" />
          </svg>
          <span className="text-lg font-bold text-gray-900 group-hover:text-amber-500 transition-colors">
            Music Requester
          </span>
        </NavLink>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `text-sm font-bold transition-colors ${
                isActive
                  ? "text-amber-500"
                  : "text-gray-400 hover:text-gray-900"
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
