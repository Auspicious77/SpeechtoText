// Lightweight stubbed Voice API for testing (no external transcription libraries)
export type ProcessVoiceInput = {
  audioUri: string;
  mimeType: string;
  clientTs: string;
  context?: Record<string, unknown>;
};

export type ProcessVoiceResult =
  | { kind: 'ok'; transcript: string }
  | { kind: 'clarification'; prompt: string };

export type ProcessVoiceError = {
  kind: 'error';
  code: 'NETWORK' | 'SERVER';
  message: string;
};

export type Scenario = 'success' | 'clarify' | 'networkError' | 'serverError';

// Simple Voice API stub that does not attempt to load any native transcription library.
export class VoiceApiImpl {
  private scenario: Scenario = 'success';
  private delayMs: number;
  private completeNextAsSuccess = false;
  private liveActive = false;

  constructor(opts?: { delayMs?: number; scenario?: Scenario }) {
    this.delayMs = opts?.delayMs ?? 1000;
    if (opts?.scenario) this.scenario = opts.scenario;
  }

  setScenario(s: Scenario) {
    this.scenario = s;
    this.completeNextAsSuccess = false;
  }

  // Whether a (mock) live recognizer is available. Keep it simple and return true
  // so callers can test live vs file modes; behavior is still deterministic via scenario.
  async isAvailable(): Promise<boolean> {
    return true;
  }

  async startLiveRecognition(): Promise<void> {
    // Start a mock live recognition session - in a real implementation this would
    // hook into a streaming recognizer. We'll just set a flag.
    this.liveActive = true;
    return;
  }

  // async stopLiveRecognition(): Promise<string> {
  //   // Stop the mock live recognizer and return a transcript similar to processVoice
  //   this.liveActive = false;
  //   // Provide a deterministic mock transcript
  //   const MOCK = 'This is a live-captured mock transcript.';
  //   await new Promise((r) => setTimeout(r, this.delayMs));
  //   return MOCK;
  // }

  async stopLiveRecognition(): Promise<string> {
  // Stop the mock live recognizer and return a transcript similar to processVoice
  this.liveActive = false;

  // Simulated delay to mimic processing time
  await new Promise((r) => setTimeout(r, this.delayMs));

  // Multiple possible mock transcripts
  const MOCK_TRANSCRIPTS = [
    'Hey, remind me to call Alex tomorrow at 3 PM.',
    'Set an alarm for 7 AM tomorrow morning.',
    'What is the weather like this weekend?',
    'Add milk and eggs to my shopping list.',
    'Play some relaxing music from my favorites playlist.',
    'What time should I set it for?',
  ];

  // Pick one at random
  const randomIndex = Math.floor(Math.random() * MOCK_TRANSCRIPTS.length);
  const selectedTranscript = MOCK_TRANSCRIPTS[randomIndex];

  // Return the selected mock transcript
  return selectedTranscript;
}


  async destroy(): Promise<void> {
    this.liveActive = false;
    return;
  }

  // async processVoice(input: ProcessVoiceInput): Promise<ProcessVoiceResult> {
  //   // If we previously requested a clarification and the next call should be treated as success
  //   if (this.completeNextAsSuccess) {
  //     this.completeNextAsSuccess = false;
  //     return { kind: 'ok', transcript: "Okay — got it (follow-up)." };
  //   }

  //   // Handle explicit scenarios
  //   switch (this.scenario) {
  //     case 'clarify':
  //       if (input.context?.selectedTime) {
  //         return { kind: 'ok', transcript: `Alarm set for ${input.context.selectedTime}.` };
  //       }
  //       this.completeNextAsSuccess = true;
  //       return { kind: 'clarification', prompt: 'What time should I set it for?' };
  //     case 'networkError':
  //       throw { kind: 'error', code: 'NETWORK', message: 'Network error. Please try again.' } as ProcessVoiceError;
  //     case 'serverError':
  //       throw { kind: 'error', code: 'SERVER', message: 'Something went wrong. Please try again.' } as ProcessVoiceError;
  //     case 'success':
  //     default:
  //       break;
  //   }

  //   // Simulate some processing delay
  //   await new Promise((r) => setTimeout(r, this.delayMs));

  //   // If no audio provided, return an empty transcript (this may be used for time-picker 'text' responses)
  //   if (!input.audioUri) return { kind: 'ok', transcript: '' };

  //   // Return a mocked transcript to simulate real transcription for testing.
  //   // Choose a mock phrase (randomized) instead of the generic '(audio)'.
  //   const MOCK_TRANSCRIPTS = [
  //     'Hey, remind me to call Alex tomorrow at 3 PM.',
  //     'Set an alarm for 7 AM tomorrow morning.',
  //     'What is the weather like this weekend?',
  //     'Add milk and eggs to my shopping list.',
  //     'Play some relaxing music from my favorites playlist.'
  //   ];
  //   // Simple deterministic selection based on current time so tests are repeatable-ish
  //   const idx = Math.abs(Math.floor(Date.now() / 1000)) % MOCK_TRANSCRIPTS.length;
  //   const mock = MOCK_TRANSCRIPTS[idx];
  //   return { kind: 'ok', transcript: mock };
  // }

  async processVoice(input: ProcessVoiceInput): Promise<ProcessVoiceResult> {
  // Handle clarification follow-up scenario
  if (this.completeNextAsSuccess) {
    this.completeNextAsSuccess = false;
    return { kind: 'ok', transcript: "Okay — got it (follow-up)." };
  }

  // Handle explicit scenario settings
  switch (this.scenario) {
    case 'clarify':
      if (input.context?.selectedTime) {
        return { kind: 'ok', transcript: `Alarm set for ${input.context.selectedTime}.` };
      }
      this.completeNextAsSuccess = true;
      return { kind: 'clarification', prompt: 'What time should I set it for?' };

    case 'networkError':
      throw {
        kind: 'error',
        code: 'NETWORK',
        message: 'Network error. Please try again.',
      } as ProcessVoiceError;

    case 'serverError':
      throw {
        kind: 'error',
        code: 'SERVER',
        message: 'Something went wrong. Please try again.',
      } as ProcessVoiceError;

    case 'success':
    default:
      break;
  }

  // Simulate API delay
  await new Promise((r) => setTimeout(r, this.delayMs));

  // No audio → return empty transcript
  if (!input.audioUri) return { kind: 'ok', transcript: '' };

  // Randomized mock transcripts (not timestamp-based)
  const MOCK_TRANSCRIPTS = [
    'Hey, remind me to call Alex tomorrow at 3 PM.',
    'Set an alarm for 7 AM tomorrow morning.',
    'What is the weather like this weekend?',
    'Add milk and eggs to my shopping list.',
    'Play some relaxing music from my favorites playlist.',
    'Send a message to John saying I’ll be late.',
    'Turn off the living room lights.',
    'Open my notes for today’s meeting.',
  ];

  // Randomly pick one
  const randomIndex = Math.floor(Math.random() * MOCK_TRANSCRIPTS.length);
  const transcript = MOCK_TRANSCRIPTS[randomIndex];

  // 10% chance to simulate a clarification prompt dynamically
  if (Math.random() < 0.1) {
    const PROMPTS = [
      'Can you repeat that?',
      'What exactly do you mean?',
      'Should I save that reminder?',
      'Do you want me to schedule it now?',
    ];
    const randomPrompt = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    this.completeNextAsSuccess = true;
    return { kind: 'clarification', prompt: randomPrompt };
  }

  // Return success transcript
  console.log('transsssssiis', transcript)
  return { kind: 'ok', transcript };
}

}

export const voiceApi = new VoiceApiImpl();
