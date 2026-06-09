import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { AIProviderFactory } from '../src/ai/providers';
import type { SponsorSegment } from '../src/types';
import { dataset } from './fixtures/dataset';

const PROVIDERS = ['gemini', 'openai', 'claude', 'deepseek'] as const;
type ProviderKey = (typeof PROVIDERS)[number];

interface Metrics {
  totalTests: number;
  categoryMatches: number;
  overlapMatches: number;
  cleanJsonResponses: number;
}

const metrics: Record<ProviderKey, Metrics> = {
  gemini: { totalTests: 0, categoryMatches: 0, overlapMatches: 0, cleanJsonResponses: 0 },
  openai: { totalTests: 0, categoryMatches: 0, overlapMatches: 0, cleanJsonResponses: 0 },
  claude: { totalTests: 0, categoryMatches: 0, overlapMatches: 0, cleanJsonResponses: 0 },
  deepseek: { totalTests: 0, categoryMatches: 0, overlapMatches: 0, cleanJsonResponses: 0 },
};

let currentProvider: ProviderKey | null = null;
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = (async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ) => {
    const response = await originalFetch(input, init);
    const cloned = response.clone();

    try {
      const data = await cloned.json();
      let rawText = '';

      if (currentProvider === 'gemini') {
        const d = data as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
        rawText = d.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      } else if (currentProvider === 'openai' || currentProvider === 'deepseek') {
        const d = data as { choices: Array<{ message: { content: string } }> };
        rawText = d.choices?.[0]?.message?.content ?? '';
      } else if (currentProvider === 'claude') {
        const d = data as { content: Array<{ type: string; text: string }> };
        rawText = d.content?.find((b) => b.type === 'text')?.text ?? '';
      }

      if (currentProvider && rawText) {
        if (!rawText.trim().startsWith('```')) {
          metrics[currentProvider].cleanJsonResponses++;
        }
      }
    } catch {}

    return response;
  }) as typeof fetch;
});

afterAll(() => {
  global.fetch = originalFetch;

  // Print summary table
  const tableData = PROVIDERS.map((provider) => {
    const m = metrics[provider];
    if (m.totalTests === 0) {
      return { Provider: provider, Status: 'Skipped (No API Key)' };
    }
    return {
      Provider: provider,
      'Category Precision': `${Math.round((m.categoryMatches / Math.max(m.totalTests, 1)) * 100)}%`,
      'Timestamp Overlap Tolerance': `${Math.round((m.overlapMatches / Math.max(m.totalTests, 1)) * 100)}%`,
      'JSON Strictness Rate': `${Math.round((m.cleanJsonResponses / Math.max(m.totalTests, 1)) * 100)}%`,
    };
  });

  console.log('\n--- AI Provider Benchmarking Summary ---');
  console.table(tableData);
});

describe('AI Provider Benchmarking', () => {
  for (const providerKey of PROVIDERS) {
    describe(`${providerKey} evaluation`, () => {
      // Check if API key is present
      const envKeyMap: Record<ProviderKey, string> = {
        gemini: 'GEMINI_API_KEY',
        openai: 'OPENAI_API_KEY',
        claude: 'ANTHROPIC_API_KEY',
        deepseek: 'DEEPSEEK_API_KEY',
      };

      const hasApiKey = !!process.env[envKeyMap[providerKey]];

      if (!hasApiKey) {
        test.skip(`Skipping ${providerKey} because ${envKeyMap[providerKey]} is not set`, () => {});
        return; // Skip all dataset fixtures for this provider
      }

      for (const fixture of dataset) {
        test(
          `${fixture.name}`,
          async () => {
            currentProvider = providerKey;
            process.env.ACTIVE_LLM = providerKey;
            AIProviderFactory.reset();
            const provider = AIProviderFactory.create();

            // We expect at least the API call to succeed
            let segments: SponsorSegment[];
            try {
              segments = await provider.analyzeTranscript(fixture.transcript);
            } catch (err) {
              console.error(`[${providerKey}] failed to analyze:`, err);
              segments = [];
            }

            const m = metrics[providerKey];

            // Determine matches
            if (fixture.expectedSegments.length === 0) {
              m.totalTests++;
              if (segments.length === 0) {
                m.categoryMatches++;
                m.overlapMatches++;
              }
            } else {
              // For this benchmark, we'll check if the *first* expected segment was found.
              m.totalTests++;

              const expected = fixture.expectedSegments[0];
              if (!expected) return;
              const detected = segments.find((s) => s.category === expected.category);

              if (detected) {
                m.categoryMatches++;

                // Timestamp overlap tolerance +/- 3 seconds
                const startOverlap = Math.abs(detected.start - expected.start) <= 3;
                const endOverlap = Math.abs(detected.end - expected.end) <= 3;

                if (startOverlap && endOverlap) {
                  m.overlapMatches++;
                }
              } else {
                const nearMatch = segments.find(
                  (s) =>
                    Math.abs(s.start - expected.start) <= 3 && Math.abs(s.end - expected.end) <= 3,
                );
                if (nearMatch) {
                  m.overlapMatches++;
                }
              }
            }

            expect(segments).toBeInstanceOf(Array);
          },
          { timeout: 30000 },
        );
      }
    });
  }
});
