"use client";

import { useState } from "react";

export default function QuickLoginForm() {
  const [email, setEmail] = useState("admin@autoria.com");
  const [password, setPassword] = useState("12345678");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult("Testing...");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.access) {
        setResult(`✅ Success! User: ${data.user.email}, ID: ${data.user.id}`);
        localStorage.setItem("access_token", data.access);
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setResult(`❌ Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white p-4 rounded-lg shadow-lg border z-50 w-80">
      <h3 className="font-bold mb-2">Quick Login Test</h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
          placeholder="Email"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-2 py-1 border rounded text-sm"
          placeholder="Password"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-1 px-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Login"}
        </button>
      </form>
      {result && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
          {result}
        </div>
      )}
    </div>
  );
}
