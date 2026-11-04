import React from "react";
import { clsx } from "clsx";

interface BrutalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "cream" | "pink" | "white" | "lime" | "cobalt";
  shadow?: "sm" | "default" | "lg" | "xl" | "none";
  className?: string;
}

export function BrutalCard({
  children,
  variant = "cream",
  shadow = "default",
  className,
  ...props
}: BrutalCardProps) {
  const variantStyles = {
    cream: "bg-cream text-pitch",
    pink: "bg-blush text-pitch",
    white: "bg-white text-pitch",
    lime: "bg-lime text-pitch",
    cobalt: "bg-cobalt text-white",
  };

  const shadowStyles = {
    sm: "shadow-brutal-sm",
    default: "shadow-brutal",
    lg: "shadow-brutal-lg",
    xl: "shadow-brutal-xl",
    none: "",
  };

  return (
    <div
      className={clsx(
        "border-3 border-pitch p-6 relative",
        variantStyles[variant],
        shadowStyles[shadow],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

