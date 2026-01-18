import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, Sound } from '../../types';
import { TongueVisualization } from '../TongueVisualization';
import { AccuracyMeter } from '../AccuracyMeter';
import { ToneIndicator } from '../ToneIndicator';
import { DifficultyBadge } from '../DifficultyBadge';
import { AudioLevelVisualization } from '../AudioLevelVisualization';
import { ListenButton } from '../ListenButton';
import { ConfettiEffect } from '../ConfettiEffect';
import { AudioService, AnalysisResult } from '../../lib/AudioService';
import { VowelMapper, DetectedVowel, VowelPosition, IPA_VOWELS } from '../../lib/VowelMapper';
import { playSuccessSound } from '../../lib/SoundUtils';

interface SoundPracticeScreenProps {
  word: Word;
  sound: Sound;
  soundIndex: number;
  totalSounds: number;
  onComplete: (accuracy: number) => void;
  onSkip: () => void;
  onBack: () => void;
}

export const SoundPracticeScreen: React.FC<SoundPracticeScreenProps> = ({
  word,
  sound,
  soundIndex,
  totalSounds,
  onComplete,
  onSkip,
  onBack,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const [audioIntensity, setAudioIntensity] = useState(0);
  const [detected, setDetected] = useState<DetectedVowel>({
    position: { x: 0.5, y: 0.5, f1: 0, f2: 0 },
    nearestVowel: null,
    confidence: 0,
    isVoiced: false,
  });

  const audioServiceRef = useRef<AudioService | null>(null);
  const vowelMapperRef = useRef<VowelMapper>(new VowelMapper());
  const passingTimeRef = useRef<number | null>(null);
  const smoothedAccuracyRef = useRef(0);
  const hasPlayedSoundRef = useRef(false);

  // Convert target position to vowel space coordinates
  const getTargetVowelPosition = useCallback((): VowelPosition | null => {
    if (!sound.targetPosition) return null;
    
    // Map articulatory position to F1/F2 space
    // tongueHeight (0=low, 1=high) -> F1 (high F1 = low tongue)
    // tongueFrontness (0=back, 1=front) -> F2 (high F2 = front)
    const f1 = 850 - sound.targetPosition.tongueHeight * 600; // 250-850 Hz
    const f2 = 800 + sound.targetPosition.tongueFrontness * 1600; // 800-2400 Hz
    
    return {
      x: 1 - (f2 - 800) / 1600,  // 0=front, 1=back
      y: (f1 - 250) / 600,       // 0=close, 1=open
      f1,
      f2,
    };
  }, [sound.targetPosition]);

  // Calculate accuracy based on formant distance
  // More lenient scoring - formants naturally vary ~150-300Hz between speakers
  const calculateAccuracy = useCallback((userF1: number, userF2: number, targetPos: VowelPosition | null): number => {
    if (!targetPos || userF1 === 0 || userF2 === 0) return 0;
    
    // Calculate normalized distance in F1/F2 space
    // F1 range is ~600Hz (250-850), F2 range is ~1600Hz (800-2400)
    // Normalize to make them comparable
    const f1Diff = Math.abs(userF1 - targetPos.f1) / 600;  // Normalize by F1 range
    const f2Diff = Math.abs(userF2 - targetPos.f2) / 1600; // Normalize by F2 range
    
    // Combined normalized distance (0-1 scale, roughly)
    const normalizedDistance = Math.sqrt(f1Diff ** 2 + f2Diff ** 2);
    
    // Convert to accuracy with generous scaling
    // 0 distance = 100%, 0.5 normalized distance = ~60% (passing), 1.0 = ~30%
    // Using exponential falloff for more natural feel
    const accuracy = 100 * Math.exp(-normalizedDistance * 1.2);
    
    // Add a small boost when you're in the right ballpark (within 30% of target)
    const boost = normalizedDistance < 0.3 ? 10 : 0;
    
    return Math.min(100, accuracy + boost);
  }, []);

  const handleAudioResult = useCallback((result: AnalysisResult) => {
    // Update audio intensity for visualization
    const normalizedIntensity = Math.min(100, Math.max(0, (result.intensity + 40) * 2)); // Normalize intensity
    setAudioIntensity(normalizedIntensity);
    
    if (!result.isVoiced) {
      // Keep showing last position but mark as not voiced
      setDetected(prev => ({ ...prev, isVoiced: false }));
      return;
    }

    const vowel = result.detectedVowel 
      ? IPA_VOWELS.find(v => v.symbol === result.detectedVowel) 
      : null;

    setDetected({
      position: {
        x: result.position.x,
        y: result.position.y,
        f1: result.f1,
        f2: result.f2,
      },
      nearestVowel: vowel || null,
      confidence: result.confidence,
      isVoiced: true,
    });

    // Calculate accuracy against target
    const targetPos = getTargetVowelPosition();
    const newAccuracy = calculateAccuracy(result.f1, result.f2, targetPos);
    
    // Light smoothing for responsive feel (0.5/0.5 blend)
    smoothedAccuracyRef.current = smoothedAccuracyRef.current * 0.5 + newAccuracy * 0.5;
    setAccuracy(Math.round(smoothedAccuracyRef.current));

    // Check if passing threshold (50%) for 100ms
      // Once passed, keep canContinue true (don't reset if accuracy drops)
      if (smoothedAccuracyRef.current >= 50) {
        if (passingTimeRef.current === null) {
          passingTimeRef.current = Date.now();
        } else if (Date.now() - passingTimeRef.current >= 100) {
          // Only play sound and set canContinue when transitioning from false to true
          setCanContinue(prev => {
            if (!prev && !hasPlayedSoundRef.current) {
              hasPlayedSoundRef.current = true;
              setTimeout(() => {
                playSuccessSound();
              }, 0);
            }
            return true;
          });
        }
      } else {
        // Reset timing but DON'T reset canContinue - once passed, stay passed
        passingTimeRef.current = null;
      }
  }, [getTargetVowelPosition, calculateAccuracy]);

  const startListening = async () => {
    if (!audioServiceRef.current) {
      audioServiceRef.current = new AudioService();
    }

    const success = await audioServiceRef.current.start(handleAudioResult);
    if (success) {
      setIsListening(true);
    }
  };

  const stopListening = () => {
    audioServiceRef.current?.stop();
    setIsListening(false);
  };

  useEffect(() => {
    return () => {
      audioServiceRef.current?.stop();
    };
  }, []);

  // Reset state when sound changes
  useEffect(() => {
    setAccuracy(0);
    setCanContinue(false);
    passingTimeRef.current = null;
    smoothedAccuracyRef.current = 0;
    hasPlayedSoundRef.current = false;
    setDetected({
      position: { x: 0.5, y: 0.5, f1: 0, f2: 0 },
      nearestVowel: null,
      confidence: 0,
      isVoiced: false,
    });
  }, [sound.id]);

  const handleContinue = () => {
    stopListening();
    onComplete(accuracy);
  };

  // Get pinyin with highlighted sound
  const highlightedPinyin = () => {
    if (sound.type === 'tone') {
      return <span>{word.pinyin}</span>;
    }

    // Helper to normalize pinyin by removing tone marks (āáǎà -> a, ēéěè -> e, etc.)
    const removeToneMarks = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Remove diacritics (tone marks)
    };
    
    // Find the local index of the current sound within word.sounds (excluding tones)
    const nonToneSounds = word.sounds.filter(s => s.type !== 'tone');
    const localSoundIndex = nonToneSounds.findIndex(s => s.id === sound.id);
    
    if (localSoundIndex === -1) {
      return <span>{word.pinyin}</span>;
    }
    
    // Simple approach: walk through pinyin sequentially, matching sounds in order
    // Build up position by finding each sound one by one in the original pinyin string
    let currentPos = 0;
    const pinyinLower = word.pinyin.toLowerCase();
    const soundNoTones = removeToneMarks(sound.pinyin);
    
    // First, find all previous sounds to get to the right position
    for (let i = 0; i < localSoundIndex; i++) {
      const prevSound = nonToneSounds[i];
      const prevSoundLower = prevSound.pinyin.toLowerCase();
      const prevSoundNoTones = removeToneMarks(prevSound.pinyin);
      
      // Try to find this sound starting from currentPos
      // First try exact match (for simple cases like "n", "h")
      let foundIndex = pinyinLower.indexOf(prevSoundLower, currentPos);
      
      // If not found, try without tone marks (for cases where sound has tone in pinyin)
      if (foundIndex === -1 && prevSoundNoTones !== prevSoundLower) {
        // Build a substring from currentPos and check for tone-removed version
        for (let j = currentPos; j < word.pinyin.length; j++) {
          const substring = word.pinyin.substring(j, j + prevSound.pinyin.length + 1);
          const substringNoTones = removeToneMarks(substring);
          if (substringNoTones.startsWith(prevSoundNoTones)) {
            foundIndex = j;
            break;
          }
        }
      }
      
      if (foundIndex !== -1) {
        currentPos = foundIndex + prevSound.pinyin.length;
      }
    }
    
    // Now find the current sound starting from currentPos
    const soundLower = sound.pinyin.toLowerCase();
    let targetIndex = pinyinLower.indexOf(soundLower, currentPos);
    let actualLength = sound.pinyin.length;
    
    // If not found with exact match, try without tone marks
    if (targetIndex === -1) {
      // Check substring starting from currentPos
      // Tone-marked vowels like "ǎo" are one char but match "ao" (two chars)
      for (let i = currentPos; i < word.pinyin.length; i++) {
        // Try different lengths starting from 1 up to sound length + 1
        // Tone-marked vowels might be 1-2 chars shorter
        for (let len = 1; len <= Math.min(sound.pinyin.length + 2, word.pinyin.length - i); len++) {
          const substring = word.pinyin.substring(i, i + len);
          const substringNoTones = removeToneMarks(substring);
          // Check if the tone-removed substring matches our sound
          if (substringNoTones === soundNoTones) {
            targetIndex = i;
            // Use the actual length we found (might be shorter if tone-marked vowel)
            actualLength = len;
            break;
          }
        }
        if (targetIndex !== -1) break;
      }
    }
    
    if (targetIndex === -1) {
      // Last resort fallback - try first occurrence
      targetIndex = pinyinLower.indexOf(soundLower);
      if (targetIndex !== -1) {
        actualLength = sound.pinyin.length;
      }
    }
    
    if (targetIndex === -1) {
      return <span>{word.pinyin}</span>;
    }

    return (
      <>
        {word.pinyin.slice(0, targetIndex)}
        <span className="highlight">{word.pinyin.slice(targetIndex, targetIndex + actualLength)}</span>
        {word.pinyin.slice(targetIndex + actualLength)}
      </>
    );
  };

  const targetPos = getTargetVowelPosition();

  return (
    <div className="screen sound-practice-screen">
      <ConfettiEffect trigger={canContinue} duration={2000} />
      <div className="sound-practice-screen__progress">
        <div className="progress-header">
          <button className="btn btn--ghost back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Exit</span>
          </button>
          <span className="progress-text">Sound {soundIndex + 1} of {totalSounds}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-bar__fill"
            style={{ width: `${((soundIndex + 1) / totalSounds) * 100}%` }}
          />
        </div>
      </div>

      <div className="sound-practice-screen__content">
        <div className="sound-practice-screen__left">
          <div className="sound-info-card">
            <div className="sound-info-card__word">
              <span className="sound-info-card__character">{word.characters}</span>
              <span className="sound-info-card__pinyin">{highlightedPinyin()}</span>
              <ListenButton text={sound.pinyin} type="sound" size="medium" />
            </div>

            <div className="sound-info-card__details">
              <div className="sound-info-card__ipa">
                <span className="label">IPA</span>
                <span className="value">{sound.ipa}</span>
              </div>
              <div className="sound-info-card__type">
                <span className="label">Type</span>
                <span className="value">{sound.type}</span>
              </div>
              <DifficultyBadge difficulty={sound.difficulty} />
            </div>

            {sound.toneNumber && (
              <ToneIndicator toneNumber={sound.toneNumber} size="medium" />
            )}
          </div>

          <AccuracyMeter 
            accuracy={accuracy} 
            threshold={50} 
            label="Pronunciation Accuracy" 
            size="large"
          />

          <div className="sound-practice-screen__actions">
            {!isListening ? (
              <button className="btn btn--primary btn--large" onClick={startListening}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <span>Start Speaking</span>
              </button>
            ) : (
              <button className="btn btn--secondary btn--large listening" onClick={stopListening}>
                <AudioLevelVisualization intensity={audioIntensity} isActive={isListening} />
                <span>Listening...</span>
              </button>
            )}

            <button className="btn btn--ghost" onClick={onSkip}>
              Skip this sound
            </button>

            {/* Debug button to force pass */}
            <button 
              className="btn btn--ghost" 
              onClick={() => {
                setCanContinue(true);
                setAccuracy(100);
                playSuccessSound();
              }}
              style={{ fontSize: '0.75rem', padding: '0.5rem', opacity: 0.6 }}
              title="Debug: Force pass"
            >
              🐛 Force Pass
            </button>

            {canContinue && (
              <button 
                className="btn btn--success btn--large animate-in"
                onClick={handleContinue}
              >
                <span>Got it! ✓ Continue</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="sound-practice-screen__right">
          <h3 className="visualization-title">Tongue Position</h3>
          <TongueVisualization
            userPosition={detected}
            targetPosition={targetPos}
            targetVowel={sound.pinyin}
            size={380}
          />
          <p className="visualization-hint">
            Match the <span className="target">dashed outline</span> with your tongue
          </p>
        </div>
      </div>
    </div>
  );
};
