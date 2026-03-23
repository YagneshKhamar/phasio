"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  getProjects,
  getPromptsByProject,
  createPrompt,
  deletePrompt,
} from "@/lib/api-functions";
import { getErrorMessage } from "@/lib/error";

interface Prompt {
  id: string;
  name: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

export default function ProjectPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", template: "" });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const project = (projects as Project[]).find((p) => p.id === id);

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ["prompts", id],
    queryFn: () => getPromptsByProject(id),
    enabled: !!id,
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; template: string }) =>
      createPrompt(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompts", id] });
      toast.success("Prompt created");
      setForm({ name: "", template: "" });
      setShowForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePrompt,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompts", id] });
      toast.success("Prompt deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Prompt name is required");
      return;
    }

    if (!form.template.includes("{{input}}")) {
      toast.error("Template must contain {{input}} variable");
      return;
    }
    createMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-[#111111] border border-[#222222] rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 text-sm font-mono text-[#555555] mb-6">
        <Link
          href="/dashboard"
          className="hover:text-amber-400 transition-colors"
        >
          projects
        </Link>
        <span>/</span>
        <span className="text-[#888888]">{project?.name}</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-mono text-2xl font-bold text-[#fafafa]">
            {project?.name}
          </h1>
          {project?.description && (
            <p className="text-[#888888] text-sm mt-1">{project.description}</p>
          )}
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
        >
          {showForm ? "Cancel" : "+ New Prompt"}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-[#111111] border-[#222222] mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                required
                placeholder="Prompt name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
              />
              <textarea
                required
                placeholder="Prompt template — MUST include {{input}} as the variable e.g. 'Answer this question: {{input}}'"
                value={form.template}
                onChange={(e) => setForm({ ...form, template: e.target.value })}
                rows={4}
                className="w-full bg-[#1a1a1a] border border-[#222222] text-[#fafafa] font-mono text-sm focus:border-amber-400 focus:outline-none rounded px-3 py-2 resize-none placeholder:text-[#555555]"
              />
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
              >
                {createMutation.isPending ? "Creating..." : "Create Prompt →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {(prompts as Prompt[]).length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#222222] rounded">
          <p className="font-mono text-[#888888]">No prompts yet</p>
          <p className="text-sm text-[#555555] mt-1">
            Create your first prompt to start testing
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(prompts as Prompt[]).map((prompt) => (
            <Card
              key={prompt.id}
              className="bg-[#111111] border-[#222222] hover:border-amber-400/30 transition-colors group"
            >
              <CardContent className="py-4 px-5 flex items-center justify-between">
                <div
                  onClick={() => router.push(`/prompts/${prompt.id}`)}
                  className="flex-1 cursor-pointer"
                >
                  <h3 className="font-mono font-semibold text-[#fafafa] group-hover:text-amber-400 transition-colors">
                    {prompt.name}
                  </h3>
                  <p className="text-xs text-[#555555] font-mono mt-1">
                    created {new Date(prompt.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/prompts/${prompt.id}`)}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-[#333333] text-[#cccccc] hover:border-amber-400 hover:text-amber-400 transition-colors"
                  >
                    open →
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(prompt.id)}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-[#333333] text-[#888888] hover:border-red-400 hover:text-red-400 transition-colors"
                  >
                    delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <button
        onClick={() => router.back()}
        className="mt-8 text-xs font-mono text-[#555555] hover:text-amber-400 transition-colors"
      >
        ← back
      </button>
    </div>
  );
}
