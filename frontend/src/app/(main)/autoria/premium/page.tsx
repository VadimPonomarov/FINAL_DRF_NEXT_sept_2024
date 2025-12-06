import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: "Premium - CarHub",
  description: "Premium features and analytics",
};

export default function PremiumPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Premium</h1>
      <Card>
        <CardHeader>
          <CardTitle>Premium Features</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Premium features coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
