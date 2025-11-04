"use client";

import { FC, useState } from "react";
import { BaseUrl } from "@/shared/constants/constants";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const RabbitMQFrame: FC = () => {
  // Convert the enum value to a string explicitly
  const rabbitMQUrl: string = BaseUrl.RabbitMQ as string;
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
              Could not connect to RabbitMQ Management interface. Make sure RabbitMQ is running and accessible on port 15672.
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
          src={rabbitMQUrl}
          className="w-full h-full border-none"
          title="RabbitMQ Management"
          onError={handleIframeError}
        />
      )}
    </div>
  );
};

export default RabbitMQFrame;
