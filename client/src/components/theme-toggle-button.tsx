import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { BackgroundThemeSelector } from "./background-theme-selector";

export function ThemeToggleButton() {
  const [isThemeSelectorOpen, setIsThemeSelectorOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsThemeSelectorOpen(true)}
        className="flex items-center gap-2 hover:bg-casino-gold/10 hover:border-casino-gold"
      >
        <Palette style={{width: '3.5px', height: '3.5px'}} className="" />
        <span className="hidden sm:inline">Themes</span>
      </Button>

      <BackgroundThemeSelector
        isOpen={isThemeSelectorOpen}
        onClose={() => setIsThemeSelectorOpen(false)}
      />
    </>
  );
}