"use client";

import { useState, useEffect } from 'react';
import DocumentsFrame from "@/components/Documents/DocumentsFrame";

const DocsPage = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Простая проверка доступности
    const checkAvailability = async () => {
      try {
        console.log('[DocsPage] Checking availability...');

        // Проверяем доступность API
        const response = await fetch('/api/backend-health', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Backend health check failed: ${response.status}`);
        }

        const result = await response.json();
        console.log('[DocsPage] Health check result:', result);

        setLoading(false);
      } catch (error: any) {
        console.error('[DocsPage] Error:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    checkAvailability();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-120px)] mt-[50px] mb-5 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-foreground">Loading API documentation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
              onClick={() => window.location.reload()}
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
  }

  return <DocumentsFrame />;
};

export default DocsPage;