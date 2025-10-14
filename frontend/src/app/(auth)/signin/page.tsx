"use client";

import { FC, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chrome, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SignInPage: FC = () => {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const callbackUrl = searchParams.get("callbackUrl") || "/login";
    
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);

    const handleGoogleSignIn = async () => {
        try {
            setIsGoogleLoading(true);
            await signIn("google", { callbackUrl });
        } catch (error) {
            console.error("[SignIn] Google sign in error:", error);
            toast({
                title: "Error",
                description: "Failed to sign in with Google",
                variant: "destructive",
            });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    const handleCredentialsSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!email) {
            toast({
                title: "Email Required",
                description: "Please enter your email address",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsLoading(true);
            const result = await signIn("credentials", {
                email,
                callbackUrl,
                redirect: true,
            });

            if (result?.error) {
                toast({
                    title: "Sign In Failed",
                    description: result.error,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("[SignIn] Credentials sign in error:", error);
            toast({
                title: "Error",
                description: "Failed to sign in",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-2">
                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Welcome
                    </CardTitle>
                    <CardDescription className="text-lg">
                        Sign in to continue
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Google OAuth Button */}
                    <div className="space-y-2">
                        <Button
                            onClick={handleGoogleSignIn}
                            disabled={isGoogleLoading || isLoading}
                            className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 shadow-sm"
                            size="lg"
                        >
                            {isGoogleLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Chrome className="mr-2 h-5 w-5 text-blue-500" />
                            )}
                            Sign in with Google
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">Or continue with email</span>
                        </div>
                    </div>

                    {/* Credentials Form */}
                    <form onSubmit={handleCredentialsSignIn} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="your.email@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading || isGoogleLoading}
                                required
                            />
                        </div>
                        
                        <Button
                            type="submit"
                            disabled={isLoading || isGoogleLoading}
                            className="w-full"
                            size="lg"
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <Mail className="mr-2 h-5 w-5" />
                            )}
                            Sign in with Email
                        </Button>
                    </form>

                    {/* Info Text */}
                    <div className="text-xs text-center text-gray-500 space-y-2">
                        <p>After signing in, you'll be able to choose your provider:</p>
                        <p className="font-medium">Backend (AutoRia) or Dummy (DummyJSON)</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default SignInPage;

