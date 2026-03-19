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
  getApiKeys,
  createApiKey,
  revokeApiKey,
  deleteApiKey,
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
  openaiModel: string;
  anthropicModel: string;
}

interface ApiKey {
  id: string;
  name: string;
  displayKey: string;
  keyPrefix: string;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
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
    openaiModel: "gpt-4o-mini",
    anthropicModel: "claude-haiku-4-5-20251001",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const { data: profile } = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const { data: apiKeys = [] } = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: getApiKeys,
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
        openaiModel: profile.openaiModel || "gpt-4o-mini",
        anthropicModel: profile.anthropicModel || "claude-haiku-4-5-20251001",
      });
    }
  }, [profile]);

  const settingsMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings updated");
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

  const createKeyMutation = useMutation({
    mutationFn: createApiKey,
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      setGeneratedKey(data.key);
      setNewKeyName("");
      toast.success("API key generated — save it now");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const revokeKeyMutation = useMutation({
    mutationFn: revokeApiKey,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Key revoked");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteKeyMutation = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Key deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleSettings = (e: React.FormEvent) => {
    e.preventDefault();
    settingsMutation.mutate({
      firstName: settingsForm.firstName,
      lastName: settingsForm.lastName,
      preferredProvider: settingsForm.preferredProvider,
      openaiModel: settingsForm.openaiModel,
      anthropicModel: settingsForm.anthropicModel,
      ...(settingsForm.openaiApiKey && {
        openaiApiKey: settingsForm.openaiApiKey,
      }),
      ...(settingsForm.anthropicApiKey && {
        anthropicApiKey: settingsForm.anthropicApiKey,
      }),
    });
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

  const labelClass =
    "text-[#888888] text-xs font-mono uppercase tracking-wider";
  const inputClass =
    "bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400";

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-mono text-2xl font-bold text-[#fafafa]">
          Settings
        </h1>
        <p className="text-[#888888] text-sm mt-1">
          Manage your account, API keys and LLM providers
        </p>
      </div>

      {/* Profile + LLM Config */}
      <Card className="bg-[#111111] border-[#222222] mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="font-mono text-sm text-[#888888] uppercase tracking-wider">
            Profile & LLM Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSettings} className="space-y-5">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={labelClass}>First name</Label>
                <Input
                  value={settingsForm.firstName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      firstName: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={labelClass}>Last name</Label>
                <Input
                  value={settingsForm.lastName}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      lastName: e.target.value,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>

            {/* OpenAI */}
            <div className="p-4 bg-[#0a0a0a] rounded border border-[#222222] space-y-3">
              <div className="flex items-center justify-between">
                <span className={labelClass}>OpenAI</span>
                {profile?.hasOpenaiKey ? (
                  <Badge className="bg-green-400/10 text-green-400 border-green-400/20 font-mono text-xs">
                    ✓ {profile.openaiApiKey}
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
                  profile?.hasOpenaiKey ? "Enter new key to replace" : "sk-..."
                }
                value={settingsForm.openaiApiKey}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    openaiApiKey: e.target.value,
                  })
                }
                className={inputClass}
              />
              <div className="space-y-1.5">
                <Label className={labelClass}>Model</Label>
                <Input
                  placeholder="gpt-4o-mini"
                  value={settingsForm.openaiModel}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      openaiModel: e.target.value,
                    })
                  }
                  className={inputClass}
                />
                <p className="text-xs text-[#555555] font-mono">
                  e.g. gpt-4o-mini, gpt-4o, gpt-4-turbo
                </p>
              </div>
            </div>

            {/* Anthropic */}
            <div className="p-4 bg-[#0a0a0a] rounded border border-[#222222] space-y-3">
              <div className="flex items-center justify-between">
                <span className={labelClass}>Anthropic</span>
                {profile?.hasAnthropicKey ? (
                  <Badge className="bg-green-400/10 text-green-400 border-green-400/20 font-mono text-xs">
                    ✓ {profile.anthropicApiKey}
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
                    ? "Enter new key to replace"
                    : "sk-ant-..."
                }
                value={settingsForm.anthropicApiKey}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    anthropicApiKey: e.target.value,
                  })
                }
                className={inputClass}
              />
              <div className="space-y-1.5">
                <Label className={labelClass}>Model</Label>
                <Input
                  placeholder="claude-haiku-4-5-20251001"
                  value={settingsForm.anthropicModel}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      anthropicModel: e.target.value,
                    })
                  }
                  className={inputClass}
                />
                <p className="text-xs text-[#555555] font-mono">
                  e.g. claude-haiku-4-5-20251001, claude-sonnet-4-5,
                  claude-opus-4-5
                </p>
              </div>
            </div>

            {/* Preferred Provider */}
            <div className="space-y-1.5">
              <Label className={labelClass}>Preferred Provider</Label>
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
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
              </select>
              <p className="text-xs text-[#555555] font-mono">
                Used for eval runs on the web app
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

      {/* Phasio API Keys */}
      <Card className="bg-[#111111] border-[#222222] mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="font-mono text-sm text-[#888888] uppercase tracking-wider">
            Phasio API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs font-mono text-[#555555]">
            Use these keys to authenticate the Phasio npm package in your CI/CD
            or local scripts.
          </p>

          {/* Generated key — shown once */}
          {generatedKey && (
            <div className="p-3 bg-amber-400/5 border border-amber-400/30 rounded space-y-2">
              <p className="text-xs font-mono text-amber-400 font-bold">
                ⚠ Save this key — it will not be shown again
              </p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-[#fafafa] bg-[#0a0a0a] px-3 py-2 rounded flex-1 break-all">
                  {generatedKey}
                </code>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(generatedKey);
                    toast.success("Copied");
                  }}
                  className="text-xs font-mono text-amber-400 hover:text-amber-300 shrink-0"
                >
                  copy
                </button>
              </div>
              <button
                onClick={() => setGeneratedKey(null)}
                className="text-xs font-mono text-[#555555] hover:text-red-400"
              >
                I&apos;ve saved it — dismiss
              </button>
            </div>
          )}

          {/* Generate new key */}
          <div className="flex gap-2">
            <Input
              placeholder="Key name (e.g. CI pipeline)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className={inputClass + " flex-1"}
            />
            <Button
              onClick={() => {
                if (newKeyName.trim())
                  createKeyMutation.mutate({ name: newKeyName.trim() });
              }}
              disabled={!newKeyName.trim() || createKeyMutation.isPending}
              className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm shrink-0"
            >
              Generate
            </Button>
          </div>

          {/* Existing keys */}
          {apiKeys.length === 0 ? (
            <p className="text-xs font-mono text-[#555555] text-center py-4">
              No API keys yet
            </p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded border border-[#222222]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#fafafa]">
                        {key.name}
                      </span>
                      {!key.isActive && (
                        <Badge className="bg-red-400/10 text-red-400 border-red-400/20 font-mono text-xs">
                          revoked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#444444]">
                        {key.displayKey}
                      </span>
                      <span className="text-xs font-mono text-[#444444]">
                        {key.usageCount} uses
                      </span>
                      {key.lastUsedAt && (
                        <span className="text-xs font-mono text-[#444444]">
                          last used{" "}
                          {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {key.isActive && (
                      <button
                        onClick={() => revokeKeyMutation.mutate(key.id)}
                        className="text-xs font-mono text-[#555555] hover:text-amber-400 transition-colors"
                      >
                        revoke
                      </button>
                    )}
                    <button
                      onClick={() => deleteKeyMutation.mutate(key.id)}
                      className="text-xs font-mono text-[#555555] hover:text-red-400 transition-colors"
                    >
                      delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
              <Label className={labelClass}>Current Password</Label>
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
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>New Password</Label>
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
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>Confirm New Password</Label>
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
                className={inputClass}
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
