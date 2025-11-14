import { ReactNode } from "react";

interface ResponsiveSplitProps {
  start: ReactNode;
  end: ReactNode;
  reverseOnMobile?: boolean;
  startMinHeight?: string;
  endMinHeight?: string;
  collapseBelow?: "md" | "lg";
  gutterClass?: string;
  stickyHeaderSlot?: ReactNode;
  className?: string;
}

export function ResponsiveSplit({
  start,
  end,
  reverseOnMobile = false,
  startMinHeight = "min-h-0",
  endMinHeight = "min-h-0",
  collapseBelow = "lg",
  gutterClass = "gap-4",
  stickyHeaderSlot,
  className = "",
}: ResponsiveSplitProps) {
  const breakpoint = collapseBelow === "md" ? "md" : "lg";
  const flexClass = `flex flex-col ${breakpoint}:flex-row ${gutterClass}`;
  const orderClass = reverseOnMobile ? "flex-col-reverse" : "flex-col";

  return (
    <div className={className}>
      {stickyHeaderSlot}
      <div className={`${flexClass} ${reverseOnMobile ? `${orderClass} ${breakpoint}:flex-row` : ""}`}>
        <div className={`flex-shrink-0 ${startMinHeight} ${breakpoint === "md" ? "md:w-1/3" : "lg:w-1/3"}`}>
          {start}
        </div>
        <div className={`flex-1 ${endMinHeight}`}>
          {end}
        </div>
      </div>
    </div>
  );
}
