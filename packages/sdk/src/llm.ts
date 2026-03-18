import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ProviderConfig } from "./types";

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
      throw new Error(
        `${config.provider} rate limit exceeded — check your billing`,
      );
    throw new Error(
      `${config.provider} error: ${error.message ?? "Unknown error"}`,
    );
  }

  return { output, latencyMs: Date.now() - start };
}

export async function callLlmJudge(
  output: string,
  criteria: string,
  config: ProviderConfig,
): Promise<{ passed: boolean; score: number; reason: string }> {
  const systemPrompt = `You are an evaluator. Score the given output against the criteria from 1-10.
Respond ONLY with a valid JSON object: {"score": 7, "reason": "your reason here"}
No markdown, no backticks, just raw JSON.`;

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
    return {
      passed: parsed.score >= 7,
      score: parsed.score,
      reason: parsed.reason,
    };
  } catch {
    return {
      passed: false,
      score: 0,
      reason: "Failed to parse judge response",
    };
  }
}
