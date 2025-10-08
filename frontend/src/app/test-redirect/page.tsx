"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { redirectManager } from '@/utils/auth/redirectManager';
import { AuthProvider } from '@/common/constants/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function TestRedirectPage() {
  const [callbackUrl, setCallbackUrl] = useState('');
  const [testResult, setTestResult] = useState<string>('');
  const router = useRouter();
  const { toast } = useToast();

  const testRedirectUrl = () => {
    const result = redirectManager.getRedirectUrl({
      callbackUrl: callbackUrl || null,
      provider: AuthProvider.MyBackendDocs,
      fallbackUrl: '/'
    });
    
    setTestResult(`Redirect URL: ${result}`);
    console.log('Test redirect URL result:', result);
  };

  const testSmartRedirect = async () => {
    try {
      const result = await redirectManager.smartRedirect({
        callbackUrl: callbackUrl || null,
        provider: AuthProvider.MyBackendDocs,
        fallbackUrl: '/',
        delay: 1000
      });
      
      setTestResult(`Smart redirect result: ${JSON.stringify(result, null, 2)}`);
      console.log('Smart redirect result:', result);
    } catch (error) {
      setTestResult(`Smart redirect error: ${error}`);
      console.error('Smart redirect error:', error);
    }
  };

  const testCreateLoginUrl = () => {
    const currentUrl = window.location.href;
    const loginUrl = redirectManager.createLoginUrl(currentUrl);
    
    setTestResult(`Login URL: ${loginUrl}`);
    console.log('Login URL result:', loginUrl);
  };

  const testExtractCallbackUrl = () => {
    const extracted = redirectManager.extractCallbackUrl();
    setTestResult(`Extracted callback URL: ${extracted || 'null'}`);
    console.log('Extracted callback URL:', extracted);
  };

  const testSafetyCheck = () => {
    const testUrl = callbackUrl || window.location.href;
    const isSafe = redirectManager.isSafeRedirectUrl(testUrl);
    
    setTestResult(`URL safety check for "${testUrl}": ${isSafe ? 'SAFE' : 'UNSAFE'}`);
    console.log('URL safety check:', { url: testUrl, safe: isSafe });
  };

  const simulateLogin = () => {
    // Симулируем успешный логин с перенаправлением
    toast({
      title: "Simulating Login",
      description: "Redirecting after successful authentication...",
      duration: 2000,
    });

    setTimeout(() => {
      redirectManager.smartRedirect({
        callbackUrl: callbackUrl || null,
        provider: AuthProvider.MyBackendDocs,
        fallbackUrl: '/',
        delay: 500
      });
    }, 2000);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Redirect Manager Test Page</CardTitle>
          <CardDescription>
            Test the redirect functionality after authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="callback-url" className="text-sm font-medium">
              Test Callback URL (leave empty to test fallback):
            </label>
            <Input
              id="callback-url"
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="e.g., /autoria/cars, /users, https://example.com/page"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Button onClick={testRedirectUrl} variant="outline">
              Test Get Redirect URL
            </Button>
            
            <Button onClick={testSmartRedirect} variant="outline">
              Test Smart Redirect
            </Button>
            
            <Button onClick={testCreateLoginUrl} variant="outline">
              Test Create Login URL
            </Button>
            
            <Button onClick={testExtractCallbackUrl} variant="outline">
              Extract Current Callback
            </Button>
            
            <Button onClick={testSafetyCheck} variant="outline">
              Test URL Safety
            </Button>
            
            <Button onClick={simulateLogin} variant="default">
              Simulate Login Flow
            </Button>
          </div>

          {testResult && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Test Result:</h3>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
                {testResult}
              </pre>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <h3 className="text-lg font-semibold">Test URLs:</h3>
            <div className="text-sm space-y-1">
              <p><strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
              <p><strong>Test with callback:</strong> <code>/test-redirect?callbackUrl=/autoria</code></p>
              <p><strong>Test without callback:</strong> <code>/test-redirect</code></p>
              <p><strong>Test with encoded callback:</strong> <code>/test-redirect?callbackUrl=%2Fautoria%2Fcars</code></p>
            </div>
          </div>

          <div className="mt-6">
            <Button 
              onClick={() => router.push('/login')} 
              variant="secondary"
            >
              Go to Login Page
            </Button>
            <Button 
              onClick={() => router.push('/home')} 
              variant="secondary"
              className="ml-2"
            >
              Go to Home Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
