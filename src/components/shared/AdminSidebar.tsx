"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/interns", label: "Interns", icon: "🧑‍💻" },
  { href: "/reports", label: "Reports", icon: "📄" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="d-none d-md-flex flex-column border-end bg-white p-3"
      style={{ width: 240, minHeight: "100vh" }}
    >
      <div className="fw-bold fs-5 mb-4 px-2">Intern Scoreboard</div>

      <nav className="d-flex flex-column gap-1 flex-grow-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname?.startsWith(item.href) ? "active" : ""}`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="pt-3 border-top">
        <LogoutButton />
      </div>
    </aside>
  );
}
