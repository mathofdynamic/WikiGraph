import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Container } from './Container';
import { PageGrid } from './PageGrid';

/**
 * Visual verification overlay for the 12-column shared layout grid.
 * - Activates automatically when URL contains ?grid=1
 * - Toggles interactively with the 'G' key
 * - Draws 12 semi-transparent columns with exact gutters and column indices
 * - pointer-events: none so normal interaction is unaffected
 */
export const GridOverlay: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [visible, setVisible] = useState(() => {
    return searchParams.get('grid') === '1' || window.location.search.includes('grid=1');
  });

  // Keep in sync if search param changes
  useEffect(() => {
    if (searchParams.get('grid') === '1') {
      setVisible(true);
    }
  }, [searchParams]);

  // Global 'G' key listener (ignoring input fields)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        const target = e.target as HTMLElement | null;
        if (target) {
          const tagName = target.tagName.toLowerCase();
          if (
            tagName === 'input' ||
            tagName === 'textarea' ||
            tagName === 'select' ||
            target.isContentEditable
          ) {
            return;
          }
        }
        setVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 pointer-events-none select-none overflow-hidden"
    >
      <Container className="h-full">
        <PageGrid className="h-full">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-full bg-rose-500/10 dark:bg-rose-400/10 border-x border-rose-500/20 flex flex-col justify-between py-2 text-center"
            >
              <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 opacity-90">
                {i + 1}
              </span>
              <span className="text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400 opacity-90">
                {i + 1}
              </span>
            </div>
          ))}
        </PageGrid>
      </Container>
      {/* Floating indicator badge */}
      <div className="fixed bottom-3 end-3 px-2.5 py-1 rounded-md bg-rose-950/90 text-rose-200 border border-rose-800 text-[11px] font-mono shadow-lg pointer-events-none">
        Grid Overlay: Active (Press 'G' to toggle)
      </div>
    </div>
  );
};
