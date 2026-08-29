"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { Occupation } from "@/lib/types";

export function CommandPalette({ occupations }: { occupations: Occupation[] }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="hidden gap-2 md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <Search className="size-3.5" />
        <span className="text-xs">Search</span>
        <kbd className="ml-2 hidden rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-background/60 backdrop-blur"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg rounded-xl border bg-popover shadow-xl">
        <Command>
          <CommandInput placeholder="Jump to occupation…" />
          <CommandList className="max-h-[320px]">
            <CommandEmpty>No occupation found.</CommandEmpty>
            <CommandGroup heading="Occupations">
              {occupations.map((o) => (
                <CommandItem
                  key={o.code}
                  value={`${o.label} ${o.code}`}
                  onSelect={() => {
                    setOpen(false);
                    router.push(`/recommend?source=${o.code}`);
                  }}
                >
                  <span className="text-sm">{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandGroup heading="Pages">
              <CommandItem
                value="overview"
                onSelect={() => {
                  setOpen(false);
                  router.push("/");
                }}
              >
                Overview
              </CommandItem>
              <CommandItem
                value="recommender"
                onSelect={() => {
                  setOpen(false);
                  router.push("/recommend");
                }}
              >
                Recommender
              </CommandItem>
              <CommandItem
                value="wage radar"
                onSelect={() => {
                  setOpen(false);
                  router.push("/wage-radar");
                }}
              >
                Wage radar
              </CommandItem>
              <CommandItem
                value="mechanism"
                onSelect={() => {
                  setOpen(false);
                  router.push("/mechanism");
                }}
              >
                Mechanism
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </div>
    </div>
  );
}
