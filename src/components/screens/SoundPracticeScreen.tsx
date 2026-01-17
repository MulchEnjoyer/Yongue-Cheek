import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Word, Sound } from '../../types';
import { TongueVisualization } from '../TongueVisualization';
import { AccuracyMeter } from '../AccuracyMeter';
import { ToneIndicator } from '../ToneIndicator';
import { DifficultyBadge } from '../DifficultyBadge';
import { AudioService, AnalysisResult } from '../../lib/AudioService';
import { VowelMapper, DetectedVowel, VowelPosition, IPA_VOWELS } from '../../lib/VowelMapper';

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

    // Check if passing threshold (50%) for 0.3 seconds
    if (smoothedAccuracyRef.current >= 50) {
      if (passingTimeRef.current === null) {
        passingTimeRef.current = Date.now();
      } else if (Date.now() - passingTimeRef.current >= 300) {
        setCanContinue(true);
      }
    } else {
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
    const pinyinLower = word.pinyin.toLowerCase();
    const soundLower = sound.pinyin.toLowerCase();
    const index = pinyinLower.indexOf(soundLower);
    
    if (index === -1 || sound.type === 'tone') {
      return <span>{word.pinyin}</span>;
    }

    return (
      <>
        {word.pinyin.slice(0, index)}
        <span className="highlight">{word.pinyin.slice(index, index + sound.pinyin.length)}</span>
        {word.pinyin.slice(index + sound.pinyin.length)}
      </>
    );
  };

  const targetPos = getTargetVowelPosition();

  return (
    <div className="screen sound-practice-screen">
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
                <span className="pulse-dot" />
                <span>Listening...</span>
              </button>
            )}

            <button className="btn btn--ghost" onClick={onSkip}>
              Skip this sound
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
