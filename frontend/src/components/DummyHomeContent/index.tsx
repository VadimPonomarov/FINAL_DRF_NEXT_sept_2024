"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  ChefHat,
  Search,
  User,
  BookOpen,
  Star,
  TrendingUp,
  Shield,
  Zap
} from 'lucide-react';
import NewResizableWrapper from '@/components/All/ResizableWrapper/NewResizableWrapper';

const DummyHomeContent: React.FC = () => {
  // Features для DummyJSON
  const features = [
    {
      icon: <Users className="h-8 w-8 text-blue-600" />,
      title: "Users",
      description: "Browse and search through user profiles",
      href: "/users",
      color: "blue"
    },
    {
      icon: <ChefHat className="h-8 w-8 text-green-600" />,
      title: "Recipes",
      description: "Discover delicious recipes and cooking tips",
      href: "/recipes",
      color: "green"
    },
    {
      icon: <Search className="h-8 w-8 text-purple-600" />,
      title: "Search",
      description: "Find users and recipes quickly",
      href: "/search",
      color: "purple"
    },
    {
      icon: <User className="h-8 w-8 text-red-600" />,
      title: "Profile",
      description: "View and manage your profile",
      href: "/profile",
      color: "red"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-16">
        <NewResizableWrapper
          centered={true}
          storageKey="dummy-home-content"
          defaultWidth={1200}
          defaultHeight={800}
          minWidth={800}
          minHeight={600}
        >
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              DummyJSON SPA
            </h1>
            <p className="text-xl text-slate-200 mb-6">
              Explore users and recipes from DummyJSON API
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-blue-600">30+</div>
                <div className="text-sm text-slate-600 font-medium">Users</div>
              </div>
              <div className="bg-gradient-to-br from-white to-green-50 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-green-600">50+</div>
                <div className="text-sm text-slate-600 font-medium">Recipes</div>
              </div>
              <div className="bg-gradient-to-br from-white to-purple-50 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-purple-600">100%</div>
                <div className="text-sm text-slate-600 font-medium">Free</div>
              </div>
              <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl p-4 shadow-lg">
                <div className="text-2xl font-bold text-orange-600">24/7</div>
                <div className="text-sm text-slate-600 font-medium">Available</div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <Link key={index} href={feature.href}>
                <Card className="h-full hover:shadow-2xl transition-all duration-300 transform hover:scale-105 bg-gradient-to-br from-white to-gray-50 border-0 shadow-lg">
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 p-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg font-bold text-gray-800">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center pt-0">
                    <CardDescription className="text-gray-600 text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/users">
                <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Users className="h-5 w-5 mr-2" />
                  Browse Users
                </Button>
              </Link>
              <Link href="/recipes">
                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900">
                  <ChefHat className="h-5 w-5 mr-2" />
                  Explore Recipes
                </Button>
              </Link>
              <Link href="/search">
                <Button size="lg" variant="secondary" className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white">
                  <Search className="h-5 w-5 mr-2" />
                  Search All
                </Button>
              </Link>
            </div>
          </div>

          {/* Features List */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 flex items-center justify-center">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Secure</h3>
              <p className="text-slate-300">Built with modern security practices and authentication</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 w-16 h-16 flex items-center justify-center">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Fast</h3>
              <p className="text-slate-300">Optimized performance with caching and modern frameworks</p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 flex items-center justify-center">
                <Star className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Quality</h3>
              <p className="text-slate-300">High-quality data from trusted DummyJSON API</p>
            </div>
          </div>
        </NewResizableWrapper>
      </div>
    </div>
  );
};

export default DummyHomeContent;
