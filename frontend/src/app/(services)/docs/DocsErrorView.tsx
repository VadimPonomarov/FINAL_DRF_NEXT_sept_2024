"use client";

import React from "react";

interface DocsErrorViewProps {
  error: string;
  onRetry: () => void;
}

export const DocsErrorView: React.FC<DocsErrorViewProps> = ({ error, onRetry }) => (
  <div className="w-full h-[calc(100vh-120px)] mt-[50px] mb-5 flex items-center justify-center bg-background">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="text-6xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-foreground mb-4">Documentation Unavailable</h2>
      <p className="text-muted-foreground mb-6">
        Unable to load API documentation. The backend server may be unavailable.
      </p>

      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
        <p className="text-destructive text-sm">
          <strong>Error:</strong> {error}
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={onRetry}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
        >
          Retry
        </button>

        <div className="text-sm text-muted-foreground">
          <p>Alternative options:</p>
          <a
            href="http://localhost:8000/api/doc/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            Direct Django Swagger UI
          </a>
        </div>
      </div>
    </div>
  </div>
);
