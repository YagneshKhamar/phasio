"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { getErrorMessage } from "@/lib/error";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, token, _hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    if (_hasHydrated && token) {
      router.push("/dashboard");
    }
  }, [token, _hasHydrated, router]);

  if (!_hasHydrated) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", form);
      setAuth(res.data.user, res.data.token);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[#111111] border-[#222222]">
      <CardHeader>
        <CardTitle className="font-mono text-lg">Sign in</CardTitle>
        <CardDescription className="text-[#888888]">
          Enter your credentials to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="email"
              className="text-[#888888] text-xs font-mono uppercase tracking-wider"
            >
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={handleChange}
              className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] focus:border-amber-400 focus:ring-0 font-mono"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="password"
              className="text-[#888888] text-xs font-mono uppercase tracking-wider"
            >
              Password
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={form.password}
              onChange={handleChange}
              className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] focus:border-amber-400 focus:ring-0 font-mono"
              placeholder="••••••••"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold mt-2"
          >
            {loading ? "Signing in..." : "Sign in →"}
          </Button>

          <p className="text-center text-sm text-[#888888]">
            No account?{" "}
            <Link
              href="/register"
              className="text-amber-400 hover:text-amber-300 font-mono"
            >
              Register
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
