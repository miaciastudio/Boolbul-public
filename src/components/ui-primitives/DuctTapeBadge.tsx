import React from "react";
import { clsx } from "clsx";

interface DuctTapeBadgeProps {
  children: React.ReactNode;
  rotate?: "left" | "right" | "none";
  className?: string;
}

export function DuctTapeBadge({
  children,
  rotate = "left",
  className,
}: DuctTapeBadgeProps) {
  const rotateStyles = {
    left: "-rotate-2",
    right: "rotate-2",
    none: "",
  };

  return (
    <div
      className={clsx(
        "inline-block transform",
        rotateStyles[rotate],
        className
      )}
    >
      <div className="tape-badge px-4 py-1 text-xs font-black uppercase text-pitch border-2 border-black/40">
        {children}
      </div>
    </div>
  );
}

