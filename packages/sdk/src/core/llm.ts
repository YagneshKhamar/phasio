import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ProviderConfig, JudgeScore } from "../types";

export async function callLlm(
  prompt: string,
  config: ProviderConfig,
): Promise<{ output: string; latencyMs: number }> {
  const start = Date.now();
  let output = "";

  try {
    if (config.provider === "anthropic") {
      const client = new Anthropic({ apiKey: config.llmKey });
      const response = await client.messages.create({
        model: config.model,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content[0];
      output = block.type === "text" ? block.text : "";
    } else {
      const client = new OpenAI({ apiKey: config.llmKey });
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
      });
      output = response.choices[0]?.message?.content ?? "";
    }
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 401)
      throw new Error(`Invalid ${config.provider} API key`);
    if (error.status === 429)
      throw new Error(`${config.provider} rate limit exceeded`);
    throw new Error(
      `${config.provider} error: ${error.message ?? "Unknown error"}`,
    );
  }

  return { output, latencyMs: Date.now() - start };
}

async function callSingleJudge(
  output: string,
  criteria: string,
  config: ProviderConfig,
): Promise<{ score: number; reason: string }> {
  const systemPrompt = `You are an evaluator. Score the given output against the criteria from 1-10.\nRespond ONLY with a valid JSON object: {"score": 7, "reason": "your reason here"}\nNo markdown, no backticks, just raw JSON.`;
  const userPrompt = `Criteria: ${criteria}\n\nOutput to evaluate: ${output}`;
  let raw = "{}";

  try {
    if (config.provider === "anthropic") {
      const client = new Anthropic({ apiKey: config.llmKey });
      const response = await client.messages.create({
        model: config.model,
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });
      const block = response.content[0];
      raw = block.type === "text" ? block.text : "{}";
    } else {
      const client = new OpenAI({ apiKey: config.llmKey });
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0,
      });
      raw = response.choices[0]?.message?.content ?? "{}";
    }
    const parsed = JSON.parse(raw) as { score: number; reason: string };
    return { score: parsed.score, reason: parsed.reason };
  } catch {
    return { score: 0, reason: "Failed to parse judge response" };
  }
}

export async function callLlmJudge(
  output: string,
  criteria: string,
  judges: ProviderConfig[],
): Promise<{
  passed: boolean;
  score: number;
  reason: string;
  judgeScores: JudgeScore[];
}> {
  // Run all judges in parallel
  const individualResults = await Promise.all(
    judges.map((judge) => callSingleJudge(output, criteria, judge)),
  );

  const judgeScores: JudgeScore[] = individualResults.map((r, i) => ({
    provider: judges[i].provider,
    model: judges[i].model,
    score: r.score,
    reason: r.reason,
  }));

  // Average all judge scores
  const avgScore =
    judgeScores.reduce((s, j) => s + j.score, 0) / judgeScores.length;
  const roundedAvg = Math.round(avgScore * 10) / 10;

  // Use the reason from the judge whose score is closest to the average
  const closest = judgeScores.reduce((prev, curr) =>
    Math.abs(curr.score - avgScore) < Math.abs(prev.score - avgScore)
      ? curr
      : prev,
  );

  return {
    passed: roundedAvg >= 7,
    score: roundedAvg,
    reason:
      judgeScores.length === 1
        ? closest.reason
        : `avg ${roundedAvg}/10 — ${closest.reason}`,
    judgeScores,
  };
}
