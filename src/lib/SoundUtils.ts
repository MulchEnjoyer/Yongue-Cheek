/**
 * Audio feedback utilities for user interactions
 */

import passSoundUrl from '../pass.mp3';

// Cache the audio element for better performance
let audioCache: HTMLAudioElement | null = null;

/**
 * Create confetti particles in the DOM
 */
function createConfettiParticles(): void {
  // Check if confetti container already exists, if not create it
  let container = document.querySelector('.confetti-effect-temp') as HTMLElement;
  if (!container) {
    container = document.createElement('div');
    container.className = 'confetti-effect confetti-effect-temp';
    document.body.appendChild(container);
  }

  // Clear any existing particles
  container.innerHTML = '';

  // Create confetti pieces
  const colors = [
    'var(--color-accent-primary)',
    'var(--color-accent-gold)',
    'var(--color-success)',
    'var(--color-accent-secondary)',
    'var(--color-warning)',
  ];

  for (let i = 0; i < 20; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = `${(i * 5) % 100}%`;
    piece.style.background = colors[i % 5];
    piece.style.animationDelay = `${i * 0.05}s`;
    piece.style.animationDuration = `${1 + (i % 3) * 0.3}s`;
    container.appendChild(piece);
  }

  // Remove container after animation completes
  setTimeout(() => {
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, 3000);
}

/**
 * Play the pass.mp3 sound when pronunciation is correct
 * Also triggers confetti effect
 */
export function playSuccessSound(): void {
  try {
    // Create audio element if not cached
    if (!audioCache) {
      audioCache = new Audio(passSoundUrl);
      audioCache.volume = 1.0;
    }
    
    // Reset to start and play
    audioCache.currentTime = 0;
    audioCache.play().catch((error) => {
      // Silently fail if audio can't play (e.g., user interaction required)
      console.warn('Could not play success sound:', error);
    });

    // Trigger confetti effect
    createConfettiParticles();
  } catch (error) {
    // Silently fail if audio isn't available
    console.warn('Could not play success sound:', error);
  }
}
