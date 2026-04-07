"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useTheme } from "@/context/ThemeProvider";
import type { UserRole } from "@/domain/Profile";
import { useAuth } from "@/hooks/useAuth";

import styles from "./Navbar.module.css";

interface NavItem {
  href: string;
  label: string;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    roles: ["admin", "recepcionista", "doctor"],
  },
  {
    href: "/registration",
    label: "Registro",
    roles: ["admin", "recepcionista"],
  },
  { href: "/doctor/dashboard", label: "Panel Doctor", roles: ["doctor"] },
  { href: "/admin/dashboard", label: "Métricas", roles: ["admin"] },
  { href: "/admin/profiles", label: "Gestión Operativa", roles: ["admin"] },
  { href: "/admin/audit", label: "Auditoría", roles: ["admin"] },
];

const ROLE_STYLE: Record<UserRole, string> = {
  admin: styles.roleAdmin,
  recepcionista: styles.roleRecepcionista,
  doctor: styles.roleDoctor,
};

export default function Navbar() {
  const pathname = usePathname();
  const { profile, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Hide navbar entirely when not logged in
  if (loading || !profile) return null;

  const visibleItems = NAV_ITEMS.filter((item) => {
    return item.roles.includes(profile.role);
  });

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.brand}>
        🏥 Turnos Médicos
      </Link>

      <div className={styles.nav}>
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={pathname === item.href ? "page" : undefined}
            className={`${styles.link} ${pathname === item.href ? styles.active : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className={styles.right}>
        <button
          className={styles.themeToggle}
          onClick={toggleTheme}
          aria-label={
            theme === "light" ? "Activar modo oscuro" : "Activar modo claro"
          }
          title={theme === "light" ? "Modo oscuro" : "Modo claro"}
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        <span className={styles.userName}>
          {profile.display_name ?? profile.email}
        </span>
        <span className={`${styles.roleBadge} ${ROLE_STYLE[profile.role]}`}>
          {profile.role}
        </span>
        <button className={styles.logoutBtn} onClick={logout}>
          Salir
        </button>
      </div>
    </nav>
  );
}
