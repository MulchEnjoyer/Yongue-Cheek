import React from 'react';
import { Level } from '../../types';
import { DifficultyBadge } from '../DifficultyBadge';

interface BreakdownScreenProps {
  level: Level;
  onContinue: () => void;
  onBack: () => void;
}

export const BreakdownScreen: React.FC<BreakdownScreenProps> = ({ level, onContinue, onBack }) => {
  return (
    <div className="screen breakdown-screen">
      <div className="breakdown-screen__header">
        <button className="btn btn--ghost back-btn" onClick={onBack}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back</span>
        </button>
        <h2 className="breakdown-screen__title">Word Breakdown</h2>
        <p className="breakdown-screen__subtitle">
          Let's break down <span className="highlight">{level.phrase}</span> into individual sounds
        </p>
      </div>

      <div className="breakdown-screen__words">
        {level.words.map((word, wordIndex) => (
          <div key={word.id} className="word-card" style={{ animationDelay: `${wordIndex * 0.15}s` }}>
            <div className="word-card__header">
              <span className="word-card__number">{wordIndex + 1}</span>
              <div className="word-card__main">
                <span className="word-card__chinese">{word.characters}</span>
                <span className="word-card__pinyin">{word.pinyin}</span>
              </div>
              <span className="word-card__meaning">{word.meaning}</span>
            </div>
            
            <div className="word-card__sounds">
              {word.sounds
                .filter(sound => sound.type !== 'tone') // Skip tone display - practiced with full word
                .map((sound, soundIndex) => (
                <div 
                  key={sound.id} 
                  className="sound-chip"
                  style={{ animationDelay: `${(wordIndex * 0.15) + (soundIndex * 0.1)}s` }}
                >
                  <span className="sound-chip__pinyin">{sound.pinyin}</span>
                  <span className="sound-chip__ipa">{sound.ipa}</span>
                  <DifficultyBadge difficulty={sound.difficulty} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="breakdown-screen__actions">
        <button className="btn btn--primary btn--large" onClick={onContinue}>
          <span>Practice Sounds</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
};
