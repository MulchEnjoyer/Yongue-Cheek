import { AudioFeatures } from '../types';

interface PhonemeProfile {
  id: string;
  ipa: string;
  f1Range: [number, number];
  f2Range: [number, number];
  category: 'vowel' | 'consonant' | 'nasal' | 'fricative';
}

// Simplified phoneme profiles based on formant frequencies
const phonemeProfiles: PhonemeProfile[] = [
  // Vowels
  { id: 'i', ipa: '/i/', f1Range: [250, 400], f2Range: [2000, 2800], category: 'vowel' },
  { id: 'u', ipa: '/u/', f1Range: [250, 400], f2Range: [600, 1000], category: 'vowel' },
  { id: 'a', ipa: '/a/', f1Range: [700, 1000], f2Range: [1200, 1600], category: 'vowel' },
  { id: 'e', ipa: '/ə/', f1Range: [400, 600], f2Range: [1200, 1800], category: 'vowel' },
  { id: 'o', ipa: '/o/', f1Range: [400, 600], f2Range: [700, 1100], category: 'vowel' },
  { id: 'ao', ipa: '/aʊ/', f1Range: [600, 900], f2Range: [900, 1400], category: 'vowel' },
  
  // Consonants/Nasals
  { id: 'n', ipa: '/n/', f1Range: [200, 400], f2Range: [1400, 2000], category: 'nasal' },
  { id: 'm', ipa: '/m/', f1Range: [200, 400], f2Range: [900, 1400], category: 'nasal' },
  { id: 'ng', ipa: '/ŋ/', f1Range: [200, 400], f2Range: [1800, 2400], category: 'nasal' },
  
  // Fricatives
  { id: 'h', ipa: '/x/', f1Range: [400, 800], f2Range: [1000, 2000], category: 'fricative' },
  { id: 's', ipa: '/s/', f1Range: [100, 400], f2Range: [3500, 6000], category: 'fricative' },
  { id: 'sh', ipa: '/ʃ/', f1Range: [100, 400], f2Range: [2500, 4000], category: 'fricative' },
];

export class PhonemeRecognizer {
  /**
   * Recognize the most likely phoneme from audio features
   */
  recognize(features: AudioFeatures): { phoneme: string; ipa: string; confidence: number } | null {
    if (!features.isVoiced && features.energy < 0.05) {
      return null;
    }

    const [f1, f2] = features.formants;
    
    let bestMatch: PhonemeProfile | null = null;
    let bestScore = 0;

    for (const profile of phonemeProfiles) {
      const score = this.calculateMatchScore(f1, f2, profile, features);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = profile;
      }
    }

    if (bestMatch && bestScore > 0.3) {
      return {
        phoneme: bestMatch.id,
        ipa: bestMatch.ipa,
        confidence: bestScore,
      };
    }

    return null;
  }

  /**
   * Check if user's audio matches a specific target phoneme
   */
  matchesPhoneme(features: AudioFeatures, targetPhoneme: string): number {
    const profile = phonemeProfiles.find(p => p.id === targetPhoneme);
    if (!profile) {
      return 0.5; // Unknown phoneme, give neutral score
    }

    if (!features.isVoiced && features.energy < 0.02) {
      return 0;
    }

    const [f1, f2] = features.formants;
    return this.calculateMatchScore(f1, f2, profile, features);
  }

  private calculateMatchScore(
    f1: number,
    f2: number,
    profile: PhonemeProfile,
    features: AudioFeatures
  ): number {
    // Check if formants fall within expected ranges
    const f1Score = this.rangeScore(f1, profile.f1Range);
    const f2Score = this.rangeScore(f2, profile.f2Range);

    // Weight formant scores
    let score = (f1Score * 0.4 + f2Score * 0.4);

    // Adjust for category-specific features
    if (profile.category === 'nasal') {
      // Nasals typically have lower energy
      if (features.energy < 0.3) {
        score += 0.1;
      }
    } else if (profile.category === 'fricative') {
      // Fricatives have higher frequency energy
      if (!features.isVoiced && features.energy > 0.05) {
        score += 0.1;
      }
    } else if (profile.category === 'vowel') {
      // Vowels are voiced with good energy
      if (features.isVoiced && features.energy > 0.1) {
        score += 0.1;
      }
    }

    return Math.min(1, score);
  }

  private rangeScore(value: number, range: [number, number]): number {
    const [min, max] = range;
    const center = (min + max) / 2;
    const halfWidth = (max - min) / 2;
    
    const distance = Math.abs(value - center);
    const normalizedDistance = distance / halfWidth;
    
    // Gaussian-like scoring
    return Math.exp(-normalizedDistance * normalizedDistance);
  }
}
