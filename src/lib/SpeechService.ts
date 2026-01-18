/**
 * Speech Service - Text-to-Speech for Chinese pronunciation
 * Uses the Web Speech API for instant playback
 * Falls back to audio files when available
 */

// Import audio files for zaijian level
import zaijianAudioUrl from '../sounds/zaijian/zaijian.mp3';
import zaiAudioUrl from '../sounds/zaijian/zai.mp3';
import jianAudioUrl from '../sounds/zaijian/jian.mp3';
import zAudioUrl from '../sounds/zaijian/z.mp3';
import aiAudioUrl from '../sounds/zaijian/ai.mp3';
import jAudioUrl from '../sounds/zaijian/j.mp3';
import ianAudioUrl from '../sounds/zaijian/ian.mp3';

// Import audio files for xiexie level
import xiexieAudioUrl from '../sounds/xiexie/xiexie.mp3';
import xieAudioUrl from '../sounds/xiexie/xie.mp3';
import xAudioUrl from '../sounds/xiexie/x.mp3';
import ieAudioUrl from '../sounds/xiexie/ie.mp3';

// Import audio files for nihao level
import nihaoAudioUrl from '../sounds/nihao/nihao.mp3';
import niAudioUrl from '../sounds/nihao/ni.mp3';
import haoAudioUrl from '../sounds/nihao/hao.mp3';
import nAudioUrl from '../sounds/nihao/n.mp3';
import iAudioUrl from '../sounds/nihao/i.mp3';
import hAudioUrl from '../sounds/nihao/h.mp3';
import aoAudioUrl from '../sounds/nihao/ao.mp3';

// Mapping from text/sound/word/phrase to audio files
const audioFileMap: Record<string, string | null> = {
  // Phrases
  '再见': zaijianAudioUrl,
  '谢谢': xiexieAudioUrl,
  '你好': nihaoAudioUrl,
  // Words
  '再': zaiAudioUrl,
  '见': jianAudioUrl,
  '谢': xieAudioUrl,
  '你': niAudioUrl,
  '好': haoAudioUrl,
  // Sounds
  'z': zAudioUrl,
  'ai': aiAudioUrl,
  'j': jAudioUrl,
  'ian': ianAudioUrl,
  'x': xAudioUrl,
  'ie': ieAudioUrl,
  'n': nAudioUrl,
  'i': iAudioUrl,
  'h': hAudioUrl,
  'ao': aoAudioUrl,
};

export class SpeechService {
  private static instance: SpeechService;
  private synth: SpeechSynthesis;
  private chineseVoice: SpeechSynthesisVoice | null = null;
  private isReady: boolean = false;
  private currentAudio: HTMLAudioElement | null = null;

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
   * Play audio file if available, otherwise fall back to TTS
   * @param text - The Chinese characters or pinyin to speak
   * @param rate - Speech rate (0.1 to 2, default 0.8 for clarity) - only used for TTS fallback
   */
  public speak(text: string, rate: number = 0.8): Promise<void> {
    return new Promise((resolve, reject) => {
      // Cancel any ongoing speech or audio
      this.stop();

      // Check if we have an audio file for this text
      const audioUrl = audioFileMap[text] || audioFileMap[text.toLowerCase()];
      
      // Debug logging
      console.log('SpeechService.speak:', { text, audioUrl, mapHasText: text in audioFileMap, mapHasLower: text.toLowerCase() in audioFileMap, mapKeys: Object.keys(audioFileMap) });
      
      if (audioUrl) {
        // Play audio file
        try {
          this.currentAudio = new Audio(audioUrl);
          this.currentAudio.volume = 1.0;
          
          this.currentAudio.onended = () => {
            this.currentAudio = null;
            resolve();
          };
          
          this.currentAudio.onerror = (e) => {
            console.warn('Audio playback failed, falling back to TTS:', e);
            this.currentAudio = null;
            // Fall back to TTS
            this.speakWithTTS(text, rate).then(resolve).catch(reject);
          };
          
          this.currentAudio.play().catch((error) => {
            console.warn('Audio play failed, falling back to TTS:', error);
            this.currentAudio = null;
            // Fall back to TTS
            this.speakWithTTS(text, rate).then(resolve).catch(reject);
          });
        } catch (error) {
          console.warn('Audio creation failed, falling back to TTS:', error);
          // Fall back to TTS
          this.speakWithTTS(text, rate).then(resolve).catch(reject);
        }
      } else {
        // No audio file available, use TTS
        this.speakWithTTS(text, rate).then(resolve).catch(reject);
      }
    });
  }

  /**
   * Internal method to speak using text-to-speech
   */
  private speakWithTTS(text: string, rate: number = 0.8): Promise<void> {
    return new Promise((resolve, reject) => {
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
   * Stop any ongoing speech or audio
   */
  public stop(): void {
    this.synth.cancel();
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
}

// Export singleton instance
export const speechService = SpeechService.getInstance();
