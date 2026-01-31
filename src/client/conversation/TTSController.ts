export class TTSController {
  private enabled: boolean = true; // TTS always on by default for production
  private onSpeechStart: (() => void) | null = null;
  private onSpeechEnd: (() => void) | null = null;
  private voicesLoaded: boolean = false;

  constructor() {
    // Preload voices on init - fixes slow first TTS
    this.preloadVoices();
  }

  private preloadVoices(): void {
    if (!window.speechSynthesis) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        console.log('[TTS] Voices loaded:', voices.length);
      }
    };

    // Try immediately
    loadVoices();

    // Also listen for voiceschanged event (Chrome needs this)
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
    this.stop();
  }

  toggle(): boolean {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stop();
    }
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setCallbacks(onStart: () => void, onEnd: () => void): void {
    this.onSpeechStart = onStart;
    this.onSpeechEnd = onEnd;
  }

  async speak(text: string, speaker: 'boss' | 'girl'): Promise<void> {
    if (!this.enabled) {
      console.log('[TTS] Disabled, skipping');
      return;
    }

    console.log('[TTS] Speaking:', text.substring(0, 50) + '...', 'speaker:', speaker);

    this.stop();

    return new Promise((resolve) => {
      if (!window.speechSynthesis) {
        console.log('[TTS] Web Speech API not available');
        resolve();
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      let voices = synth.getVoices();

      // If voices not loaded yet, wait a bit
      if (voices.length === 0) {
        console.log('[TTS] Voices not loaded, waiting...');
        setTimeout(() => {
          voices = synth.getVoices();
          console.log('[TTS] Voices after wait:', voices.length);
        }, 100);
      }
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));

      // Set volume to max
      utterance.volume = 1.0;

      if (speaker === 'boss') {
        const bossVoice = englishVoices.find(v =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('david') ||
          v.name.toLowerCase().includes('james')
        ) || englishVoices[0] || voices[0];

        if (bossVoice) utterance.voice = bossVoice;
        utterance.pitch = 0.9;
        utterance.rate = 0.95;
      } else {
        const girlVoice = englishVoices.find(v =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('zira')
        ) || englishVoices[1] || voices[1] || voices[0];

        if (girlVoice) utterance.voice = girlVoice;
        utterance.pitch = 1.1;
        utterance.rate = 1.05;
      }

      console.log('[TTS] Using voice:', utterance.voice?.name || 'default');

      utterance.onstart = () => {
        if (this.onSpeechStart) {
          this.onSpeechStart();
        }
      };

      utterance.onend = () => {
        if (this.onSpeechEnd) {
          this.onSpeechEnd();
        }
        resolve();
      };

      utterance.onerror = (event) => {
        console.error('[TTS] Error:', event);
        if (this.onSpeechEnd) {
          this.onSpeechEnd();
        }
        resolve();
      };

      console.log('[TTS] Calling synth.speak()');
      synth.speak(utterance);
      console.log('[TTS] synth.speaking:', synth.speaking, 'synth.pending:', synth.pending);
    });
  }

  stop(): void {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  getEstimatedDuration(text: string): number {
    const wordsPerSecond = 2.5;
    const avgWordLength = 5;
    const charsPerSecond = wordsPerSecond * avgWordLength;
    const estimatedSeconds = text.length / charsPerSecond;
    return Math.max(2000, estimatedSeconds * 1000 + 500);
  }
}
