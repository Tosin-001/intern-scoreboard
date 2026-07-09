"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/shared/AdminSidebar";
import MobileTopBar from "@/components/shared/MobileTopBar";

// Route protection: src/middleware.ts (redirect-only, UX layer) + per-page
// verifySession() calls (the real auth boundary). The sidebar only makes
// sense once authenticated, so it's skipped on /login — everything else
// under (admin) gets the full dashboard chrome.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div style={{ minHeight: "100vh" }}>{children}</div>;
  }

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <AdminSidebar />
      <div className="flex-grow-1 d-flex flex-column">
        <MobileTopBar />
        <div className="flex-grow-1">{children}</div>
      </div>
    </div>
  );
}
