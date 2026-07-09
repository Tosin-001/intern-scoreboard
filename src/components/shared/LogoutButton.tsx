"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center gap-2"
    >
      <span>🚪</span> Log out
    </button>
  );
}
