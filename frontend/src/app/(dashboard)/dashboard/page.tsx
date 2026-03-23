"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { getProjects, createProject, deleteProject } from "@/lib/api-functions";
import { getErrorMessage } from "@/lib/error";

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: getProjects,
  });

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created");
      setForm({ name: "", description: "" });
      setShowForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-mono text-2xl font-bold text-[#fafafa]">
            Projects
          </h1>
          <p className="text-[#888888] text-sm mt-1">
            Manage your prompt testing projects
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
        >
          {showForm ? "Cancel" : "+ New Project"}
        </Button>
      </div>

      {showForm && (
        <Card className="bg-[#111111] border-[#222222] mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-3">
              <Input
                required
                placeholder="Project name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
              />
              <Input
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
              />
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
              >
                {createMutation.isPending ? "Creating..." : "Create Project →"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-[#111111] border border-[#222222] rounded animate-pulse"
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-[#222222] rounded">
          <p className="font-mono text-[#888888]">No projects yet</p>
          <p className="text-sm text-[#555555] mt-1">
            Create your first project to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(projects as Project[]).map((project) => (
            <Card
              key={project.id}
              className="bg-[#111111] border-[#222222] hover:border-amber-400/30 transition-colors cursor-pointer group"
            >
              <CardContent className="py-4 px-5 flex items-center justify-between">
                <div
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="flex-1"
                >
                  <h3 className="font-mono font-semibold text-[#fafafa] group-hover:text-amber-400 transition-colors">
                    {project.name}
                  </h3>
                  {project.description && (
                    <p className="text-sm text-[#888888] mt-0.5">
                      {project.description}
                    </p>
                  )}
                  <p className="text-xs text-[#555555] font-mono mt-1">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-[#333333] text-[#cccccc] hover:border-amber-400 hover:text-amber-400 transition-colors"
                  >
                    open →
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(project.id)}
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
    </div>
  );
}
