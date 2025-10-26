import React from "react";
import { Home, Calendar, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const NAV_HEIGHT = 64; // visual height

const Navigation: React.FC = () => {
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
      // STICKY keeps it anchored at the bottom without overlaying content
      style={{
        position: "sticky",
        bottom: 0,
        height: NAV_HEIGHT,
        padding: "8px 16px",
        paddingBottom: "calc(8px + var(--safe-bottom))", // safe area for iOS/Android
        background: "white",
        borderTop: "1px solid #e5e7eb",
        zIndex: 40,
      }}
    >
      <div className="h-full flex justify-around items-center max-w-md mx-auto">
        {items.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center text-xs ${
              active(path) ? "text-amber-600 font-semibold" : "text-gray-600"
            }`}
          >
            <Icon size={22} />
            <span className="mt-1">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
