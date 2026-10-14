/**
 * Shared entrance-motion system tokens and utilities.
 * Follows the entrance-motion specification exactly:
 *
 * TOKENS:
 * - Duration: 100ms
 * - Easing: cubic-bezier(.16, 1, .3, 1)
 * - Properties: opacity and transform ONLY
 * - Initial transform: translate3d(0, 20px, 0)
 * - Final transform: translate3d(0, 0, 0)
 * - Inter-item gap: 0ms. Next item starts duration / 3 after current starts (derived, not hard-coded).
 * - Close/exit for transient surfaces: 66ms, cubic-bezier(.4, 0, 1, 1), translate3d(0, 8px, 0), no stagger.
 */

export const MOTION_DURATION_MS = 100;
export const MOTION_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const MOTION_TRANSFORM_INITIAL = 'translate3d(0, 20px, 0)';
export const MOTION_TRANSFORM_FINAL = 'translate3d(0, 0, 0)';

export const TRANSIENT_EXIT_DURATION_MS = 66;
export const TRANSIENT_EXIT_EASING = 'cubic-bezier(0.4, 0, 1, 1)';
export const TRANSIENT_EXIT_TRANSFORM = 'translate3d(0, 8px, 0)';

/**
 * Checks if reduced motion is preferred via system or DOM flags.
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return true;
  }
  const doc = document.documentElement;
  if (doc.getAttribute('data-motion') === 'off' || doc.classList.contains('motion-reduced')) {
    return true;
  }
  return false;
}

/**
 * Computes delays for `count` items with given `duration`.
 * Inter-item gap is derived from duration / 3.
 * Delay of item i = (i * duration) / 3; zero delays when motion is reduced.
 *
 * @param count Number of items in entrance queue
 * @param duration Duration of entrance motion in ms (defaults to 100ms)
 * @param isReduced Optional override or explicit flag for reduced motion
 */
export function computeDelays(
  count: number,
  duration: number = MOTION_DURATION_MS,
  isReduced?: boolean
): number[] {
  if (count <= 0) return [];
  const reduced =
    isReduced !== undefined
      ? isReduced
      : typeof window !== 'undefined'
      ? isReducedMotionPreferred()
      : false;

  if (reduced) {
    return new Array(count).fill(0);
  }

  const delays: number[] = [];
  for (let i = 0; i < count; i++) {
    delays.push((i * duration) / 3);
  }
  return delays;
}

/**
 * Collects meaningful units within container in strict DOM order.
 * Meaningful units: page header, section headings, cards, rows, toolbars,
 * article sections, tables, callouts, action groups.
 * Excludes elements with data-motion-ignore or inside [data-motion-ignore].
 */
export function collectMeaningfulUnits(root: HTMLElement): HTMLElement[] {
  if (!root) return [];

  // Query explicit units first
  const explicitUnits = Array.from(root.querySelectorAll<HTMLElement>('[data-motion-unit]'));

  // Also collect semantic blocks and cards
  const semanticBlocks = Array.from(
    root.querySelectorAll<HTMLElement>(
      'header, main > div > section, main > div > header, .ui-card, article, table, [role="toolbar"], .task-box'
    )
  );

  const combined = Array.from(new Set([...explicitUnits, ...semanticBlocks]));

  const filtered = combined.filter((el) => {
    // Opt-out check
    if (el.hasAttribute('data-motion-ignore') || el.closest('[data-motion-ignore]')) {
      return false;
    }
    // Already seen check
    if (el.getAttribute('data-motion-seen') === 'true') {
      return false;
    }
    // Hidden element check
    if (el.offsetWidth === 0 && el.offsetHeight === 0 && !el.getClientRects().length) {
      return false;
    }
    return true;
  });

  // Sort strictly by DOM order
  filtered.sort((a, b) => {
    return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
  });

  return filtered;
}

/**
 * Initializes atomic entrance-motion on a container.
 * - Visible by default if JS/setup fails.
 * - Synchronized with double requestAnimationFrame.
 * - Above-the-fold units staggered in DOM order.
 * - Below-the-fold units registered with IntersectionObserver.
 * - Returns cleanup function.
 */
