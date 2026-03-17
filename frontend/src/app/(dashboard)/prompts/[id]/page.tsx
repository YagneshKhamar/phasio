"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getPrompt,
  createVersion,
  createSuite,
  deleteSuite,
  createTestCase,
  deleteTestCase,
} from "@/lib/api-functions";
import { getErrorMessage } from "@/lib/error";

interface Version {
  id: string;
  version: number;
  template: string;
  createdAt: string;
}

interface TestCase {
  id: string;
  input: string;
  checkType: string;
  checkValue: string;
}

interface Suite {
  id: string;
  name: string;
  cases: TestCase[];
}

interface Prompt {
  id: string;
  name: string;
  projectId: string;
  versions: Version[];
  suites: Suite[];
}

export default function PromptPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [showVersionForm, setShowVersionForm] = useState(false);
  const [versionTemplate, setVersionTemplate] = useState("");
  const [showSuiteForm, setShowSuiteForm] = useState(false);
  const [suiteName, setSuiteName] = useState("");
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);
  const [caseForm, setCaseForm] = useState({
    input: "",
    checkType: "contains",
    checkValue: "",
  });

  const { data: prompt, isLoading } = useQuery<Prompt>({
    queryKey: ["prompt", id],
    queryFn: () => getPrompt(id),
    enabled: !!id,
  });

  const addVersionMutation = useMutation({
    mutationFn: (template: string) => createVersion(id, { template }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompt", id] });
      toast.success("Version added");
      setVersionTemplate("");
      setShowVersionForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createSuiteMutation = useMutation({
    mutationFn: (name: string) => createSuite(id, { name }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompt", id] });
      toast.success("Suite created");
      setSuiteName("");
      setShowSuiteForm(false);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteSuiteMutation = useMutation({
    mutationFn: deleteSuite,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompt", id] });
      toast.success("Suite deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const createCaseMutation = useMutation({
    mutationFn: ({
      suiteId,
      data,
    }: {
      suiteId: string;
      data: { input: string; checkType: string; checkValue: string };
    }) => createTestCase(suiteId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompt", id] });
      toast.success("Test case added");
      setCaseForm({ input: "", checkType: "contains", checkValue: "" });
      setActiveSuiteId(null);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteCaseMutation = useMutation({
    mutationFn: ({ suiteId, caseId }: { suiteId: string; caseId: string }) =>
      deleteTestCase(suiteId, caseId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["prompt", id] });
      toast.success("Test case deleted");
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-[#111111] border border-[#222222] rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!prompt) return null;

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
        <Link
          href={`/projects/${prompt.projectId}`}
          className="hover:text-amber-400 transition-colors"
        >
          project
        </Link>
        <span>/</span>
        <span className="text-[#888888]">{prompt.name}</span>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-mono text-2xl font-bold text-[#fafafa]">
            {prompt.name}
          </h1>
          <p className="text-[#888888] text-sm mt-1">
            {prompt.versions.length} version
            {prompt.versions.length !== 1 ? "s" : ""} · {prompt.suites.length}{" "}
            suite{prompt.suites.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/prompts/${id}/history`}
            className="text-xs font-mono text-[#888888] hover:text-amber-400 transition-colors border border-[#222222] px-3 py-2 rounded"
          >
            History
          </Link>
          <Button
            onClick={() => router.push(`/prompts/${id}/eval`)}
            className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
          >
            Run Eval →
          </Button>
        </div>
      </div>

      <Tabs defaultValue="versions">
        <TabsList className="bg-[#111111] border border-[#222222] mb-6">
          <TabsTrigger
            value="versions"
            className="font-mono text-xs data-[state=active]:bg-amber-400 data-[state=active]:text-black"
          >
            Versions ({prompt.versions.length})
          </TabsTrigger>
          <TabsTrigger
            value="suites"
            className="font-mono text-xs data-[state=active]:bg-amber-400 data-[state=active]:text-black"
          >
            Test Suites ({prompt.suites.length})
          </TabsTrigger>
        </TabsList>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowVersionForm(!showVersionForm)}
              variant="outline"
              className="border-[#222222] text-[#888888] hover:text-amber-400 hover:border-amber-400 font-mono text-xs"
            >
              {showVersionForm ? "Cancel" : "+ Add Version"}
            </Button>
          </div>

          {showVersionForm && (
            <Card className="bg-[#111111] border-[#222222]">
              <CardContent className="pt-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!versionTemplate.includes("{{input}}")) {
                      toast.error("Template must contain {{input}} variable");
                      return;
                    }
                    addVersionMutation.mutate(versionTemplate);
                  }}
                  className="space-y-3"
                >
                  <textarea
                    required
                    placeholder="New prompt template — use {{input}} as the variable"
                    value={versionTemplate}
                    onChange={(e) => setVersionTemplate(e.target.value)}
                    rows={5}
                    className="w-full bg-[#1a1a1a] border border-[#222222] text-[#fafafa] font-mono text-sm focus:border-amber-400 focus:outline-none rounded px-3 py-2 resize-none placeholder:text-[#555555]"
                  />
                  <p className="text-xs text-[#555555] font-mono mt-1">
                    Use {"{{input}}"} where the test case input will be inserted
                  </p>
                  <Button
                    type="submit"
                    disabled={addVersionMutation.isPending}
                    className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
                  >
                    {addVersionMutation.isPending
                      ? "Adding..."
                      : "Add Version →"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {prompt.versions.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#222222] rounded">
              <p className="font-mono text-[#888888]">No versions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {prompt.versions.map((version) => (
                <Card
                  key={version.id}
                  className="bg-[#111111] border-[#222222]"
                >
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between mb-3">
                      <Badge className="bg-amber-400/10 text-amber-400 border-amber-400/20 font-mono text-xs">
                        v{version.version}
                      </Badge>
                      <span className="text-xs text-[#555555] font-mono">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <pre className="text-sm text-[#888888] font-mono bg-[#0a0a0a] rounded p-3 whitespace-pre-wrap overflow-auto max-h-32 border border-[#222222]">
                      {version.template}
                    </pre>
                    <p className="text-xs text-[#555555] font-mono mt-2">
                      id: {version.id}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Suites Tab */}
        <TabsContent value="suites" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => setShowSuiteForm(!showSuiteForm)}
              variant="outline"
              className="border-[#222222] text-[#888888] hover:text-amber-400 hover:border-amber-400 font-mono text-xs"
            >
              {showSuiteForm ? "Cancel" : "+ New Suite"}
            </Button>
          </div>

          {showSuiteForm && (
            <Card className="bg-[#111111] border-[#222222]">
              <CardContent className="pt-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createSuiteMutation.mutate(suiteName);
                  }}
                  className="space-y-3"
                >
                  <Input
                    required
                    placeholder="Suite name"
                    value={suiteName}
                    onChange={(e) => setSuiteName(e.target.value)}
                    className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono focus:border-amber-400"
                  />
                  <Button
                    type="submit"
                    disabled={createSuiteMutation.isPending}
                    className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-sm"
                  >
                    {createSuiteMutation.isPending
                      ? "Creating..."
                      : "Create Suite →"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {prompt.suites.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#222222] rounded">
              <p className="font-mono text-[#888888]">No suites yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {prompt.suites.map((suite) => (
                <Card key={suite.id} className="bg-[#111111] border-[#222222]">
                  <CardHeader className="pb-3 pt-4 px-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-mono text-sm text-[#fafafa]">
                        {suite.name}
                      </CardTitle>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-[#555555]">
                          {suite.cases.length} case
                          {suite.cases.length !== 1 ? "s" : ""}
                        </span>
                        <button
                          onClick={() =>
                            setActiveSuiteId(
                              activeSuiteId === suite.id ? null : suite.id,
                            )
                          }
                          className="text-xs font-mono text-[#888888] hover:text-amber-400 transition-colors"
                        >
                          + add case
                        </button>
                        <button
                          onClick={() => deleteSuiteMutation.mutate(suite.id)}
                          className="text-xs font-mono text-[#555555] hover:text-red-400 transition-colors"
                        >
                          delete
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 space-y-3">
                    {activeSuiteId === suite.id && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          createCaseMutation.mutate({
                            suiteId: suite.id,
                            data: caseForm,
                          });
                        }}
                        className="space-y-2 p-3 bg-[#0a0a0a] rounded border border-[#222222]"
                      >
                        <textarea
                          required
                          placeholder="Input — what you'll send to the LLM"
                          value={caseForm.input}
                          onChange={(e) =>
                            setCaseForm({ ...caseForm, input: e.target.value })
                          }
                          rows={2}
                          className="w-full bg-[#1a1a1a] border border-[#222222] text-[#fafafa] font-mono text-xs focus:border-amber-400 focus:outline-none rounded px-3 py-2 resize-none placeholder:text-[#555555]"
                        />
                        <select
                          value={caseForm.checkType}
                          onChange={(e) =>
                            setCaseForm({
                              ...caseForm,
                              checkType: e.target.value,
                            })
                          }
                          className="w-full bg-[#1a1a1a] border border-[#222222] text-[#fafafa] font-mono text-xs focus:border-amber-400 focus:outline-none rounded px-3 py-2"
                        >
                          <option value="contains">contains</option>
                          <option value="not_contains">not_contains</option>
                          <option value="regex">regex</option>
                          <option value="llm_judge">llm_judge</option>
                        </select>
                        <Input
                          required
                          placeholder={
                            caseForm.checkType === "contains"
                              ? "String the output must contain"
                              : "Scoring criteria for LLM judge"
                          }
                          value={caseForm.checkValue}
                          onChange={(e) =>
                            setCaseForm({
                              ...caseForm,
                              checkValue: e.target.value,
                            })
                          }
                          className="bg-[#1a1a1a] border-[#222222] text-[#fafafa] font-mono text-xs focus:border-amber-400"
                        />
                        <Button
                          type="submit"
                          disabled={createCaseMutation.isPending}
                          className="bg-amber-400 hover:bg-amber-300 text-black font-mono font-semibold text-xs h-8"
                        >
                          {createCaseMutation.isPending
                            ? "Adding..."
                            : "Add Case →"}
                        </Button>
                      </form>
                    )}

                    {suite.cases.length === 0 ? (
                      <p className="text-xs font-mono text-[#555555] text-center py-4">
                        No test cases yet
                      </p>
                    ) : (
                      suite.cases.map((tc) => (
                        <div
                          key={tc.id}
                          className="flex items-start justify-between gap-3 p-3 bg-[#0a0a0a] rounded border border-[#222222]"
                        >
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-mono text-[#fafafa]">
                              {tc.input}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-[#1a1a1a] text-[#888888] border-[#222222] font-mono text-xs">
                                {tc.checkType}
                              </Badge>
                              <span className="text-xs text-[#555555] font-mono">
                                {tc.checkValue}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              deleteCaseMutation.mutate({
                                suiteId: suite.id,
                                caseId: tc.id,
                              })
                            }
                            className="text-xs font-mono text-[#555555] hover:text-red-400 transition-colors shrink-0"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <button
        onClick={() => router.back()}
        className="mt-8 text-xs font-mono text-[#555555] hover:text-amber-400 transition-colors"
      >
        ← back
      </button>
    </div>
  );
}
