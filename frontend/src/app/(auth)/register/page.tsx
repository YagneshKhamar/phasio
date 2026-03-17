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

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, token, _hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

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
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      setAuth(res.data.user, res.data.token);
      toast.success("Account created!");
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
        <CardTitle className="font-mono text-lg">Create account</CardTitle>
        <CardDescription className="text-[#888888]">
          Start testing your prompts today
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="firstName"
                className="text-[#888888] text-xs font-mono uppercase tracking-wider"
              >
                First name
              </Label>
              <Input
                id="firstName"
                name="firstName"
                required
                value={form.firstName}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] focus:border-amber-400 focus:ring-0 font-mono"
                placeholder="John"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="lastName"
                className="text-[#888888] text-xs font-mono uppercase tracking-wider"
              >
                Last name
              </Label>
              <Input
                id="lastName"
                name="lastName"
                required
                value={form.lastName}
                onChange={handleChange}
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] focus:border-amber-400 focus:ring-0 font-mono"
                placeholder="Doe"
              />
            </div>
          </div>

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

          <div className="space-y-1.5">
            <Label
              htmlFor="confirmPassword"
              className="text-[#888888] text-xs font-mono uppercase tracking-wider"
            >
              Confirm password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={form.confirmPassword}
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
            {loading ? "Creating account..." : "Create account →"}
          </Button>

          <p className="text-center text-sm text-[#888888]">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-amber-400 hover:text-amber-300 font-mono"
            >
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
