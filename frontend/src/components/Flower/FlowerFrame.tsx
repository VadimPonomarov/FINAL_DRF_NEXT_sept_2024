"use client";

import { FC, useState } from "react";
import { BaseUrl } from "@/common/constants/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const FlowerFrame: FC = () => {
  // Convert the enum value to a string explicitly
  const flowerUrl: string = BaseUrl.Flower as string;
  const [isError, setIsError] = useState(false);

  const handleIframeError = () => {
    setIsError(true);
  };

  const handleRetry = () => {
    setIsError(false);
  };

  return (
    <div className="w-full h-[calc(100vh-120px)] mt-[50px] mb-5">
      {isError ? (
        <Alert variant="destructive" className="max-w-md mx-auto mt-10">
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription>
            <p className="mb-4">
              Could not connect to Flower monitoring service. Make sure the Flower service is running on port 5555.
            </p>
            <Button 
              onClick={handleRetry} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <iframe
          src={flowerUrl}
          className="w-full h-full border-none"
          title="Flower Monitoring"
          onError={handleIframeError}
        />
      )}
    </div>
  );
};

export default FlowerFrame;