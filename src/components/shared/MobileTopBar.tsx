"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "./LogoutButton";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/interns", label: "Interns" },
  { href: "/scores", label: "Scores" },
  { href: "/reports", label: "Reports" },
];

export default function MobileTopBar() {
  const [open, setOpen] = useState(false);

  return (
    <div className="d-md-none border-bottom bg-white">
      <div className="d-flex align-items-center justify-content-between p-3">
        <span className="fw-bold">Intern Scoreboard</span>
        <button
          className="btn btn-outline-secondary btn-sm"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>
      {open && (
        <div className="p-3 pt-0 d-flex flex-column gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="sidebar-link"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <LogoutButton />
        </div>
      )}
    </div>
  );
}
