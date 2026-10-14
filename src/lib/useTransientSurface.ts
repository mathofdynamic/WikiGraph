import { useState, useEffect, useCallback } from 'react';
import {
  TRANSIENT_EXIT_DURATION_MS,
  isReducedMotionPreferred,
} from '../shared/motion';

/**
 * Hook to manage transient surface entrance and exit states.
 * Guarantees the contract:
 * - Entrance: 100ms, cubic-bezier(.16, 1, .3, 1), opacity and transform only
 * - Exit: 66ms, cubic-bezier(.4, 0, 1, 1), translate3d(0, 8px, 0), no stagger
 */
export function useTransientSurface(
  isOpen: boolean,
  onClose: () => void,
  exitDurationMs: number = TRANSIENT_EXIT_DURATION_MS
) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      setIsClosing(true);
      const isReduced = isReducedMotionPreferred();
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, isReduced ? 0 : exitDurationMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isRendered, exitDurationMs]);

  const requestClose = useCallback(() => {
    if (isClosing) return;
    const isReduced = isReducedMotionPreferred();
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsRendered(false);
      setIsClosing(false);
    }, isReduced ? 0 : exitDurationMs);
  }, [isClosing, onClose, exitDurationMs]);

  return {
    isRendered,
    isClosing,
    requestClose,
  };
}
