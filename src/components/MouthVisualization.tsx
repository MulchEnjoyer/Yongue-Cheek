import React, { useEffect, useRef } from 'react';
import { ArticulatoryPosition } from '../types';

interface MouthVisualizationProps {
  userPosition: ArticulatoryPosition;
  targetPosition?: ArticulatoryPosition;
  showTarget?: boolean;
  size?: number;
}

export const MouthVisualization: React.FC<MouthVisualizationProps> = ({
  userPosition,
  targetPosition,
  showTarget = true,
  size = 300,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const currentPosRef = useRef<ArticulatoryPosition>({
    tongueHeight: 0.5,
    tongueFrontness: 0.5,
    lipRounding: 0.3,
    jawOpenness: 0.3,
    velumRaised: 1.0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Smooth interpolation
      const lerp = 0.15;
      currentPosRef.current = {
        tongueHeight: currentPosRef.current.tongueHeight + (userPosition.tongueHeight - currentPosRef.current.tongueHeight) * lerp,
        tongueFrontness: currentPosRef.current.tongueFrontness + (userPosition.tongueFrontness - currentPosRef.current.tongueFrontness) * lerp,
        lipRounding: currentPosRef.current.lipRounding + (userPosition.lipRounding - currentPosRef.current.lipRounding) * lerp,
        jawOpenness: currentPosRef.current.jawOpenness + (userPosition.jawOpenness - currentPosRef.current.jawOpenness) * lerp,
        velumRaised: currentPosRef.current.velumRaised + (userPosition.velumRaised - currentPosRef.current.velumRaised) * lerp,
      };

      const pos = currentPosRef.current;
      const w = canvas.width;
      const h = canvas.height;

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // Background - oral cavity
      const gradient = ctx.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, w * 0.45);
      gradient.addColorStop(0, '#2d1f1f');
      gradient.addColorStop(1, '#1a0f0f');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.5, w * 0.45, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw target position if provided
      if (showTarget && targetPosition) {
        drawMouth(ctx, targetPosition, w, h, true);
      }

      // Draw user's current position
      drawMouth(ctx, pos, w, h, false);

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [userPosition, targetPosition, showTarget]);

  const drawMouth = (
    ctx: CanvasRenderingContext2D,
    pos: ArticulatoryPosition,
    w: number,
    h: number,
    isTarget: boolean
  ) => {
    const alpha = isTarget ? 0.3 : 1;
    const strokeStyle = isTarget ? 'rgba(196, 30, 58, 0.5)' : 'rgba(255, 255, 255, 0.9)';
    
    // Palate (roof of mouth)
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = isTarget ? 2 : 3;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.35);
    ctx.quadraticCurveTo(w * 0.5, h * 0.15, w * 0.85, h * 0.35);
    ctx.stroke();

    // Velum (soft palate)
    const velumY = h * 0.35 - (1 - pos.velumRaised) * h * 0.1;
    ctx.fillStyle = isTarget ? 'rgba(196, 30, 58, 0.3)' : `rgba(232, 190, 172, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(w * 0.65, h * 0.35);
    ctx.quadraticCurveTo(w * 0.75, velumY, w * 0.85, h * 0.35);
    ctx.quadraticCurveTo(w * 0.8, h * 0.32, w * 0.65, h * 0.35);
    ctx.fill();

    // Tongue
    const tongueBaseX = w * 0.2;
    const tongueBaseY = h * 0.75 - pos.jawOpenness * h * 0.15;
    const tongueTipX = w * 0.3 + pos.tongueFrontness * w * 0.35;
    const tongueTipY = h * 0.65 - pos.tongueHeight * h * 0.3 - pos.jawOpenness * h * 0.1;
    const tongueBackX = w * 0.7;
    const tongueBackY = h * 0.7 - pos.tongueHeight * h * 0.15 * (1 - pos.tongueFrontness);

    ctx.fillStyle = isTarget ? 'rgba(196, 30, 58, 0.4)' : `rgba(224, 136, 136, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(tongueBaseX, tongueBaseY);
    ctx.quadraticCurveTo(
      tongueTipX - w * 0.1,
      tongueTipY + h * 0.05,
      tongueTipX,
      tongueTipY
    );
    ctx.quadraticCurveTo(
      (tongueTipX + tongueBackX) / 2,
      Math.min(tongueTipY, tongueBackY) - h * 0.05,
      tongueBackX,
      tongueBackY
    );
    ctx.quadraticCurveTo(
      w * 0.75,
      h * 0.75 - pos.jawOpenness * h * 0.1,
      w * 0.7,
      h * 0.8 - pos.jawOpenness * h * 0.1
    );
    ctx.lineTo(tongueBaseX, tongueBaseY);
    ctx.fill();

    // Tongue outline
    ctx.strokeStyle = isTarget ? 'rgba(196, 30, 58, 0.5)' : `rgba(180, 80, 80, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tongueBaseX, tongueBaseY);
    ctx.quadraticCurveTo(
      tongueTipX - w * 0.1,
      tongueTipY + h * 0.05,
      tongueTipX,
      tongueTipY
    );
    ctx.quadraticCurveTo(
      (tongueTipX + tongueBackX) / 2,
      Math.min(tongueTipY, tongueBackY) - h * 0.05,
      tongueBackX,
      tongueBackY
    );
    ctx.stroke();

    // Lower jaw
    const jawY = h * 0.85 + pos.jawOpenness * h * 0.1;
    ctx.fillStyle = isTarget ? 'rgba(196, 30, 58, 0.2)' : `rgba(232, 200, 185, ${alpha * 0.8})`;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, jawY);
    ctx.quadraticCurveTo(w * 0.5, jawY + h * 0.08, w * 0.9, jawY);
    ctx.lineTo(w * 0.9, h);
    ctx.lineTo(w * 0.1, h);
    ctx.closePath();
    ctx.fill();

    // Lips
    const lipWidth = w * 0.12 + (1 - pos.lipRounding) * w * 0.08;
    const lipHeight = h * 0.08 + pos.jawOpenness * h * 0.12;
    const lipX = w * 0.08;
    const lipY = h * 0.45;

    // Upper lip
    ctx.fillStyle = isTarget ? 'rgba(196, 30, 58, 0.4)' : `rgba(200, 100, 100, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(lipX, lipY - lipHeight * 0.3, lipWidth * 0.8, lipHeight * 0.4, 0, 0, Math.PI, true);
    ctx.fill();

    // Lower lip
    ctx.beginPath();
    ctx.ellipse(lipX, lipY + pos.jawOpenness * h * 0.15 + lipHeight * 0.3, lipWidth * 0.9, lipHeight * 0.5, 0, 0, Math.PI);
    ctx.fill();

    // Teeth hint
    if (!isTarget) {
      ctx.fillStyle = `rgba(255, 255, 250, ${alpha * 0.7})`;
      ctx.beginPath();
      ctx.rect(w * 0.02, h * 0.38, lipWidth * 0.5, h * 0.04);
      ctx.fill();
      
      ctx.beginPath();
      ctx.rect(w * 0.02, h * 0.52 + pos.jawOpenness * h * 0.1, lipWidth * 0.5, h * 0.04);
      ctx.fill();
    }
  };

  return (
    <div className="mouth-visualization">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 0 60px rgba(196, 30, 58, 0.1)',
        }}
      />
      {showTarget && targetPosition && (
        <div className="visualization-legend">
          <span className="legend-item user">
            <span className="dot"></span> Your position
          </span>
          <span className="legend-item target">
            <span className="dot"></span> Target position
          </span>
        </div>
      )}
    </div>
  );
};
