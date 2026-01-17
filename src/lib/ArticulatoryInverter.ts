import { AudioFeatures, ArticulatoryPosition } from '../types';

/**
 * Converts audio features to articulatory positions using
 * acoustic-to-articulatory mapping based on formant frequencies.
 */
export class ArticulatoryInverter {
  // Formant-to-articulation mapping coefficients
  // Based on acoustic phonetics research

  /**
   * Convert audio features to estimated articulatory position
   */
  invert(features: AudioFeatures): ArticulatoryPosition {
    if (!features.isVoiced || features.energy < 0.01) {
      // Return neutral/rest position when not speaking
      return {
        tongueHeight: 0.5,
        tongueFrontness: 0.5,
        lipRounding: 0.3,
        jawOpenness: 0.2,
        velumRaised: 1.0,
      };
    }

    const [f1, f2, f3] = features.formants;
    
    // F1 inversely correlates with tongue height
    // Low F1 (~300 Hz) = high tongue, High F1 (~800 Hz) = low tongue
    const tongueHeight = this.mapRange(f1, 800, 300, 0, 1);
    
    // F2 correlates with tongue frontness
    // High F2 (~2500 Hz) = front, Low F2 (~800 Hz) = back
    const tongueFrontness = this.mapRange(f2, 800, 2500, 0, 1);
    
    // F3 and F2 difference indicates lip rounding
    // Rounded lips lower both F2 and F3
    const f2f3Diff = f3 - f2;
    const lipRounding = this.mapRange(f2f3Diff, 1500, 800, 0, 1);
    
    // Jaw openness correlates with F1 (similar to tongue height inverse)
    const jawOpenness = this.mapRange(f1, 300, 800, 0.2, 0.8);
    
    // Velum position - difficult to detect acoustically
    // Nasals have reduced energy and specific formant patterns
    // For simplicity, assume raised velum for most sounds
    const velumRaised = features.energy > 0.1 ? 0.9 : 0.7;

    return {
      tongueHeight: this.clamp(tongueHeight),
      tongueFrontness: this.clamp(tongueFrontness),
      lipRounding: this.clamp(lipRounding),
      jawOpenness: this.clamp(jawOpenness),
      velumRaised: this.clamp(velumRaised),
    };
  }

  /**
   * Calculate accuracy between user's position and target position
   */
  calculateAccuracy(
    userPosition: ArticulatoryPosition,
    targetPosition: ArticulatoryPosition
  ): number {
    const weights = {
      tongueHeight: 0.25,
      tongueFrontness: 0.25,
      lipRounding: 0.2,
      jawOpenness: 0.2,
      velumRaised: 0.1,
    };

    let totalError = 0;
    let totalWeight = 0;

    for (const [key, weight] of Object.entries(weights)) {
      const userValue = userPosition[key as keyof ArticulatoryPosition];
      const targetValue = targetPosition[key as keyof ArticulatoryPosition];
      const error = Math.abs(userValue - targetValue);
      totalError += error * weight;
      totalWeight += weight;
    }

    // Convert error to accuracy percentage
    const normalizedError = totalError / totalWeight;
    const accuracy = (1 - normalizedError) * 100;
    
    return Math.max(0, Math.min(100, accuracy));
  }

  /**
   * Blend multiple articulatory positions (for word-level practice)
   */
  blendPositions(positions: ArticulatoryPosition[]): ArticulatoryPosition {
    if (positions.length === 0) {
      return {
        tongueHeight: 0.5,
        tongueFrontness: 0.5,
        lipRounding: 0.3,
        jawOpenness: 0.3,
        velumRaised: 1.0,
      };
    }

    const result: ArticulatoryPosition = {
      tongueHeight: 0,
      tongueFrontness: 0,
      lipRounding: 0,
      jawOpenness: 0,
      velumRaised: 0,
    };

    for (const pos of positions) {
      result.tongueHeight += pos.tongueHeight;
      result.tongueFrontness += pos.tongueFrontness;
      result.lipRounding += pos.lipRounding;
      result.jawOpenness += pos.jawOpenness;
      result.velumRaised += pos.velumRaised;
    }

    const n = positions.length;
    result.tongueHeight /= n;
    result.tongueFrontness /= n;
    result.lipRounding /= n;
    result.jawOpenness /= n;
    result.velumRaised /= n;

    return result;
  }

  private mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ): number {
    return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
  }

  private clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
  }
}
