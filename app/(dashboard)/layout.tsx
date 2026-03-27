"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, FileText, Users, Mail, Settings, BellRing, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Facturas",  href: "/invoices",  icon: FileText },
  { label: "Clientes",  href: "/clients",   icon: Users },
  { label: "Emails",    href: "/emails",    icon: Mail },
  { label: "Ajustes",   href: "/settings",  icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUserName(payload.sub ?? "");
    } catch {
      localStorage.removeItem("access_token");
      router.replace("/login");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("access_token");
    router.replace("/login");
  }

  const initials = userName
    ? userName.split("@")[0].slice(0, 2).toUpperCase()
    : "??";

  return (
    <>
    <div className="md:hidden flex items-center justify-center min-h-screen bg-gray-50 p-8 text-center">
      <div>
        <p className="text-2xl mb-4">💻</p>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          PayRemind works best on desktop
        </h2>
        <p className="text-sm text-gray-500">
          Please open PayRemind on your computer for the best experience.
        </p>
      </div>
    </div>
    <div className="hidden md:flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <BellRing className="h-4 w-4 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">PayRemind</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom logout */}
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-150"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 shadow-sm flex items-center justify-end px-6 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 hidden sm:block">{userName}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold select-none">
              {initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
    </>
  );
}
