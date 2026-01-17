import React from 'react';
import { Level } from '../../types';

interface IntroScreenProps {
  level: Level;
  allLevels: Level[];
  currentLevelIndex: number;
  completedLevels: Set<number>;
  onStart: () => void;
  onPlayground: () => void;
  onSelectLevel: (index: number) => void;
}

// Stage definitions
const stages = [
  {
    id: 1,
    name: 'Greetings',
    subtitle: 'Essential first words',
    unlocked: true,
    lessonCount: 4,
  },
  {
    id: 2,
    name: 'Numbers',
    subtitle: 'Count from 1 to 10',
    unlocked: false,
    lessonCount: 5,
  },
  {
    id: 3,
    name: 'Family',
    subtitle: 'Meet the relatives',
    unlocked: false,
    lessonCount: 6,
  },
];

export const IntroScreen: React.FC<IntroScreenProps> = ({ 
  level, 
  allLevels,
  currentLevelIndex,
  completedLevels,
  onStart, 
  onPlayground,
  onSelectLevel 
}) => {
  return (
    <div className="screen journey-screen">
      {/* Header */}
      <div className="journey-header">
        <h1 className="journey-header__title">Your Journey</h1>
        <p className="journey-header__subtitle">Master Mandarin, one sound at a time</p>
        
        <button className="btn btn--secondary playground-btn" onClick={onPlayground}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
            <line x1="9" y1="9" x2="9.01" y2="9"/>
            <line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <span>Visualizer Playground</span>
        </button>
      </div>

      {/* Journey Path */}
      <div className="journey-path">
        {stages.map((stage, stageIndex) => (
          <div key={stage.id} className={`journey-stage ${!stage.unlocked ? 'locked' : ''}`}>
            {/* Stage Header */}
            <div className="stage-header">
              <div className="stage-header__info">
                <span className="stage-header__number">Stage {stage.id}</span>
                <h2 className="stage-header__name">{stage.name}</h2>
                <p className="stage-header__subtitle">{stage.subtitle}</p>
              </div>
              {!stage.unlocked && (
                <div className="stage-header__lock">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17a2 2 0 002-2v-2a2 2 0 00-4 0v2a2 2 0 002 2z"/>
                    <path d="M18 8h-1V6A5 5 0 007 6v2H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V10a2 2 0 00-2-2zM9 6a3 3 0 016 0v2H9V6z"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Lessons in Stage */}
            <div className="stage-lessons">
              {stage.unlocked ? (
                // Real lessons for unlocked stage
                allLevels.map((lvl, idx) => (
                  <div key={lvl.id} className="lesson-node-wrapper">
                    {/* Connector line */}
                    {idx > 0 && <div className="lesson-connector" />}
                    
                    <button
                      className={`lesson-node ${idx === currentLevelIndex ? 'active' : ''} ${completedLevels.has(idx) ? 'completed' : ''}`}
                      onClick={() => onSelectLevel(idx)}
                    >
                      <div className="lesson-node__icon">
                        <span className="lesson-node__chinese">{lvl.phrase}</span>
                      </div>
                      <div className="lesson-node__info">
                        <span className="lesson-node__translation">{lvl.translation}</span>
                        <span className="lesson-node__pinyin">{lvl.pinyin}</span>
                      </div>
                      {completedLevels.has(idx) && (
                        <div className="lesson-node__check">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  </div>
                ))
              ) : (
                // Placeholder lessons for locked stages
                Array.from({ length: stage.lessonCount }).map((_, idx) => (
                  <div key={idx} className="lesson-node-wrapper">
                    {idx > 0 && <div className="lesson-connector locked" />}
                    <div className="lesson-node locked">
                      <div className="lesson-node__icon locked">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" opacity="0.4">
                          <circle cx="12" cy="12" r="10"/>
                        </svg>
                      </div>
                      <div className="lesson-node__info">
                        <span className="lesson-node__translation locked">???</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Selected Lesson Detail Card */}
      {stages[0].unlocked && (
        <div className="lesson-detail-card">
          <div className="lesson-detail-card__header">
            <div className="lesson-detail-card__chinese">{level.phrase}</div>
            <div className="lesson-detail-card__pinyin">{level.pinyin}</div>
          </div>
          <div className="lesson-detail-card__body">
            <p className="lesson-detail-card__translation">"{level.translation}"</p>
            <div className="lesson-detail-card__stats">
              <span>{level.words.length} words</span>
              <span>•</span>
              <span>{level.words.reduce((sum, w) => sum + w.sounds.length, 0)} sounds</span>
            </div>
          </div>
          <button className="btn btn--primary btn--large" onClick={onStart}>
            <span>Start Lesson</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};
