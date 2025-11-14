interface StatGridProps {
  children: React.ReactNode;
  columns?: {
    base?: number;
    md?: number;
    lg?: number;
  };
  gapClass?: string;
  testIdPrefix?: string;
  className?: string;
}

export function StatGrid({ 
  children, 
  columns = { base: 1, md: 2, lg: 4 },
  gapClass = "gap-4",
  className = "",
}: StatGridProps) {
  const getColsClass = () => {
    const baseClass = `grid-cols-${columns.base || 1}`;
    const mdClass = columns.md ? ` md:grid-cols-${columns.md}` : "";
    const lgClass = columns.lg ? ` lg:grid-cols-${columns.lg}` : "";
    return `grid ${baseClass}${mdClass}${lgClass} ${gapClass}`;
  };

  return (
    <div className={`${getColsClass()} ${className}`}>
      {children}
    </div>
  );
}
