"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/recommend", label: "Recommender" },
  { href: "/wage-radar", label: "Wage radar" },
  { href: "/mechanism", label: "Mechanism" },
];

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <Menu />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-background/80 backdrop-blur"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r bg-card p-6 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-semibold">Menu</span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X />
              </Button>
            </div>
            <nav className="flex flex-col gap-1">
              {LINKS.map((l) => (
                <Button
                  key={l.href}
                  variant="ghost"
                  asChild
                  className="justify-start"
                  onClick={() => setOpen(false)}
                >
                  <Link href={l.href}>{l.label}</Link>
                </Button>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
