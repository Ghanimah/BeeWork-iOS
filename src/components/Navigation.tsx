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
        padding: "10px 0",
        paddingBottom: "calc(12px + var(--safe-bottom))",
        background: "rgba(255, 255, 255, 0.95)",
        borderTop: "1px solid #e5e7eb",
        boxShadow: "0 -10px 28px rgba(15, 23, 42, 0.06)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        zIndex: 40,
      }}
    >
      <div className="relative mx-auto" style={{ height: NAV_HEIGHT, maxWidth: 480 }}>
        {items.map(({ path, icon: Icon, label }) => {
          const isHome = path === "/home";
          const baseStyle: React.CSSProperties = {
            position: "absolute",
            top: "50%",
            transform: "translate(-50%, -50%)",
            left: isHome ? "50%" : path === "/availability" ? "25%" : "75%",
          };
          return (
            <button
              key={path}
              type="button"
              onClick={() => navigate(path)}
              style={baseStyle}
              className={`flex flex-col items-center ${
                isHome ? "gap-1.5" : "gap-1"
              } ${isHome ? "text-[13px]" : "text-xs"} leading-tight ${
                active(path) ? "text-amber-600 font-semibold" : "text-gray-600"
              }`}
            >
              <Icon size={isHome ? 24 : 20} strokeWidth={isHome ? 2.2 : 2} />
              <span className={isHome ? "font-semibold" : "font-medium"}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
