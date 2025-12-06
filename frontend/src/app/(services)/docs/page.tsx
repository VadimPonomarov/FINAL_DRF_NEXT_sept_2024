"use client";

import DocumentsFrame from "@/components/Documents/DocumentsFrame";
import { useDocsPageState } from "./useDocsPageState";
import { DocsLoadingView } from "./DocsLoadingView";
import { DocsErrorView } from "./DocsErrorView";

const DocsPage = () => {
  const { loading, error, retry } = useDocsPageState();

  if (loading) {
    return <DocsLoadingView />;
  }

  if (error) {
    return <DocsErrorView error={error} onRetry={retry} />;
  }

  return <DocumentsFrame />;
};

export default DocsPage;