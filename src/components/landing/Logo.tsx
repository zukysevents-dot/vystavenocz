import { Link } from "@tanstack/react-router";
import logo from "@/assets/fakturio-logo.png";

interface LogoProps {
  variant?: "full" | "mark";
  className?: string;
}

export function Logo({ variant = "full", className = "" }: LogoProps) {
  if (variant === "mark") {
    return (
      <img
        src={logo}
        alt="Fakturio.cz"
        width={36}
        height={36}
        className={`h-9 w-9 ${className}`}
      />
    );
  }
  return (
    <Link to="/" className={`flex items-center gap-2 ${className}`}>
      <img src={logo} alt="" width={36} height={36} className="h-9 w-9" />
      <span className="text-lg font-bold tracking-tight text-foreground">
        Fakturio<span className="text-primary">.cz</span>
      </span>
    </Link>
  );
}
