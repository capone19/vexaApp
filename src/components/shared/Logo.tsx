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
  const colorClasses = {
    primary: "text-primary",
    dark: "text-foreground",
    light: "text-white",
  };

  const fillColors = {
    primary: "#2563EB",
    dark: "#111827",
    light: "#FFFFFF",
  };

  const currentColor = fillColors[color];

  if (variant === "icon") {
    // Isotipo: Geometric X - represents connection, flow intersection, growth
    return (
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("h-8 w-8", className)}
        aria-label="VEXA"
      >
        {/* Geometric X with distinctive intersection */}
        <path
          d="M6 6L14.5 16L6 26H10.5L16 19L21.5 26H26L17.5 16L26 6H21.5L16 13L10.5 6H6Z"
          fill={currentColor}
        />
        {/* Center accent - connection point */}
        <circle
          cx="16"
          cy="16"
          r="2.5"
          fill={color === "light" ? "#2563EB" : "#FFFFFF"}
        />
      </svg>
    );
  }

  // Full wordmark: VEXA
  return (
    <svg
      viewBox="0 0 120 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-auto", className)}
      aria-label="VEXA"
    >
      {/* V */}
      <path
        d="M0 6H5.5L12 22L18.5 6H24L15 28H9L0 6Z"
        fill={currentColor}
      />
      {/* E */}
      <path
        d="M28 6H46V10.5H33.5V14.5H44V19H33.5V23.5H46V28H28V6Z"
        fill={currentColor}
      />
      {/* X - Distinctive design with geometric intersection */}
      <path
        d="M52 6L60.5 16L52 26H57.5L63 19L68.5 26H74L65.5 16L74 6H68.5L63 13L57.5 6H52Z"
        fill={currentColor}
      />
      {/* X center accent */}
      <circle
        cx="63"
        cy="16"
        r="2"
        fill={color === "light" ? "#2563EB" : "#FFFFFF"}
      />
      {/* A */}
      <path
        d="M78 28L89 6H95L106 28H100L97.5 22H86.5L84 28H78ZM88.5 17.5H95.5L92 9L88.5 17.5Z"
        fill={currentColor}
      />
    </svg>
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

