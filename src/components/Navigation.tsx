import { Home, Calendar, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import type { FC } from "react";

const NAV_HEIGHT = 72; // visual height without safe inset

const Navigation: FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const items = [
    { path: "/availability", icon: Calendar, label: "Bee Availability" },
    { path: "/home", icon: Home, label: "Home" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  const active = (p: string) => pathname === p || pathname.startsWith(p);

  return (
    <nav
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "10px 18px",
        paddingBottom: "calc(12px + var(--safe-bottom))",
        background: "rgba(255, 255, 255, 0.95)",
        borderTop: "1px solid #e5e7eb",
        boxShadow: "0 -10px 28px rgba(15, 23, 42, 0.08)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 40,
      }}
    >
      <div
        className="h-full flex items-center justify-center mx-auto"
        style={{ minHeight: NAV_HEIGHT, maxWidth: 320, gap: 36 }}
      >
        {items.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            type="button"
            onClick={() => navigate(path)}
            className={`flex flex-col items-center text-xs leading-tight ${
              active(path) ? "text-amber-600 font-semibold" : "text-gray-600"
            }`}
          >
            <Icon size={22} strokeWidth={2.1} />
            <span className="mt-1">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
