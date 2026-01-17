import React, { useState, useCallback } from 'react';
import { AppStep, LearningProgress, Level } from './types';
import { allLevels } from './data/LevelData';
import { IntroScreen } from './components/screens/IntroScreen';
import { PlaygroundScreen } from './components/screens/PlaygroundScreen';
import { BreakdownScreen } from './components/screens/BreakdownScreen';
import { SoundPracticeScreen } from './components/screens/SoundPracticeScreen';
import { WordPracticeScreen } from './components/screens/WordPracticeScreen';
import { PhrasePracticeScreen } from './components/screens/PhrasePracticeScreen';
import { CompleteScreen } from './components/screens/CompleteScreen';

const initialProgress: LearningProgress = {
  currentStep: 'intro',
  currentWordIndex: 0,
  currentSoundIndex: 0,
  soundAccuracies: {},
  wordAccuracies: {},
  phraseAccuracy: 0,
};

function App() {
  const [progress, setProgress] = useState<LearningProgress>(initialProgress);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());
  
  const level = allLevels[currentLevelIndex];

  // Calculate total sounds across all words (excluding tones - they're practiced with the full word)
  const allSounds = level.words.flatMap((word) =>
    word.sounds
      .filter(sound => sound.type !== 'tone') // Skip tone steps
      .map((sound) => ({ word, sound }))
  );
  const totalSounds = allSounds.length;

  // Track current sound using a simple flat index
  const [currentSoundIdx, setCurrentSoundIdx] = useState(0);

  // Get current sound info from flat array
  const getCurrentSoundInfo = useCallback(() => {
    if (currentSoundIdx >= allSounds.length) return null;
    return { 
      ...allSounds[currentSoundIdx], 
      globalIndex: currentSoundIdx 
    };
  }, [allSounds, currentSoundIdx]);

  const handleStartLearning = () => {
    setProgress(prev => ({ ...prev, currentStep: 'breakdown' }));
  };

  const handlePlayground = () => {
    setProgress(prev => ({ ...prev, currentStep: 'playground' }));
  };

  const handleBackToHome = () => {
    setProgress(initialProgress);
    setCurrentSoundIdx(0);
  };

  const handleStartPractice = () => {
    setProgress(prev => ({ ...prev, currentStep: 'sound-practice' }));
  };

  const handleSelectLevel = (index: number) => {
    setCurrentLevelIndex(index);
    setProgress(initialProgress);
    setCurrentSoundIdx(0);
  };

  const handleSoundComplete = (accuracy: number) => {
    const soundInfo = getCurrentSoundInfo();
    if (!soundInfo) return;

    const newAccuracies = {
      ...progress.soundAccuracies,
      [soundInfo.sound.id]: accuracy,
    };

    // Check if this is the last sound
    const isLastSound = currentSoundIdx >= totalSounds - 1;

    if (isLastSound) {
      // All sounds done, move to word practice
      setCurrentSoundIdx(0);
      setProgress(prev => ({
        ...prev,
        soundAccuracies: newAccuracies,
        currentStep: 'word-practice',
        currentWordIndex: 0,
      }));
    } else {
      // Move to next sound
      setCurrentSoundIdx(prev => prev + 1);
      setProgress(prev => ({
        ...prev,
        soundAccuracies: newAccuracies,
      }));
    }
  };

  const handleSoundSkip = () => {
    handleSoundComplete(0); // Skip with 0 accuracy
  };

  const handleWordComplete = (accuracy: number) => {
    const currentWord = level.words[progress.currentWordIndex];
    const newAccuracies = {
      ...progress.wordAccuracies,
      [currentWord.id]: accuracy,
    };

    const isLastWord = progress.currentWordIndex >= level.words.length - 1;

    if (isLastWord) {
      // Move to phrase practice
      setProgress(prev => ({
        ...prev,
        wordAccuracies: newAccuracies,
        currentStep: 'phrase-practice',
      }));
    } else {
      // Move to next word
      setProgress(prev => ({
        ...prev,
        wordAccuracies: newAccuracies,
        currentWordIndex: prev.currentWordIndex + 1,
      }));
    }
  };

  const handlePhraseComplete = (accuracy: number) => {
    // Mark current level as completed
    setCompletedLevels(prev => new Set([...prev, currentLevelIndex]));
    
    setProgress(prev => ({
      ...prev,
      phraseAccuracy: accuracy,
      currentStep: 'complete',
    }));
  };

  const handleRestart = () => {
    setProgress(initialProgress);
    setCurrentSoundIdx(0);
  };

  const handleNextLevel = () => {
    if (currentLevelIndex < allLevels.length - 1) {
      setCurrentLevelIndex(currentLevelIndex + 1);
      setProgress(initialProgress);
      setCurrentSoundIdx(0);
    }
  };

  const renderCurrentStep = () => {
    switch (progress.currentStep) {
      case 'intro':
        return (
          <IntroScreen 
            level={level} 
            allLevels={allLevels}
            currentLevelIndex={currentLevelIndex}
            completedLevels={completedLevels}
            onStart={handleStartLearning} 
            onPlayground={handlePlayground}
            onSelectLevel={handleSelectLevel}
          />
        );
      
      case 'playground':
        return <PlaygroundScreen onBack={handleBackToHome} />;
      
      case 'breakdown':
        return (
          <BreakdownScreen 
            level={level} 
            onContinue={handleStartPractice} 
            onBack={handleBackToHome}
          />
        );
      
      case 'sound-practice': {
        const soundInfo = getCurrentSoundInfo();
        if (!soundInfo) return null;
        return (
          <SoundPracticeScreen
            word={soundInfo.word}
            sound={soundInfo.sound}
            soundIndex={soundInfo.globalIndex}
            totalSounds={totalSounds}
            onComplete={handleSoundComplete}
            onSkip={handleSoundSkip}
            onBack={handleBackToHome}
          />
        );
      }
      
      case 'word-practice': {
        const currentWord = level.words[progress.currentWordIndex];
        if (!currentWord) {
          console.error('Word not found at index:', progress.currentWordIndex);
          return null;
        }
        return (
          <WordPracticeScreen
            word={currentWord}
            wordIndex={progress.currentWordIndex}
            totalWords={level.words.length}
            onComplete={handleWordComplete}
            onBack={handleBackToHome}
          />
        );
      }
      
      case 'phrase-practice':
        return (
          <PhrasePracticeScreen 
            level={level} 
            onComplete={handlePhraseComplete}
            onBack={handleBackToHome}
          />
        );
      
      case 'complete':
        return (
          <CompleteScreen
            level={level}
            soundAccuracies={progress.soundAccuracies}
            wordAccuracies={progress.wordAccuracies}
            phraseAccuracy={progress.phraseAccuracy}
            onRestart={handleRestart}
            onNextLevel={currentLevelIndex < allLevels.length - 1 ? handleNextLevel : undefined}
            onBackToHome={handleBackToHome}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__logo">
          <span className="app-header__icon">你</span>
          <span className="app-header__title">Hide Your CLB</span>
        </div>
        <nav className="app-header__nav">
          <span className={`step-indicator ${progress.currentStep === 'intro' ? 'active' : ''}`}>Intro</span>
          <span className={`step-indicator ${progress.currentStep === 'breakdown' ? 'active' : ''}`}>Breakdown</span>
          <span className={`step-indicator ${progress.currentStep === 'sound-practice' ? 'active' : ''}`}>Sounds</span>
          <span className={`step-indicator ${progress.currentStep === 'word-practice' ? 'active' : ''}`}>Words</span>
          <span className={`step-indicator ${progress.currentStep === 'phrase-practice' ? 'active' : ''}`}>Phrase</span>
          <span className={`step-indicator ${progress.currentStep === 'complete' ? 'active' : ''}`}>Complete</span>
        </nav>
      </header>
      <main className="app-main">
        {renderCurrentStep()}
      </main>
    </div>
  );
}

export default App;
