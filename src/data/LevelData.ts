import { Level, ArticulatoryPosition } from '../types';

// Target articulatory positions for common Chinese phonemes
const positions: Record<string, ArticulatoryPosition> = {
  // === INITIALS (Consonants) ===
  n: {
    tongueHeight: 0.8,
    tongueFrontness: 0.9,
    lipRounding: 0.2,
    jawOpenness: 0.3,
    velumRaised: 0.0,  // nasal
  },
  h: {
    tongueHeight: 0.3,
    tongueFrontness: 0.2,
    lipRounding: 0.3,
    jawOpenness: 0.4,
    velumRaised: 1.0,
  },
  x: {  // Like 'sh' but with tongue closer to teeth
    tongueHeight: 0.85,
    tongueFrontness: 0.85,
    lipRounding: 0.2,
    jawOpenness: 0.25,
    velumRaised: 1.0,
  },
  z: {  // Like 'dz' - voiced alveolar
    tongueHeight: 0.8,
    tongueFrontness: 0.9,
    lipRounding: 0.1,
    jawOpenness: 0.2,
    velumRaised: 1.0,
  },
  j: {  // Like 'j' in jeep but softer
    tongueHeight: 0.9,
    tongueFrontness: 0.95,
    lipRounding: 0.15,
    jawOpenness: 0.2,
    velumRaised: 1.0,
  },
  w: {  // Labio-velar approximant
    tongueHeight: 0.8,
    tongueFrontness: 0.2,
    lipRounding: 0.9,
    jawOpenness: 0.2,
    velumRaised: 1.0,
  },
  m: {  // Bilabial nasal
    tongueHeight: 0.5,
    tongueFrontness: 0.5,
    lipRounding: 0.0,
    jawOpenness: 0.1,
    velumRaised: 0.0,  // nasal
  },
  
  // === FINALS (Vowels) ===
  i: {  // High front unrounded
    tongueHeight: 0.9,
    tongueFrontness: 0.9,
    lipRounding: 0.1,
    jawOpenness: 0.2,
    velumRaised: 1.0,
  },
  e: {  // Mid front (as in 谢)
    tongueHeight: 0.6,
    tongueFrontness: 0.7,
    lipRounding: 0.2,
    jawOpenness: 0.4,
    velumRaised: 1.0,
  },
  a: {  // Open central
    tongueHeight: 0.2,
    tongueFrontness: 0.5,
    lipRounding: 0.2,
    jawOpenness: 0.8,
    velumRaised: 1.0,
  },
  ao: {  // Diphthong /aʊ/
    tongueHeight: 0.3,
    tongueFrontness: 0.3,
    lipRounding: 0.7,
    jawOpenness: 0.7,
    velumRaised: 1.0,
  },
  o: {  // Mid back rounded
    tongueHeight: 0.5,
    tongueFrontness: 0.2,
    lipRounding: 0.8,
    jawOpenness: 0.4,
    velumRaised: 1.0,
  },
  u: {  // High back rounded
    tongueHeight: 0.9,
    tongueFrontness: 0.1,
    lipRounding: 0.95,
    jawOpenness: 0.15,
    velumRaised: 1.0,
  },
  ie: {  // Diphthong /iɛ/
    tongueHeight: 0.7,
    tongueFrontness: 0.8,
    lipRounding: 0.15,
    jawOpenness: 0.35,
    velumRaised: 1.0,
  },
  ian: {  // /iɛn/
    tongueHeight: 0.65,
    tongueFrontness: 0.75,
    lipRounding: 0.15,
    jawOpenness: 0.4,
    velumRaised: 1.0,
  },
  
  // === TONES ===
  tone1: {  // High level
    tongueHeight: 0.5,
    tongueFrontness: 0.5,
    lipRounding: 0.3,
    jawOpenness: 0.4,
    velumRaised: 1.0,
  },
  tone2: {  // Rising
    tongueHeight: 0.5,
    tongueFrontness: 0.5,
    lipRounding: 0.3,
    jawOpenness: 0.4,
    velumRaised: 1.0,
  },
  tone3: {  // Dipping
    tongueHeight: 0.5,
    tongueFrontness: 0.5,
    lipRounding: 0.3,
    jawOpenness: 0.4,
    velumRaised: 1.0,
  },
  tone4: {  // Falling
    tongueHeight: 0.5,
    tongueFrontness: 0.5,
    lipRounding: 0.3,
    jawOpenness: 0.4,
    velumRaised: 1.0,
  },
};

