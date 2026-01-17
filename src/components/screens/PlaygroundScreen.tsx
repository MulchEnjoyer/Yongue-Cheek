import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TongueVisualization } from '../TongueVisualization';
import { AudioProcessor } from '../../lib/AudioProcessor';
import { VowelMapper, DetectedVowel, IPA_VOWELS } from '../../lib/VowelMapper';
import { AudioService, AnalysisResult } from '../../lib/AudioService';

interface PlaygroundScreenProps {
  onBack: () => void;
}

type AnalysisMode = 'backend' | 'browser';

export const PlaygroundScreen: React.FC<PlaygroundScreenProps> = ({ onBack }) => {
  const [isListening, setIsListening] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('browser');
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [backendChecking, setBackendChecking] = useState(true);
  const [detected, setDetected] = useState<DetectedVowel>({
    position: { x: 0.5, y: 0.5, f1: 0, f2: 0 },
    nearestVowel: null,
    confidence: 0,
    isVoiced: false,
  });
  const [f1, setF1] = useState(0);
  const [f2, setF2] = useState(0);
  const [energy, setEnergy] = useState(0);

  // Browser-based analysis refs
  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const vowelMapperRef = useRef<VowelMapper>(new VowelMapper());
  const animationFrameRef = useRef<number>();

  // Backend-based analysis refs
  const audioServiceRef = useRef<AudioService | null>(null);

  // Check if backend is available on mount
  useEffect(() => {
    const checkBackend = async () => {
      setBackendChecking(true);
      const available = await AudioService.checkBackend();
      setBackendAvailable(available);
      if (available) {
        setAnalysisMode('backend');
      }
      setBackendChecking(false);
    };
    checkBackend();
  }, []);

  // Browser-based audio processing loop
  const processBrowserAudio = useCallback(() => {
    if (!audioProcessorRef.current?.running) return;

    const features = audioProcessorRef.current.getFeatures();
    const vowelDetection = vowelMapperRef.current.mapToVowelSpace(features);
    
    setDetected(vowelDetection);
    setF1(features.formants[0]);
    setF2(features.formants[1]);
    setEnergy(features.energy * 100);

    animationFrameRef.current = requestAnimationFrame(processBrowserAudio);
  }, []);

  // Smoothing for even smoother display
  const smoothedRef = useRef({ f1: 0, f2: 0, x: 0.5, y: 0.5 });
  const smoothing = 0.4; // Client-side additional smoothing

  // Handle backend analysis results with client-side smoothing
  const handleBackendResult = useCallback((result: AnalysisResult) => {
    const vowel = result.detectedVowel 
      ? IPA_VOWELS.find(v => v.symbol === result.detectedVowel) 
      : null;

    // Apply client-side smoothing for ultra-smooth animation
    if (result.isVoiced) {
      smoothedRef.current.f1 = smoothedRef.current.f1 * smoothing + result.f1 * (1 - smoothing);
      smoothedRef.current.f2 = smoothedRef.current.f2 * smoothing + result.f2 * (1 - smoothing);
      smoothedRef.current.x = smoothedRef.current.x * smoothing + result.position.x * (1 - smoothing);
      smoothedRef.current.y = smoothedRef.current.y * smoothing + result.position.y * (1 - smoothing);
    } else {
      // Decay smoothly when not voiced
      smoothedRef.current.f1 *= 0.9;
      smoothedRef.current.f2 *= 0.9;
    }

    setDetected({
      position: {
        x: smoothedRef.current.x,
        y: smoothedRef.current.y,
        f1: smoothedRef.current.f1,
        f2: smoothedRef.current.f2,
      },
      nearestVowel: vowel || null,
      confidence: result.confidence,
      isVoiced: result.isVoiced || smoothedRef.current.f1 > 50,
    });
    setF1(smoothedRef.current.f1);
    setF2(smoothedRef.current.f2);
    setEnergy(result.intensity);
  }, []);

  const startListening = async () => {
    if (analysisMode === 'backend') {
      // Use backend with Parselmouth
      if (!audioServiceRef.current) {
        audioServiceRef.current = new AudioService();
      }
      const success = await audioServiceRef.current.start(handleBackendResult);
      if (success) {
        setIsListening(true);
      } else {
        // Fallback to browser mode if backend fails
        console.warn('Backend connection failed, falling back to browser mode');
        setAnalysisMode('browser');
        startBrowserListening();
      }
    } else {
      // Use browser-based analysis
      startBrowserListening();
    }
  };

  const startBrowserListening = async () => {
    if (!audioProcessorRef.current) {
      audioProcessorRef.current = new AudioProcessor();
    }
    const success = await audioProcessorRef.current.start();
    if (success) {
      setIsListening(true);
      processBrowserAudio();
    }
  };

  const stopListening = () => {
    // Stop backend service
    audioServiceRef.current?.stop();
    
    // Stop browser-based processing
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    audioProcessorRef.current?.stop();
    
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  useEffect(() => {
    return () => {
      stopListening();
    };
  }, []);

  return (
    <div className="screen playground-screen">
      <div className="playground-screen__header">
        <button className="btn btn--ghost" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back to Menu</span>
        </button>
        <h1 className="playground-screen__title">IPA Vowel Space</h1>
        <div className="analysis-mode-indicator">
          {backendChecking ? (
            <span className="mode-badge mode-badge--checking">Checking backend...</span>
          ) : backendAvailable ? (
            <span 
              className={`mode-badge mode-badge--backend ${analysisMode === 'backend' ? 'active' : ''}`}
              onClick={() => setAnalysisMode('backend')}
              title="Parselmouth (accurate)"
            >
              🎯 Parselmouth
            </span>
          ) : (
            <span className="mode-badge mode-badge--browser" title="Browser-based (basic)">
              🌐 Browser
            </span>
          )}
        </div>
      </div>

      <div className="playground-screen__content">
        <div className="playground-screen__visualization">
          <TongueVisualization
            userPosition={detected}
            size={450}
          />
        </div>

        <div className="playground-screen__controls">
          <div className="playground-screen__formants">
            <div className="formant-display">
              <div className="formant-display__header">
                <span className="formant-display__label">F1</span>
                <span className="formant-display__sublabel">Height</span>
              </div>
              <div className="formant-display__value">{Math.round(f1)} <span>Hz</span></div>
              <div className="formant-display__bar">
                <div 
                  className="formant-display__fill formant-display__fill--f1"
                  style={{ width: `${Math.min(100, ((f1 - 250) / 600) * 100)}%` }}
                />
              </div>
              <div className="formant-display__range">
                <span>Close (250)</span>
                <span>Open (850)</span>
              </div>
            </div>

            <div className="formant-display">
              <div className="formant-display__header">
                <span className="formant-display__label">F2</span>
                <span className="formant-display__sublabel">Frontness</span>
              </div>
              <div className="formant-display__value">{Math.round(f2)} <span>Hz</span></div>
              <div className="formant-display__bar">
                <div 
                  className="formant-display__fill formant-display__fill--f2"
                  style={{ width: `${Math.min(100, ((f2 - 800) / 1600) * 100)}%` }}
                />
              </div>
              <div className="formant-display__range">
                <span>Back (800)</span>
                <span>Front (2400)</span>
              </div>
            </div>
          </div>

          <div className="playground-screen__detected">
            <h3>Detected Vowel</h3>
            {detected.isVoiced && detected.nearestVowel ? (
              <div className="detected-vowel">
                <span className="detected-vowel__symbol">{detected.nearestVowel.symbol}</span>
                <div className="detected-vowel__info">
                  <span className="detected-vowel__name">{detected.nearestVowel.name}</span>
                  <span className="detected-vowel__example">as in "{detected.nearestVowel.example}"</span>
                </div>
                <div className="detected-vowel__confidence">
                  <div 
                    className="detected-vowel__confidence-bar"
                    style={{ 
                      width: `${detected.confidence * 100}%`,
                      backgroundColor: detected.confidence > 0.6 ? '#4ade80' : '#fbbf24'
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="detected-vowel detected-vowel--empty">
                <span className="detected-vowel__symbol">?</span>
                <span className="detected-vowel__hint">Speak a vowel sound</span>
              </div>
            )}
          </div>

          <div className="playground-screen__vowel-chart">
            <h3>Reference Vowels</h3>
            <div className="vowel-reference-grid">
              {IPA_VOWELS.slice(0, 8).map(vowel => (
                <div key={vowel.symbol} className="vowel-reference">
                  <span className="vowel-reference__symbol">{vowel.symbol}</span>
                  <span className="vowel-reference__example">{vowel.example}</span>
                </div>
              ))}
            </div>
          </div>

          <button 
            className={`btn btn--large ${isListening ? 'btn--secondary listening' : 'btn--primary'}`}
            onClick={toggleListening}
          >
            {isListening ? (
              <>
                <span className="pulse-dot" />
                <span>Listening... (Click to Stop)</span>
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                </svg>
                <span>Start Microphone</span>
              </>
            )}
          </button>

          <p className="playground-screen__hint">
            {analysisMode === 'backend' 
              ? '🎯 Using Parselmouth for accurate formant analysis'
              : '🌐 Using browser-based analysis (start backend for better accuracy)'}
            <br />
            Speak vowel sounds like "ee", "ah", "oo" to see your tongue position.
          </p>
        </div>
      </div>
    </div>
  );
};
