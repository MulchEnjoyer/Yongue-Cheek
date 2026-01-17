import React from 'react';

interface DifficultyBadgeProps {
  difficulty: 'easy' | 'medium' | 'hard' | 'beginner' | 'intermediate' | 'advanced';
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty }) => {
  const config = {
    easy: { label: 'Easy', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
    beginner: { label: 'Beginner', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.15)' },
    medium: { label: 'Medium', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
    intermediate: { label: 'Intermediate', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' },
    hard: { label: 'Hard', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
    advanced: { label: 'Advanced', color: '#f87171', bg: 'rgba(248, 113, 113, 0.15)' },
  };

  const { label, color, bg } = config[difficulty];

  return (
    <span 
      className="difficulty-badge"
      style={{ 
        color,
        backgroundColor: bg,
        border: `1px solid ${color}40`,
      }}
    >
      {label}
    </span>
  );
};
