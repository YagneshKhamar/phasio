import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { ProviderConfig, JudgeScore } from '../types';

const PARSE_ERROR_SCORE = -1;
const PARSE_ERROR_REASON = 'parse error — judge returned invalid JSON';
const JUDGE_PASS_THRESHOLD = 7;

// ─── LLM call ─────────────────────────────────────────────────────────────────

export async function callLlm(
  prompt: string,
  config: ProviderConfig,
): Promise<{ output: string; latencyMs: number }> {
  const start = Date.now();
  let output = '';

  try {
    if (config.provider === 'anthropic') {
      const client = new Anthropic({ apiKey: config.llmKey });
      const response = await client.messages.create({
        model: config.model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const block = response.content[0];
      output = (block?.type === 'text' ? block.text : '') ?? '';
    } else {
      const client = new OpenAI({ apiKey: config.llmKey });
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      });
      output = response.choices[0]?.message?.content ?? '';
    }
  } catch (err: unknown) {
    const error = err as { status?: number; message?: string };
    if (error.status === 401) throw new Error(`Invalid ${config.provider} API key`);
    if (error.status === 429) throw new Error(`${config.provider} rate limit exceeded`);
    throw new Error(`${config.provider} error: ${error.message ?? 'Unknown error'}`);
  }

  return { output, latencyMs: Date.now() - start };
}

// ─── Judge ────────────────────────────────────────────────────────────────────

function extractJson(raw: string): string {
  const stripped = raw.replace(/```(?:json)?\n?([\s\S]*?)```/g, '$1').trim();
  if (stripped.startsWith('{')) return stripped;
  const match = raw.match(/\{[\s\S]*?\}/);
  return match ? match[0] : '{}';
}

async function callSingleJudge(
  output: string,
  criteria: string,
  config: ProviderConfig,
): Promise<{ score: number; reason: string }> {
  const systemPrompt = [
    'You are an evaluator. Score the given output against the criteria from 1-10.',
    'You MUST respond with ONLY a raw JSON object. No markdown, no backticks, no preamble.',
    '{"score": 7, "reason": "your reason here"}',
    'Score must be an integer from 1 to 10.',
  ].join('\n');

  const userPrompt = `Criteria: ${criteria}\n\nOutput to evaluate: ${output}`;
  let raw = '{}';

  try {
    if (config.provider === 'anthropic') {
      const client = new Anthropic({ apiKey: config.llmKey });
      const response = await client.messages.create({
        model: config.model,
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const block = response.content[0];
      raw = (block?.type === 'text' ? block.text : '{}') ?? '{}';
    } else {
      const client = new OpenAI({ apiKey: config.llmKey });
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      raw = response.choices[0]?.message?.content ?? '{}';
    }

    const extracted = extractJson(raw);
    const parsed = JSON.parse(extracted) as { score: number; reason: string };
    const score = Number(parsed.score);

    if (isNaN(score) || score < 1 || score > 10) {
      return { score: PARSE_ERROR_SCORE, reason: PARSE_ERROR_REASON };
    }

    return { score, reason: parsed.reason ?? '' };
  } catch {
    return { score: PARSE_ERROR_SCORE, reason: PARSE_ERROR_REASON };
  }
}

export async function callLlmJudge(
  output: string,
  criteria: string,
  judges: ProviderConfig[],
): Promise<{ passed: boolean; score: number; reason: string; judgeScores: JudgeScore[] }> {
  const individualResults = await Promise.all(
    judges.map((judge) => callSingleJudge(output, criteria, judge)),
  );

  const judgeScores: JudgeScore[] = individualResults.map((r, i) => ({
    provider: judges[i]!.provider,
    model: judges[i]!.model,
    score: r.score,
    reason: r.reason,
  }));

  const validScores = judgeScores.filter((j) => j.score !== PARSE_ERROR_SCORE);
  const errorScores = judgeScores.filter((j) => j.score === PARSE_ERROR_SCORE);

  if (validScores.length === 0) {
    return {
      passed: false,
      score: 0,
      reason: `all judges failed to parse response (${judges.map((j) => j.provider).join(', ')})`,
      judgeScores,
    };
  }

  const avgScore = validScores.reduce((s, j) => s + j.score, 0) / validScores.length;
  const roundedAvg = Math.round(avgScore * 10) / 10;

  const closest = validScores.reduce((prev, curr) =>
    Math.abs(curr.score - avgScore) < Math.abs(prev.score - avgScore) ? curr : prev,
  );

  const parseErrorNote =
    errorScores.length > 0
      ? ` [${errorScores.map((j) => j.provider).join(', ')}: parse error — excluded]`
      : '';

  const reason =
    validScores.length === 1 && errorScores.length === 0
      ? closest.reason
      : `avg ${roundedAvg}/10 — ${closest.reason}${parseErrorNote}`;

  return { passed: roundedAvg >= JUDGE_PASS_THRESHOLD, score: roundedAvg, reason, judgeScores };
}
