import React, { useEffect, useRef } from 'react';
import { DetectedVowel, VowelPosition, IPA_VOWELS } from '../lib/VowelMapper';

interface TongueVisualizationProps {
  userPosition: DetectedVowel;
  targetPosition?: VowelPosition | null;
  targetVowel?: string;
  size?: number;
}

export const TongueVisualization: React.FC<TongueVisualizationProps> = ({
  userPosition,
  targetPosition,
  targetVowel,
  size = 450,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Animated state
  const animState = useRef({
    x: 0.5,        // Tongue frontness (0=front, 1=back)
    y: 0.4,        // Tongue height (0=close, 1=open)
    jawOpen: 0.25, // Jaw openness
    lipRound: 0.3, // Lip rounding (0=spread, 1=rounded)
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      
      const lerp = 0.12;
      if (userPosition.isVoiced) {
        animState.current.x += (userPosition.position.x - animState.current.x) * lerp;
        animState.current.y += (userPosition.position.y - animState.current.y) * lerp;
        const targetJaw = 0.1 + userPosition.position.y * 0.5;
        animState.current.jawOpen += (targetJaw - animState.current.jawOpen) * lerp;
        // Lip rounding: back vowels tend to be more rounded
        const targetRound = userPosition.position.x * 0.6 + (1 - userPosition.position.y) * 0.2;
        animState.current.lipRound += (targetRound - animState.current.lipRound) * lerp;
      } else {
        animState.current.x += (0.5 - animState.current.x) * lerp * 0.3;
        animState.current.y += (0.35 - animState.current.y) * lerp * 0.3;
        animState.current.jawOpen += (0.2 - animState.current.jawOpen) * lerp * 0.3;
        animState.current.lipRound += (0.3 - animState.current.lipRound) * lerp * 0.3;
      }

      const { x: tongueX, y: tongueY, jawOpen, lipRound } = animState.current;

      ctx.clearRect(0, 0, w, h);

      drawBackground(ctx, w, h);
      drawPharynx(ctx, w, h);
      drawSoftPalate(ctx, w, h);
      drawHardPalate(ctx, w, h);
      drawNasalCavity(ctx, w, h);
      
      if (targetPosition) {
        const targetJaw = 0.1 + targetPosition.y * 0.5;
        drawTongue(ctx, w, h, targetPosition.x, targetPosition.y, targetJaw, true, targetVowel);
      }
      
      drawTongue(ctx, w, h, tongueX, tongueY, jawOpen, false);
      drawFloorOfMouth(ctx, w, h, jawOpen);
      drawTeeth(ctx, w, h, jawOpen);
      drawLips(ctx, w, h, jawOpen, lipRound);
      drawLabels(ctx, w, h);
      
      if (userPosition.isVoiced && userPosition.nearestVowel) {
        drawVowelInfo(ctx, w, h, userPosition);
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [userPosition, targetPosition, targetVowel]);

  const drawBackground = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createRadialGradient(w * 0.35, h * 0.45, 0, w * 0.35, h * 0.45, w * 0.7);
    gradient.addColorStop(0, '#1a1a24');
    gradient.addColorStop(1, '#0a0a10');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  };

  const drawNasalCavity = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.fillStyle = 'rgba(35, 28, 32, 0.7)';
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.06);
    ctx.bezierCurveTo(w * 0.3, h * 0.02, w * 0.55, h * 0.02, w * 0.72, h * 0.1);
    ctx.lineTo(w * 0.72, h * 0.18);
    ctx.bezierCurveTo(w * 0.55, h * 0.1, w * 0.3, h * 0.1, w * 0.15, h * 0.14);
    ctx.closePath();
    ctx.fill();
  };

  const drawHardPalate = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(w * 0.1, h * 0.14, w * 0.1, h * 0.26);
    gradient.addColorStop(0, '#d4b0a0');
    gradient.addColorStop(1, '#b8948a');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.18);
    // Alveolar ridge
    ctx.bezierCurveTo(w * 0.16, h * 0.15, w * 0.19, h * 0.14, w * 0.22, h * 0.145);
    // Hard palate dome  
    ctx.bezierCurveTo(w * 0.38, h * 0.1, w * 0.55, h * 0.09, w * 0.68, h * 0.16);
    ctx.lineTo(w * 0.68, h * 0.2);
    ctx.bezierCurveTo(w * 0.55, h * 0.14, w * 0.38, h * 0.15, w * 0.22, h * 0.2);
    ctx.bezierCurveTo(w * 0.19, h * 0.21, w * 0.16, h * 0.22, w * 0.15, h * 0.24);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(90, 60, 50, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawSoftPalate = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(w * 0.68, h * 0.16, w * 0.78, h * 0.35);
    gradient.addColorStop(0, '#c89888');
    gradient.addColorStop(1, '#a87868');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(w * 0.68, h * 0.16);
    ctx.bezierCurveTo(w * 0.74, h * 0.18, w * 0.77, h * 0.25, w * 0.75, h * 0.33);
    // Uvula
    ctx.bezierCurveTo(w * 0.74, h * 0.38, w * 0.71, h * 0.4, w * 0.7, h * 0.36);
    ctx.bezierCurveTo(w * 0.69, h * 0.32, w * 0.71, h * 0.26, w * 0.68, h * 0.2);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(90, 60, 50, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawPharynx = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const gradient = ctx.createLinearGradient(w * 0.74, h * 0.3, w * 0.92, h * 0.3);
    gradient.addColorStop(0, '#4a2a2a');
    gradient.addColorStop(1, '#2a1515');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(w * 0.75, h * 0.33);
    ctx.bezierCurveTo(w * 0.79, h * 0.4, w * 0.81, h * 0.52, w * 0.8, h * 0.7);
    ctx.lineTo(w * 0.82, h * 0.95);
    ctx.lineTo(w * 0.95, h * 0.95);
    ctx.lineTo(w * 0.95, h * 0.22);
    ctx.bezierCurveTo(w * 0.9, h * 0.28, w * 0.82, h * 0.31, w * 0.75, h * 0.33);
    ctx.closePath();
    ctx.fill();
    
    // Epiglottis
    ctx.fillStyle = '#9a6a5a';
    ctx.beginPath();
    ctx.ellipse(w * 0.75, h * 0.52, w * 0.02, h * 0.04, -0.15, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawTongue = (
    ctx: CanvasRenderingContext2D,
    w: number, h: number,
    posX: number, posY: number,
    jawOpen: number,
    isTarget: boolean,
    label?: string
  ) => {
    // FIXED ANCHOR POINTS (don't move)
    const rootAnchorX = w * 0.72;  // Tongue root anchored to hyoid area
    const rootAnchorY = h * 0.6;   // Fixed vertical anchor
    
    const floorAnchorX = w * 0.18;  // Front anchor at floor of mouth
    const floorAnchorY = h * (0.52 + jawOpen * 0.12); // Moves slightly with jaw
    
    // MOBILE TONGUE BODY
    const bodyX = w * (0.32 + posX * 0.26);
    const bodyY = h * (0.28 + posY * 0.18 + jawOpen * 0.04);
    const humpHeight = h * (0.1 - posY * 0.05);
    
    // Tip follows jaw more for open vowels
    const tipX = w * 0.16;
    const tipY = h * (0.26 + posY * 0.08 + jawOpen * 0.06);
    
    // Blade
    const bladeX = w * (0.22 + posX * 0.03);
    const bladeY = h * (0.25 + posY * 0.1 + jawOpen * 0.04);

    if (isTarget) {
      ctx.strokeStyle = 'rgba(200, 50, 70, 0.6)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
    } else {
      ctx.setLineDash([]);
      const tongueGrad = ctx.createRadialGradient(bodyX, bodyY, 0, bodyX, bodyY + h * 0.1, w * 0.28);
      tongueGrad.addColorStop(0, '#e8a0a0');
      tongueGrad.addColorStop(0.4, '#d48888');
      tongueGrad.addColorStop(1, '#b86868');
      ctx.fillStyle = tongueGrad;
    }

    ctx.beginPath();
    
    // === UPPER SURFACE (tip to root) ===
    ctx.moveTo(tipX, tipY);
    
    // Tip to blade
    ctx.bezierCurveTo(
      tipX + w * 0.02, tipY - h * 0.01,
      bladeX - w * 0.02, bladeY + h * 0.01,
      bladeX, bladeY - h * 0.015
    );
    
    // Blade to dorsum hump
    ctx.bezierCurveTo(
      bladeX + w * 0.05, bladeY - humpHeight * 0.3,
      bodyX - w * 0.06, bodyY - humpHeight,
      bodyX, bodyY - humpHeight
    );
    
    // Dorsum to back of tongue
    ctx.bezierCurveTo(
      bodyX + w * 0.08, bodyY - humpHeight * 0.6,
      rootAnchorX - w * 0.1, bodyY - humpHeight * 0.1,
      rootAnchorX - w * 0.05, rootAnchorY - h * 0.08
    );
    
    // === ROOT (anchored) ===
    ctx.bezierCurveTo(
      rootAnchorX - w * 0.02, rootAnchorY - h * 0.03,
      rootAnchorX, rootAnchorY,
      rootAnchorX - w * 0.03, rootAnchorY + h * 0.03
    );
    
    // === LOWER SURFACE (root back to tip, anchored to floor) ===
    // Root to body underside
    ctx.bezierCurveTo(
      rootAnchorX - w * 0.1, rootAnchorY + h * 0.02,
      bodyX + w * 0.15, floorAnchorY + h * 0.02,
      bodyX, floorAnchorY
    );
    
    // Body underside to blade underside
    ctx.bezierCurveTo(
      bodyX - w * 0.08, floorAnchorY - h * 0.01,
      bladeX + w * 0.06, floorAnchorY - h * 0.02,
      bladeX, floorAnchorY - h * 0.04
    );
    
    // Blade underside to front anchor
    ctx.bezierCurveTo(
      bladeX - w * 0.02, floorAnchorY - h * 0.05,
      floorAnchorX + w * 0.02, floorAnchorY - h * 0.03,
      floorAnchorX, floorAnchorY - h * 0.02
    );
    
    // Front anchor (lingual frenulum area) back up to tip
    ctx.bezierCurveTo(
      floorAnchorX - w * 0.01, tipY + h * 0.06,
      tipX - w * 0.01, tipY + h * 0.03,
      tipX, tipY
    );
    
    ctx.closePath();

    if (isTarget) {
      ctx.stroke();
      ctx.setLineDash([]);
      if (label) {
        ctx.font = 'bold 24px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(200, 50, 70, 0.85)';
        ctx.textAlign = 'center';
        ctx.fillText(label, bodyX, bodyY - humpHeight - h * 0.035);
      }
    } else {
      ctx.fill();
      
      // Surface highlight
      ctx.beginPath();
      ctx.moveTo(bladeX, bladeY - h * 0.015);
      ctx.bezierCurveTo(
        bladeX + w * 0.05, bladeY - humpHeight * 0.3,
        bodyX - w * 0.06, bodyY - humpHeight,
        bodyX, bodyY - humpHeight
      );
      ctx.strokeStyle = 'rgba(255, 180, 180, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Subtle outline
      ctx.strokeStyle = 'rgba(100, 50, 50, 0.35)';
      ctx.lineWidth = 1.5;
    }
  };

  const drawFloorOfMouth = (ctx: CanvasRenderingContext2D, w: number, h: number, jawOpen: number) => {
    const floorY = h * (0.56 + jawOpen * 0.14);
    
    // Sublingual area
    const gradient = ctx.createLinearGradient(w * 0.15, floorY - h * 0.04, w * 0.15, floorY + h * 0.12);
    gradient.addColorStop(0, '#c8a090');
    gradient.addColorStop(1, '#a88070');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(w * 0.14, floorY - h * 0.02);
    ctx.bezierCurveTo(w * 0.25, floorY - h * 0.03, w * 0.5, floorY - h * 0.02, w * 0.72, floorY + h * 0.04);
    ctx.lineTo(w * 0.72, floorY + h * 0.16);
    ctx.bezierCurveTo(w * 0.5, floorY + h * 0.12, w * 0.28, floorY + h * 0.1, w * 0.14, floorY + h * 0.08);
    ctx.closePath();
    ctx.fill();
    
    // Mandible hint
    ctx.strokeStyle = 'rgba(80, 50, 40, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, floorY + h * 0.08);
    ctx.bezierCurveTo(w * 0.2, floorY + h * 0.18, w * 0.45, floorY + h * 0.22, w * 0.72, floorY + h * 0.16);
    ctx.stroke();
  };

  const drawTeeth = (ctx: CanvasRenderingContext2D, w: number, h: number, jawOpen: number) => {
    ctx.fillStyle = '#f8f4f0';
    ctx.strokeStyle = 'rgba(160, 150, 140, 0.35)';
    ctx.lineWidth = 0.5;
    
    // Upper teeth
    const upperY = h * 0.2;
    for (let i = 0; i < 3; i++) {
      const tx = w * (0.12 + i * 0.016);
      ctx.beginPath();
      ctx.roundRect(tx, upperY, w * 0.012, h * 0.035, 1);
      ctx.fill();
      ctx.stroke();
    }
    
    // Lower teeth (move with jaw)
    const lowerY = h * (0.46 + jawOpen * 0.14);
    for (let i = 0; i < 3; i++) {
      const tx = w * (0.12 + i * 0.014);
      ctx.beginPath();
      ctx.roundRect(tx, lowerY, w * 0.011, h * 0.03, 1);
      ctx.fill();
      ctx.stroke();
    }
  };

  const drawLips = (ctx: CanvasRenderingContext2D, w: number, h: number, jawOpen: number, lipRound: number) => {
    const protrusion = lipRound * w * 0.015;
    
    // === UPPER LIP (simple crescent shape) ===
    const upperGrad = ctx.createLinearGradient(0, h * 0.1, 0, h * 0.22);
    upperGrad.addColorStop(0, '#d8a090');
    upperGrad.addColorStop(1, '#c88078');
    
    ctx.fillStyle = upperGrad;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.1);
    // Outer edge
    ctx.bezierCurveTo(
      w * 0.025 + protrusion, h * 0.08,
      w * 0.055 + protrusion, h * 0.1,
      w * 0.08, h * 0.14
    );
    // Connects to face
    ctx.lineTo(w * 0.1, h * 0.17);
    // Inner edge (where it meets teeth area)
    ctx.lineTo(w * 0.08, h * 0.2);
    ctx.bezierCurveTo(
      w * 0.05, h * 0.21,
      w * 0.025 + protrusion, h * 0.22,
      0, h * 0.21
    );
    ctx.closePath();
    ctx.fill();
    
    // === LOWER LIP (simple crescent, moves with jaw) ===
    const lowerY = h * (0.42 + jawOpen * 0.14);
    
    const lowerGrad = ctx.createLinearGradient(0, lowerY, 0, lowerY + h * 0.12);
    lowerGrad.addColorStop(0, '#c87870');
    lowerGrad.addColorStop(1, '#b06858');
    
    ctx.fillStyle = lowerGrad;
    ctx.beginPath();
    ctx.moveTo(0, lowerY);
    // Inner edge
    ctx.bezierCurveTo(
      w * 0.025 + protrusion, lowerY - h * 0.01,
      w * 0.05, lowerY,
      w * 0.08, lowerY + h * 0.02
    );
    // Connects to floor of mouth
    ctx.lineTo(w * 0.1, lowerY + h * 0.06);
    // Outer edge (chin side)  
    ctx.bezierCurveTo(
      w * 0.07, lowerY + h * 0.1,
      w * 0.04 + protrusion, lowerY + h * 0.1,
      w * 0.02 + protrusion, lowerY + h * 0.08
    );
    ctx.bezierCurveTo(
      0, lowerY + h * 0.06,
      0, lowerY + h * 0.03,
      0, lowerY
    );
    ctx.closePath();
    ctx.fill();
  };

  const drawLabels = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.font = '9px "Crimson Pro", serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    
    ctx.textAlign = 'center';
    ctx.fillText('palate', w * 0.44, h * 0.07);
    ctx.fillText('velum', w * 0.72, h * 0.13);
    ctx.fillText('pharynx', w * 0.87, h * 0.48);
    
    ctx.font = '8px "Crimson Pro", serif';
    ctx.fillStyle = 'rgba(200, 175, 100, 0.28)';
    ctx.textAlign = 'center';
    ctx.fillText('Front', w * 0.24, h * 0.97);
    ctx.fillText('Back', w * 0.6, h * 0.97);
  };

  const drawVowelInfo = (ctx: CanvasRenderingContext2D, w: number, h: number, detected: DetectedVowel) => {
    if (!detected.nearestVowel) return;

    const boxW = 105;
    const boxH = 58;
    const boxX = w - boxW - 8;
    const boxY = 8;

    ctx.shadowColor = detected.confidence > 0.5 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(251, 191, 36, 0.2)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(8, 8, 12, 0.9)';
    ctx.beginPath();
    ctx.roundRect(boxX, boxY, boxW, boxH, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = detected.confidence > 0.5 ? 'rgba(74, 222, 128, 0.4)' : 'rgba(251, 191, 36, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillStyle = detected.confidence > 0.5 ? '#4ade80' : '#fbbf24';
    ctx.textAlign = 'center';
    ctx.fillText(detected.nearestVowel.symbol, boxX + boxW / 2, boxY + 26);

    ctx.font = '9px "Crimson Pro", serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.fillText(detected.nearestVowel.name, boxX + boxW / 2, boxY + 40);

    const barW = boxW - 16;
    const barX = boxX + 8;
    const barY = boxY + 48;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 3, 1.5);
    ctx.fill();
    
    ctx.fillStyle = detected.confidence > 0.5 ? '#4ade80' : '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * detected.confidence, 3, 1.5);
    ctx.fill();
  };

  return (
    <div className="tongue-visualization">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          width: size,
          height: size,
          borderRadius: '12px',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
        }}
      />
      <div className="tongue-legend">
        <span className="legend-item">
          <span className="dot user"></span> Your tongue
        </span>
        {targetPosition && (
          <span className="legend-item">
            <span className="dot target"></span> Target
          </span>
        )}
      </div>
    </div>
  );
};
