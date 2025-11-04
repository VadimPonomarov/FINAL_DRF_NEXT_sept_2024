"use client";

import { FC } from "react";
import { BaseUrl } from "@/shared/constants/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Database, Info } from "lucide-react";

const RedisInsightFrame: FC = () => {
  const redisInsightUrl: string = String(BaseUrl.RedisInsight);

  const openInNewTab = () => {
    window.open(redisInsightUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="w-full h-[calc(100vh-50px)] flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Database className="h-5 w-5 text-red-500" />
              Redis Insight
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => window.open('https://redis.io/docs/connect/insight/', '_blank')}>
              <Info className="h-4 w-4" />
              <span className="sr-only">Redis Insight Information</span>
            </Button>
          </div>
          <CardDescription>
            Tool for visualizing and managing Redis data
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="rounded-md bg-amber-50 p-4 mb-4 border border-amber-200">
            <p className="text-sm text-amber-800 flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Redis Insight cannot be embedded in the application due to browser security restrictions and 
                resource loading specifics. For full functionality with Redis Insight, please use a separate tab.
              </span>
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Redis Insight provides:
            </p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Data structure visualization</li>
              <li>Performance monitoring</li>
              <li>Key and value management</li>
              <li>Redis command execution</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="pt-2">
          <Button 
            onClick={openInNewTab} 
            className="w-full flex items-center justify-center gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open Redis Insight
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default RedisInsightFrame;
