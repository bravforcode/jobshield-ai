"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";

export function LangToggle() {
  const [lang, setLang] = React.useState<"en" | "th">("en");
  React.useEffect(() => {
    const v = localStorage.getItem("jobshield-lang") as "en" | "th" | null;
    if (v) setLang(v);
  }, []);
  function toggle() {
    const next = lang === "en" ? "th" : "en";
    setLang(next);
    localStorage.setItem("jobshield-lang", next);
    document.documentElement.lang = next === "th" ? "th" : "en";
  }
  return (
    <Button variant="ghost" size="sm" onClick={toggle} aria-label="Toggle language">
      {lang === "en" ? "EN / TH" : "TH / EN"}
    </Button>
  );
}
