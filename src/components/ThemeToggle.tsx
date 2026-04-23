import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "sm" | "md";
};

export function ThemeToggle({ className, size = "md" }: Props) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const dim = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const icon = size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Přepnout na světlý režim" : "Přepnout na tmavý režim"}
      title={isDark ? "Světlý režim" : "Tmavý režim"}
      className={cn(
        "relative inline-flex items-center justify-center rounded-full",
        "border border-border bg-background/60 text-foreground",
        "transition-all duration-200 hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        dim,
        className,
      )}
    >
      <Sun
        className={cn(
          icon,
          "absolute transition-all duration-300",
          isDark ? "scale-0 -rotate-90 opacity-0" : "scale-100 rotate-0 opacity-100",
        )}
      />
      <Moon
        className={cn(
          icon,
          "absolute transition-all duration-300",
          isDark ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0",
        )}
      />
    </button>
  );
}
