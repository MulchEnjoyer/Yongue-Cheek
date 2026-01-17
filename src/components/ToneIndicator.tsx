import React from 'react';

interface ToneIndicatorProps {
  toneNumber: number;
  size?: 'small' | 'medium' | 'large';
}

const toneDescriptions: Record<number, { name: string; description: string; path: string }> = {
  1: {
    name: 'First Tone',
    description: 'High and flat',
    path: 'M 10 20 L 90 20',
  },
  2: {
    name: 'Second Tone', 
    description: 'Rising',
    path: 'M 10 60 Q 50 40 90 20',
  },
  3: {
    name: 'Third Tone',
    description: 'Dipping',
    path: 'M 10 30 Q 30 70 50 60 Q 70 50 90 30',
  },
  4: {
    name: 'Fourth Tone',
    description: 'Falling',
    path: 'M 10 20 Q 50 40 90 70',
  },
  5: {
    name: 'Neutral Tone',
    description: 'Light and short',
    path: 'M 30 45 L 70 45',
  },
};

export const ToneIndicator: React.FC<ToneIndicatorProps> = ({
  toneNumber,
  size = 'medium',
}) => {
  const tone = toneDescriptions[toneNumber] || toneDescriptions[5];
  
  const dimensions = {
    small: { width: 60, height: 40 },
    medium: { width: 100, height: 60 },
    large: { width: 140, height: 80 },
  };

  const { width, height } = dimensions[size];

  return (
    <div className={`tone-indicator tone-indicator--${size}`}>
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 100 80"
        className="tone-indicator__svg"
      >
        <defs>
          <linearGradient id={`tone-gradient-${toneNumber}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c41e3a" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>
        </defs>
        <path
          d={tone.path}
          stroke={`url(#tone-gradient-${toneNumber})`}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <div className="tone-indicator__info">
        <span className="tone-indicator__name">{tone.name}</span>
        <span className="tone-indicator__description">{tone.description}</span>
      </div>
    </div>
  );
};