// === LEVEL 1: 你好 (Hello) ===
export const level1: Level = {
  id: 'level-1-nihao',
  phrase: '你好',
  pinyin: 'nǐ hǎo',
  translation: 'Hello',
  difficulty: 'beginner',
  words: [
    {
      id: 'word-ni',
      characters: '你',
      pinyin: 'nǐ',
      meaning: 'you',
      sounds: [
        {
          id: 'sound-n',
          pinyin: 'n',
          ipa: '/n/',
          type: 'initial',
          difficulty: 'easy',
          targetPosition: positions.n,
        },
        {
          id: 'sound-i',
          pinyin: 'i',
          ipa: '/i/',
          type: 'final',
          difficulty: 'easy',
          targetPosition: positions.i,
        },
        {
          id: 'sound-tone3-ni',
          pinyin: '3rd tone',
          ipa: '˧˩˧',
          type: 'tone',
          difficulty: 'medium',
          targetPosition: positions.tone3,
          toneNumber: 3,
        },
      ],
    },
    {
      id: 'word-hao',
      characters: '好',
      pinyin: 'hǎo',
      meaning: 'good',
      sounds: [
        {
          id: 'sound-h',
          pinyin: 'h',
          ipa: '/x/',
          type: 'initial',
          difficulty: 'medium',
          targetPosition: positions.h,
        },
        {
          id: 'sound-ao',
          pinyin: 'ao',
          ipa: '/aʊ/',
          type: 'final',
          difficulty: 'easy',
          targetPosition: positions.ao,
        },
        {
          id: 'sound-tone3-hao',
          pinyin: '3rd tone',
          ipa: '˧˩˧',
          type: 'tone',
          difficulty: 'medium',
          targetPosition: positions.tone3,
          toneNumber: 3,
        },
      ],
    },
  ],
};

// === LEVEL 2: 谢谢 (Thank you) ===
export const level2: Level = {
  id: 'level-2-xiexie',
  phrase: '谢谢',
  pinyin: 'xiè xie',
  translation: 'Thank you',
  difficulty: 'beginner',
  words: [
    {
      id: 'word-xie1',
      characters: '谢',
      pinyin: 'xiè',
      meaning: 'to thank',
      sounds: [
        {
          id: 'sound-x1',
          pinyin: 'x',
          ipa: '/ɕ/',
          type: 'initial',
          difficulty: 'hard',
          targetPosition: positions.x,
        },
        {
          id: 'sound-ie1',
          pinyin: 'ie',
          ipa: '/iɛ/',
          type: 'final',
          difficulty: 'medium',
          targetPosition: positions.ie,
        },
        {
          id: 'sound-tone4-xie',
          pinyin: '4th tone',
          ipa: '˥˩',
          type: 'tone',
          difficulty: 'easy',
          targetPosition: positions.tone4,
          toneNumber: 4,
        },
      ],
    },
    {
      id: 'word-xie2',
      characters: '谢',
      pinyin: 'xie',
      meaning: '(neutral tone)',
      sounds: [
        {
          id: 'sound-x2',
          pinyin: 'x',
          ipa: '/ɕ/',
          type: 'initial',
          difficulty: 'hard',
          targetPosition: positions.x,
        },
        {
          id: 'sound-ie2',
          pinyin: 'ie',
          ipa: '/iɛ/',
          type: 'final',
          difficulty: 'medium',
          targetPosition: positions.ie,
        },
      ],
    },
  ],
};

// === LEVEL 3: 再见 (Goodbye) ===
export const level3: Level = {
  id: 'level-3-zaijian',
  phrase: '再见',
  pinyin: 'zài jiàn',
  translation: 'Goodbye',
  difficulty: 'beginner',
  words: [
    {
      id: 'word-zai',
      characters: '再',
      pinyin: 'zài',
      meaning: 'again',
      sounds: [
        {
          id: 'sound-z',
          pinyin: 'z',
          ipa: '/ts/',
          type: 'initial',
          difficulty: 'medium',
          targetPosition: positions.z,
        },
        {
          id: 'sound-ai',
          pinyin: 'ai',
          ipa: '/aɪ/',
          type: 'final',
          difficulty: 'easy',
          targetPosition: positions.a,
        },
        {
          id: 'sound-tone4-zai',
          pinyin: '4th tone',
          ipa: '˥˩',
          type: 'tone',
          difficulty: 'easy',
          targetPosition: positions.tone4,
          toneNumber: 4,
        },
      ],
    },
    {
      id: 'word-jian',
      characters: '见',
      pinyin: 'jiàn',
      meaning: 'to see',
      sounds: [
        {
          id: 'sound-j',
          pinyin: 'j',
          ipa: '/tɕ/',
          type: 'initial',
          difficulty: 'hard',
          targetPosition: positions.j,
        },
        {
          id: 'sound-ian',
          pinyin: 'ian',
          ipa: '/iɛn/',
          type: 'final',
          difficulty: 'medium',
          targetPosition: positions.ian,
        },
        {
          id: 'sound-tone4-jian',
          pinyin: '4th tone',
          ipa: '˥˩',
          type: 'tone',
          difficulty: 'easy',
          targetPosition: positions.tone4,
          toneNumber: 4,
        },
      ],
    },
  ],
};

// Backwards compatibility
export const demoLevel = level1;

// All levels
export const allLevels: Level[] = [level1, level2, level3];
