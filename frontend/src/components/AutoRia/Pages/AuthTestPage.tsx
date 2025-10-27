"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Key, 
  User, 
  CheckCircle, 
  XCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';

const AuthTestPage = () => {
  const [authStatus, setAuthStatus] = useState<{
    hasToken: boolean;
    tokenValid: boolean;
    loading: boolean;
    error: string | null;
    tokenPreview: string | null;
  }>({
    hasToken: false,
    tokenValid: false,
    loading: true,
    error: null,
    tokenPreview: null
  });

  const [testToken, setTestToken] = useState('');

  // Проверка текущего состояния аутентификации
  const checkAuthStatus = async () => {
    setAuthStatus(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Проверяем токен в Redis
      const response = await fetch('/api/redis?key=backend_auth');
      
      if (!response.ok) {
        setAuthStatus({
          hasToken: false,
          tokenValid: false,
          loading: false,
          error: 'Failed to check Redis',
          tokenPreview: null
        });
        return;
      }

      const { value: authData } = await response.json();
      
      if (!authData) {
        setAuthStatus({
          hasToken: false,
          tokenValid: false,
          loading: false,
          error: null,
          tokenPreview: null
        });
        return;
      }

      const parsedData = typeof authData === 'string' ? JSON.parse(authData) : authData;
      const accessToken = parsedData.access || parsedData.token;

      if (!accessToken) {
        setAuthStatus({
          hasToken: false,
          tokenValid: false,
          loading: false,
          error: null,
          tokenPreview: null
        });
        return;
      }

      // Тестируем токен на API профиля
      const profileResponse = await fetch('/api/user/profile/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      setAuthStatus({
        hasToken: true,
        tokenValid: profileResponse.ok,
        loading: false,
        error: profileResponse.ok ? null : `API returned ${profileResponse.status}`,
        tokenPreview: accessToken.substring(0, 20) + '...'
      });

    } catch (error) {
      setAuthStatus({
        hasToken: false,
        tokenValid: false,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        tokenPreview: null
      });
    }
  };

  // Установка тестового токена
  const setTestAuthToken = async () => {
    if (!testToken.trim()) {
      toast({ title: t('common.warning'), description: 'Please enter a token', variant: 'destructive' });
      return;
    }

    try {
      const authData = {
        access: testToken.trim(),
        token_type: 'Bearer'
      };

      const response = await fetch('/api/redis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: 'backend_auth',
          value: JSON.stringify(authData)
        })
      });

      if (response.ok) {
        toast({ title: '✅ ' + t('common.success'), description: 'Token saved successfully!' });
        setTestToken('');
        checkAuthStatus();
      } else {
        toast({ title: '❌ ' + t('common.error'), description: 'Failed to save token', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '❌ ' + t('common.error'), description: 'Error saving token: ' + (error instanceof Error ? error.message : 'Unknown error'), variant: 'destructive' });
    }
  };

  // Очистка токена
  const clearAuthToken = async () => {
    try {
      const response = await fetch('/api/redis', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          key: 'backend_auth'
        })
      });

      if (response.ok) {
        toast({ title: '✅ ' + t('common.success'), description: 'Token cleared successfully!' });
        checkAuthStatus();
      } else {
        toast({ title: '❌ ' + t('common.error'), description: 'Failed to clear token', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: '❌ ' + t('common.error'), description: 'Error clearing token: ' + (error instanceof Error ? error.message : 'Unknown error'), variant: 'destructive' });
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Authentication Test</h1>
          <p className="text-muted-foreground">
            Test and manage authentication tokens for profile access
          </p>
        </div>
        
        <Button onClick={checkAuthStatus} disabled={authStatus.loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${authStatus.loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Auth Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {authStatus.loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking authentication...</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">Token in Redis:</span>
                {authStatus.hasToken ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Present
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Missing
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-medium">Token Valid:</span>
                {authStatus.tokenValid ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Invalid
                  </Badge>
                )}
              </div>

              {authStatus.tokenPreview && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Token Preview:</span>
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    {authStatus.tokenPreview}
                  </code>
                </div>
              )}

              {authStatus.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Error: {authStatus.error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Token Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testToken">Set Test Token</Label>
            <div className="flex gap-2">
              <Input
                id="testToken"
                value={testToken}
                onChange={(e) => setTestToken(e.target.value)}
                placeholder="Enter Bearer token for testing..."
                type="password"
              />
              <Button onClick={setTestAuthToken}>
                Set Token
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter a valid Bearer token from your backend authentication
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={clearAuthToken}>
              Clear Token
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/autoria/profile'}>
              <User className="h-4 w-4 mr-2" />
              Test Profile Page
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Get a Valid Token</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Go to your backend API documentation (Swagger)</li>
            <li>Use the login endpoint to authenticate</li>
            <li>Copy the access token from the response</li>
            <li>Paste it in the "Set Test Token" field above</li>
            <li>Click "Test Profile Page" to verify it works</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthTestPage;
