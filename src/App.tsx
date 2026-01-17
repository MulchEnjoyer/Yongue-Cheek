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

  // Calculate total sounds across all words
  const allSounds = level.words.flatMap((word, wordIdx) =>
    word.sounds.map((sound, soundIdx) => ({
      word,
      sound,
      globalIndex: level.words.slice(0, wordIdx).reduce((sum, w) => sum + w.sounds.length, 0) + soundIdx,
    }))
  );
  const totalSounds = allSounds.length;

  // Get current sound info
  const getCurrentSoundInfo = useCallback(() => {
    let soundCount = 0;
    for (let wordIdx = 0; wordIdx < level.words.length; wordIdx++) {
      const word = level.words[wordIdx];
      for (let soundIdx = 0; soundIdx < word.sounds.length; soundIdx++) {
        if (wordIdx === progress.currentWordIndex && soundIdx === progress.currentSoundIndex) {
          return { word, sound: word.sounds[soundIdx], globalIndex: soundCount };
        }
        soundCount++;
      }
    }
    return null;
  }, [level.words, progress.currentWordIndex, progress.currentSoundIndex]);

  const handleStartLearning = () => {
    setProgress(prev => ({ ...prev, currentStep: 'breakdown' }));
  };

  const handlePlayground = () => {
    setProgress(prev => ({ ...prev, currentStep: 'playground' }));
  };

  const handleBackToHome = () => {
    setProgress(initialProgress);
  };

  const handleStartPractice = () => {
    setProgress(prev => ({ ...prev, currentStep: 'sound-practice' }));
  };

  const handleSelectLevel = (index: number) => {
    setCurrentLevelIndex(index);
    setProgress(initialProgress);
  };

  const handleSoundComplete = (accuracy: number) => {
    const soundInfo = getCurrentSoundInfo();
    if (!soundInfo) return;

    const newAccuracies = {
      ...progress.soundAccuracies,
      [soundInfo.sound.id]: accuracy,
    };

    // Move to next sound or next step
    const currentWord = level.words[progress.currentWordIndex];
    const isLastSoundInWord = progress.currentSoundIndex >= currentWord.sounds.length - 1;
    const isLastWord = progress.currentWordIndex >= level.words.length - 1;

    if (isLastSoundInWord && isLastWord) {
      // All sounds done, move to word practice
      setProgress(prev => ({
        ...prev,
        soundAccuracies: newAccuracies,
        currentStep: 'word-practice',
        currentWordIndex: 0,
        currentSoundIndex: 0,
      }));
    } else if (isLastSoundInWord) {
      // Move to next word's first sound
      setProgress(prev => ({
        ...prev,
        soundAccuracies: newAccuracies,
        currentWordIndex: prev.currentWordIndex + 1,
        currentSoundIndex: 0,
      }));
    } else {
      // Move to next sound in current word
      setProgress(prev => ({
        ...prev,
        soundAccuracies: newAccuracies,
        currentSoundIndex: prev.currentSoundIndex + 1,
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
  };

  const handleNextLevel = () => {
    if (currentLevelIndex < allLevels.length - 1) {
      setCurrentLevelIndex(currentLevelIndex + 1);
      setProgress(initialProgress);
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
      
      case 'word-practice':
        return (
          <WordPracticeScreen
            word={level.words[progress.currentWordIndex]}
            wordIndex={progress.currentWordIndex}
            totalWords={level.words.length}
            onComplete={handleWordComplete}
            onBack={handleBackToHome}
          />
        );
      
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
