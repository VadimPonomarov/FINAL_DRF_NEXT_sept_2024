"use client";

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    SwaggerUIBundle: any;
  }
}

interface SwaggerUIProps {
  url?: string;
}

const SwaggerUI: React.FC<SwaggerUIProps> = ({ url = '/api/openapi' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const showError = (message: string) => {
      if (!mounted || !containerRef.current) return;

      setError(message);
      setLoading(false);
      containerRef.current.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
          <h3>Failed to load API documentation</h3>
          <p>Error: ${message}</p>
          <p>Please check if the backend server is running and accessible.</p>
          <button onclick="window.location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    };

    const loadSwaggerUI = async () => {
      try {
        // Load CSS
        if (!document.querySelector('link[href*="swagger-ui"]')) {
          const cssLink = document.createElement('link');
          cssLink.rel = 'stylesheet';
          cssLink.href = 'https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css';
          document.head.appendChild(cssLink);
        }

        // Dark theme styles are now handled in globals.css
        console.log('[Swagger UI] Dark theme styles loaded from globals.css');

        // Load JS
        if (!window.SwaggerUIBundle) {
          console.log('[Swagger UI] Loading Swagger UI Bundle...');

          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js';

            script.onload = () => {
              console.log('[Swagger UI] Bundle loaded successfully');
              setTimeout(() => {
                if (window.SwaggerUIBundle) {
                  resolve();
                } else {
                  reject(new Error('SwaggerUIBundle not available after load'));
                }
              }, 200);
            };

            script.onerror = () => {
              reject(new Error('Failed to load Swagger UI script'));
            };

            document.head.appendChild(script);
          });
        }

        if (!mounted) return;

        // Initialize Swagger UI
        await initSwaggerUI();

      } catch (error: any) {
        console.error('[Swagger UI] Error loading:', error);
        showError(error.message || 'Unknown error');
      }
    };

    const initSwaggerUI = async () => {
      if (!mounted || !containerRef.current || !window.SwaggerUIBundle) {
        throw new Error('Required components not available');
      }

      console.log('[Swagger UI] Initializing Swagger UI...');

      try {
        // Clear previous instance
        containerRef.current.innerHTML = '';
        
        // First fetch the OpenAPI spec from our proxy
        fetch(url)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
          })
          .then(spec => {
            console.log('[Swagger UI] Successfully loaded OpenAPI spec from proxy');

            // Безопасная проверка доступных layouts
            let availableLayouts: string[] = [];
            try {
              if (window.SwaggerUIBundle?.presets?.standalone?.layouts) {
                availableLayouts = Object.keys(window.SwaggerUIBundle.presets.standalone.layouts);
                console.log('[Swagger UI] Available layouts:', availableLayouts);
              } else {
                console.log('[Swagger UI] No layouts found in standalone preset');
              }
            } catch (error) {
              console.log('[Swagger UI] Error checking layouts:', error);
            }

            // Безопасная проверка presets
            const presets = [];
            if (window.SwaggerUIBundle.presets?.apis) {
              presets.push(window.SwaggerUIBundle.presets.apis);
            }
            if (window.SwaggerUIBundle.presets?.standalone) {
              presets.push(window.SwaggerUIBundle.presets.standalone);
            }

            console.log('[Swagger UI] Using presets:', presets.length);

            const config: any = {
              spec: spec, // Use the fetched spec directly instead of URL
              dom_id: '#swagger-ui-container',
              deepLinking: true,
              tryItOutEnabled: true,
            };

            // Добавляем presets если они доступны
            if (presets.length > 0) {
              config.presets = presets;
            }

            // Добавляем plugins если доступны
            if (window.SwaggerUIBundle.plugins?.DownloadUrl) {
              config.plugins = [window.SwaggerUIBundle.plugins.DownloadUrl];
            }

            // Добавляем layout если доступен
            if (availableLayouts.includes('StandaloneLayout')) {
              config.layout = "StandaloneLayout";
              console.log('[Swagger UI] Using StandaloneLayout');
            } else {
              console.log('[Swagger UI] StandaloneLayout not available, using default');
            }

            // Добавляем interceptors
            config.requestInterceptor = (request: any) => {
              console.log('[Swagger UI] Making API request:', request.url);
              // Ensure API requests go to the correct backend URL
              if (request.url.startsWith('/api/')) {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
                request.url = `${backendUrl}${request.url}`;
                console.log('[Swagger UI] Redirected to:', request.url);
              }
              return request;
            };

            config.responseInterceptor = (response: any) => {
              console.log('[Swagger UI] Received API response:', response.status);
              return response;
            };

            config.onComplete = () => {
              console.log('[Swagger UI] Loaded successfully with spec');
            };

            config.onFailure = (error: any) => {
              console.error('[Swagger UI] Failed to initialize:', error);

              // Если ошибка связана с layout, попробуем без него
              if (error.message && (error.message.includes('layout') || error.message.includes('StandaloneLayout'))) {
                console.log('[Swagger UI] Layout error detected, trying without layout...');

                try {
                  const fallbackConfig = {
                    spec: spec,
                    dom_id: '#swagger-ui-container',
                    deepLinking: true,
                    tryItOutEnabled: true
                  };

                  if (window.SwaggerUIBundle.presets?.apis) {
                    fallbackConfig.presets = [window.SwaggerUIBundle.presets.apis];
                  }

                  window.SwaggerUIBundle(fallbackConfig);
                } catch (fallbackError) {
                  console.error('[Swagger UI] Fallback failed:', fallbackError);
                  showError('Failed to initialize Swagger UI');
                }
              } else {
                showError('Failed to initialize Swagger UI');
              }
            };

            console.log('[Swagger UI] Initializing with config:', config);
            window.SwaggerUIBundle(config);
          })
          .catch(error => {
            console.error('[Swagger UI] Failed to load OpenAPI spec:', error);
            // Show error message in container
            if (containerRef.current) {
              containerRef.current.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px;">
                  <h3>Failed to load API documentation</h3>
                  <p>Error: ${error.message}</p>
                  <p>Please check if the backend server is running and accessible.</p>
                </div>
              `;
            }
          });
      } catch (error: any) {
        console.error('[Swagger UI] Error in initSwaggerUI:', error);
        showError(error.message || 'Unknown error');
      }
    };

    loadSwaggerUI();

    // Cleanup function
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [url]);

  return (
    <div className="w-full h-full bg-background">
      <div
        id="swagger-ui-container"
        ref={containerRef}
        className="w-full h-full bg-background text-foreground"
        style={{ minHeight: '600px' }}
      />
    </div>
  );
};

export default SwaggerUI;
