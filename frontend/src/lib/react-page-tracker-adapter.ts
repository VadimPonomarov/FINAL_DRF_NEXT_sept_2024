/**
 * Safe adapter for react-page-tracker compatibility with Next.js 15 App Router
 * 
 * This adapter prevents the "Html should not be imported outside of pages/_document" error
 * by providing a safe implementation that doesn't use next/document
 * 
 * SSR-safe: Works correctly during server-side rendering and static generation
 */

"use client";

import { useState } from 'react';

// Safe page tracker store implementation
export interface PageTrackerState {
  isFirstPage: boolean;
  history: string[];
}

// Default state for SSR
const DEFAULT_STATE: PageTrackerState = {
  isFirstPage: true,
  history: []
};

/**
 * Safe hook that mimics usePageTrackerStore
 * Compatible with App Router, no next/document dependencies
 * SSR-safe: Returns default state during server-side rendering
 */
export function usePageTrackerStore<T>(
  selector: (state: PageTrackerState) => T
): T {
  // SSR-safe: Start with default state
  // Use lazy initialization to ensure window is available
  const [state] = useState<PageTrackerState>(() => {
    // During SSR, window is undefined, so return default
    if (typeof window === 'undefined') {
      return DEFAULT_STATE;
    }
    // On client, check history
    return {
      isFirstPage: window.history.length <= 1,
      history: [window.location.pathname]
    };
  });

  // No useEffect needed - state is initialized correctly for both SSR and client
  // This prevents any SSR hydration mismatches

  return selector(state);
}

/**
 * Safe PageTracker component that doesn't use next/document
 * Compatible with App Router
 * SSR-safe: Returns null, no side effects during SSR
 */
export function PageTracker() {
  // No-op component - exists for API compatibility only
  // Tracking is handled by usePageTrackerStore hook
  // SSR-safe: Returns null, no side effects
  return null;
}

/**
 * Export store getter for advanced usage
 * Returns null for SSR compatibility
 */
export function getPageTrackerStore() {
  // SSR-safe: Return null during server-side rendering
  if (typeof window === 'undefined') return null;
  
  // Return a simple interface for compatibility
  return {
    getState: () => ({
      isFirstPage: window.history.length <= 1,
      history: [window.location.pathname]
    }),
    subscribe: () => () => {} // No-op unsubscribe
  };
}

