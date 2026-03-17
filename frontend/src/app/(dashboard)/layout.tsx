"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthStore } from "@/lib/store";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!_hasHydrated) return;
    if (!token) {
      router.push("/login");
    }
  }, [token, router, _hasHydrated, mounted]);

  if (!mounted || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <span className="font-mono text-[#555555] text-sm animate-pulse">
          loading...
        </span>
      </div>
    );
  }

  if (!token) return null;

  function handleLogout() {
    logout();
    toast.success("Logged out");
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <nav className="border-b border-[#222222] bg-[#111111] px-6 py-3 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="font-mono text-lg font-bold text-amber-400 tracking-tight"
        >
          PromptEval
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-[#888888] text-sm font-mono">
            {user?.firstName} {user?.lastName}
          </span>
          <Link
            href="/settings"
            className="text-xs font-mono text-[#888888] hover:text-amber-400 transition-colors border border-[#222222] px-3 py-1.5 rounded"
          >
            settings
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs font-mono text-[#888888] hover:text-amber-400 transition-colors border border-[#222222] px-3 py-1.5 rounded"
          >
            logout →
          </button>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