export function initEntranceMotion(container: HTMLElement): () => void {
  if (typeof window === 'undefined' || !container) {
    return () => {};
  }

  const isReduced = isReducedMotionPreferred();
  if (isReduced) {
    document.documentElement.classList.remove('motion-enabled');
    return () => {};
  }

  let raf1: number | null = null;
  let raf2: number | null = null;
  let observer: IntersectionObserver | null = null;
  const timeoutIds: number[] = [];

  try {
    // Flag HTML as motion-enabled only after JS confirms support
    document.documentElement.classList.add('motion-enabled');

    // Synchronize atomically with double requestAnimationFrame
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try {
          const units = collectMeaningfulUnits(container);
          if (units.length === 0) return;

          const windowHeight = window.innerHeight || document.documentElement.clientHeight;
          const aboveTheFold: HTMLElement[] = [];
          const belowTheFold: HTMLElement[] = [];

          for (const el of units) {
            const rect = el.getBoundingClientRect();
            if (rect.top < windowHeight && rect.bottom > 0) {
              aboveTheFold.push(el);
            } else {
              belowTheFold.push(el);
            }
          }

          // 1. Animate above-the-fold units with staggered delays
          if (aboveTheFold.length > 0) {
            const delays = computeDelays(aboveTheFold.length, MOTION_DURATION_MS, false);
            aboveTheFold.forEach((el, index) => {
              el.setAttribute('data-motion-state', 'pending');
              const delay = Math.round(delays[index]);

              // Force reflow before entering state
              void el.offsetWidth;

              el.style.transitionDelay = `${delay}ms`;
              el.setAttribute('data-motion-state', 'entering');

              const cleanup = () => {
                el.removeAttribute('data-motion-state');
                el.style.transitionDelay = '';
                el.setAttribute('data-motion-seen', 'true');
              };

              const tid = window.setTimeout(cleanup, delay + MOTION_DURATION_MS + 60);
              timeoutIds.push(tid);
            });
          }

          // 2. Queue below-the-fold units with IntersectionObserver
          if (belowTheFold.length > 0 && 'IntersectionObserver' in window) {
            belowTheFold.forEach((el) => {
              el.setAttribute('data-motion-state', 'pending');
            });

            observer = new IntersectionObserver(
              (entries) => {
                const intersecting = entries
                  .filter((entry) => entry.isIntersecting && !entry.target.hasAttribute('data-motion-seen'))
                  .map((entry) => entry.target as HTMLElement);

                if (intersecting.length === 0) return;

                // Sort by document order when several callbacks arrive together
                intersecting.sort((a, b) =>
                  a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
                );

                const batchDelays = computeDelays(intersecting.length, MOTION_DURATION_MS, false);

                intersecting.forEach((el, idx) => {
                  observer?.unobserve(el);
                  const delay = Math.round(batchDelays[idx]);

                  void el.offsetWidth;
                  el.style.transitionDelay = `${delay}ms`;
                  el.setAttribute('data-motion-state', 'entering');

                  const cleanup = () => {
                    el.removeAttribute('data-motion-state');
                    el.style.transitionDelay = '';
                    el.setAttribute('data-motion-seen', 'true');
                  };

                  const tid = window.setTimeout(cleanup, delay + MOTION_DURATION_MS + 60);
                  timeoutIds.push(tid);
                });
              },
              { threshold: 0.05, rootMargin: '0px 0px 50px 0px' }
            );

            belowTheFold.forEach((el) => observer?.observe(el));
          } else if (belowTheFold.length > 0) {
            // Fallback if IntersectionObserver unavailable
            belowTheFold.forEach((el) => {
              el.removeAttribute('data-motion-state');
              el.setAttribute('data-motion-seen', 'true');
            });
          }
        } catch (innerErr) {
          console.error('Error during motion registration:', innerErr);
          document.documentElement.classList.remove('motion-enabled');
        }
      });
    });

    return () => {
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
      if (observer) observer.disconnect();
      timeoutIds.forEach((id) => clearTimeout(id));
    };
  } catch (err) {
    console.error('Motion initialization failed, revealing content:', err);
    document.documentElement.classList.remove('motion-enabled');
    return () => {};
  }
}

/**
 * Route prefetching utility for lazy-loaded route chunks on hover/focus.
 * Prevents blank flashes and spinner stalls during route swaps.
 */
export function prefetchRoute(path: string): void {
  try {
    if (path.startsWith('/documents/')) {
      import('../pages/DocumentDetailPage');
    } else if (path.startsWith('/knowledge/')) {
      import('../pages/KnowledgeDetailPage');
    } else if (path.startsWith('/graph')) {
      import('../pages/GraphPage');
    } else if (path.startsWith('/for-agents') || path.startsWith('/connections')) {
      import('../pages/ConnectionsPage');
    } else if (path.startsWith('/library')) {
      import('../pages/LibraryPage');
    } else if (path.startsWith('/collections')) {
      import('../pages/CollectionsIndexPage');
      import('../pages/CollectionPage');
    } else if (path.startsWith('/search')) {
      import('../pages/SearchPage');
    }
  } catch {
    // Non-blocking prefetch failure
  }
}

