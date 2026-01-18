import React, { useEffect, useState, useRef } from 'react';

interface ConfettiEffectProps {
  trigger: boolean;
  duration?: number;
}

/**
 * Lightweight confetti effect that triggers when canContinue becomes true
 * Now tracks transitions to ensure it triggers on every step/stage
 */
export const ConfettiEffect: React.FC<ConfettiEffectProps> = ({ 
  trigger, 
  duration = 2000 
}) => {
  const [isActive, setIsActive] = useState(false);
  const prevTriggerRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    // Trigger confetti when transitioning from false to true
    // Use undefined check to handle initial mount and resets properly
    if (trigger && prevTriggerRef.current !== true) {
      setIsActive(true);
      const timer = setTimeout(() => {
        setIsActive(false);
      }, duration);
      prevTriggerRef.current = trigger;
      return () => clearTimeout(timer);
    }
    // Always update ref to track current state
    prevTriggerRef.current = trigger;
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
