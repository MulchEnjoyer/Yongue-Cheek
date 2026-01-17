import React from 'react';

interface AccuracyMeterProps {
  accuracy: number;
  threshold?: number;
  label?: string;
  size?: 'small' | 'medium' | 'large';
}

export const AccuracyMeter: React.FC<AccuracyMeterProps> = ({
  accuracy,
  threshold = 60,
  label = 'Accuracy',
  size = 'medium',
}) => {
  const clampedAccuracy = Math.max(0, Math.min(100, accuracy));
  const isPassing = clampedAccuracy >= threshold;
  
  const getColor = (value: number) => {
    if (value >= 80) return '#4ade80'; // green
    if (value >= 60) return '#fbbf24'; // yellow
    if (value >= 40) return '#fb923c'; // orange
    return '#f87171'; // red
  };

  const dimensions = {
    small: { width: 120, height: 8 },
    medium: { width: 200, height: 12 },
    large: { width: 280, height: 16 },
  };

  const { width, height } = dimensions[size];
  const color = getColor(clampedAccuracy);

  return (
    <div className={`accuracy-meter accuracy-meter--${size}`}>
      <div className="accuracy-meter__header">
        <span className="accuracy-meter__label">{label}</span>
        <span 
          className="accuracy-meter__value"
          style={{ color }}
        >
          {Math.round(clampedAccuracy)}%
        </span>
      </div>
      <div 
        className="accuracy-meter__track"
        style={{ width, height }}
      >
        <div 
          className="accuracy-meter__fill"
          style={{ 
            width: `${clampedAccuracy}%`,
            backgroundColor: color,
            boxShadow: `0 0 ${height}px ${color}40`,
          }}
        />
        <div 
          className="accuracy-meter__threshold"
          style={{ 
            left: `${threshold}%`,
            height: height + 8,
          }}
        />
      </div>
      {/* Removed "Passing" text - it was confusing because Continue button has a hold delay */}
    </div>
  );
};
