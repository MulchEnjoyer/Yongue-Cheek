import React, { useEffect, useState } from 'react';

interface ConfettiEffectProps {
  trigger: boolean;
  duration?: number;
}

/**
 * Lightweight confetti effect that triggers when canContinue becomes true
 */
export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ 
  trigger, 
  duration = 2000 
}) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsActive(true);
      const timer = setTimeout(() => {
        setIsActive(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  if (!isActive) return null;

  return (
    <div className="confetti-effect">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i * 5) % 100}%`,
            background: [
              'var(--color-accent-primary)',
              'var(--color-accent-gold)',
              'var(--color-success)',
              'var(--color-accent-secondary)',
              'var(--color-warning)',
            ][i % 5],
            animationDelay: `${i * 0.05}s`,
            animationDuration: `${1 + (i % 3) * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
};
