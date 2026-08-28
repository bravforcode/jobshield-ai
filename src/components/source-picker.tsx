"use client";

import { Loader2, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { Occupation } from "@/lib/types";
import { formatThb } from "@/lib/utils";

interface Props {
  occupations: Occupation[];
  selected: string;
  onChange?: (code: string) => void;
}

export function SourcePicker({ occupations, selected, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const current = occupations.find((o) => o.code === selected) ?? occupations[0];

  function pick(code: string) {
    setOpen(false);
    if (onChange) {
      onChange(code);
    } else {
      const params = new URLSearchParams(searchParams);
      params.set("source", code);
      router.push(`?${params.toString()}`, { scroll: false });
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="h-11 w-full justify-between gap-3 sm:w-[420px]"
            >
              {current ? (
                <div className="flex min-w-0 flex-1 flex-col items-start text-left">
                  <span className="truncate text-sm font-semibold">{current.label}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {current.code} · {formatThb(current.wage.median)} · risk{" "}
                    {(current.risk * 100).toFixed(0)}%
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground">Pick a starting job…</span>
              )}
              <Search className="size-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[420px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search 18 occupations…" />
              <CommandList className="max-h-[420px]">
                <CommandEmpty>No occupation found.</CommandEmpty>
                <CommandGroup heading="Thai labour market · mock dataset">
                  {occupations.map((o) => (
                    <CommandItem
                      key={o.code}
                      value={`${o.label} ${o.code}`}
                      onSelect={() => pick(o.code)}
                      className="flex flex-col items-start gap-0.5 py-2"
                    >
                      <span className="text-sm font-medium">{o.label}</span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {o.code} · {formatThb(o.wage.median)} · {(o.risk * 100).toFixed(0)}% risk
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
      {current && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="font-mono">
            {current.code}
          </Badge>
          <span>·</span>
          <span>
            centrality{" "}
            <span className="font-mono text-foreground">
              {current.degree_centrality.toFixed(2)}
            </span>
          </span>
          <span>·</span>
          <span>
            wage gap{" "}
            <span
              className="font-mono"
              style={{ color: current.underpayment_gap > 0.05 ? "var(--primary)" : undefined }}
            >
              {current.underpayment_gap > 0 ? "+" : ""}
              {(current.underpayment_gap * 100).toFixed(1)}%
            </span>
          </span>
          <span>·</span>
          <span>
            category{" "}
            <Badge variant="outline" className="ml-1 text-[10px]">
              {current.category}
            </Badge>
          </span>
        </div>
      )}
    </div>
  );
}

export function PickerSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-11 w-[420px] items-center gap-2 rounded-md border border-input px-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading occupations…
      </div>
    </div>
  );
}
