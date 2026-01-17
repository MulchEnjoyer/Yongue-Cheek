import React from 'react';
import { Level } from '../../types';

interface CompleteScreenProps {
  level: Level;
  soundAccuracies: Record<string, number>;
  wordAccuracies: Record<string, number>;
  phraseAccuracy: number;
  onRestart: () => void;
  onNextLevel?: () => void;
  onBackToHome: () => void;
}

export const CompleteScreen: React.FC<CompleteScreenProps> = ({
  level,
  soundAccuracies,
  wordAccuracies,
  phraseAccuracy,
  onRestart,
  onNextLevel,
  onBackToHome,
}) => {
  // Calculate averages
  const soundValues = Object.values(soundAccuracies);
  const wordValues = Object.values(wordAccuracies);
  
  const avgSoundAccuracy = soundValues.length > 0 
    ? soundValues.reduce((a, b) => a + b, 0) / soundValues.length 
    : 0;
  
  const avgWordAccuracy = wordValues.length > 0 
    ? wordValues.reduce((a, b) => a + b, 0) / wordValues.length 
    : 0;
  
  const overallScore = (avgSoundAccuracy + avgWordAccuracy + phraseAccuracy) / 3;

  const getGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: '#4ade80', message: 'Outstanding!' };
    if (score >= 80) return { grade: 'A', color: '#4ade80', message: 'Excellent!' };
    if (score >= 70) return { grade: 'B', color: '#a3e635', message: 'Great job!' };
    if (score >= 60) return { grade: 'C', color: '#fbbf24', message: 'Good effort!' };
    return { grade: 'D', color: '#fb923c', message: 'Keep practicing!' };
  };

  const { grade, color, message } = getGrade(overallScore);

  return (
    <div className="screen complete-screen">
      <div className="complete-screen__celebration">
        {/* Main confetti pieces */}
        <div className="confetti confetti--1" />
        <div className="confetti confetti--2" />
        <div className="confetti confetti--3" />
        <div className="confetti confetti--4" />
        <div className="confetti confetti--5" />
        {/* Additional confetti for more celebration */}
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={`extra-${i}`}
            className="confetti"
            style={{
              left: `${(i * 7) % 100}%`,
              background: [
                'var(--color-accent-primary)',
                'var(--color-accent-gold)',
                'var(--color-success)',
                'var(--color-accent-secondary)',
                'var(--color-warning)',
              ][i % 5],
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${3 + (i % 3)}s`,
            }}
          />
        ))}
      </div>

      <div className="complete-screen__content">
        <div className="complete-screen__header">
          <div className="complete-screen__badge" style={{ borderColor: color }}>
            <span className="complete-screen__grade" style={{ color }}>{grade}</span>
          </div>
          <h1 className="complete-screen__title">Level Complete!</h1>
          <p className="complete-screen__message">{message}</p>
        </div>

        <div className="complete-screen__phrase-card">
          <div className="complete-screen__chinese">{level.phrase}</div>
          <div className="complete-screen__pinyin">{level.pinyin}</div>
          <div className="complete-screen__translation">"{level.translation}"</div>
        </div>

        <div className="complete-screen__stats">
          <div className="stat-card">
            <div className="stat-card__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="stat-card__value">{Math.round(avgSoundAccuracy)}%</div>
            <div className="stat-card__label">Sound Accuracy</div>
            <div className="stat-card__count">{soundValues.length} sounds practiced</div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
              </svg>
            </div>
            <div className="stat-card__value">{Math.round(avgWordAccuracy)}%</div>
            <div className="stat-card__label">Word Accuracy</div>
            <div className="stat-card__count">{wordValues.length} words practiced</div>
          </div>

          <div className="stat-card stat-card--highlight">
            <div className="stat-card__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>
            <div className="stat-card__value">{Math.round(phraseAccuracy)}%</div>
            <div className="stat-card__label">Phrase Accuracy</div>
            <div className="stat-card__count">Complete phrase</div>
          </div>
        </div>

        <div className="complete-screen__overall">
          <span className="complete-screen__overall-label">Overall Score</span>
          <span className="complete-screen__overall-value" style={{ color }}>
            {Math.round(overallScore)}%
          </span>
        </div>

        <div className="complete-screen__actions">
          <button className="btn btn--ghost btn--large" onClick={onBackToHome}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span>Back to Journey</span>
          </button>
          
          <button className="btn btn--secondary btn--large" onClick={onRestart}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6"/>
              <path d="M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            <span>Practice Again</span>
          </button>
          
          {onNextLevel && (
            <button className="btn btn--primary btn--large" onClick={onNextLevel}>
              <span>Next Lesson</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
