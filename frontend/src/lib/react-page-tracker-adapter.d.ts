/**
 * Type definitions for react-page-tracker adapter
 * Provides type-safe compatibility with react-page-tracker API
 */

export interface PageTrackerState {
  isFirstPage: boolean;
  history: string[];
}

export declare function usePageTrackerStore<T>(
  selector: (state: PageTrackerState) => T
): T;

export declare function PageTracker(): null;

export declare function getPageTrackerStore(): {
  getState(): PageTrackerState;
  subscribe(listener: (state: PageTrackerState) => void): () => void;
} | null;

