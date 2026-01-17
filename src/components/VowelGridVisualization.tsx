import React, { useEffect, useRef } from 'react';
import { DetectedVowel, IPA_VOWELS, VowelPosition } from '../lib/VowelMapper';

interface VowelGridVisualizationProps {
  userPosition: DetectedVowel;
  targetVowel?: string;
  targetPosition?: VowelPosition | null;
  size?: number;
  showLabels?: boolean;
}

export const VowelGridVisualization: React.FC<VowelGridVisualizationProps> = ({
  userPosition,
  targetVowel,
  targetPosition,
  size = 400,
  showLabels = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animatedPosRef = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      // Smooth animation
      const lerp = 0.12;
      if (userPosition.isVoiced) {
        animatedPosRef.current.x += (userPosition.position.x - animatedPosRef.current.x) * lerp;
        animatedPosRef.current.y += (userPosition.position.y - animatedPosRef.current.y) * lerp;
      }

      const w = canvas.width;
      const h = canvas.height;
      const padding = 50;
      const gridW = w - padding * 2;
      const gridH = h - padding * 2;

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Draw background
      const bgGradient = ctx.createLinearGradient(0, 0, w, h);
      bgGradient.addColorStop(0, '#1a1a2e');
      bgGradient.addColorStop(1, '#16213e');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, w, h);

      // Draw vowel trapezoid (IPA chart shape)
      drawVowelTrapezoid(ctx, padding, gridW, gridH);

      // Draw grid lines
      drawGridLines(ctx, padding, gridW, gridH);

      // Draw axis labels
      if (showLabels) {
        drawAxisLabels(ctx, w, h, padding);
      }

      // Draw cardinal vowel points
      drawCardinalVowels(ctx, padding, gridW, gridH);

      // Draw target position if provided
      if (targetPosition) {
        drawTargetPosition(ctx, targetPosition, targetVowel, padding, gridW, gridH);
      }

      // Draw user position
      if (userPosition.isVoiced) {
        drawUserPosition(ctx, animatedPosRef.current, userPosition, padding, gridW, gridH);
      }

      // Draw detected vowel info
      if (userPosition.isVoiced && userPosition.nearestVowel) {
        drawDetectedInfo(ctx, userPosition, w, h);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [userPosition, targetVowel, targetPosition, showLabels]);

  const drawVowelTrapezoid = (
    ctx: CanvasRenderingContext2D,
    padding: number,
    gridW: number,
    gridH: number
  ) => {
    // IPA vowel chart is a trapezoid, not a rectangle
    // Front side is taller than back side
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Top-left (close front) to top-right (close back)
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding + gridW * 0.7, padding);
    
    // Top-right to bottom-right (back vowels)
    ctx.lineTo(padding + gridW, padding + gridH);
    
    // Bottom-right to bottom-left (open vowels)
    ctx.lineTo(padding, padding + gridH);
    
    // Close the trapezoid
    ctx.closePath();
    ctx.stroke();

    // Fill with subtle gradient
    const gradient = ctx.createLinearGradient(padding, padding, padding + gridW, padding + gridH);
    gradient.addColorStop(0, 'rgba(196, 30, 58, 0.05)');
    gradient.addColorStop(1, 'rgba(212, 175, 55, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();
  };

  const drawGridLines = (
    ctx: CanvasRenderingContext2D,
    padding: number,
    gridW: number,
    gridH: number
  ) => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Horizontal lines for vowel height
    const heights = [0.2, 0.4, 0.6, 0.8];
    heights.forEach(y => {
      ctx.beginPath();
      ctx.moveTo(padding, padding + y * gridH);
      ctx.lineTo(padding + gridW, padding + y * gridH);
      ctx.stroke();
    });

    // Vertical lines for frontness
    const frontness = [0.33, 0.66];
    frontness.forEach(x => {
      ctx.beginPath();
      ctx.moveTo(padding + x * gridW, padding);
      ctx.lineTo(padding + x * gridW, padding + gridH);
      ctx.stroke();
    });

    ctx.setLineDash([]);
  };

  const drawAxisLabels = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    padding: number
  ) => {
    ctx.font = '12px "Crimson Pro", serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'center';

    // X-axis labels (frontness)
    ctx.fillText('Front', padding + 20, h - 10);
    ctx.fillText('Central', w / 2, h - 10);
    ctx.fillText('Back', w - padding - 20, h - 10);

    // Y-axis labels (height) - Close at top, Open at bottom
    ctx.save();
    ctx.translate(15, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Open (Low)', -80, 0);
    ctx.fillText('Close (High)', 80, 0);
    ctx.restore();
  };

  const drawCardinalVowels = (
    ctx: CanvasRenderingContext2D,
    padding: number,
    gridW: number,
    gridH: number
  ) => {
    // Draw each IPA vowel as a small labeled point
    IPA_VOWELS.forEach(vowel => {
      // Map F1/F2 to position
      const x = 1 - ((vowel.f2 - 800) / (2400 - 800));
      const y = (vowel.f1 - 250) / (850 - 250);
      
      const px = padding + x * gridW;
      const py = padding + y * gridH;

      // Draw point
      ctx.fillStyle = 'rgba(212, 175, 55, 0.6)';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();

      // Draw label
      ctx.font = '14px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(212, 175, 55, 0.9)';
      ctx.textAlign = 'center';
      ctx.fillText(vowel.symbol, px, py - 10);
    });
  };

  const drawTargetPosition = (
    ctx: CanvasRenderingContext2D,
    pos: VowelPosition,
    symbol: string | undefined,
    padding: number,
    gridW: number,
    gridH: number
  ) => {
    const px = padding + pos.x * gridW;
    const py = padding + pos.y * gridH;

    // Draw target circle
    ctx.strokeStyle = 'rgba(196, 30, 58, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py, 25, 0, Math.PI * 2);
    ctx.stroke();

    // Draw crosshair
    ctx.beginPath();
    ctx.moveTo(px - 15, py);
    ctx.lineTo(px + 15, py);
    ctx.moveTo(px, py - 15);
    ctx.lineTo(px, py + 15);
    ctx.stroke();

    // Draw label
    if (symbol) {
      ctx.font = 'bold 18px "JetBrains Mono", monospace';
      ctx.fillStyle = 'rgba(196, 30, 58, 1)';
      ctx.textAlign = 'center';
      ctx.fillText(symbol, px, py - 35);
      ctx.font = '11px "Crimson Pro", serif';
      ctx.fillText('TARGET', px, py + 45);
    }
  };

  const drawUserPosition = (
    ctx: CanvasRenderingContext2D,
    pos: { x: number; y: number },
    detected: DetectedVowel,
    padding: number,
    gridW: number,
    gridH: number
  ) => {
    const px = padding + pos.x * gridW;
    const py = padding + pos.y * gridH;

    // Draw glow effect
    const gradient = ctx.createRadialGradient(px, py, 0, px, py, 30);
    gradient.addColorStop(0, 'rgba(74, 222, 128, 0.4)');
    gradient.addColorStop(1, 'rgba(74, 222, 128, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, 30, 0, Math.PI * 2);
    ctx.fill();

    // Draw user dot
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(px, py, 12, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw detected vowel symbol inside
    if (detected.nearestVowel && detected.confidence > 0.5) {
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(detected.nearestVowel.symbol, px, py);
    }
  };

  const drawDetectedInfo = (
    ctx: CanvasRenderingContext2D,
    detected: DetectedVowel,
    w: number,
    h: number
  ) => {
    if (!detected.nearestVowel) return;

    const boxW = 140;
    const boxH = 70;
    const boxX = w - boxW - 10;
    const boxY = 10;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Content
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(detected.nearestVowel.symbol, boxX + boxW / 2, boxY + 30);

    ctx.font = '11px "Crimson Pro", serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText(detected.nearestVowel.name, boxX + boxW / 2, boxY + 50);

    ctx.fillStyle = detected.confidence > 0.6 ? '#4ade80' : '#fbbf24';
    ctx.fillText(`${Math.round(detected.confidence * 100)}% match`, boxX + boxW / 2, boxY + 65);
  };

  return (
    <div className="vowel-grid-visualization">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      />
      <div className="vowel-grid-legend">
        <span className="legend-item">
          <span className="dot user"></span> Your vowel
        </span>
        {targetPosition && (
          <span className="legend-item">
            <span className="dot target"></span> Target
          </span>
        )}
        <span className="legend-item">
          <span className="dot cardinal"></span> IPA vowels
        </span>
      </div>
    </div>
  );
};
