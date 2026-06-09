import { AIProviderFactory } from '../src/ai/providers.ts';
import { fetchTranscript } from '../src/lib/transcript.ts';

async function test() {
  const provider = AIProviderFactory.create();
  try {
    const transcript = await fetchTranscript('dQw4w9WgXcQ');
    const res = await provider.analyzeTranscript(transcript);
    console.log('Success', res);
  } catch (e) {
    console.error('Failed:', e);
  }
}
test();
