"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",            label: "Dashboard" },
  { href: "/sklad",       label: "Sklad" },
  { href: "/sarze",       label: "Šarže" },
  { href: "/vyroba",      label: "Výroba" },
  { href: "/receptury",   label: "Receptury" },
  { href: "/polozky",     label: "Položky" },
  { href: "/dodavatele",  label: "Dodavatelé" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-1">
          <span className="mr-4 font-bold text-gray-900 text-sm tracking-tight">
            Šarže Manager
          </span>
          <nav className="flex gap-1 overflow-x-auto">
            {links.map((l) => {
              const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
