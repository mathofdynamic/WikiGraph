import React from 'react';

export interface PageGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  as?: React.ElementType;
  className?: string;
}

/**
 * Standard 12-column grid container.
 * Features constant gaps: 16px mobile (gap-4) / 24px desktop (gap-6).
 * Automatically flows in logical start-to-end direction (mirrors naturally in RTL Persian).
 */
export const PageGrid: React.FC<PageGridProps> = ({
  children,
  as: Component = 'div',
  className = '',
  ...props
}) => {
  return (
    <Component
      className={`grid grid-cols-12 gap-4 md:gap-6 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export interface PageColProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  as?: React.ElementType;
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  desktopSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  className?: string;
}

/**
 * Pre-configured column span helper classes.
 */
export const GRID_COLS = {
  /** Reading main column (Cols 1-8 on desktop, full-width on mobile) */
  main: 'col-span-12 lg:col-span-8',
  /** Reading side panel (Cols 9-12 on desktop, stacks below on mobile) */
  aside: 'col-span-12 lg:col-span-4',
  /** Full container width (Cols 1-12) */
  full: 'col-span-12',
  /** Half width (Cols 1-6 or 7-12 on desktop) */
  half: 'col-span-12 md:col-span-6',
  /** Third width (4 columns) */
  third: 'col-span-12 md:col-span-4',
  /** Two-thirds width (8 columns) */
  twoThirds: 'col-span-12 md:col-span-8',
} as const;

export const PageCol: React.FC<PageColProps> = ({
  children,
  as: Component = 'div',
  span = 12,
  desktopSpan,
  className = '',
  ...props
}) => {
  const spanClass = `col-span-${span}`;
  const desktopSpanClass = desktopSpan ? `lg:col-span-${desktopSpan}` : '';
  return (
    <Component
      className={`${spanClass} ${desktopSpanClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
};
