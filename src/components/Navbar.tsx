"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { GraduationCap, ChevronLeft, ChevronRight, Home, FileText, LogOut, HelpCircle } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { getToken, logout } from "@/lib/api";

/**
 * La Navbar espone due frecce (precedente/successiva) SOLO nella pagina di
 * simulazione. Comunica con la pagina della simulazione tramite eventi
 * custom sul window, cosi' non serve un context provider dedicato.
 */
export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const inSimulation = pathname === "/simulazione";
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(Boolean(getToken()));
  }, [pathname]);

  function emit(name: string) {
    window.dispatchEvent(new CustomEvent(name));
  }

  function handleLogout() {
    logout();
    setLoggedIn(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-white">
            <GraduationCap size={20} strokeWidth={2.25} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-brand-900">
            Concorso <span className="text-brand-500">PRO</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/" icon={<Home size={16} />} label="Home" active={pathname === "/"} />
          <NavLink
            href="/simulazioni"
            icon={<FileText size={16} />}
            label="Simulazioni"
            active={pathname?.startsWith("/simulazioni") || pathname === "/simulazione"}
          />
          <NavLink
            href="/help"
            icon={<HelpCircle size={16} />}
            label="Aiuto"
            active={pathname?.startsWith("/help")}
          />
        </nav>

        <div className="flex items-center gap-2">
          {inSimulation && (
            <>
              <button
                onClick={() => emit("concorsopro:prev-question")}
                aria-label="Domanda precedente"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-white text-brand-700 transition hover:bg-brand-50 active:scale-95 dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-brand-500/15"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={() => emit("concorsopro:next-question")}
                aria-label="Domanda successiva"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-white text-brand-700 transition hover:bg-brand-50 active:scale-95 dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-brand-500/15"
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}
          {loggedIn && (
            <button
              onClick={handleLogout}
              aria-label="Esci"
              title="Esci"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-white text-slate-500 transition hover:bg-surface-light hover:text-brand-700 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-brand-500/15"
            >
              <LogOut size={18} />
            </button>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Nav mobile compatta */}
      <nav className="flex items-center justify-around border-t border-surface-border py-1.5 sm:hidden">
        <NavLink href="/" icon={<Home size={16} />} label="Home" active={pathname === "/"} compact />
        <NavLink
          href="/simulazioni"
          icon={<FileText size={16} />}
          label="Simulazioni"
          active={pathname?.startsWith("/simulazioni") || pathname === "/simulazione"}
          compact
        />
        <NavLink
          href="/help"
          icon={<HelpCircle size={16} />}
          label="Aiuto"
          active={pathname?.startsWith("/help")}
          compact
        />
      </nav>
    </header>
  );
}

function NavLink({
  href,
  icon,
  label,
  active,
  compact,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition ${
        compact ? "flex-col text-[11px] px-2" : ""
      } ${
        active
          ? "bg-brand-50 text-brand-700"
          : "text-slate-500 hover:bg-surface-light hover:text-brand-700"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
