export interface DocsPageState {
  loading: boolean;
  error: string | null;
}

export interface UseDocsPageStateResult {
  loading: boolean;
  error: string | null;
  retry: () => void;
}
