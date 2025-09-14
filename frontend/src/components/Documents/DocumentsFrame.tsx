"use client";

import { FC, useState, useEffect } from "react";
import { BaseUrl } from "@/common/constants/constants";
import SwaggerUI from "./SwaggerUI";

const DocumentsFrame: FC = () => {
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean | null>(null);

  // Use Next.js API route as proxy to avoid CORS issues in Docker
  const docsUrl = `/api/openapi`;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
  const healthUrl = `${backendUrl}/health`;

  useEffect(() => {
    // Проверяем доступность Django backend через наш API endpoint
    const checkBackend = async () => {
      console.log('[DocumentsFrame] Starting backend health check...');
      try {
        // Use full URL to ensure correct routing
        const healthCheckUrl = `${window.location.origin}/api/backend-health`;
        console.log('[DocumentsFrame] Making request to:', healthCheckUrl);

        const response = await fetch(healthCheckUrl);
        console.log('[DocumentsFrame] Health check response status:', response.status);

        const result = await response.json();
        console.log('[DocumentsFrame] Health check result:', result);

        if (result.success) {
          console.log('[DocumentsFrame] Django backend is available, setting state to true');
          setIsBackendAvailable(true);
        } else {
          console.error('[DocumentsFrame] Django backend not available:', result.error);
          setIsBackendAvailable(false);
        }
      } catch (error) {
        console.error('[DocumentsFrame] Failed to check Django backend:', error);
        setIsBackendAvailable(false);
      }
    };

    checkBackend();
  }, []);

  if (isBackendAvailable === null) {
    return (
      <div className="w-full h-[calc(100vh-120px)] mt-[50px] mb-5 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-foreground">Checking Django backend availability...</p>
        </div>
      </div>
    );
  }

  if (isBackendAvailable === false) {
    return (
      <div className="w-full h-[calc(100vh-120px)] mt-[50px] mb-5 flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-foreground mb-4">Django Backend Not Available</h2>
          <p className="text-muted-foreground mb-6">
            The Django backend server is not running. Please start it to view the API documentation.
          </p>

          <div className="bg-muted p-4 rounded-lg mb-6 text-left">
            <h3 className="font-semibold mb-2 text-foreground">To start Django backend:</h3>
            <code className="block bg-black text-green-400 p-2 rounded text-sm">
              docker-compose up app -d
            </code>
          </div>

          <div className="space-y-2">
            <a
              href={`${backendUrl}/api/doc/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Try Direct Link
            </a>
            <p className="text-sm text-muted-foreground">
              Opens Django Swagger in new tab
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-120px)] mt-[50px] mb-5 bg-background">
      <SwaggerUI url={docsUrl} />
    </div>
  );
};

export default DocumentsFrame;
