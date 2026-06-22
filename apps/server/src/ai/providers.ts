import { parseSegments, type SponsorSegment } from './segments';
import { SYSTEM_PROMPT } from './prompt';

type ProviderKey = 'gemini' | 'openai' | 'claude' | 'deepseek';
export interface IAIProvider {
  readonly name: string;
  analyzeTranscript(transcript: string): Promise<Omit<SponsorSegment, 'uuid'>[]>;
}


interface ProviderConfig {
  name: ProviderKey;
  apiKeyEnv: string;
  modelEnv: string;
  defaultModel: string;
  buildUrl: (modelId: string, apiKey: string) => string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (modelId: string, transcript: string) => unknown;
  extractText: (apiResponsePayload: unknown) => string;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface ClaudeResponse {
  content?: Array<{ type?: string; text?: string }>;
}

const PROVIDER_CONFIGURATIONS: Record<ProviderKey, ProviderConfig> = {
  gemini: {
    name: 'gemini',
    apiKeyEnv: 'GEMINI_API_KEY',
    modelEnv: 'GEMINI_MODEL',
    defaultModel: 'gemini-3.5-flash',
    buildUrl: (modelId, apiKey) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    buildHeaders: () => ({ 'Content-Type': 'application/json' }),
    buildBody: (_modelId, transcript) => ({
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: transcript }] }],
      generationConfig: { temperature: 0.0, responseMimeType: 'application/json' },
    }),
    extractText: (apiResponsePayload: unknown): string => {
      const typedPayload = apiResponsePayload as GeminiResponse;
      return typedPayload.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]';
    },
  },

  openai: {
    name: 'openai',
    apiKeyEnv: 'OPENAI_API_KEY',
    modelEnv: 'OPENAI_MODEL',
    defaultModel: 'gpt-4o-mini',
    buildUrl: () => 'https://api.openai.com/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (modelId, transcript) => ({
      model: modelId,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
    }),
    extractText: (apiResponsePayload: unknown): string => {
      const typedPayload = apiResponsePayload as OpenAiResponse;
      return typedPayload.choices?.[0]?.message?.content ?? '[]';
    },
  },

  claude: {
    name: 'claude',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    modelEnv: 'CLAUDE_MODEL',
    defaultModel: 'claude-3-5-haiku-20241022',
    buildUrl: () => 'https://api.anthropic.com/v1/messages',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (modelId, transcript) => ({
      model: modelId,
      max_tokens: 1024,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: transcript }],
    }),
    extractText: (apiResponsePayload: unknown): string => {
      const typedPayload = apiResponsePayload as ClaudeResponse;
      return (
        typedPayload.content?.find((messageBlock) => messageBlock.type === 'text')?.text ?? '[]'
      );
    },
  },

  deepseek: {
    name: 'deepseek',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    modelEnv: 'DEEPSEEK_MODEL',
    defaultModel: 'deepseek-chat',
    buildUrl: () => 'https://api.deepseek.com/v1/chat/completions',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    }),
    buildBody: (modelId, transcript) => ({
      model: modelId,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: transcript },
      ],
    }),
    extractText: (apiResponsePayload: unknown): string => {
      const typedPayload = apiResponsePayload as OpenAiResponse;
      return typedPayload.choices?.[0]?.message?.content ?? '[]';
    },
  },
};

class LLMProvider implements IAIProvider {
  readonly name: string;
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly configuration: ProviderConfig;

  constructor(providerId: ProviderKey) {
    this.configuration = PROVIDER_CONFIGURATIONS[providerId];

    const environmentApiKey = process.env[this.configuration.apiKeyEnv];
    if (!environmentApiKey) {
      throw new Error(`${this.configuration.apiKeyEnv} is not set.`);
    }

    this.apiKey = environmentApiKey;
    this.modelId = process.env[this.configuration.modelEnv] ?? this.configuration.defaultModel;
    this.name = this.configuration.name;
  }

  async analyzeTranscript(transcriptText: string): Promise<Omit<SponsorSegment, 'uuid'>[]> {
    const endpointUrl = this.configuration.buildUrl(this.modelId, this.apiKey);

    const apiResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: this.configuration.buildHeaders(this.apiKey),
      body: JSON.stringify(this.configuration.buildBody(this.modelId, transcriptText)),
    });

    if (!apiResponse.ok) {
      throw new Error(
        `[${this.name}] API error ${apiResponse.status}: ${await apiResponse.text()}`,
      );
    }

    const responseJson = await apiResponse.json();
    const extractedText = this.configuration.extractText(responseJson);

    return parseSegments(extractedText);
  }
}

let activeProviderInstances: Record<string, IAIProvider> = {};

export const AIProviderFactory = {
  create(requestedProviderId?: string): IAIProvider {
    const rawKey = (requestedProviderId ?? process.env.ACTIVE_LLM ?? 'gemini').toLowerCase();

    if (!(rawKey in PROVIDER_CONFIGURATIONS)) {
      const validProvidersList = Object.keys(PROVIDER_CONFIGURATIONS).join(', ');
      throw new Error(`Unknown provider "${rawKey}". Valid values: ${validProvidersList}`);
    }

    const activeProviderKey = rawKey as ProviderKey;

    const existingProvider = activeProviderInstances[activeProviderKey];
    if (existingProvider) {
      return existingProvider;
    }

    const newProvider = new LLMProvider(activeProviderKey);
    activeProviderInstances[activeProviderKey] = newProvider;
    console.info(`[AIProviderFactory] Initialized provider: ${newProvider.name}`);

    return newProvider;
  },

  reset(): void {
    activeProviderInstances = {};
  },
};
