"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getProfile,
  updateSettings,
  updatePassword,
} from "@/lib/api-functions";
import { getErrorMessage } from "@/lib/error";
import { useAuthStore } from "@/lib/store";

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  preferredProvider: string;
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { setAuth, user, token } = useAuthStore();

  const [settingsForm, setSettingsForm] = useState({
    firstName: "",
    lastName: "",
    openaiApiKey: "",
    anthropicApiKey: "",
    preferredProvider: "openai",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const { data: profile } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettingsForm({
        firstName: profile.firstName,
        lastName: profile.lastName,
        openaiApiKey: "",
        anthropicApiKey: "",
        preferredProvider: profile.preferredProvider,
      });
    }
  }, [profile]);
  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings updated");
      // Update auth store with new name
      if (user && token) {
        setAuth(
          { ...user, firstName: data.firstName, lastName: data.lastName },
          token,
        );
      }
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const passwordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: () => {
      toast.success("Password updated");
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: {
      firstName?: string;
      lastName?: string;
      openaiApiKey?: string;
      anthropicApiKey?: string;
      preferredProvider?: string;
    } = {
      firstName: settingsForm.firstName,
      lastName: settingsForm.lastName,
      preferredProvider: settingsForm.preferredProvider,
    };
    if (settingsForm.openaiApiKey)
      payload.openaiApiKey = settingsForm.openaiApiKey;
    if (settingsForm.anthropicApiKey)
      payload.anthropicApiKey = settingsForm.anthropicApiKey;

    settingsMutation.mutate(payload);
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    passwordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    });
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-[#fafafa]">
          Settings
        </h1>
        <p className="text-[#888888] text-sm mt-1">
          Manage your account and API keys
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="bg-[#111111] border-[#222222] mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="font-mono text-sm text-[#888888] uppercase tracking-wider">
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[#888888] text-xs font-mono uppercase tracking-wider">
                  First name
                </Label>
                <Input
                  value={settingsForm.firstName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      firstName: e.target.value,
                    })
                  }
                  className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#888888] text-xs font-mono uppercase tracking-wider">
                  Last name
                </Label>
                <Input
                  value={settingsForm.lastName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      lastName: e.target.value,
                    })
                  }
                  className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
                />
              </div>
            </div>

            {/* OpenAI API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[#888888] text-xs font-mono uppercase tracking-wider">
                  OpenAI API Key
                </Label>
                {profile?.hasOpenaiKey ? (
                  <Badge className="bg-green-400/10 text-green-400 border-green-400/20 font-mono text-xs">
                    ✓ configured — {profile.openaiApiKey}
                  </Badge>
                ) : (
                  <Badge className="bg-red-400/10 text-red-400 border-red-400/20 font-mono text-xs">
                    ✗ not set
                  </Badge>
                )}
              </div>

              <Input
                type="password"
                placeholder={
                  profile?.hasOpenaiKey
                    ? "Enter new key to replace existing"
                    : "sk-..."
                }
                value={settingsForm.openaiApiKey}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    openaiApiKey: e.target.value,
                  })
                }
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
              />
              <p className="text-xs text-[#555555] font-mono">
                Your key is stored securely and used for eval runs
              </p>
            </div>
            {/* Anthropic API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[#888888] text-xs font-mono uppercase tracking-wider">
                  Anthropic API Key
                </Label>
                {profile?.hasAnthropicKey ? (
                  <Badge className="bg-green-400/10 text-green-400 border-green-400/20 font-mono text-xs">
                    ✓ configured — {profile.anthropicApiKey}
                  </Badge>
                ) : (
                  <Badge className="bg-red-400/10 text-red-400 border-red-400/20 font-mono text-xs">
                    ✗ not set
                  </Badge>
                )}
              </div>
              <Input
                type="password"
                placeholder={
                  profile?.hasAnthropicKey
                    ? "Enter new key to replace existing"
                    : "sk-ant-..."
                }
                value={settingsForm.anthropicApiKey}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    anthropicApiKey: e.target.value,
                  })
                }
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
              />
            </div>

            {/* Preferred Provider */}
            <div className="space-y-1.5">
              <Label className="text-[#888888] text-xs font-mono uppercase tracking-wider">
                Preferred Provider
              </Label>
              <select
                value={settingsForm.preferredProvider}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    preferredProvider: e.target.value,
                  })
                }
                className="w-full bg-[#1a1a1a] border border-[#222222] text-[#fafafa] font-mono text-sm focus:border-amber-400 focus:outline-none rounded px-3 py-2"
              >
                <option value="openai">OpenAI — gpt-4o-mini</option>
                <option value="anthropic">Anthropic — claude-3-haiku</option>
              </select>
              <p className="text-xs text-[#555555] font-mono">
                This provider will be used for all eval runs
              </p>
            </div>
            <Button
              type="submit"
              disabled={settingsMutation.isPending}
              className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
            >
              {settingsMutation.isPending ? "Saving..." : "Save Settings →"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="bg-[#111111] border-[#222222]">
        <CardHeader className="pb-4">
          <CardTitle className="font-mono text-sm text-[#888888] uppercase tracking-wider">
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[#888888] text-xs font-mono uppercase tracking-wider">
                Current Password
              </Label>
              <Input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: e.target.value,
                  })
                }
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#888888] text-xs font-mono uppercase tracking-wider">
                New Password
              </Label>
              <Input
                type="password"
                required
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: e.target.value,
                  })
                }
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#888888] text-xs font-mono uppercase tracking-wider">
                Confirm New Password
              </Label>
              <Input
                type="password"
                required
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: e.target.value,
                  })
                }
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
              />
            </div>
            <Button
              type="submit"
              disabled={passwordMutation.isPending}
              className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
            >
              {passwordMutation.isPending ? "Updating..." : "Update Password →"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
