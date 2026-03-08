"use client";

import { useState } from "react";

export default function SimpleAuthPage() {
  const [email, setEmail] = useState("admin@autoria.com");
  const [password, setPassword] = useState("12345678");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult("Testing login...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.access) {
        setResult(`✅ Login Successful! User: ${data.user.email}, ID: ${data.user.id}`);
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("user_data", JSON.stringify(data.user));
      } else {
        setResult(`❌ Login Failed: ${data.error}`);
      }
    } catch (err) {
      setResult(`❌ Network Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AutoRia</h1>
          <p className="text-gray-600">JWT Authentication Test</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Testing..." : "Test Login"}
          </button>
        </form>

        {result && (
          <div className="mt-6 p-4 bg-gray-100 rounded-md text-sm">
            {result}
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Testing Railway Backend JWT Auth
          </p>
        </div>
      </div>
    </div>
  );
}
