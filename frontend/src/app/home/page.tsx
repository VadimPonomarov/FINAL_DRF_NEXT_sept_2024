"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function HomePage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    // Проверяем, есть ли сообщение о успешном логине
    const message = searchParams.get('message');
    const from = searchParams.get('from');
    
    if (message) {
      toast({
        title: "Welcome!",
        description: message,
        duration: 4000,
      });
    }

    if (from) {
      toast({
        title: "Redirected",
        description: `You were redirected from: ${from}`,
        duration: 3000,
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🏠 Welcome Home!</CardTitle>
            <CardDescription>
              This is your home page after successful authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              You have successfully logged in and been redirected to the home page.
              This page serves as the default landing page when no specific callback URL is provided.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Navigate to different parts of the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Link href="/autoria">
                <Button variant="outline" className="w-full">
                  🚗 Autoria
                </Button>
              </Link>
              
              <Link href="/users">
                <Button variant="outline" className="w-full">
                  👥 Users
                </Button>
              </Link>
              
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  🔐 Login
                </Button>
              </Link>
              
              <Link href="/test-redirect">
                <Button variant="outline" className="w-full">
                  🧪 Test Redirect
                </Button>
              </Link>
              
              <Link href="/">
                <Button variant="outline" className="w-full">
                  🏠 Main Page
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
