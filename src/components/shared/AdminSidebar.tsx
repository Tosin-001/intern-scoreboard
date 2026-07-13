"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import { IconDashboard, IconInterns, IconScores, IconHistory, IconReports } from "./icons";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard },
  { href: "/interns", label: "Interns", Icon: IconInterns },
  { href: "/scores", label: "Scores", Icon: IconScores },
  { href: "/history", label: "History", Icon: IconHistory },
  { href: "/reports", label: "Reports", Icon: IconReports },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="d-none d-md-flex flex-column border-end bg-white p-3"
      style={{ width: 240, minHeight: "100vh" }}
    >
      <div className="d-flex align-items-center gap-2 mb-4 px-2">
        <div
          className="d-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
          style={{
            width: 28,
            height: 28,
            backgroundColor: "var(--brand-primary)",
            color: "#fff",
            fontSize: "0.8rem",
            fontWeight: 700,
          }}
        >
          IS
        </div>
        <span className="fw-bold fs-6">Intern Scoreboard</span>
      </div>

      <div
        className="text-uppercase px-2 mb-2"
        style={{ fontSize: "var(--fs-micro)", letterSpacing: "0.06em", color: "var(--brand-text-muted)" }}
      >
        Menu
      </div>

      <nav className="d-flex flex-column gap-1 flex-grow-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname?.startsWith(item.href) ? "active" : ""}`}
          >
            <item.Icon />
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
