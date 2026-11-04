import React from "react";
import { clsx } from "clsx";

interface BrutalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "lime" | "crimson" | "cobalt" | "white" | "cream";
  size?: "sm" | "md" | "lg";
  shadow?: "sm" | "default" | "lg";
  className?: string;
}

export function BrutalButton({
  children,
  variant = "lime",
  size = "md",
  shadow = "default",
  className,
  ...props
}: BrutalButtonProps) {
  const variantStyles = {
    lime: "bg-lime hover:bg-lime-hover text-pitch",
    crimson: "bg-crimson hover:bg-crimson-dark text-white",
    cobalt: "bg-cobalt hover:bg-cobalt-light text-white",
    white: "bg-white hover:bg-zinc-100 text-pitch",
    cream: "bg-cream hover:bg-cream-dark text-pitch",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-xs font-bold",
    md: "px-5 py-2.5 text-sm font-black uppercase tracking-wider",
    lg: "px-7 py-4 text-base font-black uppercase tracking-wider",
  };

  const shadowStyles = {
    sm: "shadow-brutal-sm",
    default: "shadow-brutal",
    lg: "shadow-brutal-lg",
  };

  return (
    <button
      className={clsx(
        "border-3 border-pitch btn-depress transition-transform inline-flex items-center justify-center gap-2 cursor-pointer font-black",
        variantStyles[variant],
        sizeStyles[size],
        shadowStyles[shadow],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

