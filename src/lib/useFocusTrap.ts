import { useEffect } from 'react';

/**
 * Traps keyboard focus within containerRef when isOpen is true,
 * and calls onEscape when the user presses Escape.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onEscape?: () => void
): void {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const container = containerRef.current;

    // Find all focusable elements inside container
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Set initial focus to first focusable element
    const initialElements = container.querySelectorAll<HTMLElement>(focusableSelector);
    if (initialElements.length > 0) {
      initialElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
        return;
      }

      if (e.key === 'Tab') {
        const elements = container.querySelectorAll<HTMLElement>(focusableSelector);
        if (elements.length === 0) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onEscape, containerRef]);
}
