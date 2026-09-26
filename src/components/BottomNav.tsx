import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Landing" },
  { to: "/entry", label: "Entry" },
  { to: "/review", label: "Review" },
  { to: "/stats", label: "Stats" },
];

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary navigation">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === "/"}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default BottomNav;
