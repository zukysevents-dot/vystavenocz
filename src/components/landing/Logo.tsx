import { Link } from "@tanstack/react-router";
import wordmark from "@/assets/vystaveno-logo.png";
import icon from "@/assets/vystaveno-icon.png";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
}

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "mark") {
    return (
      <img
        src={icon}
        alt="Vystaveno.cz"
        width={36}
        height={36}
        className={`h-9 w-9 rounded-lg ${className}`}
      />
    );
  }
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`} aria-label="Vystaveno.cz">
      <img
        src={icon}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 rounded-lg"
      />
      <span className="text-lg font-bold tracking-tight text-foreground">
        Vystaveno<span className="text-primary">.cz</span>
      </span>
    </Link>
  );
}
