/**
 * Audio feedback utilities for user interactions
 */

/**
 * Play a pleasant "ding" sound when pronunciation is correct
 * Uses Web Audio API to generate a clean tone
 */
export function playSuccessSound(): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure a pleasant tone (musical note)
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5 note
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5 note
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5 note (chord)
    
    // Envelope for smooth attack and decay
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
    
    // Play the sound
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    // Clean up context after sound finishes
    setTimeout(() => {
      audioContext.close();
    }, 500);
  } catch (error) {
    // Silently fail if audio context isn't available
    console.warn('Could not play success sound:', error);
  }
}
