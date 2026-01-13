import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "icon";
  color?: "primary" | "dark" | "light";
  className?: string;
}

/**
 * VEXA Logo Component
 * 
 * Wordmark: "VEXA" with distinctive X design
 * Icon: Geometric X derived from the wordmark
 * 
 * Usage:
 * - variant="full" - Complete wordmark "VEXA"
 * - variant="icon" - Only the X isotipo
 */
export function Logo({ variant = "full", color = "primary", className }: LogoProps) {
  const filterStyle = color === "light" ? "brightness(0) invert(1)" : "none";

  if (variant === "icon") {
    // Isotipo: Solo la X del logo
    return (
      <img
        src="/logo-x-vexa.png"
        alt="VEXA"
        className={cn("h-6 w-auto object-contain", className)}
        style={{ filter: filterStyle }}
      />
    );
  }

  // Full wordmark: VEXA
  return (
    <img
      src="/vexa-logo.png"
      alt="VEXA"
      className={cn("h-8 w-auto object-contain", className)}
      style={{ filter: filterStyle }}
    />
  );
}

/**
 * VEXA Logo with container background
 * Used for favicon-style presentations or app icons
 */
export function LogoMark({ 
  background = "primary",
  className 
}: { 
  background?: "primary" | "white" | "muted";
  className?: string;
}) {
  const bgClasses = {
    primary: "bg-primary",
    white: "bg-white border border-border",
    muted: "bg-slate-200 border border-slate-300",
  };

  const iconColor = {
    primary: "light" as const,
    white: "primary" as const,
    muted: "dark" as const,
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-lg",
        bgClasses[background],
        className
      )}
    >
      <Logo 
        variant="icon" 
        color={iconColor[background]} 
        className="h-6 w-6"
      />
    </div>
  );
}

export default Logo;

