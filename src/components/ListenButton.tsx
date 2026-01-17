import React, { useState } from 'react';
import { speechService } from '../lib/SpeechService';

interface ListenButtonProps {
  text: string;
  type?: 'sound' | 'word' | 'phrase';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const ListenButton: React.FC<ListenButtonProps> = ({
  text,
  type = 'word',
  size = 'medium',
  showLabel = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleClick = async () => {
    if (isPlaying) {
      speechService.stop();
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    try {
      switch (type) {
        case 'sound':
          await speechService.speakSound(text);
          break;
        case 'phrase':
          await speechService.speakPhrase(text);
          break;
        default:
          await speechService.speakWord(text);
      }
    } catch (e) {
      console.error('Speech failed:', e);
    } finally {
      setIsPlaying(false);
    }
  };

  const sizeClasses = {
    small: 'listen-btn--small',
    medium: 'listen-btn--medium',
    large: 'listen-btn--large',
  };

  return (
    <button 
      className={`listen-btn ${sizeClasses[size]} ${isPlaying ? 'playing' : ''}`}
      onClick={handleClick}
      title={`Listen to "${text}"`}
      aria-label={`Listen to pronunciation of ${text}`}
    >
      {isPlaying ? (
        <svg viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
          <path d="M15.54 8.46a5 5 0 010 7.07" />
          <path d="M19.07 4.93a10 10 0 010 14.14" />
        </svg>
      )}
      {showLabel && <span>{isPlaying ? 'Stop' : 'Listen'}</span>}
    </button>
  );
};
