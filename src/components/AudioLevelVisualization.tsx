import React from 'react';

interface AudioLevelVisualizationProps {
  intensity: number; // 0-100
  isActive: boolean;
}

/**
 * Visual audio level meter showing volume/intensity levels
 * Displays animated bars that pulse based on audio input
 */
export const AudioLevelVisualization: React.FC<AudioLevelVisualizationProps> = ({
  intensity,
  isActive,
}) => {
  // Normalize intensity to 0-1 scale and distribute across bars
  const normalizedIntensity = Math.min(1, Math.max(0, intensity / 100));
  
  // Create 5 bars with different thresholds
  const bars = [
    { threshold: 0.1, height: 0.3 },
    { threshold: 0.3, height: 0.5 },
    { threshold: 0.5, height: 0.7 },
    { threshold: 0.7, height: 0.85 },
    { threshold: 0.85, height: 1.0 },
  ];

  return (
    <div className="audio-level-visualization">
      <div className="audio-level-visualization__bars">
        {bars.map((bar, index) => {
          const isActive = normalizedIntensity >= bar.threshold;
          const pulseIntensity = isActive 
            ? Math.min(1, (normalizedIntensity - bar.threshold) / (1 - bar.threshold))
            : 0;
          
          return (
            <div
              key={index}
              className={`audio-level-bar ${isActive ? 'active' : ''}`}
              style={{
                height: `${bar.height * 100}%`,
                opacity: isActive ? 0.5 + pulseIntensity * 0.5 : 0.2,
                transform: isActive 
                  ? `scaleY(${0.9 + pulseIntensity * 0.1})` 
                  : 'scaleY(0.8)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
