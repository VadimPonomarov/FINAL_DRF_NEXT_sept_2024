"use client";

import { FC, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw, ExternalLink } from "lucide-react";

interface ServiceFrameProps {
  serviceUrl: string;
  serviceName: string;
}

const ServiceFrame: FC<ServiceFrameProps> = ({ serviceUrl, serviceName }) => {
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);



  const handleIframeLoad = () => {
    setIsLoading(false);
    setIsError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setIsError(true);
  };

  const handleRetry = () => {
    setIsError(false);
    setIsLoading(true);
  };

  return (
    <div className="w-full h-[calc(100vh-50px)] relative">

      {isLoading && !isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading {serviceName}...</p>

            {serviceName === "RabbitMQ" && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded max-w-xs">
                <p className="text-xs text-blue-800 font-medium mb-1">Login Credentials:</p>
                <p className="text-xs text-blue-700">Username: <code className="bg-blue-100 px-1 rounded">admin</code></p>
                <p className="text-xs text-blue-700">Password: <code className="bg-blue-100 px-1 rounded">admin123</code></p>
              </div>
            )}
          </div>
        </div>
      )}

      {isError ? (
        <Alert variant="destructive" className="max-w-md mx-auto mt-10">
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            <p className="mb-4">
              Could not connect to {serviceName} service. Make sure the service is running at:
            </p>
            <code className="block p-2 bg-muted rounded text-sm mb-4">{serviceUrl}</code>

            {serviceName === "RabbitMQ" && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800 font-medium mb-2">Login Credentials:</p>
                <p className="text-sm text-blue-700">Username: <code className="bg-blue-100 px-1 rounded">admin</code></p>
                <p className="text-sm text-blue-700">Password: <code className="bg-blue-100 px-1 rounded">admin123</code></p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleRetry}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Connection
              </Button>
              <Button
                onClick={() => window.open(serviceUrl, '_blank')}
                variant="default"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <iframe
          src={serviceUrl}
          className="w-full h-full border-none"
          title={`${serviceName} Service`}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="fullscreen"
          referrerPolicy="no-referrer-when-downgrade"
        />
      )}
    </div>
  );
};

export default ServiceFrame;