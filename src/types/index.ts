// Articulatory position for mouth visualization
export interface ArticulatoryPosition {
  tongueHeight: number;      // 0 (low) to 1 (high)
  tongueFrontness: number;   // 0 (back) to 1 (front)
  lipRounding: number;       // 0 (spread) to 1 (rounded)
  jawOpenness: number;       // 0 (closed) to 1 (open)
  velumRaised: number;       // 0 (lowered/nasal) to 1 (raised/oral)
}

// Individual sound/phoneme in a word
export interface Sound {
  id: string;
  pinyin: string;           // e.g., "n", "i", "h", "ao"
  ipa: string;              // IPA symbol e.g., "/n/", "/i/"
  type: 'initial' | 'final' | 'tone';
  difficulty: 'easy' | 'medium' | 'hard';
  targetPosition: ArticulatoryPosition;
  toneNumber?: number;      // 1-4 for tones
}

// Word within a phrase
export interface Word {
  id: string;
  characters: string;       // e.g., "你"
  pinyin: string;           // e.g., "nǐ"
  meaning: string;          // e.g., "you"
  sounds: Sound[];
  audioUrl?: string;
}

// Complete level data
export interface Level {
  id: string;
  phrase: string;           // e.g., "你好"
  pinyin: string;           // e.g., "nǐ hǎo"
  translation: string;      // e.g., "Hello"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  words: Word[];
  phraseAudioUrl?: string;
}

// App state for tracking progress
export interface LearningProgress {
  currentStep: AppStep;
  currentWordIndex: number;
  currentSoundIndex: number;
  soundAccuracies: Record<string, number>;
  wordAccuracies: Record<string, number>;
  phraseAccuracy: number;
}

export type AppStep = 
  | 'intro' 
  | 'playground'
  | 'breakdown' 
  | 'sound-practice' 
  | 'word-practice' 
  | 'phrase-practice' 
  | 'complete';

// Audio analysis results
export interface AudioFeatures {
  energy: number;           // 0-1 volume level
  pitch: number;            // Hz
  formants: number[];       // F1, F2, F3 frequencies
  isVoiced: boolean;
}
