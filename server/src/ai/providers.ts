import type { IAIProvider } from './IAIProvider';
import type { SponsorSegment } from '../types';
import { SYSTEM_PROMPT } from './systemPrompt';
import { parseSegments } from './parseSegments';

type ProviderKey = 'gemini' | 'openai' | 'claude' | 'deepseek';

interface ProviderConfig {
  name: ProviderKey;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
  buildUrl: (model: string, apiKey: string) => string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (model: string, transcript: string) => unknown;
  extractText: (data: unknown) => string;
}

const CONFIGS: Record<ProviderKey, ProviderConfig> = {
  gemini: {
    name: 'gemini',
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-1.5-flash',
    buildUrl: (model, key) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (model, transcript) => ({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      generationConfig: { temperature: 0.0, responseMimeType: 'application/json' },
    }),
    extractText: (data) => {
      const d = data as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
      return d.candidates[0]?.content?.parts[0]?.text ?? '[]';
    },
  },

  openai: {
    name: 'openai',
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
    buildUrl: () => 'https://api.openai.com/v1/chat/completions',
    buildHeaders: (key) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }),
    buildBody: (model, transcript) => ({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
    }),
    extractText: (data) => {
      const d = data as { choices: Array<{ message: { content: string } }> };
      return d.choices[0]?.message?.content ?? '[]';
    },
  },

  claude: {
    name: 'claude',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'CLAUDE_MODEL',
    defaultModel: 'claude-3-5-haiku-20241022',
    buildUrl: () => 'https://api.anthropic.com/v1/messages',
    buildHeaders: (key) => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (model, transcript) => ({
      model,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
    extractText: (data) => {
      const d = data as { content: Array<{ type: string; text: string }> };
      return d.content.find((b) => b.type === 'text')?.text ?? '[]';
    },
  },

  deepseek: {
    name: 'deepseek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat',
    buildUrl: () => 'https://api.deepseek.com/v1/chat/completions',
    buildHeaders: (key) => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }),
    buildBody: (model, transcript) => ({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
    }),
    extractText: (data) => {
      const d = data as { choices: Array<{ message: { content: string } }> };
      return d.choices[0]?.message?.content ?? '[]';
    },
  },
};

class LLMProvider implements IAIProvider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly config: ProviderConfig;

  constructor(key: ProviderKey) {
    this.config = CONFIGS[key];
    const apiKey = process.env[this.config.apiKeyEnv];
    if (!apiKey) throw new Error(`${this.config.apiKeyEnv} is not set.`);
    this.apiKey = apiKey;
    this.model = process.env[this.config.modelEnv] ?? this.config.defaultModel;
    this.name = this.config.name;
  }

  async analyzeTranscript(transcript: string): Promise<SponsorSegment[]> {
    const url = this.config.buildUrl(this.model, this.apiKey);
    const res = await fetch(url, {
      method: 'POST',
      headers: this.config.buildHeaders(this.apiKey),
      body: JSON.stringify(this.config.buildBody(this.model, transcript)),
    });

    if (!res.ok) {
      throw new Error(`[${this.name}] API error ${res.status}: ${await res.text()}`);
    }

    return parseSegments(this.config.extractText(await res.json()));
  }
}

export class AIProviderFactory {
  private static instance: IAIProvider | null = null;

  static create(): IAIProvider {
    if (this.instance) return this.instance;

    const key = (process.env.ACTIVE_LLM ?? 'gemini').toLowerCase() as ProviderKey;
    if (!CONFIGS[key]) {
      throw new Error(
        `Unknown ACTIVE_LLM "${key}". Valid values: ${Object.keys(CONFIGS).join(', ')}`,
      );
    }

    this.instance = new LLMProvider(key);
    console.info(`[AIProviderFactory] Active provider: ${this.instance.name}`);
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
  }
}
