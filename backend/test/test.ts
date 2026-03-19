// test it with npx ts-node test/test.ts
import { Phasio, contains, notContains, matches, llmJudge } from 'phasio';

async function main() {
  const pe = new Phasio({
    baseUrl: 'http://localhost:2000',
    apiKey:
      'pe-52fe27e381afca63d053db12e02a68b24996502d12d5064b618fb0abccd15dc7', // generate one from your settings page
    providers: [
      {
        provider: 'openai',
        llmKey:
          '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',
        model: 'gpt-4o-mini',
      },
      // {
      //   provider: 'anthropic',
      //   llmKey:
      //     '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',
      //   model: 'claude-haiku-4-5-20251001',
      // },
    ],
  });

  await pe.compare({
    versions: [
      { label: 'v1', template: 'Answer this question briefly: {{input}}' },
      { label: 'v2', template: 'Give a one sentence answer to: {{input}}' },
    ],
    tests: [
      { input: 'What is the capital of France?', expect: contains('Paris') },
      { input: 'What is 2 + 2?', expect: matches(/\b4\b/) },
      { input: 'What color is the sky?', expect: notContains('I cannot') },
      {
        input: 'Write a haiku about rain',
        expect: llmJudge('Must follow 5-7-5 syllable structure'),
      },
    ],
  });
}

main().catch((err) => {
  console.error('Error running Phasio:', err);
  process.exit(1);
});
