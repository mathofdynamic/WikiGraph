import React from 'react';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  as?: React.ElementType;
  className?: string;
}

/**
 * Universal layout container component.
 * Constrains content to the single canonical max-width (--container: 72rem)
 * with uniform horizontal padding across breakpoints (16px mobile, 24px sm+).
 */
export const Container: React.FC<ContainerProps> = ({
  children,
  as: Component = 'div',
  className = '',
  ...props
}) => {
  return (
    <Component
      className={`w-full max-w-[var(--container,72rem)] mx-auto px-4 sm:px-6 ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};
