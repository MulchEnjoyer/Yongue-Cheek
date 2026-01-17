import { AudioFeatures } from '../types';

// IPA vowel with typical F1/F2 formant values (in Hz)
export interface IPAVowel {
  symbol: string;
  name: string;
  f1: number;  // First formant (correlates with height: low F1 = close/high)
  f2: number;  // Second formant (correlates with backness: high F2 = front)
  height: 'close' | 'close-mid' | 'mid' | 'open-mid' | 'open';
  backness: 'front' | 'central' | 'back';
  example: string;
}

// Cardinal and common vowels with their typical formant frequencies
// Values are approximate averages for adult male speakers
export const IPA_VOWELS: IPAVowel[] = [
  // Front vowels
  { symbol: 'i', name: 'close front', f1: 280, f2: 2300, height: 'close', backness: 'front', example: 'fleece' },
  { symbol: 'ɪ', name: 'near-close front', f1: 400, f2: 2000, height: 'close-mid', backness: 'front', example: 'kit' },
  { symbol: 'e', name: 'close-mid front', f1: 400, f2: 2100, height: 'close-mid', backness: 'front', example: 'face' },
  { symbol: 'ɛ', name: 'open-mid front', f1: 550, f2: 1900, height: 'open-mid', backness: 'front', example: 'dress' },
  { symbol: 'æ', name: 'near-open front', f1: 700, f2: 1700, height: 'open-mid', backness: 'front', example: 'trap' },
  { symbol: 'a', name: 'open front', f1: 800, f2: 1500, height: 'open', backness: 'front', example: 'father (British)' },
  
  // Central vowels
  { symbol: 'ɨ', name: 'close central', f1: 300, f2: 1600, height: 'close', backness: 'central', example: 'roses' },
  { symbol: 'ə', name: 'mid central (schwa)', f1: 500, f2: 1500, height: 'mid', backness: 'central', example: 'comma' },
  { symbol: 'ɐ', name: 'near-open central', f1: 700, f2: 1400, height: 'open-mid', backness: 'central', example: 'strut' },
  
  // Back vowels
  { symbol: 'u', name: 'close back', f1: 300, f2: 900, height: 'close', backness: 'back', example: 'goose' },
  { symbol: 'ʊ', name: 'near-close back', f1: 400, f2: 1000, height: 'close-mid', backness: 'back', example: 'foot' },
  { symbol: 'o', name: 'close-mid back', f1: 450, f2: 900, height: 'close-mid', backness: 'back', example: 'goat' },
  { symbol: 'ɔ', name: 'open-mid back', f1: 600, f2: 1000, height: 'open-mid', backness: 'back', example: 'thought' },
  { symbol: 'ɑ', name: 'open back', f1: 750, f2: 1100, height: 'open', backness: 'back', example: 'lot' },
];

// Vowel space position (normalized 0-1)
export interface VowelPosition {
  x: number;  // 0 = front, 1 = back
  y: number;  // 0 = close (high), 1 = open (low)
  f1: number; // Raw F1 value
  f2: number; // Raw F2 value
}

// Detection result
export interface DetectedVowel {
  position: VowelPosition;
  nearestVowel: IPAVowel | null;
  confidence: number;  // 0-1, how close to the nearest vowel
  isVoiced: boolean;
}

/**
 * Maps audio features to IPA vowel space
 */
export class VowelMapper {
  // F1 range for vowel space (Hz)
  private readonly F1_MIN = 250;   // Close vowels
  private readonly F1_MAX = 850;   // Open vowels
  
  // F2 range for vowel space (Hz)
  private readonly F2_MIN = 800;   // Back vowels
  private readonly F2_MAX = 2400;  // Front vowels

  /**
   * Map audio features to vowel space position
   */
  mapToVowelSpace(features: AudioFeatures): DetectedVowel {
    if (!features.isVoiced || features.energy < 0.02) {
      return {
        position: { x: 0.5, y: 0.5, f1: 0, f2: 0 },
        nearestVowel: null,
        confidence: 0,
        isVoiced: false,
      };
    }

    const [f1, f2] = features.formants;
    
    // Normalize F1 to y-axis (0 = close/high, 1 = open/low)
    const y = this.normalize(f1, this.F1_MIN, this.F1_MAX);
    
    // Normalize F2 to x-axis (0 = front, 1 = back)
    // Note: F2 is inverted because high F2 = front vowels
    const x = 1 - this.normalize(f2, this.F2_MIN, this.F2_MAX);

    const position: VowelPosition = {
      x: this.clamp(x),
      y: this.clamp(y),
      f1,
      f2,
    };

    // Find nearest vowel
    const { vowel, distance } = this.findNearestVowel(f1, f2);
    
    // Calculate confidence based on distance (closer = higher confidence)
    // Distance is in Hz, normalize to roughly 0-1
    const maxDistance = 400; // Hz threshold for "no match"
    const confidence = Math.max(0, 1 - (distance / maxDistance));

    return {
      position,
      nearestVowel: confidence > 0.3 ? vowel : null,
      confidence,
      isVoiced: true,
    };
  }

  /**
   * Find the nearest IPA vowel based on F1/F2 distance
   */
  findNearestVowel(f1: number, f2: number): { vowel: IPAVowel; distance: number } {
    let nearestVowel = IPA_VOWELS[0];
    let minDistance = Infinity;

    for (const vowel of IPA_VOWELS) {
      // Euclidean distance in F1/F2 space
      // Weight F1 slightly more as it's more perceptually important
      const f1Diff = (f1 - vowel.f1) * 1.2;
      const f2Diff = (f2 - vowel.f2) * 0.8;
      const distance = Math.sqrt(f1Diff * f1Diff + f2Diff * f2Diff);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestVowel = vowel;
      }
    }

    return { vowel: nearestVowel, distance: minDistance };
  }

  /**
   * Get vowel position for a known IPA vowel (for target display)
   */
  getVowelPosition(symbol: string): VowelPosition | null {
    const vowel = IPA_VOWELS.find(v => v.symbol === symbol);
    if (!vowel) return null;

    return {
      x: 1 - this.normalize(vowel.f2, this.F2_MIN, this.F2_MAX),
      y: this.normalize(vowel.f1, this.F1_MIN, this.F1_MAX),
      f1: vowel.f1,
      f2: vowel.f2,
    };
  }

  /**
   * Calculate accuracy between user position and target vowel
   */
  calculateAccuracy(detected: DetectedVowel, targetSymbol: string): number {
    if (!detected.isVoiced) return 0;

    const targetVowel = IPA_VOWELS.find(v => v.symbol === targetSymbol);
    if (!targetVowel) return 0;

    const { distance } = this.findNearestVowel(detected.position.f1, detected.position.f2);
    
    // Check if detected matches target
    const targetDistance = Math.sqrt(
      Math.pow((detected.position.f1 - targetVowel.f1) * 1.2, 2) +
      Math.pow((detected.position.f2 - targetVowel.f2) * 0.8, 2)
    );

    // Convert distance to accuracy (closer = higher accuracy)
    const maxAcceptableDistance = 200; // Hz
    const accuracy = Math.max(0, 100 * (1 - targetDistance / maxAcceptableDistance));
    
    return Math.min(100, accuracy);
  }

  private normalize(value: number, min: number, max: number): number {
    return (value - min) / (max - min);
  }

  private clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
  }
}
