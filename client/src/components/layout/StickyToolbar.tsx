import { ReactNode } from "react";

interface StickyToolbarProps {
  children: ReactNode;
  className?: string;
  inset?: boolean;
  breakpoint?: "md" | "lg";
  elevateOnScroll?: boolean;
}

export function StickyToolbar({
  children,
  className = "",
  inset = false,
  elevateOnScroll = false,
}: StickyToolbarProps) {
  const stickyClass = "sticky top-0 z-40 bg-background";
  const borderClass = elevateOnScroll ? "border-b border-border" : "";
  const insetClass = inset ? "px-4 sm:px-6" : "";

  return (
    <div className={`${stickyClass} ${borderClass} ${insetClass} ${className}`}>
      {children}
    </div>
  );
}
