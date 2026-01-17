/**
 * Speech Service - Text-to-Speech for Chinese pronunciation
 * Uses the Web Speech API for instant playback
 */

export class SpeechService {
  private static instance: SpeechService;
  private synth: SpeechSynthesis;
  private chineseVoice: SpeechSynthesisVoice | null = null;
  private isReady: boolean = false;

  private constructor() {
    this.synth = window.speechSynthesis;
    this.initVoice();
  }

  public static getInstance(): SpeechService {
    if (!SpeechService.instance) {
      SpeechService.instance = new SpeechService();
    }
    return SpeechService.instance;
  }

  private initVoice(): void {
    // Voices may load asynchronously
    const loadVoices = () => {
      const voices = this.synth.getVoices();
      
      // Try to find a Chinese voice, preferring these in order:
      // 1. zh-CN (Simplified Chinese)
      // 2. zh-TW (Traditional Chinese) 
      // 3. Any Chinese voice
      this.chineseVoice = voices.find(v => v.lang === 'zh-CN') 
        || voices.find(v => v.lang.startsWith('zh'))
        || voices.find(v => v.lang.includes('Chinese'))
        || null;
      
      this.isReady = true;
      
      if (this.chineseVoice) {
        console.log('Chinese voice loaded:', this.chineseVoice.name);
      } else {
        console.warn('No Chinese voice found, will use default');
      }
    };

    // Chrome loads voices asynchronously
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = loadVoices;
    }
    
    // Also try loading immediately (Firefox/Safari)
    loadVoices();
  }

  /**
   * Speak Chinese text
   * @param text - The Chinese characters or pinyin to speak
   * @param rate - Speech rate (0.1 to 2, default 0.8 for clarity)
   */
  public speak(text: string, rate: number = 0.8): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set Chinese language
      utterance.lang = 'zh-CN';
      utterance.rate = rate;
      utterance.pitch = 1;
      utterance.volume = 1;

      // Use Chinese voice if available
      if (this.chineseVoice) {
        utterance.voice = this.chineseVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.error('Speech error:', e);
        reject(e);
      };

      this.synth.speak(utterance);
    });
  }

  /**
   * Speak a sound/syllable slowly for learning
   */
  public speakSound(pinyin: string): Promise<void> {
    // For individual sounds, speak even slower
    return this.speak(pinyin, 0.6);
  }

  /**
   * Speak a word at moderate pace
   */
  public speakWord(characters: string): Promise<void> {
    return this.speak(characters, 0.75);
  }

  /**
   * Speak a full phrase at near-normal pace
   */
  public speakPhrase(phrase: string): Promise<void> {
    return this.speak(phrase, 0.85);
  }

  /**
   * Check if speech synthesis is available
   */
  public isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Stop any ongoing speech
   */
  public stop(): void {
    this.synth.cancel();
  }
}

// Export singleton instance
export const speechService = SpeechService.getInstance();
