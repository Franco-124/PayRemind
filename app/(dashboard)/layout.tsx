"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Users, Mail, Settings,
  BellRing, LogOut, MessageSquare, Shield,
} from "lucide-react";
import { ThemeSelector } from "@/app/components/ui/theme-selector";

const ADMIN_EMAIL = "johan.franco@nousware.ai";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Facturas",  href: "/invoices",  icon: FileText },
  { label: "Clientes",  href: "/clients",   icon: Users },
  { label: "Emails",    href: "/emails",    icon: Mail },
  { label: "Feedback",  href: "/feedback",  icon: MessageSquare },
  { label: "Ajustes",   href: "/settings",  icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const email = payload.sub ?? "";
      setUserName(email);
      setIsAdmin(email === ADMIN_EMAIL);
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
      {/* Mobile block */}
      <div className="md:hidden flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 p-8 text-center">
        <div>
          <p className="text-2xl mb-4">💻</p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">
            PayRemind works best on desktop
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Please open PayRemind on your computer for the best experience.
          </p>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:flex h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-900 dark:bg-slate-950 flex flex-col shrink-0">
          {/* Logo */}
          <div className="px-6 py-6 flex items-center gap-2.5 border-b border-gray-800 dark:border-slate-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <BellRing className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">PayRemind</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-gray-400 hover:bg-gray-800 dark:hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {label}
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                  pathname.startsWith("/admin")
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 dark:hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Shield className="h-4 w-4 shrink-0" />
                Admin
              </Link>
            )}
          </nav>

          {/* Footer — theme + avatar + logout */}
          <div className="px-3 py-4 border-t border-gray-800 dark:border-slate-700 space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-500 mb-2 px-1">Tema</p>
              <ThemeSelector />
            </div>
            <div>
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold select-none">
                  {initials}
                </div>
                <span className="text-sm text-gray-300 truncate min-w-0">{userName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 dark:hover:bg-slate-800 transition-all duration-150"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8 min-w-0">{children}</main>
      </div>
    </>
  );
}
