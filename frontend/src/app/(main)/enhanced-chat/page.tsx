/**
 * Enhanced Chat Demo Page
 */

'use client';

import React from 'react';
import { EnhancedChatBot } from '@/components/EnhancedChatBot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function EnhancedChatPage() {
  const handleAuthError = () => {
    console.log('Authentication error - redirect to login');
    // In real app, redirect to login page
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Enhanced ChatBot Demo</h1>
        <p className="text-gray-600">
          New improved chat architecture with LangGraph backend integration
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Component */}
        <div className="lg:col-span-2">
          <EnhancedChatBot 
            onAuthError={handleAuthError}
            className="w-full"
          />
        </div>

        {/* Info Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Multi-language</Badge>
                <span className="text-sm">Supports any language</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">Intent Classification</Badge>
                <span className="text-sm">LLM-based routing</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">Real-time</Badge>
                <span className="text-sm">WebSocket connection</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline">Typed</Badge>
                <span className="text-sm">Full TypeScript support</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Supported Intents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div><strong>General Chat:</strong> "Hello, how are you?"</div>
                <div><strong>Image Generation:</strong> "Create an image of a cat"</div>
                <div><strong>Search:</strong> "What's the latest AI news?"</div>
                <div><strong>Web Analysis:</strong> "Analyze https://example.com"</div>
                <div><strong>Code Execution:</strong> "Execute: print('hello')"</div>
                <div><strong>File Operations:</strong> "Read file data.txt"</div>
                <div><strong>Date/Time:</strong> "What time is it?"</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Architecture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1">
                <div><strong>Backend:</strong> Django + LangGraph + ChatAI</div>
                <div><strong>Frontend:</strong> Next.js + TypeScript</div>
                <div><strong>Communication:</strong> WebSocket</div>
                <div><strong>State:</strong> Enhanced React hooks</div>
                <div><strong>Storage:</strong> Local + Server sync</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Test Commands</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm space-y-1 font-mono bg-gray-50 p-3 rounded">
                <div>• "Привет, как дела?"</div>
                <div>• "Create image of sunset"</div>
                <div>• "What's 2+2?"</div>
                <div>• "Search Python tutorials"</div>
                <div>• "Который час?"</div>
                <div>• "Execute: print('test')"</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
