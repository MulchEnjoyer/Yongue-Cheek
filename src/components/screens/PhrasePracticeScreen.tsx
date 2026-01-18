import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Level } from '../../types';
import { TongueVisualization } from '../TongueVisualization';
import { AccuracyMeter } from '../AccuracyMeter';
import { AudioLevelVisualization } from '../AudioLevelVisualization';
import { ListenButton } from '../ListenButton';
import { ConfettiEffect } from '../ConfettiEffect';
import { AudioService, AnalysisResult } from '../../lib/AudioService';
import { DetectedVowel, VowelPosition, IPA_VOWELS } from '../../lib/VowelMapper';
import { playSuccessSound } from '../../lib/SoundUtils';

interface PhrasePracticeScreenProps {
  level: Level;
  onComplete: (accuracy: number) => void;
  onBack: () => void;
}

export const PhrasePracticeScreen: React.FC<PhrasePracticeScreenProps> = ({
  level,
  onComplete,
  onBack,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  const [audioIntensity, setAudioIntensity] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [detected, setDetected] = useState<DetectedVowel>({
    position: { x: 0.5, y: 0.5, f1: 0, f2: 0 },
    nearestVowel: null,
    confidence: 0,
    isVoiced: false,
  });

  const audioServiceRef = useRef<AudioService | null>(null);
  const passingTimeRef = useRef<number | null>(null);
  const smoothedAccuracyRef = useRef(0);
  const hasPlayedSoundRef = useRef(false);

  // Calculate blended target position from all sounds in all words
  const targetPosition = React.useMemo((): VowelPosition | null => {
    // Get all final sounds (vowels) and average their positions
    const finalSounds = level.words.flatMap(word => 
      word.sounds.filter(s => s.type === 'final' && s.targetPosition)
    );
    
    if (finalSounds.length === 0) return null;
    
    // Average the formant positions
    let totalF1 = 0;
    let totalF2 = 0;
    
    finalSounds.forEach(s => {
      const f1 = 850 - (s.targetPosition?.tongueHeight ?? 0.5) * 600;
      const f2 = 800 + (s.targetPosition?.tongueFrontness ?? 0.5) * 1600;
      totalF1 += f1;
      totalF2 += f2;
    });
    
    const avgF1 = totalF1 / finalSounds.length;
    const avgF2 = totalF2 / finalSounds.length;
    
    return {
      x: 1 - (avgF2 - 800) / 1600,
      y: (avgF1 - 250) / 600,
      f1: avgF1,
      f2: avgF2,
    };
  }, [level.words]);

  // Calculate accuracy based on formant distance
  // Extra lenient for phrases since you're speaking multiple sounds
  const calculateAccuracy = useCallback((userF1: number, userF2: number): number => {
    if (!targetPosition || userF1 === 0 || userF2 === 0) return 0;
    
    // Normalize distances by formant ranges
    const f1Diff = Math.abs(userF1 - targetPosition.f1) / 600;
    const f2Diff = Math.abs(userF2 - targetPosition.f2) / 1600;
    
    const normalizedDistance = Math.sqrt(f1Diff ** 2 + f2Diff ** 2);
    
    // Even more lenient for phrases (0.8 instead of 1.2)
    const accuracy = 100 * Math.exp(-normalizedDistance * 0.8);
    const boost = normalizedDistance < 0.4 ? 15 : 0;
    
    return Math.min(100, accuracy + boost);
  }, [targetPosition]);

  const handleAudioResult = useCallback((result: AnalysisResult) => {
    // Update audio intensity for visualization
    const normalizedIntensity = Math.min(100, Math.max(0, (result.intensity + 40) * 2));
    setAudioIntensity(normalizedIntensity);
    
    if (!result.isVoiced) {
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

    const newAccuracy = calculateAccuracy(result.f1, result.f2);
    
    // Light smoothing for responsive feel
    smoothedAccuracyRef.current = smoothedAccuracyRef.current * 0.5 + newAccuracy * 0.5;
    setAccuracy(Math.round(smoothedAccuracyRef.current));

    // Check passing threshold (45% for phrases) for 100ms
    // Once passed, keep canContinue true (don't reset if accuracy drops)
    if (smoothedAccuracyRef.current >= 45) {
      if (passingTimeRef.current === null) {
        passingTimeRef.current = Date.now();
      } else if (Date.now() - passingTimeRef.current >= 100) {
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
  }, [calculateAccuracy]);

  const startListening = async () => {
    if (!audioServiceRef.current) {
      audioServiceRef.current = new AudioService();
    }

    const success = await audioServiceRef.current.start(handleAudioResult);
    if (success) {
      setIsListening(true);
      setAttempts(prev => prev + 1);
    }
  };

  const stopListening = () => {
    audioServiceRef.current?.stop();
    setIsListening(false);
  };

  const handleTryAgain = () => {
    stopListening();
    setAccuracy(0);
    setCanContinue(false);
    passingTimeRef.current = null;
    smoothedAccuracyRef.current = 0;
    hasPlayedSoundRef.current = false;
  };

  useEffect(() => {
    return () => {
      audioServiceRef.current?.stop();
    };
  }, []);

  const handleContinue = () => {
    stopListening();
    onComplete(accuracy);
  };

  return (
    <div className="screen phrase-practice-screen">
      <ConfettiEffect trigger={canContinue} duration={2000} />
      <div className="phrase-practice-screen__header">
        <button className="btn btn--ghost back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Exit</span>
        </button>
        <h2 className="phrase-practice-screen__title">Final Challenge</h2>
        <p className="phrase-practice-screen__subtitle">
          Speak the complete phrase
        </p>
      </div>

      <div className="phrase-practice-screen__content">
        <div className="phrase-practice-screen__left">
          <div className="phrase-display-card">
            <div className="phrase-display-card__header">
              <div className="phrase-display-card__chinese">{level.phrase}</div>
              <ListenButton text={level.phrase} type="phrase" size="large" />
            </div>
            <div className="phrase-display-card__pinyin">{level.pinyin}</div>
            <div className="phrase-display-card__translation">"{level.translation}"</div>
          </div>

          <AccuracyMeter 
            accuracy={accuracy} 
            threshold={45} 
            label="Phrase Accuracy" 
            size="large"
          />

          <div className="phrase-practice-screen__words-preview">
            {level.words.map((word, index) => (
              <div key={word.id} className="word-preview">
                <span className="word-preview__chinese">{word.characters}</span>
                <span className="word-preview__pinyin">{word.pinyin}</span>
                {index < level.words.length - 1 && <span className="word-preview__separator">+</span>}
              </div>
            ))}
          </div>

          <div className="phrase-practice-screen__actions">
            {!isListening ? (
              <button className="btn btn--primary btn--large" onClick={startListening}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <span>Speak the Phrase</span>
              </button>
            ) : (
              <button className="btn btn--secondary btn--large listening" onClick={stopListening}>
                <AudioLevelVisualization intensity={audioIntensity} isActive={isListening} />
                <span>Listening...</span>
              </button>
            )}

            {attempts > 0 && !isListening && !canContinue && (
              <button className="btn btn--ghost" onClick={handleTryAgain}>
                Try Again
              </button>
            )}

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
                <span>Complete Level ✓</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="phrase-practice-screen__right">
          <h3 className="visualization-title">Tongue Position</h3>
          <TongueVisualization
            userPosition={detected}
            targetPosition={targetPosition}
            targetVowel={level.pinyin}
            size={380}
          />
          <p className="visualization-hint">
            Say the complete phrase fluently
          </p>
        </div>
      </div>
    </div>
  );
};
