import { Shield } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <Shield className="size-4" aria-hidden />
            </span>
            <span>JobShield</span>
            <Badge variant="signal" className="ml-1 hidden sm:inline-flex">
              v2
            </Badge>
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Overview</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/recommend">Recommender</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/mechanism">Mechanism</Link>
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <a href="https://github.com/bravforcode/jobshield-ai" target="_blank" rel="noreferrer">
              GitHub
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
