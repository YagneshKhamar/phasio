import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

export async function runLlmJudge(
  output: string,
  criteria: string,
  apiKey: string,
  provider: 'openai' | 'anthropic' = 'openai',
): Promise<{ passed: boolean; score: number; reason: string }> {
  const systemPrompt = `You are an evaluator. Score the given output against the criteria from 1-10.
Respond ONLY with a valid JSON object in this exact format:
{"score": 7, "reason": "your reason here"}
No markdown, no backticks, just raw JSON.`;

  const userPrompt = `Criteria: ${criteria}\n\nOutput to evaluate: ${output}`;

  let raw = '{}';

  try {
    if (provider === 'anthropic') {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 256,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const block = response.content[0];
      raw = block.type === 'text' ? block.text : '{}';
    } else {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
      });
      raw = response.choices[0]?.message?.content ?? '{}';
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
      reason: 'Failed to parse judge response',
    };
  }
}
